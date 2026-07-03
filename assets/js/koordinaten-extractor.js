// Koordinaten-Extractor: zieht aus eingefügtem Berichtstext alle Koordinaten
// von Barbaren- und Bonusdörfern und gibt sie als leerzeichengetrennte Liste aus.
//
// Strategie: jedes Vorkommen von "Barbarendorf"/"Bonusdorf" im Text markiert einen
// Treffer. Direkt danach (innerhalb eines kurzen Fensters) wird nach dem ersten
// Koordinatenmuster (z.B. "563|432") gesucht, so wie es in Berichten direkt daneben
// steht ("Barbarendorf (563|432)", "Bonusdorf (120|340)").

var KEYWORD_PATTERN = /barbarendorf|bonusdorf/gi;
var COORD_PATTERN = /\d{1,3}\|\d{1,3}/;
var SEARCH_WINDOW = 80;

function extractCoords(text) {
  var barb = [];
  var bonus = [];
  var seenBarb = {};
  var seenBonus = {};
  var match;

  KEYWORD_PATTERN.lastIndex = 0;
  while ((match = KEYWORD_PATTERN.exec(text)) !== null) {
    var isBonus = match[0].toLowerCase() === 'bonusdorf';
    var windowText = text.slice(match.index, match.index + SEARCH_WINDOW);
    var coordMatch = COORD_PATTERN.exec(windowText);
    if (!coordMatch) continue;

    var coord = coordMatch[0];
    if (isBonus) {
      if (!seenBonus[coord]) {
        seenBonus[coord] = true;
        bonus.push(coord);
      }
    } else {
      if (!seenBarb[coord]) {
        seenBarb[coord] = true;
        barb.push(coord);
      }
    }
  }

  var mergedSeen = {};
  var all = [];
  barb.concat(bonus).forEach(function (coord) {
    if (!mergedSeen[coord]) {
      mergedSeen[coord] = true;
      all.push(coord);
    }
  });

  return { barb: barb, bonus: bonus, all: all };
}

function countOccurrences(text, pattern) {
  var count = 0;
  var re = new RegExp(pattern.source, pattern.flags);
  while (re.exec(text) !== null) {
    count++;
  }
  return count;
}

function extract() {
  var raw = document.getElementById('report-text').value;
  var mentions = countOccurrences(raw, KEYWORD_PATTERN);
  var coords = extractCoords(raw);

  var statBox = document.getElementById('result-box');
  var emptyNote = document.getElementById('empty-note');

  document.getElementById('stat-barb').textContent = '✓ ' + coords.barb.length + ' Barbarendorf-Koordinate' + (coords.barb.length === 1 ? '' : 'n');
  document.getElementById('stat-bonus').textContent = '★ ' + coords.bonus.length + ' Bonusdorf-Koordinate' + (coords.bonus.length === 1 ? '' : 'n');

  if (coords.all.length === 0) {
    statBox.style.display = 'none';
    emptyNote.style.display = 'block';
    emptyNote.textContent = mentions === 0
      ? 'Im eingefügten Text wurde weder "Barbarendorf" noch "Bonusdorf" gefunden. Stelle sicher, dass du den kompletten Berichtstext (inkl. Zielangabe) eingefügt hast.'
      : '"Barbarendorf"/"Bonusdorf" wurde ' + mentions + ' mal gefunden, aber es konnten keine Koordinaten in der Nähe erkannt werden. Prüfe das Format des eingefügten Texts.';
    return;
  }

  emptyNote.style.display = 'none';
  document.getElementById('result-coords').value = coords.all.join(' ');
  document.getElementById('result-count').textContent = coords.all.length + ' Koordinaten';
  statBox.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('extract-form').addEventListener('submit', function (e) {
    e.preventDefault();
    extract();
  });

  document.getElementById('copy-result').addEventListener('click', function () {
    var textarea = document.getElementById('result-coords');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(function () {
      var btn = document.getElementById('copy-result');
      var original = btn.textContent;
      btn.textContent = '✅ Kopiert!';
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  });
});
