# DS-Scripts

Kostenlose Userscripts, Erklärungen und Rechner (Laufzeit, Punkte, Ressourcen, Truppen)
für „Die Stämme“ – als statische GitHub-Pages-Seite.

## Live-Seite

Nach Aktivierung von GitHub Pages (siehe unten) erreichbar unter:

```
https://marlongsimo.github.io/DS-Scripts/
```

## GitHub Pages aktivieren

1. Diesen Branch nach `main` mergen (Pull Request).
2. Im Repository zu **Settings → Pages** gehen.
3. Unter **Build and deployment** → **Source**: `Deploy from a branch` wählen.
4. **Branch**: `main`, Ordner `/ (root)` auswählen und speichern.
5. Nach 1–2 Minuten ist die Seite unter der obigen URL erreichbar.

## Struktur

```
index.html            Startseite
skripte.html           Skript-Übersicht (Barbs Finder)
rechner/                Rechner-Seiten
  index.html            Übersicht
  laufzeit.html          Laufzeit-Rechner
  punkte.html             Punkte-Rechner
  ressourcen.html          Ressourcen-/Bauzeit-Rechner
  truppen.html              Truppen-Rechner
assets/
  css/style.css           Gemeinsames Stylesheet
  js/                       Nav-Verhalten + Rechnerlogik
scripts/
  barbsFinder.js           Gehostete Skriptdatei (für Bookmarklet/Konsole)
```

## Lokal testen

Reines HTML/CSS/JS ohne Build-Schritt. Am einfachsten mit einem simplen HTTP-Server öffnen
(nötig, da `fetch`/Skript-Ladeverweise über `file://` teils blockiert werden):

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

## Neues Skript hinzufügen

1. Skriptdatei unter `scripts/` ablegen.
2. Eine neue Karte + Detailblock in `skripte.html` ergänzen (Beschreibung, Meta-Infos,
   Bookmarklet-Link nach dem Muster von Barbs Finder).
3. Optional: Vorschau-Karte auf `index.html` ergänzen.
