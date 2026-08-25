/*
 * 📤 TwForge Manual Upload (Bookmarklet-Version)
 * Läuft NUR auf der Übersicht der eintreffenden Angriffe
 * (screen=overview_villages&mode=incomings). Zwei Buttons plus ein
 * Einstellungen-Zahnrad, sonst nichts:
 *   - "Angehakte Angriffe zu TwForge hochladen": erzeugt aus den
 *     angehakten eingehenden Angriffen den SOS-Anfrage-Text und lädt ihn
 *     hoch (wie "Hilfe anfordern").
 *   - "Ordner-Berichte zu TwForge hochladen": veröffentlicht alle Berichte
 *     im eingestellten Quell-Ordner, lädt sie zu TwForge hoch und
 *     verschiebt sie danach in den eingestellten Ziel-Ordner - so bleibt
 *     der Quell-Ordner (z.B. "Neue Berichte") frei für den nächsten Lauf.
 *   - "⚙️ Ordner einstellen": Quell- und Ziel-Ordner werden als reine
 *     Ordner-ID (Zahl) eingetragen - wie beim Katta-Feature von "Anaboles
 *     Farmen" (dort ebenfalls ein einfaches Zahlenfeld, kein Dropdown). Ein
 *     erster Versuch, die Ordnernamen automatisch aus einem vermuteten
 *     <select>-Element auszulesen, ist an der tatsächlichen Seitenstruktur
 *     gescheitert ("kann Ordner nicht laden") - die ID lässt sich einfach
 *     aus der URL ablesen, wenn man den Ordner in der Berichtsübersicht
 *     anklickt (z.B. "...&group_id=12" -> ID ist 12).
 * Kein automatisches Durchklicken, keine Hintergrund-Automatisierung -
 * jeder Button muss angeklickt werden.
 *
 * Erwartet, dass window.TWFORGE_KEY vor dem Laden dieses Scripts gesetzt
 * wurde - macht das Bookmarklet selbst (siehe scripts/twforge-upload.html,
 * dort auch ein Generator, der den eigenen API-Key direkt einbaut).
 *
 * Ursprünglich ein Tampermonkey-Userscript mit GM_getValue/GM_setValue/
 * GM_registerMenuCommand (Key-Verwaltung) und GM_xmlhttpRequest (umgeht
 * CORS). Als per Bookmarklet nachgeladenes Script stehen diese
 * Tampermonkey-Berechtigungen nicht zur Verfügung: der Key kommt jetzt aus
 * window.TWFORGE_KEY statt aus GM-Speicher, und die TwForge-Anfrage läuft
 * über normales fetch() statt GM_xmlhttpRequest - das funktioniert nur,
 * wenn die TwForge-API Cross-Origin-Anfragen von der Spieldomain erlaubt.
 */

