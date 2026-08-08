/*!
 * ===================================================================
 *  Anaboler Sync-Modul
 * ===================================================================
 *  Gemeinsames Modul für alle Anaboler-Scripte (Planer, Tagger, AutoAM,
 *  Defensive, Dodge, Farmen) zur Cloud-Synchronisation via Firebase
 *  Realtime Database.
 *
 *  EINBINDUNG (in jedem Script, das dieses Modul nutzt):
 *    // @require      https://raw.githubusercontent.com/<user>/<repo>/main/anaboler-sync.js
 *    // @grant        GM_getValue
 *    // @grant        GM_setValue
 *
 *  Das Modul erkennt automatisch, welcher Stämme-Account (Welt + Spieler-ID)
 *  gerade im Browser angemeldet ist, und verwaltet pro Account einen
 *  eigenen Team-Key. Der Team-Key wird EINMALIG pro Account+Browser
 *  abgefragt (Prompt) und danach lokal gespeichert (GM_setValue) -
 *  so muss er nicht bei jedem Laden neu eingegeben werden.
 *
 *  Beispiel-Nutzung in einem Script:
 *
 *    // Plan aus der Cloud laden
 *    const cloudData = await AnaboleSync.get('planer');
 *
 *    // Lokale Änderung in die Cloud schreiben
 *    await AnaboleSync.set('planer', null, { snipes: [...] });
 *
 *    // Alle 60 Sek. auf Änderungen prüfen (z.B. Dashboard-Eintragungen)
 *    const stopPolling = AnaboleSync.startPolling('planer', (data) => {
 *        console.log('Neuer Stand aus der Cloud:', data);
 *    }, 60000);
 *
 * ===================================================================
 *  WICHTIG: Dies ist Version 1 (Basis). Sicherheits-Feinschliff
 *  (Firebase-Regeln, ggf. Team-Key-Rotation) folgt, bevor produktiv
 *  mit echten Werten gearbeitet wird.
 * ===================================================================
 */
