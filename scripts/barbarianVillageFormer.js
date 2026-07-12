/*
 * Script Name: Barbarian Village Former
 * Version: v1.16-test-fetch
 * Last Updated: 2026-07-12
 * Author Contact: secundum, SaveBank
 *
 * === Änderung in dieser Testversion (v1.16-test-fetch) ===
 * Diagnose-Idee: iframe-Navigation (v1.15, Punkte 25-27) verhindert zwar
 * offenbar XHR-bedingtes Löschen von Berichten, führt aber auf dem Handy zu
 * einer sichtbaren Weiterleitung zur Berichte-Übersicht, wodurch die
 * Schnellleiste/Bookmarklets verloren geht. Testweise wird
 * fetchUrlViaIframe() durch fetchUrlViaAjax() (echtes fetch(), OHNE den von
 * jQuery.get()/jQuery.ajax() automatisch gesetzten Header
 * "X-Requested-With: XMLHttpRequest") ersetzt. Hypothese: nicht AJAX an sich
 * verursacht das Löschen, sondern speziell dieser Header, an dem der Server
 * "AJAX" von "echter Navigation" unterscheidet. fetch() setzt diesen Header
 * standardmäßig nicht und navigiert (anders als jQuery.get, aber genau wie
 * das vorige iframe) nicht sichtbar weg - OHNE dessen Redirect-Nachteil.
 * WICHTIG: NICHT bestätigt, nur ein gezielter Test. Bitte mit dem Button
 * "Nur Berichte-Liste laden" zuerst prüfen, ob dabei (a) keine Weiterleitung
 * mehr passiert und (b) trotzdem kein Bericht verschwindet, bevor der
 * echte Berichts-Abruf (getReports()) benutzt wird. fetchUrlViaIframe()
 * bleibt im Code erhalten, falls zurückgewechselt werden muss.
 *
 * === FIXES aus v1.15 (unverändert) ===
 * 1. Group-change handler now correctly awaits fetchTroopsForCurrentGroup()
 *    instead of assigning the raw Promise to troopData.
 * 2. #raSpy change handler was writing to the wrong localStorage key.
 * 3. renderUI() referenced an undefined variable `body`; changed to `content`.
 * 4. Removed stray empty console.log().
 * 5. Fixed a broken monotonic value in catsRequiredToBreak.
 * 6. Fixed German translation typo "kattern" -> "kürzen".
 * 7. Trigger-Screen von Berichte-Übersicht auf Versammlungsplatz umgestellt,
 *    Screen-Erkennung nutzt game_data.screen statt twSDK.checkValidLocation().
 * 8. getReportUrls() ersetzt durch fetchReportListPages() (AJAX über alle Seiten).
 * 9. getUiContainerSelector() gegen undefiniertes mobiledevice abgesichert.
 * 10. tt(...) im Catch-Zweig auf twSDK.tt(...) korrigiert.
 * 11. scriptInfo an 15 Stellen fälschlich als Funktion aufgerufen - korrigiert.
 * 12. twSDK.startProgressBar()/updateProgressBar() jetzt per try/catch abgesichert.
 * 13. onError-Callback von twSDK.getAll() rendert Fehlerdetails jetzt sichtbar.
 * 14. Fehlschlag einer späteren Berichte-Listen-Seite wird jetzt sichtbar gemeldet.
 * 15. findReportListNavLink() sucht zuerst im App-DOM nach echtem Nav-Link.
 * 16. "All perfect" wird nicht mehr fälschlich bei 0 auswertbaren Berichten gezeigt;
 *     villageAnchor-Prüfung testet jetzt auf .length > 0.
 * 17. fetchTroopsForCurrentGroup() gibt genutzten Parsing-Zweig zurück;
 *     renderTroopDebugInfo() zeigt ermittelte Truppenzahlen im Panel.
 * 18. fetchTroopsForCurrentGroup(): DOMParser statt jQuery.parseHTML()
 *     (#combined_table landete sonst als Top-Level-Element).
 * 19. recordSample() sucht jetzt gezielt nach Kennungen statt blind die
 *     ersten 2000 Zeichen zu zeigen.
 * 20. findReportListNavLink()/isGeneralReportListLink() schließen
 *     Ordner-/Gruppen-Links (group_id != 0) explizit aus.
 * 21. isNavigableReportUrl() schließt "#", "javascript:", leere/undefinierte
 *     hrefs aus (Ursache für "Beispiel-Bericht" = Listen-Seite selbst).
 * 22. isNavigableReportUrl() verlangt zusätzlich "view="-Parameter;
 *     isReportDataRow() ignoriert Kopfzeilen.
 * 23. Diagnose-Button "Nur Berichte-Liste laden" (getReports(true)) - lädt
 *     nur die Liste, ruft keinen Einzelbericht ab; isReportDataRow()
 *     ignoriert auch die "keine Berichte"-Leerzustand-Zeile.
 * 24. Bestätigt: schon der reine Berichte-LISTEN-Abruf per AJAX löscht einen
 *     Bericht. Diagnose-Button "Unbeteiligte Seite laden" hinzugefügt.
 * 25. Bestätigt: unbeteiligte Seite löscht nichts - Ursache liegt spezifisch
 *     am Berichte-Screen. Umstellung auf fetchUrlViaIframe() (echte
 *     Navigation statt XHR) für Liste UND Einzelberichte.
 * 26. iframe brauchte ein sandbox-Attribut, da ein Anti-Clickjacking-Skript
 *     des Spiels sonst den sichtbaren Tab zur Navigation zwang.
 * 27. iframe.sandbox (Property) wurde von der App-WebView nicht zuverlässig
 *     aufs HTML-Attribut zurückgeschrieben - auf setAttribute() umgestellt.
 */

