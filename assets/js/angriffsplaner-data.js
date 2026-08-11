// Angriffsplaner Pro - Datenmodell/Persistenz (localStorage) + gemeinsame
// Konstanten/Hilfsfunktionen, die von den anderen angriffsplaner-*.js-Dateien
// genutzt werden. Wird als erstes von rechner/angriffsplaner.html geladen und
// baut den globalen "AP"-Namespace auf.
var AP = window.AP || (window.AP = {});

AP.STORAGE_KEY = 'dsAngriffsplanerV1';

AP.UNIT_TYPES = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
AP.UNIT_LABELS = {
  spear: 'Speer', sword: 'Schwert', axe: 'Axt', archer: 'Bogen', spy: 'Späher',
  light: 'LC', marcher: 'BR', heavy: 'HC', ram: 'Ramme', catapult: 'Kata',
  knight: 'Adelsg.', snob: 'Adliger'
};

// Generische Fallback-Geschwindigkeiten (Minuten/Feld), falls für die gewählte
// Welt keine data/{code}-config.json existiert (noch nicht synchronisiert).
AP.BASE_SPEED = { spear: 18, sword: 22, axe: 18, archer: 18, spy: 9, light: 10, marcher: 10, heavy: 11, ram: 30, catapult: 30, knight: 10, snob: 35 };

AP.COORD_PATTERN = /\d{1,3}\|\d{1,3}/g;

// Standard-Bevölkerungskosten je Einheit (Die-Stämme-Basisregeln, weltweit
// praktisch immer identisch, im Gegensatz zu den Geschwindigkeiten nicht
// synchronisiert) - nur für die Fakegrenze-Prüfung (Schritt 5) gebraucht.
AP.POP_COST = { spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100 };

AP.templatePopCost = function (units) {
  var sum = 0;
  AP.UNIT_TYPES.forEach(function (u) { sum += (units[u] || 0) * (AP.POP_COST[u] || 0); });
  return sum;
};

// ── Standard-Zustand ──────────────────────────────────────────────────────
AP.defaultState = function () {
  return {
    version: 1,
    worldCode: null,
    worldSpeed: 1,
    unitSpeed: Object.assign({}, AP.BASE_SPEED),
    worldConfigFetchedAt: null,
    columnMapping: {},

    players: { allies: [], enemies: [] },

    troops: {},
    unavailableOffs: '',

    targets: {
      bunkers: { coords: [], mode: 'blast', offsPerBunker: 2 },
      offTargets: [],
      kattaTargets: [],
      agTargets: [],
      fakeTargets: [],
      fakeRemainingToggle: false
    },

    settings: {
      maxFakesPerVillage: 5,
      maxIncsPerTarget: 8,
      timeWindows: { katta: null, off: null, fake: null, ag: null, bunker: null },
      avoidRoundTimes: true,
      fakeGrenzeEnabled: false,
      fakeGrenzePercent: 10
    },

    templates: { fake: [], katta: [], off: [] },

    lastPlan: null
  };
};

// ── Laden/Speichern ───────────────────────────────────────────────────────
function deepMerge(defaults, loaded) {
  if (Array.isArray(defaults) || typeof defaults !== 'object' || defaults === null) {
    return loaded !== undefined ? loaded : defaults;
  }
  var out = Object.assign({}, defaults);
  if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
    Object.keys(loaded).forEach(function (key) {
      out[key] = deepMerge(defaults[key], loaded[key]);
    });
  }
  return out;
}

AP.loadState = function () {
  var raw;
  try {
    raw = localStorage.getItem(AP.STORAGE_KEY);
  } catch (e) {
    raw = null;
  }
  var defaults = AP.defaultState();
  if (!raw) return defaults;
  try {
    var parsed = JSON.parse(raw);
    // deepMerge sorgt dafür, dass neu hinzugekommene Felder (bei künftigen
    // Erweiterungen) automatisch mit ihrem Default belegt werden, statt
    // undefined zu bleiben und die UI crashen zu lassen.
    return deepMerge(defaults, parsed);
  } catch (e) {
    console.warn('[Angriffsplaner] Gespeicherter Zustand ungültig, setze zurück.', e);
    return defaults;
  }
};

