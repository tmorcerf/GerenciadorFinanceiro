let APPS_SCRIPT_WEBAPP_URL = localStorage.getItem('SCANNER_API_URL') || 'https://script.google.com/macros/s/AKfycbzprz-nB2uI3KUnlJl8BPdn59WfeabOV1q5E8SQOCOesw7_a9wi_4oRsTTvXf7dAeuM/exec';
let html5QrCode;

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const statusContainer = document.getElementById("status-container");
  const statusSpinner = document.getElementById("status-spinner");
  const statusMessage = document.getElementById("status-message");
  const resultsArea = document.getElementById("results-area");

  const uploadBtn = document.getElementById("upload-btn");
  const qrUploadInput = document.getElementById("qr-upload-input");

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
    statusContainer.style.display = ""; // Remove o display: none inline
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
    
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        // Inicializa o leitor
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // Tenta iniciar a câmera traseira
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
          .then(() => {
            startBtn.style.display = "none";
            stopBtn.style.display = "flex";
          })
          .catch((err) => {
            console.warn("Falha ao iniciar facingMode: environment. Tentando ID da câmera...", err);
            // Fallback para a última câmera da lista (geralmente a traseira)
            const cameraId = devices[devices.length - 1].id;
            html5QrCode.start(cameraId, config, onScanSuccess)
              .then(() => {
                startBtn.style.display = "none";
                stopBtn.style.display = "flex";
              })
              .catch((err2) => {
                setStatus("error", `Erro ao acessar câmera (fallback): ${err2}`);
              });
          });
      } else {
        setStatus("error", "Nenhuma câmera encontrada no seu dispositivo.");
      }
    }).catch(err => {
      console.error("Permissão negada ou erro ao buscar câmeras:", err);
      setStatus("error", `Permissão da câmera negada. Atualize a página e permita o acesso. (${err})`);
    });
  }

  function stopScanner() {
    if (html5QrCode) {
      // Evita erro síncrono: só tenta dar stop() se o estado for SCANNING (2)
      if (html5QrCode.getState() === 2) {
        html5QrCode.stop().then(() => {
          startBtn.style.display = "flex";
          stopBtn.style.display = "none";
          html5QrCode.clear();
        }).catch(err => {
          console.error("Error stopping scanner", err);
        });
      } else {
        // Se não estava rodando a câmera, apenas volta os botões ao normal
        startBtn.style.display = "flex";
        stopBtn.style.display = "none";
        html5QrCode.clear();
      }
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
      // Faz o POST enviando o body como string (text/plain) para evitar preflight (OPTIONS) e erro de CORS no Google Apps Script
      const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "scan_invoice",
          url: decodedText
        })
      });

      const data = await response.json();

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
      setStatus("error", "<b>Erro de Permissão no Servidor:</b> O seu Google Apps Script não tem acesso público.<br><br>Você precisa ir no painel do Apps Script, clicar em <b>Implantar > Gerenciar Implantações > Editar</b> e garantir que 'Quem tem acesso' esteja como <b>'Qualquer pessoa'</b>.<br><br><span style='font-size:0.75rem; word-break:break-all;'>URL do cupom lido: " + decodedText + "</span>");
    }
  }

  startBtn.addEventListener("click", startScanner);
  stopBtn.addEventListener("click", stopScanner);

  // Lógica para upload de foto
  uploadBtn.addEventListener("click", () => {
    qrUploadInput.click();
  });

  qrUploadInput.addEventListener("change", async (e) => {
    if (e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Se a câmera estiver rodando, precisamos pará-la antes de ler o arquivo
    if (html5QrCode && html5QrCode.getState() === 2 /* SCANNING */) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch(err) {
        console.log("Erro ao parar a câmera:", err);
      }
    }

    setStatus("loading", "Procurando QR Code na foto...", true);
    
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    try {
      // Adicionamos um limite de tempo (10 segundos) porque algumas fotos de celular (ex: HEIC no iPhone) podem fazer a biblioteca travar infinitamente
      const decodedText = await Promise.race([
        html5QrCode.scanFile(file, false),
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 10000))
      ]);
      
      qrUploadInput.value = "";
      onScanSuccess(decodedText, null);
    } catch (err) {
      qrUploadInput.value = "";
      console.warn("Erro na leitura da imagem", err);
      if (err && err.message === "TIMEOUT") {
        setStatus("error", "A leitura demorou muito. O formato da foto (ex: HEIC) pode não ser compatível com o navegador do celular. Tente enviar um print da tela (captura de tela) da foto.");
      } else {
        setStatus("error", "Não foi possível encontrar um QR Code nítido nesta foto. A foto precisa estar focada no código quadriculado.");
      }
    }
  });

  // Auto-inicia a câmera ao abrir a página
  setTimeout(() => {
    startScanner();
  }, 500);
});
