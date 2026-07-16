/**
 * app.js — Módulo principal do Corta Gastos Scanner
 * 
 * Responsabilidades:
 *   - Inicialização do app
 *   - Navegação entre telas
 *   - Orquestração do fluxo: scan → parse → extração → resultado → salvar
 *   - Toast notifications
 *   - Renderização de UI
 */

window.App = (() => {
    'use strict';

    let _notaAtual = null; // Dados da nota sendo processada

    // ── Inicialização ──────────────────────────────────────────────

    async function init() {
        console.log('[App] Inicializando Corta Gastos Scanner...');

        // 0. Aguardar autenticação do Firebase
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (!user) {
                toast('⚠️ Sessão expirada. Redirecionando...', 'warning');
                setTimeout(() => window.location.href = '../index.html', 1500);
                return;
            }
            window.currentUser = user;
            
            // Pegar o groupId do perfil
            const userDoc = await window.firebaseDB.collection('Users').doc(user.uid).get();
            if (userDoc.exists) {
                window.userGroupId = userDoc.data().groupId || user.uid;
            } else {
                window.userGroupId = user.uid;
            }

            // 1. Carregar storage
            await Storage.init();

            // 2. Inicializar extrator SEFAZ (carrega plugin InAppBrowser)
            await SefazExtractor.init();

            // 3. Verificar Gemini
            _atualizarStatusGemini();

            // 4. Renderizar histórico rápido
            _renderizarHistoricoRapido();

            // 5. Atualizar stats
            _atualizarEstatisticas();

            // 6. Iniciar scanner na tela principal
            _iniciarScanner();

            console.log('[App] Pronto!');
        });
    }

    // ── Navegação ──────────────────────────────────────────────────

    function irPara(telaId) {
        // Desativar todas as telas
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));

        // Ativar tela destino
        const tela = document.getElementById(telaId);
        if (tela) tela.classList.add('active');

        // Atualizar nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navMap = {
            'tela-scanner': 0,
            'tela-historico': 1,
            'tela-config': 2
        };
        const navItems = document.querySelectorAll(`#${telaId} .nav-item, .bottom-nav .nav-item`);
        if (navMap[telaId] !== undefined) {
            document.querySelectorAll('.bottom-nav').forEach(nav => {
                const items = nav.querySelectorAll('.nav-item');
                items.forEach(i => i.classList.remove('active'));
                if (items[navMap[telaId]]) items[navMap[telaId]].classList.add('active');
            });
        }

        // Ações por tela
        if (telaId === 'tela-scanner') {
            _iniciarScanner();
        } else {
            Scanner.parar();
        }

        if (telaId === 'tela-historico') {
            _renderizarHistorico();
        }

        if (telaId === 'tela-config') {
            _atualizarEstatisticas();
        }
    }

    // ── Scanner ────────────────────────────────────────────────────

    function _iniciarScanner() {
        if (!Scanner.estaEscaneando()) {
            Scanner.iniciar('scanner-viewfinder', _onQRCodeLido);
        }
    }

    /**
     * Callback quando um QR code é lido com sucesso.
     */
    async function _onQRCodeLido(textoDecodificado) {
        console.log('[App] QR lido:', textoDecodificado);

        // 1. Parsear a chave
        const resultado = ChaveParser.processar(textoDecodificado);

        if (!resultado.sucesso) {
            if (resultado.dados?.isContingencia) {
                toast('⏭️ Nota em contingência — sem dados na SEFAZ', 'warning');
                // Reiniciar scanner
                setTimeout(() => _iniciarScanner(), 2000);
                return;
            }
            toast(`❌ ${resultado.erro}`, 'error');
            setTimeout(() => _iniciarScanner(), 2000);
            return;
        }

        const dados = resultado.dados;
        console.log('[App] Chave parseada:', dados);

        // 2. Verificar duplicata
        const dup = Storage.verificarDuplicata(dados.chave);
        if (dup.duplicada) {
            const dataExistente = new Date(dup.nota.criadoEm).toLocaleDateString('pt-BR');
            toast(`⚠️ Nota já escaneada em ${dataExistente}`, 'warning');
            setTimeout(() => _iniciarScanner(), 2000);
            return;
        }

        // 3. Ir para tela de resultado
        _notaAtual = {
            chaveAcesso: dados.chave,
            cnpj: dados.cnpj,
            cnpjFormatado: dados.cnpjFormatado,
            uf: dados.siglaUF,
            nomeUF: dados.nomeUF,
            modelo: dados.modelo,
            modeloDesc: dados.modeloDesc,
            serie: dados.serie,
            numeroNota: dados.nNF,
            numeroNotaFormatado: dados.nNFFormatado,
            dataEmissao: dados.dataEmissao,
            url: dados.url,
            valorTotal: dados.valorURL || 0,
            itens: [],
            estabelecimento: 'Identificando...',
            razaoSocial: '',
            categoria: 'Outros',
            geminiConfianca: 'baixa',
            metodoExtracao: 'pendente'
        };

        irPara('tela-resultado');
        _renderizarResultado(_notaAtual, 'processando');

        // 4. Processar em paralelo: extração SEFAZ + identificação Gemini
        await _processarNota(dados);
    }

    /**
     * Processa nota: extrai dados da SEFAZ e identifica o estabelecimento.
     */
    async function _processarNota(dadosChave) {
        // A. Extração via InAppBrowser
        let extracao = { sucesso: false, dados: null };

        if (dadosChave.url && SefazExtractor.isDisponivel()) {
            _atualizarStatus('🌐 Abrindo SEFAZ...', 'loading');
            extracao = await SefazExtractor.extrair(dadosChave.url, dadosChave.siglaUF);

            if (extracao.sucesso && extracao.dados) {
                _notaAtual.valorTotal = extracao.dados.valorTotal || _notaAtual.valorTotal;
                _notaAtual.itens = extracao.dados.itens || [];
                _notaAtual.metodoExtracao = extracao.metodo;
                _atualizarStatus(`✅ ${_notaAtual.itens.length} itens extraídos`, 'success');
            } else {
                _notaAtual.metodoExtracao = extracao.metodo || 'falhou';
                _atualizarStatus('⚠️ Extração parcial — preencha manualmente', 'warning');
            }
        } else if (!SefazExtractor.isDisponivel()) {
            _atualizarStatus('📱 InAppBrowser não disponível (modo dev)', 'warning');
            _notaAtual.metodoExtracao = 'dev_mode';
        } else {
            _atualizarStatus('⚠️ URL da SEFAZ não encontrada', 'warning');
        }

        // B. Identificação do estabelecimento via Gemini
        if (GeminiService.isConfigurado()) {
            const estab = await GeminiService.identificarEstabelecimento(
                _notaAtual.cnpjFormatado,
                _notaAtual.uf,
                _notaAtual.nomeUF
            );
            _notaAtual.estabelecimento = estab.nomeFantasia;
            _notaAtual.razaoSocial = estab.razaoSocial;
            _notaAtual.categoria = estab.categoria;
            _notaAtual.geminiConfianca = estab.confianca;
        } else {
            _notaAtual.estabelecimento = `CNPJ: ${_notaAtual.cnpjFormatado}`;
        }

        // C. Renderizar resultado final
        _renderizarResultado(_notaAtual, 'completo');
    }

    // ── Input Manual ───────────────────────────────────────────────

    function mostrarInputManual() {
        Scanner.parar();
        document.getElementById('modal-manual').classList.add('active');
        document.getElementById('input-chave-manual').focus();
    }

    function fecharModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('modal-manual').classList.remove('active');
        document.getElementById('input-chave-manual').value = '';
        _iniciarScanner();
    }

    function processarChaveManual() {
        const input = document.getElementById('input-chave-manual').value.trim();
        if (!input) {
            toast('Cole a chave de acesso ou URL', 'warning');
            return;
        }
        document.getElementById('modal-manual').classList.remove('active');
        _onQRCodeLido(input);
    }

    // ── Salvar Nota ────────────────────────────────────────────────

    async function salvarNota() {
        if (!_notaAtual) {
            toast('Nenhuma nota para salvar', 'error');
            return;
        }

        try {
            // Injetar produtos no Banco de Dados com NOME CORRETO
            if (window.DB && _notaAtual.itens) {
                const itensComEan = _notaAtual.itens.filter(i => i.codigo && /^\d{8,14}$/.test(i.codigo));
                
                if (itensComEan.length > 0) {
                    _atualizarStatus(`Buscando nomes reais de ${itensComEan.length} produtos...`, 'loading');
                    toast(`Buscando nomes reais na internet... aguarde!`, 'warning');
                    
                    let produtosToSave = [];
                    for (const i of itensComEan) {
                        const descricaoSefaz = i.descricao; // Nome original da nota fiscal
                        let descricaoOficial = ""; // Nome puxado da internet
                        
                        try {
                            const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${i.codigo}.json`);
                            const data = await resp.json();
                            if (data.status === 1 && data.product) {
                                let nome = data.product.product_name_pt || data.product.product_name;
                                if (nome) {
                                    if (data.product.brands) nome += ` - ${data.product.brands}`;
                                    if (data.product.quantity) nome += ` (${data.product.quantity})`;
                                    descricaoOficial = nome;
                                }
                            }
                        } catch (e) {
                            console.error(`Erro ao buscar produto ${i.codigo}:`, e);
                        }

                        produtosToSave.push({
                            ean: i.codigo,
                            descricao_sefaz: descricaoSefaz,
                            descricao_oficial: descricaoOficial,
                            descricao_ia: '', // A ser preenchido futuramente por rotina de DEV
                            preco: i.valorUnitario || (i.valorTotal / (i.quantidade || 1)) || 0
                        });
                    }

                    try {
                        await window.DB.saveProdutosBatch(produtosToSave);
                        console.log(`[App] ${produtosToSave.length} produtos injetados no DB.`);
                    } catch (e) {
                        console.error('[App] Erro ao injetar produtos no DB:', e);
                    }
                }
            }

            const salva = await Storage.salvar(_notaAtual);
            toast('✅ Nota salva com sucesso!', 'success');
            _notaAtual = null;
            _renderizarHistoricoRapido();
            irPara('tela-scanner');
        } catch (err) {
            toast(`❌ Erro ao salvar: ${err.message}`, 'error');
        }
    }

    // ── Histórico ──────────────────────────────────────────────────

    function _renderizarHistoricoRapido() {
        const container = document.getElementById('quick-history-list');
        const notas = Storage.listar({ limite: 3 });

        if (notas.length === 0) {
            container.innerHTML = `
                <div class="empty-state-mini">
                    <span>📋</span>
                    <p>Nenhuma nota escaneada ainda</p>
                </div>`;
            return;
        }

        container.innerHTML = notas.map(n => `
            <div class="history-item-mini" onclick="App.verNota('${n.id}')">
                <span class="hi-emoji">${_emojiCategoria(n.categoria)}</span>
                <span class="hi-nome">${_truncar(n.estabelecimento, 22)}</span>
                <span class="hi-data">${_formatarData(n.dataEmissao)}</span>
                <span class="hi-valor">${_formatarMoeda(n.valorTotal)}</span>
            </div>
        `).join('');
    }

    function _renderizarHistorico() {
        const container = document.getElementById('historico-lista');
        const busca = document.getElementById('input-busca')?.value || '';
        const notas = Storage.listar({ busca });

        // Stats
        const stats = Storage.estatisticas();
        const statsContainer = document.getElementById('historico-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat"><span class="stat-valor">${stats.total}</span><span class="stat-label">Notas</span></div>
                <div class="stat"><span class="stat-valor">${_formatarMoeda(stats.valorTotal)}</span><span class="stat-label">Total</span></div>
                <div class="stat"><span class="stat-valor">${stats.totalItens}</span><span class="stat-label">Itens</span></div>
            `;
        }

        if (notas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <h3>${busca ? 'Nenhum resultado' : 'Nenhuma nota escaneada'}</h3>
                    <p>${busca ? 'Tente outro termo de busca' : 'Escaneie o QR code de uma nota fiscal'}</p>
                    ${!busca ? '<button class="btn-primary" onclick="App.irPara(\'tela-scanner\')">📷 Escanear Nota</button>' : ''}
                </div>`;
            return;
        }

        container.innerHTML = notas.map(n => `
            <div class="history-item" onclick="App.verNota('${n.id}')">
                <div class="hi-left">
                    <span class="hi-emoji-lg">${_emojiCategoria(n.categoria)}</span>
                    <div>
                        <h4>${n.estabelecimento}</h4>
                        <p class="text-muted">${_formatarData(n.dataEmissao)} • ${n.itens?.length || 0} itens • ${n.uf}</p>
                    </div>
                </div>
                <div class="hi-right">
                    <span class="hi-valor-lg">${_formatarMoeda(n.valorTotal)}</span>
                    <span class="badge badge-${n.metodoExtracao === 'dom' ? 'success' : 'info'}">${n.metodoExtracao}</span>
                </div>
            </div>
        `).join('');
    }

    function filtrarHistorico() {
        _renderizarHistorico();
    }

    function verNota(id) {
        const nota = Storage.buscarPorId(id);
        if (!nota) {
            toast('Nota não encontrada', 'error');
            return;
        }
        _notaAtual = nota;
        irPara('tela-resultado');
        _renderizarResultado(nota, 'completo');
        // Trocar botão salvar para deletar se nota já salva
        const btnSalvar = document.getElementById('btn-salvar');
        btnSalvar.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Excluir Nota`;
        btnSalvar.className = 'btn-danger btn-lg';
        btnSalvar.onclick = async () => {
            await Storage.remover(id);
            toast('🗑️ Nota excluída', 'success');
            _renderizarHistoricoRapido();
            irPara('tela-historico');
        };
    }

    // ── Exportação ─────────────────────────────────────────────────

    function exportarNotas() {
        const exportData = Storage.exportarJSON();
        if (exportData.totalNotas === 0) {
            toast('Nenhuma nota para exportar', 'warning');
            return;
        }

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `corta-gastos-scanner-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast(`📤 ${exportData.totalNotas} notas exportadas`, 'success');
    }

    // ── Dados ──────────────────────────────────────────────────────

    async function limparDados() {
        if (confirm('⚠️ Tem certeza? Todos os dados serão apagados permanentemente.')) {
            localStorage.removeItem('cgs_notas');
            if (window.Capacitor?.Plugins?.Preferences) {
                await window.Capacitor.Plugins.Preferences.remove({ key: 'cgs_notas' });
            }
            await Storage.init();
            _renderizarHistoricoRapido();
            _atualizarEstatisticas();
            toast('🗑️ Dados apagados', 'success');
        }
    }

    // ── Renderização ───────────────────────────────────────────────

    function _renderizarResultado(nota, status) {
        // Estabelecimento
        document.getElementById('estab-nome').textContent = nota.estabelecimento;
        document.getElementById('estab-cnpj').textContent = nota.cnpjFormatado;
        document.getElementById('estab-emoji').textContent = _emojiCategoria(nota.categoria);
        document.getElementById('estab-uf').textContent = `📍 ${nota.uf}`;
        document.getElementById('estab-modelo').textContent = `📄 ${nota.modeloDesc} nº ${nota.numeroNotaFormatado || nota.numeroNota}`;
        document.getElementById('estab-data').textContent = `📅 ${_formatarData(nota.dataEmissao)}`;

        // Badge de confiança
        const badge = document.getElementById('estab-confianca');
        badge.textContent = nota.geminiConfianca;
        badge.className = `badge badge-${nota.geminiConfianca === 'alta' ? 'success' : nota.geminiConfianca === 'media' ? 'warning' : 'default'}`;

        // Itens
        const itensLista = document.getElementById('itens-lista');
        const itensCount = document.getElementById('itens-count');

        if (nota.itens && nota.itens.length > 0) {
            itensCount.textContent = `${nota.itens.length} itens`;
            itensLista.innerHTML = nota.itens.map((item, i) => `
                <div class="item-card">
                    <div class="item-top">
                        <span class="item-desc">${item.descricao}</span>
                        <span class="item-total">${_formatarMoeda(item.valorTotal)}</span>
                    </div>
                    <div class="item-bottom">
                        <span class="text-muted">${item.quantidade} ${item.unidade} × ${_formatarMoeda(item.valorUnitario)}</span>
                        ${item.codigo ? `<span class="item-code">${item.codigo}</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            itensCount.textContent = '0 itens';
            itensLista.innerHTML = `
                <div class="empty-state-mini">
                    <p>${status === 'processando' ? '⏳ Extraindo itens...' : '📝 Nenhum item extraído'}</p>
                </div>`;
        }

        // Valor total
        document.getElementById('valor-total').textContent = _formatarMoeda(nota.valorTotal);

        // Restaurar botão salvar
        if (status !== 'visualizando') {
            const btnSalvar = document.getElementById('btn-salvar');
            btnSalvar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                Salvar Nota`;
            btnSalvar.className = 'btn-primary btn-lg';
            btnSalvar.onclick = () => App.salvarNota();
        }
    }

    function _atualizarStatus(texto, tipo) {
        const status = document.getElementById('resultado-status');
        if (!status) return;

        const icons = { loading: '⏳', success: '✅', warning: '⚠️', error: '❌' };
        status.innerHTML = `
            <div class="status-icon">${icons[tipo] || '⏳'}</div>
            <div class="status-text">${texto}</div>
        `;
        status.className = `status-bar status-${tipo}`;
    }

    function _atualizarStatusGemini() {
        const el = document.getElementById('gemini-status');
        if (!el) return;

        if (GeminiService.isConfigurado()) {
            el.innerHTML = '<span class="dot dot-green"></span><span>Configurado ✅</span>';
        } else {
            el.innerHTML = '<span class="dot dot-red"></span><span>Não configurado — edite gemini-service.js</span>';
        }
    }

    function _atualizarEstatisticas() {
        const stats = Storage.estatisticas();
        const el = (id) => document.getElementById(id);

        if (el('stat-total-notas')) el('stat-total-notas').textContent = stats.total;
        if (el('stat-total-valor')) el('stat-total-valor').textContent = _formatarMoeda(stats.valorTotal);
        if (el('stat-total-itens')) el('stat-total-itens').textContent = stats.totalItens;
        if (el('stat-estados')) el('stat-estados').textContent = stats.estados.length;
    }

    // ── Toast ──────────────────────────────────────────────────────

    function toast(mensagem, tipo = 'info') {
        const container = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${tipo}`;
        toastEl.textContent = mensagem;
        container.appendChild(toastEl);

        // Animar entrada
        requestAnimationFrame(() => toastEl.classList.add('show'));

        // Auto-remover
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 300);
        }, 3500);
    }

    // ── Utilitários ────────────────────────────────────────────────

    function _formatarMoeda(valor) {
        if (!valor && valor !== 0) return 'R$ —';
        return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function _formatarData(data) {
        if (!data) return '—';
        if (data.length === 7) { // "2026-07"
            const [ano, mes] = data.split('-');
            return `${mes}/${ano}`;
        }
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function _truncar(texto, max) {
        if (!texto) return '';
        return texto.length > max ? texto.substring(0, max) + '…' : texto;
    }

    function _emojiCategoria(cat) {
        const emojis = {
            'Alimentação': '🛒', 'Transporte': '🚗', 'Combustível': '⛽',
            'Moradia': '🏠', 'Saúde': '💊', 'Educação': '📚',
            'Lazer': '🎮', 'Vestuário': '👕', 'Serviços': '🔧',
            'Outros': '📦'
        };
        return emojis[cat] || '📦';
    }

    // ── Boot ────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', init);

    // ── API Pública ────────────────────────────────────────────────
    return {
        init,
        irPara,
        toast,
        mostrarInputManual,
        fecharModal,
        processarChaveManual,
        salvarNota,
        verNota,
        exportarNotas,
        filtrarHistorico,
        limparDados
    };
})();
