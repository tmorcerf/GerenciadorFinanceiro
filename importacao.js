// importacao.js
// Lógica para a aba de Sincronização de Período Fechado (agora unificado na Importação Principal)

let dadosSincronizacao = { corretos: [], faltantes: [], sobrando: [] };
let isCategorizado = false;
let analiseExtracao = "";
let analiseCategorizacao = "";
let cabecalhoAtual = null;

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('uploadFileImportacao');
  const btnImport = document.getElementById('btn-import-novo');
  let btnImportOriginal = '';
  

  
  const resultContainer = document.getElementById('import-result-container');
  const btnCategorizar = document.getElementById('btn-categorizar-ia');
  const btnSalvar = document.getElementById('btnSalvarImportacaoNova');
  const uploadZone = document.body;
  const feedbackConsole = document.getElementById('importFeedbackConsole');
  const resumoDiv = document.getElementById('importResumo');
  const ninjaExtratorContainer = document.getElementById('ninja-extrator-container');
  const ninjaExtratorText = document.getElementById('ninja-extrator-text');
  const ninjaCategorizadorContainer = document.getElementById('ninja-categorizador-container');
  const ninjaCategorizadorText = document.getElementById('ninja-categorizador-text');

const funnyAIPhrases = [
  'Olha que lançamento estranho...',
  'Achei mais um gasto supérfluo...',
  'Nossa, você bebe muito café, hein?',
  'Analisando essa compra na madrugada...',
  'Hmm, iFood de novo?',
  'Processando mais boletos, que tristeza.',
  'Quem diria, um investimento!',
  'Será que esse gasto foi essencial?',
  'Lendo linhas e mais linhas de extrato...',
  'Calculando para onde foi o seu dinheiro.',
  'Essa fatura não está de brincadeira...',
  'Categorizando aquele lanchinho.',
  'Encontrei um PIX não identificado. Suspeito...',
  'Checando as moedinhas esquecidas.',
  'Uau, você economizou nessa!',
  'Separando os gastos fixos dos impulsos.',
  'Mais uma comprinha na internet, certo?',
  'O gerente do banco deve te adorar.',
  'Pensando em como melhorar essas finanças.',
  'Cruzando dados com a base local...',
  'Quase terminando de ler essa fatura gigante.',
  'Anotando essa comprinha escondida.',
  'Seu eu do futuro agradece a organização.',
  'Isso aqui foi lazer ou necessidade?',
  'Decifrando nomes bizarros de maquininhas de cartão.',
  'Organizando tudo para você não ter trabalho.',
];

let aiThinkingInterval = null;
window.currentNinja = 'extrator';

function addFeedback(message, type = 'system') {
  let cleanMsg = message.replace(/^\\n|^\n/, '').replace(/\\n$|\n$/, '');
  if (window.currentNinja === 'extrator') {
    if (ninjaExtratorContainer) {
      ninjaExtratorContainer.style.display = 'flex';
      if (ninjaExtratorText) ninjaExtratorText.innerHTML = cleanMsg;
    }
  } else if (window.currentNinja === 'categorizador') {
    if (ninjaCategorizadorContainer) {
      ninjaCategorizadorContainer.style.display = 'flex';
      if (ninjaCategorizadorText) ninjaCategorizadorText.innerHTML = cleanMsg;
    }
  }
}

function startAIThinking() {
  if (aiThinkingInterval) clearInterval(aiThinkingInterval);
  aiThinkingInterval = setInterval(() => {
    const phrase = funnyAIPhrases[Math.floor(Math.random() * funnyAIPhrases.length)];
    addFeedback(phrase, 'ai thinking');
  }, 4000);
}

