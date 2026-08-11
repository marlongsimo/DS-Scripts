// Angriffsplaner Pro - Truppenübersicht-Parser (Schritt 3). Reine Parsing-
// Logik ohne DOM-Zugriff (die Vorschau-/Bestätigungs-UI dazu lebt in
// angriffsplaner-v2.js) - dadurch einzeln in der Konsole testbar.
AP.parser = AP.parser || {};

AP.parser.splitLines = function (raw) {
  return (raw || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
};

// Erste Koordinate in der Zeile - identifiziert Dorf-Zeilen und filtert
// Header-/Summenzeilen (die keine Koordinate enthalten) automatisch heraus.
AP.parser.classifyLine = function (line) {
  var match = /\d{1,3}\|\d{1,3}/.exec(line);
  if (!match) return null;
  return { coord: match[0], index: match.index, length: match[0].length };
};

AP.parser.extractVillageName = function (line, hit) {
  var before = line.slice(0, hit.index);
  return before.replace(/[\s(]+$/, '').trim();
};

// Zahlen nach der Koordinate - toleriert Tab-/Leerzeichen-Trennung sowie
// deutsche Tausenderpunkte/-kommas ("1.234" -> 1234).
AP.parser.extractNumberTokens = function (line, hit) {
  var after = line.slice(hit.index + hit.length);
  var found = after.match(/\d[\d.,]*/g) || [];
  return found.map(function (t) { return parseInt(t.replace(/[.,]/g, ''), 10) || 0; });
};

// Standard-Reihenfolge der Truppenübersicht-Spalten (deckt Bogenschütze/
// Paladin-Welten mit ab) - dient nur als Startvorschlag für die manuelle
// Spalten-Zuordnung, nicht als verlässliche Wahrheit.
AP.parser.STANDARD_ORDER = AP.UNIT_TYPES.slice();

AP.parser.guessColumnMapping = function (columnCount) {
  var order = AP.parser.STANDARD_ORDER;
  if (columnCount >= order.length) return order.slice(0, columnCount);
  var withoutArcherPaladin = order.filter(function (u) { return u !== 'archer' && u !== 'marcher' && u !== 'knight'; });
  if (columnCount === withoutArcherPaladin.length) return withoutArcherPaladin;
  var withoutPaladin = order.filter(function (u) { return u !== 'knight'; });
  if (columnCount === withoutPaladin.length) return withoutPaladin;
  var withoutArcher = order.filter(function (u) { return u !== 'archer' && u !== 'marcher'; });
  if (columnCount === withoutArcher.length) return withoutArcher;
  // Kein bekanntes Standardmuster - einfach die ersten N; die
  // Bestätigungs-UI lässt den Nutzer jede Spalte manuell korrigieren.
  return order.slice(0, columnCount);
};

// Häufigste Spaltenzahl unter den erkannten Dorf-Zeilen - Basis für die
// Spalten-Zuordnung-UI, wenn für die aktuelle Welt noch keine bestätigte
// Zuordnung gespeichert ist (AP.state.columnMapping[worldCode]).
AP.parser.detectColumnCount = function (raw) {
  var counts = {};
  AP.parser.splitLines(raw).forEach(function (line) {
    var hit = AP.parser.classifyLine(line);
    if (!hit) return;
    var n = AP.parser.extractNumberTokens(line, hit).length;
    if (n === 0) return;
    counts[n] = (counts[n] || 0) + 1;
  });
  var best = null, bestCount = 0;
  Object.keys(counts).forEach(function (key) {
    if (counts[key] > bestCount) { bestCount = counts[key]; best = parseInt(key, 10); }
  });
  return best;
};

// columnMapping: Array von Einheiten-Keys (oder null für "ignorieren") in
// Spaltenreihenfolge, z.B. aus AP.state.columnMapping[worldCode].
AP.parser.parseTroopOverview = function (raw, columnMapping) {
  var rows = [];
  var skippedLines = [];
  AP.parser.splitLines(raw).forEach(function (line) {
    var hit = AP.parser.classifyLine(line);
    if (!hit) { skippedLines.push(line); return; }
    var numbers = AP.parser.extractNumberTokens(line, hit);
    var units = {};
    (columnMapping || []).forEach(function (unit, i) {
      if (unit && numbers[i] !== undefined) units[unit] = numbers[i];
    });
    rows.push({
      coord: hit.coord,
      villageName: AP.parser.extractVillageName(line, hit) || hit.coord,
      units: units,
      rawLine: line,
      numberCount: numbers.length
    });
  });
  return { rows: rows, skippedLines: skippedLines };
};
