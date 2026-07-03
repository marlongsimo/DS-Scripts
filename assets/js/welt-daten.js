// Welt-Daten: lädt periodisch synchronisierte Stämme-/Spieler-Ranglisten
// (siehe scripts/sync-tw-data.mjs) und zeigt jeweils die Top 10 sortier-/
// durchsuchbar an, inkl. Countdown bis zur nächsten automatischen
// Aktualisierung (Sync läuft alle 6h zu vollen UTC-Stunden 0/6/12/18).
//
// Klick auf einen Stamm/Spieler öffnet eine Detail-Ansicht (Mitglieder
// bzw. Dörfer). Dorfdaten (data/{welt}-villages.json) werden dabei erst
// beim ersten Klick nachgeladen und pro Welt im Speicher gecacht.

var TOP_N = 10;
var SYNC_HOURS_UTC = [0, 6, 12, 18];

var currentData = null;
var currentWorldCode = null;
var currentTribeId = null;
var currentPlayerId = null;
var currentPlayerVillages = [];
var playerReturnTarget = 'overview';
var villagesCache = {};

var sortState = {
  allies: { key: 'rank', dir: 1 },
  players: { key: 'rank', dir: 1 },
  tribeMembers: { key: 'rank', dir: 1 },
  playerVillages: { key: 'points', dir: -1 }
};

function formatNumber(n) {
  return Number(n || 0).toLocaleString('de-DE');
}

function formatRelativeTime(iso) {
  if (!iso) return '–';
  var diffMs = Date.now() - new Date(iso).getTime();
  var minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'vor wenigen Sekunden';
  if (minutes < 60) return 'vor ' + minutes + ' Minute' + (minutes === 1 ? '' : 'n');
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return 'vor ' + hours + ' Stunde' + (hours === 1 ? '' : 'n');
  var days = Math.floor(hours / 24);
  return 'vor ' + days + ' Tag' + (days === 1 ? '' : 'en');
}

function showPanel(name) {
  document.getElementById('data-panels').style.display = name === 'overview' ? 'block' : 'none';
  document.getElementById('tribe-detail').style.display = name === 'tribe' ? 'block' : 'none';
  document.getElementById('player-detail').style.display = name === 'player' ? 'block' : 'none';
}

async function loadWorldList() {
  var res = await fetch('data/worlds.json?v=' + Date.now(), { cache: 'no-store' });
  var worlds = await res.json();
  var select = document.getElementById('world-select');
  select.innerHTML = '';
  worlds.forEach(function (w) {
    var opt = document.createElement('option');
    opt.value = w.code;
    opt.textContent = w.label + ' (Stand ' + formatRelativeTime(w.updatedAt) + ')';
    select.appendChild(opt);
  });
  return worlds;
}

async function loadWorldData(code) {
  currentWorldCode = code;
  showPanel('overview');

  var statusBox = document.getElementById('load-status');
  statusBox.textContent = 'Lade Daten für ' + code + ' …';
  statusBox.style.display = 'block';
  document.getElementById('data-panels').style.display = 'none';

  try {
    var res = await fetch('data/' + code + '.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    currentData = await res.json();
    statusBox.style.display = 'none';
    document.getElementById('data-panels').style.display = 'block';
    document.getElementById('updated-at').textContent = 'Stand ' + formatRelativeTime(currentData.updatedAt);
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
  var matches = currentData.allies.filter(function (a) {
    return !search || a.name.toLowerCase().indexOf(search) !== -1 || a.tag.toLowerCase().indexOf(search) !== -1;
  });
  matches = sortRows(matches, sortState.allies.key, sortState.allies.dir);
  var rows = matches.slice(0, TOP_N);

  var tbody = document.getElementById('allies-body');
  tbody.innerHTML = '';
  rows.forEach(function (a) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-clickable', '');
    tr.innerHTML =
      '<td>' + a.rank + '</td>' +
      '<td><span class="badge">' + a.tag + '</span></td>' +
      '<td>' + a.name + '</td>' +
      '<td>' + formatNumber(a.members) + '</td>' +
      '<td>' + formatNumber(a.villages) + '</td>' +
      '<td>' + formatNumber(a.points) + '</td>';
    tr.addEventListener('click', function () { showTribeDetail(a.id); });
    tbody.appendChild(tr);
  });
  document.getElementById('allies-count').textContent = rows.length + ' von ' + matches.length + ' Stämmen';
}

function renderPlayers() {
  if (!currentData) return;
  var search = document.getElementById('player-search').value.trim().toLowerCase();
  var matches = currentData.players.filter(function (p) {
    return !search || p.name.toLowerCase().indexOf(search) !== -1 || (p.allyTag && p.allyTag.toLowerCase().indexOf(search) !== -1);
  });
  matches = sortRows(matches, sortState.players.key, sortState.players.dir);
  var rows = matches.slice(0, TOP_N);

  var tbody = document.getElementById('players-body');
  tbody.innerHTML = '';
  rows.forEach(function (p) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-clickable', '');
    tr.innerHTML =
      '<td>' + p.rank + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + (p.allyTag ? '<span class="badge">' + p.allyTag + '</span>' : '<span style="color:var(--text-muted);">–</span>') + '</td>' +
      '<td>' + formatNumber(p.villages) + '</td>' +
      '<td>' + formatNumber(p.points) + '</td>';
    tr.addEventListener('click', function () { showPlayerDetail(p.id, 'overview'); });
    tbody.appendChild(tr);
  });
  document.getElementById('players-count').textContent = rows.length + ' von ' + matches.length + ' Spielern';
}

