// Koordinaten-Extractor: zieht aus eingefügtem Berichtstext alle Koordinaten
// von Barbarendörfern und gibt sie als leerzeichengetrennte Liste aus.
//
// Strategie: jedes Vorkommen von "Barbarendorf" im Text markiert einen Treffer.
// Direkt danach (innerhalb eines kurzen Fensters) wird nach dem ersten
// Koordinatenmuster (z.B. "563|432") gesucht, so wie es in Berichten neben
// "Barbarendorf" steht ("Barbarendorf (563|432)").

var KEYWORD_PATTERN = /barbarendorf/gi;
var COORD_PATTERN = /\d{1,3}\|\d{1,3}/;
var SEARCH_WINDOW = 80;

function extractBarbCoords(text) {
  var result = [];
  var seen = {};
  var match;

  KEYWORD_PATTERN.lastIndex = 0;
  while ((match = KEYWORD_PATTERN.exec(text)) !== null) {
    var windowText = text.slice(match.index, match.index + SEARCH_WINDOW);
    var coordMatch = COORD_PATTERN.exec(windowText);
    if (coordMatch) {
      var coord = coordMatch[0];
      if (!seen[coord]) {
        seen[coord] = true;
        result.push(coord);
      }
    }
  }

  return result;
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
  var barbMentions = countOccurrences(raw, KEYWORD_PATTERN);
  var coords = extractBarbCoords(raw);

  var statFound = document.getElementById('stat-found');
  var statBox = document.getElementById('result-box');
  var emptyNote = document.getElementById('empty-note');

  statFound.textContent = '✓ ' + coords.length + ' Barbarendorf-Koordinate' + (coords.length === 1 ? '' : 'n') + ' gefunden';

  if (coords.length === 0) {
    statBox.style.display = 'none';
    emptyNote.style.display = 'block';
    emptyNote.textContent = barbMentions === 0
      ? 'Im eingefügten Text wurde kein "Barbarendorf" gefunden. Stelle sicher, dass du den kompletten Berichtstext (inkl. Zielangabe) eingefügt hast.'
      : '"Barbarendorf" wurde ' + barbMentions + ' mal gefunden, aber es konnten keine Koordinaten in der Nähe erkannt werden. Prüfe das Format des eingefügten Texts.';
    return;
  }

  emptyNote.style.display = 'none';
  document.getElementById('result-coords').value = coords.join(' ');
  document.getElementById('result-count').textContent = coords.length + ' Koordinaten';
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
