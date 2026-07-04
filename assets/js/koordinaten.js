// Koordinaten-Abgleich: neue Koordinaten mit bestehender Liste zusammenführen
// Format je Koordinate: Zahl|Zahl (z.B. 500|512), getrennt durch beliebige Leerzeichen/Zeilenumbrüche.

var COORD_PATTERN = /^\d{1,3}\|\d{1,3}$/;

function parseCoords(raw) {
  var tokens = raw.split(/[\s,]+/).map(function (t) { return t.trim(); }).filter(Boolean);
  var valid = [];
  var invalid = [];
  var seen = {};

  tokens.forEach(function (token) {
    if (!COORD_PATTERN.test(token)) {
      invalid.push(token);
      return;
    }
    if (!seen[token]) {
      seen[token] = true;
      valid.push(token);
    }
  });

  return { valid: valid, invalid: invalid };
}

function compare() {
  var newRaw = document.getElementById('new-coords').value;
  var existingRaw = document.getElementById('existing-coords').value;

  var newParsed = parseCoords(newRaw);
  var existingParsed = parseCoords(existingRaw);

  var existingSet = {};
  existingParsed.valid.forEach(function (c) { existingSet[c] = true; });

  var added = [];
  var duplicates = [];

  newParsed.valid.forEach(function (c) {
    if (existingSet[c]) {
      duplicates.push(c);
    } else {
      added.push(c);
      existingSet[c] = true;
    }
  });

  var merged = existingParsed.valid.concat(added);

  document.getElementById('stat-new').textContent = '✓ ' + added.length + ' neue Koordinate' + (added.length === 1 ? '' : 'n');
  document.getElementById('stat-dup').textContent = '✗ ' + duplicates.length + ' doppelte Koordinate' + (duplicates.length === 1 ? '' : 'n');

  var invalidCount = newParsed.invalid.length + existingParsed.invalid.length;
  var invalidBox = document.getElementById('stat-invalid');
  if (invalidCount > 0) {
    invalidBox.style.display = 'inline-flex';
    invalidBox.textContent = '⚠ ' + invalidCount + ' ungültige Eingabe' + (invalidCount === 1 ? '' : 'n') + ' ignoriert';
  } else {
    invalidBox.style.display = 'none';
  }

  document.getElementById('result-coords').value = merged.join(' ');
  document.getElementById('result-count').textContent = merged.length + ' Koordinaten gesamt';
  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('compare-form').addEventListener('submit', function (e) {
    e.preventDefault();
    compare();
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

  document.getElementById('use-as-existing').addEventListener('click', function () {
    document.getElementById('existing-coords').value = document.getElementById('result-coords').value;
    document.getElementById('new-coords').value = '';
    document.getElementById('result-box').style.display = 'none';
  });
});
