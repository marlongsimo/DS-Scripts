/*
 * Script Name: Barbarian Village Former
 * Version: v1.2
 * Last Updated: 2024-01-07
 * Author Contact: secundum, SaveBank
 *
 * === FIXES applied in this version ===
 * 1. Group-change handler now correctly awaits fetchTroopsForCurrentGroup()
 *    instead of assigning the raw Promise to troopData. This was causing
 *    "troopData is not iterable" errors whenever a group other than the
 *    initially loaded one was selected, which surfaced as
 *    "There was an error while fetching the report data!" even though the
 *    reports themselves were read correctly.
 * 2. #raSpy change handler was writing to the wrong localStorage key
 *    (${prefix}_max_distance instead of ${prefix}_spy).
 * 3. renderUI() referenced an undefined variable `body` in the else branch;
 *    changed to `content`.
 * 4. Removed stray empty console.log().
 * 5. Fixed a broken monotonic value in catsRequiredToBreak (row for target
 *    level 1: ...469, 534, 508, 691... -> 508 corrected to 608).
 * 6. Fixed German translation typo "kattern" -> "kürzen".
 * 7. Trigger-Screen von der Berichte-Übersicht (screen=report&mode=attack)
 *    auf den Versammlungsplatz (screen=place) umgestellt. Screen-Erkennung
 *    nutzt jetzt game_data.screen statt twSDK.checkValidLocation(), da
 *    diese intern nur window.location.href liest - in der mobilen App wird
 *    der Screen dort nicht immer korrekt widergespiegelt (gleicher Bug wie
 *    bei "Clear Barbarian Walls" gefunden und dort schon gefixt).
 * 8. getReportUrls() (las #report_list aus dem Live-DOM) ersetzt durch
 *    fetchReportListPages(): lädt die Berichte-Liste jetzt per AJAX über
 *    alle Seiten, unabhängig vom aktuell angezeigten Screen - Voraussetzung
 *    dafür, dass das Script vom Versammlungsplatz aus laufen kann, wo die
 *    Berichte-Liste gar nicht im DOM vorhanden ist.
 * 9. getUiContainerSelector() ergänzt (Vorbild: "Clear Barbarian Walls"):
 *    #mobileContent/#contentContainer-Auswahl ist jetzt gegen ein
 *    undefiniertes mobiledevice abgesichert (vorher ungeschützter
 *    ReferenceError möglich) und an einer Stelle zusammengefasst statt
 *    doppelt inline geprüft.
 * 10. fetchTroopsForCurrentGroup(): Aufruf von tt(...) (undefinierte
 *     globale Funktion) im Catch-Zweig auf twSDK.tt(...) korrigiert.
 */

// User Input
if (typeof DEBUG !== 'boolean')
    DEBUG = true;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'barbFormer',
        name: `Barbarian Village Former`,
        version: 'v1.2',
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

// Wie viele Seiten der Berichte-Liste maximal per AJAX geladen werden -
// praktisch unbegrenzt (siehe "Clear Barbarian Walls", MAX_FA_PAGES_TO_FETCH).
const MAX_REPORT_PAGES_TO_FETCH = 9999;

