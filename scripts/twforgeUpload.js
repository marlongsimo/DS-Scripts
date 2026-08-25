/*
 * 📤 TwForge Manual Upload (Bookmarklet-Version)
 * Drei Buttons, sonst nichts: den gerade offenen Bericht hochladen, die in
 * der Berichtsliste angehakten Berichte hochladen, und die als SOS-Anfrage
 * angehakten eingehenden Angriffe hochladen. Kein automatisches
 * Durchklicken, keine Automatisierung.
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

  async function uploadThisReport(key, say) {
    const vid = villageId();
    const h   = csrf();
    if (!vid) throw new Error('keine Dorf-ID in der URL');
    if (!h)   throw new Error('kein CSRF-Token auf dieser Seite');

    let hash = (document.documentElement.innerHTML.match(HASH_RE) || [])[1];
    if (!hash) { say('… veröffentliche'); hash = await publishReport(vid, h, page.view); }

    say('… lade hoch');
    const added = await uploadHashes(key, [hash]);
    say(added === 0 ? '✓ (TwForge kannte den Bericht schon)' : '✓', '#0a0');
  }

  function markedReportIds() {
    const ids = [];
    document.querySelectorAll('#report_list input[type=checkbox][name^="id_"], input[type=checkbox][name^="id_"]')
      .forEach((el) => {
        if (!el.checked) return;
        const m = String(el.name || '').match(/^id_(\d+)$/);
        if (m && ids.indexOf(m[1]) === -1) ids.push(m[1]);
      });
    return ids;
  }

  async function uploadMarkedReports(key, say) {
    const vid = villageId();
    const h   = csrf();
    if (!vid) throw new Error('keine Dorf-ID in der URL');
    if (!h)   throw new Error('kein CSRF-Token auf dieser Seite');

    const ids = markedReportIds();
    if (!ids.length) { say('✗ keine Berichte angehakt', '#a00'); return; }

    const hashes = [];
    const failed = [];
    for (let i = 0; i < ids.length; i++) {
      say('… veröffentliche ' + (i + 1) + '/' + ids.length);
      try { hashes.push(await publishReport(vid, h, ids[i])); }
      catch (e) { failed.push(ids[i] + ': ' + (e && e.message ? e.message : String(e))); }
      await sleep(350);
    }
    if (!hashes.length) throw new Error('kein Bericht konnte veröffentlicht werden — ' + failed[0]);

    say('… lade ' + hashes.length + ' hoch');
    const added = await uploadHashes(key, hashes);
    const tail = (added === null ? '' : ', TwForge hat ' + added + ' hinzugefügt') +
                 (failed.length ? ' · ✗ ' + failed.length + ' fehlgeschlagen' : '');
    say('✓ ' + hashes.length + ' Bericht(e) gesendet' + tail, failed.length ? '#a60' : '#0a0');
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

  if (page.screen === 'report' && page.view) {
    mount(panel('📤 Zu TwForge hochladen', uploadThisReport));
  } else if (page.screen === 'report') {
    mount(panel('📤 Angehakte Berichte zu TwForge hochladen', uploadMarkedReports));
  } else if (page.screen === 'overview_villages' && page.mode === 'incomings') {
    mount(panel('📤 Angehakte Angriffe zu TwForge hochladen', uploadMarkedIncomings));
  }
})();