function showTribeDetail(allyId) {
  if (!currentData) return;
  var ally = currentData.allies.find(function (a) { return a.id === allyId; });
  if (!ally) return;

  currentTribeId = allyId;
  document.getElementById('tribe-detail-title').textContent = ally.name + ' [' + ally.tag + ']';
  document.getElementById('tribe-detail-members').textContent = formatNumber(ally.members);
  document.getElementById('tribe-detail-villages').textContent = formatNumber(ally.villages);
  document.getElementById('tribe-detail-points').textContent = formatNumber(ally.points);

  renderTribeMembers();
  showPanel('tribe');
}

function renderTribeMembers() {
  if (!currentData || !currentTribeId) return;
  var members = currentData.players.filter(function (p) { return p.allyId === currentTribeId; });
  members = sortRows(members, sortState.tribeMembers.key, sortState.tribeMembers.dir);

  var tbody = document.getElementById('tribe-members-body');
  tbody.innerHTML = '';
  members.forEach(function (p) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-clickable', '');
    tr.innerHTML =
      '<td>' + p.rank + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + formatNumber(p.villages) + '</td>' +
      '<td>' + formatNumber(p.points) + '</td>';
    tr.addEventListener('click', function () { showPlayerDetail(p.id, currentTribeId); });
    tbody.appendChild(tr);
  });
}

async function loadVillagesForCurrentWorld() {
  if (villagesCache[currentWorldCode]) return villagesCache[currentWorldCode];
  var res = await fetch('data/' + currentWorldCode + '-villages.json?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  villagesCache[currentWorldCode] = data;
  return data;
}

async function showPlayerDetail(playerId, returnTarget) {
  if (!currentData) return;
  var player = currentData.players.find(function (p) { return p.id === playerId; });
  if (!player) return;

  currentPlayerId = playerId;
  playerReturnTarget = returnTarget || 'overview';

  document.getElementById('player-detail-title').textContent = player.name;
  document.getElementById('player-detail-ally').textContent = player.allyTag || '–';
  document.getElementById('player-detail-rank').textContent = player.rank;
  document.getElementById('player-detail-villages').textContent = formatNumber(player.villages);
  document.getElementById('player-detail-points').textContent = formatNumber(player.points);

  var statusEl = document.getElementById('villages-status');
  var tableEl = document.getElementById('player-villages-table');
  tableEl.style.display = 'none';
  statusEl.style.display = 'block';
  statusEl.textContent = 'Lade Dorfliste …';
  showPanel('player');

  try {
    var villagesByPlayer = await loadVillagesForCurrentWorld();
    currentPlayerVillages = villagesByPlayer[playerId] || [];
    if (currentPlayerVillages.length === 0) {
      statusEl.textContent = 'Keine Dörfer gefunden.';
    } else {
      statusEl.style.display = 'none';
      tableEl.style.display = '';
      renderPlayerVillages();
    }
  } catch (err) {
    statusEl.textContent = 'Dorfdaten für diese Welt sind aktuell nicht verfügbar.';
  }
}

function renderPlayerVillages() {
  var rows = currentPlayerVillages.map(function (v) {
    return { id: v.id, name: v.name, x: v.x, y: v.y, points: v.points, coord: v.x + '|' + v.y };
  });
  rows = sortRows(rows, sortState.playerVillages.key, sortState.playerVillages.dir);

  var tbody = document.getElementById('player-villages-body');
  tbody.innerHTML = '';
  rows.forEach(function (v) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + v.name + '</td>' +
      '<td>' + v.coord + '</td>' +
      '<td>' + formatNumber(v.points) + '</td>';
    tbody.appendChild(tr);
  });
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

function nextSyncDate() {
  var now = new Date();
  var dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (var i = 0; i < SYNC_HOURS_UTC.length; i++) {
    var candidate = new Date(dayStart + SYNC_HOURS_UTC[i] * 3600000);
    if (candidate > now) return candidate;
  }
  return new Date(dayStart + 24 * 3600000 + SYNC_HOURS_UTC[0] * 3600000);
}

function formatCountdown(ms) {
  var totalSeconds = Math.max(0, Math.round(ms / 1000));
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  function pad(n) { return String(n).padStart(2, '0'); }
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function tick() {
  var target = nextSyncDate();
  var nextEl = document.getElementById('next-update');
  if (nextEl) {
    var remaining = target.getTime() - Date.now();
    nextEl.textContent = remaining <= 0
      ? 'Aktualisierung läuft …'
      : 'Nächste Aktualisierung in ca. ' + formatCountdown(remaining);
  }

  var updatedEl = document.getElementById('updated-at');
  if (updatedEl && currentData) {
    updatedEl.textContent = 'Stand ' + formatRelativeTime(currentData.updatedAt);
  }
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

  document.getElementById('tribe-back').addEventListener('click', function () {
    showPanel('overview');
  });

  document.getElementById('player-back').addEventListener('click', function () {
    if (playerReturnTarget && playerReturnTarget !== 'overview') {
      showTribeDetail(playerReturnTarget);
    } else {
      showPanel('overview');
    }
  });

  setupSortableHeaders('allies-table', 'allies', renderAllies);
  setupSortableHeaders('players-table', 'players', renderPlayers);
  setupSortableHeaders('tribe-members-table', 'tribeMembers', renderTribeMembers);
  setupSortableHeaders('player-villages-table', 'playerVillages', renderPlayerVillages);

  tick();
  setInterval(tick, 1000);
});
