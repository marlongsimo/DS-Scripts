// Katta-/Fake-Skripterstellung: erzeugt aus einer Koordinatenliste + Truppenanzahl
// ein Bookmarklet, das im Versammlungsplatz bei jedem Klick automatisch das
// nächstgelegene, noch nicht verwendete Ziel einträgt (Fortschritt via localStorage).

var COORD_PATTERN = /^\d{1,3}\|\d{1,3}$/;

function parseCoords(raw) {
  var tokens = raw.split(/[\s,]+/).map(function (t) { return t.trim(); }).filter(Boolean);
  var valid = [];
  var seen = {};

  tokens.forEach(function (token) {
    if (COORD_PATTERN.test(token) && !seen[token]) {
      seen[token] = true;
      valid.push(token);
    }
  });

  return valid;
}

function sanitizeScriptId(raw) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function buildBookmarklet(coords, counts, scriptId) {
  var storageKey = 'tw_used_coords' + (scriptId ? '_' + scriptId : '');
  var coordsStr = coords.join(' ');

  return "javascript:(function(){"
    + "var used=JSON.parse(localStorage.getItem('" + storageKey + "')||'[]');"
    + "var allCoords='" + coordsStr + "'.split(' ');"
    + "var remaining=allCoords.filter(function(c){return used.indexOf(c)===-1;});"
    + "if(remaining.length===0){"
      + "if(confirm('Alle Koordinaten abgearbeitet! Zurücksetzen?')){"
        + "localStorage.removeItem('" + storageKey + "');"
        + "alert('Zurückgesetzt!');"
      + "}"
    + "}else{"
      + "var doc=document;"
      + "if(window.frames.length>0&&window.main!=null)doc=window.main.document;"
      + "if(doc.URL.indexOf('screen=place')===-1){"
        + "alert('Bitte im Versammlungsplatz verwenden!');"
      + "}else{"
        + "var titleMatch=document.title.match(/\\((\\d+)\\|(\\d+)\\)/);"
        + "if(!titleMatch){"
          + "alert('Dorfkoordinaten nicht gefunden!');"
        + "}else{"
          + "var myX=parseInt(titleMatch[1]);"
          + "var myY=parseInt(titleMatch[2]);"
          + "var best=null;"
          + "var bestDist=Infinity;"
          + "remaining.forEach(function(c){"
            + "var p=c.split('|');"
            + "var dx=parseInt(p[0])-myX;"
            + "var dy=parseInt(p[1])-myY;"
            + "var dist=Math.sqrt(dx*dx+dy*dy);"
            + "if(dist<bestDist){bestDist=dist;best=c;}"
          + "});"
          + "used.push(best);"
          + "localStorage.setItem('" + storageKey + "',JSON.stringify(used));"
          + "var coords=best.split('|');"
          + "doc.forms[0].x.value=coords[0];"
          + "doc.forms[0].y.value=coords[1];"
          + "doc.forms[0].spear.value=" + counts.spear + ";"
          + "doc.forms[0].axe.value=" + counts.axe + ";"
          + "doc.forms[0].spy.value=" + counts.spy + ";"
          + "doc.forms[0].light.value=" + counts.light + ";"
          + "doc.forms[0].ram.value=" + counts.ram + ";"
          + "doc.forms[0].catapult.value=" + counts.catapult + ";"
          + "end();"
        + "}"
      + "}"
    + "}"
  + "})();";
}

function buildResetScript(scriptId) {
  var storageKey = 'tw_used_coords' + (scriptId ? '_' + scriptId : '');
  return "javascript:localStorage.removeItem('" + storageKey + "');document.cookie='farm=0';alert('Reset erfolgreich!');";
}

function generate() {
  var errorBox = document.getElementById('gen-error');
  errorBox.textContent = '';

  var coords = parseCoords(document.getElementById('coord-list').value);
  if (coords.length === 0) {
    errorBox.textContent = 'Bitte mindestens eine gültige Koordinate (Format 123|456) eingeben.';
    document.getElementById('result-box').style.display = 'none';
    return;
  }

  var counts = {
    spear: parseInt(document.getElementById('count-spear').value, 10) || 0,
    axe: parseInt(document.getElementById('count-axe').value, 10) || 0,
    spy: parseInt(document.getElementById('count-spy').value, 10) || 0,
    light: parseInt(document.getElementById('count-light').value, 10) || 0,
    ram: parseInt(document.getElementById('count-ram').value, 10) || 0,
    catapult: parseInt(document.getElementById('count-catapult').value, 10) || 0
  };

  var totalUnits = counts.spear + counts.axe + counts.spy + counts.light + counts.ram + counts.catapult;
  if (totalUnits === 0) {
    errorBox.textContent = 'Bitte mindestens bei einer Einheit eine Anzahl größer 0 eingeben.';
    document.getElementById('result-box').style.display = 'none';
    return;
  }

  var scriptId = sanitizeScriptId(document.getElementById('script-id').value || '');
  var bookmarklet = buildBookmarklet(coords, counts, scriptId);
  var resetScript = buildResetScript(scriptId);

  document.getElementById('result-count').textContent = '✓ ' + coords.length + ' Koordinate' + (coords.length === 1 ? '' : 'n') + ' im Script';
  document.getElementById('bookmarklet-link').setAttribute('href', bookmarklet);
  document.getElementById('script-code').value = bookmarklet;
  document.getElementById('reset-bookmarklet-link').setAttribute('href', resetScript);
  document.getElementById('reset-script-code').value = resetScript;
  document.getElementById('result-box').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('gen-form').addEventListener('submit', function (e) {
    e.preventDefault();
    generate();
  });

  document.getElementById('copy-script').addEventListener('click', function () {
    var textarea = document.getElementById('script-code');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(function () {
      var btn = document.getElementById('copy-script');
      var original = btn.textContent;
      btn.textContent = '✅ Kopiert!';
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  });

  document.getElementById('copy-reset-script').addEventListener('click', function () {
    var textarea = document.getElementById('reset-script-code');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(function () {
      var btn = document.getElementById('copy-reset-script');
      var original = btn.textContent;
      btn.textContent = '✅ Kopiert!';
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  });
});
