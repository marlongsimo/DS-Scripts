/*
 * 🗂️ Gruppen-Tool (Bookmarklet-Version)
 * Ordnet eigene Dörfer anhand einer eingefügten Koordinatenliste einer
 * Dorfgruppe zu, optional nachdem die Zielgruppe vorher komplett geleert
 * wurde. Wird per Bookmarklet als <script> von
 * https://marlongsimo.github.io/DS-Scripts/scripts/gruppenTool.js
 * nachgeladen, siehe scripts/gruppen-tool.html für die Installation.
 */

ids = [];
groups = [];

// Gruppen laden (manuelle Gruppen)
$.get("/game.php?&screen=groups&mode=overview&ajax=load_group_menu&", function (data) {
    data.result.forEach(element => {
        if (element.group_id != 0 && element.type != "group_dynamic" && element.type != "separator") {
            groups.push({ "group_id": element.group_id, "group_name": element.name });
        }
    });
    // Sobald die Gruppen da sind, das Dialogfenster mit der Gruppenauswahl aufbauen
    buildDialog();
});

// Dorfliste laden (mit 24h-Cache wie im Original)
let currentTime = Date.parse(new Date());
let villageListData;
if (localStorage.getItem("barbmapVillageTime") != null) {
    mapVillageTime = localStorage.getItem("barbmapVillageTime");
    if (currentTime >= parseInt(mapVillageTime) + 60 * 60 * 24 * 1000) {
        console.log("Hour has passed, recollecting the village data");
        $.get("map/village.txt", function (data) {
            villageListData = data;
            localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
            localStorage.setItem("barbmapVillageTxt", data);
        }).done(function () {
            finish(villageListData);
        });
    } else {
        console.log("Hour not over yet, waiting to recollect, using old data");
        data = localStorage.getItem("barbmapVillageTxt");
        finish(data);
    }
} else {
    console.log("Grabbing village.txt for the first time");
    $.get("map/village.txt", function (data) {
        villageListData = data;
        localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
        localStorage.setItem("barbmapVillageTxt", data);
    }).done(function () {
        finish(villageListData);
    });
}

function CSVToArray(strData, strDelimiter) {
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
    );
    var arrData = [[]];
    var arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        var strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
            arrData.push([]);
        }
        var strMatchedValue;
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
        } else {
            strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return (arrData);
}

function finish(list) {
    villageList = CSVToArray(list);
}

function makeUnique(arr, key) {
    return [...new Map(arr.map(item => [item[key], item])).values()];
}

// ─── Dialog aufbauen (mit neuen Optionen) ──────────────────────────────────
function buildDialog() {
    let groupOptions = `<option value="">-- keine Gruppe / nicht leeren --</option>`;
    groups.forEach(g => {
        groupOptions += `<option value="${g.group_id}">${g.group_name}</option>`;
    });

    coordinateHTML = `<div class="vis">
        <table class="vis">
            <tr>
                <td>Koordinaten:</td>
                <td><textarea id="coordField" cols="60" rows="12" placeholder="Enter coordinates here"></textarea></td>
            </tr>
            <tr>
                <td>Zielgruppe:</td>
                <td><select id="preselectGroup">${groupOptions}</select></td>
            </tr>
            <tr>
                <td colspan="2">
                    <label><input type="checkbox" id="clearFirstCheckbox"> Gruppe vorher komplett leeren, dann nur die eingefügten Dörfer hinzufügen</label>
                </td>
            </tr>
        </table>
        <center>
            <button type="button" class="btn btn-confirm-yes" onclick="importCoords()">Dörfer auswählen</button>
            <button type="button" class="btn" onclick="clearGroupOnly()">Nur Gruppe komplett leeren (ohne Hinzufügen)</button>
        </center>
    </div>`;
    Dialog.show("coordinateField", coordinateHTML);
}

// ─── Hilfsfunktion: alle Dorf-IDs holen, die aktuell in einer Gruppe sind ──
function getVillageIdsInGroup(groupId, callback) {
    if (!groupId) {
        callback([]);
        return;
    }
    $.get(`/game.php?screen=overview_villages&mode=groups&group=${groupId}`, function (html) {
        let found = [];
        let regex = /name="village_ids\[\]"\s+value="(\d+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            found.push(match[1]);
        }
        callback(found);
    });
}

