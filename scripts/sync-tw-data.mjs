#!/usr/bin/env node
// Lädt die öffentlichen Weltdaten-Exporte von Die Stämme (player.txt, ally.txt)
// für eine gepflegte Liste an Welten, wandelt sie in kompaktes JSON um und
// schreibt sie nach data/{welt}.json bzw. aktualisiert data/worlds.json.
//
// Läuft serverseitig (GitHub Actions) statt im Browser, damit CORS keine
// Rolle spielt: die statische Seite liest die erzeugten JSON-Dateien danach
// ganz normal von der eigenen Domain.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// Weltcodes, die synchronisiert werden sollen. Einfach ergänzen, um weitere
// Welten anzuzeigen.
const WORLDS = [
  { code: 'de254', label: 'DE254' }
];

function decodeTwName(raw) {
  return decodeURIComponent(raw.replace(/\+/g, '%20'));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'DS-Scripts-sync/1.0' } });
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.text();
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
  console.log(`✓ ${world.code}: ${allies.length} Stämme, ${players.length} Spieler`);
  return updatedAt;
}

async function updateWorldsManifest(results) {
  const manifestPath = path.join(DATA_DIR, 'worlds.json');
  let manifest = [];
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (e) {
      manifest = [];
    }
  }

  const byCode = new Map(manifest.map((w) => [w.code, w]));
  for (const { code, label, updatedAt } of results) {
    byCode.set(code, { code, label, updatedAt });
  }

  const merged = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  await writeFile(manifestPath, JSON.stringify(merged, null, 2));
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const results = [];
  for (const world of WORLDS) {
    try {
      const updatedAt = await syncWorld(world);
      results.push({ code: world.code, label: world.label, updatedAt });
    } catch (err) {
      console.warn(`✗ ${world.code}: ${err.message}`);
    }
  }
  if (results.length > 0) {
    await updateWorldsManifest(results);
  } else {
    console.warn('Keine Welt erfolgreich synchronisiert, worlds.json bleibt unverändert.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
