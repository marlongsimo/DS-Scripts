# TW-Attack-Planner (gepatchter Fork)

Dies ist ein Fork von [KincsesBence/TW-attack-planner](https://github.com/KincsesBence/TW-attack-planner)
(Original-`README.md` als `README-upstream.md` in diesem Ordner erhalten), lizenziert unter der
"Custom Redistribution & Attribution License" des Originalautors (siehe Lizenzkommentar am Kopf von
`src/core/Api.ts` bzw. `../twAttackPlanner.js`): Nutzung, Kopie, Modifikation und Weiterverbreitung
sind erlaubt, solange die Namensnennung erhalten bleibt.

## Patch

`src/core/Api.ts` griff an mehreren Stellen ungeprüft auf `window.unitConfig[einheit]` zu
(`.pop`/`.speed`). Die API `interface.php?func=get_unit_info` liefert aber nur die auf der jeweiligen
Welt tatsächlich freigeschalteten Einheiten – auf Welten ohne Bogenschütze/Reiter war das nur für
Bogenschütze/Reiter über `window.gameConfig.game.archer==0` abgesichert, auf Welten ohne
Adelsgeschlecht (Paladin) fehlte diese Absicherung komplett und der Script stürzte beim Einlesen der
Dorf-/Truppendaten ab.

Fix: an allen betroffenen Stellen (`fetchVillage`, `calcUnitPop`, `getSlowestUnit`) eine generische
Guard-Klausel `if(!window.unitConfig[einheit]) return;` ergänzt, statt die Einheiten fest zu
verdrahten – funktioniert dadurch für jede Einheiten-Kombination, die eine Welt tatsächlich hat.

## Build

```
npm ci
npm run build
```

erzeugt `dist/bundle.js` – das ist die Datei, die als `../twAttackPlanner.js` im Wurzelverzeichnis von
`scripts/` gehostet wird (Bookmarklet lädt sie direkt per `$.getScript(...)`).
