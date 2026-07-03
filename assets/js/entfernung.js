// Entfernungs-Rechner: Distanz zwischen zwei Koordinaten (in Feldern)

function parseCoord(value) {
  var match = /^\s*(\d{1,3})\s*\|\s*(\d{1,3})\s*$/.exec(value);
  if (!match) return null;
  return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
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

  var dx = from.x - to.x;
  var dy = from.y - to.y;
  var distance = Math.sqrt(dx * dx + dy * dy);

  document.getElementById('result-distance').textContent = distance.toFixed(2) + ' Felder';
  document.getElementById('result-delta').textContent = 'Δx: ' + Math.abs(dx) + ', Δy: ' + Math.abs(dy);
  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('calc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculate();
  });

  calculate();
});