// User Input
if (typeof DEBUG !== 'boolean')
    DEBUG = true;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'barbFormer',
        name: `Barbarian Village Former`,
        version: 'v1.16-test-fetch',
        author: 'secundum, SaveBank',
        authorUrl: '',
        helpLink: 'https://forum.tribalwars.net/index.php?threads/barb-former.291645/',
    },
    translations: {
        en_DK: {
            'Barbarian Village Former': 'Barbarian Village Former',
            Help: 'Help',
            'Redirecting...': 'Redirecting...',
            'There was an error!': 'There was an error!',
            'There was an error while fetching the report data!': 'There was an error while fetching the report data!',
            'An error occured while fetching troop counts!': 'An error occured while fetching troop counts!',
            'Error fetching report list page!': 'Error fetching report list page!',
            'Min. Level': 'Min. Level',
            'Building': 'Building',
            'Group': 'Group',
            'Calculate Commands': 'Calculate Commands',
            'Export as WB format': 'Export as WB format',
            'Max. Distance': 'Max. Distance',
            'Max lvl reduction per command': 'reduce Level/command',
            'Spy Count': 'Spy Count',
        },
        de_DE: {
            'Barbarian Village Former': 'Barbarendorf Teraformer',
            Help: 'Hilfe',
            'Redirecting...': 'Umleiten...',
            'There was an error!': 'Es gab einen Fehler!',
            'There was an error while fetching the report data!': 'Es gab einen fehler beim laden der Berichte!',
            'An error occured while fetching troop counts!': 'Es gab einen Fehler beim Laden der Truppenanzahl!',
            'Error fetching report list page!': 'Fehler beim Laden der Berichte-Liste!',
            'Min. Level': 'Min. Level',
            'Building': 'Gebaeude',
            'Group': 'Gruppe',
            'Calculate Commands': 'Berechne Befehle',
            'Export as WB format': 'Kopiere Workbench Befehle',
            'Max. Distance': 'Maximale Distanz',
            'Max lvl reduction per command': 'Level kürzen/Befehl',
            'Spy Count': 'Spy Anzahl',
        },
	pt_BR: {
            'Barbarian Village Former': 'Antiga Aldeia Bárbara',
            'Help': 'Ajuda',
            'Redirecting...': 'Redirecionando...',
            'There was an error!': 'Houve um erro!',
            'There was an error while fetching the report data!': 'Houve um erro ao buscar os dados do relatório!',
            'An error occured while fetching troop counts!': 'Houve um erro ao buscar a contagem de tropas!',
            'Error fetching report list page!': 'Erro ao buscar a página da lista de relatórios!',
            'Min. Level': 'Nível Mínimo',
            'Building': 'Edifício',
            'Group': 'Grupo',
            'Calculate Commands': 'Calcular Comandos',
            'Export as WB format': 'Exportar em formato WB',
            'Max. Distance': 'Distância Máxima',
            'Max lvl reduction per command': 'Redução máxima de nível por comando',
            'Spy Count': 'Contagem de Espiões',
	},
    },
    allowedMarkets: [],
    allowedScreens: ['place'],
    isDebug: DEBUG,
    enableCountApi: false,
};

// Wie viele Seiten der Berichte-Liste maximal geladen werden -
// praktisch unbegrenzt (siehe "Clear Barbarian Walls", MAX_FA_PAGES_TO_FETCH).
const MAX_REPORT_PAGES_TO_FETCH = 9999;

