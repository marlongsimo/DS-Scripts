/*
 * Script Name: Barbs Finder
 * Version: v2.0.2
 * Last Updated: 2025-08-15
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: t13981993
 * Approved Date: 2020-05-27
 * Mod: JawJaw
 * Modified by: Anabol
 */

/* Copyright (c) RedAlert
By uploading a user-generated mod (script) for use with Tribal Wars, you grant InnoGames a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, reproduce, distribute, publicly display, modify, and create derivative works of the mod. This license permits InnoGames to incorporate the mod into any aspect of the game and its related services, including promotional and commercial endeavors, without any requirement for compensation or attribution to you. InnoGames is entitled but not obligated to name you when exercising its rights. You represent and warrant that you have the legal right to grant this license and that the mod does not infringe upon any third-party rights. You are - with the exception of claims of infringement by third parties - not liable for any usage of the mod by InnoGames. German law applies.
*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'barbsFinder',
        name: 'Barbs Finder',
        version: 'v2.0.2',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/barb-finder-with-filtering.285289/',
    },
    translations: {
        en_DK: {
            'Barbs Finder': 'Barbs Finder',
            'Min Points:': 'Min Points:',
            'Max Points:': 'Max Points:',
            'Radius:': 'Radius:',
            'Barbs found:': 'Barbs found:',
            'Coordinates:': 'Coordinates:',
            'Error while fetching "village.txt"!':
                'Error while fetching "village.txt"!',
            Coords: 'Coords',
            Points: 'Points',
            'Dist.': 'Dist.',
            Attack: 'Attack',
            Filter: 'Filter',
            Reset: 'Reset',
            'No barbarian villages found!': 'No barbarian villages found!',
            'Current Village:': 'Current Village:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Help',
            'There was an error!': 'There was an error!',
        },
        sk_SK: {
            'Barbs Finder': 'HÄ¾adaÄ barbariek',
            'Min Points:': 'Min bodov:',
            'Max Points:': 'Max bodov:',
            'Radius:': 'VzdialenosÅ¥:',
            'Barbs found:': 'NÃ¡jdenÃ© barbarky:',
            'Coordinates:': 'SÃºradnice:',
            'Error while fetching "village.txt"!':
                'Chyba pri naÄÃ­tanÃ­ "village.txt"!',
            Coords: 'SÃºradnice',
            Points: 'Body',
            'Dist.': 'Vzdial.',
            Attack: 'Ãštok',
            Filter: 'Filter',
            Reset: 'Reset',
            'No barbarian villages found!':
                'Neboli nÃ¡jdenÃ© Å¾iadne dediny barbarov!',
            'Current Village:': 'SÃºÄasnÃ¡ dedina:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Pomoc',
            'There was an error!': 'There was an error!',
        },
        fr_FR: {
            'Barbs Finder': 'Recherche de Barbares',
            'Min Points:': 'Points Min.:',
            'Max Points:': 'Points Max.:',
            'Radius:': 'Radius:',
            'Barbs found:': 'Barbs found:',
            'Coordinates:': 'Coordinates:',
            'Error while fetching "village.txt"!':
                'Error while fetching "village.txt"!',
            Coords: 'Coords',
            Points: 'Points',
            'Dist.': 'Dist.',
            Attack: 'Attaquer',
            Filter: 'Filtrer',
            Reset: 'RÃ©initialiser',
            'No barbarian villages found!': 'No barbarian villages found!',
            'Current Village:': 'Village Actuel:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Help',
            'There was an error!': 'There was an error!',
        },
        pt_PT: {
            'Barbs Finder': 'Procurador de BÃ¡rbaras',
            'Min Points:': 'Pontos mÃ­nimos:',
            'Max Points:': 'Pontos mÃ¡ximos:',
            'Radius:': 'Raio:',
            'Barbs found:': 'BÃ¡rbaras encontradas:',
            'Coordinates:': 'Coordenadas:',
            'Error while fetching "village.txt"!':
                'Erro ao procurar "village.txt"!',
            Coords: 'Coords',
            Points: 'Pontos',
            'Dist.': 'Dist.',
            Attack: 'Attack',
            Filter: 'Filtro',
            Reset: 'Reset',
            'No barbarian villages found!': 'NÃ£o foram encontradas bÃ¡rbaras!',
            'Current Village:': 'Aldeia Atual:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Ajuda',
            'There was an error!': 'There was an error!',
        },
        pt_BR: {
            'Barbs Finder': 'Procurador de BÃ¡rbaras',
            'Min Points:': 'Pontos mÃ­nimos:',
            'Max Points:': 'Pontos mÃ¡ximos:',
            'Radius:': 'Campo:',
            'Barbs found:': 'BÃ¡rbaras encontradas:',
            'Coordinates:': 'Coordenadas:',
            'Error while fetching "village.txt"!':
                'Erro ao procurar "village.txt"!',
            Coords: 'Coords',
            Points: 'Pontos',
            'Dist.': 'Dist.',
            Attack: 'Attack',
            Filter: 'Filtro',
            Reset: 'Reset',
            'No barbarian villages found!': 'NÃ£o foram encontradas bÃ¡rbaras!',
            'Current Village:': 'Aldeia Atual:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Ajuda',
            'There was an error!': 'There was an error!',
        },
        hu_HU: {
            'Barbs Finder': 'Barbi keresÅ'',
            'Min Points:': 'Min pontszÃ¡m:',
            'Max Points:': 'Max pontszÃ¡m:',
            'Radius:': 'HatÃ³kÃ¶r:',
            'Barbs found:': 'MegtalÃ¡lt barbik:',
            'Coordinates:': 'KoordinÃ¡tÃ¡k:',
            'Error while fetching "village.txt"!':
                'Hiba a "village.txt" beolvasÃ¡sa sorÃ¡n!',
            Coords: 'KoordinÃ¡tÃ¡k',
            Points: 'PontszÃ¡m',
            'Dist.': 'TÃ¡volsÃ¡g',
            Attack: 'TÃ¡madÃ¡s',
            Filter: 'SzÅ±rÃ©s',
            Reset: 'Reset',
            'No barbarian villages found!': 'Nem talÃ¡ltam barbit!',
            'Current Village:': 'Jelenlegi falu:',
            'Sequential Scout Script:': 'Teljes script a kikÃ©mlelÃ©shez:',
            'Sequential Katta Script:': 'Teljes script a katapulthoz:',
            Help: 'SegÃ­tsÃ©g',
            'There was an error!': 'There was an error!',
        },
        hr_HR: {
            'Barbs Finder': 'Barbari Koordinati',
            'Min Points:': 'Minimalno Poena:',
            'Max Points:': 'Maksimalno Poena:',
            'Radius:': 'Radius:',
            'Barbs found:': 'Barbara pronaÄ'eno:',
            'Coordinates:': 'Koordinati:',
            'Error while fetching "village.txt"!':
                'GreÅ¡ka u dohvaÄ‡anju podataka "village.txt"!',
            Coords: 'Koordinati',
            Points: 'Poeni',
            'Dist.': 'Distanca.',
            Attack: 'Napad',
            Filter: 'Filter',
            Reset: 'Reset',
            'No barbarian villages found!': 'Nisu pronaÄ'ena barbarska sela!',
            'Current Village:': 'Trenutno Selo:',
            'Sequential Scout Script:': 'Sekvencijalna izviÄ'aÄka skripta:',
            'Sequential Katta Script:': 'Sekvencijalna katapult skripta:',
            Help: 'PomoÄ‡',
            'There was an error!': 'There was an error!',
        },
        pl_PL: {
            'Barbs Finder': 'Znajdz wioski opuszczone',
            'Min Points:': 'Minimalna iloÅ›Ä‡ punktÃ³w:',
            'Max Points:': 'Maksymalna iloÅ›Ä‡ punktÃ³w:',
            'Radius:': 'PromieÅ„:',
            'Barbs found:': 'Znaleziono wiosek:',
            'Coordinates:': 'Kordynaty:',
            'Error while fetching "village.txt"!':
                'BÅ‚Ä…d podczas wyszukiwania plikuâ€ž village.txt â€!',
            Coords: 'Koordy',
            Points: 'Punkty',
            'Dist.': 'OdlegÅ‚oÅ›Ä‡',
            Attack: 'Atak',
            Filter: 'ZnajdÅº',
            Reset: 'Reset',
            'No barbarian villages found!':
                'Nie znaleziono wiosek barbarzyÅ„skich',
            'Current Village:': 'Obecna wioska:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'Pomoc',
            'There was an error!': 'There was an error!',
        },
        sv_SE: {
            'Barbs Finder': 'Hitta Barbarby',
            'Min Points:': 'Min PoÃ¤ng:',
            'Max Points:': 'Max PoÃ¤ng:',
            'Radius:': 'Radius:',
            'Barbs found:': 'Barbarby hittade:',
            'Coordinates:': 'Koordinater:',
            'Error while fetching "village.txt"!':
                'Fel vid hÃ¤mtning av "village.txtâ€!',
            Coords: 'Kords',
            Points: 'PoÃ¤ng',
            'Dist.': 'AvstÃ¥nd',
            Attack: 'Attackera',
            Filter: 'Filter',
            Reset: 'Ã…terstÃ¤ll',
            'No barbarian villages found!': 'Inga barbarbyar hittade!',
            'Current Village:': 'Nuvarande by:',
            'Sequential Scout Script:': 'Sequential Scout Script:',
            'Sequential Katta Script:': 'Sequential Katta Script:',
            Help: 'HjÃ¤lp',
            'There was an error!': 'There was an error!',
        },
        tr_TR: {
            'Barbs Finder': 'Barbar Bulucu',
            'Min Points:': 'Minimum Puan:',
            'Max Points:': 'Maksimum Puan:',
            'Radius:': 'Alan:',
            'Barbs found:': 'Bulunan barbarlar:',
            'Coordinates:': 'Koordinatlar:',
            'Error while fetching "village.txt"!':
                'Arama hatasÄ± oluÅŸtu "village.txt"!',
            Coords: 'Koordinatlar',
            Points: 'Puanlar',
            'Dist.': 'UzaklÄ±k',
            Attack: 'SaldÄ±r',
            Filter: 'Filtre',
            Reset: 'Reset',
            'No barbarian villages found!': 'Barbar bulunamadÄ±!',
            'Current Village:': 'GeÃ§erli KÃ¶y',
            'Sequential Scout Script:': 'SÄ±ralÄ± Casus Scripti',
            'Sequential Katta Script:': 'SÄ±ralÄ± Katapult Scripti',
            Help: 'YardÄ±m',
            'There was an error!': 'There was an error!',
        },
        cs_CZ: {
            'Barbs Finder': 'Barbs Finder',
            'Min Points:': 'Min body:',
            'Max Points:': 'Max body:',
            'Radius:': 'Radius:',
            'Barbs found:': 'NalezenÃ© barbarskÃ© vesnice:',
            'Coordinates:': 'SouÅ™adnice:',
            'Error while fetching "village.txt"!':
                'Error while fetching "village.txt"!',
            Coords: 'SouÅ™adnice',
            Points: 'Body',
            'Dist.': 'VzdÃ¡lenost',
            Attack: 'Ãštok',
            Filter: 'Filter',
            Reset: 'Reset',
            'No barbarian villages found!':
                'Å½Ã¡dnÃ© barbarskÃ© vesnice nenalezeny!',
            'Current Village:': 'AktuÃ¡lnÃ­ vesnice:',
            'Sequential Scout Script:': 'Skript na Å¡pehy:',
            'Sequential Katta Script:': 'Skript na katapulty:',
            Help: 'Pomoc',
            'There was an error!': 'There was an error!',
        },
        de_DE: {
            'Barbs Finder': 'Barbarendörfer Finder',
            'Min Points:': 'Min. Punkte:',
            'Max Points:': 'Max. Punkte:',
            'Radius:': 'Radius:',
            'Barbs found:': 'Gefundene Barbarendörfer:',
            'Coordinates:': 'Koordinaten:',
            'Error while fetching "village.txt"!':
                'Fehler beim Laden von "village.txt"!',
            Coords: 'Koords',
            Points: 'Punkte',
            'Dist.': 'Entf.',
            Attack: 'Angriff',
            Filter: 'Filtern',
            Reset: 'Zurücksetzen',
            'No barbarian villages found!': 'Keine Barbarendörfer gefunden!',
            'Current Village:': 'Aktuelles Dorf:',
            'Sequential Scout Script:': 'Sequenzielles Späher-Script:',
            'Sequential Katta Script:': 'Sequenzielles Katapult-Script:',
            Help: 'Hilfe',
            'There was an error!': 'Es ist ein Fehler aufgetreten!',
        },
    },
    allowedMarkets: [],
    allowedScreens: [],
    allowedModes: [],
    isDebug: DEBUG,
    enableCountApi: true,
};

window.twSDK = {
    // variables
    scriptData: {},
    translations: {},
    allowedMarkets: [],
    allowedScreens: [],
    allowedModes: [],
    enableCountApi: true,
    isDebug: false,
    isMobile: jQuery('#mobileHeader').length > 0,
    delayBetweenRequests: 200,
    // helper variables
    market: game_data.market,
    units: game_data.units,
    village: game_data.village,
    buildings: game_data.village.buildings,
    sitterId: game_data.player.sitter > 0 ? `&t=${game_data.player.id}` : '',
    coordsRegex: /\d{1,3}\|\d{1,3}/g,
    dateTimeMatch:
        /(?:[A-Z][a-z]{2}\s+\d{1,2},\s*\d{0,4}\s+|today\s+at\s+|tomorrow\s+at\s+)\d{1,2}:\d{2}:\d{2}:?\.?\d{0,3}/,
    worldInfoInterface: '/interface.php?func=get_config',
    unitInfoInterface: '/interface.php?func=get_unit_info',
    buildingInfoInterface: '/interface.php?func=get_building_info',
    worldDataVillages: '/map/village.txt',
    worldDataPlayers: '/map/player.txt',
    worldDataTribes: '/map/ally.txt',
    worldDataConquests: '/map/conquer_extended.txt',
    // game constants
    buildingsList: [
        'main', 'barracks', 'stable', 'garage', 'church', 'church_f',
        'watchtower', 'snob', 'smith', 'place', 'statue', 'market',
        'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall',
    ],
    buildingPoints: {
        main: [10,2,2,3,4,4,5,6,7,9,10,12,15,18,21,26,31,37,44,53,64,77,92,110,133,159,191,229,274,330],
        barracks: [16,3,4,5,5,7,8,9,12,14,16,20,24,28,34,42,49,59,71,85,102,123,147,177,212],
        stable: [20,4,5,6,6,9,10,12,14,17,21,25,29,36,43,51,62,74,88,107],
        garage: [24,5,6,6,9,10,12,14,17,21,25,29,36,43,51],
        chuch: [10,2,2],
        church_f: [10],
        watchtower: [42,8,10,13,14,18,20,25,31,36,43,52,62,75,90,108,130,155,186,224],
        snob: [512],
        smith: [19,4,4,6,6,8,10,11,14,16,20,23,28,34,41,49,58,71,84,101],
        place: [0],
        statue: [24],
        market: [10,2,2,3,4,4,5,6,7,9,10,12,15,18,21,26,31,37,44,53,64,77,92,110,133],
        wood: [6,1,2,1,2,3,3,3,5,5,6,8,8,11,13,15,19,22,27,32,38,46,55,66,80,95,115,137,165,198],
        stone: [6,1,2,1,2,3,3,3,5,5,6,8,8,11,13,15,19,22,27,32,38,46,55,66,80,95,115,137,165,198],
        iron: [6,1,2,1,2,3,3,3,5,5,6,8,8,11,13,15,19,22,27,32,38,46,55,66,80,95,115,137,165,198],
        farm: [5,1,1,2,1,2,3,3,3,5,5,6,8,8,11,13,15,19,22,27,32,38,46,55,66,80,95,115,137,165],
        storage: [6,1,2,1,2,3,3,3,5,5,6,8,8,11,13,15,19,22,27,32,38,46,55,66,80,95,115,137,165,198],
        hide: [5,1,1,2,1,2,3,3,3,5],
        wall: [8,2,2,2,3,3,4,5,5,7,9,9,12,15,17,20,25,29,36,43],
    },
    unitsFarmSpace: {
        spear:1, sword:1, axe:1, archer:1, spy:2, light:4,
        marcher:5, heavy:6, ram:5, catapult:8, knight:10, snob:100,
    },
    resPerHour: {
        0:2,1:30,2:35,3:41,4:47,5:55,6:64,7:74,8:86,9:100,10:117,
        11:136,12:158,13:184,14:214,15:249,16:289,17:337,18:391,19:455,
        20:530,21:616,22:717,23:833,24:969,25:1127,26:1311,27:1525,28:1774,29:2063,30:2400,
    },
    watchtowerLevels: [1.1,1.3,1.5,1.7,2,2.3,2.6,3,3.4,3.9,4.4,5.1,5.8,6.7,7.6,8.7,10,11.5,13.1,15],

    _initDebug: function () {
        const scriptInfo = this.scriptInfo();
        console.debug(`${scriptInfo} It works!`);
        console.debug(`${scriptInfo} HELP:`, this.scriptData.helpLink);
        if (this.isDebug) {
            console.debug(`${scriptInfo} Market:`, game_data.market);
            console.debug(`${scriptInfo} World:`, game_data.world);
            console.debug(`${scriptInfo} Screen:`, game_data.screen);
            console.debug(`${scriptInfo} Game Version:`, game_data.majorVersion);
            console.debug(`${scriptInfo} Game Build:`, game_data.version);
            console.debug(`${scriptInfo} Locale:`, game_data.locale);
            console.debug(`${scriptInfo} PA:`, game_data.features.Premium.active);
            console.debug(`${scriptInfo} LA:`, game_data.features.FarmAssistent.active);
            console.debug(`${scriptInfo} AM:`, game_data.features.AccountManager.active);
        }
    },

    addGlobalStyle: function () {
        return `
            .ra-table-container { overflow-y: auto; overflow-x: hidden; height: auto; max-height: 400px; }
            .ra-table th { font-size: 14px; }
            .ra-table th label { margin: 0; padding: 0; }
            .ra-table th, .ra-table td { padding: 5px; text-align: center; }
            .ra-table td a { word-break: break-all; }
            .ra-table a:focus { color: blue; }
            .ra-table a.btn:focus { color: #fff; }
            .ra-table tr:nth-of-type(2n) td { background-color: #f0e2be }
            .ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }
            .ra-table-v2 th, .ra-table-v2 td { text-align: left; }
            .ra-table-v3 { border: 2px solid #bd9c5a; }
            .ra-table-v3 th, .ra-table-v3 td { border-collapse: separate; border: 1px solid #bd9c5a; text-align: left; }
            .ra-textarea { width: 100%; height: 80px; resize: none; }
            .ra-popup-content { width: 360px; }
            .ra-popup-content * { box-sizing: border-box; }
            .ra-popup-content input[type="text"] { padding: 3px; width: 100%; }
            .ra-popup-content .btn-confirm-yes { padding: 3px !important; }
            .ra-popup-content label { display: block; margin-bottom: 5px; font-weight: 600; }
            .ra-popup-content > div { margin-bottom: 15px; }
            .ra-popup-content > div:last-child { margin-bottom: 0 !important; }
            .ra-popup-content textarea { width: 100%; height: 100px; resize: none; }
            .ra-details { display: block; margin-bottom: 8px; border: 1px solid #603000; padding: 8px; border-radius: 4px; }
            .ra-details summary { font-weight: 600; cursor: pointer; }
            .ra-details p { margin: 10px 0 0 0; padding: 0; }
            .ra-pa5 { padding: 5px !important; }
            .ra-mt15 { margin-top: 15px !important; }
            .ra-mb10 { margin-bottom: 10px !important; }
            .ra-mb15 { margin-bottom: 15px !important; }
            .ra-tal { text-align: left !important; }
            .ra-tac { text-align: center !important; }
            .ra-tar { text-align: right !important; }
            @media (max-width: 480px) {
                .ra-fixed-widget { position: relative !important; top: 0; left: 0; display: block; width: auto; height: auto; z-index: 1; }
                .ra-box-widget { position: relative; display: block; box-sizing: border-box; width: 97%; height: auto; margin: 10px auto; }
                .ra-table { border-collapse: collapse !important; }
                .custom-close-button { display: none; }
                .ra-fixed-widget h3 { margin-bottom: 15px; }
                .ra-popup-content { width: 100%; }
            }
        `;
    },
    addScriptToQuickbar: function (name, script, callback) {
        let scriptData = `hotkey=&name=${name}&href=${encodeURI(script)}`;
        let action = '/game.php?screen=settings&mode=quickbar_edit&action=quickbar_edit&';
        jQuery.ajax({
            url: action, type: 'POST',
            data: scriptData + `&h=${csrf_token}`,
            success: function () { if (typeof callback === 'function') { callback(); } },
        });
    },
    arraysIntersection: function () {
        var result = [];
        var lists;
        if (arguments.length === 1) { lists = arguments[0]; } else { lists = arguments; }
        for (var i = 0; i < lists.length; i++) {
            var currentList = lists[i];
            for (var y = 0; y < currentList.length; y++) {
                var currentValue = currentList[y];
                if (result.indexOf(currentValue) === -1) {
                    var existsInAll = true;
                    for (var x = 0; x < lists.length; x++) {
                        if (lists[x].indexOf(currentValue) === -1) { existsInAll = false; break; }
                    }
                    if (existsInAll) { result.push(currentValue); }
                }
            }
        }
        return result;
    },
    buildUnitsPicker: function (selectedUnits = [], unitsToIgnore, type = 'checkbox') {
        let unitsTable = ``;
        let thUnits = ``;
        let tableRow = ``;
        game_data.units.forEach((unit) => {
            if (!unitsToIgnore.includes(unit)) {
                let checked = '';
                if (selectedUnits.includes(unit)) { checked = `checked`; }
                thUnits += `<th class="ra-tac"><label for="unit_${unit}"><img src="/graphic/unit/unit_${unit}.png"></label></th>`;
                tableRow += `<td class="ra-tac"><input name="ra_chosen_units" type="${type}" ${checked} id="unit_${unit}" class="ra-unit-selector" value="${unit}" /></td>`;
            }
        });
        unitsTable = `<table class="ra-table ra-table-v2" width="100%" id="raUnitSelector"><thead><tr>${thUnits}</tr></thead><tbody><tr>${tableRow}</tr></tbody></table>`;
        return unitsTable;
    },
    calculateCoinsNeededForNthNoble: function (noble) { return (noble * noble + noble) / 2; },
    calculateDistanceFromCurrentVillage: function (coord) {
        const x1 = game_data.village.x;
        const y1 = game_data.village.y;
        const [x2, y2] = coord.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calculateDistance: function (from, to) {
        const [x1, y1] = from.split('|');
        const [x2, y2] = to.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calculatePercentages: function (amount, total) {
        if (amount === undefined) amount = 0;
        return parseFloat((amount / total) * 100).toFixed(2);
    },
    calculateTimesByDistance: async function (distance) {
        const _self = this;
        const times = [];
        const travelTimes = [];
        const unitInfo = await _self.getWorldUnitInfo();
        const worldConfig = await _self.getWorldConfig();
        for (let [key, value] of Object.entries(unitInfo.config)) { times.push(value.speed); }
        const { speed, unit_speed } = worldConfig.config;
        times.forEach((time) => {
            let travelTime = Math.round((distance * time * 60) / speed / unit_speed);
            travelTime = _self.secondsToHms(travelTime);
            travelTimes.push(travelTime);
        });
        return travelTimes;
    },
    checkValidLocation: function (type) {
        switch (type) {
            case 'screen': return this.allowedScreens.includes(this.getParameterByName('screen'));
            case 'mode': return this.allowedModes.includes(this.getParameterByName('mode'));
            default: return false;
        }
    },
    checkValidMarket: function () {
        if (this.market === 'yy') return true;
        return this.allowedMarkets.includes(this.market);
    },
    cleanString: function (string) {
        try { return decodeURIComponent(string).replace(/\+/g, ' '); }
        catch (error) { console.error(error, string); return string; }
    },
    copyToClipboard: function (string) { navigator.clipboard.writeText(string); },
    createUUID: function () { return crypto.randomUUID(); },
    csvToArray: function (strData, strDelimiter = ',') {
        var objPattern = new RegExp('(\\' + strDelimiter + '|\\r?\\n|\\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^"\\' + strDelimiter + '\\r\\n]*))', 'gi');
        var arrData = [[]];
        var arrMatches = null;
        while ((arrMatches = objPattern.exec(strData))) {
            var strMatchedDelimiter = arrMatches[1];
            if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) { arrData.push([]); }
            var strMatchedValue;
            if (arrMatches[2]) { strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"'); }
            else { strMatchedValue = arrMatches[3]; }
            arrData[arrData.length - 1].push(strMatchedValue);
        }
        return arrData;
    },
    formatAsNumber: function (number) { return parseInt(number).toLocaleString('de'); },
    formatDateTime: function (dateTime) {
        dateTime = new Date(dateTime);
        return this.zeroPad(dateTime.getDate(), 2) + '/' + this.zeroPad(dateTime.getMonth() + 1, 2) + '/' + dateTime.getFullYear() + ' ' + this.zeroPad(dateTime.getHours(), 2) + ':' + this.zeroPad(dateTime.getMinutes(), 2) + ':' + this.zeroPad(dateTime.getSeconds(), 2);
    },
    frequencyCounter: function (array) {
        return array.reduce(function (acc, curr) {
            if (typeof acc[curr] == 'undefined') { acc[curr] = 1; } else { acc[curr] += 1; }
            return acc;
        }, {});
    },
    generateRandomCoordinates: function () {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        return `${x}|${y}`;
    },
    getAll: function (urls, onLoad, onDone, onError) {
        var numDone = 0;
        var lastRequestTime = 0;
        var minWaitTime = this.delayBetweenRequests;
        loadNext();
        function loadNext() {
            if (numDone == urls.length) { onDone(); return; }
            let now = Date.now();
            let timeElapsed = now - lastRequestTime;
            if (timeElapsed < minWaitTime) { setTimeout(loadNext, minWaitTime - timeElapsed); return; }
            lastRequestTime = now;
            jQuery.get(urls[numDone]).done((data) => {
                try { onLoad(numDone, data); ++numDone; loadNext(); }
                catch (e) { onError(e); }
            }).fail((xhr) => { onError(xhr); });
        }
    },
    getBuildingsInfo: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 365;
        const LAST_UPDATED_TIME = localStorage.getItem('buildings_info_last_updated') ?? 0;
        let buildingsInfo = [];
        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({ url: this.buildingInfoInterface });
                buildingsInfo = this.xml2json(jQuery(response));
                localStorage.setItem('buildings_info', JSON.stringify(buildingsInfo));
                localStorage.setItem('buildings_info_last_updated', Date.parse(new Date()));
            } else {
                buildingsInfo = JSON.parse(localStorage.getItem('buildings_info'));
            }
        } else {
            const response = await jQuery.ajax({ url: this.buildingInfoInterface });
            buildingsInfo = this.xml2json(jQuery(response));
            localStorage.setItem('buildings_info', JSON.stringify(buildingsInfo));
            localStorage.setItem('buildings_info_last_updated', Date.parse(new Date()));
        }
        return buildingsInfo;
    },
    getContinentByCoord: function (coord) {
        let [x, y] = Array.from(coord.split('|')).map((e) => parseInt(e));
        for (let i = 0; i < 1000; i += 100) {
            for (let j = 0; j < 1000; j += 100) {
                if (i >= x && x < i + 100 && j >= y && y < j + 100) {
                    return parseInt(y / 100) + '' + parseInt(x / 100);
                }
            }
        }
    },
    getContinentsFromCoordinates: function (coordinates) {
        let continents = [];
        coordinates.forEach((coord) => { continents.push(twSDK.getContinentByCoord(coord)); });
        return [...new Set(continents)];
    },
    getCoordFromString: function (string) {
        if (!string) return [];
        return string.match(this.coordsRegex)[0];
    },
    getGameFeatures: function () {
        const { Premium, FarmAssistent, AccountManager } = game_data.features;
        return { isPA: Premium.active, isLA: FarmAssistent.active, isAM: AccountManager.active };
    },
    getKeyByValue: function (object, value) { return Object.keys(object).find((key) => object[key] === value); },
    getParameterByName: function (name, url = window.location.href) { return new URL(url).searchParams.get(name); },
    getServerDateTimeObject: function () { return new Date(this.getServerDateTime()); },
    getServerDateTime: function () {
        const serverTime = jQuery('#serverTime').text();
        const serverDate = jQuery('#serverDate').text();
        const [day, month, year] = serverDate.split('/');
        return year + '-' + month + '-' + day + ' ' + serverTime;
    },
    getTravelTimeInSecond: function (distance, unitSpeed) {
        let travelTime = distance * unitSpeed * 60;
        if (travelTime % 1 > 0.5) { return (travelTime += 1); } else { return travelTime; }
    },
    getTribeMembersById: function (tribeIds, players) {
        const tribeMemberIds = [];
        players.forEach((player) => { if (tribeIds.includes(parseInt(player[2]))) { tribeMemberIds.push(parseInt(player[0])); } });
        return tribeMemberIds;
    },
    getVillageBuildings: function () {
        const buildings = game_data.village.buildings;
        const villageBuildings = [];
        for (let [key, value] of Object.entries(buildings)) { if (value > 0) { villageBuildings.push({ building: key, level: value }); } }
        return villageBuildings;
    },
    getWorldConfig: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 7;
        const LAST_UPDATED_TIME = localStorage.getItem('world_config_last_updated') ?? 0;
        let worldConfig = [];
        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({ url: this.worldInfoInterface });
                worldConfig = this.xml2json(jQuery(response));
                localStorage.setItem('world_config', JSON.stringify(worldConfig));
                localStorage.setItem('world_config_last_updated', Date.parse(new Date()));
            } else { worldConfig = JSON.parse(localStorage.getItem('world_config')); }
        } else {
            const response = await jQuery.ajax({ url: this.worldInfoInterface });
            worldConfig = this.xml2json(jQuery(response));
            localStorage.setItem('world_config', JSON.stringify(worldConfig));
            localStorage.setItem('world_config_last_updated', Date.parse(new Date()));
        }
        return worldConfig;
    },
    getWorldUnitInfo: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 7;
        const LAST_UPDATED_TIME = localStorage.getItem('units_info_last_updated') ?? 0;
        let unitInfo = [];
        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({ url: this.unitInfoInterface });
                unitInfo = this.xml2json(jQuery(response));
                localStorage.setItem('units_info', JSON.stringify(unitInfo));
                localStorage.setItem('units_info_last_updated', Date.parse(new Date()));
            } else { unitInfo = JSON.parse(localStorage.getItem('units_info')); }
        } else {
            const response = await jQuery.ajax({ url: this.unitInfoInterface });
            unitInfo = this.xml2json(jQuery(response));
            localStorage.setItem('units_info', JSON.stringify(unitInfo));
            localStorage.setItem('units_info_last_updated', Date.parse(new Date()));
        }
        return unitInfo;
    },
    groupArrayByProperty: function (array, property, filter) {
        return array.reduce(function (accumulator, object) {
            const key = object[property];
            if (!accumulator[key]) { accumulator[key] = []; }
            accumulator[key].push(object[filter]);
            return accumulator;
        }, {});
    },
    isArcherWorld: function () { return this.units.includes('archer'); },
    isChurchWorld: function () { return 'church' in this.village.buildings; },
    isPaladinWorld: function () { return this.units.includes('knight'); },
    isWatchTowerWorld: function () { return 'watchtower' in this.village.buildings; },
    loadJS: function (url, callback) {
        let scriptTag = document.createElement('script');
        scriptTag.src = url;
        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;
        document.body.appendChild(scriptTag);
    },
    redirectTo: function (location) { window.location.assign(game_data.link_base_pure + location); },
    removeDuplicateObjectsFromArray: function (array, prop) {
        return array.filter((obj, pos, arr) => { return arr.map((mapObj) => mapObj[prop]).indexOf(obj[prop]) === pos; });
    },
    renderBoxWidget: function (body, id, mainClass, customStyle) {
        const globalStyle = this.addGlobalStyle();
        const content = `
            <div class="${mainClass} ra-box-widget" id="${id}">
                <div class="${mainClass}-header">
                    <h3>${this.tt(this.scriptData.name)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${body}
                </div>
                <div class="${mainClass}-footer">
                    <small>
                        <strong>${this.tt(this.scriptData.name)} ${this.scriptData.version}</strong> -
                        <a href="${this.scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">${this.scriptData.author}</a> -
                        <a href="${this.scriptData.helpLink}" target="_blank" rel="noreferrer noopener">${this.tt('Help')}</a>
                    </small>
                </div>
            </div>
            <style>
                .${mainClass} { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
                .${mainClass} * { box-sizing: border-box; }
                .${mainClass} > div { padding: 10px; }
                .${mainClass} .btn-confirm-yes { padding: 3px; }
                .${mainClass}-header { display: flex; align-items: center; justify-content: space-between; background-color: #c1a264 !important; background-image: url(/graphic/screen/tableheader_bg3.png); background-repeat: repeat-x; }
                .${mainClass}-header h3 { margin: 0; padding: 0; line-height: 1; }
                .${mainClass}-body p { font-size: 14px; }
                .${mainClass}-body label { display: block; font-weight: 600; margin-bottom: 6px; }
                ${globalStyle}
                ${customStyle}
            </style>
        `;
        if (jQuery(`#${id}`).length < 1) {
            jQuery('#contentContainer').prepend(content);
            jQuery('#mobileContent').prepend(content);
        } else {
            jQuery(`.${mainClass}-body`).html(body);
        }
    },
    scriptInfo: function (scriptData = this.scriptData) { return `[${scriptData.name} ${scriptData.version}]`; },
    secondsToHms: function (timestamp) {
        const hours = Math.floor(timestamp / 60 / 60);
        const minutes = Math.floor(timestamp / 60) - hours * 60;
        const seconds = timestamp % 60;
        return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    },
    setUpdateProgress: function (elementToUpdate, valueToSet) { jQuery(elementToUpdate).text(valueToSet); },
    sortArrayOfObjectsByKey: function (array, key) { return array.sort((a, b) => b[key] - a[key]); },
    sumOfArrayItemValues: function (array) { return array.reduce((a, b) => a + b, 0); },
    randomItemPickerString: function (items, splitter = ' ') {
        const itemsArray = items.split(splitter);
        return itemsArray[Math.floor(Math.random() * itemsArray.length)];
    },
    randomItemPickerArray: function (items) { return items[Math.floor(Math.random() * items.length)]; },
    timeAgo: function (seconds) {
        var interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' Y';
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' M';
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' D';
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' H';
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' m';
        return Math.floor(seconds) + ' s';
    },
    tt: function (string) {
        if (this.translations[game_data.locale] !== undefined) { return this.translations[game_data.locale][string]; }
        else { return this.translations['en_DK'][string]; }
    },
    toggleUploadButtonStatus: function (elementToToggle) { jQuery(elementToToggle).attr('disabled', (i, v) => !v); },
    updateProgress: function (elementToUpate, itemsLength, index) { jQuery(elementToUpate).text(`${index}/${itemsLength}`); },
    updateProgressBar: function (index, total) {
        jQuery('#progress').css('width', `${((index + 1) / total) * 100}%`);
        jQuery('.count').text(`${index + 1}/${total}`);
        if (index + 1 == total) { jQuery('#progressbar').fadeOut(1000); }
    },
    xml2json: function ($xml) {
        let data = {};
        const _self = this;
        $.each($xml.children(), function (i) {
            let $this = $(this);
            if ($this.children().length > 0) { data[$this.prop('tagName')] = _self.xml2json($this); }
            else { data[$this.prop('tagName')] = $.trim($this.text()); }
        });
        return data;
    },
    worldDataAPI: async function (entity) {
        const TIME_INTERVAL = 60 * 60 * 1000;
        const LAST_UPDATED_TIME = localStorage.getItem(`${entity}_last_updated`);
        const allowedEntities = ['village', 'player', 'ally', 'conquer'];
        if (!allowedEntities.includes(entity)) { throw new Error(`Entity ${entity} does not exist!`); }

        const worldData = {};
        const dbConfig = {
            village: { dbName: 'villagesDb', dbTable: 'villages', key: 'villageId', url: twSDK.worldDataVillages },
            player: { dbName: 'playersDb', dbTable: 'players', key: 'playerId', url: twSDK.worldDataPlayers },
            ally: { dbName: 'tribesDb', dbTable: 'tribes', key: 'tribeId', url: twSDK.worldDataTribes },
            conquer: { dbName: 'conquerDb', dbTable: 'conquer', key: '', url: twSDK.worldDataConquests },
        };

        const fetchDataAndSave = async () => {
            const DATA_URL = dbConfig[entity].url;
            try {
                const response = await jQuery.ajax(DATA_URL);
                const data = twSDK.csvToArray(response);
                let responseData = [];
                switch (entity) {
                    case 'village':
                        responseData = data.filter(item => item[0] != '').map(item => ({ villageId: parseInt(item[0]), villageName: twSDK.cleanString(item[1]), villageX: item[2], villageY: item[3], playerId: parseInt(item[4]), villagePoints: parseInt(item[5]), villageType: parseInt(item[6]) }));
                        break;
                    case 'player':
                        responseData = data.filter(item => item[0] != '').map(item => ({ playerId: parseInt(item[0]), playerName: twSDK.cleanString(item[1]), tribeId: parseInt(item[2]), villages: parseInt(item[3]), points: parseInt(item[4]), rank: parseInt(item[5]) }));
                        break;
                    case 'ally':
                        responseData = data.filter(item => item[0] != '').map(item => ({ tribeId: parseInt(item[0]), tribeName: twSDK.cleanString(item[1]), tribeTag: twSDK.cleanString(item[2]), players: parseInt(item[3]), villages: parseInt(item[4]), points: parseInt(item[5]), allPoints: parseInt(item[6]), rank: parseInt(item[7]) }));
                        break;
                    case 'conquer':
                        responseData = data.filter(item => item[0] != '').map(item => ({ villageId: parseInt(item[0]), unixTimestamp: parseInt(item[1]), newPlayerId: parseInt(item[3]), oldTribeId: parseInt(item[4]), newTribeId: parseInt(item[5]), villagePoints: parseInt(item[6]) }));
                        break;
                    default: return [];
                }
                saveToIndexedDbStorage(dbConfig[entity].dbName, dbConfig[entity].dbTable, dbConfig[entity].key, responseData);
                localStorage.setItem(`${entity}_last_updated`, Date.parse(new Date()));
                return responseData;
            } catch (error) { throw Error(`Error fetching ${DATA_URL}`); }
        };

        async function saveToIndexedDbStorage(dbName, table, keyId, data) {
            const dbConnect = indexedDB.open(dbName);
            dbConnect.onupgradeneeded = function () {
                const db = dbConnect.result;
                if (keyId.length) { db.createObjectStore(table, { keyPath: keyId }); }
                else { db.createObjectStore(table, { autoIncrement: true }); }
            };
            dbConnect.onsuccess = function () {
                const db = dbConnect.result;
                const transaction = db.transaction(table, 'readwrite');
                const store = transaction.objectStore(table);
                store.clear();
                data.forEach((item) => { store.put(item); });
                UI.SuccessMessage('Database updated!');
            };
        }

        function getAllData(dbName, table) {
            return new Promise((resolve, reject) => {
                const dbConnect = indexedDB.open(dbName);
                dbConnect.onsuccess = () => {
                    const db = dbConnect.result;
                    const dbQuery = db.transaction(table, 'readwrite').objectStore(table).getAll();
                    dbQuery.onsuccess = (event) => { resolve(event.target.result); };
                    dbQuery.onerror = (event) => { reject(event.target.error); };
                };
                dbConnect.onerror = (event) => { reject(event.target.error); };
            });
        }

        function objectToArray(arrayOfObjects, entity) {
            switch (entity) {
                case 'village': return arrayOfObjects.map(item => [item.villageId, item.villageName, item.villageX, item.villageY, item.playerId, item.villagePoints, item.villageType]);
                case 'player': return arrayOfObjects.map(item => [item.playerId, item.playerName, item.tribeId, item.villages, item.points, item.rank]);
                case 'ally': return arrayOfObjects.map(item => [item.tribeId, item.tribeName, item.tribeTag, item.players, item.villages, item.points, item.allPoints, item.rank]);
                case 'conquer': return arrayOfObjects.map(item => [item.villageId, item.unixTimestamp, item.newPlayerId, item.newPlayerId, item.oldTribeId, item.newTribeId, item.villagePoints]);
                default: return [];
            }
        }

        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= parseInt(LAST_UPDATED_TIME) + TIME_INTERVAL) { worldData[entity] = await fetchDataAndSave(); }
            else { worldData[entity] = await getAllData(dbConfig[entity].dbName, dbConfig[entity].dbTable); }
        } else { worldData[entity] = await fetchDataAndSave(); }

        worldData[entity] = objectToArray(worldData[entity], entity);
        return worldData[entity];
    },
    zeroPad: function (num, count) {
        var numZeropad = num + '';
        while (numZeropad.length < count) { numZeropad = '0' + numZeropad; }
        return numZeropad;
    },
    init: async function (scriptConfig) {
        const { scriptData, translations, allowedMarkets, allowedScreens, allowedModes, isDebug, enableCountApi } = scriptConfig;
        this.scriptData = scriptData;
        this.translations = translations;
        this.allowedMarkets = allowedMarkets;
        this.allowedScreens = allowedScreens;
        this.allowedModes = allowedModes;
        this.enableCountApi = enableCountApi;
        this.isDebug = isDebug;
        twSDK._initDebug();
    },
};

(async function () {
    await twSDK.init(scriptConfig);
    const scriptInfo = twSDK.scriptInfo();

    const { villages } = await fetchWorldData();

    try {
        buildUI();
        handleFilterBarbs();
        handleResetFilters();
    } catch (error) {
        UI.ErrorMessage(twSDK.tt('There was an error!'));
        console.error(`${scriptInfo} Error:`, error);
    }

    function buildUI() {
        const content = `
            <div class="ra-grid ra-grid-4">
                <div class="ra-mb15">
                    <label for="raCurrentVillage" class="ra-label">${twSDK.tt('Current Village:')}</label>
                    <input type="text" id="raCurrentVillage" value="${game_data.village.coord}" class="ra-input">
                </div>
                <div class="ra-mb15">
                    <label for="radius" class="ra-label">${twSDK.tt('Radius:')}</label>
                    <select id="radius_choser" class="ra-input">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                        <option value="30">30</option>
                        <option value="35">35</option>
                        <option value="40">40</option>
                        <option value="45">45</option>
                        <option value="50" selected>50</option>
                        <option value="55">55</option>
                        <option value="60">60</option>
                        <option value="65">65</option>
                        <option value="70">70</option>
                        <option value="75">75</option>
                        <option value="80">80</option>
                        <option value="85">85</option>
                        <option value="90">90</option>
                        <option value="95">95</option>
                        <option value="100">100</option>
                        <option value="105">105</option>
                        <option value="110">110</option>
                        <option value="115">115</option>
                        <option value="120">120</option>
                        <option value="125">125</option>
                        <option value="130">130</option>
                        <option value="135">135</option>
                        <option value="140">140</option>
                        <option value="145">145</option>
                        <option value="150">150</option>
                        <option value="155">155</option>
                        <option value="160">160</option>
                        <option value="165">165</option>
                        <option value="170">170</option>
                        <option value="175">175</option>
                        <option value="180">180</option>
                        <option value="185">185</option>
                        <option value="190">190</option>
                        <option value="195">195</option>
                        <option value="200">200</option>
                        <option value="999">999</option>
                    </select>
                </div>
                <div class="ra-mb15">
                    <label for="minPoints" class="ra-label">${twSDK.tt('Min Points:')}</label>
                    <input type="text" id="minPoints" value="26" class="ra-input">
                </div>
                <div class="ra-mb15">
                    <label for="maxPoints" class="ra-label">${twSDK.tt('Max Points:')}</label>
                    <input type="text" id="maxPoints" value="12154" class="ra-input">
                </div>
            </div>
            <div class="ra-mb15">
                <a href="javascript:void(0);" id="btnFilterBarbs" class="btn btn-confirm-yes">
                    ${twSDK.tt('Filter')}
                </a>
                <a href="javascript:void(0);" id="btnResetFilters" class="btn btn-confirm-no">
                    ${twSDK.tt('Reset')}
                </a>
            </div>
            <div class="ra-mb15">
                <strong>${twSDK.tt('Barbs found:')}</strong>
                <span id="barbsCount">0</span>
            </div>
            <div class="ra-grid ra-grid-3">
                <div>
                    <label for="barbCoordsList" class="ra-label">${twSDK.tt('Coordinates:')}</label>
                    <textarea id="barbCoordsList" class="ra-textarea" readonly></textarea>
                </div>
                <div>
                    <label for="barbScoutScript" class="ra-label">${twSDK.tt('Sequential Scout Script:')}</label>
                    <textarea id="barbScoutScript" class="ra-textarea" readonly></textarea>
                </div>
                <div>
                    <label for="barbKattaScript" class="ra-label">${twSDK.tt('Sequential Katta Script:')}</label>
                    <textarea id="barbKattaScript" class="ra-textarea" readonly></textarea>
                </div>
            </div>
            <div id="barbariansTable" style="display:none;" class="ra-table-container ra-mt15"></div>
        `;

        const customStyle = `
            .ra-label { display: block; font-weight: 600; margin-bottom: 5px; }
            .ra-input { padding: 5px; width: 100%; display: block; line-height: 1; font-size: 14px; }
            .ra-grid { display: grid; gap: 15px; }
            .ra-grid-2 { grid-template-columns: 1fr 1fr; }
            .ra-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
            .ra-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
            .btn-already-sent { padding: 3px; }
            .already-sent-command { opacity: 0.6; }
        `;

        twSDK.renderBoxWidget(
            content,
            scriptConfig.scriptData.prefix,
            'ra-barbs-finder',
            customStyle
        );
    }

    function handleFilterBarbs() {
        jQuery('#btnFilterBarbs').on('click', function (e) {
            e.preventDefault();

            const currentVillage = $('#raCurrentVillage').val().trim();
            const minPoints = parseInt($('#minPoints').val().trim());
            const maxPoints = parseInt($('#maxPoints').val().trim());
            const radius = parseInt($('#radius_choser').val());

            const barbarians = villages.filter((village) => parseInt(village[4]) === 0);

            const filteredBarbs = barbarians.filter((barbarian) => {
                return parseInt(barbarian[5]) >= minPoints && parseInt(barbarian[5]) <= maxPoints;
            });

            const filteredByRadiusBarbs = filteredBarbs.filter((barbarian) => {
                let barbCoord = barbarian[2] + '|' + barbarian[3];
                let distance = twSDK.calculateDistance(currentVillage, barbCoord);
                return distance <= radius;
            });

            if (filteredByRadiusBarbs.length > 0) {
                let barbariansCoordsArray = filteredByRadiusBarbs.map((village) => village[2] + '|' + village[3]);
                let barbariansCount = barbariansCoordsArray.length;
                let barbariansCoordsList = barbariansCoordsArray.join(' ');

                // Sequential Scout Script
                let scoutScript = `javascript:coords='${barbariansCoordsList}';var doc=document;if(window.frames.length>0 && window.main!=null)doc=window.main.document;url=doc.URL;if(url.indexOf('screen=place')==-1)alert('Use the script in the rally point page!');coords=coords.split(' ');index=0;farmcookie=document.cookie.match('(^|;) ?farm=([^;]*)(;|$)');if(farmcookie!=null)index=parseInt(farmcookie[2]);if(index>=coords.length)alert('All villages were extracted, now start from the first!');if(index>=coords.length)index=0;coords=coords[index];coords=coords.split('|');index=index+1;cookie_date=new Date(2030,1,1);document.cookie ='farm='+index+';expires='+cookie_date.toGMTString();doc.forms[0].x.value=coords[0];doc.forms[0].y.value=coords[1];$('#place_target').find('input').val(coords[0]+'|'+coords[1]);doc.forms[0].spy.value=1;`;

                // Sequential Katta Script (4 axes + 2 catapults)
                let kattaScript = `javascript:coords='${barbariansCoordsList}';var doc=document;if(window.frames.length>0 && window.main!=null)doc=window.main.document;url=doc.URL;if(url.indexOf('screen=place')==-1)alert('Use the script in the rally point page!');coords=coords.split(' ');index=0;farmcookie=document.cookie.match('(^|;) ?farm=([^;]*)(;|$)');if(farmcookie!=null)index=parseInt(farmcookie[2]);if(index>=coords.length)alert('All villages were extracted, now start from the first!');if(index>=coords.length)index=0;coords=coords[index];coords=coords.split('|');index=index+1;cookie_date=new Date(2030,1,1);document.cookie ='farm='+index+';expires='+cookie_date.toGMTString();doc.forms[0].x.value=coords[0];doc.forms[0].y.value=coords[1];$('#place_target').find('input').val(coords[0]+'|'+coords[1]);doc.forms[0].axe.value=4;doc.forms[0].catapult.value=2;end();`;

                let tableContent = generateBarbariansTable(filteredByRadiusBarbs, currentVillage);

                jQuery('#barbsCount').text(barbariansCount);
                jQuery('#barbCoordsList').text(barbariansCoordsList);
                jQuery('#barbScoutScript').val(scoutScript);
                jQuery('#barbKattaScript').val(kattaScript);
                jQuery('#barbariansTable').show();
                jQuery('#barbariansTable').html(tableContent);

                jQuery('.btn-send-attack').on('click', function (e) {
                    jQuery(this).addClass('btn-confirm-yes btn-already-sent');
                    jQuery(this).parent().parent().addClass('already-sent-command');
                });
            } else {
                jQuery('#btnResetFilters').trigger('click');
                UI.InfoMessage(twSDK.tt('No barbarian villages found!'));
            }
        });
    }

    function handleResetFilters() {
        jQuery('#btnResetFilters').on('click', function (e) {
            e.preventDefault();

            jQuery('#raCurrentVillage').val(game_data.village.coord);
            jQuery('#minPoints').val(26);
            jQuery('#maxPoints').val(12154);
            jQuery('#radius_choser').val('20');
            jQuery('#barbsCount').text('0');
            jQuery('#barbCoordsList').text('');
            jQuery('#barbScoutScript').val('');
            jQuery('#barbKattaScript').val('');
            jQuery('#barbariansTable').hide();
            jQuery('#barbariansTable').html('');
        });
    }

    function generateBarbariansTable(barbs, currentVillage) {
        if (barbs.length < 1) return;

        let barbariansWithDistance = [];
        barbs.forEach((barb) => {
            let barbCoord = barb[2] + '|' + barb[3];
            let distance = twSDK.calculateDistance(currentVillage, barbCoord);
            barbariansWithDistance.push([...barb, distance]);
        });

        barbariansWithDistance.sort((a, b) => a[7] - b[7]);

        let tableRows = generateTableRows(barbariansWithDistance);

        return `
            <table class="vis overview_table ra-table" width="100%">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>K</th>
                        <th>${twSDK.tt('Coords')}</th>
                        <th>${twSDK.tt('Points')}</th>
                        <th>${twSDK.tt('Dist.')}</th>
                        <th>${twSDK.tt('Attack')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }

    function generateTableRows(barbs) {
        let renderTableRows = '';
        barbs.forEach((barb, index) => {
            index++;
            let continent = barb[3].charAt(0) + barb[2].charAt(0);
            renderTableRows += `
                <tr>
                    <td class="ra-tac">${index}</td>
                    <td class="ra-tac">${continent}</td>
                    <td class="ra-tac">
                        <a href="game.php?screen=info_village&id=${barb[0]}" target="_blank" rel="noopener noreferrer">
                            ${barb[2]}|${barb[3]}
                        </a>
                    </td>
                    <td>${twSDK.formatAsNumber(barb[5])}</td>
                    <td class="ra-tac">${barb[7].toFixed(2)}</td>
                    <td class="ra-tac">
                        <a href="/game.php?screen=place&target=${barb[0]}&spy=1" target="_blank" rel="noopener noreferrer" class="btn btn-send-attack">
                            ${twSDK.tt('Attack')}
                        </a>
                    </td>
                </tr>
            `;
        });
        return renderTableRows;
    }

    async function fetchWorldData() {
        try {
            const villages = await twSDK.worldDataAPI('village');
            return { villages };
        } catch (error) {
            UI.ErrorMessage(error);
            console.error(`${scriptInfo} Error:`, error);
        }
    }
})();