AP.saveState = function (state) {
  try {
    localStorage.setItem(AP.STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[Angriffsplaner] Konnte Zustand nicht speichern (localStorage voll/deaktiviert?):', e);
  }
};

// Zentraler, im Speicher gehaltener Zustand - alle Module lesen/schreiben
// über AP.state und rufen danach AP.persist() auf.
AP.state = AP.loadState();
AP.persist = function () {
  AP.saveState(AP.state);
};

AP.exportStateAsJson = function () {
  return JSON.stringify(AP.state, null, 2);
};

AP.importStateFromJson = function (text) {
  var parsed = JSON.parse(text);
  var merged = deepMerge(AP.defaultState(), parsed);
  AP.state = merged;
  AP.persist();
  return AP.state;
};

// ── Koordinaten-/Distanz-/Zeit-Hilfsfunktionen ───────────────────────────
// (Portiert aus dem alten assets/js/angriffsplaner.js bzw. barbsFinder.js)

AP.parseCoordsFreeform = function (raw) {
  var matches = (raw || '').match(AP.COORD_PATTERN) || [];
  var seen = {};
  var out = [];
  matches.forEach(function (c) {
    if (!seen[c]) { seen[c] = true; out.push(c); }
  });
  return out;
};

AP.coordDist = function (c1, c2) {
  var p1 = c1.split('|').map(Number);
  var p2 = c2.split('|').map(Number);
  var dx = p2[0] - p1[0];
  var dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
};

// travelMs für eine gegebene Einheit: Basisgeschwindigkeit (Min/Feld) der
// aktuellen Welt (AP.state.unitSpeed, sonst AP.BASE_SPEED-Fallback) geteilt
// durch Welt-/Einheitengeschwindigkeits-Multiplikator.
AP.calcTravelMs = function (unit, dist) {
  var perField = (AP.state.unitSpeed && AP.state.unitSpeed[unit]) || AP.BASE_SPEED[unit] || 30;
  var wSpeed = AP.state.worldSpeed || 1;
  return (dist * perField) / wSpeed * 60 * 1000;
};

// Langsamste Einheit einer Vorlage (bestimmt die Marschgeschwindigkeit einer
// gemischten Truppe) - ignoriert Einheiten mit Anzahl 0.
AP.slowestUnit = function (units) {
  var slowest = null;
  var slowestSpeed = -Infinity;
  AP.UNIT_TYPES.forEach(function (u) {
    if (!units[u]) return;
    var perField = (AP.state.unitSpeed && AP.state.unitSpeed[u]) || AP.BASE_SPEED[u] || 30;
    if (perField > slowestSpeed) { slowestSpeed = perField; slowest = u; }
  });
  return slowest;
};

function pad(n) { return String(n).padStart(2, '0'); }
AP.pad = pad;
AP.formatDateDE = function (d) {
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
};
AP.msToHMS = function (ms) {
  var s = Math.round(ms / 1000);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return pad(h) + ':' + pad(m) + ':' + pad(sec);
};

// ── Welt-Daten laden (data/*.json, siehe scripts/sync-tw-data.mjs) ───────
// Alle Aufrufe von rechner/angriffsplaner.html aus, daher "../data/..".

AP.fetchWorldsList = function () {
  return fetch('../data/worlds.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
};

AP.fetchWorldData = function (code) {
  return fetch('../data/' + code + '.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
};

AP.fetchWorldVillages = function (code) {
  return fetch('../data/' + code + '-villages.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
};

// Liefert null statt zu werfen, falls die Datei (noch) nicht existiert - der
// Aufrufer fällt dann auf AP.BASE_SPEED zurück (siehe Schritt 1 der UI).
AP.fetchWorldConfig = function (code) {
  return fetch('../data/' + code + '-config.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) return null;
    return r.json();
  }).catch(function () { return null; });
};