// ─── Alle Dörfer aus einer Gruppe entfernen ────────────────────────────────
function removeAllFromGroup(groupId, callback) {
    getVillageIdsInGroup(groupId, function (villageIds) {
        if (villageIds.length === 0) {
            console.log("Gruppe ist bereits leer, nichts zu entfernen.");
            if (callback) callback();
            return;
        }

        let formData = new URLSearchParams();
        villageIds.forEach(id => formData.append("village_ids[]", id));
        formData.append("selected_group", groupId);
        formData.append("remove_from_group", "Remove");
        formData.append("h", csrf_token);

        $.post(
            "/game.php?village=" + game_data.village.id + "&screen=overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial",
            formData.toString(),
            function () {
                console.log(`${villageIds.length} Dörfer aus Gruppe ${groupId} entfernt.`);
                if (callback) callback();
            }
        ).fail(function (err) {
            console.error("Entfernen fehlgeschlagen. Eventuell heißt der Submit-Button im Spiel anders — bitte Netzwerk-Tab prüfen.", err);
            if (callback) callback();
        });
    });
}

// Button "Nur Gruppe komplett leeren"
function clearGroupOnly() {
    let groupId = $("#preselectGroup").val();
    if (!groupId) {
        alert("Bitte zuerst eine Gruppe auswählen.");
        return;
    }
    if (!confirm("Wirklich ALLE Dörfer aus dieser Gruppe entfernen?")) return;

    removeAllFromGroup(groupId, function () {
        UI.SuccessMessage ? UI.SuccessMessage("Gruppe geleert.") : alert("Gruppe geleert.");
        Dialog.close();
    });
}

// ─── Koordinaten importieren & Dörfer zuordnen ─────────────────────────────
function importCoords() {
    let selectedGroupId = $("#preselectGroup").val();
    let clearFirst = $("#clearFirstCheckbox").is(":checked");

    if (clearFirst && !selectedGroupId) {
        alert("Zum Leeren muss eine Zielgruppe ausgewählt sein.");
        return;
    }

    coordinates = $("#coordField")[0].value.match(/\d+\|\d+/g);
    if (!coordinates) {
        alert("Keine Koordinaten gefunden.");
        return;
    }

    coordinatesSplit = [];
    coordinates.forEach(element => {
        let sep = element.split("|");
        coordinatesSplit.push({ "x": sep[0], "y": sep[1] });
    });

    coordinatesSplit.forEach(element => {
        villageList.forEach(village => {
            if (village[2] == element.x && village[3] == element.y) {
                if (village[4] != game_data.player.id) {
                    console.log("WE DONT OWN THIS VILLAGE");
                } else {
                    ids.push({ "id": village[0], "name": village[1] });
                }
            }
        });
    });

    ids = makeUnique(ids, 'id');

    // Falls "Gruppe leeren" aktiv: erst leeren, dann Formular zum Hinzufügen zeigen
    if (clearFirst) {
        removeAllFromGroup(selectedGroupId, function () {
            showAddForm(selectedGroupId);
        });
    } else {
        showAddForm(selectedGroupId);
    }
}

function showAddForm(preselectedGroupId) {
    form = `<form action="/game.php?village=${game_data.village.id}&amp;screen=overview_villages&amp;action=bulk_edit_villages&amp;mode=groups&amp;type=static&amp;partial" method="post">
                <table class="vis overview_table" width="100%" id="group_assign_table">`;

    ids.forEach(element => {
        form += `<tr><td><input type="checkbox" name="village_ids[]" value="${element.id}" checked></input>${element.name.replaceAll("+", " ").replaceAll("%3A", ":")}</td></tr>`;
    });

    form += `<select name="selected_group">`;
    groups.forEach(element => {
        let sel = (preselectedGroupId && element.group_id == preselectedGroupId) ? "selected" : "";
        form += `<option value="${element.group_id}" ${sel}>${element.group_name}</option>`;
    });
    form += `</select>`;
    form += `
            <input class="btn" type="submit" name="add_to_group" value="Add">
            <input type="hidden" name="h" value="${csrf_token}">
        </table>
    </form>`;
    Dialog.show("submit", form);
}