function stopAIThinking() {
  if (aiThinkingInterval) {
    clearInterval(aiThinkingInterval);
    aiThinkingInterval = null;
  }
}


  // Variáveis e refs pro Modal do Documento
  let currentFileUrl = null;
  let currentFileType = null;
  const btnViewDoc = document.getElementById('btn-view-doc');
  const docModal = document.getElementById('docModal');
  const closeDocModal = document.getElementById('closeDocModal');
  const docModalContent = document.getElementById('docModalContent');

  if (btnViewDoc && docModal) {
     btnViewDoc.addEventListener('click', () => {
        if (!currentFileUrl) return;
        let contentHtml = '';
        if (currentFileType.includes('csv') || currentFileType.includes('xls') || currentFileType.includes('sheet')) {
           let text = window.currentExtractedContent || '';
           let rows = text.split('\n').filter(l => l.trim() !== '');
           let tableHtml = '<table style="width:100%; border-collapse: collapse; font-family: monospace; font-size: 12px; background: var(--bg-card); color: var(--text-primary);">';
           for (let i=0; i<rows.length; i++) {
               let delimiter = rows[i].includes(';') ? ';' : (rows[i].includes('\t') ? '\t' : ',');
               let cols = rows[i].split(delimiter);
               tableHtml += '<tr>';
               for (let c of cols) {
                   tableHtml += `<td style="border: 1px solid rgba(255,255,255,0.1); padding: 6px; white-space: nowrap; color: var(--text-secondary);">${c.replace(/^["']|["']$/g, '')}</td>`;
               }
               tableHtml += '</tr>';
           }
           tableHtml += '</table>';
           contentHtml = `<div style="width:100%; height:100%; overflow:auto; background:var(--bg-color); padding:20px;">${tableHtml}</div>`;
        } else if (currentFileType.includes('pdf')) {
           contentHtml = `<iframe src="${currentFileUrl}" width="100%" height="100%" style="border:none;"></iframe>`;
        } else if (currentFileType.includes('image')) {
           contentHtml = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; overflow:auto;"><img src="${currentFileUrl}" style="max-width:100%; max-height:100%; object-fit:contain;"></div>`;
        } else {
           contentHtml = `<iframe src="${currentFileUrl}" width="100%" height="100%" style="border:none; background:#fff;"></iframe>`;
        }
        docModalContent.innerHTML = contentHtml;
        docModal.style.display = 'flex';
     });
     
     closeDocModal.addEventListener('click', () => {
        docModal.style.display = 'none';
        docModalContent.innerHTML = '';
     });
     
     window.addEventListener('click', (e) => {
        if (e.target === docModal) {
           docModal.style.display = 'none';
           docModalContent.innerHTML = '';
        }
     });
  }

  window.updateReconciliationDatesUI = () => {
    const container = document.getElementById('reconciliation-dates-container');
    if (!container) return;
    
    let contas = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : []);
    
    let contasToRender = contas.filter(c => c.conciliado_ate && String(c.conciliado_ate).trim() !== '');
    
    contasToRender.sort((a, b) => {
        const parseDt = (str) => {
            let p = String(str).split('/');
            if (p.length === 3) return new Date(p[2], parseInt(p[1]) - 1, p[0]).getTime();
            p = String(str).split('-');
            if (p.length === 3) return new Date(p[0], parseInt(p[1]) - 1, p[2]).getTime();
            return 0;
        };
        return parseDt(a.conciliado_ate) - parseDt(b.conciliado_ate);
    });

    let html = '';
    contasToRender.forEach(c => {
       html += `<span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary); margin-right:4px;">${c.nome}</strong> ${c.conciliado_ate}</span>`;
    });
    
    if (html === '') {
       html = '<span style="font-size: 0.8rem; color: var(--text-muted);">Nenhuma data de conciliação registrada.</span>';
    }
    
    container.innerHTML = html;
  };

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.target === 'panel-import') {
        if (window.updateReconciliationDatesUI) window.updateReconciliationDatesUI();
      }
    });
  });
  
  // Tenta rodar de cara caso os dados já estejam carregados
  setTimeout(() => { if (window.updateReconciliationDatesUI) window.updateReconciliationDatesUI(); }, 1500);

  if (!uploadInput) return;

  // Drag and drop magic
  if (uploadZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.style.borderColor = 'var(--color-accent)';
        uploadZone.style.boxShadow = '0 0 20px var(--color-accent-glow)';
        uploadZone.style.transform = 'scale(1.02)';
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        uploadZone.style.boxShadow = 'none';
        uploadZone.style.transform = 'scale(1)';
      }, false);
    });
    uploadZone.addEventListener('drop', (e) => {
      let dt = e.dataTransfer;
      let files = dt.files;
      if (files && files.length > 0) {
        uploadInput.files = files;
        uploadInput.dispatchEvent(new Event('change'));
      }
    }, false);
  }





  // =====================================================================
  // Helper: troca entre modo Vincular e Criar no modal de conta
  // =====================================================================
  window._setModoContaImport = function(modo) {
    const blocVincular = document.getElementById('nova-conta-bloco-vincular');
    const blocCriar    = document.getElementById('nova-conta-bloco-criar');
    const btnVincular  = document.getElementById('nova-conta-modo-vincular');
    const btnCriar     = document.getElementById('nova-conta-modo-criar');
    if (!blocVincular) return;
    if (modo === 'vincular') {
      blocVincular.style.display = 'block';
      blocCriar.style.display    = 'none';
      if (btnVincular) { btnVincular.style.background = 'var(--color-accent)'; btnVincular.style.color = '#fff'; }
      if (btnCriar)    { btnCriar.style.background    = 'transparent';          btnCriar.style.color    = 'var(--text-secondary)'; }
    } else {
      blocVincular.style.display = 'none';
      blocCriar.style.display    = 'block';
      if (btnVincular) { btnVincular.style.background = 'transparent';          btnVincular.style.color = 'var(--text-secondary)'; }
      if (btnCriar)    { btnCriar.style.background    = 'var(--color-accent)';  btnCriar.style.color    = '#fff'; }
    }
    window._modoContaImport = modo;
  };

  // =====================================================================
  // Helper: abre modal de conta e retorna Promise com { existente, conta }
  // =====================================================================
  function abrirModalConta(nomeDetectado, saldoSugerido, saldoFinal, bancoSugerido) {
    return new Promise((resolve, reject) => {
      const modal      = document.getElementById('modal-nova-conta-importacao');
      const desc       = document.getElementById('modal-nova-conta-desc');
      const selExist   = document.getElementById('nova-conta-existente-select');
      const inputNome  = document.getElementById('nova-conta-nome');
      const inputBanco = document.getElementById('nova-conta-banco');
      const inputTipo  = document.getElementById('nova-conta-tipo');
      const inputSaldo = document.getElementById('nova-conta-saldo-inicial');
      const inputCor   = document.getElementById('nova-conta-cor');
      const btnCnc     = document.getElementById('nova-conta-cancelar');
      const btnOk      = document.getElementById('nova-conta-confirmar');

      if (!modal) {
        // Fallback caso o modal não exista no HTML ainda
        const tipoConta = confirm('Tipo de conta: OK = Conta Corrente, Cancelar = Cartão de Crédito') ? 'Conta Corrente' : 'Cartão de Crédito';
        resolve({ existente: false, conta: { nome: nomeDetectado, banco: '', tipo: tipoConta, saldo_inicial: saldoSugerido || 0, cor: '#3b82f6', conciliado_ate: '', conciliado_desde: '' } });
        return;
      }

      // Preencher descrição
      if (desc) desc.innerHTML = `A IA identificou <strong>"${nomeDetectado}"</strong> no extrato, mas não está no seu cadastro.<br>Vincule a uma conta existente ou crie uma nova:`;

      // Popular dropdown de contas existentes
      const _dfModal = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      if (selExist) {
        selExist.innerHTML = '';
        ((_dfModal && _dfModal.contas) || []).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.nome; opt.textContent = c.nome;
          selExist.appendChild(opt);
        });
      }

      // Pré-preencher campos de criação
      if (inputNome)  inputNome.value  = nomeDetectado;
      // M1+: pré-preenche banco com o que a IA detectou no PDF
      if (inputBanco) inputBanco.value = bancoSugerido || '';
      if (inputSaldo) inputSaldo.value = (saldoSugerido !== null && saldoSugerido !== undefined) ? saldoSugerido : '';
      if (inputTipo)  inputTipo.value  = 'Conta Corrente';
      if (inputCor)   inputCor.value   = '#3b82f6';

      // Badge de saldos detectados pela IA
      const saldoBadge = document.getElementById('modal-nova-conta-saldos-badge');
      if (saldoBadge) {
        if (saldoSugerido !== null || saldoFinal !== null) {
          saldoBadge.style.display = 'block';
          saldoBadge.innerHTML = `<i class="fas fa-chart-line" style="margin-right:6px;"></i>` +
            `<strong>IA detectou no PDF:</strong> ` +
            (saldoSugerido !== null ? `Saldo inicial: <strong>R$ ${Number(saldoSugerido).toFixed(2)}</strong>` : '') +
            (saldoSugerido !== null && saldoFinal !== null ? ` &nbsp;|&nbsp; ` : '') +
            (saldoFinal !== null ? `Saldo final: <strong>R$ ${Number(saldoFinal).toFixed(2)}</strong>` : '');
        } else {
          saldoBadge.style.display = 'none';
        }
      }

      // Botão Ver Documento: abre visualizador já existente no app
      const btnVerDoc = document.getElementById('nova-conta-btn-ver-doc');
      if (btnVerDoc) {
        const btnViewDocGlobal = document.getElementById('btn-ver-documento') || document.querySelector('[onclick*="verDocumento"]');
        if (window.currentFileUrl || window.currentExtractedContent) {
          btnVerDoc.style.display = 'inline-flex';
          btnVerDoc.onclick = () => {
            if (btnViewDocGlobal) { btnViewDocGlobal.click(); return; }
            // fallback: abre em nova aba
            if (window.currentFileUrl) window.open(window.currentFileUrl, '_blank');
          };
        } else {
          btnVerDoc.style.display = 'none';
        }
      }

      // Badges inline: mostra "🤖 detectado pela IA" quando campos são preenchidos automaticamente
      const tagBanco = document.getElementById('nova-conta-banco-tag');
      const tagSaldo = document.getElementById('nova-conta-saldo-tag');
      if (tagBanco) tagBanco.style.display = bancoSugerido ? 'inline' : 'none';
      if (tagSaldo) tagSaldo.style.display = (saldoSugerido !== null && saldoSugerido !== undefined) ? 'inline' : 'none';

      // Inicia no modo Vincular se há contas, senão Criar
      const haContas = _dfModal && _dfModal.contas && _dfModal.contas.length > 0;
      window._setModoContaImport(haContas ? 'vincular' : 'criar');

      modal.style.display = 'flex';
      const cleanup = () => { modal.style.display = 'none'; };

      btnCnc.onclick = () => { cleanup(); reject(new Error('Importação cancelada pelo usuário.')); };

      btnOk.onclick = () => {
        const modo = window._modoContaImport || 'vincular';
        if (modo === 'vincular') {
          const nomeSel = selExist ? selExist.value : '';
          if (!nomeSel) { alert('Selecione uma conta existente.'); return; }
          const contaExistente = ((_dfModal && _dfModal.contas) || []).find(c => c.nome === nomeSel);
          cleanup();
          resolve({ existente: true, conta: contaExistente });
        } else {
          const nome  = inputNome  ? inputNome.value.trim()  : nomeDetectado;
          const banco = inputBanco ? inputBanco.value.trim() : '';
          if (!nome)  { alert('Informe o nome da conta.'); return; }
          if (!banco) { alert('Informe a Instituição Financeira.'); return; }
          cleanup();
          resolve({
            existente: false,
            conta: {
              nome,
              banco,
              tipo:              inputTipo  ? inputTipo.value  : 'Conta Corrente',
              saldo_inicial:     parseFloat(inputSaldo ? inputSaldo.value : 0) || 0,
              cor:               inputCor   ? inputCor.value   : '#3b82f6',
              ignorar_dashboard: false,
              conciliado_ate:    '',
              conciliado_desde:  ''
            }
          });
        }
      };
    });
  }

  uploadInput.addEventListener('change', async (e) => {
    window.currentNinja = 'extrator';
    if (ninjaCategorizadorContainer) ninjaCategorizadorContainer.style.display = 'none';
    const file = e.target.files[0];
    if (!file) return;
    window.currentImportFile = file;

    // Object URL para visualização do documento
    if (currentFileUrl) URL.revokeObjectURL(currentFileUrl);
    currentFileUrl = URL.createObjectURL(file);
    currentFileType = file.type || file.name.split('.').pop().toLowerCase();
    
    if (btnViewDoc) btnViewDoc.style.display = 'flex';
    updateReconciliationDatesUI();

    // Reset UI e Estados
    resultContainer.style.display = 'none';
    if (btnCategorizar) btnCategorizar.style.display = 'none';
    btnSalvar.style.display = 'none';
    
    // Não podemos dar innerHTML = '' no import-table-content senão destruímos a tabela unificada e o ia-mind-container!
    document.getElementById('import-table-content').style.display = 'none';
    if (document.getElementById('unified-table-body')) {
      document.getElementById('unified-table-body').innerHTML = '';
    }
    if (document.getElementById('ninja-categorizador-container')) {
      document.getElementById('ninja-categorizador-container').style.display = 'none';
    }
    
    resumoDiv.style.display = 'none';
    resumoDiv.innerHTML = '';
    isCategorizado = false;
    analiseExtracao = "";
    analiseCategorizacao = "";
    cabecalhoAtual = null;
    
    if (document.getElementById('passo3-container')) {
      document.getElementById('passo3-container').style.display = 'none';
      document.getElementById('passo3-container').innerHTML = '';
    }

    if (btnImport) {
      btnImportOriginal = btnImport.innerHTML;
      btnImport.disabled = true;
    }
    
    if (btnCategorizar) btnCategorizar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
    btnSalvar.innerHTML = 'Confirmar Importação <i class="fas fa-check"></i>';
    
    try {
      addFeedback(`Arquivo carregado: ${file.name}`, 'system');
      if (btnImport) btnImport.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Lendo arquivo localmente...';
      
      const fileData = await window.extractFileContent(file);
      window.currentExtractedContent = fileData.content;

      if (btnImport) btnImport.innerHTML = '<i class="fas fa-magic fa-bounce"></i> Extraindo dados (aguarde até 30s)...';
      addFeedback('Enviando para a IA extrair transações...', 'ai');
      startAIThinking();

      // M1: Envia contas com tipo para a IA ignorar transferencias proprias corretamente
      const _contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas)
        ? dadosFinanceiros.contas.map(c => ({nome: c.nome, tipo: c.tipo || 'Conta Corrente', conciliado_ate: c.conciliado_ate}))
        : ((window.dadosFinanceiros && window.dadosFinanceiros.contas)
          ? window.dadosFinanceiros.contas.map(c => ({nome: c.nome, tipo: c.tipo || 'Conta Corrente', conciliado_ate: c.conciliado_ate}))
          : []);

      if (!window.GeminiService) throw new Error("Serviço Gemini não está disponível.");
      let json = await window.GeminiService.extrairExtrato({
        fileContent: fileData.content,
        fileType: fileData.type,
        fileName: file.name,
        contasInfo: _contasInfo
      });

      if (json.status !== 'success') {
        throw new Error(json.message || "Erro desconhecido na IA.");
      }

      if (btnImport) {
        btnImport.innerHTML = '<i class="fas fa-check-circle"></i> Mágica concluída!';
        setTimeout(() => {
          btnImport.innerHTML = btnImportOriginal;
          btnImport.disabled = false;
        }, 2000);
      }

      const dataIA = json.data;
      let dadosExtrato = [];
      let cabecalho = null;

      if (Array.isArray(dataIA)) {
        dadosExtrato = dataIA;
      } else if (dataIA && dataIA.lancamentos) {
        dadosExtrato = dataIA.lancamentos;
        cabecalho = dataIA.cabecalho;
      } else if (dataIA && dataIA.transacoes) {
        dadosExtrato = dataIA.transacoes;
        cabecalho = dataIA.cabecalho;
      }

      cabecalhoAtual = cabecalho;
      analiseExtracao = json.analise_ia || "";

      stopAIThinking();
      addFeedback(`Sucesso! Extraídas ${dadosExtrato.length} transações.`, 'success');
      // M5: Exibe resumo da IA para o usuário
      if (analiseExtracao) addFeedback(`🤖 IA: "${analiseExtracao}"`, 'ai');

      if (dadosExtrato.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo.");
      }

      // DETECTAR CARTÃO DE CRÉDITO E VENCIMENTO
      const contaDoExtrato = String(cabecalho['Nome da conta'] || cabecalho['conta'] || '').trim().toLowerCase();
      const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      let contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === contaDoExtrato) : null;
      
      if (!contaMatch && contaDoExtrato !== '') {
          try {
            // saldo_inicial null = IA não encontrou; 0 pode ser válido mas improvável como saldo de abertura
            const saldoInicialBruto = cabecalho ? cabecalho.saldo_inicial : null;
            const saldoFinalBruto   = cabecalho ? cabecalho.saldo_final   : null;
            const saldoSugerido  = (saldoInicialBruto !== null && saldoInicialBruto !== undefined) ? saldoInicialBruto : null;
            const saldoFinalInfo = (saldoFinalBruto   !== null && saldoFinalBruto   !== undefined) ? saldoFinalBruto   : null;
            const bancoSugerido  = (cabecalho && cabecalho.banco) ? String(cabecalho.banco).trim() : '';
            const nomeDetectado  = String(cabecalho['Nome da conta'] || cabecalho['conta'] || 'Conta Desconhecida').trim();
            const resultado = await abrirModalConta(nomeDetectado, saldoSugerido, saldoFinalInfo, bancoSugerido);

            if (resultado.existente) {
              // Usuário vinculou a uma conta já cadastrada
              contaMatch = resultado.conta;
              addFeedback(`Extrato vinculado à conta existente: "${contaMatch.nome}"`, 'success');
            } else {
              // Usuário criou uma nova conta
              if (!window.DB || !window.DB.salvarConta) throw new Error('Erro ao acessar DB.salvarConta.');
              await window.DB.salvarConta(resultado.conta);
              if (!_df.contas) _df.contas = [];
              _df.contas.push(resultado.conta);
              contaMatch = resultado.conta;
              addFeedback(`Nova conta "${contaMatch.nome}" (${contaMatch.banco}) criada com sucesso!`, 'success');
            }
          } catch (modalErr) {
            throw new Error(modalErr.message || 'Operação de conta cancelada.');
          }
      }

      let isCartaoCredito = contaMatch && contaMatch.tipo === 'Cartão de Crédito';
      let vencimentoFatura = cabecalho['Vencimento da fatura'] || cabecalho['vencimento'] || cabecalho['Vencimento'] || cabecalho['Data de Vencimento'] || null;
      if (vencimentoFatura && vencimentoFatura.toLowerCase().includes('obrigatório')) vencimentoFatura = null;

      if (isCartaoCredito) {
         if (!vencimentoFatura) {
            // M6: Modal visual no lugar do prompt() nativo para vencimento de cartão
            vencimentoFatura = await new Promise((resolve) => {
              const cartaoNome = contaMatch ? contaMatch.nome : 'Cartão';
              const dlg = document.createElement('div');
              dlg.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:20px;';
              dlg.innerHTML = `
                <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:28px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                  <h3 style="margin:0 0 8px;color:var(--text-primary);font-size:1rem;"><i class="fas fa-credit-card" style="color:var(--color-accent);margin-right:8px;"></i>Vencimento da Fatura</h3>
                  <p style="color:var(--text-secondary);font-size:0.85rem;margin:0 0 18px;">A conta <strong>"${cartaoNome}"</strong> é um Cartão de Crédito.<br>Informe a data de vencimento <strong>desta</strong> fatura:</p>
                  <input type="text" id="dlg-vencimento-input" class="modern-input" style="width:100%;margin-bottom:14px;" placeholder="Ex: 15/07/2026" maxlength="10">
                  <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 18px;"><i class="fas fa-info-circle"></i> Se a IA já detectou o vencimento, ele aparece pré-preenchido acima.</p>
                  <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="dlg-vencimento-cancelar" style="background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);padding:9px 16px;border-radius:8px;cursor:pointer;">Cancelar</button>
                    <button id="dlg-vencimento-ok" style="background:var(--color-accent);color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-weight:600;"><i class="fas fa-check"></i> Confirmar</button>
                  </div>
                </div>`;
              document.body.appendChild(dlg);
              dlg.querySelector('#dlg-vencimento-cancelar').onclick = () => { document.body.removeChild(dlg); resolve(null); };
              dlg.querySelector('#dlg-vencimento-ok').onclick = () => {
                const val = dlg.querySelector('#dlg-vencimento-input').value.trim();
                document.body.removeChild(dlg);
                resolve(val || null);
              };
            });
            if (!vencimentoFatura) {
               throw new Error("A data de vencimento é obrigatória para importar faturas de Cartão de Crédito.");
            }
         }
      }

      let minTime = Infinity;
      let maxTime = 0;
      dadosExtrato.forEach(t => {
         // Garantir que a transação tenha a conta oficial preenchida, evitando divergências entre cabeçalho e transações
         if (contaMatch) {
            t.conta = contaMatch.nome;
         } else if (!t.conta && cabecalho && (cabecalho['Nome da conta'] || cabecalho['conta'])) {
            t.conta = cabecalho['Nome da conta'] || cabecalho['conta'];
         }
         
         // Se for cartão de crédito, aplica a data de vencimento para todas as transações importadas
         if (isCartaoCredito && vencimentoFatura) {
            t.vencimento = vencimentoFatura;
         }
         
         let time = parseDataBR(t.data);
         if (time > 0) {
            if (time < minTime) minTime = time;
            if (time > maxTime) maxTime = time;
         }
      });

      if (minTime === Infinity || maxTime === 0) {
         throw new Error("Não foi possível determinar o período (datas inválidas).");
      }

      let dataInicio = new Date(minTime).toLocaleDateString('pt-BR');
      let dataFim = new Date(maxTime).toLocaleDateString('pt-BR');
      addFeedback(`Período identificado: ${dataInicio} até ${dataFim}.\n`, 'system');

      let baseLocal = [];
      if (_df && _df.lancamentos) {
         baseLocal = _df.lancamentos;
      }
      
      // TRAVA DE CONCILIADO
      // contaMatch já foi obtido acima
      let cTimeAte = (contaMatch && contaMatch.conciliado_ate) ? parseDataBR(contaMatch.conciliado_ate) : 0;
      let cTimeDesde = (contaMatch && contaMatch.conciliado_desde) ? parseDataBR(contaMatch.conciliado_desde) : 0;

      if (cTimeAte > 0 && !isCartaoCredito) {
          let origLen = dadosExtrato.length;
          dadosExtrato = dadosExtrato.filter(t => {
             let tTime = parseDataBR(t.data);
             if (cTimeDesde > 0) {
                 // Deixa as pontas (cTimeDesde e cTimeAte) passarem para deduplicar, bloqueia o miolo
                 return !(tTime > cTimeDesde && tTime < cTimeAte);
             } else {
                 return tTime >= cTimeAte;
             }
          });
          let ignored = origLen - dadosExtrato.length;
          if (ignored > 0) {
              addFeedback(`Trava de Conciliação: ${ignored} itens do extrato ignorados (já consolidados). Dias limítrofes preservados para deduplicação.`, 'warning');
          }
      } else if (cTimeAte > 0 && isCartaoCredito) {
          // Para cartão de crédito, usamos a data de vencimento da fatura para checar a trava
          let tTimeVencimento = parseDataBR(vencimentoFatura);
          if (tTimeVencimento > 0 && tTimeVencimento <= cTimeAte) {
              throw new Error(`Esta fatura com vencimento em ${vencimentoFatura} já está no período conciliado (até ${contaMatch.conciliado_ate}).`);
          }
      }

      addFeedback(`DEBUG: minTime=${new Date(minTime).toLocaleDateString()}, maxTime=${new Date(maxTime).toLocaleDateString()}\n`, 'system');
      let debugLocal = baseLocal.filter(l => String(l.conta).trim().toLowerCase() === contaDoExtrato);
      addFeedback(`DEBUG: Temos ${debugLocal.length} itens na base local para a conta '${contaDoExtrato}'.\n`, 'system');
      if (debugLocal.length > 0) {
          let l = debugLocal[0];
          addFeedback(`Exemplo: data=${l.data}, valor=${l.valor}, tTime=${parseDataBR(l.data)}.\n`, 'system');
      }

      let poolLocal = baseLocal.filter(L => {
         let matchConta = String(L.conta).trim().toLowerCase() === contaDoExtrato;
         let tTime = parseDataBR(L.data);
         let matchTempo = (tTime >= (minTime - 3*86400000) && tTime <= (maxTime + 3*86400000));
         
         let isBlocked = false;
         if (cTimeAte > 0 && !isCartaoCredito) {
             if (cTimeDesde > 0) {
                 isBlocked = (tTime > cTimeDesde && tTime < cTimeAte);
             } else {
                 isBlocked = (tTime < cTimeAte);
             }
         }
         let matchConciliado = !isBlocked; // Trava: não tocar no miolo bloqueado
         return matchConta && matchTempo && matchConciliado;
      });

      addFeedback(`Encontrados ${poolLocal.length} lançamentos locais na conta '${contaDoExtrato}' no período do extrato (pós-trava).\n`, 'system');

      let faltantes = [];
      let corretos = [];

      const isValorIgual = (v1, v2) => {
         let val1 = parseFloat(String(v1).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
         let val2 = parseFloat(String(v2).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
         return Math.abs(Math.abs(val1) - Math.abs(val2)) <= 0.50;
      };

      const isDataIgual = (d1, d2) => {
         let t1 = parseDataBR(d1);
         let t2 = parseDataBR(d2);
         let diff = Math.abs(t1 - t2);
         return diff === 0; // 0 dias de margem para evitar falsos positivos
      };

      dadosExtrato.forEach((ext, index) => {
         ext.cod = ext.cod || "TX_NEW_" + index;
         
         let matchIdx = poolLocal.findIndex(loc => {
            let dataOk = isDataIgual(ext.data, loc.data);
            let valOk = isValorIgual(ext.valor, loc.valor);
            let vencOk = true;
            if (isCartaoCredito && vencimentoFatura && loc.vencimento) {
               let t1 = parseDataBR(vencimentoFatura);
               let t2 = parseDataBR(loc.vencimento);
               if (t1 > 0 && t2 > 0) vencOk = (t1 === t2);
            }
            return dataOk && valOk && vencOk;
         });

         if (matchIdx !== -1) {
            let matchedLocal = poolLocal.splice(matchIdx, 1)[0];
            corretos.push({ extrato: ext, planilha: matchedLocal });
         } else {
            faltantes.push(ext);
         }
      });

      if (faltantes.length > 0 && poolLocal.length > 0) {
          addFeedback(`\\n🔍 **DEBUG DE CRUZAMENTO:**\\n`, 'system');
          addFeedback(`O primeiro item não encontrado foi: ${faltantes[0].data} | ${faltantes[0].descricao} | ${faltantes[0].valor}.\\n`, 'system');
          addFeedback(`Tentamos cruzar com os seguintes itens na sua planilha:\\n`, 'system');
          poolLocal.slice(0, 3).forEach(loc => {
              let valExt = parseFloat(String(faltantes[0].valor).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
              let valLoc = parseFloat(String(loc.valor).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
              let t1 = parseDataBR(faltantes[0].data);
              let t2 = parseDataBR(loc.data);
              addFeedback(`  -> Planilha: ${loc.data} | ${loc.obs} | ${loc.valor} (Dif. Dias: ${(Math.abs(t1-t2)/86400000).toFixed(0)}, Dif. Valor: ${Math.abs(Math.abs(valExt) - Math.abs(valLoc)).toFixed(2)})\\n`, 'system');
          });
      }

      // Itens "sobrando" (para excluir) só devem ser aqueles que caem EXATAMENTE no período do extrato (ou na mesma fatura para cartão)
      let sobrando = poolLocal.filter(loc => {
         if (isCartaoCredito && vencimentoFatura) {
             let vTime = parseDataBR(loc.vencimento);
             let fTime = parseDataBR(vencimentoFatura);
             let tTime = parseDataBR(loc.data);
             if (vTime > 0 && fTime > 0) {
                 // Só exclui se a transação for da mesma fatura atual E a data de compra for menor ou igual à última compra que veio no extrato (maxTime)
                 // Assim evitamos excluir lançamentos manuais feitos para o final do mês ao importar extratos parciais no meio do mês
                 return (vTime === fTime) && (tTime <= maxTime);
             } else {
                 return false; // Se a transação local não tem vencimento ou algo falhou, mais seguro não excluir
             }
         } else {
             let tTime = parseDataBR(loc.data);
             return (tTime >= minTime && tTime <= maxTime);
         }
      });

      dadosSincronizacao = { corretos, faltantes, sobrando };
      
      addFeedback(`Cruzamento finalizado! Faltantes (novos): ${faltantes.length} | Corretos: ${corretos.length} | Sobrando (excluir): ${sobrando.length}.\n`, 'system');

      resultContainer.style.display = 'block';
      // Conferência de Saldos e Lógica de Conciliação Contínua (Nova Lógica)
      const confContainer = document.getElementById('conferencia-saldo-container');
      const tableContent = document.getElementById('import-table-content');

      if (confContainer && dadosExtrato.length > 0) {
          confContainer.style.display = 'block';
          tableContent.style.display = 'none';
          
          if (btnCategorizar) btnCategorizar.style.display = 'none';
          if (btnSalvar) btnSalvar.style.display = 'none';

          // Limpa tudo dentro do container de conferência
          confContainer.innerHTML = '<h5 style="margin-bottom: 15px; color: var(--text-primary);"><i class="fas fa-balance-scale"></i> Status da Conciliação</h5>';
          
          let alertaConciliacao = document.createElement('div');
          alertaConciliacao.id = 'alerta-conciliacao-continua';
          alertaConciliacao.style = "font-size: 0.95rem; padding: 15px; margin-bottom: 20px; border-radius: 8px;";
          
          let payloadConciliacao = null; 

          if (!isCartaoCredito && contaMatch) {
              const parseVal = (v) => parseFloat(String(v).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
              const calcularSaldoAte = (dataStr) => {
                  let timeTarget = parseDataBR(dataStr);
                  let tsDesde = cTimeDesde; 
                  if (tsDesde === 0) return 0;
                  
                  let s_inicial = contaMatch.saldo_inicial || 0;
                  let soma = baseLocal.reduce((acc, loc) => {
                      let locConta = String(loc.conta).trim().toLowerCase();
                      let locTime = parseDataBR(loc.data);
                      if (locConta === contaDoExtrato && locTime >= tsDesde && locTime <= timeTarget) {
                          return acc + parseVal(loc.valor);
                      }
                      return acc;
                  }, 0);
                  return s_inicial + soma;
              };
              
              let extSaldoIni = (cabecalhoAtual && cabecalhoAtual.saldo_inicial !== undefined && cabecalhoAtual.saldo_inicial !== null) ? parseVal(cabecalhoAtual.saldo_inicial) : null;
              let extSaldoFim = (cabecalhoAtual && cabecalhoAtual.saldo_final !== undefined && cabecalhoAtual.saldo_final !== null) ? parseVal(cabecalhoAtual.saldo_final) : null;
              
              let cenTitle = ""; let cenMsg = ""; let cenColor = "";
              let cAteStr = contaMatch.conciliado_ate;
              let cDesdeStr = contaMatch.conciliado_desde;
              let maxDataExtratoStr = new Date(maxTime).toLocaleDateString('pt-BR');
              let minDataExtratoStr = new Date(minTime).toLocaleDateString('pt-BR');
              
              if (cTimeAte === 0) {
                  // CENÁRIO A: MARCO ZERO
                  if (extSaldoIni !== null && extSaldoFim !== null) {
                      let somaExtrato = dadosExtrato.reduce((acc, t) => acc + parseVal(t.valor), 0);
                      if (Math.abs((extSaldoIni + somaExtrato) - extSaldoFim) <= 0.05) {
                          cenTitle = `<i class="fas fa-flag"></i> Marco Zero Estabelecido`;
                          cenMsg = `Conciliação inicial da conta verificada matematicamente com sucesso.<br><br><b>Período:</b> ${minDataExtratoStr} a ${maxDataExtratoStr}<br><b>Saldo Inicial:</b> R$ ${extSaldoIni.toFixed(2)}`;
                          cenColor = '#10b981';
                          payloadConciliacao = { acao: 'marco_zero', desde: minDataExtratoStr, ate: maxDataExtratoStr, saldo_inicial: extSaldoIni };
                      } else {
                          cenTitle = `<i class="fas fa-exclamation-triangle"></i> Atenção no Marco Zero`;
                          cenMsg = `O saldo inicial e final lidos do extrato não batem com a soma das transações. A conciliação não será travada para evitar falhas futuras.`;
                          cenColor = '#ef4444';
                      }
                  } else {
                      cenTitle = `<i class="fas fa-info-circle"></i> Marco Zero Pendente`;
                      cenMsg = `Extrato sem saldo detectado pela IA. As transações serão importadas, mas a conta ainda não terá uma âncora de conciliação.`;
                      cenColor = '#f59e0b';
                  }
              } else {
                  // TEM CONCILIAÇÃO
                  if (maxTime > cTimeAte) {
                      // Expansão pro FUTURO ou Buraco
                      let isAdjacenteFrente = (minTime <= cTimeAte + 86400000);
                      if (isAdjacenteFrente) {
                          if (extSaldoFim !== null) {
                              let somaFrente = faltantes.filter(f => parseDataBR(f.data) >= cTimeAte).reduce((acc, f) => acc + parseVal(f.valor), 0);
                              let saldoProjetado = calcularSaldoAte(cAteStr) + somaFrente;
                              if (Math.abs(saldoProjetado - extSaldoFim) <= 0.05) {
                                  cenTitle = `<i class="fas fa-link"></i> Conciliação Expandida (Para Frente)`;
                                  cenMsg = `O extrato é contínuo e o saldo matemático bateu perfeitamente!<br><br><b>Novo Período Conciliado:</b> ${cDesdeStr} até ${maxDataExtratoStr}`;
                                  cenColor = '#10b981';
                                  payloadConciliacao = { acao: 'expansao_frente', ate: maxDataExtratoStr };
                              } else {
                                  cenTitle = `<i class="fas fa-exclamation-triangle"></i> Divergência Matemática (Para Frente)`;
                                  cenMsg = `O extrato é contínuo, mas o Saldo Final lido do arquivo (R$ ${extSaldoFim.toFixed(2)}) não bate com a soma matemática do sistema (R$ ${saldoProjetado.toFixed(2)}). As transações serão importadas sem expandir a conciliação.`;
                                  cenColor = '#ef4444';
                              }
                          } else {
                              cenTitle = `<i class="fas fa-exclamation-circle"></i> Extrato sem Saldo Final`;
                              cenMsg = `Não foi possível validar a expansão de conciliação pois a IA não encontrou o saldo final no arquivo.`;
                              cenColor = '#f59e0b';
                          }
                      } else {
                          cenTitle = `<i class="fas fa-unlink"></i> Importação Desconexa (Buraco Temporal)`;
                          cenMsg = `Existe um salto temporal entre a última conciliação (${cAteStr}) e este extrato (${minDataExtratoStr}). Os lançamentos serão importados como Não Conciliados.`;
                          cenColor = '#f59e0b';
                      }
                  } else if (cTimeDesde > 0 && minTime < cTimeDesde) {
                      // Expansão pro PASSADO
                      let isAdjacenteTras = (maxTime >= cTimeDesde - 86400000);
                      if (isAdjacenteTras) {
                          if (extSaldoIni !== null) {
                              let somaTras = faltantes.filter(f => parseDataBR(f.data) <= cTimeDesde).reduce((acc, f) => acc + parseVal(f.valor), 0);
                              if (Math.abs((extSaldoIni + somaTras) - (contaMatch.saldo_inicial || 0)) <= 0.05) {
                                  cenTitle = `<i class="fas fa-link"></i> Conciliação Expandida (Para o Passado)`;
                                  cenMsg = `O extrato é contínuo. O Saldo Inicial Oficial da conta foi reancorado!<br><br><b>Novo Período Conciliado:</b> ${minDataExtratoStr} até ${cAteStr}`;
                                  cenColor = '#10b981';
                                  payloadConciliacao = { acao: 'expansao_tras', desde: minDataExtratoStr, saldo_inicial: extSaldoIni };
                              } else {
                                  cenTitle = `<i class="fas fa-exclamation-triangle"></i> Divergência Matemática (Para o Passado)`;
                                  cenMsg = `O extrato é contínuo, mas o Saldo Inicial lido não conecta matematicamente com o saldo base anterior da conta. A reancoragem foi abortada.`;
                                  cenColor = '#ef4444';
                              }
                          } else {
                              cenTitle = `<i class="fas fa-exclamation-circle"></i> Extrato sem Saldo Inicial`;
                              cenMsg = `Não foi possível validar matematicamente a expansão pro passado pois a IA não encontrou o saldo inicial no arquivo.`;
                              cenColor = '#f59e0b';
                          }
                      } else {
                          cenTitle = `<i class="fas fa-unlink"></i> Importação Desconexa (Passado)`;
                          cenMsg = `Existe um salto temporal entre este extrato (${maxDataExtratoStr}) e o marco inicial da conta (${cDesdeStr}).`;
                          cenColor = '#f59e0b';
                      }
                  } else {
                      cenTitle = `<i class="fas fa-ban"></i> Extrato Sobreposto`;
                      cenMsg = `Este extrato cai integralmente dentro do período já conciliado. Apenas transações inéditas (que não foram duplicadas) serão incluídas.`;
                      cenColor = '#6b7280';
                  }
              }
              
              alertaConciliacao.innerHTML = `<strong>${cenTitle}</strong><br><div style="margin-top:8px; line-height: 1.4;">${cenMsg}</div>`;
              alertaConciliacao.style.background = cenColor === '#10b981' ? 'rgba(16, 185, 129, 0.1)' : (cenColor === '#ef4444' ? 'rgba(239, 68, 68, 0.1)' : (cenColor === '#f59e0b' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(107, 114, 128, 0.1)'));
              alertaConciliacao.style.color = cenColor;
              alertaConciliacao.style.border = `1px solid ${cenColor}`;
              
              window.payloadConciliacaoGlobal = payloadConciliacao; // Variável global para a rotina de salvar!
          } else {
              alertaConciliacao.innerHTML = `<strong><i class="fas fa-credit-card"></i> Cartão de Crédito ou Conta Nova</strong><br><div style="margin-top:5px;">Lançamentos de cartão ou de contas recém-criadas seguem a importação padrão sem expansão contínua.</div>`;
              alertaConciliacao.style.background = 'rgba(59, 130, 246, 0.1)';
              alertaConciliacao.style.color = '#3b82f6';
              alertaConciliacao.style.border = '1px solid rgba(59, 130, 246, 0.2)';
              
              let maxDataStr = new Date(maxTime).toLocaleDateString('pt-BR');
              window.payloadConciliacaoGlobal = { acao: 'ignorar_matematica', ate: maxDataStr };
          }

          confContainer.appendChild(alertaConciliacao);

          const btnProsseguir = document.createElement('button');
          btnProsseguir.className = 'btn btn-primary';
          btnProsseguir.innerHTML = 'Prosseguir com a Importação <i class="fas fa-arrow-right"></i>';
          btnProsseguir.style.width = '100%';
          btnProsseguir.style.marginTop = '10px';
          confContainer.appendChild(btnProsseguir);

          btnProsseguir.addEventListener('click', () => {
              confContainer.style.display = 'none';
              tableContent.style.display = 'block';
              
              if (faltantes.length > 0) {
                  if (btnCategorizar) {
                      btnCategorizar.style.display = 'inline-flex';
                      btnCategorizar.disabled = false;
                  }
              } else {
                  isCategorizado = true;
              }
              if (btnSalvar) btnSalvar.style.display = 'inline-flex';
              
              if (faltantes.length === 0 && sobrando.length > 0) {
                 isCategorizado = true;
                 btnSalvar.innerHTML = 'Sincronizar Exclusões <i class="fas fa-save"></i>';
              } else if (faltantes.length === 0 && sobrando.length === 0) {
                 addFeedback(`A planilha já está 100% idêntica ao extrato!`, 'success');
              }
              
              renderizarTabelaUnificada();
          });
      }

      resultContainer.style.display = 'block';
      
      resumoDiv.style.display = 'flex';
      resumoDiv.innerHTML = `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 8px 16px; border-radius: 20px; color: var(--accent-blue); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-plus-circle"></i> <strong>${faltantes.length}</strong> Novos
        </div>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 16px; border-radius: 20px; color: #ef4444; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-minus-circle"></i> <strong>${sobrando.length}</strong> a Excluir
        </div>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 20px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-check-circle"></i> <strong>${corretos.length}</strong> Corretos
        </div>
      `;

      // Mensagens antigas movidas para dentro do newBtnConf

    } catch (err) {
      console.error(err);
      stopAIThinking();
      addFeedback(`ERRO: ${err.message}`, 'error');
      if (btnImport) {
        btnImport.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Erro`;
        setTimeout(() => {
          btnImport.innerHTML = btnImportOriginal;
          btnImport.disabled = false;
        }, 4000);
      }
    } finally {
      uploadInput.value = '';
    }
  });


  // FUNÇÃO UNIFICADA DE RENDERIZAÇÃO
  function renderizarTabelaUnificada() {
    let tbodyHtml = '';

    const dic = window.dicionarioGeral || {};
    const catKeys = Object.keys(dic).sort();
    
    // Atualiza o quadro da IA
    const ninjaCatContainer = document.getElementById('ninja-categorizador-container');
    const ninjaCatText = document.getElementById('ninja-categorizador-text');
    
    if (analiseCategorizacao) {
      if (ninjaCatContainer) ninjaCatContainer.style.display = 'flex';
      if (ninjaCatText) ninjaCatText.innerText = `"${analiseCategorizacao}"`;
    } else {
      if (ninjaCatContainer) ninjaCatContainer.style.display = 'none';
    }
    
    // Define qual passo estamos para a classe do unified-table
    const unifiedTable = document.getElementById('unified-table');
    unifiedTable.className = 'step-1-active';

    const criarLinha = (tipo, item, index, isFaltante) => {
      let icon = tipo === "Adicionar" ? "➕" : (tipo === "Excluir" ? "🗑️" : "✔️");
      let colorTipo = tipo === "Adicionar" ? "var(--accent-blue)" : (tipo === "Excluir" ? "#ef4444" : "var(--text-muted)");
      
      let t = isFaltante ? item : (tipo === "Correto" ? item.planilha : item);
      let disabledAttr = ""; // Sempre editável para categorias no Passo 1 se for Adicionar, ou Correto (conforme plano)!
      
      // Sanitize match
      if (t.categoria) {
        const matchedCat = catKeys.find(k => k.trim().toLowerCase() === String(t.categoria).trim().toLowerCase());
        if (matchedCat) {
          t.categoria = matchedCat;
          if (t.subcategoria && dic[matchedCat]) {
             const matchedSub = dic[matchedCat].find(s => s.trim().toLowerCase() === String(t.subcategoria).trim().toLowerCase());
             if (matchedSub) {
               t.subcategoria = matchedSub;
             }
          }
        }
      }

      let valColor = (t.valor && String(t.valor).includes('-')) ? 'var(--color-expense)' : 'var(--color-income)';
      
      let formatValor = t.valor !== undefined && t.valor !== null && !isNaN(parseFloat(t.valor)) 
          ? parseFloat(t.valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) 
          : (t.valor || '');
      
      let catOptions = '<option value="">-- Selecione --</option>';
      let catFound = false;
      catKeys.forEach(k => {
        const selected = (t.categoria === k) ? 'selected' : '';
        if (selected) catFound = true;
        catOptions += `<option value="${k}" ${selected}>${k}</option>`;
      });
      if (t.categoria && !catFound) {
        catOptions += `<option value="${t.categoria}" selected>✨ ${t.categoria} (Nova)</option>`;
      }

      let subcatOptions = '<option value="">-- Selecione --</option>';
      let subcatFound = false;
      if (t.categoria && dic[t.categoria]) {
        dic[t.categoria].forEach(sub => {
          const selected = (t.subcategoria === sub) ? 'selected' : '';
          if (selected) subcatFound = true;
          subcatOptions += `<option value="${sub}" ${selected}>${sub}</option>`;
        });
      }
      if (t.subcategoria && !subcatFound) {
        subcatOptions += `<option value="${t.subcategoria}" selected>✨ ${t.subcategoria} (Nova)</option>`;
      }
      catOptions += `<option value="__NEW__" style="font-weight:bold; color:var(--color-accent);">➕ Adicionar Nova...</option>`;
      if (t.categoria) {
         subcatOptions += `<option value="__NEW__" style="font-weight:bold; color:var(--color-accent);">➕ Adicionar Nova...</option>`;
      }

      let checkIgnorarHtml = '';
      if (tipo === "Adicionar" || tipo === "Excluir") {
        checkIgnorarHtml = `<div style="margin-top: 5px;"><label style="cursor:pointer; font-size:0.75rem; color:var(--text-primary); font-weight:normal; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="import-chk-ignorar" data-index="${index}" data-tipo="${tipo}" ${t.ignorar ? 'checked' : ''}> Ignorar</label></div>`;
      }
      
      let opacityStr = t.ignorar ? '0.4' : '1';
      let decoStr = t.ignorar ? 'line-through' : 'none';

      return `
        <tr class="progressive-item" style="border-bottom: 1px solid var(--border-color); transition: background 0.2s; opacity:${opacityStr}; text-decoration:${decoStr}; animation-delay: ${Math.min(index * 0.05, 2)}s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
          <td class="col-acao" style="padding:10px; color: ${colorTipo}; font-weight: bold;">
             <div>${icon} ${tipo}</div>
             ${checkIgnorarHtml}
          </td>
          <td class="col-data" style="padding:10px; white-space: nowrap;">${t.data || ''}</td>
          <td class="col-desc" style="padding:10px;">${t.descricao || ''}</td>
          <td class="col-conta" style="padding:10px;">${t.conta || contaDoExtrato || ''}</td>
          <td class="col-valor" style="padding:10px; white-space: nowrap; text-align:right; color: ${valColor}; font-weight: 600;">${formatValor}</td>
          <td class="col-cat" style="padding:10px;">
            <select class="import-sel-cat" data-index="${index}" data-tipo="${tipo}" style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:6px; width: 150px; font-size:0.8rem;">
              ${catOptions}
            </select>
          </td>
          <td class="col-subcat" style="padding:10px;">
            <select class="import-sel-subcat" data-index="${index}" data-tipo="${tipo}" style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:6px; width: 150px; font-size:0.8rem;">
              ${subcatOptions}
            </select>
          </td>
          <td class="col-parc" style="padding:10px; text-align:center;">
            -
          </td>
          <td class="col-conf" style="padding:10px; text-align:center; font-weight:bold; color:var(--text-secondary);">
            ${t.confianca || '-'}
          </td>
        </tr>
      `;
    };

    dadosSincronizacao.sobrando.forEach((item, i) => {
       tbodyHtml += criarLinha("Excluir", item, i, false);
    });
    dadosSincronizacao.faltantes.forEach((item, i) => {
       tbodyHtml += criarLinha("Adicionar", item, i, true);
    });
    dadosSincronizacao.corretos.forEach((item, i) => {
       tbodyHtml += criarLinha("Correto", item, i, false);
    });

    if (dadosSincronizacao.sobrando.length === 0 && dadosSincronizacao.faltantes.length === 0 && dadosSincronizacao.corretos.length === 0) {
       tbodyHtml += '<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum lançamento processado.</td></tr>';
    }

    document.getElementById('unified-table-body').innerHTML = tbodyHtml;
    document.getElementById('import-table-content').style.display = 'block';

    // Listeners
    document.querySelectorAll('.import-sel-cat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const tipo = e.target.getAttribute('data-tipo');
        
        let txList = tipo === 'Adicionar' ? dadosSincronizacao.faltantes : (tipo === 'Excluir' ? dadosSincronizacao.sobrando : dadosSincronizacao.corretos);
        let t = (tipo === 'Correto') ? txList[idx].planilha : txList[idx];

        let val = e.target.value;
        if (val === '__NEW__') {
           const newCat = prompt("Digite o nome da nova CATEGORIA:");
           if (newCat && newCat.trim() !== "") {
               val = newCat.trim();
               // Adiciona ao dicionário local para aparecer nos outros selects
               let dic = window.dicionarioGeral || {};
               if (!dic[val]) dic[val] = [];
           } else {
               e.target.value = t.categoria || "";
               return;
           }
        }

        t.categoria = val;
        t.subcategoria = ''; // reset

        renderizarTabelaUnificada();
      });
    });

    document.querySelectorAll('.import-sel-subcat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const tipo = e.target.getAttribute('data-tipo');
        let txList = tipo === 'Adicionar' ? dadosSincronizacao.faltantes : (tipo === 'Excluir' ? dadosSincronizacao.sobrando : dadosSincronizacao.corretos);
        let t = (tipo === 'Correto') ? txList[idx].planilha : txList[idx];
        
        let val = e.target.value;
        if (val === '__NEW__') {
           const newSub = prompt(`Digite o nome da nova SUBCATEGORIA para '${t.categoria}':`);
           if (newSub && newSub.trim() !== "") {
               val = newSub.trim();
               let dic = window.dicionarioGeral || {};
               if (dic[t.categoria] && !dic[t.categoria].includes(val)) {
                   dic[t.categoria].push(val);
               }
           } else {
               e.target.value = t.subcategoria || "";
               return;
           }
        }
        
        t.subcategoria = val;
        renderizarTabelaUnificada();
      });
    });

    document.querySelectorAll('.import-chk-ignorar').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const tipo = e.target.getAttribute('data-tipo');
        let txList = tipo === 'Adicionar' ? dadosSincronizacao.faltantes : (tipo === 'Excluir' ? dadosSincronizacao.sobrando : dadosSincronizacao.corretos);
        let t = (tipo === 'Correto') ? txList[idx].planilha : txList[idx];
        t.ignorar = e.target.checked;
        
        const tr = e.target.closest('tr');
        if (t.ignorar) {
           tr.style.opacity = '0.4';
           tr.style.textDecoration = 'line-through';
        } else {
           tr.style.opacity = '1';
           tr.style.textDecoration = 'none';
        }
      });
    });
  }

  // Lógica de ordenação global
  window.currentSortCol = '';
  window.currentSortAsc = true;
  window.sortUnifiedTable = function(col) {
    if (!dadosSincronizacao) return;

    if (window.currentSortCol === col) {
      window.currentSortAsc = !window.currentSortAsc;
    } else {
      window.currentSortCol = col;
      window.currentSortAsc = true;
    }

    const sortFn = (a, b) => {
       // "Corretos" items have their data inside `.planilha` when rendering, but for sorting:
       let itemA = a.planilha ? a.planilha : a;
       let itemB = b.planilha ? b.planilha : b;

       let valA = itemA[col] || '';
       let valB = itemB[col] || '';

       if (col === 'valor') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
       } else if (col === 'data') {
          // Simplistic date sort assuming DD/MM/YYYY
          let pA = String(valA).split('/');
          let pB = String(valB).split('/');
          if (pA.length === 3 && pB.length === 3) {
             valA = new Date(pA[2], pA[1]-1, pA[0]).getTime();
             valB = new Date(pB[2], pB[1]-1, pB[0]).getTime();
          }
       } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
       }

       if (valA < valB) return window.currentSortAsc ? -1 : 1;
       if (valA > valB) return window.currentSortAsc ? 1 : -1;
       return 0;
    };

    if (dadosSincronizacao.sobrando) dadosSincronizacao.sobrando.sort(sortFn);
    if (dadosSincronizacao.faltantes) dadosSincronizacao.faltantes.sort(sortFn);
    if (dadosSincronizacao.corretos) dadosSincronizacao.corretos.sort(sortFn);

    renderizarTabelaUnificada();
  };

  // FLUXO DE CATEGORIZACAO
  if (btnCategorizar) {
    btnCategorizar.addEventListener('click', async () => {
       if (dadosSincronizacao.faltantes.length > 0) {
         try {
           btnCategorizar.disabled = true;
           btnCategorizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Categorizando (IA)...';
           window.currentNinja = 'categorizador';
           addFeedback(`Enviando ${dadosSincronizacao.faltantes.length} transações para a IA Categorizar...`, 'ai'); startAIThinking();
           
           const categoriasTree = Object.assign({}, window.dicionarioGeral || {});
           // Garante que DIVERSOS sempre existe como fallback para a IA
           if (!categoriasTree['DIVERSOS']) categoriasTree['DIVERSOS'] = ['Diversos'];
           const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
           const contaExtrato = String(cabecalhoAtual['Nome da conta'] || cabecalhoAtual['conta'] || '').trim().toLowerCase();
           const contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === contaExtrato) : null;
           const isCartao = contaMatch && contaMatch.tipo === 'Cartão de Crédito';

           // M2: Histórico filtrado por conta (100 da mesma + 50 gerais) e M3: inclui obs do usuário
           const _dfHist = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
           const contaAtualNome = contaMatch ? contaMatch.nome.toLowerCase() : '';
           const filtrar180 = l => { const t = parseDataBR(l.data); return t > 0 && t > (Date.now() - 180 * 86400000); };
           const toRow = l => l.data + '|' + l.descricao + (l.obs ? ' [' + l.obs + ']' : '') + '|' + l.valor + '|' + (l.categoria || '') + '|' + (l.subcategoria || '');

           let histConta  = [];
           let histGeral  = [];
           if (_dfHist && _dfHist.lancamentos) {
             const todos = _dfHist.lancamentos.filter(filtrar180);
             histConta = todos.filter(l => (l.conta || '').toLowerCase() === contaAtualNome).slice(-100);
             histGeral = todos.filter(l => (l.conta || '').toLowerCase() !== contaAtualNome).slice(-50);
           }
           const historico180dias = [...histConta, ...histGeral];

           // M9: Cache local — pré-categoriza com base no histórico exato (reduz tokens e custo)
           const descParaCat = {}; // mapa descricao -> {categoria, subcategoria}
           historico180dias.forEach(l => {
             if (l.descricao && l.categoria && l.categoria !== 'DIVERSOS') {
               descParaCat[l.descricao.toLowerCase()] = { categoria: l.categoria, subcategoria: l.subcategoria || '' };
             }
           });

           let faltantesParaIA = [];
           let preCategorizados = 0;
           dadosSincronizacao.faltantes.forEach(t => {
             const hit = descParaCat[(t.descricao || '').toLowerCase()];
             if (hit) {
               t.categoria    = hit.categoria;
               t.subcategoria = hit.subcategoria;
               preCategorizados++;
             } else {
               faltantesParaIA.push(t);
             }
           });

           if (preCategorizados > 0) {
             addFeedback(`💾 Cache local: ${preCategorizados} já conhecidos pré-categorizados. Enviando ${faltantesParaIA.length} novos para a IA...`, 'system');
           }

           // Captura o total original ANTES de projetar parcelas (para cobrar moedas correto)
           const _qtdOriginalCateg = faltantesParaIA.length;

           if (faltantesParaIA.length === 0) {
             // Todos já categorizados pelo cache — pula chamada à IA
             analiseCategorizacao = `${preCategorizados} transações categorizadas via cache local (sem custo de IA).`;
             stopAIThinking();
             addFeedback(`✅ ${analiseCategorizacao}`, 'success');
             renderizarTabelaUnificada();
             btnCategorizar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
             btnCategorizar.disabled = false;
             return;
           }

           if (!window.GeminiService) throw new Error("Serviço Gemini não está disponível.");
           let resultCat = await window.GeminiService.categorizar({
             transacoes: faltantesParaIA,
             categoriasTree: categoriasTree,
             isCartaoCredito: isCartao,
             historico180dias: historico180dias
           });
           
           if (resultCat.status === 'error' || !resultCat.data) {throw new Error(resultCat.message || "Erro na categorização.");}
           
           // M4: Validação pós-IA — garante que categorias e subcategorias existem no dicionário
           const catValidas = Object.keys(categoriasTree);
           const iaData = (Array.isArray(resultCat.data) ? resultCat.data : []).map(t => {
             if (!catValidas.includes(t.categoria)) {
               console.warn('[Categorizador] Categoria inválida recebida da IA:', t.categoria, '→ forçando DIVERSOS');
               t.categoria    = 'DIVERSOS';
               t.subcategoria = 'Diversos';
             } else {
               const subValidas = categoriasTree[t.categoria] || [];
               if (subValidas.length > 0 && !subValidas.includes(t.subcategoria)) {
                 t.subcategoria = subValidas[0];
               }
             }
             return t;
           });

           // Mescla resultados da IA com os pré-categorizados localmente
           let transacoesProcessadas = dadosSincronizacao.faltantes.map(t => {
             if (t.categoria && t.categoria !== 'DIVERSOS') return t; // já cacheado
             const iaT = iaData.find(r => r.cod === t.cod || r.data === t.data && r.valor === t.valor && r.descricao === t.descricao);
             return iaT ? { ...t, ...iaT } : t;
           });
           
           if (isCartao) {
               let projetadas = [];
               transacoesProcessadas.forEach(t => {
                   projetadas.push(t);
                   if (t.parcelamento_info && t.parcelamento_info.parcelas_total > 1) {
                       let pTotal = parseInt(t.parcelamento_info.parcelas_total);
                       let pAtual = parseInt(t.parcelamento_info.parcela_atual);
                       if (!isNaN(pTotal) && !isNaN(pAtual) && pAtual === 1) {
                           for (let i = 2; i <= pTotal; i++) {
                               let newT = JSON.parse(JSON.stringify(t)); // clone
                               newT.cod = t.cod + "_parc_" + i;
                               newT.parcelamento_info = { parcela_atual: i, parcelas_total: pTotal };
                               newT.parcelamento = false; // Apenas a primeira fica true para a lógica antiga, mas info fica mantida
                               if (typeof addMonthsStr === 'function') {
                                  newT.vencimento = addMonthsStr(t.vencimento, i - 1);
                                  // Mantemos newT.data (data da compra) intacta para o matching com a fatura dos próximos meses
                               }
                               newT.descricao = t.descricao + ` (Parcela ${i}/${pTotal})`;
                               projetadas.push(newT);
                           }
                           t.descricao = t.descricao + ` (Parcela 1/${pTotal})`;
                           t.parcelamento = false; // Como já foi projetado automaticamente, não deve aparecer no Passo 2
                       }
                   }
               });
               dadosSincronizacao.faltantes = projetadas;
           } else {
               dadosSincronizacao.faltantes = transacoesProcessadas;
           }

           analiseCategorizacao = resultCat.analise_ia || "Categorização concluída.";
           stopAIThinking();
           // M5: Exibe o resumo da IA na interface
           addFeedback(`🤖 IA: "${analiseCategorizacao}"`, 'ai');

           // CortaCoins: debita 3 moedas por lancamento original categorizado com IA
           // Usa _qtdOriginalCateg (antes da projecao de parcelas de cartao)
           if (window.CortaCoins) {
             const _resCoin = await window.CortaCoins.debitar(_qtdOriginalCateg * 3, 'Categorizacao IA: ' + _qtdOriginalCateg + ' lancamentos');
             if (_resCoin && !_resCoin.ok) {
               addFeedback(`\n⚠️ CortaCoins: ${_resCoin.msg}`, 'system');
             } else if (_resCoin && !_resCoin.gratuito) {
               addFeedback(`\n🪙 -${_qtdOriginalCateg * 3} moedas (categorizacao IA)`, 'system');
             }
           }

           isCategorizado = true;
           
           // Renderizar a tabela com os selects
           renderizarTabelaUnificada();
           
           btnSalvar.innerHTML = 'Confirmar Sincronização <i class="fas fa-check-double"></i>';
           btnSalvar.disabled = false;
           btnCategorizar.style.display = 'none'; // Ocultar o botão depois de categorizar
           return; 

         } catch (err) {
           alert("Erro na IA: " + err.message);
           addFeedback(`Erro: ${err.message}`, 'error');
           btnCategorizar.disabled = false;
           btnCategorizar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
           return;
         }
       }
    });
  }
    
  // FLUXO DO BOTÃO PRINCIPAL (IMPORTAR)
  btnSalvar.addEventListener('click', async () => {
    try {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando (Salvando)...';
      
      let transacoesFinaisFaltantes = dadosSincronizacao.faltantes.filter(t => !t.ignorar);
      transacoesFinaisFaltantes.forEach(t => t.vencimento = t.vencimento || t.data);

      const contaDoExtrato = dadosSincronizacao.faltantes.length > 0 ? dadosSincronizacao.faltantes[0].conta : 
                             (dadosSincronizacao.corretos.length > 0 ? dadosSincronizacao.corretos[0].extrato.conta : "");

      let rawMaxStr = transacoesFinaisFaltantes.length > 0 || dadosSincronizacao.corretos.length > 0 
           ? [...transacoesFinaisFaltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].reduce((acc, curr) => {
               let tTime = parseDataBR(curr.data);
               return tTime > acc.time ? {time: tTime, str: curr.data} : acc;
             }, {time: 0, str: ""}).str 
           : "";

       if (rawMaxStr) {
          let p = rawMaxStr.split('/');
          if (p.length === 3) {
             let maxDateObj = new Date(p[2], parseInt(p[1])-1, p[0]);
             maxDateObj.setHours(0,0,0,0);
             let today = new Date();
             today.setHours(0,0,0,0);
             
             if (maxDateObj.getTime() === today.getTime()) {
                maxDateObj.setDate(maxDateObj.getDate() - 1);
                let nd = String(maxDateObj.getDate()).padStart(2, '0');
                let nm = String(maxDateObj.getMonth() + 1).padStart(2, '0');
                let ny = maxDateObj.getFullYear();
                rawMaxStr = `${nd}/${nm}/${ny}`;
             }
          }
       }
       
      let saldoInicialInformado = parseFloat(document.getElementById('input-saldo-inicial')?.value || cabecalhoAtual?.saldo_inicial || 0);
      let saldoFinalInformado = parseFloat(document.getElementById('input-saldo-final')?.value || cabecalhoAtual?.saldo_final || 0);

      // Calcular soma dos lançamentos do extrato
      let somaLancs = 0;
      [...transacoesFinaisFaltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].forEach(t => {
          if (!t.ignorar) somaLancs += parseFloat(t.valor || 0);
      });
      let diff = saldoFinalInformado - saldoInicialInformado - somaLancs;
      
      let _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      let contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === String(contaDoExtrato).toLowerCase()) : null;
      let tipoConta = contaMatch ? contaMatch.tipo : 'Conta Corrente';

      // Identificar o menor periodo e maior periodo para o extrato
      let allDatas = [...transacoesFinaisFaltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].map(t => parseDataBR(t.data)).filter(t => t > 0);
      let minDataTs = Math.min(...allDatas);
      let pInicio = minDataTs !== Infinity ? new Date(minDataTs).toLocaleDateString('pt-BR') : '';

      const extratoPayload = {
          conta: contaMatch ? contaMatch.nome : String(contaDoExtrato).trim(),
          tipo_conta: tipoConta,
          periodo_inicio: pInicio,
          periodo_fim: rawMaxStr,
          saldo_inicial: saldoInicialInformado,
          saldo_final: saldoFinalInformado,
          soma_lancamentos: somaLancs,
          diferenca: diff,
          status: Math.abs(diff) < 0.05 ? 'conciliado' : 'divergente',
          arquivo_nome: window.currentImportFile ? window.currentImportFile.name : '',
          qtd_lancamentos: transacoesFinaisFaltantes.length + dadosSincronizacao.corretos.length,
          vencimento_fatura: cabecalhoAtual?.['Vencimento da fatura'] || null
      };

      const payload = {
        action: 'sincronizar_periodo', 
        lancamentosNovos: transacoesFinaisFaltantes,
        idsParaExcluir: dadosSincronizacao.sobrando.filter(s => !s.ignorar).map(s => s.id || s.cod), 
        contaDoExtrato: contaMatch ? contaMatch.nome : String(contaDoExtrato).trim(),
        dataMaxStr: rawMaxStr,
        extratoPayload: extratoPayload,
        conciliacaoContinua: window.payloadConciliacaoGlobal || null
      };

      let jsonRes = { status: "success" };
      if (window.USE_FIREBASE) {
         await window.DB.sincronizarPeriodo(
             payload.lancamentosNovos,
             payload.idsParaExcluir,
             payload.contaDoExtrato,
             payload.dataMaxStr,
             payload.extratoPayload,
             payload.conciliacaoContinua
         );
         
         // Limpar extratos antigos (manter ultimos 5)
         await window.DB.limparExtratosAntigos(payload.contaDoExtrato, 5);
      } else {
          const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          jsonRes = await res.json();
      }
      
      if (jsonRes.status === "error") throw new Error(jsonRes.message);

      // CortaCoins: credita 1 moeda por lancamento importado
      if (window.CortaCoins && transacoesFinaisFaltantes.length > 0) {
        const _novos = transacoesFinaisFaltantes.filter(t => !t.ignorar).length;
        if (_novos > 0) await window.CortaCoins.creditar(_novos, 'Importacao extrato: ' + _novos + ' lancamentos');
      }

      alert("Sincronização realizada com sucesso! A página será atualizada.");
      window.location.reload();
      
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
      addFeedback(`Erro ao salvar: ${err.message}`, 'error');
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i class="fas fa-save"></i> Tentar Novamente';
    }
  });

});

function parseDataBR(str) {
  if (!str) return 0;
  let p = str.split('/');
  if (p.length === 3) return new Date(p[2], parseInt(p[1]) - 1, p[0], 0, 0, 0).getTime();
  p = str.split('-'); 
  if (p.length === 3) return new Date(p[0], parseInt(p[1]) - 1, p[2], 0, 0, 0).getTime();
  return 0;
}

// Passo 3 removido

function addMonthsStr(dateStr, months) {
  let parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  let d = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
  d.setMonth(d.getMonth() + months);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

