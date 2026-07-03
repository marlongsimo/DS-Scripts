// Truppen-Rechner: Ausbildungskosten und -zeit
// Zeitformel: zeit(pro Einheit) = basiszeit / (1 + (gebäudeStufe-1)*0.05) / weltgeschwindigkeit
// Gesamtzeit = Anzahl * zeit(pro Einheit)  (sequentielle Ausbildung in der Warteschlange)

var UNIT_PRESETS = {
  spear: { name: 'Speerträger', icon: '🔱', wood: 50, clay: 30, iron: 10, pop: 1, timeSec: 1602, building: 'Baracke' },
  sword: { name: 'Schwertkämpfer', icon: '🗡️', wood: 30, clay: 30, iron: 70, pop: 1, timeSec: 1802, building: 'Baracke' },
  axe: { name: 'Axtkämpfer', icon: '🪓', wood: 60, clay: 30, iron: 40, pop: 1, timeSec: 1998, building: 'Baracke' },
  archer: { name: 'Bogenschütze', icon: '🏹', wood: 100, clay: 30, iron: 60, pop: 1, timeSec: 1500, building: 'Baracke' },
  scout: { name: 'Späher', icon: '🔭', wood: 50, clay: 50, iron: 20, pop: 2, timeSec: 900, building: 'Stall' },
  light: { name: 'Leichte Kavallerie', icon: '🐎', wood: 125, clay: 100, iron: 250, pop: 4, timeSec: 1652, building: 'Stall' },
  marcher: { name: 'Berittener Bogenschütze', icon: '🏹', wood: 250, clay: 100, iron: 150, pop: 5, timeSec: 2400, building: 'Stall' },
  heavy: { name: 'Schwerer Reiter', icon: '🐴', wood: 200, clay: 150, iron: 600, pop: 6, timeSec: 3600, building: 'Stall' },
  ram: { name: 'Ramme', icon: '🛠️', wood: 300, clay: 200, iron: 200, pop: 5, timeSec: 4800, building: 'Werkstatt' },
  catapult: { name: 'Katapult', icon: '💥', wood: 320, clay: 400, iron: 100, pop: 8, timeSec: 5400, building: 'Werkstatt' },
  knight: { name: 'Paladin', icon: '🛡️', wood: 20000, clay: 20000, iron: 20000, pop: 10, timeSec: 3600, building: 'Statue', oneTime: true },
  snob: { name: 'Adelsgeschlecht', icon: '👑', wood: 40000, clay: 50000, iron: 50000, pop: 100, timeSec: 18000, building: 'Akademie', oneTime: true }
};

function fillFromPreset() {
  var key = document.getElementById('unit-select').value;
  var preset = UNIT_PRESETS[key];
  if (!preset) return;

  document.getElementById('base-wood').value = preset.wood;
  document.getElementById('base-clay').value = preset.clay;
  document.getElementById('base-iron').value = preset.iron;
  document.getElementById('base-pop').value = preset.pop;
  document.getElementById('base-time').value = preset.timeSec;
  document.getElementById('building-name').textContent = preset.building;
  document.getElementById('count').value = preset.oneTime ? 1 : 10;
  document.getElementById('count').disabled = !!preset.oneTime;
}

function formatNumber(n) {
  return Math.round(n).toLocaleString('de-DE');
}

function formatDuration(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  var d = Math.floor(totalSeconds / 86400);
  var h = Math.floor((totalSeconds % 86400) / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  function pad(n) { return String(n).padStart(2, '0'); }
  return (d > 0 ? d + 'T ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
}

function calculate() {
  var count = parseInt(document.getElementById('count').value, 10) || 0;
  var wood = parseFloat(document.getElementById('base-wood').value) || 0;
  var clay = parseFloat(document.getElementById('base-clay').value) || 0;
  var iron = parseFloat(document.getElementById('base-iron').value) || 0;
  var pop = parseFloat(document.getElementById('base-pop').value) || 0;
  var baseTime = parseFloat(document.getElementById('base-time').value) || 0;
  var buildingLevel = parseInt(document.getElementById('building-level').value, 10) || 1;
  var worldSpeed = parseFloat(document.getElementById('world-speed').value) || 1;

  var levelFactor = 1 + (buildingLevel - 1) * 0.05;
  var perUnitTime = baseTime / levelFactor / worldSpeed;
  var totalTime = perUnitTime * count;

  document.getElementById('total-wood').textContent = formatNumber(wood * count);
  document.getElementById('total-clay').textContent = formatNumber(clay * count);
  document.getElementById('total-iron').textContent = formatNumber(iron * count);
  document.getElementById('total-pop').textContent = formatNumber(pop * count);
  document.getElementById('per-unit-time').textContent = formatDuration(perUnitTime);
  document.getElementById('total-time').textContent = formatDuration(totalTime);

  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('unit-select').addEventListener('change', function () {
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
