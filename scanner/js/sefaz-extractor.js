/**
 * sefaz-extractor.js — Módulo de extração de dados via InAppBrowser
 * 
 * Módulo: Corta Gastos Scanner
 * Responsabilidades:
 *   - Abrir URL da SEFAZ no InAppBrowser (WebView gerenciado)
 *   - Injetar script extrator no DOM após carregamento
 *   - Receber dados via messageFromWebview
 *   - Fallback para Gemini Vision se extração DOM falhar
 *   - Gerenciar timeout e cleanup de listeners
 * 
 * Plugin: @capgo/capacitor-inappbrowser
 */

window.SefazExtractor = (() => {
    'use strict';

    let InAppBrowser = null;
    let _isExtracting = false;

    // ── Inicialização ──────────────────────────────────────────────

    /**
     * Inicializa o módulo, carregando o plugin Capacitor.
     */
    async function init() {
        try {
            if (window.Capacitor && window.Capacitor.Plugins) {
                // O nome do plugin no Android pode ser "CapgoInAppBrowser" ou "InAppBrowser" dependendo da versão
                InAppBrowser = window.Capacitor.Plugins.CapgoInAppBrowser || window.Capacitor.Plugins.InAppBrowser;
                
                if (InAppBrowser) {
                    console.log('[SefazExtractor] Plugin InAppBrowser carregado nativamente');
                } else {
                    console.warn('[SefazExtractor] InAppBrowser não encontrado nos Plugins do Capacitor.');
                    InAppBrowser = null;
                }
            }
        } catch (err) {
            console.warn('[SefazExtractor] Erro ao inicializar InAppBrowser:', err.message);
            InAppBrowser = null;
        }
    }

    // ── Extração Principal ─────────────────────────────────────────

    /**
     * Fluxo completo de extração de dados de uma nota fiscal.
     * 
     * 1. Abre URL SEFAZ no InAppBrowser
     * 2. Aguarda carregamento da página
     * 3. Injeta script extrator (específico por UF ou genérico)
     * 4. Recebe dados via postMessage
     * 5. Se falhar, tenta Gemini Vision como fallback
     * 
     * @param {string} url - URL da SEFAZ (do QR code)
     * @param {string} uf - Sigla do estado
     * @returns {Promise<{ sucesso: boolean, dados: object, metodo: string }>}
     */
    async function extrair(url, uf) {
        if (_isExtracting) {
            return { sucesso: false, dados: null, metodo: null, erro: 'Extração já em andamento' };
        }

        // Se InAppBrowser não disponível (modo dev), usar fallback
        if (!InAppBrowser) {
            console.warn('[SefazExtractor] InAppBrowser não disponível, abrindo no browser');
            window.open(url, '_blank');
            return {
                sucesso: false,
                dados: null,
                metodo: 'browser_externo',
                erro: 'InAppBrowser não disponível. Nota aberta no browser externo.'
            };
        }

        _isExtracting = true;

        try {
            const resultado = await _abrirEExtrair(url, uf);
            return resultado;
        } catch (err) {
            console.error('[SefazExtractor] Erro na extração:', err);
            return {
                sucesso: false,
                dados: null,
                metodo: 'erro',
                erro: err.message
            };
        } finally {
            _isExtracting = false;
        }
    }

    /**
     * Abre o InAppBrowser e coordena a extração.
     */
    function _abrirEExtrair(url, uf) {
        return new Promise(async (resolve, reject) => {
            let timeoutId = null;
            let pageLoaded = false;
            let tentativas = 0;
            const MAX_TENTATIVAS = 2; // 1 script específico + 1 genérico

            // Cleanup function
            const cleanup = async () => {
                if (timeoutId) clearTimeout(timeoutId);
                try {
                    await InAppBrowser.removeAllListeners();
                    await InAppBrowser.close();
                } catch (e) { /* ignorar erros de cleanup */ }
            };

            try {
                // 1. Abrir WebView
                await InAppBrowser.openWebView({
                    url: url,
                    title: 'Consultando nota...',
                    toolbarColor: '#0f172a',
                    closeButtonColor: '#ffffff',
                    showArrow: true,
                    isPresentAfterPageLoad: true
                });

                let extraidoComSucesso = false;

                // 2. Listener: página carregou
                await InAppBrowser.addListener('browserPageLoaded', async (event) => {
                    if (extraidoComSucesso) return;
                    console.log('[SefazExtractor] Página carregada:', event?.url);

                    // Delay para garantir que JS da SEFAZ renderizou (anti-bots, JSF)
                    await _delay(3000);
                    
                    if (extraidoComSucesso) return;

                    // Injetar script específico
                    const script = SefazScripts.getScript(uf);
                    try {
                        await InAppBrowser.executeScript({ code: script });
                        console.log('[SefazExtractor] Script específico injetado.');
                    } catch (e) {
                        console.error('[SefazExtractor] Erro ao injetar script:', e);
                    }
                });

                // 3. Listener: mensagem do WebView (dados extraídos)
                await InAppBrowser.addListener('messageFromWebview', async (event) => {
                    if (extraidoComSucesso) return;

                    let dados;
                    try {
                        // O plugin Capgo InAppBrowser envia o evento com diferentes estruturas dependendo da plataforma
                        const raw = event.data?.message || event.message || event.data || event || '{}';
                        dados = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        
                        // Se por acaso o parse retornou um objeto que tem um "message" dentro que é string
                        if (dados && typeof dados.message === 'string') {
                            dados = JSON.parse(dados.message);
                        }
                    } catch (e) { return; }

                    console.log('[SefazExtractor] Dados recebidos (bruto):', JSON.stringify(dados).substring(0, 100) + '...');

                    if (dados.itens && dados.itens.length > 0) {
                        extraidoComSucesso = true;
                        await cleanup();
                        resolve({
                            sucesso: true,
                            dados: dados,
                            metodo: dados.metodo || 'dom',
                            erro: null
                        });
                    } else {
                        console.log('[SefazExtractor] Tentativa falhou (0 itens). Aguardando...');
                        
                        // Agenda um retry com script genérico se o específico não achou nada
                        // Isso é útil caso a página não tenha recarregado (não teve outro browserPageLoaded)
                        setTimeout(async () => {
                            if (!extraidoComSucesso) {
                                console.log('[SefazExtractor] Tentando script genérico de fallback...');
                                try {
                                    await InAppBrowser.executeScript({ code: SefazScripts.getScript('XX') });
                                } catch (e) {}
                            }
                        }, 3000);
                    }
                });

                // 4. Listener: WebView fechado pelo usuário
                await InAppBrowser.addListener('browserFinished', async () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    await InAppBrowser.removeAllListeners();

                    if (!extraidoComSucesso) {
                        resolve({
                            sucesso: false,
                            dados: { valorTotal: 0, itens: [] },
                            metodo: 'cancelado',
                            erro: 'Consulta cancelada pelo usuário (tela fechada).'
                        });
                    }
                });

                // 5. Timeout de segurança (60 segundos)
                timeoutId = setTimeout(async () => {
                    console.warn('[SefazExtractor] Timeout — SEFAZ não respondeu em 60s');
                    await cleanup();
                    resolve({
                        sucesso: false,
                        dados: null,
                        metodo: 'timeout',
                        erro: 'A SEFAZ demorou demais para responder. Tente novamente.'
                    });
                }, 60000);

            } catch (err) {
                await cleanup();
                reject(err);
            }
        });
    }

    // ── Utilitários ────────────────────────────────────────────────

    function _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifica se o InAppBrowser está disponível (Capacitor nativo).
     */
    function isDisponivel() {
        return InAppBrowser !== null;
    }

    /**
     * Retorna se uma extração está em andamento.
     */
    function isExtraindo() {
        return _isExtracting;
    }

    // ── API Pública ────────────────────────────────────────────────
    return {
        init,
        extrair,
        isDisponivel,
        isExtraindo
    };
})();
