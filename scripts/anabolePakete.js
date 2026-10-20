/*
 * 📦 Anabole Pakete (Bookmarklet-Version)
 * Schnellleiste für die Massen-Unterstützung: Paket festlegen, Anzahl
 * wählen, Dörfer werden angehakt + Truppen eingetragen. Verschickt NICHT
 * selbst! Wird per Bookmarklet als <script> von
 * https://marlongsimo.github.io/DS-Scripts/scripts/anabolePakete.js
 * nachgeladen, siehe scripts/anabole-pakete.html für die Installation.
 */

/* =====================================================================
   ÜBERBLICK
   - Läuft NUR auf screen=place&mode=call (Massen-Unterstützung).
   - Beim Start: Truppen aller angezeigten Dörfer einlesen (je Dorf + Summe).
     Quelle: #village_troup_list tr.call-village → td[data-unit][data-count]
     (gleiche, bereits bestätigte Struktur wie in Anabole Defensive).
   - Einstellungen (alle im localStorage gespeichert):
       * Paket (Speer/Schwert/LKav/Späher)
       * Priorität: kurze oder weite Distanz zuerst
       * "Nur volle Pakete": an  = jedes Paket kommt komplett aus EINEM Dorf
                             aus = Einheiten dürfen aus verschiedenen Dörfern
                                   zu einem Paket zusammengesetzt werden
       * Zurückhalten pro Dorf (je Einheit, bleibt immer im Dorf)
   - "Übernehmen": hakt die Dörfer an und trägt die Truppen ein. Über dem
     Button "Unterstützung schicken" erscheint die Anzahl eingetragener
     Pakete: grün = gewünschte Anzahl erreicht, rot = weniger möglich.
   - ES WIRD NICHTS ABGESCHICKT. "Unterstützung schicken" drückst du selbst.
   ===================================================================== */

