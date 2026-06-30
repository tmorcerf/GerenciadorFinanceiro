let APPS_SCRIPT_WEBAPP_URL = localStorage.getItem('SCANNER_API_URL') || 'https://script.google.com/macros/s/AKfycbzprz-nB2uI3KUnlJl8BPdn59WfeabOV1q5E8SQOCOesw7_a9wi_4oRsTTvXf7dAeuM/exec';
let html5QrCode;

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const statusContainer = document.getElementById("status-container");
  const statusSpinner = document.getElementById("status-spinner");
  const statusMessage = document.getElementById("status-message");
  const resultsArea = document.getElementById("results-area");

  const configInput = document.getElementById("scanner-api-url");
  const saveConfigBtn = document.getElementById("save-config-btn");

  if (APPS_SCRIPT_WEBAPP_URL) {
    configInput.value = APPS_SCRIPT_WEBAPP_URL;
  }

  saveConfigBtn.addEventListener("click", () => {
    const val = configInput.value.trim();
    if (val) {
      localStorage.setItem('SCANNER_API_URL', val);
      APPS_SCRIPT_WEBAPP_URL = val;
      setStatus("success", "URL salva com sucesso!");
      setTimeout(() => setStatus("", ""), 2000);
    }
  });

  function setStatus(type, message, isLoading = false) {
    statusContainer.className = `status-card ${type}`;
    statusSpinner.style.display = isLoading ? "block" : "none";
    statusMessage.innerHTML = message;
    
    if (type === 'loading') {
      resultsArea.style.display = "none";
      resultsArea.innerHTML = '';
    }
  }

  function startScanner() {
    statusContainer.style.display = "none";
    
    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Attempt to use the back camera
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
      .then(() => {
        startBtn.style.display = "none";
        stopBtn.style.display = "flex";
      })
      .catch((err) => {
        console.error("Error starting scanner", err);
        setStatus("error", `Erro ao acessar câmera: ${err}`);
      });
  }

  function stopScanner() {
    if (html5QrCode) {
      html5QrCode.stop().then(() => {
        startBtn.style.display = "flex";
        stopBtn.style.display = "none";
        html5QrCode.clear();
      }).catch(err => {
        console.error("Error stopping scanner", err);
      });
    }
  }

  async function onScanSuccess(decodedText, decodedResult) {
    // Stop scanning immediately to prevent multiple scans
    stopScanner();
    
    // Check if it looks like a URL
    if (!decodedText.startsWith('http')) {
      setStatus("error", "O QR Code não contém uma URL válida de cupom fiscal.");
      return;
    }

    if (!APPS_SCRIPT_WEBAPP_URL) {
      setStatus("error", "Você precisa configurar a URL do Apps Script primeiro no painel acima!");
      return;
    }

    setStatus("loading", "Enviando cupom para a Inteligência Artificial...", true);

    try {
      const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "scan_invoice",
          url: decodedText
        })
      });

      // Because of no-cors in GAS (sometimes needed depending on the setup), we might not get a readable JSON back immediately unless we setup the Apps Script properly with CORS headers.
      // However, we will assume the Apps Script responds properly as we do with the "Importar (IA)" feature.
      
      // Let's actually fetch without no-cors first, since the main app uses standard fetch for the IA import
      const corsResponse = await fetch(APPS_SCRIPT_WEBAPP_URL + "?action=scan_invoice", {
        method: "POST",
        body: JSON.stringify({
          action: "scan_invoice",
          url: decodedText
        })
      });

      const data = await corsResponse.json();

      if (data.status === "success") {
        setStatus("success", `<b>Sucesso!</b> Foram encontrados ${data.items.length} itens de supermercado/combustível.`);
        
        let html = '';
        data.items.forEach(item => {
          html += `
            <div class="item-row">
              <div style="display:flex; flex-direction:column; max-width: 70%;">
                <strong style="color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.name}</strong>
                <span style="font-size:0.8rem; color:var(--text-muted);">${item.quantity} un/L x R$ ${item.unitPrice.toFixed(2).replace('.',',')}</span>
              </div>
              <strong style="color:var(--color-income);">R$ ${item.totalPrice.toFixed(2).replace('.',',')}</strong>
            </div>
          `;
        });
        
        resultsArea.innerHTML = html;
        resultsArea.style.display = "flex";
      } else {
        setStatus("error", `<b>Erro na IA:</b> ${data.message || "Não foi possível processar a nota."}`);
      }
      
    } catch (error) {
      console.error(error);
      setStatus("error", "Erro ao conectar com o servidor. A URL do cupom era: <br><br><span style='font-size:0.75rem; word-break:break-all;'>" + decodedText + "</span>");
    }
  }

  startBtn.addEventListener("click", startScanner);
  stopBtn.addEventListener("click", stopScanner);
});
