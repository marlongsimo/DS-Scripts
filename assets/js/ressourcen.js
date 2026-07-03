// Ressourcen-/Bauzeit-Rechner
// Kostenformel: cost(level) = basis * (1 + steigerung/100)^(level-1)
// Bauzeitformel: zeit(level) = basis * (1 + steigerung/100)^(level-1) / (1 + (hqLevel-1)*0.05) / weltgeschwindigkeit

var BUILDING_PRESETS = {
  hq: { name: 'Hauptgebäude', wood: 90, clay: 80, iron: 70, pop: 5, buildMin: 5, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 30 },
  barracks: { name: 'Baracke', wood: 200, clay: 170, iron: 90, pop: 6, buildMin: 10, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 25 },
  stable: { name: 'Stall', wood: 270, clay: 240, iron: 260, pop: 6, buildMin: 20, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 20 },
  workshop: { name: 'Werkstatt', wood: 300, clay: 240, iron: 260, pop: 6, buildMin: 30, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 15 },
  smithy: { name: 'Schmiede', wood: 220, clay: 180, iron: 240, pop: 20, buildMin: 20, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 20 },
  academy: { name: 'Akademie', wood: 16000, clay: 16000, iron: 16000, pop: 20, buildMin: 180, growthRes: 26, growthPop: 0, growthTime: 0, maxLevel: 3 },
  market: { name: 'Markt', wood: 100, clay: 110, iron: 90, pop: 4, buildMin: 15, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 25 },
  warehouse: { name: 'Speicher', wood: 60, clay: 50, iron: 40, pop: 1, buildMin: 5, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 30 },
  hiding: { name: 'Versteck', wood: 50, clay: 60, iron: 50, pop: 1, buildMin: 5, growthRes: 35, growthPop: 0, growthTime: 16, maxLevel: 10 },
  wall: { name: 'Wall', wood: 50, clay: 100, iron: 20, pop: 0, buildMin: 15, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 20 },
  farm: { name: 'Bauernhof', wood: 45, clay: 40, iron: 30, pop: 0, buildMin: 5, growthRes: 26, growthPop: 0, growthTime: 16, maxLevel: 30 },
  timber: { name: 'Holzfäller', wood: 50, clay: 60, iron: 40, pop: 1, buildMin: 5, growthRes: 25, growthPop: 0, growthTime: 16, maxLevel: 30 },
  clay: { name: 'Lehmgrube', wood: 65, clay: 50, iron: 40, pop: 1, buildMin: 5, growthRes: 25, growthPop: 0, growthTime: 16, maxLevel: 30 },
  iron: { name: 'Eisenmine', wood: 75, clay: 65, iron: 70, pop: 1, buildMin: 5, growthRes: 25, growthPop: 0, growthTime: 16, maxLevel: 30 }
};

function fillFromPreset() {
  var key = document.getElementById('building-select').value;
  var preset = BUILDING_PRESETS[key];
  if (!preset) return;

  document.getElementById('base-wood').value = preset.wood;
  document.getElementById('base-clay').value = preset.clay;
  document.getElementById('base-iron').value = preset.iron;
  document.getElementById('base-pop').value = preset.pop;
  document.getElementById('base-time').value = preset.buildMin;
  document.getElementById('growth-res').value = preset.growthRes;
  document.getElementById('growth-pop').value = preset.growthPop;
  document.getElementById('growth-time').value = preset.growthTime;
  document.getElementById('target-level').value = Math.min(preset.maxLevel, parseInt(document.getElementById('current-level').value || '0', 10) + 5);
}

function formatNumber(n) {
  return Math.round(n).toLocaleString('de-DE');
}

function formatDuration(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  function pad(n) { return String(n).padStart(2, '0'); }
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function calculate() {
  var currentLevel = parseInt(document.getElementById('current-level').value, 10) || 0;
  var targetLevel = parseInt(document.getElementById('target-level').value, 10) || 0;
  var baseWood = parseFloat(document.getElementById('base-wood').value) || 0;
  var baseClay = parseFloat(document.getElementById('base-clay').value) || 0;
  var baseIron = parseFloat(document.getElementById('base-iron').value) || 0;
  var basePop = parseFloat(document.getElementById('base-pop').value) || 0;
  var baseTimeMin = parseFloat(document.getElementById('base-time').value) || 0;
  var growthRes = 1 + (parseFloat(document.getElementById('growth-res').value) || 0) / 100;
  var growthPop = 1 + (parseFloat(document.getElementById('growth-pop').value) || 0) / 100;
  var growthTime = 1 + (parseFloat(document.getElementById('growth-time').value) || 0) / 100;
  var hqLevel = parseInt(document.getElementById('hq-level').value, 10) || 1;
  var worldSpeed = parseFloat(document.getElementById('world-speed').value) || 1;

  var errorBox = document.getElementById('calc-error');
  errorBox.textContent = '';

  if (targetLevel <= currentLevel) {
    errorBox.textContent = 'Die Ziel-Stufe muss höher sein als die aktuelle Stufe.';
    document.getElementById('result-box').style.display = 'none';
    return;
  }

  var tbody = document.getElementById('level-table-body');
  tbody.innerHTML = '';

  var totalWood = 0, totalClay = 0, totalIron = 0, totalPop = 0, totalSeconds = 0;
  var hqFactor = 1 + (hqLevel - 1) * 0.05;

  for (var level = currentLevel + 1; level <= targetLevel; level++) {
    var wood = baseWood * Math.pow(growthRes, level - 1);
    var clay = baseClay * Math.pow(growthRes, level - 1);
    var iron = baseIron * Math.pow(growthRes, level - 1);
    var pop = basePop * Math.pow(growthPop, level - 1);
    var timeSeconds = (baseTimeMin * 60) * Math.pow(growthTime, level - 1) / hqFactor / worldSpeed;

    totalWood += wood;
    totalClay += clay;
    totalIron += iron;
    totalPop += pop;
    totalSeconds += timeSeconds;

    var row = document.createElement('tr');
    row.innerHTML =
      '<td>Stufe ' + level + '</td>' +
      '<td>' + formatNumber(wood) + '</td>' +
      '<td>' + formatNumber(clay) + '</td>' +
      '<td>' + formatNumber(iron) + '</td>' +
      '<td>' + formatNumber(pop) + '</td>' +
      '<td>' + formatDuration(timeSeconds) + '</td>';
    tbody.appendChild(row);
  }

  document.getElementById('total-wood').textContent = formatNumber(totalWood);
  document.getElementById('total-clay').textContent = formatNumber(totalClay);
  document.getElementById('total-iron').textContent = formatNumber(totalIron);
  document.getElementById('total-pop').textContent = formatNumber(totalPop);
  document.getElementById('total-time').textContent = formatDuration(totalSeconds);

  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('building-select').addEventListener('change', function () {
    fillFromPreset();
    calculate();
  });

  document.getElementById('calc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    calculate();
  });

  fillFromPreset();
  calculate();
});