(function () {
    'use strict';

    const params = new URLSearchParams(location.search);
    const onCallPage = params.get('screen') === 'place' && params.get('mode') === 'call';
    const startedManually = typeof GM_info === 'undefined';

    if (!onCallPage) {
        if (startedManually) {
            const gd = window.game_data;
            if (gd && gd.link_base_pure) {
                window.location.href = `${gd.link_base_pure}place&mode=call`;
            } else {
                alert('📦 Anabole Pakete läuft nur auf der Massen-Unterstützung (Versammlungsplatz).');
            }
        }
        return;
    }

    // Doppelstart verhindern (Schnellleiste mehrfach angetippt)
    if (document.querySelector('#ap-bar')) {
        document.querySelector('#ap-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    const table = document.querySelector('#village_troup_list');
    if (!table) {
        if (startedManually) alert('📦 Anabole Pakete: Dorftabelle nicht gefunden.');
        return;
    }
    const form = document.querySelector('#place_call_form') || table.closest('form');

    const UNITS = ['spear', 'sword', 'light', 'spy'];
    const LABELS = { spear: 'Speer', sword: 'Schwert', light: 'LKav', spy: 'Späher' };
    const SHORT = { spear: 'Sp', sword: 'Sw', light: 'LK', spy: 'Spä' };
    const LS_SETTINGS_KEY = 'anabolePakete_settings_v2';

    // =====================================================================
    // TRUPPEN EINLESEN (einmal beim Start)
    // =====================================================================
    function readVillages() {
        const list = [];
        table.querySelectorAll('tbody tr.call-village').forEach((row, index) => {
            const m = (row.id || '').match(/call_village_(\d+)/);
            if (!m) return;
            const id = m[1];
            const link = row.querySelector('a[href*="info_village"]');
            const name = link ? link.textContent.trim().replace(/\s+/g, ' ') : 'Dorf ' + id;
            const cells = row.querySelectorAll('td');
            const distRaw = cells[1] ? parseFloat(cells[1].textContent.trim().replace(',', '.')) : NaN;
            const troops = {};
            UNITS.forEach(u => {
                const td = row.querySelector(`td[data-unit="${u}"]`);
                troops[u] = td ? (parseInt(td.getAttribute('data-count'), 10) || 0) : 0;
            });
            list.push({ id, name, row, troops, distance: isNaN(distRaw) ? index : distRaw });
        });
        return list;
    }

    const villages = readVillages();
    const totals = {};
    UNITS.forEach(u => { totals[u] = villages.reduce((s, v) => s + v.troops[u], 0); });
    // Einheiten, die es auf dieser Welt/Seite gar nicht gibt, ausblenden
    const availableUnits = UNITS.filter(u => table.querySelector(`td[data-unit="${u}"]`));

    // =====================================================================
    // EINSTELLUNGEN
    // =====================================================================
    function loadSettings() {
        let s = {};
        try { s = JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || '{}'); } catch (e) { s = {}; }
        return {
            pkg: s.pkg || {},
            reserve: s.reserve || {},
            preferShort: s.preferShort !== false,
            fullOnly: s.fullOnly !== false,
        };
    }
    function saveSettings(s) {
        try { localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* egal */ }
    }

    // =====================================================================
    // BERECHNUNG
    // =====================================================================
    function usedUnits(pkg) {
        return availableUnits.filter(u => (pkg[u] || 0) > 0);
    }

    // Verfügbare Truppen eines Dorfes nach Abzug der Rückhaltung
    function availableTroops(v, reserve) {
        const a = {};
        UNITS.forEach(u => { a[u] = Math.max(0, v.troops[u] - (reserve[u] || 0)); });
        return a;
    }

    function sortedVillages(preferShort) {
        return [...villages].sort((a, b) => preferShort ? a.distance - b.distance : b.distance - a.distance);
    }

    function fullPackagesForVillage(v, s) {
        const used = usedUnits(s.pkg);
        if (!used.length) return 0;
        const a = availableTroops(v, s.reserve);
        return Math.min(...used.map(u => Math.floor(a[u] / s.pkg[u])));
    }

    // Wie viele Pakete sind mit den aktuellen Einstellungen möglich?
    function calcPossible(s) {
        const used = usedUnits(s.pkg);
        if (!used.length) return { packages: 0, villageCount: 0 };

        if (s.fullOnly) {
            let packages = 0, villageCount = 0;
            villages.forEach(v => {
                const p = fullPackagesForVillage(v, s);
                if (p > 0) { packages += p; villageCount++; }
            });
            return { packages, villageCount };
        }

        // Gemischt: Summe aller verfügbaren Truppen über alle Dörfer
        const sum = {};
        used.forEach(u => {
            sum[u] = villages.reduce((acc, v) => acc + availableTroops(v, s.reserve)[u], 0);
        });
        const packages = Math.min(...used.map(u => Math.floor(sum[u] / s.pkg[u])));
        // Dörfer, die überhaupt etwas beitragen können
        const villageCount = villages.filter(v => {
            const a = availableTroops(v, s.reserve);
            return used.some(u => a[u] > 0);
        }).length;
        return { packages, villageCount };
    }

    // Plan: [{ village, units: {u: amount}, packages (nur bei fullOnly) }]
    function buildPlan(s, wanted) {
        const order = sortedVillages(s.preferShort);
        const used = usedUnits(s.pkg);
        const plan = [];

        if (s.fullOnly) {
            let remaining = wanted;
            for (const v of order) {
                if (remaining <= 0) break;
                const possible = fullPackagesForVillage(v, s);
                if (possible <= 0) continue;
                const take = Math.min(possible, remaining);
                remaining -= take;
                const units = {};
                used.forEach(u => { units[u] = s.pkg[u] * take; });
                plan.push({ village: v, units, packages: take });
            }
            return { plan, sentPackages: wanted - remaining };
        }

        // Gemischt: erst festlegen, wie viele Pakete insgesamt gehen …
        const possible = calcPossible(s).packages;
        const sentPackages = Math.min(wanted, possible);
        const byVillage = new Map();
        // … dann je Einheit den Gesamtbedarf in Prioritäts-Reihenfolge auffüllen
        used.forEach(u => {
            let need = sentPackages * s.pkg[u];
            for (const v of order) {
                if (need <= 0) break;
                const a = availableTroops(v, s.reserve)[u];
                if (a <= 0) continue;
                const take = Math.min(a, need);
                need -= take;
                if (!byVillage.has(v.id)) byVillage.set(v.id, { village: v, units: {} });
                byVillage.get(v.id).units[u] = take;
            }
        });
        // Reihenfolge der Ausgabe = Prioritäts-Reihenfolge
        order.forEach(v => { if (byVillage.has(v.id)) plan.push(byVillage.get(v.id)); });
        return { plan, sentPackages };
    }

    // =====================================================================
    // DOM-EINTRAGUNG (kein Absenden!)
    // =====================================================================
    function fire(el, type) {
        el.dispatchEvent(new Event(type, { bubbles: true }));
    }

    function rowCheckbox(v) {
        return v.row.querySelector('input[type="checkbox"]');
    }

    // Sucht das Eingabefeld für call[<Dorf>][<Einheit>]. Falls die Seite keins
    // hat, wird (nur wenn create=true) ein verstecktes Feld im Formular angelegt.
    function getUnitInput(v, unit, create) {
        const td = v.row.querySelector(`td[data-unit="${unit}"]`);
        let input = td ? td.querySelector('input[type="text"], input[type="number"], input:not([type])') : null;
        if (!input && form) input = form.querySelector(`input[name="call[${v.id}][${unit}]"]`);
        if (!input && create && form) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = `call[${v.id}][${unit}]`;
            input.className = 'ap-injected';
            form.appendChild(input);
        }
        return input;
    }

    function setInputValue(input, value) {
        input.value = value;
        fire(input, 'input');
        fire(input, 'change');
    }

    function resetAll() {
        villages.forEach(v => {
            const cb = rowCheckbox(v);
            if (cb && cb.checked) cb.click(); // click() → Spiel-eigene Handler laufen mit
            UNITS.forEach(u => {
                const input = getUnitInput(v, u, false);
                if (input && !input.classList.contains('ap-injected')) setInputValue(input, '');
            });
            v.row.classList.remove('ap-row-selected');
            const badge = v.row.querySelector('.ap-row-badge');
            if (badge) badge.remove();
        });
        if (form) form.querySelectorAll('input.ap-injected').forEach(e => e.remove());
        hideSendIndicator();
    }

    function applyPlan(plan, fullOnly) {
        plan.forEach(entry => {
            const v = entry.village;
            // Erst anhaken (Spiel füllt dabei evtl. selbst Werte ein) …
            const cb = rowCheckbox(v);
            if (cb && !cb.checked) cb.click();

            // … danach unsere Werte setzen, damit sie gewinnen.
            UNITS.forEach(u => {
                const amount = entry.units[u] || 0;
                const input = getUnitInput(v, u, amount > 0);
                if (input) setInputValue(input, amount > 0 ? String(amount) : '');
            });

            v.row.classList.add('ap-row-selected');
            const nameCell = v.row.querySelector('td');
            if (nameCell) {
                const badge = document.createElement('div');
                badge.className = 'ap-row-badge';
                badge.textContent = fullOnly
                    ? `📦 ${entry.packages} Paket${entry.packages === 1 ? '' : 'e'}`
                    : '📦 ' + Object.entries(entry.units).map(([u, c]) => `${SHORT[u]} ${c}`).join(' · ');
                nameCell.appendChild(badge);
            }
        });
    }

    // =====================================================================
    // ANZEIGE ÜBER "UNTERSTÜTZUNG SCHICKEN"
    // =====================================================================
    function findSendButton() {
        const scope = form || document;
        const candidates = scope.querySelectorAll('input[type="submit"], button[type="submit"], input.btn, button.btn');
        for (const el of candidates) {
            const text = (el.value || el.textContent || '').trim();
            if (/unterst/i.test(text)) return el;
        }
        return candidates[0] || null;
    }

    function showSendIndicator(sent, wanted) {
        let box = document.querySelector('#ap-send-indicator');
        if (!box) {
            box = document.createElement('div');
            box.id = 'ap-send-indicator';
            const btn = findSendButton();
            if (btn && btn.parentNode) btn.parentNode.insertBefore(box, btn);
            else bar.appendChild(box);
        }
        const ok = sent >= wanted;
        box.className = ok ? 'ap-ind-ok' : 'ap-ind-low';
        box.textContent = ok
            ? `📦 ${sent} Pakete eingetragen`
            : `📦 Nur ${sent} von ${wanted} Paketen möglich`;
        box.style.display = 'block';
    }

    function hideSendIndicator() {
        const box = document.querySelector('#ap-send-indicator');
        if (box) box.style.display = 'none';
    }

    // =====================================================================
    // STYLES
    // =====================================================================
    const style = document.createElement('style');
    style.textContent = `
        #ap-bar { font-family:Verdana, Arial, sans-serif; font-size:12px; color:#e6e9ef; background:#1b1f27;
            border:1px solid #2e3542; border-radius:8px; padding:10px; margin:8px 0; box-sizing:border-box; }
        #ap-bar * { box-sizing:border-box; }
        .ap-title { font-weight:bold; font-size:13px; margin-bottom:8px; color:#f2f4f8; }
        .ap-section { font-size:10px; color:#94a0b4; margin:6px 0 3px; text-transform:uppercase; letter-spacing:.5px; }
        .ap-sum { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
        .ap-sum span { background:#232935; border:1px solid #2e3542; border-radius:6px; padding:3px 7px; }
        .ap-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-bottom:6px; }
        .ap-field label { display:block; font-size:10px; color:#94a0b4; margin-bottom:2px; }
        .ap-field input, .ap-row input[type=number] { width:100%; padding:8px 6px; background:#252b35;
            border:1px solid #39414f; border-radius:6px; color:#e6e9ef; font-size:16px; min-height:38px; }
        .ap-options { display:flex; flex-wrap:wrap; gap:8px 14px; margin:6px 0 8px; }
        .ap-options label { display:flex; align-items:center; gap:6px; cursor:pointer; padding:4px 0; font-size:13px; }
        .ap-options input { width:20px; height:20px; margin:0; }
        .ap-possible { margin-bottom:8px; color:#7ee0a0; font-weight:bold; }
        .ap-row { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
        .ap-row input[type=number] { flex:1 1 auto; }
        .ap-btn { padding:9px 14px; min-height:38px; border-radius:6px; border:1px solid #4c8dff; background:#2d6cdf;
            color:#fff; font-weight:bold; cursor:pointer; font-size:14px; white-space:nowrap;
            -webkit-appearance:none; touch-action:manipulation; }
        @media (max-width:420px) {
            .ap-grid { grid-template-columns:repeat(2, 1fr); }
            .ap-row { flex-wrap:wrap; }
            .ap-row input[type=number] { flex:1 1 100%; }
            .ap-row .ap-btn { flex:1 1 0; }
        }
        .ap-btn-grey { background:#3a4150; border-color:#4a5568; }
        .ap-btn:disabled { opacity:.5; cursor:default; }
        .ap-status { font-size:11px; color:#c3cbd8; min-height:14px; }
        .ap-status.ap-warn { color:#e8cf7a; }
        #ap-bar details { margin-top:6px; font-size:11px; color:#94a0b4; }
        #ap-bar details div { padding:2px 0; border-bottom:1px solid #262c36; }
        tr.ap-row-selected td { background:#d8ecd0 !important; }
        .ap-row-badge { font-size:11px; font-weight:bold; color:#2b6b3a; }
        #ap-send-indicator { font-family:Verdana, Arial, sans-serif; font-weight:bold; font-size:13px;
            padding:6px 10px; border-radius:6px; margin:6px 0; text-align:center; }
        #ap-send-indicator.ap-ind-ok { background:#d8ecd0; color:#1f6b33; border:1px solid #3a9d55; }
        #ap-send-indicator.ap-ind-low { background:#f6d5d1; color:#a8231a; border:1px solid #c0392b; }
    `;
    document.head.appendChild(style);

    // =====================================================================
    // UI
    // =====================================================================
    const settings = loadSettings();

    const bar = document.createElement('div');
    bar.id = 'ap-bar';
    bar.innerHTML = `
        <div class="ap-title">📦 Anabole Pakete</div>
        <div class="ap-sum"></div>
        <div class="ap-section">Paket</div>
        <div class="ap-grid" id="ap-pkg-grid"></div>
        <div class="ap-section">Zurückhalten pro Dorf</div>
        <div class="ap-grid" id="ap-reserve-grid"></div>
        <div class="ap-options">
            <label><input type="radio" name="ap-prio" value="short"> Kurze Distanz zuerst</label>
            <label><input type="radio" name="ap-prio" value="long"> Weite Distanz zuerst</label>
            <label><input type="checkbox" id="ap-fullonly"> Nur volle Pakete</label>
        </div>
        <div class="ap-possible"></div>
        <div class="ap-row">
            <input type="number" min="0" inputmode="numeric" id="ap-count" placeholder="Anzahl Pakete">
            <button class="ap-btn" id="ap-apply">Übernehmen</button>
            <button class="ap-btn ap-btn-grey" id="ap-reset">Leeren</button>
        </div>
        <div class="ap-status"></div>
        <details><summary>Truppen je Dorf (${villages.length} Dörfer)</summary><div class="ap-list"></div></details>
    `;

    const sumEl = bar.querySelector('.ap-sum');
    availableUnits.forEach(u => {
        const s = document.createElement('span');
        s.textContent = `Σ ${LABELS[u]}: ${totals[u]}`;
        sumEl.appendChild(s);
    });

    function buildUnitGrid(gridEl, values) {
        const inputs = {};
        availableUnits.forEach(u => {
            const f = document.createElement('div');
            f.className = 'ap-field';
            const l = document.createElement('label');
            l.textContent = LABELS[u];
            const i = document.createElement('input');
            i.type = 'number';
            i.min = '0';
            i.inputMode = 'numeric'; // Zahlentastatur auf dem Handy
            i.value = values[u] || 0;
            i.addEventListener('input', onSettingsChange);
            f.appendChild(l);
            f.appendChild(i);
            gridEl.appendChild(f);
            inputs[u] = i;
        });
        return inputs;
    }

    const pkgInputs = buildUnitGrid(bar.querySelector('#ap-pkg-grid'), settings.pkg);
    const reserveInputs = buildUnitGrid(bar.querySelector('#ap-reserve-grid'), settings.reserve);

    const prioRadios = bar.querySelectorAll('input[name="ap-prio"]');
    prioRadios.forEach(r => {
        r.checked = (r.value === 'short') === settings.preferShort;
        r.addEventListener('change', onSettingsChange);
    });
    const fullOnlyCheckbox = bar.querySelector('#ap-fullonly');
    fullOnlyCheckbox.checked = settings.fullOnly;
    fullOnlyCheckbox.addEventListener('change', onSettingsChange);

    const possibleEl = bar.querySelector('.ap-possible');
    const countInput = bar.querySelector('#ap-count');
    const applyBtn = bar.querySelector('#ap-apply');
    const resetBtn = bar.querySelector('#ap-reset');
    const statusEl = bar.querySelector('.ap-status');
    const listEl = bar.querySelector('.ap-list');

    function readInputs(inputs) {
        const o = {};
        availableUnits.forEach(u => { o[u] = Math.max(0, parseInt(inputs[u].value, 10) || 0); });
        return o;
    }

    function currentSettings() {
        const short = bar.querySelector('input[name="ap-prio"][value="short"]');
        return {
            pkg: readInputs(pkgInputs),
            reserve: readInputs(reserveInputs),
            preferShort: short.checked,
            fullOnly: fullOnlyCheckbox.checked,
        };
    }

    let possible = { packages: 0, villageCount: 0 };

    function onSettingsChange() {
        const s = currentSettings();
        saveSettings(s);
        possible = calcPossible(s);
        const hasPkg = usedUnits(s.pkg).length > 0;
        possibleEl.textContent = hasPkg
            ? `Möglich: ${possible.packages} Pakete aus ${possible.villageCount} Dörfern`
            : 'Bitte ein Paket festlegen.';
        applyBtn.disabled = !hasPkg || possible.packages === 0;

        listEl.innerHTML = '';
        sortedVillages(s.preferShort).forEach(v => {
            const d = document.createElement('div');
            const a = availableTroops(v, s.reserve);
            const troopsText = availableUnits.map(u => `${SHORT[u]} ${v.troops[u]}` + (s.reserve[u] ? ` (frei ${a[u]})` : '')).join(' · ');
            const pkgText = hasPkg && s.fullOnly ? ` → ${fullPackagesForVillage(v, s)} P.` : '';
            d.textContent = `${v.name}: ${troopsText}${pkgText}`;
            listEl.appendChild(d);
        });
    }

    applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const s = currentSettings();
        const wanted = parseInt(countInput.value, 10) || 0;
        statusEl.classList.remove('ap-warn');
        if (wanted <= 0) {
            statusEl.textContent = 'Bitte Anzahl Pakete angeben.';
            statusEl.classList.add('ap-warn');
            return;
        }
        resetAll();
        const { plan, sentPackages } = buildPlan(s, wanted);
        applyPlan(plan, s.fullOnly);
        showSendIndicator(sentPackages, wanted);
        statusEl.textContent = `✓ ${sentPackages} Pakete aus ${plan.length} Dörfern eingetragen. ` +
            `Bitte prüfen und selbst auf „Unterstützung schicken“ drücken.`;
    });

    resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetAll();
        statusEl.classList.remove('ap-warn');
        statusEl.textContent = 'Alle Haken und Eingaben entfernt.';
    });

    // Leiste direkt über der Dorftabelle einfügen
    const anchor = form || table;
    anchor.parentNode.insertBefore(bar, anchor);

    onSettingsChange();
})();