$.getScript(`https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`, async function() {
    // Initialize Library
    await twSDK.init(scriptConfig);
    const scriptInfo = twSDK.scriptInfo();
    const gameScreen = game_data.screen || twSDK.getParameterByName('screen');
    const isValidScreen = scriptConfig.allowedScreens.includes(gameScreen);
    let troopData = [];
    let unitInfo = await twSDK.getWorldUnitInfo();
    const catRamSpeed = parseInt(unitInfo.config.ram.speed);

    function arrivalByDistance(distance, offsetSec) {
        const currentServerTime = twSDK.getServerDateTimeObject();
        const totalMilSeconds = distance * catRamSpeed * 60 * 1000 + offsetSec * 1000;
        return currentServerTime.getTime() + totalMilSeconds;
    }

    // Helper: Fetch village groups
    async function fetchVillageGroups() {
        let fetchGroups = '';
        if (game_data.player.sitter > 0) {
            fetchGroups = game_data.link_base_pure + `groups&mode=overview&ajax=load_group_menu&t=${game_data.player.id}`;
        } else {
            fetchGroups = game_data.link_base_pure + 'groups&mode=overview&ajax=load_group_menu';
        }
        const villageGroups = await jQuery.get(fetchGroups).then((response)=>response).catch((error)=>{
            UI.ErrorMessage('Error fetching village groups!');
            console.error(`${scriptInfo} Error:`, error);
        }
        );

        return villageGroups;
    }

    // Entry Point
    (async function() {
        try {
            if (isValidScreen) {
                // Build user interface
                const groups = await fetchVillageGroups();
                renderUI(groups);
                addFilterHandlers()
            } else {
                UI.InfoMessage(twSDK.tt('Redirecting...'));
                twSDK.redirectTo('place');
            }
        } catch (error) {
            UI.ErrorMessage(twSDK.tt('There was an error!'));
            console.error(`${scriptInfo} Error:`, error);
        }
    }
    )();

    // Action Handler: Filter villages shown by selected group
    function addFilterHandlers() {
        jQuery('#raGroupsFilter').on('change', function(e) {
            e.preventDefault();
            if (DEBUG) {
                console.debug(`${scriptInfo} selected group ID: `, e.target.value);
            }

            localStorage.setItem(`${scriptConfig.scriptData.prefix}_chosen_group`, e.target.value);

            fetchTroopsForCurrentGroup(parseInt(e.target.value)).then(function(result) {
                troopData = result.homeTroops;
                renderTroopDebugInfo(result.homeTroops, result.mobileCheck);
                if (DEBUG) {
                    console.debug(`${scriptInfo} troopData refreshed for group`, e.target.value, troopData);
                }
            });
        });
        const groupOnLoad = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_group`);
        fetchTroopsForCurrentGroup(parseInt(groupOnLoad ?? 0)).then(function a(result) {
            troopData = result.homeTroops;
            renderTroopDebugInfo(result.homeTroops, result.mobileCheck);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_spy`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`) ?? '1')
        jQuery('#raSpy').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`) ?? '1')
        jQuery('#raSpy').on('change', function(e) {
            e.preventDefault();
            e.target.value = e.target.value.replace(/\D/g, '')
            if (DEBUG) {
                console.debug(`${scriptInfo} Spy count: `, e.target.value);
            }
            if (e.target.value < 1 || isNaN(parseInt(e.target.value))) {
                jQuery('#raSpy').val('1');
                e.target.value = 1;
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_spy`, e.target.value);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_max_distance`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`) ?? '10')
        jQuery('#raMaxDistance').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`) ?? '10')
        jQuery('#raMaxDistance').on('change', function(e) {
            e.preventDefault();
            e.target.value = e.target.value.replace(/\D/g, '')
            if (DEBUG) {
                console.debug(`${scriptInfo} Max Distance: `, e.target.value);
            }
            if (e.target.value < 1 || isNaN(parseInt(e.target.value))) {
                jQuery('#raMaxDistance').val('1');
                e.target.value = 1;
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_max_distance`, e.target.value);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_max_step`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_step`) ?? '2')
        jQuery('#raMaxStep').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_step`) ?? '2')
        jQuery('#raMaxStep').on('change', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '')
            e.preventDefault();
            if (DEBUG) {
                console.debug(`${scriptInfo} Max Step: `, e.target.value);
            }
            if (e.target.value < 1 || isNaN(parseInt(e.target.value))) {
                jQuery('#raMaxStep').val('1');
                e.target.value = 1;
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_max_step`, e.target.value);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_min_level`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_min_level`) ?? '0')
        jQuery('#raMinAmount').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_min_level`) ?? '0')
        jQuery('#raMinAmount').on('change', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '')
            e.preventDefault();
            if (DEBUG) {
                console.debug(`${scriptInfo} min building level: `, e.target.value);
            }
            if (e.target.value > 29 || isNaN(parseInt(e.target.value))) {
                jQuery('#raMinAmount').val('29');
                e.target.value = 29;
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_min_level`, e.target.value);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_chosen_building`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_building`) ?? 'smith')
        jQuery('#raBuildingFilter').on('change', function(e) {
            e.preventDefault();
            if (DEBUG) {
                console.debug(`${scriptInfo} selected building: `, e.target.value);
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_chosen_building`, e.target.value);
        });
        jQuery('#calculateLaunchTimes').on('click', function(e) {
            e.preventDefault();
            getReports();
        });
        jQuery('#exportBBCodeBtn').on('click', function(e) {
            e.preventDefault();
            twSDK.copyToClipboard($('#barbCoordsList').val());
        })
        jQuery('#raListOnlyDiagnose').on('click', function(e) {
            e.preventDefault();
            getReports(true);
        });
        jQuery('#raUnrelatedScreenDiagnose').on('click', function(e) {
            e.preventDefault();
            fetchUnrelatedScreenDiagnose();
        });

    }

    async function fetchUnrelatedScreenDiagnose() {
        renderDebugInfo('');
        const testUrl = `${game_data.link_base_pure}overview`;
        try {
            const response = await jQuery.get(testUrl);
            renderDebugInfo(
                `Diagnose (unbeteiligte Seite): ${testUrl} wurde erfolgreich abgerufen ` +
                    `(Antwortlänge: ${response.length} Zeichen). Dabei wurde NICHTS mit Berichten ` +
                    `gemacht - weder die Berichte-Liste noch ein einzelner Bericht wurde angefragt. ` +
                    `Bitte danach prüfen, ob trotzdem ein Bericht verschwunden ist.`
            );
        } catch (e) {
            renderDebugInfo(`Diagnose (unbeteiligte Seite) fehlgeschlagen: ${(e && e.message) || e}`);
        }
    }

    // Helper: Render groups filter
    function renderGroupsFilter(groups) {
        const groupId = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_group`) ?? 0;
        let groupsFilter = `
		<select name="ra_groups_filter" id="raGroupsFilter">
	`;

        for (const [_,group] of Object.entries(groups.result)) {
            const {group_id, name} = group;
            const isSelected = parseInt(group_id) === parseInt(groupId) ? 'selected' : '';
            if (name !== undefined) {
                groupsFilter += `
				<option value="${group_id}" ${isSelected}>
					${name}
				</option>
			`;
            }
        }

        groupsFilter += `
		</select>
	`;

        return groupsFilter;
    }

    function renderBuildingFilter() {
        const building = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_building`) ?? 'smith';
        let buildingFilter = `<select  name="ra_building_filter" id="raBuildingFilter">`
        for (var key in twSDK.buildings) {
            const isSelected = key === building ? 'selected' : '';
            buildingFilter += `
				<option value="${key}" ${isSelected}  style="background-image:url(https://dsde.innogamescdn.com/asset/352e2f8b/graphic/buildings/${key}.png);">
					${key}
				</option>
			`;
        }
        buildingFilter += `
		</select>
	`;

        return buildingFilter;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderDebugInfo(text) {
        jQuery('#raDebugInfo').html(
            text
                ? `<pre style="white-space:pre-wrap; word-break:break-all; margin-top:10px; padding:8px; background:rgba(0,0,0,0.08); font-size:11px; max-height:400px; overflow:auto;">${escapeHtml(
                      text
                  )}</pre>`
                : ''
        );
    }

    function renderTroopDebugInfo(homeTroops, mobileCheck) {
        const lines = homeTroops.map((v) => `${v.coord}: ${JSON.stringify(v)}`);
        renderDebugInfo(
            `Truppen für gewählte Gruppe (Parsing-Zweig: ${
                mobileCheck ? 'mobile' : 'desktop'
            }, ${homeTroops.length} Dörfer):\n\n${lines.join('\n')}`
        );
    }

    function getUiContainerSelector() {
        return typeof mobiledevice !== 'undefined' && mobiledevice
            ? '#mobileContent'
            : '#contentContainer';
    }

    // Render UI
    function renderUI(groups) {
        const groupsFilter = renderGroupsFilter(groups);
        const buildingFilter = renderBuildingFilter();
        const isMobile = typeof mobiledevice !== 'undefined' && mobiledevice;

        const content = `
        <div class="ra-single-village-snipe" id="raSingleVillageSnipe">
            <h2>${twSDK.tt(scriptConfig.scriptData.name)}</h2>
        <div class="ra-single-village-snipe-data">
        <div class="ra-mb15">
			<div class="ra-grid">
			    <div>
					<label>${twSDK.tt('Max. Distance')}</label>
					<input id="raMaxDistance" type="text" value="30">
				</div>
                                                         <div>
					<label>${twSDK.tt('Spy Count')}</label>
					<input id="raSpy" type="text" value="1">
				</div>
                       <div>
					<label>${twSDK.tt('Max lvl reduction per command')}</label>
					<input id="raMaxStep" type="text" value="1">
				</div>
				<div>
					<label>${twSDK.tt('Min. Level')}</label>
					<input id="raMinAmount" type="text" value="1">
				</div>
                <div>
					<label>${twSDK.tt('Building')}</label>
					${buildingFilter}
				</div>
				<div>
					<label>${twSDK.tt('Group')}</label>
					${groupsFilter}
				</div>
			</div>
		</div>
		<div class="ra-mb15">
			<a href="javascript:void(0);" id="calculateLaunchTimes" class="btn btn-confirm-yes onclick="">
				${twSDK.tt('Calculate Commands')}
			</a>
			<a href="javascript:void(0);" id="exportBBCodeBtn" class="btn" data-snipe="">
				${twSDK.tt('Export as WB format')}
			</a>
		</div>
		<div class="ra-mb15">
			<a href="javascript:void(0);" id="raListOnlyDiagnose" class="btn">
				Diagnose: Nur Berichte-Liste laden (keine Berichte öffnen)
			</a>
		</div>
		<div class="ra-mb15">
			<a href="javascript:void(0);" id="raUnrelatedScreenDiagnose" class="btn">
				Diagnose: Unbeteiligte Seite laden (kein Bezug zu Berichten)
			</a>
		</div>
		  <div class="ra-mb15">
		  <textarea id="barbCoordsList" style="width: 100%" class="ra-textarea" readonly=""></textarea>
			</div>
			<div id="raDebugInfo"></div>
        </div>
            <small>
                <strong>
                    ${twSDK.tt(scriptConfig.scriptData.name)} ${scriptConfig.scriptData.version}
                </strong> -
                <a href="${scriptConfig.scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">
                    ${scriptConfig.scriptData.author}
                </a> -
                <a href="${scriptConfig.scriptData.helpLink}" target="_blank" rel="noreferrer noopener">
                    ${twSDK.tt('Help')}
                </a>
            </small>
        </div>
        <style>
            .ra-single-village-snipe { position: relative; display: block; width: auto; height: auto; clear: both; margin: 0 auto 15px; padding: 10px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
			.ra-single-village-snipe * { box-sizing: border-box; }
			.ra-single-village-snipe input[type="text"] { width: 100%; padding: 5px 10px; border: 1px solid #000; font-size: 16px; line-height: 1; }
			.ra-single-village-snipe label { font-weight: 600 !important; margin-bottom: 5px; display: block; }
			.ra-single-village-snipe select { width: 100%; padding: 5px 10px; border: 1px solid #000; font-size: 16px; line-height: 1; }
			.ra-single-village-snipe .btn-confirm-yes { padding: 3px; }

			${isMobile ? '.ra-single-village-snipe { margin: 5px; border-radius: 10px; } .ra-single-village-snipe h2 { margin: 0 0 10px 0; font-size: 18px; } .ra-single-village-snipe .ra-grid { grid-template-columns: 1fr } .ra-single-village-snipe .ra-grid > div { margin-bottom: 15px; } .ra-single-village-snipe .btn { margin-bottom: 8px; margin-right: 8px; } .ra-single-village-snipe select { height: auto; } .ra-single-village-snipe input[type="text"] { height: auto; } .ra-hide-on-mobile { display: none; }' : '.ra-single-village-snipe .ra-grid { display: grid; grid-template-columns: 150px 1fr 100px 150px 150px; grid-gap: 0 20px; }'}

			/* Normal Table */
			.ra-table { border-collapse: separate !important; border-spacing: 2px !important; }
			.ra-table label,
			.ra-table input { cursor: pointer; margin: 0; }
			.ra-table th { font-size: 14px; }
			.ra-table th,
            .ra-table td { padding: 4px; text-align: center; }
            .ra-table td a { word-break: break-all; }
			.ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }
			.ra-table a:focus:not(a.btn) { color: blue; }
			/* Popup Content */
			.ra-popup-content { position: relative; display: block; width: 360px; }
			.ra-popup-content * { box-sizing: border-box; }
			.ra-popup-content label { font-weight: 600 !important; margin-bottom: 5px; display: block; }
			.ra-popup-content textarea { width: 100%; height: 100px; resize: none; }
			/* Helpers */
			.ra-mb15 { margin-bottom: 15px; }
			.ra-mb30 { margin-bottom: 30px; }
			.ra-chosen-command td { background-color: #ffe563 !important; }
			.ra-text-left { text-align: left !important; }
			.ra-text-center { text-align: center !important; }
			.ra-unit-count { display: inline-block; margin-top: 3px; vertical-align: top; }
        </style>
    `;

        if (jQuery('.ra-single-village-snipe').length < 1) {
            jQuery(getUiContainerSelector()).prepend(content);
        } else {
            jQuery('.ra-single-village-snipe-data').html(content);
        }
    }

    // Render: Build user interface
    async function getReports(listOnly) {

        const buildingType = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_building`);
        var reportData = [];
        renderDebugInfo('');
        const { reportUrls, debugInfo, startUrl } = await fetchReportListPages(MAX_REPORT_PAGES_TO_FETCH);
        const sourceNote = `Quelle der Berichte-Liste: ${startUrl}`;
        if (reportUrls.length === 0) {
            renderDebugInfo(`${sourceNote}\n\n${debugInfo}`);
            return;
        }
        if (listOnly) {
            renderDebugInfo(
                `${sourceNote}\n\n` +
                    `Diagnose-Modus: ${reportUrls.length} Berichte-URL(s) gefunden, ` +
                    `es wurde aber KEINE davon abgerufen (kein Bericht wurde geöffnet):\n\n` +
                    reportUrls.join('\n')
            );
            return;
        }
        const baseNote =
            sourceNote +
            (debugInfo
                ? `\n\nHinweis zur Berichte-Liste (${reportUrls.length} Berichte gefunden):\n\n${debugInfo}`
                : '');
        renderDebugInfo(baseNote);
        try {
            twSDK.startProgressBar(reportUrls.length);
        } catch (e) {
            console.warn(`${scriptInfo} startProgressBar fehlgeschlagen:`, e);
        }
        const stats = { noSpyData: 0, notBarbarian: 0, wrongBuilding: 0, parseError: 0 };
        let sampleReportHtml = '';
        function recordSample(reason, htmlDoc) {
            if (sampleReportHtml) {
                return;
            }
            const body = htmlDoc.body ? htmlDoc.body.innerHTML : '';
            const markers = ['attack_spy_building_data', 'attack_info_def'];
            let firstMarkerIndex = -1;
            let foundMarker = '';
            markers.forEach((marker) => {
                const idx = body.indexOf(marker);
                if (idx !== -1 && (firstMarkerIndex === -1 || idx < firstMarkerIndex)) {
                    firstMarkerIndex = idx;
                    foundMarker = marker;
                }
            });

            let excerpt;
            let excerptNote;
            if (firstMarkerIndex !== -1) {
                const start = Math.max(0, firstMarkerIndex - 400);
                excerpt = body.slice(start, start + 2000);
                excerptNote = `Ausschnitt um die Fundstelle von "${foundMarker}" (Position ${firstMarkerIndex} von ${body.length} Zeichen):`;
            } else {
                excerpt = body.slice(-2000);
                excerptNote = `Weder "attack_spy_building_data" noch "attack_info_def" kommen irgendwo im Berichts-HTML vor (Gesamtlänge ${body.length} Zeichen). Ausschnitt vom Ende:`;
            }

            sampleReportHtml = `Grund: ${reason}\n\n${excerptNote}\n${excerpt}`;
        }

        // TEST (v1.16-test-fetch): fetchUrlViaAjax() statt fetchUrlViaIframe(),
        // siehe Kommentar am Dateianfang. Bei erneuten Problemen einfach
        // wieder auf fetchUrlViaIframe() umstellen (Funktion bleibt erhalten).
        let fetchAborted = false;
        let fetchAbortError = null;
        for (let index = 0; index < reportUrls.length; index++) {
            try {
                twSDK.updateProgressBar(index, reportUrls.length);
            } catch (e) {
                console.warn(`${scriptInfo} updateProgressBar fehlgeschlagen:`, e);
            }

            let data;
            try {
                data = await fetchUrlViaAjax(reportUrls[index]);
            } catch (fetchErr) {
                fetchAborted = true;
                fetchAbortError = fetchErr;
                break;
            }

            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(data, 'text/html');
            try {
                const spyDataEl = jQuery(htmlDoc).find('#attack_spy_building_data')[0];
                if (!spyDataEl) {
                    stats.noSpyData++;
                    recordSample('kein #attack_spy_building_data-Element gefunden', htmlDoc);
                    continue;
                }
                const report = JSON.parse(spyDataEl.defaultValue);
                var spyResults = {};
                for (let j = 0; j < report.length; j++) {
                    spyResults[report[j].id] = report[j];
                }
                const villageAnchor = jQuery(htmlDoc).find('#attack_info_def > tbody > tr > td > span[data-player=0]');
                if (villageAnchor.length === 0) {
                    stats.notBarbarian++;
                    recordSample('kein Barbarendorf als Ziel (data-player=0 nicht gefunden)', htmlDoc);
                    continue;
                }
                if (typeof spyResults[buildingType] === 'undefined') {
                    stats.wrongBuilding++;
                    recordSample(`gewähltes Gebäude "${buildingType}" nicht erspäht`, htmlDoc);
                    continue;
                }
                const reportInfo = {
                    wall: parseInt(typeof spyResults['wall'] === 'undefined' ? 0 : spyResults['wall'].level),
                    building: parseInt(spyResults[buildingType].level),
                    villageId: villageAnchor[0].getAttribute('data-id'),
                    coord: twSDK.getCoordFromString(villageAnchor.text()),
                    lastCommand: new Date(),
                };
                reportData.push(reportInfo);
            } catch (e) {
                stats.parseError++;
                recordSample(`Parse-Fehler: ${e.message}`, htmlDoc);
                console.log(e);
            }
        }

        if (fetchAborted) {
            UI.ErrorMessage(twSDK.tt('There was an error while fetching the report data!'));
            console.error(`${scriptInfo} Error: `, fetchAbortError);
            const details =
                (fetchAbortError && (fetchAbortError.stack || fetchAbortError.message || fetchAbortError.statusText)) ||
                String(fetchAbortError);
            renderDebugInfo(
                `${baseNote}\n\nFehler beim Laden der einzelnen Berichte (${reportData.length} von ${reportUrls.length} bereits verarbeitet):\n\n${details}`
            );
            return;
        }

        const commands = doCalculations(reportData);
        let wbCommands = ""
        let i = 0;
        commands.forEach(function(command) {
            wbCommands += convertWbCommand(command, i);
            i++;
        });
        if (reportData.length === 0) {
            renderDebugInfo(
                `${baseNote}\n\n` +
                    `Keine auswertbaren Berichte gefunden (von ${reportUrls.length} geladenen Berichten):\n` +
                    `- ohne Spähdaten (kein Späher gesendet/Späher gestorben): ${stats.noSpyData}\n` +
                    `- kein Barbarendorf als Ziel: ${stats.notBarbarian}\n` +
                    `- gewähltes Gebäude "${buildingType}" nicht erspäht: ${stats.wrongBuilding}\n` +
                    `- Parse-Fehler: ${stats.parseError}\n\n` +
                    `Beispiel-Bericht (bitte zurückmelden):\n${sampleReportHtml}`
            );
        } else if (commands.length === 0) {
            UI.SuccessMessage("All perfect");
            renderDebugInfo(baseNote);
        } else {
            renderDebugInfo(baseNote);
        }
        $('#barbCoordsList').val(wbCommands);
    }

    // returns necessary amount of axes
    function axesReq(wallLevel) {
        return 30 * wallLevel + 10;
    }

    function calculateAllCombinations(playerVillages, barbarianVillages, minLevel, maxDistance) {
        const combinations = [];

        for (const playerVillage of playerVillages) {
            for (const barbarianVillage of barbarianVillages) {
                const distance = twSDK.calculateDistance(playerVillage.coord, barbarianVillage.coord);
                const wallPossible = barbarianVillage.wall > 0 && playerVillage.ram >= ramsMin[barbarianVillage.wall] && playerVillage.axe >= axesReq(barbarianVillage.wall);
                const catPossible = barbarianVillage.building > minLevel && playerVillage.catapult >= catsMin[barbarianVillage.building];
                if (distance <= maxDistance && (wallPossible || catPossible)) {
                    combinations.push({
                        playerVillage,
                        barbarianVillage,
                        distance
                    });
                }
            }
        }

        combinations.sort((a,b)=>a.distance - b.distance);

        return combinations;
    }

    const ramsRequired = [0, 2, 4, 7, 10, 14, 19, 24, 30, 38, 46, 55, 65, 77, 91, 106, 124, 144, 166, 191, 220];
    const ramsMin = [0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6];
    const catsRequiredToBreak = [
    [0, 2, 6, 10, 15, 21, 28, 36, 45, 56, 68, 82, 98, 115, 136, 159, 185, 215, 248, 286, 328, 376, 430, 490, 558, 634, 720, 815, 922, 1041, 1175],
    [0, 0, 2, 6, 11, 17, 23, 31, 39, 49, 61, 74, 89, 106, 126, 148, 173, 202, 234, 270, 312, 358, 410, 469, 534, 608, 691, 784, 888, 1005, 1135],
    [0, 0, 0, 2, 7, 12, 18, 25, 33, 43, 54, 66, 81, 97, 116, 137, 161, 189, 220, 255, 295, 340, 390, 447, 511, 583, 663, 754, 855, 968, 1095],
    [0, 0, 0, 0, 3, 7, 13, 20, 27, 36, 47, 59, 72, 88, 106, 126, 149, 176, 206, 240, 278, 321, 370, 425, 487, 557, 635, 723, 821, 932, 1055],
    [0, 0, 0, 0, 0, 3, 8, 14, 21, 30, 40, 51, 64, 79, 96, 115, 137, 163, 192, 224, 261, 303, 350, 403, 463, 531, 607, 692, 788, 895, 1015],
    [0, 0, 0, 0, 0, 0, 3, 9, 15, 23, 32, 43, 55, 69, 86, 104, 126, 150, 177, 209, 244, 285, 330, 382, 440, 505, 579, 661, 754, 859, 976],
    [0, 0, 0, 0, 0, 0, 0, 3, 9, 17, 25, 35, 47, 60, 76, 93, 114, 137, 163, 193, 227, 266, 310, 360, 416, 479, 550, 631, 721, 822, 936],
    [0, 0, 0, 0, 0, 0, 0, 0, 3, 10, 18, 28, 38, 51, 66, 82, 102, 124, 149, 178, 211, 248, 290, 338, 392, 453, 522, 600, 687, 786, 896],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 11, 20, 30, 42, 56, 72, 90, 111, 135, 162, 194, 230, 270, 316, 368, 427, 494, 569, 654, 749, 856],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 12, 22, 33, 46, 61, 78, 98, 121, 147, 177, 211, 250, 294, 345, 401, 466, 538, 620, 713, 816],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 13, 23, 36, 50, 66, 85, 107, 132, 160, 193, 230, 273, 321, 376, 438, 508, 587, 676, 777],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 14, 26, 39, 54, 72, 92, 116, 143, 175, 210, 251, 297, 350, 409, 477, 553, 640, 737],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 16, 28, 42, 59, 78, 101, 127, 156, 190, 229, 273, 324, 381, 446, 520, 603, 697],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 17, 30, 46, 64, 85, 110, 138, 170, 207, 250, 298, 353, 415, 486, 567, 657],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 18, 33, 50, 70, 93, 120, 150, 186, 226, 272, 325, 385, 453, 530, 617],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 20, 36, 54, 76, 101, 130, 164, 202, 246, 297, 354, 419, 493, 578],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 22, 39, 59, 83, 110, 142, 178, 220, 268, 323, 386, 457, 538],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 24, 43, 65, 90, 120, 155, 195, 240, 292, 352, 420, 498],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 26, 46, 70, 98, 131, 169, 212, 262, 319, 384, 458],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 28, 50, 77, 107, 143, 184, 231, 285, 347, 418],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 30, 55, 84, 117, 156, 200, 252, 311, 379],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 33, 60, 91, 127, 170, 218, 274, 339],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 36, 65, 99, 139, 185, 238, 299],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 39, 71, 108, 151, 201, 259],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 43, 77, 118, 165, 219],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 47, 84, 128, 180],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 51, 92, 140],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 55, 100],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19, 60],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
    const catsMin = [0, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 8, 8, 9, 10, 10, 11, 12, 13, 15, 16, 17, 19, 20];

    function requiredCatas(maxCata, currentLevel, minLevel, maxStep) {
        if (currentLevel <= minLevel || catsMin[currentLevel] > maxCata) {
            return 0;
        }

        let maxDestroyed = (currentLevel - minLevel) < maxStep ? (currentLevel - minLevel) : maxStep;

        for (let i = maxDestroyed; i > 0; i--) {
            const catasRequired = catsRequiredToBreak[currentLevel - i][currentLevel];
            if (maxCata >= catasRequired) {
                return i;
            }
        }

        return 0;
    }

    function findTroopCombination(playerVillage, barbarianVillage, distance, minLevel, maxStep, spyAmount) {
        let combinations = [];
        let maxReduction = 0;
        let catapultsRequired = 0;

        const ramsReq = ramsRequired[barbarianVillage.wall];
        const axesRequired = Math.ceil(axesReq(barbarianVillage.wall));

        if ((barbarianVillage.wall > 0 && (playerVillage.ram < ramsReq || playerVillage.axe < axesRequired)) || playerVillage.spy < spyAmount) {
            return combinations;
        }

        if (barbarianVillage.wall > 0) {
            playerVillage.axe -= axesRequired;
            playerVillage.ram -= ramsReq;
            barbarianVillage.wall = 0;
            playerVillage.spy -= spyAmount;

            barbarianVillage.dLastAttack = distance;

            combinations.push({
                barbarianVillage,
                playerVillage,
                axe: axesRequired,
                spy: spyAmount,
                ram: ramsReq,
                catapult: 0,
                distance: distance
            });
        }

        while (barbarianVillage.building > minLevel && playerVillage.spy >= spyAmount) {
            maxReduction = requiredCatas(playerVillage.catapult, barbarianVillage.building, minLevel, maxStep);
            catapultsRequired = catsRequiredToBreak[barbarianVillage.building - maxReduction][barbarianVillage.building];

            if (maxReduction == 0) {
                break;
            }

            playerVillage.catapult -= catapultsRequired;
            barbarianVillage.building -= maxReduction;
            playerVillage.spy -= spyAmount;

            barbarianVillage.dLastAttack = distance;

            combinations.push({
                barbarianVillage,
                playerVillage,
                axe: 0,
                spy: spyAmount,
                ram: 0,
                catapult: catapultsRequired,
                distance: distance
            });
        }

        return combinations;
    }

    function findTroopCombinations(playerVillages, barbarianVillages, minLevel, maxDistance, maxStep, spyAmount) {
        let result = [];

        const allCombinations = calculateAllCombinations(playerVillages, barbarianVillages, minLevel, maxDistance);

        for (const combination of allCombinations) {
            const {playerVillage, barbarianVillage, distance} = combination;
            const troopCombinations = findTroopCombination(playerVillage, barbarianVillage, distance, minLevel, maxStep, spyAmount);

            if (troopCombinations.length) {
                result = result.concat(troopCombinations);
            }
        }
        return result;
    }

    function doCalculations(farmingData) {

        console.log('Starting calculating Commands...');

        const maxDistance = localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`);
        const minLevel = localStorage.getItem(`${scriptConfig.scriptData.prefix}_min_level`);
        const maxStep = localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_step`);
        const spyAmount = localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`);

        if (DEBUG) {
            console.debug(`${scriptInfo} troopData at calculation time:`, troopData);
            console.debug(`${scriptInfo} farmingData at calculation time:`, farmingData);
        }

        const troopCombinations = findTroopCombinations(troopData, farmingData, minLevel, maxDistance, maxStep, spyAmount);
        console.log(troopCombinations);
        console.log('##Done##')
        return troopCombinations;

    }

    function convertWbCommand(c, i) {
        return `${c.playerVillage.villageId}&${c.barbarianVillage.villageId}&${c.ram > 0 ? 'ram' : 'catapult'}&${arrivalByDistance(c.distance, i)}&9&false&false&` + `spear=/sword=/axe=${btoa(c.axe)}/archer=/spy=${btoa(c.spy)}/light=/marcher=/heavy=/ram=${btoa(c.ram)}/catapult=${btoa(c.catapult)}/knight=/snob=/militia=MA==\n`;
    }

    // Helper: Fetch home troop counts for current group
    async function fetchTroopsForCurrentGroup(groupId) {
        const mobileCheck = $('#mobileHeader').length > 0;
        const troopsForGroup = await jQuery.get(game_data.link_base_pure + `overview_villages&mode=combined&group=${groupId}&page=-1`).then(async(response)=>{
            const htmlDoc = new DOMParser().parseFromString(response, 'text/html');
            const homeTroops = [];

            if (mobileCheck) {
                let table = jQuery(htmlDoc).find('#combined_table tr.nowrap');
                for (let i = 0; i < table.length; i++) {
                    let objTroops = {};
                    let coord = table[i].getElementsByClassName('quickedit-label')[0].innerHTML;
                    let villageId = parseInt(table[i].getElementsByClassName('quickedit-vn')[0].getAttribute('data-id'));
                    let listTroops = Array.from(table[i].getElementsByTagName('img')).filter((e)=>e.src.includes('unit')).map((e)=>({
                        name: e.src.split('unit_')[1].replace('@2x.png', ''),
                        value: parseInt(e.parentElement.nextElementSibling.innerText),
                    }));
                    listTroops.forEach((item)=>{
                        objTroops[item.name] = item.value;
                    }
                    );
                    objTroops.coord = twSDK.getCoordFromString(coord);
                    objTroops.villageId = villageId;

                    homeTroops.push(objTroops);
                }
            } else {
                const combinedTableRows = jQuery(htmlDoc).find('#combined_table tr.nowrap');
                const combinedTableHead = jQuery(htmlDoc).find('#combined_table tr:eq(0) th');

                const combinedTableHeader = [];

                jQuery(combinedTableHead).each(function() {
                    const thImage = jQuery(this).find('img').attr('src');
                    if (thImage) {
                        let thImageFilename = thImage.split('/').pop();
                        thImageFilename = thImageFilename.replace('.png', '');
                        combinedTableHeader.push(thImageFilename);
                    } else {
                        combinedTableHeader.push(null);
                    }
                });

                combinedTableRows.each(function() {
                    let rowTroops = {};

                    combinedTableHeader.forEach((tableHeader,index)=>{
                        if (tableHeader) {
                            if (tableHeader.includes('unit_')) {
                                const coord = twSDK.getCoordFromString(jQuery(this).find('td:eq(1) span.quickedit-label').text());
                                const villageId = jQuery(this).find('td:eq(1) span.quickedit-vn').attr('data-id');
                                const unitType = tableHeader.replace('unit_', '');
                                rowTroops = {
                                    ...rowTroops,
                                    villageId: parseInt(villageId),
                                    coord: coord,
                                    [unitType]: parseInt(jQuery(this).find(`td:eq(${index})`).text()),
                                };
                            }
                        }
                    }
                    );

                    homeTroops.push(rowTroops);
                });
            }

            return homeTroops;
        }
        ).catch((error)=>{
            UI.ErrorMessage(twSDK.tt('An error occured while fetching troop counts!'));
            console.error(`${scriptInfo} Error:`, error);
        }
        );

        return { homeTroops: troopsForGroup ?? [], mobileCheck };
    }

    function isNavigableReportUrl(href) {
        return (
            typeof href !== 'undefined' &&
            href !== '' &&
            href !== '#' &&
            href.indexOf('javascript:') !== 0 &&
            href.indexOf('view=') !== -1
        );
    }

    function isReportDataRow(row) {
        const cells = jQuery(row).find('td');
        if (cells.length === 0 || jQuery(row).find('th').length > 0) {
            return false;
        }
        if (cells.length === 1 && cells.first().attr('colspan')) {
            return false;
        }
        return true;
    }

    function extractReportRowLinks(htmlDoc) {
        const links = [];
        let nonNavigableCount = 0;
        let sampleRowHtml = '';
        jQuery(htmlDoc)
            .find('#report_list tbody tr')
            .each(function () {
                try {
                    if (!isReportDataRow(this)) {
                        return;
                    }
                    const reportUrl = jQuery(this).find('.report-link').attr('href');
                    if (isNavigableReportUrl(reportUrl)) {
                        links.push(reportUrl);
                    } else {
                        nonNavigableCount++;
                        if (!sampleRowHtml) {
                            sampleRowHtml = this.outerHTML || '';
                        }
                    }
                } catch (e) {
                    console.warn(`${scriptInfo} Report-Zeile übersprungen (unerwartete Struktur):`, e);
                }
            });
        return { links, nonNavigableCount, sampleRowHtml };
    }

    function findNextReportPageUrl(htmlDoc, currentPageUrl) {
        let currentParams;
        try {
            currentParams = new URL(currentPageUrl, window.location.origin).searchParams;
        } catch (e) {
            return null;
        }

        let bestUrl = null;
        let bestValue = Infinity;

        jQuery(htmlDoc)
            .find('a[href*="mode=attack"]')
            .each(function () {
                const href = jQuery(this).attr('href');
                if (!href || href.indexOf('view=') !== -1) {
                    return;
                }
                let url;
                try {
                    url = new URL(href, window.location.origin);
                } catch (e) {
                    return;
                }
                for (const [key, value] of url.searchParams.entries()) {
                    if (key === 'screen' || key === 'mode') {
                        continue;
                    }
                    const numValue = parseInt(value);
                    if (isNaN(numValue)) {
                        continue;
                    }
                    const currentValue = parseInt(currentParams.get(key));
                    const currentCompare = isNaN(currentValue) ? 0 : currentValue;
                    if (numValue > currentCompare && numValue < bestValue) {
                        bestValue = numValue;
                        bestUrl = url.pathname + url.search;
                    }
                }
            });

        return bestUrl;
    }

    function isGeneralReportListLink(href) {
        return href.indexOf('group_id=') === -1 || href.indexOf('group_id=0') !== -1;
    }

    function findReportListNavLink() {
        let navHref = null;
        jQuery('a[href*="screen=report"]').each(function () {
            const href = jQuery(this).attr('href');
            if (
                href &&
                href.indexOf('view=') === -1 &&
                href.indexOf('mode=attack') !== -1 &&
                isGeneralReportListLink(href)
            ) {
                navHref = href;
                return false;
            }
        });
        if (navHref) {
            return navHref;
        }
        jQuery('a[href*="screen=report"]').each(function () {
            const href = jQuery(this).attr('href');
            if (href && href.indexOf('view=') === -1 && isGeneralReportListLink(href)) {
                navHref = href;
                return false;
            }
        });
        return navHref;
    }

    // TEST-Variante (v1.16-test-fetch), siehe Kommentar am Dateianfang:
    // fetch() statt jQuery.get()/jQuery.ajax(). Der Unterschied zu
    // jQuery.get() ist der Header "X-Requested-With: XMLHttpRequest", den
    // jQuery bei jedem AJAX-Request automatisch mitsendet und den fetch()
    // NICHT setzt - die Hypothese ist, dass genau dieser Header (und nicht
    // AJAX an sich) der Auslöser für das beobachtete Löschen von Berichten
    // war. Im Unterschied zu fetchUrlViaIframe() (siehe unten) findet dabei
    // KEINE sichtbare Navigation statt, also auch keine Weiterleitung, die
    // die mobile Schnellleiste verdeckt.
    // credentials: 'same-origin' sorgt dafür, dass die Session-Cookies
    // mitgesendet werden (sonst würde der Server vermutlich einen
    // Login-/Fehler-Screen statt der eigentlichen Seite liefern).
    function fetchUrlViaAjax(url, timeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 20000);

        return fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            redirect: 'follow',
            signal: controller.signal,
        })
            .then((response) => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} beim Laden von ${url}`);
                }
                return response.text();
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                throw error;
            });
    }

    // Fallback aus v1.15 (Punkte 25-27): echte Navigation über ein
    // unsichtbares iframe statt XHR. Bleibt im Code, falls fetchUrlViaAjax()
    // sich live doch als unzureichend herausstellt und wieder zurück auf
    // die iframe-Variante gewechselt werden muss.
    function fetchUrlViaIframe(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.setAttribute('sandbox', 'allow-same-origin');
            let settled = false;

            function cleanup() {
                clearTimeout(timeoutId);
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }

            const timeoutId = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error(`Timeout beim Laden von ${url} (echte Navigation via iframe)`));
            }, timeoutMs || 20000);

            iframe.onload = function () {
                if (settled) return;
                settled = true;
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const html = iframeDoc.documentElement ? iframeDoc.documentElement.outerHTML : '';
                    cleanup();
                    resolve(html);
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            iframe.src = url;
            document.body.appendChild(iframe);
        });
    }

    async function fetchReportListPages(maxReportPagesToFetch) {
        const reportUrls = [];
        let debugInfo = '';
        let totalNonNavigableCount = 0;
        let nonNavigableSampleHtml = '';
        const startUrl = findReportListNavLink() || game_data.link_base_pure + 'report&mode=attack';
        let currentUrl = startUrl;
        let pageCount = 0;

        while (currentUrl && pageCount < maxReportPagesToFetch) {
            let html;
            try {
                // TEST (v1.16-test-fetch): fetchUrlViaAjax() statt fetchUrlViaIframe()
                html = await fetchUrlViaAjax(currentUrl);
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('Error fetching report list page!'));
                console.error(`${scriptInfo} Error:`, error);
                debugInfo = `Fehler beim Laden von Berichte-Seite ${pageCount + 1}:\n\n${
                    (error && (error.statusText || error.message)) || String(error)
                }`;
                break;
            }

            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(html, 'text/html');
            const { links: rowLinks, nonNavigableCount, sampleRowHtml } = extractReportRowLinks(htmlDoc);
            reportUrls.push(...rowLinks);
            totalNonNavigableCount += nonNavigableCount;
            if (nonNavigableCount > 0 && !nonNavigableSampleHtml) {
                nonNavigableSampleHtml = sampleRowHtml;
            }
            pageCount++;

            if (rowLinks.length > 0) {
                debugInfo = '';
            } else if (pageCount === 1) {
                const rawSample = typeof html === 'string' ? html : '';
                debugInfo = `0 Report-Links auf der ersten Berichte-Seite gefunden.\n\nBeispiel-Inhalt (bitte zurückmelden):\n${rawSample.slice(
                    0,
                    2000
                )}`;
            }

            currentUrl = findNextReportPageUrl(htmlDoc, currentUrl);
        }

        if (totalNonNavigableCount > 0) {
            const nonNavNote = `${totalNonNavigableCount} Berichte-Zeile(n) hatten keinen abrufbaren Link (href="#" o.ä. statt einer echten URL, vermutlich wird der Bericht per Klick/JavaScript statt über einen normalen Link geöffnet) und wurden übersprungen.\n\nBeispiel-Zeile (bitte zurückmelden):\n${nonNavigableSampleHtml.slice(
                0,
                2000
            )}`;
            debugInfo = debugInfo ? `${debugInfo}\n\n${nonNavNote}` : nonNavNote;
        } else if (reportUrls.length === 0 && !debugInfo) {
            debugInfo = `0 Berichte über ${pageCount} Seite(n) gefunden.`;
        }

        return { reportUrls, debugInfo, startUrl };
    }
});
