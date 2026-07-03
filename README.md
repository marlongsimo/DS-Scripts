# DS-Scripts

Statische GitHub-Pages-Seite für „Die Stämme“.

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
assets/
  css/style.css           Gemeinsames Stylesheet
  js/main.js                Nav-Verhalten
```

## Lokal testen

Reines HTML/CSS/JS ohne Build-Schritt. Am einfachsten mit einem simplen HTTP-Server öffnen:

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

<!-- Deploy-Trigger: erneuert einen hängengebliebenen GitHub-Pages-Build -->
