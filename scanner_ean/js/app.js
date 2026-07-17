/**
 * App principal do Scanner de Produtos (EAN)
 */
const App = (function() {

    let _produtoAtual = null;

    let modoManualIniciado = false;
    let modoAtual = 'camera'; // 'camera' ou 'manual'

    // Inicialização
    document.addEventListener('DOMContentLoaded', async () => {
        Scanner.init('scanner-viewfinder', _onEANLido);
        
        const isNative = window.parent && window.parent.Capacitor && window.parent.Capacitor.isNativePlatform && window.parent.Capacitor.isNativePlatform();
        
        if (!isNative && !modoManualIniciado) {
            modoManualIniciado = true;
            abrirModoManual();
            return;
        }

        // Se Iniciar imediatamente:
        if (modoAtual === 'camera') {
            setTimeout(() => {
                Scanner.start();
                _atualizarStatus('Aguardando código de barras...', 'loading');
            }, 500);
        }
    });

    function toggleScannerMode() {
        if (modoAtual === 'camera') {
            abrirModoManual();
        } else {
            abrirModoCâmera();
        }
    }

    function abrirModoManual() {
        modoAtual = 'manual';
        Scanner.stop();
        document.getElementById('camera-section').style.display = 'none';
        document.getElementById('manual-section').style.display = 'flex';
        
        const btnToggle = document.getElementById('btn-toggle-mode');
        if(btnToggle) {
            btnToggle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                Usar Câmera
            `;
        }
        document.getElementById('btn-flip-camera').style.display = 'none';
        document.getElementById('input-chave-manual').focus();
    }

    function abrirModoCâmera() {
        modoAtual = 'camera';
        document.getElementById('manual-section').style.display = 'none';
        document.getElementById('camera-section').style.display = 'block';
        
        const btnToggle = document.getElementById('btn-toggle-mode');
        if(btnToggle) {
            btnToggle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Digitar EAN
            `;
        }
        document.getElementById('btn-flip-camera').style.display = 'inline-flex';
        setTimeout(() => {
            Scanner.start();
            _atualizarStatus('Aguardando código de barras...', 'loading');
        }, 500);
    }

    function processarChaveManual() {
        const ean = document.getElementById('input-chave-manual').value.trim();
        if (!ean) return;
        abrirModoCâmera();
        _onEANLido(ean);
    }

    async function _onEANLido(ean) {
        _atualizarStatus(`Código lido: ${ean}. Buscando...`, 'loading');
        
        try {
            const produto = await _buscarProduto(ean);
            _mostrarProduto(produto);
        } catch (err) {
            _atualizarStatus(`Erro: ${err.message}`, 'error');
            setTimeout(() => Scanner.retomar(), 3000);
        }
    }

    async function _buscarProduto(ean) {
        // 1. Buscar no DB local (Firebase)
        if (window.parent && window.parent.DB) {
            const gid = window.parent.userGroupId;
            const snapshot = await window.parent.DB.db.collection('Produtos')
                .where('groupId', '==', gid)
                .where('ean', '==', ean)
                .get();
            
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                return {
                    ean: data.ean,
                    descricao: data.descricao_oficial || data.descricao_ia || data.descricao_sefaz || data.descricao_padrao,
                    preco: data.ultimo_preco,
                    fonte: 'Meus Produtos (Firebase)'
                };
            }
        }

        // 2. Buscar na API OpenFoodFacts
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
            const data = await response.json();
            if (data.status === 1 && data.product) {
                let nome = data.product.product_name_pt || data.product.product_name;
                if (data.product.brands) {
                    nome += ` - ${data.product.brands}`;
                }
                if (data.product.quantity) {
                    nome += ` (${data.product.quantity})`;
                }
                
                return {
                    ean: ean,
                    descricao: nome || 'Produto sem nome',
                    preco: 0,
                    fonte: 'OpenFoodFacts'
                };
            }
        } catch (e) {
            console.error('Erro na API OpenFoodFacts:', e);
        }

        // 3. Fallback genérico
        return {
            ean: ean,
            descricao: 'Produto Desconhecido',
            preco: 0,
            fonte: 'Não encontrado'
        };
    }

    function _mostrarProduto(produto) {
        _atualizarStatus('Produto encontrado!', 'success');
        
        const container = document.getElementById('quick-history-list'); // Reusing container from UI
        if (container) {
            container.innerHTML = `
                <div class="lancamento-card" style="padding: 1.5rem; text-align: left;">
                    <div style="font-size: 0.85rem; color: var(--color-accent); margin-bottom: 0.5rem; font-weight: 600;">
                        EAN: ${produto.ean}
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;">
                        ${produto.descricao}
                    </div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-success); margin-bottom: 1rem;">
                        ${produto.preco ? 'R$ ' + produto.preco.toFixed(2) : 'Preço não registrado'}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        Fonte: ${produto.fonte}
                    </div>
                    
                    <button class="btn-primary" style="margin-top: 1.5rem; width: 100%;" onclick="Scanner.retomar(); document.getElementById('quick-history-list').innerHTML=''; App.resetStatus();">
                        Escanear Outro
                    </button>
                </div>
            `;
        }
    }

    function _atualizarStatus(texto, tipo) {
        const status = document.getElementById('resultado-status');
        if (!status) return;

        const icons = { loading: '...', success: '✓', warning: '!', error: 'X' };
        status.innerHTML = `
            <div class="status-icon">${icons[tipo] || '...'}</div>
            <div class="status-text">${texto}</div>
        `;
        status.className = `status-bar status-${tipo}`;
    }
    
    function resetStatus() {
        _atualizarStatus('Aguardando código de barras...', 'loading');
    }

    function irPara(idTela) {
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
        const tela = document.getElementById(idTela);
        if (tela) tela.classList.add('active');
    }

    return {
        irPara,
        resetStatus,
        toggleScannerMode,
        processarChaveManual
    };
})();