(function (global) {
    'use strict';

    // -----------------------------------------------------------------
    // Konfiguration
    // -----------------------------------------------------------------
    const FIREBASE_DB_URL = 'https://anaboler-sync-default-rtdb.europe-west1.firebasedatabase.app';
    const TEAMKEY_STORAGE_PREFIX = 'anaboleSync_teamKey_';

    // -----------------------------------------------------------------
    // Account-Erkennung (welche Welt / welcher Spieler ist angemeldet)
    // -----------------------------------------------------------------
    function getGameData() {
        const w = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
        return (w && w.game_data) ? w.game_data : null;
    }

    /**
     * Eindeutige, stabile ID für den aktuell angemeldeten Account.
     * Format: "<welt>_<spielerId>", z.B. "de123_4567890"
     * Gibt null zurück, falls game_data (noch) nicht verfügbar ist.
     */
    function getAccountId() {
        const gd = getGameData();
        if (!gd || !gd.world || !gd.player || !gd.player.id) return null;
        return `${gd.world}_${gd.player.id}`;
    }

    /** Menschlich lesbares Label für Prompts/Logs, z.B. "de123 / Anaboler" */
    function getAccountLabel() {
        const gd = getGameData();
        if (!gd) return 'unbekannter Account';
        const name = (gd.player && gd.player.name) ? gd.player.name : (gd.player ? gd.player.id : '?');
        return `${gd.world || '?'} / ${name}`;
    }

    // -----------------------------------------------------------------
    // Team-Key-Verwaltung (pro Account lokal gespeichert)
    // -----------------------------------------------------------------
    function readStoredValue(key) {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, null);
        } catch (e) { /* ignorieren, Fallback unten */ }
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function writeStoredValue(key, value) {
        try {
            if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; }
        } catch (e) { /* ignorieren, Fallback unten */ }
        try {
            localStorage.setItem(key, value);
        } catch (e) { /* nichts zu tun */ }
    }

    function getStoredTeamKey(accountId) {
        return readStoredValue(TEAMKEY_STORAGE_PREFIX + accountId);
    }

    function storeTeamKey(accountId, key) {
        writeStoredValue(TEAMKEY_STORAGE_PREFIX + accountId, key);
    }

    function promptForTeamKey(accountLabel) {
        const input = (typeof window !== 'undefined' && window.prompt)
            ? window.prompt(
                `Anaboler-Sync\n\n` +
                `Team-Key für "${accountLabel}" manuell setzen/überschreiben\n` +
                `(normalerweise nicht nötig - wird automatisch pro Account erzeugt):`
              )
            : null;
        return (input && input.trim()) ? input.trim() : null;
    }

    /**
     * Leitet einen stabilen Team-Key deterministisch aus der Account-ID ab.
     * Gleicher Account (Welt + Spieler-ID) => IMMER derselbe Key, egal auf
     * welchem Browser/PC - genau das brauchen wir, damit du und dein
     * Team-Kollege ohne manuelle Eingabe automatisch denselben Key bekommen,
     * andere Accounts (anderes Team) aber automatisch einen anderen.
     */
    async function deriveTeamKey(accountId) {
        if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
            try {
                const enc = new TextEncoder().encode('anaboler-sync-team::' + accountId);
                const digest = await crypto.subtle.digest('SHA-256', enc);
                const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
                return hex.slice(0, 20);
            } catch (e) { /* Fallback unten */ }
        }
        // Fallback ohne SubtleCrypto (z.B. sehr alte Browser): einfacher, aber
        // ebenfalls deterministischer Hash - Sicherheit ist hier zweitrangig,
        // Hauptsache "gleicher Account => gleicher Key".
        let h = 0;
        for (let i = 0; i < accountId.length; i++) { h = ((h << 5) - h + accountId.charCodeAt(i)) | 0; }
        return 'acc' + Math.abs(h).toString(36);
    }

    /**
     * Stellt sicher, dass unter /teams/<teamKey>/meta bereits Daten existieren.
     * Ist der Team-Knoten noch leer (erster Kontakt für diesen Account/Team
     * überhaupt), wird er einmalig mit Basis-Metadaten angelegt. Existieren
     * dort schon Daten (z.B. weil der Team-Kollege bereits synct hat), wird
     * NICHTS überschrieben - es werden einfach die vorhandenen Daten genutzt.
     */
    async function ensureTeamNodeExists(teamKey, accountId) {
        try {
            const url = `${FIREBASE_DB_URL}/teams/${encodeURIComponent(teamKey)}/meta.json`;
            const res = await fetch(url);
            if (!res.ok) return;
            const existing = await res.json();
            if (existing) return; // Team-Knoten existiert schon - nichts anlegen, vorhandene Daten nutzen
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    createdAt: Date.now(),
                    createdByAccount: accountId,
                    accountLabel: getAccountLabel()
                })
            });
        } catch (e) {
            console.warn('[AnaboleSync] Team-Knoten konnte nicht initialisiert werden:', e);
        }
    }

    /**
     * Liefert den Team-Key für den aktuellen Account.
     * Wird automatisch aus Welt+Spieler-ID abgeleitet (kein Prompt nötig).
     * Beim allerersten Aufruf für einen neuen Team-Key wird geprüft, ob in
     * Firebase schon Daten liegen - falls nicht, wird der Knoten angelegt.
     */
    async function ensureTeamKey() {
        const accountId = getAccountId();
        if (!accountId) {
            console.warn('[AnaboleSync] Konnte Account nicht erkennen (game_data fehlt oder Seite noch nicht bereit).');
            return null;
        }
        let key = getStoredTeamKey(accountId);
        let isNewlyDerived = false;
        if (!key) {
            key = await deriveTeamKey(accountId);
            storeTeamKey(accountId, key);
            isNewlyDerived = true;
        }
        // Nur beim ersten Mal pro Browser prüfen/anlegen, um nicht bei jedem
        // Aufruf einen zusätzlichen Firebase-Request zu verursachen.
        if (isNewlyDerived) {
            await ensureTeamNodeExists(key, accountId);
        }
        return key;
    }

    /** Manuelles Setzen/Überschreiben des Team-Keys für den aktuellen Account. */
    function setTeamKey(key) {
        const accountId = getAccountId();
        if (!accountId || !key) return false;
        const trimmed = key.trim();
        storeTeamKey(accountId, trimmed);
        ensureTeamNodeExists(trimmed, accountId); // fire-and-forget
        return true;
    }

    /** Entfernt den gespeicherten Team-Key für den aktuellen Account (z.B. bei Eingabefehler). */
    function clearTeamKey() {
        const accountId = getAccountId();
        if (!accountId) return false;
        storeTeamKey(accountId, '');
        return true;
    }

    // -----------------------------------------------------------------
    // Firebase-Zugriff (REST-API, kein SDK nötig)
    // -----------------------------------------------------------------
    function buildUrl(teamKey, scriptName, subPath) {
        const parts = [scriptName, subPath].filter(Boolean);
        const path = parts.join('/');
        return `${FIREBASE_DB_URL}/teams/${encodeURIComponent(teamKey)}/${path}.json`;
    }

    /**
     * Liest Daten für ein Script (z.B. 'planer') aus der Cloud.
     * @param {string} scriptName z.B. 'planer', 'tagger', 'autoAM', ...
     * @param {string} [subPath] optionaler Unterpfad, z.B. 'settings'
     */
    async function get(scriptName, subPath) {
        const teamKey = await ensureTeamKey();
        if (!teamKey) return null;
        const url = buildUrl(teamKey, scriptName, subPath);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn('[AnaboleSync] Lesefehler:', e);
            return null;
        }
    }

    /**
     * Schreibt Daten für ein Script in die Cloud (überschreibt den Pfad komplett).
     * @param {string} scriptName z.B. 'planer'
     * @param {string|null} subPath optionaler Unterpfad, oder null für Wurzel des Scripts
     * @param {*} value beliebiger JSON-fähiger Wert
     */
    async function set(scriptName, subPath, value) {
        const teamKey = await ensureTeamKey();
        if (!teamKey) return false;
        const url = buildUrl(teamKey, scriptName, subPath);
        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
        } catch (e) {
            console.warn('[AnaboleSync] Schreibfehler:', e);
            return false;
        }
    }

    /**
     * Fragt regelmäßig (Standard: alle 60 Sek.) den aktuellen Stand ab
     * und ruft bei jedem Abruf den Callback mit den Daten auf.
     * Praktisch, um z.B. Dashboard-Änderungen mitzubekommen, während
     * das Script bereits im Browser läuft.
     *
     * @returns {Function} stopPolling-Funktion, um das Intervall zu beenden
     */
    function startPolling(scriptName, callback, intervalMs = 60000) {
        let stopped = false;
        let timer = null;

        async function poll() {
            if (stopped) return;
            const data = await get(scriptName);
            if (stopped) return;
            try { callback(data); } catch (e) { console.error('[AnaboleSync] Fehler im Polling-Callback:', e); }
            timer = setTimeout(poll, intervalMs);
        }

        poll();

        return function stopPolling() {
            stopped = true;
            if (timer) clearTimeout(timer);
        };
    }

    // -----------------------------------------------------------------
    // Schwebendes Icon ("!") + Team-Key-Panel
    // -----------------------------------------------------------------
    // Positionierung: stapelt sich mit den bestehenden Icons (Dodge
    // bottom:16px, Defensive bottom:76px) - dieses Icon liegt oberhalb
    // vom Defensive-Icon bei bottom:136px, gleiche Spalte (left:16px).
    const ICON_ID = 'as-icon-btn';
    const PANEL_ID = 'as-key-panel';

    function injectStyles() {
        if (document.querySelector('#as-styles')) return;
        const style = document.createElement('style');
        style.id = 'as-styles';
        style.textContent = `
            #${ICON_ID} { position:fixed; bottom:136px; left:16px; width:48px; height:48px; border-radius:50%;
                background:#1b1f27; border:2px solid #4a3a2a; display:flex; align-items:center; justify-content:center;
                cursor:pointer; z-index:99998; box-shadow:0 2px 10px rgba(0,0,0,.5); transition:transform .15s;
                font-size:22px; font-weight:bold; color:#e2b04a; user-select:none; }
            #${ICON_ID}:hover { transform:scale(1.08); border-color:#e2b04a; }
            #${PANEL_ID} { position:fixed; bottom:136px; left:76px; z-index:99999; width:280px;
                background:#1b1f27; border:1px solid #2e3542; border-radius:8px; padding:14px;
                box-shadow:0 4px 16px rgba(0,0,0,.6); color:#c7cdd8; font-size:13px; font-family:inherit; }
            #${PANEL_ID}.as-hidden { display:none; }
            #${PANEL_ID} h3 { margin:0 0 10px 0; font-size:14px; color:#e2b04a; }
            #${PANEL_ID} .as-row { margin-bottom:10px; }
            #${PANEL_ID} .as-label { display:block; font-size:11px; color:#94a0b4; margin-bottom:3px; }
            #${PANEL_ID} .as-key-value { display:flex; gap:6px; align-items:center; }
            #${PANEL_ID} .as-key-value input { flex:1; background:#0f1116; border:1px solid #2e3542;
                border-radius:4px; padding:5px 7px; color:#c7cdd8; font-family:monospace; font-size:12px; }
            #${PANEL_ID} button { background:#26324a; border:1px solid #3a4a6a; color:#c7cdd8; border-radius:4px;
                padding:5px 9px; font-size:12px; cursor:pointer; }
            #${PANEL_ID} button:hover { background:#324268; }
            #${PANEL_ID} .as-actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        `;
        document.head.appendChild(style);
    }

    function buildPanel() {
        if (document.querySelector('#' + PANEL_ID)) return document.querySelector('#' + PANEL_ID);
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'as-hidden';
        panel.innerHTML = `
            <h3>Anaboler-Sync</h3>
            <div class="as-row">
                <span class="as-label">Account</span>
                <span id="as-account-label">-</span>
            </div>
            <div class="as-row">
                <span class="as-label">Team-Key</span>
                <div class="as-key-value">
                    <input id="as-key-input" type="password" readonly value="">
                    <button id="as-key-toggle" title="Anzeigen/Verbergen">👁</button>
                    <button id="as-key-copy" title="Kopieren">📋</button>
                </div>
            </div>
            <div class="as-actions">
                <button id="as-key-change">Ändern</button>
                <button id="as-key-close">Schließen</button>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('#as-key-toggle').addEventListener('click', () => {
            const input = panel.querySelector('#as-key-input');
            input.type = (input.type === 'password') ? 'text' : 'password';
        });
        panel.querySelector('#as-key-copy').addEventListener('click', async () => {
            const input = panel.querySelector('#as-key-input');
            try {
                await navigator.clipboard.writeText(input.value || '');
                flashButton(panel.querySelector('#as-key-copy'), '✓');
            } catch (e) {
                input.type = 'text';
                input.select();
                document.execCommand('copy');
                flashButton(panel.querySelector('#as-key-copy'), '✓');
            }
        });
        panel.querySelector('#as-key-change').addEventListener('click', () => {
            const newKey = promptForTeamKey(getAccountLabel());
            if (newKey) {
                setTeamKey(newKey);
                refreshPanel(panel);
            }
        });
        panel.querySelector('#as-key-close').addEventListener('click', () => {
            panel.classList.add('as-hidden');
        });

        return panel;
    }

    function flashButton(btn, tempLabel) {
        const original = btn.textContent;
        btn.textContent = tempLabel;
        setTimeout(() => { btn.textContent = original; }, 1000);
    }

    async function refreshPanel(panel) {
        const accountId = getAccountId();
        panel.querySelector('#as-account-label').textContent = getAccountLabel();
        const keyInput = panel.querySelector('#as-key-input');
        keyInput.value = '…lädt…';
        if (!accountId) {
            keyInput.value = '(Account nicht erkannt)';
            return;
        }
        // ensureTeamKey() leitet den Key automatisch ab (bzw. legt ihn beim
        // allerersten Mal an), falls noch keiner lokal gespeichert ist.
        const key = await ensureTeamKey();
        keyInput.value = key || '(Key konnte nicht ermittelt werden)';
    }

    function buildFloatingIcon() {
        if (document.querySelector('#' + ICON_ID)) return;
        injectStyles();
        const btn = document.createElement('div');
        btn.id = ICON_ID;
        btn.title = 'Anaboler-Sync: Team-Key anzeigen/ändern';
        btn.textContent = '!';
        document.body.appendChild(btn);

        const panel = buildPanel();

        btn.addEventListener('click', () => {
            const willShow = panel.classList.contains('as-hidden');
            if (willShow) refreshPanel(panel);
            panel.classList.toggle('as-hidden');
        });
    }

    function initIconWhenReady() {
        if (document.body) {
            buildFloatingIcon();
            return;
        }
        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                buildFloatingIcon();
            }
        });
        observer.observe(document.documentElement, { childList: true });
    }

    try { initIconWhenReady(); } catch (e) { console.warn('[AnaboleSync] Icon konnte nicht erzeugt werden:', e); }

    // -----------------------------------------------------------------
    // Öffentliche API
    // -----------------------------------------------------------------
    global.AnaboleSync = {
        getAccountId,
        getAccountLabel,
        ensureTeamKey,
        setTeamKey,
        clearTeamKey,
        get,
        set,
        startPolling
    };

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