$.getScript(`https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`, async function() {
    // Initialize Library
    await twSDK.init(scriptConfig);
    const scriptInfo = twSDK.scriptInfo();
    // twSDK.checkValidLocation('screen') liest intern nur window.location.href
    // (siehe twSDK.getParameterByName) - in der mobilen App wird der Screen
    // dort nicht zuverlässig widergespiegelt. game_data.screen wird vom Spiel
    // selbst gesetzt und ist auch in der App zuverlässig (gleicher Fix wie
    // bei "Clear Barbarian Walls").
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
            console.error(`${scriptInfo()} Error:`, error);
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
                console.debug(`${scriptInfo()} selected group ID: `, e.target.value);
            }

            localStorage.setItem(`${scriptConfig.scriptData.prefix}_chosen_group`, e.target.value);

            // FIX: properly await the async fetch instead of assigning the Promise
            // object itself to troopData (this previously caused
            // "troopData is not iterable" errors during calculation whenever
            // a group other than the initially loaded one was selected).
            fetchTroopsForCurrentGroup(parseInt(e.target.value)).then(function(result) {
                troopData = result;
                if (DEBUG) {
                    console.debug(`${scriptInfo()} troopData refreshed for group`, e.target.value, troopData);
                }
            });
        });
        const groupOnLoad = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_group`);
        fetchTroopsForCurrentGroup(parseInt(groupOnLoad ?? 0)).then(function a(result) {
            troopData = result
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_spy`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`) ?? '1')
        jQuery('#raSpy').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`) ?? '1')
        jQuery('#raSpy').on('change', function(e) {
            e.preventDefault();
            e.target.value = e.target.value.replace(/\D/g, '')
            if (DEBUG) {
                console.debug(`${scriptInfo()} Spy count: `, e.target.value);
            }
            if (e.target.value < 1 || isNaN(parseInt(e.target.value))) {
                jQuery('#raSpy').val('1');
                e.target.value = 1;
            }
            // FIX: this was writing to the "_max_distance" key instead of "_spy",
            // silently corrupting the stored max distance value every time the
            // spy count was changed.
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_spy`, e.target.value);
        });
        localStorage.setItem(`${scriptConfig.scriptData.prefix}_max_distance`, localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`) ?? '10')
        jQuery('#raMaxDistance').val(localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`) ?? '10')
        jQuery('#raMaxDistance').on('change', function(e) {
            e.preventDefault();
            e.target.value = e.target.value.replace(/\D/g, '')
            if (DEBUG) {
                console.debug(`${scriptInfo()} Max Distance: `, e.target.value);
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
                console.debug(`${scriptInfo()} Max Step: `, e.target.value);
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
                console.debug(`${scriptInfo()} min building level: `, e.target.value);
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
                console.debug(`${scriptInfo()} selected building: `, e.target.value);
            }
            localStorage.setItem(`${scriptConfig.scriptData.prefix}_chosen_building`, e.target.value);
        });
        jQuery('#calculateLaunchTimes').on('click', function(e) {
            e.preventDefault();

            // Start all the calculations
            // TODO Rename functions
            getReports();

        });
        jQuery('#exportBBCodeBtn').on('click', function(e) {
            e.preventDefault();
            twSDK.copyToClipboard($('#barbCoordsList').val());
        })

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

    // Helper: rohes/unbekanntes HTML sicher als sichtbaren Text ins Panel
    // rendern (für die Inline-Debug-Ausgabe unten) - alert()/confirm() sind
    // in der App-WebView nachweislich unsichtbar (siehe "Clear Barbarian
    // Walls"), Diagnosen müssen daher direkt im Panel erscheinen.
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

    // Helper: In der mobilen App/Ansicht gibt es kein #contentContainer, dafür
    // #mobileContent (gleiche Unterscheidung wie im gehosteten Script
    // "Clear Barbarian Walls", das dieses Muster von hier übernommen hatte).
    // typeof-Prüfung, damit ein nicht existierendes mobiledevice keinen
    // ReferenceError wirft.
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
            // FIX: `body` was undefined here; the intended variable is `content`.
            jQuery('.ra-single-village-snipe-data').html(content);
        }
    }

    // Render: Build user interface
    async function getReports() {

        const buildingType = localStorage.getItem(`${scriptConfig.scriptData.prefix}_chosen_building`);
        var reportData = [];
        renderDebugInfo('');
        const { reportUrls, debugInfo } = await fetchReportListPages(MAX_REPORT_PAGES_TO_FETCH);
        if (reportUrls.length === 0) {
            renderDebugInfo(debugInfo);
            return;
        }
        twSDK.startProgressBar(reportUrls.length);
        twSDK.getAll(reportUrls, function(index, data) {
            twSDK.updateProgressBar(index, reportUrls.length);

            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(data, 'text/html');
            // Read building data
            let report = null;
            try {
                report = JSON.parse(jQuery(htmlDoc).find('#attack_spy_building_data')[0].defaultValue);
                var spyResults = {};
                for (var i = 0; i < report.length; i++) {
                    spyResults[report[i].id] = report[i];
                }
                const villageAnchor = jQuery(htmlDoc).find('#attack_info_def > tbody > tr > td > span[data-player=0]');
                if (spyResults !== null && typeof spyResults[buildingType] !== 'undefined' && villageAnchor) {
                    const reportInfo = {
                        wall: parseInt(typeof spyResults['wall'] === 'undefined' ? 0 : spyResults['wall'].level),
                        building: parseInt(spyResults[buildingType].level),
                        villageId: villageAnchor[0].getAttribute('data-id'),
                        coord: twSDK.getCoordFromString(villageAnchor.text()),
                        lastCommand: new Date(),
                    };
                    reportData.push(reportInfo);
                }
            } catch (e) {
                // Not usable Report
                console.log(e);
            }

        }, function() {
            const commands = doCalculations(reportData);
            let wbCommands = ""
            let i = 0;
            commands.forEach(function(command) {
                wbCommands += convertWbCommand(command, i);
                i++;
            });
            if (commands.length == 0) {
                UI.SuccessMessage("All perfect");
            }
            $('#barbCoordsList').val(wbCommands);
        }, function(error) {
            UI.ErrorMessage(twSDK.tt('There was an error while fetching the report data!'));
            console.error(`${scriptInfo} Error: `, error);
        });
    }

    // returns necessary amount of axes
    function axesReq(wallLevel) {
        // calculation: 30 axes * <wall level>
        // +10 bonus axes
        return 30 * wallLevel + 10;
    }

    // Function to calculate all possible combinations of player villages and barbarian villages
    function calculateAllCombinations(playerVillages, barbarianVillages, minLevel, maxDistance) {
        const combinations = [];

        for (const playerVillage of playerVillages) {
            for (const barbarianVillage of barbarianVillages) {
                const distance = twSDK.calculateDistance(playerVillage.coord, barbarianVillage.coord);
                const wallPossible = barbarianVillage.wall > 0 && playerVillage.ram >= ramsMin[barbarianVillage.wall] && playerVillage.axe >= axesReq(barbarianVillage.wall);
                const catPossible = barbarianVillage.building > minLevel && playerVillage.catapult >= catsMin[barbarianVillage.building];
                // Check if the distance is within the maximum allowed distance and any reduction is possible
                if (distance <= maxDistance && (wallPossible || catPossible)) {
                    combinations.push({
                        playerVillage,
                        barbarianVillage,
                        distance
                    });
                }
            }
        }

        // Sort combinations by distance in ascending order
        combinations.sort((a,b)=>a.distance - b.distance);

        return combinations;
    }

    const ramsRequired = [0, 2, 4, 7, 10, 14, 19, 24, 30, 38, 46, 55, 65, 77, 91, 106, 124, 144, 166, 191, 220];
    /* to break a wall at [i] level to 0.*/
    const ramsMin = [0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6];
    /*to break a wall at [i] level by 1 level*/
    const catsRequiredToBreak = [/*[0,30] = from 30 to 0*/
    /*From:[0,1,2, 3, 4, 5, 6, 7, 8, 9,10,11,12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,  29,  30]*/
    /*To:*/
    /* 0*/
    [0, 2, 6, 10, 15, 21, 28, 36, 45, 56, 68, 82, 98, 115, 136, 159, 185, 215, 248, 286, 328, 376, 430, 490, 558, 634, 720, 815, 922, 1041, 1175], /* 1*/
    [0, 0, 2, 6, 11, 17, 23, 31, 39, 49, 61, 74, 89, 106, 126, 148, 173, 202, 234, 270, 312, 358, 410, 469, 534, 608, 691, 784, 888, 1005, 1135], /* 2*/
    [0, 0, 0, 2, 7, 12, 18, 25, 33, 43, 54, 66, 81, 97, 116, 137, 161, 189, 220, 255, 295, 340, 390, 447, 511, 583, 663, 754, 855, 968, 1095], /* 3*/
    [0, 0, 0, 0, 3, 7, 13, 20, 27, 36, 47, 59, 72, 88, 106, 126, 149, 176, 206, 240, 278, 321, 370, 425, 487, 557, 635, 723, 821, 932, 1055], /* 4*/
    [0, 0, 0, 0, 0, 3, 8, 14, 21, 30, 40, 51, 64, 79, 96, 115, 137, 163, 192, 224, 261, 303, 350, 403, 463, 531, 607, 692, 788, 895, 1015], /* 5*/
    [0, 0, 0, 0, 0, 0, 3, 9, 15, 23, 32, 43, 55, 69, 86, 104, 126, 150, 177, 209, 244, 285, 330, 382, 440, 505, 579, 661, 754, 859, 976], /* 6*/
    [0, 0, 0, 0, 0, 0, 0, 3, 9, 17, 25, 35, 47, 60, 76, 93, 114, 137, 163, 193, 227, 266, 310, 360, 416, 479, 550, 631, 721, 822, 936], /* 7*/
    [0, 0, 0, 0, 0, 0, 0, 0, 3, 10, 18, 28, 38, 51, 66, 82, 102, 124, 149, 178, 211, 248, 290, 338, 392, 453, 522, 600, 687, 786, 896], /* 8*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 11, 20, 30, 42, 56, 72, 90, 111, 135, 162, 194, 230, 270, 316, 368, 427, 494, 569, 654, 749, 856], /* 9*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 12, 22, 33, 46, 61, 78, 98, 121, 147, 177, 211, 250, 294, 345, 401, 466, 538, 620, 713, 816], /*10*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 13, 23, 36, 50, 66, 85, 107, 132, 160, 193, 230, 273, 321, 376, 438, 508, 587, 676, 777], /*11*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 14, 26, 39, 54, 72, 92, 116, 143, 175, 210, 251, 297, 350, 409, 477, 553, 640, 737], /*12*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 16, 28, 42, 59, 78, 101, 127, 156, 190, 229, 273, 324, 381, 446, 520, 603, 697], /*13*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 17, 30, 46, 64, 85, 110, 138, 170, 207, 250, 298, 353, 415, 486, 567, 657], /*14*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 18, 33, 50, 70, 93, 120, 150, 186, 226, 272, 325, 385, 453, 530, 617], /*15*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 20, 36, 54, 76, 101, 130, 164, 202, 246, 297, 354, 419, 493, 578], /*16*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 22, 39, 59, 83, 110, 142, 178, 220, 268, 323, 386, 457, 538], /*17*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 24, 43, 65, 90, 120, 155, 195, 240, 292, 352, 420, 498], /*18*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 26, 46, 70, 98, 131, 169, 212, 262, 319, 384, 458], /*19*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 28, 50, 77, 107, 143, 184, 231, 285, 347, 418], /*20*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 30, 55, 84, 117, 156, 200, 252, 311, 379], /*21*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 33, 60, 91, 127, 170, 218, 274, 339], /*22*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 36, 65, 99, 139, 185, 238, 299], /*23*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 39, 71, 108, 151, 201, 259], /*24*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 43, 77, 118, 165, 219], /*25*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 47, 84, 128, 180], /*26*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 51, 92, 140], /*27*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 55, 100], /*28*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19, 60], /*29*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20], /*30*/
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
    const catsMin = [0, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 8, 8, 9, 10, 10, 11, 12, 13, 15, 16, 17, 19, 20];
    /*to break a building at level [i] by 1*/

    // returns the max possible level reduction towards minLevel within maxStep
    function requiredCatas(maxCata, currentLevel, minLevel, maxStep) {
        if (currentLevel <= minLevel || catsMin[currentLevel] > maxCata) {
            return 0;
            // No catapults needed if already at or below the minLevel or not enough of them
        }

        // Check if the maximum amount of building levels that need to be destroyed is smaller than maxStep and reduce maxStep accordingly if needed
        let maxDestroyed = (currentLevel - minLevel) < maxStep ? (currentLevel - minLevel) : maxStep;

        // Iterate top down through the cata steps until we find  the biggest cata step we can do with the amount of catas we have and within the maxStep
        for (let i = maxDestroyed; i > 0; i--) {

            // Gets the required catas to destroy "i" building levels
            const catasRequired = catsRequiredToBreak[currentLevel - i][currentLevel];

            // if we have enough catas in the village to destroy "i" building levels we return the amount of destroyed levels
            // otherwise we run the loop again decreasing the amount of destroyed building levels until we have enough catas
            // we should have enough catas for "i == 1" since we checked at the start
            if (maxCata >= catasRequired) {
                return i;
            }
        }

        return 0;
    }

    // Function to find troop combinations for a specific attack with consideration of dLastAttack
    function findTroopCombination(playerVillage, barbarianVillage, distance, minLevel, maxStep, spyAmount) {
        let combinations = [];
        let maxReduction = 0;
        let catapultsRequired = 0;

        // Get the required rams to reduce wall to 0
        const ramsReq = ramsRequired[barbarianVillage.wall];
        // Calculate the required axes for rams
        const axesRequired = Math.ceil(axesReq(barbarianVillage.wall));

        // If there is a wall and we either dont have enough axes or rams to reduce it to 0 we quit
        // We also quit if there are not enough spies
        if ((barbarianVillage.wall > 0 && (playerVillage.ram < ramsReq || playerVillage.axe < axesRequired)) || playerVillage.spy < spyAmount) {
            return combinations;
        }

        // Now if there is a wall we know that we can destroy it and so we do
        // Doing it this way and not sending any catapults in the ram attack might be a waste of a spy but it makes the code nicer to look at imo
        if (barbarianVillage.wall > 0) {
            // we set the wall to 0 and subtract used axes and rams and spies
            playerVillage.axe -= axesRequired;
            playerVillage.ram -= ramsReq;
            barbarianVillage.wall = 0;
            playerVillage.spy -= spyAmount;

            // TODO What does this do?
            barbarianVillage.dLastAttack = distance;

            // We add the Wall bash attack to our attack list
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

        // Now that the wall is 0 we can start destroying the building while considering maxStep
        // Run the loop while the building is above minLevel and the playerVillage has enough spies
        while (barbarianVillage.building > minLevel && playerVillage.spy >= spyAmount) {
            // Check how many building levels we can destroy in this attack 
            maxReduction = requiredCatas(playerVillage.catapult, barbarianVillage.building, minLevel, maxStep);
            // Check how many catapults we need to destroy those building levels
            catapultsRequired = catsRequiredToBreak[barbarianVillage.building - maxReduction][barbarianVillage.building];

            // If we can't destroy a building level we quit
            if (maxReduction == 0) {
                break;
            }

            // If we can destroy at least one building level we subtract used catapults and spies and we subtract the destroyed building level
            playerVillage.catapult -= catapultsRequired;
            barbarianVillage.building -= maxReduction;
            playerVillage.spy -= spyAmount;

            // Update dLastAttack for the barbarian village
            // TODO What does this do?
            barbarianVillage.dLastAttack = distance;

            // Add the attack to our attack list
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

        // Return all the attacks
        return combinations;
    }

    // Function to find troop combinations for all attacks with consideration of dLastAttack
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

    // Helper: Do farming calculations
    function doCalculations(farmingData) {

        // TODO Combine calculations
        console.log('Starting calculating Commands...');

        // maxDistance for attacks
        const maxDistance = localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_distance`);

        // minimum building level
        const minLevel = localStorage.getItem(`${scriptConfig.scriptData.prefix}_min_level`);

        // max amount of building levels to destroy
        const maxStep = localStorage.getItem(`${scriptConfig.scriptData.prefix}_max_step`);

        // amount of spys in a attack
        const spyAmount = localStorage.getItem(`${scriptConfig.scriptData.prefix}_spy`);

        if (DEBUG) {
            console.debug(`${scriptInfo()} troopData at calculation time:`, troopData);
            console.debug(`${scriptInfo()} farmingData at calculation time:`, farmingData);
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
            const htmlDoc = jQuery.parseHTML(response);
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

                // Collect possible buildings and troop types
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

                // Collect possible troop types
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
            console.error(`${scriptInfo()} Error:`, error);
        }
        );

        return troopsForGroup;
    }

    // Helper: einzelne Berichte-Listen-Seite nach Report-Links durchsuchen
    // (gleicher Selektor wie zuvor, jetzt auf per AJAX geladenes HTML statt
    // auf das Live-DOM angewendet - Voraussetzung dafür, dass das Script vom
    // Versammlungsplatz aus laufen kann, wo #report_list gar nicht existiert).
    function extractReportRowLinks(htmlDoc) {
        const links = [];
        jQuery(htmlDoc)
            .find('#report_list tbody tr')
            .each(function () {
                try {
                    const reportUrl = jQuery(this).find('.report-link').attr('href');
                    if (typeof reportUrl !== 'undefined' && reportUrl !== '') {
                        links.push(reportUrl);
                    }
                } catch (e) {
                    // einzelne kaputte Zeile überspringen, nicht den ganzen Abruf abbrechen
                    console.warn(`${scriptInfo()} Report-Zeile übersprungen (unerwartete Struktur):`, e);
                }
            });
        return links;
    }

    // Helper: Link zur nächsten Berichte-Listen-Seite finden. Es wird nicht
    // von einem festen Parameternamen/Schrittweite ausgegangen (die genaue
    // Paginierungs-Struktur der Berichte-Liste ist nicht mit Sicherheit
    // bekannt) - stattdessen wird unter allen Links, die "mode=attack"
    // enthalten aber kein einzelner Berichts-Link sind (kein "view="-Parameter),
    // derjenige mit dem kleinsten numerischen Query-Parameter-Wert gesucht,
    // der größer ist als der entsprechende Wert der aktuellen Seite.
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

    // Lädt die Berichte-Liste (Angriffsberichte) seitenweise per AJAX, egal
    // von welchem Screen aus das Script läuft - Voraussetzung dafür, dass es
    // vom Versammlungsplatz statt von der Berichte-Übersicht aus gestartet
    // werden kann. Folgt der jeweils "nächsten Seite" Schritt für Schritt
    // (statt alle Seiten-URLs im Voraus zu berechnen), da unklar ist, ob die
    // Paginierung über einen linearen Seitenindex oder einen Zeilen-Offset
    // läuft.
    async function fetchReportListPages(maxReportPagesToFetch) {
        const reportUrls = [];
        let debugInfo = '';
        let currentUrl = game_data.link_base_pure + 'report&mode=attack';
        let pageCount = 0;

        while (currentUrl && pageCount < maxReportPagesToFetch) {
            let html;
            try {
                html = await jQuery.get(currentUrl);
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('Error fetching report list page!'));
                console.error(`${scriptInfo()} Error:`, error);
                debugInfo = `Fehler beim Laden von Berichte-Seite ${pageCount + 1}:\n\n${
                    (error && (error.statusText || error.message)) || String(error)
                }`;
                break;
            }

            // DOMParser statt jQuery.parseHTML(): liefert ein echtes Document,
            // in dem #report_list ein Nachfahre von <body> ist. Mit
            // jQuery.parseHTML() landet #report_list dagegen oft als
            // Top-Level-Element im Ergebnis-Array selbst, wodurch der
            // zusammengesetzte Selektor "#report_list tbody tr" nichts findet
            // (die eigene Scope-Wurzel zählt bei querySelectorAll nicht als
            // Vorfahre ihrer selbst).
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(html, 'text/html');
            const rowLinks = extractReportRowLinks(htmlDoc);
            reportUrls.push(...rowLinks);
            pageCount++;

            if (pageCount === 1 && rowLinks.length === 0) {
                const rawSample = typeof html === 'string' ? html : '';
                debugInfo = `0 Report-Links auf der ersten Berichte-Seite gefunden.\n\nBeispiel-Inhalt (bitte zurückmelden):\n${rawSample.slice(
                    0,
                    2000
                )}`;
            }

            currentUrl = findNextReportPageUrl(htmlDoc, currentUrl);
        }

        if (reportUrls.length === 0 && !debugInfo) {
            debugInfo = `0 Berichte über ${pageCount} Seite(n) gefunden.`;
        }

        return { reportUrls, debugInfo };
    }
});
