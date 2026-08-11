// Angriffsplaner Pro - UI-Controller. Verdrahtet die DOM-Elemente aus
// rechner/angriffsplaner.html mit AP.state (angriffsplaner-data.js),
// AP.parser (angriffsplaner-parser.js) und AP.plan (angriffsplaner-plan.js).
(function () {
  'use strict';

  // Nicht-persistente Laufzeit-Daten (Weltdaten-Cache, letztes Parse-Ergebnis).
  AP.runtime = { worldPlayers: [], worldAllies: [], villagesIndex: {}, lastParseResult: null, pendingParseRaw: null };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showStatus(el, message, type) {
    el.textContent = message;
    el.className = 'status ' + (type === 'error' ? 'err' : 'ok');
  }

  function setByPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  // ── Schritt-Navigation ───────────────────────────────────────────────
  function canEnterStep(step) {
    if (step >= 3 && AP.state.players.allies.length === 0) return 'Hinweis: Noch keine Verbündeten in Schritt 2 hinzugefügt.';
    if (step >= 4 && !AP.state.worldCode) return 'Hinweis: Noch keine Welt in Schritt 1 ausgewählt.';
    return null;
  }

  document.querySelectorAll('#ap-step-nav .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var step = tab.dataset.step;
      document.querySelectorAll('#ap-step-nav .tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('main .tab-panel[id^="ap-panel-"]').forEach(function (p) { p.classList.toggle('active', p.id === 'ap-panel-' + step); });
      var warning = canEnterStep(parseInt(step, 10));
      var warnEl = document.getElementById('ap-step-warning');
      if (warning) { warnEl.textContent = warning; warnEl.style.display = 'block'; } else { warnEl.style.display = 'none'; }
    });
  });

  document.querySelectorAll('#ap-settings-tabs .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.dataset.settingsTab;
      document.querySelectorAll('#ap-settings-tabs .tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('main .tab-panel[id^="ap-settings-panel-"]').forEach(function (p) { p.classList.toggle('active', p.id === 'ap-settings-panel-' + key); });
    });
  });

  // ── Schritt 1: Welt ──────────────────────────────────────────────────
  function populateWorldSelect() {
    AP.fetchWorldsList().then(function (worlds) {
      var select = document.getElementById('ap-world-select');
      select.innerHTML = worlds.map(function (w) { return '<option value="' + w.code + '">' + escapeHtml(w.label) + '</option>'; }).join('');
      if (AP.state.worldCode && worlds.some(function (w) { return w.code === AP.state.worldCode; })) {
        select.value = AP.state.worldCode;
      }
      if (select.value) loadWorld(select.value);
    }).catch(function () {
      document.getElementById('ap-world-select').innerHTML = '<option value="">Fehler beim Laden der Weltenliste</option>';
    });
  }

  function loadWorld(code) {
    AP.state.worldCode = code;
    AP.persist();
    Promise.all([
      AP.fetchWorldData(code).catch(function () { return null; }),
      AP.fetchWorldVillages(code).catch(function () { return null; }),
      AP.fetchWorldConfig(code)
    ]).then(function (results) {
      var worldData = results[0];
      var villagesData = results[1];
      var configData = results[2];

      AP.runtime.worldPlayers = (worldData && worldData.players) || [];
      AP.runtime.worldAllies = (worldData && worldData.allies) || [];

      var index = {};
      if (villagesData) {
        Object.keys(villagesData).forEach(function (playerId) {
          villagesData[playerId].forEach(function (v) {
            index[v.x + '|' + v.y] = { points: v.points, name: v.name, playerId: playerId };
          });
        });
      }
      AP.runtime.villagesIndex = index;

      if (configData) {
        AP.state.worldSpeed = configData.speed || 1;
        var unitSpeed = Object.assign({}, AP.BASE_SPEED);
        Object.keys(configData.units || {}).forEach(function (u) {
          if (configData.units[u] && configData.units[u].speed) unitSpeed[u] = configData.units[u].speed;
        });
        AP.state.unitSpeed = unitSpeed;
        AP.state.worldConfigFetchedAt = configData.updatedAt;
        document.getElementById('ap-world-config-warning').style.display = 'none';
      } else {
        AP.state.worldSpeed = 1;
        AP.state.unitSpeed = Object.assign({}, AP.BASE_SPEED);
        AP.state.worldConfigFetchedAt = null;
        document.getElementById('ap-world-config-warning').style.display = 'block';
      }
      AP.persist();
      renderWorldSpeedInfo();
      renderPlayerTable();
      renderBuckets();
      renderTroopPlayerSelect();
    });
  }

  function renderWorldSpeedInfo() {
    var box = document.getElementById('ap-world-speed-info');
    if (!AP.state.worldCode) { box.innerHTML = ''; return; }
    var pills = ['<span class="stat-pill stat-new">Weltgeschwindigkeit: ' + AP.state.worldSpeed + '</span>'];
    AP.UNIT_TYPES.forEach(function (u) {
      pills.push('<span class="stat-pill stat-bonus">' + AP.UNIT_LABELS[u] + ': ' + AP.state.unitSpeed[u] + ' min/Feld</span>');
    });
    box.innerHTML = pills.join('');
  }

  document.getElementById('ap-world-select').addEventListener('change', function (e) {
    if (e.target.value) loadWorld(e.target.value);
  });

  // ── Schritt 2: Spieler ───────────────────────────────────────────────
  function renderPlayerTable() {
    var tribesView = document.getElementById('ap-player-view-tribes').checked;
    var search = (document.getElementById('ap-player-search').value || '').toLowerCase();
    var body = document.getElementById('ap-player-table-body');
    var head = document.getElementById('ap-player-table-head');

    if (tribesView) {
      head.innerHTML = '<tr><th>Stamm</th><th>Mitglieder</th><th>Punkte</th><th></th></tr>';
      var tribes = AP.runtime.worldAllies.filter(function (a) {
        if (!search) return true;
        return (a.name || '').toLowerCase().indexOf(search) !== -1 || (a.tag || '').toLowerCase().indexOf(search) !== -1;
      }).slice(0, 200);
      body.innerHTML = tribes.map(function (a) {
        return '<tr>' +
          '<td>' + escapeHtml(a.name) + ' [' + escapeHtml(a.tag) + ']</td>' +
          '<td>' + (a.members || 0) + '</td>' +
          '<td>' + (a.points || 0).toLocaleString('de-DE') + '</td>' +
          '<td class="ap-player-row-actions">' +
            '<button type="button" class="btn btn-outline" data-add-ally-tribe="' + a.id + '">→ Verbündete</button>' +
            '<button type="button" class="btn btn-outline" data-add-enemy-tribe="' + a.id + '">→ Feinde</button>' +
          '</td></tr>';
      }).join('') || '<tr><td colspan="4" style="color:var(--text-muted);">Keine Treffer.</td></tr>';
      body.querySelectorAll('[data-add-ally-tribe]').forEach(function (btn) {
        btn.addEventListener('click', function () { addTribeToBucket(btn.dataset.addAllyTribe, 'allies'); });
      });
      body.querySelectorAll('[data-add-enemy-tribe]').forEach(function (btn) {
        btn.addEventListener('click', function () { addTribeToBucket(btn.dataset.addEnemyTribe, 'enemies'); });
      });
      return;
    }

    head.innerHTML = '<tr><th>Name</th><th>Stamm</th><th>Punkte</th><th></th></tr>';
    var alliesIds = {}; AP.state.players.allies.forEach(function (p) { alliesIds[p.id] = true; });
    var enemyIds = {}; AP.state.players.enemies.forEach(function (p) { enemyIds[p.id] = true; });
    var list = AP.runtime.worldPlayers.filter(function (p) {
      if (!search) return true;
      return (p.name || '').toLowerCase().indexOf(search) !== -1 || (p.allyTag || '').toLowerCase().indexOf(search) !== -1;
    }).slice(0, 200);
    body.innerHTML = list.map(function (p) {
      var already = alliesIds[p.id] ? ' (Verbündet)' : (enemyIds[p.id] ? ' (Feind)' : '');
      return '<tr>' +
        '<td>' + escapeHtml(p.name) + already + '</td>' +
        '<td>' + escapeHtml(p.allyTag || '-') + '</td>' +
        '<td>' + (p.points || 0).toLocaleString('de-DE') + '</td>' +
        '<td class="ap-player-row-actions">' +
          '<button type="button" class="btn btn-outline" data-add-ally="' + p.id + '">→ Verbündete</button>' +
          '<button type="button" class="btn btn-outline" data-add-enemy="' + p.id + '">→ Feinde</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--text-muted);">Keine Treffer.</td></tr>';
    body.querySelectorAll('[data-add-ally]').forEach(function (btn) {
      btn.addEventListener('click', function () { addPlayerToBucket(btn.dataset.addAlly, 'allies'); });
    });
    body.querySelectorAll('[data-add-enemy]').forEach(function (btn) {
      btn.addEventListener('click', function () { addPlayerToBucket(btn.dataset.addEnemy, 'enemies'); });
    });
  }

  function addPlayerToBucket(playerId, bucket) {
    var player = AP.runtime.worldPlayers.filter(function (p) { return String(p.id) === String(playerId); })[0];
    if (!player) return;
    var other = bucket === 'allies' ? 'enemies' : 'allies';
    AP.state.players[other] = AP.state.players[other].filter(function (p) { return String(p.id) !== String(playerId); });
    if (!AP.state.players[bucket].some(function (p) { return String(p.id) === String(playerId); })) {
      AP.state.players[bucket].push({ id: player.id, name: player.name, allyTag: player.allyTag, allyId: player.allyId });
    }
    AP.persist();
    renderBuckets();
    renderPlayerTable();
    renderTroopPlayerSelect();
  }

  function addTribeToBucket(allyId, bucket) {
    AP.runtime.worldPlayers
      .filter(function (p) { return String(p.allyId) === String(allyId); })
      .forEach(function (p) { addPlayerToBucket(p.id, bucket); });
  }

  function removePlayerFromBucket(playerId, bucket) {
    AP.state.players[bucket] = AP.state.players[bucket].filter(function (p) { return String(p.id) !== String(playerId); });
    AP.persist();
    renderBuckets();
    renderPlayerTable();
    renderTroopPlayerSelect();
  }

  function renderBuckets() {
    ['allies', 'enemies'].forEach(function (bucket) {
      var list = AP.state.players[bucket];
      var container = document.getElementById(bucket === 'allies' ? 'ap-allies-list' : 'ap-enemies-list');
      document.getElementById(bucket === 'allies' ? 'ap-allies-count' : 'ap-enemies-count').textContent = list.length;
      if (!list.length) { container.innerHTML = '<div class="ap-bucket-empty">Noch keine Einträge.</div>'; return; }
      container.innerHTML = list.map(function (p) {
        return '<div class="ap-bucket-item"><span>' + escapeHtml(p.name) + (p.allyTag ? ' (' + escapeHtml(p.allyTag) + ')' : '') + '</span>' +
          '<button type="button" data-remove="' + p.id + '" data-bucket="' + bucket + '">✖</button></div>';
      }).join('');
      container.querySelectorAll('[data-remove]').forEach(function (btn) {
        btn.addEventListener('click', function () { removePlayerFromBucket(btn.dataset.remove, btn.dataset.bucket); });
      });
    });
  }

  document.getElementById('ap-player-search').addEventListener('input', renderPlayerTable);
  document.getElementById('ap-player-view-tribes').addEventListener('change', renderPlayerTable);

  // ── Schritt 3: Truppen ───────────────────────────────────────────────
  function renderTroopPlayerSelect() {
    var select = document.getElementById('ap-troop-player-select');
    var allies = AP.state.players.allies;
    select.innerHTML = allies.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'; }).join('') || '<option value="">Keine Verbündeten</option>';
  }

  document.getElementById('ap-troop-parse-btn').addEventListener('click', function () {
    var raw = document.getElementById('ap-troop-paste').value;
    var statusEl = document.getElementById('ap-troop-status');
    if (!raw.trim()) { showStatus(statusEl, 'Bitte zuerst Text einfügen.', 'error'); return; }
    var mapping = AP.state.columnMapping[AP.state.worldCode];
    if (!mapping) {
      var count = AP.parser.detectColumnCount(raw);
      if (!count) { showStatus(statusEl, 'Konnte keine Dorf-Zeilen erkennen (keine Koordinaten im Text gefunden).', 'error'); return; }
      showColumnMappingBox(AP.parser.guessColumnMapping(count), raw);
      return;
    }
    runParseAndPreview(raw, mapping);
  });

  function showColumnMappingBox(mapping, raw) {
    var box = document.getElementById('ap-column-mapping-box');
    var fields = document.getElementById('ap-column-mapping-fields');
    fields.innerHTML = mapping.map(function (unit, i) {
      var options = AP.UNIT_TYPES.map(function (u) {
        return '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + AP.UNIT_LABELS[u] + '</option>';
      }).join('') + '<option value=""' + (unit ? '' : ' selected') + '>(ignorieren)</option>';
      return '<div class="field"><label>Spalte ' + (i + 1) + '</label><select data-col="' + i + '">' + options + '</select></div>';
    }).join('');
    AP.runtime.pendingParseRaw = raw;
    box.style.display = 'block';
    document.getElementById('ap-troop-preview-box').style.display = 'none';
  }

  document.getElementById('ap-column-mapping-apply').addEventListener('click', function () {
    var box = document.getElementById('ap-column-mapping-box');
    var mapping = Array.from(box.querySelectorAll('[data-col]')).map(function (s) { return s.value || null; });
    AP.state.columnMapping[AP.state.worldCode] = mapping;
    AP.persist();
    box.style.display = 'none';
    runParseAndPreview(AP.runtime.pendingParseRaw, mapping);
  });

  function runParseAndPreview(raw, mapping) {
    var result = AP.parser.parseTroopOverview(raw, mapping);
    AP.runtime.lastParseResult = result;
    renderTroopPreview(result);
  }

  function renderTroopPreview(result) {
    var body = document.getElementById('ap-troop-preview-body');
    var villagesIndex = AP.runtime.villagesIndex;
    body.innerHTML = result.rows.map(function (row, idx) {
      var unknown = !villagesIndex[row.coord];
      var unitCells = AP.UNIT_TYPES.map(function (u) {
        return '<td><input type="number" min="0" data-row="' + idx + '" data-unit="' + u + '" value="' + (row.units[u] || 0) + '"></td>';
      }).join('');
      return '<tr class="ap-village-row">' +
        '<td>' + escapeHtml(row.villageName) + (unknown ? ' <span title="Koordinate nicht in den synchronisierten Weltdaten gefunden" style="color:var(--accent-strong);">⚠</span>' : '') + '</td>' +
        '<td>' + row.coord + '</td>' + unitCells +
      '</tr>';
    }).join('') || '<tr><td colspan="14" style="color:var(--text-muted);">Keine Dorf-Zeilen erkannt.</td></tr>';

    document.getElementById('ap-troop-skipped-summary').textContent = 'Übersprungene Zeilen (' + result.skippedLines.length + ')';
    document.getElementById('ap-troop-skipped-lines').textContent = result.skippedLines.join('\n');
    document.getElementById('ap-troop-preview-box').style.display = 'block';
  }

  document.getElementById('ap-troop-commit-btn').addEventListener('click', function () {
    var playerId = document.getElementById('ap-troop-player-select').value;
    var statusEl = document.getElementById('ap-troop-status');
    if (!playerId) { showStatus(statusEl, 'Bitte einen Verbündeten auswählen.', 'error'); return; }
    if (!AP.runtime.lastParseResult) { showStatus(statusEl, 'Bitte zuerst parsen.', 'error'); return; }
    var body = document.getElementById('ap-troop-preview-body');
    var rows = AP.runtime.lastParseResult.rows.map(function (row, idx) {
      var units = {};
      AP.UNIT_TYPES.forEach(function (u) {
        var input = body.querySelector('[data-row="' + idx + '"][data-unit="' + u + '"]');
        units[u] = input ? (parseInt(input.value, 10) || 0) : 0;
      });
      return { coord: row.coord, villageName: row.villageName, units: units };
    });
    AP.state.troops[playerId] = { pastedAt: new Date().toISOString(), rawText: document.getElementById('ap-troop-paste').value, villages: rows };
    AP.persist();
    showStatus(statusEl, rows.length + ' Dörfer übernommen.', 'ok');
    document.getElementById('ap-troop-preview-box').style.display = 'none';
    document.getElementById('ap-troop-paste').value = '';
  });

  document.getElementById('ap-unavailable-offs').addEventListener('change', function (e) {
    AP.state.unavailableOffs = e.target.value;
    AP.persist();
  });

  // ── Schritt 4: Ziele ─────────────────────────────────────────────────
  function bindCoordTextarea(id, statePath) {
    var el = document.getElementById(id);
    el.addEventListener('change', function () {
      setByPath(AP.state, statePath, AP.parseCoordsFreeform(el.value));
      AP.persist();
    });
  }
  bindCoordTextarea('ap-bunker-coords', 'targets.bunkers.coords');
  bindCoordTextarea('ap-off-coords', 'targets.offTargets');
  bindCoordTextarea('ap-katta-coords', 'targets.kattaTargets');
  bindCoordTextarea('ap-ag-coords', 'targets.agTargets');
  bindCoordTextarea('ap-fake-coords', 'targets.fakeTargets');

  document.querySelectorAll('input[name="ap-bunker-mode"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (radio.checked) { AP.state.targets.bunkers.mode = radio.value; AP.persist(); }
    });
  });
  document.getElementById('ap-bunker-offs-per').addEventListener('change', function (e) {
    AP.state.targets.bunkers.offsPerBunker = Math.max(1, parseInt(e.target.value, 10) || 1);
    AP.persist();
  });
  document.getElementById('ap-fake-remaining').addEventListener('change', function (e) {
    AP.state.targets.fakeRemainingToggle = e.target.checked;
    AP.persist();
  });

  // ── Schritt 5: Einstellungen & Vorlagen ──────────────────────────────
  document.getElementById('ap-max-fakes').addEventListener('change', function (e) { AP.state.settings.maxFakesPerVillage = Math.max(0, parseInt(e.target.value, 10) || 0); AP.persist(); });
  document.getElementById('ap-max-incs').addEventListener('change', function (e) { AP.state.settings.maxIncsPerTarget = Math.max(1, parseInt(e.target.value, 10) || 1); AP.persist(); });
  document.getElementById('ap-avoid-round').addEventListener('change', function (e) { AP.state.settings.avoidRoundTimes = e.target.checked; AP.persist(); });
  document.getElementById('ap-fakegrenze-enabled').addEventListener('change', function (e) { AP.state.settings.fakeGrenzeEnabled = e.target.checked; AP.persist(); });
  document.getElementById('ap-fakegrenze-percent').addEventListener('change', function (e) { AP.state.settings.fakeGrenzePercent = Math.max(0, parseInt(e.target.value, 10) || 0); AP.persist(); });

  var TIME_WINDOW_CATEGORIES = [
    { key: 'katta', label: '💣 Katta-Wellen' },
    { key: 'off', label: '⚔️ Komplette Offs' },
    { key: 'ag', label: '👑 AG-Angriffe' },
    { key: 'fake', label: '🎭 Fakes' },
    { key: 'bunker', label: '🛡️ Bunker' }
  ];

  function renderTimeWindows() {
    var grid = document.getElementById('ap-timewindow-grid');
    grid.innerHTML = TIME_WINDOW_CATEGORIES.map(function (cat) {
      var w = AP.state.settings.timeWindows[cat.key] || {};
      return '<div class="panel">' +
        '<label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">' + cat.label + '</label>' +
        '<div class="field"><label>Datum</label><input type="date" data-window="' + cat.key + '" data-part="date" value="' + (w.date || '') + '"></div>' +
        '<div class="field"><label>Von</label><input type="time" data-window="' + cat.key + '" data-part="from" value="' + (w.from || '') + '"></div>' +
        '<div class="field" style="margin-bottom:0;"><label>Bis</label><input type="time" data-window="' + cat.key + '" data-part="to" value="' + (w.to || '') + '"></div>' +
      '</div>';
    }).join('');
    grid.querySelectorAll('[data-window]').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.dataset.window;
        var part = input.dataset.part;
        var current = AP.state.settings.timeWindows[key] || { date: '', from: '', to: '' };
        current[part] = input.value;
        AP.state.settings.timeWindows[key] = (!current.date && !current.from && !current.to) ? null : current;
        AP.persist();
      });
    });
  }

  function renderTemplates(category) {
    var container = document.getElementById('ap-templates-' + category);
    var list = AP.state.templates[category];
    container.innerHTML = list.map(function (t, idx) {
      var unitFields = AP.UNIT_TYPES.map(function (u) {
        return '<div class="field"><label>' + AP.UNIT_LABELS[u] + '</label><input type="number" min="0" data-tpl-unit="' + u + '" value="' + (t.units[u] || 0) + '"></div>';
      }).join('');
      return '<div class="ap-template-card" data-tpl-index="' + idx + '">' +
        '<div class="ap-template-card-head">' +
          '<div class="field"><label>Name</label><input type="text" data-tpl-name value="' + escapeHtml(t.name) + '"></div>' +
          '<button type="button" class="btn btn-outline" data-tpl-delete title="Löschen">🗑️</button>' +
        '</div>' +
        '<div class="ap-template-unit-grid">' + unitFields + '</div>' +
      '</div>';
    }).join('') || '<p style="color:var(--text-muted); font-size:0.85rem;">Noch keine Vorlagen.</p>';

    container.querySelectorAll('[data-tpl-index]').forEach(function (card) {
      var idx = parseInt(card.dataset.tplIndex, 10);
      card.querySelector('[data-tpl-name]').addEventListener('change', function (e) {
        AP.state.templates[category][idx].name = e.target.value;
        AP.persist();
      });
      card.querySelectorAll('[data-tpl-unit]').forEach(function (input) {
        input.addEventListener('change', function () {
          AP.state.templates[category][idx].units[input.dataset.tplUnit] = Math.max(0, parseInt(input.value, 10) || 0);
          AP.persist();
        });
      });
      card.querySelector('[data-tpl-delete]').addEventListener('click', function () {
        AP.state.templates[category].splice(idx, 1);
        AP.persist();
        renderTemplates(category);
      });
    });
  }

  document.querySelectorAll('[data-add-template]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var category = btn.dataset.addTemplate;
      var units = {};
      AP.UNIT_TYPES.forEach(function (u) { units[u] = 0; });
      AP.state.templates[category].push({ id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: 'Neue Vorlage', units: units });
      AP.persist();
      renderTemplates(category);
    });
  });

  // ── Export / Import ──────────────────────────────────────────────────
  document.getElementById('ap-export-btn').addEventListener('click', function () {
    document.getElementById('ap-export-output').value = AP.exportStateAsJson();
  });
  document.getElementById('ap-export-copy-btn').addEventListener('click', function () {
    var ta = document.getElementById('ap-export-output');
    if (!ta.value) ta.value = AP.exportStateAsJson();
    navigator.clipboard.writeText(ta.value).catch(function () { ta.select(); document.execCommand('copy'); });
  });
  document.getElementById('ap-import-btn').addEventListener('click', function () {
    var statusEl = document.getElementById('ap-export-import-status');
    try {
      AP.importStateFromJson(document.getElementById('ap-import-input').value);
      showStatus(statusEl, 'Import erfolgreich. Seite wird neu geladen …', 'ok');
      setTimeout(function () { location.reload(); }, 900);
    } catch (e) {
      showStatus(statusEl, 'Import fehlgeschlagen: ' + e.message, 'error');
    }
  });

  // ── Planen ────────────────────────────────────────────────────────────
  function categoryLabel(cat) {
    var labels = { off: 'Off', katta: 'Katta', fake: 'Fake', ag: 'AG', 'bunker-blast': 'Bunker (Sprengen)', 'bunker-fake': 'Bunker (Fake)' };
    return labels[cat] || cat;
  }

  function renderPlanResult(result) {
    var box = document.getElementById('ap-plan-result');
    document.getElementById('ap-plan-stats').innerHTML =
      '<span class="stat-pill stat-new">✓ ' + result.totalAttacks + ' Angriffe geplant</span>' +
      (result.unassignedTargets.length ? '<span class="stat-pill stat-dup">⚠ ' + result.unassignedTargets.length + ' Ziel(e) nicht/teilweise zugeteilt</span>' : '') +
      (result.leftoverAttackerCapacity.length ? '<span class="stat-pill stat-bonus">ℹ ' + result.leftoverAttackerCapacity.length + ' Dorf/Dörfer mit ungenutzter Kapazität</span>' : '');

    var warnBox = document.getElementById('ap-plan-warnings');
    if (result.unassignedTargets.length) {
      document.getElementById('ap-plan-unassigned').innerHTML = result.unassignedTargets.map(function (t) {
        return '<li>' + escapeHtml(t.coord) + ' (' + escapeHtml(categoryLabel(t.category)) + '): ' + escapeHtml(t.reason) + '</li>';
      }).join('');
      warnBox.style.display = 'block';
    } else {
      warnBox.style.display = 'none';
    }

    var groupsEl = document.getElementById('ap-plan-groups');
    groupsEl.innerHTML = result.groups.map(function (g, gIdx) {
      var rows = g.attacks.map(function (a) {
        var send = new Date(a.sendTime);
        var arrival = new Date(a.arrivalTime);
        var unitsText = AP.UNIT_TYPES.filter(function (u) { return a.units[u]; }).map(function (u) { return AP.UNIT_LABELS[u] + ': ' + a.units[u]; }).join(', ');
        return '<tr>' +
          '<td>' + escapeHtml(a.originCoord) + '</td>' +
          '<td>' + escapeHtml(a.targetCoord) + '</td>' +
          '<td>' + escapeHtml(categoryLabel(a.category)) + '</td>' +
          '<td>' + escapeHtml(a.templateName) + '</td>' +
          '<td>' + escapeHtml(unitsText) + '</td>' +
          '<td>' + AP.formatDateDE(send) + '</td>' +
          '<td>' + AP.formatDateDE(arrival) + '</td>' +
        '</tr>';
      }).join('');
      var copyLines = g.attacks.map(function (a) {
        return a.originCoord + ' -> ' + a.targetCoord + ' | ' + categoryLabel(a.category) + ' | ' + a.templateName +
          ' | Abschicken: ' + AP.formatDateDE(new Date(a.sendTime)) + ' | Ankunft: ' + AP.formatDateDE(new Date(a.arrivalTime));
      }).join('\n');
      return '<div class="ap-plan-player-section">' +
        '<h3>' + escapeHtml(g.playerName) + ' (' + g.attacks.length + ' Angriffe)</h3>' +
        '<div style="overflow-x:auto;"><table><thead><tr><th>Von</th><th>Nach</th><th>Kategorie</th><th>Vorlage</th><th>Einheiten</th><th>Abschicken</th><th>Ankunft</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<textarea rows="3" readonly style="font-family:monospace; font-size:0.78rem; margin-top:0.6rem;" id="ap-plan-copy-' + gIdx + '">' + escapeHtml(copyLines) + '</textarea>' +
        '<div class="button-row" style="justify-content:flex-start; margin-top:0.5rem;"><button type="button" class="btn btn-outline" data-copy-group="' + gIdx + '">📋 Kopieren</button></div>' +
      '</div>';
    }).join('') || '<p style="color:var(--text-muted);">Keine Angriffe zugeteilt.</p>';

    groupsEl.querySelectorAll('[data-copy-group]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ta = document.getElementById('ap-plan-copy-' + btn.dataset.copyGroup);
        navigator.clipboard.writeText(ta.value).catch(function () { ta.select(); document.execCommand('copy'); });
      });
    });

    box.style.display = 'block';
  }

  document.getElementById('ap-plan-btn').addEventListener('click', function () {
    if (!AP.state.worldCode) { alert('Bitte zuerst eine Welt auswählen (Schritt 1).'); return; }
    var result = AP.plan.runPlan(AP.state, AP.runtime.villagesIndex);
    AP.state.lastPlan = result;
    AP.persist();
    renderPlanResult(result);
    document.getElementById('ap-plan-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Initialisierung ──────────────────────────────────────────────────
  function initFromState() {
    document.getElementById('ap-unavailable-offs').value = AP.state.unavailableOffs || '';
    document.getElementById('ap-bunker-coords').value = AP.state.targets.bunkers.coords.join(' ');
    var modeRadio = document.querySelector('input[name="ap-bunker-mode"][value="' + AP.state.targets.bunkers.mode + '"]');
    if (modeRadio) modeRadio.checked = true;
    document.getElementById('ap-bunker-offs-per').value = AP.state.targets.bunkers.offsPerBunker;
    document.getElementById('ap-off-coords').value = AP.state.targets.offTargets.join(' ');
    document.getElementById('ap-katta-coords').value = AP.state.targets.kattaTargets.join(' ');
    document.getElementById('ap-ag-coords').value = AP.state.targets.agTargets.join(' ');
    document.getElementById('ap-fake-coords').value = AP.state.targets.fakeTargets.join(' ');
    document.getElementById('ap-fake-remaining').checked = AP.state.targets.fakeRemainingToggle;

    document.getElementById('ap-max-fakes').value = AP.state.settings.maxFakesPerVillage;
    document.getElementById('ap-max-incs').value = AP.state.settings.maxIncsPerTarget;
    document.getElementById('ap-avoid-round').checked = AP.state.settings.avoidRoundTimes;
    document.getElementById('ap-fakegrenze-enabled').checked = AP.state.settings.fakeGrenzeEnabled;
    document.getElementById('ap-fakegrenze-percent').value = AP.state.settings.fakeGrenzePercent;

    renderTimeWindows();
    renderTemplates('fake');
    renderTemplates('katta');
    renderTemplates('off');
    renderBuckets();
    renderTroopPlayerSelect();

    if (AP.state.lastPlan) renderPlanResult(AP.state.lastPlan);
  }

  initFromState();
  populateWorldSelect();
})();
