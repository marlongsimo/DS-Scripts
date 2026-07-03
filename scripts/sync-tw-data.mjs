#!/usr/bin/env node
// Entdeckt automatisch alle aktuell laufenden deutschen Die-Stämme-Welten
// (de1, de2, ... – jede Zahl wird direkt gegen die echten map-Exporte
// geprüft, kein separater "Welt-Liste"-Endpunkt nötig), lädt für jede
// aktive Welt player.txt/ally.txt, wandelt sie in kompaktes JSON um und
// schreibt sie nach data/{welt}.json bzw. data/worlds.json.
//
// Läuft serverseitig (GitHub Actions) statt im Browser, damit CORS keine
// Rolle spielt: die statische Seite liest die erzeugten JSON-Dateien danach
// ganz normal von der eigenen Domain.

import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const WORLD_PREFIX = 'de';
// Obergrenze für die Welt-Erkennung. Wird irgendwann eine höhere Welt eröffnet
// als hier abgedeckt, diesen Wert einfach erhöhen.
const MAX_WORLD_NUMBER = 400;
const PROBE_CONCURRENCY = 12;
const FETCH_TIMEOUT_MS = 10000;

function decodeTwName(raw) {
  return decodeURIComponent((raw || '').replace(/\+/g, '%20'));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DS-Scripts-sync/1.0' }
    });
    if (!res.ok) {
      throw new Error(`${url} -> HTTP ${res.status}`);
    }
    const text = await res.text();
    // Manche Welt-Subdomains (z.B. geschlossene/alte Welten) antworten mit
    // Status 200, liefern aber die normale Startseite statt der erwarteten
    // CSV-Exportdatei aus. Das muss hier erkannt werden, sonst wird HTML als
    // Weltdaten geparst.
    if (/^\s*<(!doctype html|html[\s>])/i.test(text)) {
      throw new Error(`${url} -> HTML statt Exportdatei erhalten (Welt vermutlich geschlossen)`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function parseAllyLine(line) {
  const [id, name, tag, members, villages, points, allPoints, rank] = line.split(',');
  return {
    id,
    name: decodeTwName(name),
    tag: decodeTwName(tag),
    members: Number(members) || 0,
    villages: Number(villages) || 0,
    points: Number(points) || 0,
    allPoints: Number(allPoints) || 0,
    rank: Number(rank) || null
  };
}

function parsePlayerLine(line) {
  const [id, name, allyId, villages, points, rank] = line.split(',');
  return {
    id,
    name: decodeTwName(name),
    allyId: allyId && allyId !== '0' ? allyId : null,
    villages: Number(villages) || 0,
    points: Number(points) || 0,
    rank: Number(rank) || null
  };
}

function parseVillageLine(line) {
  const [id, name, x, y, playerId, points] = line.split(',');
  return {
    id,
    name: decodeTwName(name),
    x: Number(x) || 0,
    y: Number(y) || 0,
    playerId: playerId && playerId !== '0' ? playerId : null,
    points: Number(points) || 0
  };
}

// Lädt village.txt und gruppiert die (nicht-barbarischen) Dörfer nach
// Spieler-ID, damit das Frontend pro Spieler direkt seine Dorfliste
// nachschlagen kann, ohne die komplette Weltkarte durchsuchen zu müssen.
// Wird separat von den Stämme-/Spieler-Daten geschrieben, da village.txt
// deutlich größer ist und nur bei Bedarf (Klick auf einen Spieler) im
// Browser geladen werden soll.
async function syncVillages(world) {
  const base = `https://${world.code}.die-staemme.de`;
  const villageRaw = await fetchText(`${base}/map/village.txt`);
  const villages = villageRaw.split('\n').map((l) => l.trim()).filter(Boolean).map(parseVillageLine);

  const byPlayer = {};
  for (const v of villages) {
    if (!v.playerId) continue;
    if (!byPlayer[v.playerId]) byPlayer[v.playerId] = [];
    byPlayer[v.playerId].push({ id: v.id, name: v.name, x: v.x, y: v.y, points: v.points });
  }

  const outPath = path.join(DATA_DIR, `${world.code}-villages.json`);
  await writeFile(outPath, JSON.stringify(byPlayer, null, 0));
}

// Versucht, eine Welt zu synchronisieren. Wirft, wenn die Welt nicht
// existiert/nicht mehr läuft (Fetch schlägt fehl) – das ist gleichzeitig die
// Erkennung, ob die Welt aktiv ist, kein separater Check nötig.
async function syncWorld(world) {
  const base = `https://${world.code}.die-staemme.de`;
  const [allyRaw, playerRaw] = await Promise.all([
    fetchText(`${base}/map/ally.txt`),
    fetchText(`${base}/map/player.txt`)
  ]);

  const allies = allyRaw.split('\n').map((l) => l.trim()).filter(Boolean).map(parseAllyLine);
  const alliesById = new Map(allies.map((a) => [a.id, a]));

  const players = playerRaw.split('\n').map((l) => l.trim()).filter(Boolean).map(parsePlayerLine).map((p) => {
    const ally = p.allyId ? alliesById.get(p.allyId) : null;
    return {
      ...p,
      allyName: ally ? ally.name : null,
      allyTag: ally ? ally.tag : null
    };
  });

  const updatedAt = new Date().toISOString();
  const outPath = path.join(DATA_DIR, `${world.code}.json`);
  await writeFile(outPath, JSON.stringify({ world: world.code, updatedAt, allies, players }, null, 0));

  // Dorfdaten sind optional: schlägt nur dieser Teil fehl, bleibt die Welt
  // trotzdem als erfolgreich synchronisiert erhalten (nur ohne Dorfdetails).
  try {
    await syncVillages(world);
    console.log(`✓ ${world.code}: ${allies.length} Stämme, ${players.length} Spieler, Dörfer ok`);
  } catch (err) {
    console.warn(`⚠ ${world.code}: Dörfer konnten nicht geladen werden (${err.message})`);
  }

  return { code: world.code, label: world.label, updatedAt };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function writeWorldsManifest(results) {
  const manifestPath = path.join(DATA_DIR, 'worlds.json');
  const manifest = results
    .map(({ code, label, updatedAt }) => ({ code, label, updatedAt }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

// Entfernt data/{welt}.json bzw. data/{welt}-villages.json für Welten, die in
// diesem Lauf nicht (mehr) als aktiv erkannt wurden (z.B. geschlossen, oder
// vorherige Läufe hatten fälschlich HTML statt Exportdaten gespeichert) –
// sonst blieben veraltete/falsche Dateien für immer im Repo liegen.
async function pruneInactiveWorldFiles(activeCodes) {
  const activeSet = new Set(activeCodes);
  const files = await readdir(DATA_DIR);
  for (const file of files) {
    const match = file.match(/^(de\d+)(-villages)?\.json$/);
    if (!match || activeSet.has(match[1])) continue;
    await unlink(path.join(DATA_DIR, file));
    console.log(`✗ entfernt (nicht mehr aktiv): ${file}`);
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const candidates = Array.from({ length: MAX_WORLD_NUMBER }, (_, i) => ({
    code: `${WORLD_PREFIX}${i + 1}`,
    label: `${WORLD_PREFIX.toUpperCase()}${i + 1}`
  }));

  const attempts = await mapWithConcurrency(candidates, PROBE_CONCURRENCY, async (world) => {
    try {
      return await syncWorld(world);
    } catch (err) {
      return null;
    }
  });

  const results = attempts.filter(Boolean);

  if (results.length === 0) {
    console.warn('Keine aktive Welt gefunden (oder Netzwerkproblem) – data/worlds.json bleibt unverändert.');
    return;
  }

  console.log(`Aktive Welten gefunden: ${results.map((r) => r.code).join(', ')}`);
  await writeWorldsManifest(results);
  await pruneInactiveWorldFiles(results.map((r) => r.code));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
