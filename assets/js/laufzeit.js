// Laufzeit-Rechner: Truppenlaufzeit zwischen zwei Koordinaten
// Formel (offizielle Spielmechanik): Laufzeit (Min.) = Distanz(Felder) * Basis-Min./Feld / (Weltgeschw. * Einheitengeschw.)

var UNIT_SPEEDS = [
  { key: 'spear', name: 'Speerträger', icon: '🔱', minPerField: 18 },
  { key: 'sword', name: 'Schwertkämpfer', icon: '🗡️', minPerField: 22 },
  { key: 'axe', name: 'Axtkämpfer', icon: '🪓', minPerField: 18 },
  { key: 'archer', name: 'Bogenschütze', icon: '🏹', minPerField: 18 },
  { key: 'scout', name: 'Späher', icon: '🔭', minPerField: 9 },
  { key: 'light', name: 'Leichte Kavallerie', icon: '🐎', minPerField: 10 },
  { key: 'marcher', name: 'Berittener Bogenschütze', icon: '🏹', minPerField: 10 },
  { key: 'heavy', name: 'Schwerer Reiter', icon: '🐴', minPerField: 11 },
  { key: 'ram', name: 'Ramme', icon: '🛠️', minPerField: 30 },
  { key: 'catapult', name: 'Katapult', icon: '💥', minPerField: 30 },
  { key: 'knight', name: 'Paladin', icon: '🛡️', minPerField: 10 },
  { key: 'snob', name: 'Adelsgeschlecht', icon: '👑', minPerField: 35 }
];

function parseCoord(value) {
  var match = /^\s*(\d{1,3})\s*\|\s*(\d{1,3})\s*$/.exec(value);
  if (!match) return null;
  return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
}

function formatDuration(totalMinutes) {
  var totalSeconds = Math.round(totalMinutes * 60);
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  function pad(n) { return String(n).padStart(2, '0'); }
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function renderUnitTable(distance, worldSpeed, unitSpeed, startDate) {
  var tbody = document.getElementById('unit-table-body');
  tbody.innerHTML = '';

  UNIT_SPEEDS.forEach(function (unit) {
    var minutes = distance * unit.minPerField / (worldSpeed * unitSpeed);
    var row = document.createElement('tr');

    var arrival = '–';
    if (startDate) {
      var arrivalDate = new Date(startDate.getTime() + minutes * 60000);
      arrival = arrivalDate.toLocaleString('de-DE');
    }

    row.innerHTML =
      '<td>' + unit.icon + ' ' + unit.name + '</td>' +
      '<td>' + unit.minPerField + ' Min./Feld</td>' +
      '<td>' + formatDuration(minutes) + '</td>' +
      '<td>' + arrival + '</td>';
    tbody.appendChild(row);
  });
}

function calculate() {
  var errorBox = document.getElementById('calc-error');
  errorBox.textContent = '';

  var from = parseCoord(document.getElementById('from-coord').value);
  var to = parseCoord(document.getElementById('to-coord').value);

  if (!from || !to) {
    errorBox.textContent = 'Bitte gültige Koordinaten im Format 123|456 eingeben.';
    document.getElementById('result-box').style.display = 'none';
    return;
  }

  var worldSpeed = parseFloat(document.getElementById('world-speed').value) || 1;
  var unitSpeed = parseFloat(document.getElementById('unit-speed').value) || 1;

  var dx = from.x - to.x;
  var dy = from.y - to.y;
  var distance = Math.sqrt(dx * dx + dy * dy);

  document.getElementById('result-distance').textContent = distance.toFixed(2) + ' Felder';

  var startInput = document.getElementById('start-time').value;
  var startDate = startInput ? new Date(startInput) : null;

  renderUnitTable(distance, worldSpeed, unitSpeed, startDate);
  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('calc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculate();
  });

  document.getElementById('now-btn').addEventListener('click', function () {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('start-time').value = now.toISOString().slice(0, 16);
  });

  calculate();
});
