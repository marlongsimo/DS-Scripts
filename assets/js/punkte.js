// Punkte-Rechner: Schätzung der Dorfpunkte anhand von Gebäudestufen
// Punkte je Gebäude folgen näherungsweise: punkte(level) = basis * (1 + steigerung/100)^(level-1)
// Die Basiswerte sind Schätzungen zur Orientierung, keine exakten Spieldaten.

var POINT_BUILDINGS = [
  { key: 'hq', name: 'Hauptgebäude', base: 5, growth: 13.7, max: 30 },
  { key: 'barracks', name: 'Baracke', base: 2, growth: 14, max: 25 },
  { key: 'stable', name: 'Stall', base: 2, growth: 15, max: 20 },
  { key: 'workshop', name: 'Werkstatt', base: 2, growth: 16, max: 15 },
  { key: 'smithy', name: 'Schmiede', base: 2, growth: 14, max: 20 },
  { key: 'academy', name: 'Akademie', base: 5, growth: 20, max: 3 },
  { key: 'rally', name: 'Sammelplatz', base: 5, growth: 0, max: 1 },
  { key: 'market', name: 'Markt', base: 2, growth: 13, max: 25 },
  { key: 'warehouse', name: 'Speicher', base: 1, growth: 12, max: 30 },
  { key: 'hiding', name: 'Versteck', base: 1, growth: 16, max: 10 },
  { key: 'wall', name: 'Wall', base: 2, growth: 11, max: 20 },
  { key: 'farm', name: 'Bauernhof', base: 1, growth: 11, max: 30 },
  { key: 'timber', name: 'Holzfäller', base: 1, growth: 11, max: 30 },
  { key: 'clay', name: 'Lehmgrube', base: 1, growth: 11, max: 30 },
  { key: 'iron', name: 'Eisenmine', base: 1, growth: 11, max: 30 }
];

function pointsForLevel(building, level) {
  if (level <= 0) return 0;
  return building.base * Math.pow(1 + building.growth / 100, level - 1);
}

function buildForm() {
  var container = document.getElementById('building-fields');
  POINT_BUILDINGS.forEach(function (building) {
    var wrapper = document.createElement('div');
    wrapper.className = 'field';
    wrapper.innerHTML =
      '<label for="lvl-' + building.key + '">' + building.name + ' (0–' + building.max + ')</label>' +
      '<input type="number" id="lvl-' + building.key + '" min="0" max="' + building.max + '" value="0">';
    container.appendChild(wrapper);
  });
}

function formatNumber(n) {
  return Math.round(n).toLocaleString('de-DE');
}

function calculate() {
  var tbody = document.getElementById('points-table-body');
  tbody.innerHTML = '';
  var total = 0;

  POINT_BUILDINGS.forEach(function (building) {
    var input = document.getElementById('lvl-' + building.key);
    var level = Math.min(building.max, Math.max(0, parseInt(input.value, 10) || 0));
    input.value = level;
    var points = pointsForLevel(building, level);
    total += points;

    if (level > 0) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>' + building.name + '</td>' +
        '<td>Stufe ' + level + '</td>' +
        '<td>' + formatNumber(points) + '</td>';
      tbody.appendChild(row);
    }
  });

  if (!tbody.children.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);">Noch keine Stufen &gt; 0 eingetragen.</td></tr>';
  }

  document.getElementById('total-points').textContent = formatNumber(total);
}

document.addEventListener('DOMContentLoaded', function () {
  buildForm();

  document.getElementById('calc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculate();
  });

  document.getElementById('reset-btn').addEventListener('click', function () {
    POINT_BUILDINGS.forEach(function (building) {
      document.getElementById('lvl-' + building.key).value = 0;
    });
    calculate();
  });

  calculate();
});
