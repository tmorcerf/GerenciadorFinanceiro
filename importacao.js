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
  function abrirModalConta(nomeDetectado, saldoSugerido) {
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
      if (inputBanco) inputBanco.value = '';
      if (inputSaldo) inputSaldo.value = saldoSugerido !== null && saldoSugerido !== undefined ? saldoSugerido : '';
      if (inputTipo)  inputTipo.value  = 'Conta Corrente';
      if (inputCor)   inputCor.value   = '#3b82f6';

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

      // Extração via Gemini (com fallback para Apps Script/Claude)
      const _contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas)
        ? dadosFinanceiros.contas.map(c => ({nome: c.nome, conciliado_ate: c.conciliado_ate}))
        : ((window.dadosFinanceiros && window.dadosFinanceiros.contas)
          ? window.dadosFinanceiros.contas.map(c => ({nome: c.nome, conciliado_ate: c.conciliado_ate}))
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

      if (dadosExtrato.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo.");
      }

      // DETECTAR CARTÃO DE CRÉDITO E VENCIMENTO
      const contaDoExtrato = String(cabecalho['Nome da conta'] || cabecalho['conta'] || '').trim().toLowerCase();
      const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      let contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === contaDoExtrato) : null;
      
      if (!contaMatch && contaDoExtrato !== '') {
          try {
            const saldoSugerido = (cabecalho && cabecalho.saldo_inicial !== undefined) ? cabecalho.saldo_inicial : null;
            const nomeDetectado = String(cabecalho['Nome da conta'] || cabecalho['conta'] || 'Conta Desconhecida').trim();
            const resultado = await abrirModalConta(nomeDetectado, saldoSugerido);

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
            vencimentoFatura = prompt(`Conta "${contaMatch.nome}" identificada como Cartão de Crédito.\nQual é a data de VENCIMENTO DESTA FATURA? (Ex: 15/06/2026)`);
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
                 return !(tTime >= cTimeDesde && tTime <= cTimeAte);
             } else {
                 return tTime > cTimeAte;
             }
          });
          let ignored = origLen - dadosExtrato.length;
          if (ignored > 0) {
              addFeedback(`Trava de Conciliação: ${ignored} itens do extrato ignorados (no período bloqueado).`, 'error');
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
         if (cTimeAte > 0) {
             if (cTimeDesde > 0) {
                 isBlocked = (tTime >= cTimeDesde && tTime <= cTimeAte);
             } else {
                 isBlocked = (tTime <= cTimeAte);
             }
         }
         let matchConciliado = !isBlocked; // Trava: não tocar no que está no período bloqueado
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
      // Conferência de Saldos (Nova Lógica)
      const confContainer = document.getElementById('conferencia-saldo-container');
      const inputSaldoIni = document.getElementById('input-saldo-inicial');
      const inputSaldoFim = document.getElementById('input-saldo-final');
      const inputSoma = document.getElementById('input-soma-lancamentos');
      const inputDiff = document.getElementById('input-diferenca-saldo');
      const btnConfirmarSaldo = document.getElementById('btn-confirmar-saldo');
      const msgDiff = document.getElementById('msg-diferenca-saldo');
      const tableContent = document.getElementById('import-table-content');

      if (confContainer && dadosExtrato.length > 0) {
          confContainer.style.display = 'block';
          tableContent.style.display = 'none';
          
          if (btnCategorizar) btnCategorizar.style.display = 'none';
          if (btnSalvar) btnSalvar.style.display = 'none';

          // Set initial values from extraction
          inputSaldoIni.value = (cabecalhoAtual && cabecalhoAtual.saldo_inicial !== undefined && cabecalhoAtual.saldo_inicial !== null) ? cabecalhoAtual.saldo_inicial : '';
          inputSaldoFim.value = (cabecalhoAtual && cabecalhoAtual.saldo_final !== undefined && cabecalhoAtual.saldo_final !== null) ? cabecalhoAtual.saldo_final : '';

          // Validação da Cadeia de Saldos (Extrato Anterior)
          let alertaCadeia = document.getElementById('alerta-cadeia-saldo');
          if (!alertaCadeia) {
              alertaCadeia = document.createElement('div');
              alertaCadeia.id = 'alerta-cadeia-saldo';
              alertaCadeia.style = "font-size: 0.85rem; padding: 12px; margin-bottom: 15px; border-radius: 8px; display: none;";
              confContainer.insertBefore(alertaCadeia, confContainer.children[1]); // insere antes do grid
          }
          alertaCadeia.style.display = 'none';

          console.log('[DEBUG-IMPORT] Iniciando validação da Cadeia de Saldos...');
          if (_df && _df.extratos) {
              let extratosConta = _df.extratos.filter(e => String(e.conta).toLowerCase() === contaDoExtrato && e.data_fim).sort((a,b) => parseDataBR(a.data_fim) - parseDataBR(b.data_fim));
              console.log(`[DEBUG-IMPORT] Encontrados ${extratosConta.length} extratos passados para a conta ${contaDoExtrato}`);
              let extratoAnterior = null;
              for (let i = extratosConta.length - 1; i >= 0; i--) {
                  if (parseDataBR(extratosConta[i].data_fim) < minTime) {
                      extratoAnterior = extratosConta[i];
                      break;
                  }
              }
              if (extratoAnterior && extratoAnterior.saldo_final !== undefined && extratoAnterior.saldo_final !== null) {
                  console.log('[DEBUG-IMPORT] Extrato imediatamente anterior encontrado:', extratoAnterior.data_inicio, 'a', extratoAnterior.data_fim, 'Saldo Final:', extratoAnterior.saldo_final);
                  let sfAnt = parseFloat(extratoAnterior.saldo_final);
                  let siAtual = parseFloat(inputSaldoIni.value || 0);
                  
                  console.log(`[DEBUG-IMPORT] Comparando Saldo Final Anterior (${sfAnt}) com Saldo Inicial Atual (${siAtual})`);
                  if (Math.abs(sfAnt - siAtual) > 0.05) {
                      console.log('[DEBUG-IMPORT] DIVERGÊNCIA na Cadeia de Saldos detectada!');
                      alertaCadeia.style.display = 'block';
                      alertaCadeia.style.background = 'rgba(239, 68, 68, 0.1)';
                      alertaCadeia.style.color = '#ef4444';
                      alertaCadeia.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                      alertaCadeia.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Atenção à Cadeia de Saldos:</strong> O saldo final do extrato anterior (${extratoAnterior.data_inicio} a ${extratoAnterior.data_fim}) foi de <strong>${sfAnt.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong>, mas o saldo inicial identificado agora é <strong>${siAtual.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong>. Corrija o saldo inicial para manter a consistência.`;
                  } else {
                      alertaCadeia.style.display = 'block';
                      alertaCadeia.style.background = 'rgba(16, 185, 129, 0.1)';
                      alertaCadeia.style.color = '#10b981';
                      alertaCadeia.style.border = '1px solid rgba(16, 185, 129, 0.2)';
                      alertaCadeia.innerHTML = `<i class="fas fa-check-circle"></i> <strong>Cadeia de Saldos OK:</strong> O saldo inicial bate perfeitamente com o final do extrato anterior (${extratoAnterior.data_inicio} a ${extratoAnterior.data_fim}).`;
                  }
              }
          }

          const atualizarSaldos = () => {
             let sIni = parseFloat(inputSaldoIni.value || 0);
             let sFim = parseFloat(inputSaldoFim.value || 0);
             let soma = 0;
             [...dadosSincronizacao.faltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].forEach(t => {
                soma += parseFloat(t.valor || 0);
             });
             
             let diff = sFim - sIni - soma;
             
             inputSoma.value = soma.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
             inputDiff.value = diff.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
             
             if (Math.abs(diff) > 0.05) {
                msgDiff.style.display = 'block';
                inputDiff.style.color = 'var(--color-warning)';
             } else {
                msgDiff.style.display = 'none';
                inputDiff.style.color = 'var(--text-primary)';
             }
          };

          atualizarSaldos();
          inputSaldoIni.addEventListener('input', atualizarSaldos);
          inputSaldoFim.addEventListener('input', atualizarSaldos);

          // Remove event listener antigo e adiciona novo (para evitar multiplos bind)
          const newBtnConf = btnConfirmarSaldo.cloneNode(true);
          btnConfirmarSaldo.parentNode.replaceChild(newBtnConf, btnConfirmarSaldo);
          
          newBtnConf.addEventListener('click', () => {
              if (inputSaldoIni.value === '' || inputSaldoFim.value === '') {
                 alert("Por favor, informe os saldos inicial e final (mesmo que sejam 0).");
                 return;
              }
              
              // Ocultar conferência e mostrar tabela e botões
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

           // Historico de 180 dias para contexto da IA (melhora drasticamente a precisao)
           const _dfHist = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
           const historico180dias = (_dfHist && _dfHist.lancamentos)
             ? _dfHist.lancamentos.filter(l => {
                 const t = parseDataBR(l.data);
                 return t > 0 && t > (Date.now() - 180 * 86400000);
               }).slice(-150)
             : [];

           // Captura o total original ANTES de projetar parcelas (para cobrar moedas correto)
           const _qtdOriginalCateg = dadosSincronizacao.faltantes.length;

           if (!window.GeminiService) throw new Error("Serviço Gemini não está disponível.");
           let resultCat = await window.GeminiService.categorizar({
             transacoes: dadosSincronizacao.faltantes,
             categoriasTree: categoriasTree,
             isCartaoCredito: isCartao,
             historico180dias: historico180dias
           });
           
           if (resultCat.status === 'error' || !resultCat.data) {throw new Error(resultCat.message || "Erro na categorização.");}
           
           let transacoesProcessadas = resultCat.data || dadosSincronizacao.faltantes;
           
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
           stopAIThinking(); addFeedback('Concluído!', 'ai');

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
        extratoPayload: extratoPayload
      };

      let jsonRes = { status: "success" };
      if (window.USE_FIREBASE) {
         await window.DB.sincronizarPeriodo(
             payload.lancamentosNovos,
             payload.idsParaExcluir,
             payload.contaDoExtrato,
             payload.dataMaxStr,
             payload.extratoPayload
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

