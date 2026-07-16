/**
 * scanner.js — Módulo de leitura de QR codes via câmera
 * 
 * Módulo: Corta Gastos Scanner
 * Usa html5-qrcode para scan via câmera no WebView do Capacitor.
 * Responsabilidades:
 *   - Iniciar/parar câmera
 *   - Ler QR codes
 *   - Alternar câmera frontal/traseira
 *   - Tratar erros de permissão
 */

window.Scanner = (() => {
    'use strict';

    let html5QrCode = null;
    let isScanning = false;
    let onResultCallback = null;
    let currentCameraId = null;
    let cameras = [];

    // ── Configuração do scanner ────────────────────────────────────

    const SCAN_CONFIG = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };

    // ── Inicialização ──────────────────────────────────────────────

    /**
     * Inicializa o scanner QR no elemento DOM especificado.
     * @param {string} elementId - ID do div container para o viewfinder
     * @param {function} onResult - Callback chamado quando QR é lido: (textoDecodificado) => void
     */
    async function iniciar(elementId, onResult) {
        if (isScanning) {
            console.warn('[Scanner] Já está escaneando');
            return;
        }

        onResultCallback = onResult;

        try {
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Biblioteca html5-qrcode não carregada');
            }

            html5QrCode = new Html5Qrcode(elementId);

            // Iniciar scan com facingMode (geralmente ativa o auto-focus e escolhe a lente principal melhor)
            await html5QrCode.start(
                { facingMode: "environment" },
                SCAN_CONFIG,
                _onScanSuccess,
                _onScanError
            );

            isScanning = true;
            console.log('[Scanner] Câmera iniciada com facingMode: environment');

        } catch (err) {
            console.error('[Scanner] Erro ao iniciar:', err);
            _tratarErro(err);
        }
    }

    /**
     * Para o scanner e libera a câmera.
     */
    async function parar() {
        if (!html5QrCode || !isScanning) return;

        try {
            await html5QrCode.stop();
            html5QrCode.clear();
            isScanning = false;
            console.log('[Scanner] Câmera parada');
        } catch (err) {
            console.error('[Scanner] Erro ao parar:', err);
        }
    }

    /**
     * Alterna entre câmera frontal e traseira.
     */
    async function alternarCamera() {
        if (!isScanning || cameras.length < 2) return;

        const indiceAtual = cameras.findIndex(c => c.id === currentCameraId);
        const proximoIndice = (indiceAtual + 1) % cameras.length;
        currentCameraId = cameras[proximoIndice].id;

        await parar();
        await iniciar(html5QrCode._elementId || 'scanner-viewfinder', onResultCallback);
    }

    /**
     * Retorna se o scanner está ativo.
     */
    function estaEscaneando() {
        return isScanning;
    }

    // ── Callbacks internos ─────────────────────────────────────────

    function _onScanSuccess(decodedText, decodedResult) {
        // Vibração feedback (se disponível)
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Parar scan para processar (evita leituras duplicadas)
        parar();

        // Callback para o app
        if (onResultCallback) {
            onResultCallback(decodedText);
        }
    }

    function _onScanError(errorMessage) {
        // Erros de scan são normais (frames sem QR), silenciar
    }

    // ── Utilitários ────────────────────────────────────────────────

    /**
     * Encontra a câmera traseira na lista. Fallback para a primeira.
     */
    function _encontrarCameraTraseira(cameras) {
        // Heurística: câmeras traseiras geralmente têm "back", "rear", "environment" no label
        const traseira = cameras.find(c =>
            /back|rear|environment|traseira/i.test(c.label)
        );
        return (traseira || cameras[cameras.length - 1]).id;
    }

    /**
     * Trata erros de câmera e exibe mensagens amigáveis.
     */
    function _tratarErro(err) {
        const msg = err.message || err.toString();

        if (msg === 'CAMERA_NOT_FOUND' || /NotFoundError/i.test(msg)) {
            App.toast('📷 Nenhuma câmera encontrada. Use a opção de colar a chave.', 'warning');
        } else if (/NotAllowedError|Permission/i.test(msg)) {
            App.toast('🔒 Permissão de câmera negada. Habilite nas configurações.', 'error');
        } else if (/NotReadableError|TrackStartError/i.test(msg)) {
            App.toast('📷 Câmera em uso por outro aplicativo.', 'warning');
        } else if (/OverconstrainedError/i.test(msg)) {
            App.toast('📷 Câmera não suporta a configuração solicitada.', 'warning');
        } else {
            App.toast(`📷 Erro na câmera: ${msg}`, 'error');
        }
    }

    // ── API Pública ────────────────────────────────────────────────
    return {
        iniciar,
        parar,
        alternarCamera,
        estaEscaneando
    };
})();
