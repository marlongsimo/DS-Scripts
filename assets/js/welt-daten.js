// Welt-Daten: lädt periodisch synchronisierte Stämme-/Spieler-Ranglisten
// (siehe scripts/sync-tw-data.mjs) und zeigt sie sortier-/durchsuchbar an.

var currentData = null;
var sortState = { allies: { key: 'rank', dir: 1 }, players: { key: 'rank', dir: 1 } };

function formatNumber(n) {
  return Number(n || 0).toLocaleString('de-DE');
}

function formatTimestamp(iso) {
  if (!iso) return '–';
  var d = new Date(iso);
  return d.toLocaleString('de-DE');
}

async function loadWorldList() {
  var res = await fetch('../data/worlds.json');
  var worlds = await res.json();
  var select = document.getElementById('world-select');
  select.innerHTML = '';
  worlds.forEach(function (w) {
    var opt = document.createElement('option');
    opt.value = w.code;
    opt.textContent = w.label + ' (Stand: ' + formatTimestamp(w.updatedAt) + ')';
    select.appendChild(opt);
  });
  return worlds;
}

async function loadWorldData(code) {
  var statusBox = document.getElementById('load-status');
  statusBox.textContent = 'Lade Daten für ' + code + ' …';
  statusBox.style.display = 'block';
  document.getElementById('data-panels').style.display = 'none';

  try {
    var res = await fetch('../data/' + code + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    currentData = await res.json();
    statusBox.style.display = 'none';
    document.getElementById('data-panels').style.display = 'block';
    document.getElementById('updated-at').textContent = 'Stand: ' + formatTimestamp(currentData.updatedAt);
    renderAllies();
    renderPlayers();
  } catch (err) {
    statusBox.textContent = 'Fehler beim Laden der Daten für ' + code + ': ' + err.message;
  }
}

function sortRows(rows, key, dir) {
  return rows.slice().sort(function (a, b) {
    var va = a[key], vb = b[key];
    if (typeof va === 'string') {
      return dir * va.localeCompare(vb || '');
    }
    return dir * ((va || 0) - (vb || 0));
  });
}

function renderAllies() {
  if (!currentData) return;
  var search = document.getElementById('ally-search').value.trim().toLowerCase();
  var rows = currentData.allies.filter(function (a) {
    return !search || a.name.toLowerCase().indexOf(search) !== -1 || a.tag.toLowerCase().indexOf(search) !== -1;
  });
  rows = sortRows(rows, sortState.allies.key, sortState.allies.dir);

  var tbody = document.getElementById('allies-body');
  tbody.innerHTML = '';
  rows.forEach(function (a) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + a.rank + '</td>' +
      '<td><span class="badge">' + a.tag + '</span></td>' +
      '<td>' + a.name + '</td>' +
      '<td>' + formatNumber(a.members) + '</td>' +
      '<td>' + formatNumber(a.villages) + '</td>' +
      '<td>' + formatNumber(a.points) + '</td>';
    tbody.appendChild(tr);
  });
  document.getElementById('allies-count').textContent = rows.length + ' Stämme';
}

function renderPlayers() {
  if (!currentData) return;
  var search = document.getElementById('player-search').value.trim().toLowerCase();
  var rows = currentData.players.filter(function (p) {
    return !search || p.name.toLowerCase().indexOf(search) !== -1 || (p.allyTag && p.allyTag.toLowerCase().indexOf(search) !== -1);
  });
  rows = sortRows(rows, sortState.players.key, sortState.players.dir);

  var tbody = document.getElementById('players-body');
  tbody.innerHTML = '';
  rows.forEach(function (p) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + p.rank + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + (p.allyTag ? '<span class="badge">' + p.allyTag + '</span>' : '<span style="color:var(--text-muted);">–</span>') + '</td>' +
      '<td>' + formatNumber(p.villages) + '</td>' +
      '<td>' + formatNumber(p.points) + '</td>';
    tbody.appendChild(tr);
  });
  document.getElementById('players-count').textContent = rows.length + ' Spieler';
}

function setupSortableHeaders(tableId, group, renderFn) {
  document.querySelectorAll('#' + tableId + ' th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (sortState[group].key === key) {
        sortState[group].dir *= -1;
      } else {
        sortState[group].key = key;
        sortState[group].dir = 1;
      }
      renderFn();
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  loadWorldList().then(function (worlds) {
    if (worlds.length > 0) {
      loadWorldData(worlds[0].code);
    }
  });

  document.getElementById('world-select').addEventListener('change', function () {
    loadWorldData(this.value);
  });

  document.getElementById('ally-search').addEventListener('input', renderAllies);
  document.getElementById('player-search').addEventListener('input', renderPlayers);

  setupSortableHeaders('allies-table', 'allies', renderAllies);
  setupSortableHeaders('players-table', 'players', renderPlayers);
});
