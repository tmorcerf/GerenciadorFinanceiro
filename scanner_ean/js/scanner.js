/**
 * Scanner EAN Wrapper usando html5-qrcode
 */
const Scanner = (function() {
    let html5QrCode = null;
    let isScanning = false;
    let scanCallback = null;

    const SCAN_CONFIG = {
        fps: 10,
        qrbox: { width: 300, height: 150 }, // Retângulo para EAN
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        formatsToSupport: [ 
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128
        ],
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };

    function init(elementId, onResult) {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode(elementId);
        }
        scanCallback = onResult;
        return html5QrCode;
    }

    async function start() {
        if (!html5QrCode) return;
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                SCAN_CONFIG,
                _onScanSuccess,
                _onScanError
            );
            isScanning = true;
        } catch (err) {
            console.error('[Scanner] Erro ao iniciar:', err);
        }
    }

    async function stop() {
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop();
                isScanning = false;
            } catch (err) {
                console.error('[Scanner] Erro ao parar:', err);
            }
        }
    }

    function _onScanSuccess(decodedText) {
        if (!isScanning) return;
        
        // Pausar scanner após leitura
        if (html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
            html5QrCode.pause();
        }

        if (scanCallback) {
            scanCallback(decodedText);
        }
    }

    function _onScanError(error) {
        // Ignorado
    }

    function retomar() {
        if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.PAUSED) {
            html5QrCode.resume();
        }
    }

    return {
        init,
        start,
        stop,
        retomar,
        isScanning: () => isScanning
    };
})();
