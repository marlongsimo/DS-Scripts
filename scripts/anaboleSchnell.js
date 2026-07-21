/*
 * 💪 Anabole Schnell (Bookmarklet-Version)
 * Markiert mehrfache Angriffe in der Angriffsübersicht und liefert schnelle
 * Umbenennen-Buttons für eingehende Angriffe. Wird per Bookmarklet als
 * <script> von https://marlongsimo.github.io/DS-Scripts/scripts/anaboleSchnell.js
 * nachgeladen, siehe scripts/anabole-schnell.html für die Installation.
 */

(function () {
    'use strict';

    // Verhindert Doppel-Ausführung, falls das Bookmarklet zweimal geklickt wird
    if (window.__tpSchnellLoaded) {
        console.log('[Anabole Schnell] läuft bereits.');
        return;
    }
    window.__tpSchnellLoaded = true;

    if (window.top !== window.self) return;

    const APP = { name: '💪 Anabole Schnell', prefix: 'tpSchnell', version: '1.0.0', styleId: 'tpSchnellStyles' };

    // ---------------------------------------------------------------------
    // Konfiguration (bewusst simpel gehalten, kein Einstellungs-Panel)
    // ---------------------------------------------------------------------
    const CONFIG = {
        tamanhoLetraPx: 8,
        tamanhoBotaoPx: 18,
        paddingHorizontalBotaoPx: 3,
        timeoutEdicaoMs: 1200,
        intervaloEsperaInputMs: 40,
        intervaloFallbackMs: 2500,
    };

    const CORES = {
        red: { top: '#e20606', bottom: '#ff0000' },
        green: { top: '#31c908', bottom: '#228c05' },
        blue: { top: '#0d83dd', bottom: '#0860a3' },
        yellow: { top: '#ffd91c', bottom: '#e8c30d' },
        orange: { top: '#ef8b10', bottom: '#d3790a' },
        lblue: { top: '#22e5db', bottom: '#0cd3c9' },
        lime: { top: '#ffd400', bottom: '#ffd400' },
        white: { top: '#ffffff', bottom: '#dbdbdb' },
        black: { top: '#000000', bottom: '#000000' },
        gray: { top: '#adb6c6', bottom: '#828891' },
        dorange: { top: '#9232a8', bottom: '#9232a8' },
        dark: { top: '#40434e', bottom: '#40434e' },
        pink: { top: '#ffc0cb', bottom: '#ffc0cb' },
        brown: { top: '#892929', bottom: '#892929' },
        dblue: { top: '#00007f', bottom: '#00007f' },
        dgreen: { top: '#004c00', bottom: '#004c00' },
        lgreen: { top: '#93cf82', bottom: '#93cf82' },
    };

    // Tags fürs Umbenennen, aufgeteilt in 3 Kategorien. Innerhalb einer
    // Kategorie ersetzt ein neuer Tag den alten. Tags aus verschiedenen
    // Kategorien werden hintereinander angehängt (immer in der Reihenfolge
    // Haupt -> Angriff -> Stand), unabhängig von der Klick-Reihenfolge.
    // Jede Kategorie hat ihre eigene Klammerform, damit sie sich sauber
    // auseinanderhalten lassen: Haupt = [Tag], Angriff = {Tag}, Stand = (Tag)
    const KATEGORIE_ORDER = ['haupt', 'angriff', 'stand'];

    const COMANDOS = [
        // --- Haupttag: [Tag] -----------------------------------------
        { kategorie: 'haupt', tag: '[Fake]', label: '🤡', corBotao: 'pink', corTexto: 'black' },
        { kategorie: 'haupt', tag: '[Evtl. Off]', aliases: ['[Evtl Off]', '[Evtl. off]'], label: 'Off', corBotao: 'dblue', corTexto: 'white' },
        { kategorie: 'haupt', tag: '[Unbekannt]', label: '?', corBotao: 'gray', corTexto: 'white' },

        // --- Angriffstag: {Tag} ---------------------------------------
        { kategorie: 'angriff', tag: '{Snipe}', label: 'Sn', corBotao: 'blue', corTexto: 'white' },
        { kategorie: 'angriff', tag: '{Snipecancel}', label: 'SC', corBotao: 'red', corTexto: 'white' },
        { kategorie: 'angriff', tag: '{Dodge}', label: 'Do', corBotao: 'lblue', corTexto: 'white' },
        { kategorie: 'angriff', tag: '{Fakeschutz}', label: 'FS', corBotao: 'orange', corTexto: 'white' },
        { kategorie: 'angriff', tag: '{Deffen}', label: 'Df', corBotao: 'green', corTexto: 'white' },
        { kategorie: 'angriff', tag: '{Readel}', label: 'RA', corBotao: 'dorange', corTexto: 'white' },

        // --- Standtag: (Tag) --------------------------------------------
        { kategorie: 'stand', tag: '(✓)', label: '✓', corBotao: 'lgreen', corTexto: 'black' },
        { kategorie: 'stand', tag: '(Verkackt)', label: 'VK', corBotao: 'dgreen', corTexto: 'white' },
        { kategorie: 'stand', tag: '(x)', label: 'X', corBotao: 'dark', corTexto: 'white' },
    ];

    const SELETORES = {
        linhasAtaques: '#incomings_table tr',
        linhasComandos: '#commands_incomings .command-row, #commands_incomings tr, #commands_outgoings .command-row, #commands_outgoings tr, .command-row',
        quickedit: '.quickedit-content',
        etiquetaNome: '.quickedit-label',
        iconeRenomear: '.rename-icon',
        inputNome: 'input[type="text"]',
        areaEdicao: '.quickedit-edit',
        botoesGuardar: 'input[type="button"], input[type="submit"], button[type="submit"]',
    };

    let execucaoAgendada = false;

    // Storage-Key identisch zum alten "Angriffe umbenennen"-Skript, damit
    // bereits gespeicherte Dorfinfos automatisch übernommen werden.
    const DORF_STORAGE_KEY = 'Dorfinfos';
    let dorfInfosCache = null;

    let cachedIncomingsSourceIndex = null;

    // Tooltip-State für die Dorfinfo-Overlays
    let tooltipEl = null;
    let tooltipPinned = false;
    let tooltipAlvo = null;

    // =======================================================================
    // Boot
    // =======================================================================
    function boot() {
        if (!document.body) {
            setTimeout(boot, 100);
            return;
        }

        addStyles();
        runRenameButtons();
        runDuplicateMarker();

        document.addEventListener('click', fecharTooltipSeForaDoAlvo, true);
        window.addEventListener('scroll', function () { if (!tooltipPinned) esconderTooltip(); }, true);
        window.addEventListener('resize', esconderTooltip);

        const observer = new MutationObserver(agendarExecucao);
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(runRenameButtons, CONFIG.intervaloFallbackMs);
        log('Skript geladen: ' + location.href);
    }

    function agendarExecucao() {
        if (execucaoAgendada) return;
        execucaoAgendada = true;
        requestAnimationFrame(function () {
            execucaoAgendada = false;
            runRenameButtons();
        });
    }

    function log(message) {
        if (window.console && typeof console.log === 'function') console.log('[' + APP.name + ']', message);
    }

    // =======================================================================
    // Teil 1: Mehrfache Angriffe in der Angriffsübersicht markieren
    // =======================================================================
    function runDuplicateMarker() {
        const screen = String((window.game_data || {}).screen || '');
        const mode = getCurrentMode();
        if (screen !== 'overview_villages' || mode !== 'incomings') return;

        const table = document.querySelector('#incomings_table');
        if (!table || document.getElementById('tpSchnellDupPanel')) return;

        const rows = Array.from(table.querySelectorAll('tr.row_a, tr.row_b'));
        if (!rows.length) return;

        const sourceIndex = getSourceColumnIndex(table);

        const panel = document.createElement('div');
        panel.id = 'tpSchnellDupPanel';
        panel.className = 'tpSchnell-dup-panel';
        panel.innerHTML =
            '<input type="button" class="btn" id="tpSchnellMarkDup" value="Wiederholte Angriffe markieren"> ' +
            '<input type="button" class="btn" id="tpSchnellImportBtn" value="📥 Dörfer importieren"> ' +
            '<input type="button" class="btn" id="tpSchnellDeleteBtn" value="🗑️ Dorfinfos löschen">';

        const filters = document.querySelector('.overview_filters');
        if (filters) filters.before(panel);
        else table.before(panel);

        document.getElementById('tpSchnellMarkDup').addEventListener('click', function () {
            markDuplicates(rows, sourceIndex);
        });
        document.getElementById('tpSchnellImportBtn').addEventListener('click', abrirModalDorfImport);
        document.getElementById('tpSchnellDeleteBtn').addEventListener('click', apagarDorfInfosComConfirmacao);

        // Direkt beim Laden einmal automatisch markieren
        markDuplicates(rows, sourceIndex);
    }

    function getCurrentMode() {
        if (window.game_data && window.game_data.mode) return String(window.game_data.mode);
        return new URLSearchParams(window.location.search).get('mode') || '';
    }

    // =======================================================================
    // Teil 1b: Dorf-Infos (Import, Löschen, Anzeige als Info-Icon + Overlay)
    // =======================================================================
    function obterDorfInfos() {
        if (dorfInfosCache) return dorfInfosCache;
        try {
            const raw = localStorage.getItem(DORF_STORAGE_KEY);
            dorfInfosCache = raw ? JSON.parse(raw) : {};
        } catch (erro) {
            dorfInfosCache = {};
        }
        return dorfInfosCache;
    }

    function salvarDorfInfos(dados) {
        dorfInfosCache = dados;
        try {
            localStorage.setItem(DORF_STORAGE_KEY, JSON.stringify(dados));
        } catch (erro) {
            log('Konnte Dorfinfos nicht speichern: ' + erro);
        }
    }

    function apagarDorfInfos() {
        dorfInfosCache = {};
        try {
            localStorage.removeItem(DORF_STORAGE_KEY);
        } catch (erro) {
            // ignorieren
        }
    }

    // Liest Info sowohl im neuen Format (String) als auch im alten Format
    // des früheren Skripts ({ Info: "...", Coords: "..." }).
    function obterInfoParaCoords(coords) {
        if (!coords) return null;
        const entrada = obterDorfInfos()[coords];
        if (!entrada) return null;
        if (typeof entrada === 'string') return entrada;
        if (typeof entrada === 'object' && entrada.Info) return String(entrada.Info);
        return null;
    }

    function getIncomingsSourceIndex(table) {
        if (cachedIncomingsSourceIndex === null) {
            cachedIncomingsSourceIndex = getSourceColumnIndex(table);
        }
        return cachedIncomingsSourceIndex;
    }

    function getCoordsFromRow(linha) {
        const tabela = linha.closest('table');
        if (tabela && tabela.id === 'incomings_table') {
            const coords = getRowCoords(linha, getIncomingsSourceIndex(tabela));
            if (coords) return coords;
        }
        const match = String(linha.textContent || '').match(/\b\d{1,3}\|\d{1,3}\b/);
        return match ? match[0] : null;
    }

    // --- Import/Löschen-Logik (Buttons sitzen im Duplikate-Panel) -----------
    function apagarDorfInfosComConfirmacao() {
        if (!window.confirm('Wirklich ALLE gespeicherten Dorfinfos löschen?')) return;
        apagarDorfInfos();
        atualizarTudoAgora();
        window.alert('Dorfinfos-Datenbank gelöscht.');
    }

    function abrirModalDorfImport() {
        if (document.getElementById('tpSchnellImportBackdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'tpSchnellImportBackdrop';
        backdrop.className = 'tpSchnell-modal-backdrop';
        backdrop.innerHTML =
            '<div class="tpSchnell-modal-box">' +
            '<h3>Dörfer-Infos importieren</h3>' +
            '<p>Koordinaten (beliebig viele, z.B. aus Notizen/Liste kopiert):</p>' +
            '<textarea id="tpSchnellImportCoords" rows="4" placeholder="123|456 789|123 ..."></textarea>' +
            '<p>Infotext (wird bei Treffer im Overlay angezeigt):</p>' +
            '<input type="text" id="tpSchnellImportInfo" placeholder="z.B. Vollbauer, Feind XY...">' +
            '<div class="tpSchnell-modal-actions">' +
            '<button type="button" class="btn" id="tpSchnellImportCancel">Abbrechen</button>' +
            '<button type="button" class="btn" id="tpSchnellImportSave">Importieren</button>' +
            '</div>' +
            '<div id="tpSchnellImportResult"></div>' +
            '<hr class="tpSchnell-modal-trenner">' +
            '<h4>Vorhandene Einträge (<span id="tpSchnellExistCount">0</span>)</h4>' +
            '<input type="text" id="tpSchnellExistSearch" placeholder="Suchen (Koordinate oder Text)...">' +
            '<div id="tpSchnellExistList" class="tpSchnell-exist-list"></div>' +
            '</div>';

        document.body.appendChild(backdrop);

        backdrop.addEventListener('click', function (evento) {
            if (evento.target === backdrop) fecharModalDorfImport();
        });
        document.getElementById('tpSchnellImportCancel').addEventListener('click', fecharModalDorfImport);
        document.getElementById('tpSchnellImportSave').addEventListener('click', salvarImportDorf);
        document.getElementById('tpSchnellExistSearch').addEventListener('input', function () {
            renderizarListaExistente(this.value);
        });

        renderizarListaExistente('');
    }

    function renderizarListaExistente(filtro) {
        const lista = document.getElementById('tpSchnellExistList');
        const contagem = document.getElementById('tpSchnellExistCount');
        if (!lista || !contagem) return;

        const termo = clean(filtro || '');
        const dados = obterDorfInfos();

        const entradas = Object.keys(dados)
            .map(function (coords) { return { coords: coords, valor: obterInfoParaCoords(coords) || '' }; })
            .filter(function (entrada) {
                if (!termo) return true;
                return clean(entrada.coords).includes(termo) || clean(entrada.valor).includes(termo);
            })
            .sort(function (a, b) { return a.coords.localeCompare(b.coords, 'de', { numeric: true }); });

        contagem.textContent = Object.keys(dados).length;
        lista.innerHTML = '';

        if (!entradas.length) {
            const vazio = document.createElement('p');
            vazio.className = 'tpSchnell-exist-empty';
            vazio.textContent = termo ? 'Keine Treffer.' : 'Noch keine Einträge gespeichert.';
            lista.appendChild(vazio);
            return;
        }

        entradas.forEach(function (entrada) {
            lista.appendChild(criarLinhaExistente(entrada.coords, entrada.valor));
        });
    }

    function criarLinhaExistente(coords, valorAtual) {
        const linha = document.createElement('div');
        linha.className = 'tpSchnell-exist-row';

        const labelCoords = document.createElement('span');
        labelCoords.className = 'tpSchnell-exist-coords';
        labelCoords.textContent = coords;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tpSchnell-exist-input';
        input.value = valorAtual;

        function salvarEdicao() {
            const dados = obterDorfInfos();
            const novoValor = normalizarEspacos(input.value);
            if (!novoValor) {
                delete dados[coords];
            } else {
                dados[coords] = novoValor;
            }
            salvarDorfInfos(dados);
            atualizarTudoAgora();
        }

        input.addEventListener('change', salvarEdicao);
        input.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter') input.blur();
        });

        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.className = 'btn tpSchnell-exist-delete';
        btnExcluir.textContent = '🗑️';
        btnExcluir.title = 'Eintrag löschen';
        btnExcluir.addEventListener('click', function () {
            const dados = obterDorfInfos();
            delete dados[coords];
            salvarDorfInfos(dados);
            atualizarTudoAgora();
            linha.remove();
            document.getElementById('tpSchnellExistCount').textContent = Object.keys(obterDorfInfos()).length;
        });

        linha.appendChild(labelCoords);
        linha.appendChild(input);
        linha.appendChild(btnExcluir);
        return linha;
    }

    function fecharModalDorfImport() {
        const backdrop = document.getElementById('tpSchnellImportBackdrop');
        if (backdrop) backdrop.remove();
    }

    function salvarImportDorf() {
        const coordsInput = document.getElementById('tpSchnellImportCoords');
        const infoInput = document.getElementById('tpSchnellImportInfo');
        const resultado = document.getElementById('tpSchnellImportResult');

        const texto = normalizarEspacos(infoInput.value);
        const unicos = Array.from(new Set(coordsInput.value.match(/\b\d{1,3}\|\d{1,3}\b/g) || []));

        if (!texto) {
            resultado.textContent = 'Bitte einen Infotext eingeben.';
            return;
        }
        if (!unicos.length) {
            resultado.textContent = 'Keine Koordinaten gefunden.';
            return;
        }

        const dados = obterDorfInfos();
        unicos.forEach(function (coord) { dados[coord] = texto; });
        salvarDorfInfos(dados);

        resultado.textContent = unicos.length + ' Dorf/Dörfer gespeichert.';
        coordsInput.value = '';
        infoInput.value = '';
        atualizarTudoAgora();
        renderizarListaExistente(document.getElementById('tpSchnellExistSearch').value);
    }

    // --- Info-Icon + Tooltip-Overlay (auch mobil per Tap) -------------------
    function criarInfoIcon(infoText) {
        const icone = document.createElement('span');
        icone.className = 'tpSchnell-info-icon';
        icone.textContent = 'i';
        icone.tabIndex = 0;
        icone.setAttribute('role', 'button');
        icone.setAttribute('aria-label', 'Dorfinfo: ' + infoText);

        icone.addEventListener('mouseenter', function () {
            if (!(tooltipPinned && tooltipAlvo === icone)) mostrarTooltip(icone, infoText);
        });
        icone.addEventListener('mouseleave', function () {
            if (!tooltipPinned) esconderTooltip();
        });
        icone.addEventListener('click', function (evento) {
            evento.preventDefault();
            evento.stopPropagation();
            if (tooltipPinned && tooltipAlvo === icone) {
                esconderTooltip();
                tooltipPinned = false;
                tooltipAlvo = null;
            } else {
                mostrarTooltip(icone, infoText);
                tooltipPinned = true;
                tooltipAlvo = icone;
            }
        });

        return icone;
    }

    function garantirTooltipEl() {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tpSchnell-tooltip';
            tooltipEl.style.display = 'none';
            document.body.appendChild(tooltipEl);
        }
        return tooltipEl;
    }

    function mostrarTooltip(alvo, texto) {
        const el = garantirTooltipEl();
        el.textContent = texto;
        el.style.display = 'block';

        const rectAlvo = alvo.getBoundingClientRect();
        const margem = 6;

        el.style.top = (rectAlvo.bottom + margem) + 'px';
        el.style.left = rectAlvo.left + 'px';

        const rectTooltip = el.getBoundingClientRect();
        let left = rectAlvo.left;
        let top = rectAlvo.bottom + margem;

        const maxLeft = window.innerWidth - rectTooltip.width - 8;
        if (left > maxLeft) left = Math.max(8, maxLeft);

        if (top + rectTooltip.height > window.innerHeight) {
            top = rectAlvo.top - rectTooltip.height - margem;
        }

        el.style.left = left + 'px';
        el.style.top = top + 'px';
    }

    function esconderTooltip() {
        if (tooltipEl) tooltipEl.style.display = 'none';
    }

    function fecharTooltipSeForaDoAlvo(evento) {
        if (!tooltipPinned) return;
        if (tooltipAlvo && tooltipAlvo.contains(evento.target)) return;
        if (tooltipEl && tooltipEl.contains(evento.target)) return;
        esconderTooltip();
        tooltipPinned = false;
        tooltipAlvo = null;
    }

    function getSourceColumnIndex(table) {
        const headerRow = table.querySelector('tr:first-child');
        if (!headerRow) return 2;

        const cells = Array.from(headerRow.querySelectorAll('th,td'));
        const words = ['origem', 'source', 'herkomst', 'herkunft'];

        for (let i = 0; i < cells.length; i += 1) {
            const text = clean(cells[i].textContent);
            if (words.some(function (w) { return text.includes(w); })) return i;
        }

        return 2;
    }

    function markDuplicates(rows, sourceIndex) {
        // Vorherige Markierungen entfernen
        rows.forEach(function (row) {
            row.style.boxShadow = '';
            row.querySelectorAll('.tpSchnell-dup-badge').forEach(function (b) { b.remove(); });

            const marked = row.querySelectorAll('.tpSchnell-dup-origin');
            marked.forEach(function (el) {
                el.classList.remove('tpSchnell-dup-origin');
                el.removeAttribute('title');
                el.style.background = '';
                el.style.color = '';
                el.style.borderColor = '';
            });
        });

        const counts = {};
        const order = [];

        rows.forEach(function (row) {
            const coords = getRowCoords(row, sourceIndex);
            if (!coords) return;
            if (!counts[coords]) order.push(coords);
            counts[coords] = (counts[coords] || 0) + 1;
        });

        const groups = {};
        order.filter(function (c) { return counts[c] > 1; }).forEach(function (coords, index) {
            groups[coords] = {
                label: duplicateGroupLabel(index),
                color: duplicateGroupColor(index),
                count: counts[coords],
                position: 0,
            };
        });

        rows.forEach(function (row) {
            const coords = getRowCoords(row, sourceIndex);
            const group = groups[coords];
            if (!group) return;

            group.position += 1;

            const cells = row.querySelectorAll('td,th');
            const cell = cells[sourceIndex];
            if (!cell) return;
            const link = cell.querySelector('a');
            const target = link || cell;

            const title = group.label + ': ' + group.count + ' Angriffe von ' + coords;

            row.style.boxShadow = 'inset 5px 0 0 ' + group.color;
            target.classList.add('tpSchnell-dup-origin');
            target.title = title;
            target.style.background = group.color;
            target.style.borderColor = group.color;
            target.style.color = '#fff';

            const badge = document.createElement('span');
            badge.className = 'tpSchnell-dup-badge';
            badge.textContent = group.label + ' ' + group.position + '/' + group.count;
            badge.title = title;
            badge.style.background = group.color;

            if (target === cell) cell.appendChild(badge);
            else target.insertAdjacentElement('afterend', badge);
        });
    }

    function duplicateGroupLabel(index) {
        let number = index + 1;
        let label = '';
        while (number > 0) {
            number -= 1;
            label = String.fromCharCode(65 + (number % 26)) + label;
            number = Math.floor(number / 26);
        }
        return label || 'A';
    }

    function duplicateGroupColor(index) {
        const colors = [
            '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080',
            '#f032e6', '#808000', '#9a6324', '#000075', '#800000', '#469990',
        ];
        return colors[index % colors.length];
    }

    function getRowCoords(row, sourceIndex) {
        const cells = row.querySelectorAll('td,th');
        const cell = sourceIndex >= 0 ? cells[sourceIndex] : null;
        const text = cell ? cell.textContent : row.textContent;
        const match = String(text || '').match(/\b\d{1,3}\|\d{1,3}\b/);
        return match ? match[0] : null;
    }

    function clean(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    // =======================================================================
    // Teil 2: Schnelle Umbenennen-Buttons für eingehende Angriffe/Befehle
    // =======================================================================
    function runRenameButtons() {
        const linhas = obterLinhasValidas();
        linhas.forEach(function (linha) {
            if (isComandoProprio(linha)) {
                removerBotoes(linha);
                return;
            }
            inserirBotoes(linha);
        });
    }

    function atualizarTudoAgora() {
        const linhas = obterLinhasValidas();
        linhas.forEach(function (linha) { removerBotoes(linha); });
        runRenameButtons();
    }

    function obterLinhasValidas() {
        const linhas = Array.from(document.querySelectorAll(SELETORES.linhasAtaques))
            .concat(Array.from(document.querySelectorAll(SELETORES.linhasComandos)));

        return Array.from(new Set(linhas)).filter(function (linha) {
            return linha.querySelector(SELETORES.etiquetaNome) && linha.querySelector(SELETORES.iconeRenomear);
        });
    }

    function isComandoProprio(linha) {
        const tabela = linha.closest('table');
        if (!tabela) return false;
        const cabecalhos = Array.from(tabela.querySelectorAll('th')).map(function (th) { return clean(th.textContent); }).join(' ');
        return /\b(os seus comandos|seus comandos|your commands|own commands|eigene befehle|ihre befehle)\b/.test(cabecalhos);
    }

    function inserirBotoes(linha) {
        const containerDestino = obterContainerBotoes(linha);
        if (!containerDestino || linha.querySelector('.tpSchnell-botoes')) return;

        const container = document.createElement('span');
        container.className = 'tpSchnell-botoes';

        const coordsLinha = getCoordsFromRow(linha);
        const infoLinha = coordsLinha ? obterInfoParaCoords(coordsLinha) : null;
        if (infoLinha) {
            container.appendChild(criarInfoIcon(infoLinha));
        }

        let ultimaKategoria = null;
        COMANDOS.forEach(function (comando) {
            const botao = criarBotao(comando.label, comando.tag.trim(), comando.corBotao, comando.corTexto);
            if (ultimaKategoria !== null && ultimaKategoria !== comando.kategorie) {
                botao.classList.add('tpSchnell-grupo-start');
            }
            ultimaKategoria = comando.kategorie;

            botao.addEventListener('click', function (evento) {
                evento.preventDefault();
                evento.stopPropagation();
                editarNomeLinha(linha, function (valorAtual) { return construirNome(valorAtual, comando); });
            });
            container.appendChild(botao);
        });

        const reset = criarBotao('RS', 'Etiketten zurücksetzen', 'dark', 'white');
        reset.classList.add('tpSchnell-reset', 'tpSchnell-grupo-start');
        reset.addEventListener('click', function (evento) {
            evento.preventDefault();
            evento.stopPropagation();
            editarNomeLinha(linha, function (valorAtual) { return limparEtiquetas(valorAtual); });
        });
        container.appendChild(reset);

        containerDestino.appendChild(container);
    }

    function obterContainerBotoes(linha) {
        const quickedit = linha.querySelector(SELETORES.quickedit);
        if (quickedit) return quickedit;
        const label = linha.querySelector(SELETORES.etiquetaNome);
        return (label && (label.closest('td') || label.parentElement)) || null;
    }

    function removerBotoes(linha) {
        linha.querySelectorAll('.tpSchnell-botoes').forEach(function (el) { el.remove(); });
    }

    function criarBotao(label, titulo, corBotao, corTexto) {
        const botao = document.createElement('button');
        const background = obterCor(corBotao, 'brown');
        const texto = obterCor(corTexto, 'white');

        botao.type = 'button';
        botao.className = 'btn tpSchnell-botao';
        if (isCorEscura(corBotao)) {
            botao.classList.add('tpSchnell-botao-escuro');
        }
        botao.title = titulo;
        botao.textContent = label;
        botao.style.setProperty('font-size', CONFIG.tamanhoLetraPx + 'px', 'important');
        botao.style.color = texto.top;
        botao.style.background = 'linear-gradient(to bottom, ' + background.top + ' 35%, ' + background.bottom + ' 100%)';

        return botao;
    }

    function isCorEscura(nomeCor) {
        return ['black', 'dark'].includes(String(nomeCor || '').toLowerCase());
    }

    function obterCor(nome, fallback) {
        return CORES[String(nome || '').toLowerCase()] || CORES[fallback] || CORES.white;
    }

    async function editarNomeLinha(linha, transformarNome) {
        if (linha.dataset.tpSchnellEditando === '1') return;
        linha.dataset.tpSchnellEditando = '1';

        try {
            const icone = linha.querySelector(SELETORES.iconeRenomear);
            if (!icone) return;

            icone.click();

            const input = await esperarPor(function () {
                return linha.querySelector(SELETORES.inputNome);
            }, CONFIG.timeoutEdicaoMs, CONFIG.intervaloEsperaInputMs);

            if (!input) return;

            const novoNome = transformarNome(input.value);
            const botaoGuardar = obterBotaoGuardar(linha, input);

            if (novoNome !== input.value) {
                input.value = novoNome;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            if (botaoGuardar) {
                botaoGuardar.click();
            } else if (input.form && typeof input.form.requestSubmit === 'function') {
                input.form.requestSubmit();
            }

            setTimeout(function () { removerBotoes(linha); inserirBotoes(linha); }, 400);
            setTimeout(function () { removerBotoes(linha); inserirBotoes(linha); }, 1200);
        } finally {
            setTimeout(function () { delete linha.dataset.tpSchnellEditando; }, 500);
        }
    }

    function obterBotaoGuardar(linha, input) {
        const areaEdicao = input.closest(SELETORES.areaEdicao);
        if (areaEdicao) {
            const botao = areaEdicao.querySelector(SELETORES.botoesGuardar);
            if (botao) return botao;
        }
        const fallback = linha.querySelector(SELETORES.areaEdicao + ' ' + SELETORES.botoesGuardar);
        return fallback || null;
    }

    function esperarPor(obterValor, timeoutMs, intervaloMs) {
        const inicio = Date.now();
        return new Promise(function (resolve) {
            (function tick() {
                const valor = obterValor();
                if (valor) { resolve(valor); return; }
                if (Date.now() - inicio >= timeoutMs) { resolve(null); return; }
                setTimeout(tick, intervaloMs);
            })();
        });
    }

    function construirNome(valorAtual, comando) {
        const atual = normalizarEspacos(valorAtual);

        // Welcher Tag ist pro Kategorie aktuell aktiv (falls vorhanden)?
        const ativos = obterTagsAtivosPorCategoria(atual);

        // Der neu geklickte Tag ersetzt den ggf. aktiven Tag seiner eigenen Kategorie.
        ativos[comando.kategorie] = comando;

        return montarNomeComCategorias(atual, ativos);
    }

    function obterTagsAtivosPorCategoria(nome) {
        const ativos = {};
        KATEGORIE_ORDER.forEach(function (kategoria) {
            const encontrado = COMANDOS.find(function (item) {
                return item.kategorie === kategoria && comandoExisteNoNome(nome, item);
            });
            if (encontrado) ativos[kategoria] = encontrado;
        });
        return ativos;
    }

    function montarNomeComCategorias(nomeOriginal, ativos) {
        const base = removerTags(nomeOriginal, function () { return true; });
        let resultado = base;

        KATEGORIE_ORDER.forEach(function (kategoria) {
            if (ativos[kategoria]) resultado = normalizarEspacos(resultado + ' ' + ativos[kategoria].tag);
        });

        return normalizarEspacos(resultado);
    }

    function limparEtiquetas(valorAtual) {
        return removerTags(valorAtual, function () { return true; });
    }

    function comandoExisteNoNome(nome, comando) {
        return obterTagsComAliases(comando).some(function (tag) { return nome.includes(tag); });
    }

    function removerTags(nome, filtroComando) {
        let resultado = normalizarEspacos(nome);
        COMANDOS.filter(filtroComando).forEach(function (comando) {
            obterTagsComAliases(comando).forEach(function (tag) {
                resultado = resultado.replace(new RegExp(escapeRegExp(tag), 'g'), '');
            });
        });
        return normalizarEspacos(resultado);
    }

    function obterTagsComAliases(comando) {
        return [comando.tag].concat(comando.aliases || []).filter(Boolean);
    }

    function normalizarEspacos(valor) {
        return String(valor || '').replace(/\s+/g, ' ').trim();
    }

    function escapeRegExp(valor) {
        return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // =======================================================================
    // Styles
    // =======================================================================
    function addStyles() {
        if (document.getElementById(APP.styleId)) return;

        const style = document.createElement('style');
        style.id = APP.styleId;
        style.textContent = `
            .tpSchnell-dup-panel {
                padding: 4px 0;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px;
            }

            .tpSchnell-dup-panel .btn {
                display: inline-block !important;
                width: auto !important;
                flex: 0 0 auto;
                margin: 0 !important;
            }

            .tpSchnell-dup-badge {
                display: inline-block;
                margin-left: 4px;
                padding: 0 4px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
                color: #fff;
                line-height: 14px;
                vertical-align: middle;
            }

            .tpSchnell-botoes {
                float: right;
                display: inline-flex;
                flex-wrap: wrap;
                gap: 1px;
                align-items: center;
                justify-content: flex-end;
                margin-left: 4px;
                max-width: 100%;
                vertical-align: middle;
            }

            .tpSchnell-botao {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex: 0 0 ${CONFIG.tamanhoBotaoPx}px;
                width: ${CONFIG.tamanhoBotaoPx}px;
                min-width: ${CONFIG.tamanhoBotaoPx}px;
                max-width: ${CONFIG.tamanhoBotaoPx}px;
                height: ${CONFIG.tamanhoBotaoPx}px;
                padding: 0 ${CONFIG.paddingHorizontalBotaoPx}px !important;
                border: 1px solid rgba(0, 0, 0, 0.45) !important;
                border-radius: 3px;
                line-height: 1 !important;
                font-weight: 600;
                text-align: center !important;
                text-indent: 0 !important;
                white-space: nowrap !important;
                cursor: pointer;
                box-sizing: border-box;
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.42),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.18),
                    0 1px 1px rgba(0, 0, 0, 0.22);
                text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7);
                transition: filter 100ms ease, transform 100ms ease, box-shadow 100ms ease;
                vertical-align: middle;
            }

            .tpSchnell-botao:hover {
                filter: brightness(1.12) saturate(1.08);
                transform: translateY(-1px);
            }

            .tpSchnell-botao:active {
                filter: brightness(0.96);
                transform: translateY(0);
            }

            .tpSchnell-botao-escuro {
                border-color: rgba(255, 255, 255, 0.95) !important;
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(0, 0, 0, 0.5),
                    0 1px 1px rgba(0, 0, 0, 0.22);
            }

            .tpSchnell-reset {
                margin-left: 3px !important;
            }

            .tpSchnell-grupo-start {
                margin-left: 9px !important;
            }

            .tpSchnell-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.55);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
            }

            .tpSchnell-modal-box {
                background: #f4e4bc;
                border: 2px solid #7d510f;
                border-radius: 4px;
                padding: 14px 16px;
                max-width: 420px;
                width: 100%;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
                box-sizing: border-box;
            }

            .tpSchnell-modal-box h3 {
                margin: 0 0 8px;
                font-size: 14px;
            }

            .tpSchnell-modal-box p {
                margin: 6px 0 4px;
                font-size: 11px;
            }

            .tpSchnell-modal-box textarea,
            .tpSchnell-modal-box input[type="text"] {
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 6px;
                font-size: 12px;
                font-family: inherit;
            }

            .tpSchnell-modal-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 6px;
            }

            #tpSchnellImportResult {
                margin-top: 8px;
                font-size: 11px;
                min-height: 14px;
            }

            .tpSchnell-modal-trenner {
                margin: 12px 0 8px;
                border: none;
                border-top: 1px solid rgba(125, 81, 15, 0.4);
            }

            .tpSchnell-modal-box h4 {
                margin: 0 0 6px;
                font-size: 12px;
            }

            #tpSchnellExistSearch {
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 6px;
                font-size: 12px;
            }

            .tpSchnell-exist-list {
                max-height: 180px;
                overflow-y: auto;
                border: 1px solid rgba(125, 81, 15, 0.35);
                border-radius: 4px;
                padding: 4px;
                background: rgba(255, 255, 255, 0.35);
            }

            .tpSchnell-exist-empty {
                margin: 4px 2px;
                font-size: 11px;
                font-style: italic;
                opacity: 0.75;
            }

            .tpSchnell-exist-row {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 2px 0;
            }

            .tpSchnell-exist-row + .tpSchnell-exist-row {
                border-top: 1px solid rgba(125, 81, 15, 0.15);
            }

            .tpSchnell-exist-coords {
                flex: 0 0 auto;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                min-width: 58px;
            }

            .tpSchnell-exist-input {
                flex: 1 1 auto;
                min-width: 0;
                font-size: 11px;
                box-sizing: border-box;
            }

            .tpSchnell-exist-delete {
                flex: 0 0 auto;
                padding: 2px 6px !important;
                font-size: 11px !important;
            }

            .tpSchnell-info-icon {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                width: 14px;
                height: 14px;
                min-width: 14px;
                border-radius: 50%;
                border: 1px solid #1560a8;
                background: #eaf4ff;
                color: #1560a8;
                font-size: 9px;
                font-weight: 700;
                font-style: italic;
                margin-right: 4px;
                cursor: pointer;
                line-height: 1;
                vertical-align: middle;
                user-select: none;
            }

            .tpSchnell-info-icon:hover {
                background: #d3e9ff;
            }

            .tpSchnell-tooltip {
                position: fixed;
                z-index: 999999;
                background: rgba(20, 20, 20, 0.94);
                color: #fff;
                padding: 6px 9px;
                border-radius: 5px;
                font-size: 11px;
                line-height: 1.35;
                max-width: min(240px, calc(100vw - 16px));
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
                pointer-events: none;
                word-wrap: break-word;
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