(function () {
  'use strict';

  const getKey = () => String(window.TWFORGE_KEY || '').trim();

  const qs   = new URLSearchParams(location.search);
  const page = { screen: qs.get('screen') || '', mode: qs.get('mode') || '', view: qs.get('view') || '' };

  const WORLD = location.hostname.split('.')[0];

  function villageId() {
    return qs.get('village') || (() => { try { return String(game_data.village.id); } catch (e) { return ''; } })();
  }

  function csrf() {
    const inp = document.querySelector('input[name=h]');
    if (inp && inp.value) return inp.value;
    const a = document.querySelector('a[href*="&h="], a[href*="?h="]');
    if (a) { const m = String(a.href).match(/[?&]h=([a-z0-9]+)/i); if (m) return m[1]; }
    try { return game_data.csrf || ''; } catch (e) { return ''; }
  }

  const FORM_HDR = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function fetchDoc(url, init) {
    const html = await (await fetch(url, init)).text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  // Ersetzt GM_xmlhttpRequest. Ein normales fetch() unterliegt der
  // Same-Origin-Policy - ob das klappt, hängt davon ab, ob twforge.net
  // Cross-Origin-Anfragen von der Spieldomain per CORS-Header erlaubt. Falls
  // nicht, schlägt der Request mit einem CORS-Fehler fehl (Details dazu nur
  // in der Browser-Konsole sichtbar, nicht als normale HTTP-Fehlermeldung).
  async function apiPost(url, key, payload) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': key, 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new Error('Netzwerk-/CORS-Fehler beim Zugriff auf TwForge (Details in der Browser-Konsole)');
    }
    let data = null;
    let text = '';
    try { data = await res.clone().json(); } catch (e) { try { text = await res.text(); } catch (e2) {} }
    return { status: res.status, data, text };
  }

  function panel(label, onClick) {
    const box = document.createElement('div');
    box.style.cssText = 'margin:6px 0;padding:6px 8px;border:1px solid #7d510f;background:#f4e4bc;' +
                        'border-radius:3px;display:flex;align-items:center;gap:8px;font-size:12px;clear:both;';
    const btn = document.createElement('a');
    btn.className = 'btn';
    btn.href = '#';
    btn.textContent = label;
    const stat = document.createElement('span');
    stat.style.cssText = 'font-weight:bold;';
    const say = (txt, colour) => { stat.textContent = txt; stat.style.color = colour || '#603000'; };

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (btn.dataset.busy) return;
      const key = getKey();
      if (!key) { say('✗ kein API-Key - Bookmarklet mit eigenem Key neu erzeugen', '#a00'); return; }
      btn.dataset.busy = '1';
      btn.style.opacity = '0.5';
      say('…');
      try { await onClick(key, say); }
      catch (e) { say('✗ ' + (e && e.message ? e.message : String(e)), '#a00'); }
      finally { btn.dataset.busy = ''; btn.style.opacity = ''; }
    });

    box.appendChild(btn);
    box.appendChild(stat);
    return box;
  }

  function mount(box) {
    const host = document.querySelector('#content_value') || document.body;
    host.insertBefore(box, host.firstChild);
  }

  const HASH_RE = /\/public_report\/([0-9a-f]{32,})/;

  async function publishReport(vid, h, id) {
    const viewHtml = await (await fetch('/game.php?village=' + vid + '&screen=report&mode=all&view=' + id)).text();
    const known = (viewHtml.match(HASH_RE) || [])[1];
    if (known) return known;

    const r = await fetch('/game.php?village=' + vid + '&screen=report&mode=publish&action=publish', {
      method: 'POST', headers: FORM_HDR,
      body: new URLSearchParams({
        report_id: id, h,
        show_all: '1',
        'show[own_coords]': '1', 'show[own_units]': '1', 'show[own_losses]': '1',
        'show[opp_coords]': '1', 'show[opp_units]': '1', 'show[opp_losses]': '1',
        'show[carry]': '1', 'show[buildings]': '1',
        publish: 'Erstellen',
      }).toString(),
    });
    const hash = new URL(r.url).searchParams.get('public_id') || ((await r.text()).match(HASH_RE) || [])[1];
    if (!hash) throw new Error('Veröffentlichen lieferte keinen Hash (Status ' + r.status + ')');
    return hash;
  }

  async function uploadHashes(key, hashes) {
    const res = await apiPost('https://twforge.net/api/v1/reports/tw/worlds/' + WORLD + '/report-import-tasks',
      key, { text: hashes.map(hs => '[report]' + hs + '[/report]').join('\n') });
    if (res.status !== 200) throw new Error('TwForge ' + (res.status || 'keine Antwort') + ' — ' + ((res.data && res.data.message) || res.text || '').slice(0, 160));
    return res.data && typeof res.data.added === 'number' ? res.data.added : null;
  }

  // Verschiebt einen Bericht per POST in den angegebenen Ordner (group_id des Ziels)
  async function moveReportToFolder(vid, h, reportId, targetGroupId) {
    const url = '/game.php?village=' + vid + '&screen=report&action=move&group_id=0&report_id=' + reportId + '&type=all&h=' + h;
    const body = new URLSearchParams({ group_id: String(targetGroupId) }).toString();
    const res = await fetch(url, { method: 'POST', headers: FORM_HDR, body, credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }

  function pageCommandIds() {
    const ids = [];
    document.querySelectorAll('input[name^="command_ids["]').forEach((el) => {
      const m = String(el.name || '').match(/command_ids\[(\d+)\]/);
      if (m && ids.indexOf(m[1]) === -1) ids.push(m[1]);
    });
    return ids;
  }

  function markedIncomingIds() {
    const ids = [];
    document.querySelectorAll('#incomings_table input[type=checkbox][name^="id_"], input[type=checkbox][name^="id_"]')
      .forEach((el) => {
        if (!el.checked) return;
        const m = String(el.name || '').match(/^id_(\d+)$/);
        if (m && ids.indexOf(m[1]) === -1) ids.push(m[1]);
      });
    return ids;
  }

  async function uploadMarkedIncomings(key, say) {
    const vid = villageId();
    const h   = csrf();
    if (!vid) throw new Error('keine Dorf-ID in der URL');
    if (!h)   throw new Error('kein CSRF-Token auf dieser Seite');

    const marked = markedIncomingIds();
    if (!marked.length) { say('✗ keine Angriffe angehakt', '#a00'); return; }

    const all = pageCommandIds();
    const body = new URLSearchParams();
    for (const id of (all.length ? all : marked)) body.append('command_ids[' + id + ']', 'true');
    for (const id of marked) body.append('id_' + id, 'on');
    body.append('h', h);

    say('… erzeuge SOS-Text für ' + marked.length + ' Angriff(e)');
    const reqDoc = await fetchDoc(location.origin + '/game.php?village=' + vid + '&screen=reqdef',
      { method: 'POST', headers: FORM_HDR, body: body.toString() });
    const el = reqDoc.querySelector('#simple_message');
    const sosText = el ? String(el.value || el.textContent || '').trim() : '';
    if (!sosText) throw new Error('das Spiel hat keinen SOS-Text geliefert (#simple_message fehlt)');

    say('… lade hoch');
    const res = await apiPost('https://twforge.net/api/v1/analyser/tw/worlds/' + WORLD + '/incoming-attacks/sos-requests',
      key, { sosRequest: sosText });

    if (res.status !== 200) throw new Error('TwForge ' + (res.status || 'keine Antwort') + ' — ' + ((res.data && res.data.message) || res.text || '').slice(0, 160));
    const n = res.data && Array.isArray(res.data.attacks) ? res.data.attacks.length : null;
    say('✓' + (n === null ? '' : ' ' + n + ' von ' + marked.length + ' Angriff(en) importiert'), '#0a0');
  }

  // =====================================================================
  // ORDNER-EINSTELLUNGEN (Quell-/Ziel-Berichtsordner)
  // =====================================================================
  const SETTINGS_KEY = 'twforge_upload_folder_settings';

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  // Ordner-IDs werden wie im Katta-Feature von "Anaboles Farmen" manuell
  // eingetragen statt automatisch per Dropdown erkannt - ein Versuch, die
  // Ordnernamen über ein vermutetes <select>-Element auf der
  // Berichtsübersicht auszulesen, ist an der tatsächlichen Seitenstruktur
  // gescheitert. Die ID steht in der URL, wenn man den Ordner in der
  // Berichtsübersicht anklickt (z.B. "...&group_id=12" -> ID ist 12).
  function settingsPanel() {
    const s = getSettings();
    const box = document.createElement('div');
    box.id = 'twforge-settings-panel';
    box.style.cssText = 'margin:6px 0;padding:8px;border:1px solid #7d510f;background:#f4e4bc;' +
                        'border-radius:3px;font-size:12px;clear:both;display:none;';
    box.innerHTML =
      '<div style="margin-bottom:6px;"><strong>Ordner-Einstellungen</strong></div>' +
      '<div style="margin-bottom:6px;">Quell-Ordner-ID (wird zu TwForge hochgeladen):<br>' +
      '<input id="twforge-source-id" type="number" min="0" style="width:100px;" value="' + (s.sourceFolderId != null ? s.sourceFolderId : '') + '"></div>' +
      '<div style="margin-bottom:6px;">Ziel-Ordner-ID (Berichte werden danach dorthin verschoben):<br>' +
      '<input id="twforge-dest-id" type="number" min="0" style="width:100px;" value="' + (s.destFolderId != null ? s.destFolderId : '') + '"></div>' +
      '<p style="margin:6px 0;color:#603000;">Ordner-ID: den Ordner in der Berichtsübersicht anklicken, ' +
      'dann aus der URL ablesen (z.B. „...&amp;group_id=12" → ID ist 12).</p>' +
      '<a href="#" class="btn" id="twforge-save-settings">💾 Speichern</a>' +
      '<span id="twforge-settings-status" style="margin-left:8px;font-weight:bold;"></span>';
    return box;
  }

  function wireSettingsPanel(sp) {
    sp.querySelector('#twforge-save-settings').addEventListener('click', (ev) => {
      ev.preventDefault();
      const srcInp = sp.querySelector('#twforge-source-id');
      const dstInp = sp.querySelector('#twforge-dest-id');
      const statusEl = sp.querySelector('#twforge-settings-status');
      const src = srcInp.value.trim();
      const dst = dstInp.value.trim();
      if (src === '' || dst === '' || isNaN(Number(src)) || isNaN(Number(dst))) {
        statusEl.textContent = '✗ bitte beide Ordner-IDs als Zahl eintragen';
        statusEl.style.color = '#a00';
        return;
      }
      if (src === dst) {
        statusEl.textContent = '✗ Quell- und Ziel-Ordner müssen unterschiedlich sein';
        statusEl.style.color = '#a00';
        return;
      }
      saveSettings({ sourceFolderId: src, destFolderId: dst });
      statusEl.textContent = '✓ gespeichert';
      statusEl.style.color = '#0a0';
    });
  }

  // Scannt einen Berichts-Ordner (group_id) nach Berichts-IDs. Bricht bei
  // der ersten leeren Seite ab statt Paginierungs-Markup zu interpretieren -
  // robuster gegenüber kleineren Layout-Unterschieden.
  async function loadFolderReportIds(folderId) {
    const ids = [];
    for (let p = 0; p <= 50; p++) {
      const doc = await fetchDoc('/game.php?screen=report&mode=all&group_id=' + folderId + '&page=' + p);
      const rows = doc.querySelectorAll('td.report-subject');
      if (!rows.length) break;
      rows.forEach((el) => {
        const titleEl = el.querySelector('.report-title');
        const reportId = titleEl && titleEl.dataset ? titleEl.dataset.id : null;
        if (reportId) ids.push(String(reportId));
      });
      await sleep(250);
    }
    return ids;
  }

  // Veröffentlicht + lädt alle Berichte im Quell-Ordner zu TwForge hoch und
  // verschiebt die dabei erfolgreich veröffentlichten Berichte anschließend
  // in den Ziel-Ordner - der Quell-Ordner bleibt so für den nächsten Lauf frei.
  async function exportSourceFolderToTwForge(key, say) {
    const s = getSettings();
    if (!s.sourceFolderId || !s.destFolderId) throw new Error('Quell-/Ziel-Ordner noch nicht eingestellt (⚙️ anklicken)');

    const vid = villageId();
    const h   = csrf();
    if (!vid) throw new Error('keine Dorf-ID in der URL');
    if (!h)   throw new Error('kein CSRF-Token auf dieser Seite');

    say('… lese Quell-Ordner');
    const ids = await loadFolderReportIds(s.sourceFolderId);
    if (!ids.length) { say('✗ keine Berichte im Quell-Ordner', '#a00'); return; }

    const hashes = [];
    const published = [];
    const failed = [];
    for (let i = 0; i < ids.length; i++) {
      say('… veröffentliche ' + (i + 1) + '/' + ids.length);
      try { hashes.push(await publishReport(vid, h, ids[i])); published.push(ids[i]); }
      catch (e) { failed.push(ids[i] + ': ' + (e && e.message ? e.message : String(e))); }
      await sleep(350);
    }
    if (!hashes.length) throw new Error('kein Bericht konnte veröffentlicht werden — ' + failed[0]);

    say('… lade ' + hashes.length + ' hoch');
    const added = await uploadHashes(key, hashes);

    say('… verschiebe ' + published.length + ' Bericht(e)');
    let moved = 0;
    for (const id of published) {
      try { await moveReportToFolder(vid, h, id, s.destFolderId); moved++; }
      catch (e) { failed.push(id + ' (verschieben): ' + (e && e.message ? e.message : String(e))); }
      await sleep(250);
    }

    const tail = (added === null ? '' : ', TwForge hat ' + added + ' hinzugefügt') +
                 (failed.length ? ' · ✗ ' + failed.length + ' Fehler' : '');
    say('✓ ' + moved + '/' + ids.length + ' hochgeladen & nach Ordner ' + s.destFolderId + ' verschoben' + tail, failed.length ? '#a60' : '#0a0');
  }

  if (page.screen === 'overview_villages' && page.mode === 'incomings') {
    const container = document.createElement('div');
    container.appendChild(panel('📤 Angehakte Angriffe zu TwForge hochladen', uploadMarkedIncomings));
    container.appendChild(panel('📤 Ordner-Berichte zu TwForge hochladen', exportSourceFolderToTwForge));

    const gearRow = document.createElement('div');
    gearRow.style.cssText = 'margin:6px 0;clear:both;';
    const gearBtn = document.createElement('a');
    gearBtn.className = 'btn';
    gearBtn.href = '#';
    gearBtn.textContent = '⚙️ Ordner einstellen';
    const sp = settingsPanel();
    wireSettingsPanel(sp);
    gearBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      sp.style.display = sp.style.display === 'none' ? 'block' : 'none';
    });
    gearRow.appendChild(gearBtn);
    container.appendChild(gearRow);
    container.appendChild(sp);

    mount(container);
  }
})();
