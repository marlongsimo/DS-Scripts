// Angriffsplaner: ordnet Heimatdörfer per Nearest-Neighbor den nächstgelegenen,
// noch nicht zugeteilten Zielen zu und berechnet je Paar die Abschickzeit für
// eine gewünschte gemeinsame Ankunftszeit.

var BASE_SPEED = { spear: 18, sword: 22, axe: 18, archer: 18, spy: 9, light: 10, marcher: 10, heavy: 11, ram: 30, catapult: 30, knight: 10, snob: 35 };
var COORD_PATTERN = /^\d{1,3}\|\d{1,3}$/;

function parseCoordsOrdered(raw) {
  var tokens = raw.split(/[\s,]+/).map(function (t) { return t.trim(); }).filter(Boolean);
  var valid = [];
  var invalid = [];

  tokens.forEach(function (token) {
    if (COORD_PATTERN.test(token)) {
      valid.push(token);
    } else {
      invalid.push(token);
    }
  });

  return { valid: valid, invalid: invalid };
}

function coordDist(c1, c2) {
  var p1 = c1.split('|').map(Number);
  var p2 = c2.split('|').map(Number);
  var dx = p2[0] - p1[0];
  var dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function calcTravelMs(unit, dist, wSpeed, uSpeed) {
  return (dist * (BASE_SPEED[unit] || 30)) / (wSpeed * uSpeed) * 60 * 1000;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateDE(d) {
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function msToHMS(ms) {
  var s = Math.round(ms / 1000);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return pad(h) + ':' + pad(m) + ':' + pad(sec);
}

function assignNearestNeighbor(homes, targets) {
  var pool = targets.slice();
  var used = new Array(pool.length).fill(false);
  var usedCount = 0;
  var pairs = [];

  for (var h = 0; h < homes.length && usedCount < pool.length; h++) {
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < pool.length; i++) {
      if (used[i]) continue;
      var d = coordDist(homes[h], pool[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    used[bestIdx] = true;
    usedCount++;
    pairs.push({ home: homes[h], target: pool[bestIdx], dist: bestDist });
  }

  return {
    pairs: pairs,
    unmatchedHomes: homes.length - pairs.length,
    unmatchedTargets: pool.length - usedCount
  };
}

function plan() {
  var errorBox = document.getElementById('plan-error');
  errorBox.textContent = '';
  document.getElementById('result-box').style.display = 'none';

  var homeParsed = parseCoordsOrdered(document.getElementById('home-coords').value);
  var targetParsed = parseCoordsOrdered(document.getElementById('target-coords').value);

  if (homeParsed.valid.length === 0 || targetParsed.valid.length === 0) {
    errorBox.textContent = 'Bitte mindestens ein gültiges Heimatdorf und ein gültiges Ziel (Format 123|456) eingeben.';
    return;
  }

  var arrivalRaw = document.getElementById('arrival-time').value;
  var arrivalDate = arrivalRaw ? new Date(arrivalRaw) : null;
  if (!arrivalDate || isNaN(arrivalDate.getTime())) {
    errorBox.textContent = 'Bitte eine gültige Ankunftszeit angeben.';
    return;
  }

  var unit = document.getElementById('unit-select').value;
  var wSpeed = parseFloat(document.getElementById('worldSpeed').value) || 1;
  var uSpeed = parseFloat(document.getElementById('unitSpeed').value) || 1;

  var assignment = assignNearestNeighbor(homeParsed.valid, targetParsed.valid);
  var now = new Date();

  var rows = assignment.pairs.map(function (p) {
    var travelMs = calcTravelMs(unit, p.dist, wSpeed, uSpeed);
    var sendDate = new Date(arrivalDate.getTime() - travelMs);
    return {
      home: p.home,
      target: p.target,
      dist: p.dist,
      travelMs: travelMs,
      sendDate: sendDate,
      tooLate: sendDate.getTime() < now.getTime()
    };
  });

  rows.sort(function (a, b) { return a.sendDate.getTime() - b.sendDate.getTime(); });

  renderResult(rows, assignment.unmatchedHomes, assignment.unmatchedTargets, homeParsed.invalid.length + targetParsed.invalid.length, arrivalDate);
}

function renderResult(rows, unmatchedHomes, unmatchedTargets, invalidCount, arrivalDate) {
  document.getElementById('stat-pairs').textContent = '✓ ' + rows.length + ' geplante' + (rows.length === 1 ? 'r Angriff' : ' Angriffe');

  var unmatchedBox = document.getElementById('stat-unmatched');
  if (unmatchedHomes > 0 || unmatchedTargets > 0) {
    var parts = [];
    if (unmatchedHomes > 0) parts.push(unmatchedHomes + ' ' + (unmatchedHomes === 1 ? 'Heimatdorf' : 'Heimatdörfer') + ' ohne Ziel');
    if (unmatchedTargets > 0) parts.push(unmatchedTargets + ' Ziel' + (unmatchedTargets === 1 ? '' : 'e') + ' ohne Heimatdorf');
    unmatchedBox.style.display = 'inline-flex';
    unmatchedBox.textContent = '⚠ ' + parts.join(', ');
  } else {
    unmatchedBox.style.display = 'none';
  }

  var invalidBox = document.getElementById('stat-invalid');
  if (invalidCount > 0) {
    invalidBox.style.display = 'inline-flex';
    invalidBox.textContent = '⚠ ' + invalidCount + ' ungültige Eingabe' + (invalidCount === 1 ? '' : 'n') + ' ignoriert';
  } else {
    invalidBox.style.display = 'none';
  }

  var tbody = document.getElementById('result-body');
  tbody.innerHTML = '';
  var lines = [];

  rows.forEach(function (r) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + r.home + '</td>' +
      '<td>' + r.target + '</td>' +
      '<td>' + r.dist.toFixed(2) + '</td>' +
      '<td>' + formatDateDE(r.sendDate) + (r.tooLate ? ' <span style="color:var(--danger); font-weight:600;">⚠ Zu spät</span>' : '') + '</td>' +
      '<td>' + formatDateDE(arrivalDate) + '</td>' +
      '<td>' + msToHMS(r.travelMs) + '</td>';
    tbody.appendChild(tr);

    lines.push(r.home + ' -> ' + r.target + ' | Abschicken: ' + formatDateDE(r.sendDate) + ' | Ankunft: ' + formatDateDE(arrivalDate) + (r.tooLate ? ' | ZU SPÄT' : ''));
  });

  document.getElementById('result-list').value = lines.join('\n');
  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('plan-form').addEventListener('submit', function (e) {
    e.preventDefault();
    plan();
  });

  document.getElementById('copy-result').addEventListener('click', function () {
    var textarea = document.getElementById('result-list');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(function () {
      var btn = document.getElementById('copy-result');
      var original = btn.textContent;
      btn.textContent = '✅ Kopiert!';
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  });
});
