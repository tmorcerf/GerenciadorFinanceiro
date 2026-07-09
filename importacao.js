// importacao.js
// Lógica para a aba de Sincronização de Período Fechado (agora unificado na Importação Principal)

let dadosSincronizacao = { corretos: [], faltantes: [], sobrando: [] };
let isCategorizado = false;
let isPasso3Ativo = false;
let transacoesPasso3 = [];
let transacoesNormais = [];
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
  const uploadZone = document.getElementById('upload-zone-container');
  const feedbackConsole = document.getElementById('importFeedbackConsole');
  const resumoDiv = document.getElementById('importResumo');

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
        if (currentFileType.includes('pdf')) {
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



  uploadInput.addEventListener('change', async (e) => {
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
    if (document.getElementById('ia-mind-container')) {
      document.getElementById('ia-mind-container').style.display = 'none';
    }
    
    resumoDiv.style.display = 'none';
    resumoDiv.innerHTML = '';
    isCategorizado = false;
    isPasso3Ativo = false;
    analiseExtracao = "";
    analiseCategorizacao = "";
    cabecalhoAtual = null;
    
    if (document.getElementById('passo3-container')) {
      document.getElementById('passo3-container').style.display = 'none';
      document.getElementById('passo3-container').innerHTML = ''; // Passo 3 container ainda é populado via js (apenas o header dele)
    }

    if (btnImport) {
      btnImportOriginal = btnImport.innerHTML;
      btnImport.disabled = true;
    }
    
    if (btnCategorizar) btnCategorizar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
    btnSalvar.innerHTML = 'Confirmar Importação <i class="fas fa-check"></i>';
    
    try {
      feedbackConsole.innerHTML = `Arquivo carregado: ${file.name}\n`;
      if (btnImport) btnImport.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Lendo arquivo localmente...';
      
      const fileData = await window.extractFileContent(file);

      if (btnImport) btnImport.innerHTML = '<i class="fas fa-magic fa-bounce"></i> Extraindo dados (aguarde até 30s)...';
      feedbackConsole.innerHTML += "Enviando para a IA extrair transações...\n";

      // Requisição para o backend (SEM contasInfo para pegar tudo do periodo)
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'importar_simples_v2',
          fileContent: fileData.content,
          fileType: fileData.type,
          fileName: file.name,
          contasInfo: (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas.map(c => ({nome: c.nome, conciliado_ate: c.conciliado_ate})) : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas.map(c => ({nome: c.nome, conciliado_ate: c.conciliado_ate})) : [])
        })
      });

      const json = await res.json();
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

      feedbackConsole.innerHTML += `\n<span style="color: var(--accent-blue);">Sucesso! Extraídas ${dadosExtrato.length} transações.</span>\n`;

      if (dadosExtrato.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo.");
      }

      // DETECTAR CARTÃO DE CRÉDITO E VENCIMENTO
      const contaDoExtrato = String(cabecalho['Nome da conta'] || cabecalho['conta'] || '').trim().toLowerCase();
      const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      let contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === contaDoExtrato) : null;
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
         // Garantir que a transação tenha a conta preenchida (importante para a IA puxar o histórico da conta correta depois)
         if (!t.conta && cabecalho && (cabecalho['Nome da conta'] || cabecalho['conta'])) {
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
      feedbackConsole.innerHTML += `Período identificado: ${dataInicio} até ${dataFim}.\n`;

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
              feedbackConsole.innerHTML += `<span style="color:var(--color-warning);">Trava de Conciliação: ${ignored} itens do extrato ignorados (no período bloqueado).</span>\n`;
          }
      } else if (cTimeAte > 0 && isCartaoCredito) {
          // Para cartão de crédito, usamos a data de vencimento da fatura para checar a trava
          let tTimeVencimento = parseDataBR(vencimentoFatura);
          if (tTimeVencimento > 0 && tTimeVencimento <= cTimeAte) {
              throw new Error(`Esta fatura com vencimento em ${vencimentoFatura} já está no período conciliado (até ${contaMatch.conciliado_ate}).`);
          }
      }

      feedbackConsole.innerHTML += `DEBUG: minTime=${new Date(minTime).toLocaleDateString()}, maxTime=${new Date(maxTime).toLocaleDateString()}\n`;
      let debugLocal = baseLocal.filter(l => String(l.conta).trim().toLowerCase() === contaDoExtrato);
      feedbackConsole.innerHTML += `DEBUG: Temos ${debugLocal.length} itens na base local para a conta '${contaDoExtrato}'.\n`;
      if (debugLocal.length > 0) {
          let l = debugLocal[0];
          feedbackConsole.innerHTML += `Exemplo: data=${l.data}, valor=${l.valor}, tTime=${parseDataBR(l.data)}.\n`;
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

      feedbackConsole.innerHTML += `Encontrados ${poolLocal.length} lançamentos locais na conta '${contaDoExtrato}' no período do extrato (pós-trava).\n`;

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
          feedbackConsole.innerHTML += `\\n🔍 **DEBUG DE CRUZAMENTO:**\\n`;
          feedbackConsole.innerHTML += `O primeiro item não encontrado foi: ${faltantes[0].data} | ${faltantes[0].descricao} | ${faltantes[0].valor}.\\n`;
          feedbackConsole.innerHTML += `Tentamos cruzar com os seguintes itens na sua planilha:\\n`;
          poolLocal.slice(0, 3).forEach(loc => {
              let valExt = parseFloat(String(faltantes[0].valor).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
              let valLoc = parseFloat(String(loc.valor).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
              let t1 = parseDataBR(faltantes[0].data);
              let t2 = parseDataBR(loc.data);
              feedbackConsole.innerHTML += `  -> Planilha: ${loc.data} | ${loc.obs} | ${loc.valor} (Dif. Dias: ${(Math.abs(t1-t2)/86400000).toFixed(0)}, Dif. Valor: ${Math.abs(Math.abs(valExt) - Math.abs(valLoc)).toFixed(2)})\\n`;
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
      
      feedbackConsole.innerHTML += `Cruzamento finalizado! Faltantes (novos): ${faltantes.length} | Corretos: ${corretos.length} | Sobrando (excluir): ${sobrando.length}.\n`;

      resultContainer.style.display = 'block';
      document.getElementById('ia-mind-container').style.display = 'flex';
      
      // Se não tem itens, não mostra botões
      if (dadosExtrato.length > 0) {
        if (faltantes.length > 0) {
            if (btnCategorizar) {
                btnCategorizar.style.display = 'inline-flex';
                btnCategorizar.disabled = false;
            }
        } else {
            isCategorizado = true;
        }
        btnSalvar.style.display = 'inline-flex';
      }

      renderizarTabelaUnificada();
      
      resumoDiv.style.display = 'block';
      resumoDiv.innerHTML = `<strong>Resumo:</strong> <span style="color:var(--accent-blue)">+${faltantes.length} novos</span> | <span style="color:#ef4444">-${sobrando.length} a excluir</span> | <span style="color:var(--text-muted)">${corretos.length} corretos mantidos</span>`;

      if (faltantes.length === 0 && sobrando.length > 0) {
         // Não tem faltantes, mas tem sobrando -> Vai direto pro fim
         isCategorizado = true;
         btnSalvar.style.display = 'inline-flex';
         btnSalvar.innerHTML = 'Sincronizar Exclusões <i class="fas fa-save"></i>';
      } else if (faltantes.length === 0 && sobrando.length === 0) {
         feedbackConsole.innerHTML += `\n<span style="color:var(--color-income);">A planilha já está 100% idêntica ao extrato!</span>`;
      }

    } catch (err) {
      console.error(err);
      feedbackConsole.innerHTML += `\n<span style="color: #ef4444;">ERRO: ${err.message}</span>`;
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
    const iaContainer = document.getElementById('ia-mind-container');
    const iaTitle = document.getElementById('ia-mind-title');
    const iaText = document.getElementById('ia-mind-text');
    
    if (analiseExtracao || analiseCategorizacao) {
      iaContainer.style.display = 'block';
      iaTitle.innerText = isCategorizado ? 'Categorização' : 'Extração';
      iaText.innerText = `"${isCategorizado ? analiseCategorizacao : analiseExtracao}"`;
    } else {
      iaContainer.style.display = 'none';
    }
    
    // Define qual passo estamos para a classe do unified-table
    const unifiedTable = document.getElementById('unified-table');
    unifiedTable.className = isPasso3Ativo ? 'step-3-active' : 'step-1-active';

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
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s; opacity:${opacityStr}; text-decoration:${decoStr};" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
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
           feedbackConsole.innerHTML += `\nEnviando ${dadosSincronizacao.faltantes.length} transações para a IA Categorizar...`;
           
           const categoriasTree = (window.dadosFinanceiros && window.dadosFinanceiros.categorias) ? window.dadosFinanceiros.categorias : window.dicionarioGeral || {};
           const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
           const contaExtrato = String(cabecalhoAtual['Nome da conta'] || cabecalhoAtual['conta'] || '').trim().toLowerCase();
           const contaMatch = (_df && _df.contas) ? _df.contas.find(c => c.nome.toLowerCase() === contaExtrato) : null;
           const isCartao = contaMatch && contaMatch.tipo === 'Cartão de Crédito';

           const resCat = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
             method: 'POST',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
               action: 'categorizar_v2',
               transacoes: dadosSincronizacao.faltantes,
               categoriasTree: categoriasTree,
               isCartaoCredito: isCartao
             })
           });
           const resultCat = await resCat.json();
           
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
           feedbackConsole.innerHTML += ` Concluído!\n`;

           isCategorizado = true;
           
           // Renderizar a tabela com os selects
           renderizarTabelaUnificada();
           
           btnSalvar.innerHTML = 'Prosseguir para Transferências <i class="fas fa-arrow-right"></i>';
           btnSalvar.disabled = false;
           btnCategorizar.style.display = 'none'; // Ocultar o botão depois de categorizar
           return; 

         } catch (err) {
           alert("Erro na IA: " + err.message);
           feedbackConsole.innerHTML += `\n<span style="color:#ef4444">Erro: ${err.message}</span>`;
           btnCategorizar.disabled = false;
           btnCategorizar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
           return;
         }
       }
    });
  }
    
  // FLUXO DO BOTÃO PRINCIPAL (IMPORTAR)
  btnSalvar.addEventListener('click', async () => {
    // ESTADO 2: Já categorizou (ou não tinha faltantes), vai processar as transferências (Passo 3)
    if (isCategorizado && !isPasso3Ativo && dadosSincronizacao.faltantes.length > 0) {
       const txNormais = [];
       const txPasso3 = [];
       
       dadosSincronizacao.faltantes.forEach(t => {
         if (t.ignorar) return;
         const cat = (t.categoria || '').toLowerCase();
         const isTransfer = cat.includes('transfer') || cat.includes('pagamento de cart') || cat.includes('investimento') || cat.includes('aplica');
         const isParcel = t.parcelamento === true || String(t.parcelamento).toLowerCase() === 'sim';
         
         if (isTransfer || isParcel) {
            txPasso3.push(t);
         } else {
            txNormais.push(t);
         }
       });

       if (txPasso3.length > 0) {
         isPasso3Ativo = true;
         transacoesNormais = txNormais;
         transacoesPasso3 = processarPasso3(txPasso3);
         
         document.getElementById('import-table-content').style.display = 'none'; // oculta a triagem/categorias
         renderizarPasso3(transacoesPasso3);
         
         btnSalvar.innerHTML = 'Sincronizar (Salvar) <i class="fas fa-save"></i>';
         return; 
       }
    }
    
    // ESTADO 3: Já tratou tudo, salva no Google Sheets
    try {
      if (isPasso3Ativo) {
         let unselected = transacoesPasso3.filter(t => t.isPasso3Mirror && !t.conta && !t.sugestaoExistente);
         if (unselected.length > 0) {
            let desejaProsseguir = confirm(`Você deixou ${unselected.length} transferência(s) sem conta de contrapartida. A contrapartida não será gerada no sistema para ela(s). Deseja prosseguir assim mesmo?`);
            if (!desejaProsseguir) return;
         }

         // VALIDAÇÃO DA TRAVA DE CONCILIAÇÃO
         let contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : []);
         let lockError = null;
         for (let t of transacoesPasso3) {
             if (t.isPasso3Mirror && !t.sugestaoExistente) {
                 let destAccount = contasInfo.find(c => c.nome.toLowerCase() === String(t.conta).trim().toLowerCase());
                 if (destAccount && destAccount.conciliado_ate) {
                     let cTimeAte = parseDataBR(destAccount.conciliado_ate);
                     let cTimeDesde = destAccount.conciliado_desde ? parseDataBR(destAccount.conciliado_desde) : 0;
                     let tTime = parseDataBR(t.data);
                     
                     let isBlocked = false;
                     if (cTimeAte > 0) {
                         if (cTimeDesde > 0) {
                             isBlocked = (tTime >= cTimeDesde && tTime <= cTimeAte);
                         } else {
                             isBlocked = (tTime <= cTimeAte);
                         }
                     }
                     
                     if (isBlocked) {
                         lockError = `Ação Bloqueada: Você não pode transferir para a conta '${destAccount.nome}' na data ${t.data}, pois ela já está conciliada.`;
                         break;
                     }
                 }
             }
         }
         
         if (lockError) {
             alert(lockError);
             return;
         }
      }

      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando (Salvando)...';
      
      let finalPasso3 = [];
      if (isPasso3Ativo) {
         transacoesPasso3.forEach(t => {
            if (t.isPasso3Original) {
               let mirror = transacoesPasso3.find(m => m.isPasso3Mirror && m.originalCod === t.cod);
               if (mirror) {
                  t.contaDestino = mirror.conta;
               }
               finalPasso3.push(t);
            } else if (t.isPasso3Mirror) {
               if (!t.sugestaoExistente && t.conta && t.conta.trim() !== '') {
                  finalPasso3.push(t);
               }
            } else {
               finalPasso3.push(t);
            }
});
      }
      
      let transacoesFinaisFaltantes = isPasso3Ativo ? [...transacoesNormais, ...finalPasso3] : dadosSincronizacao.faltantes.filter(t => !t.ignorar);

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

      const payload = {
        action: 'sincronizar_periodo', 
        lancamentosNovos: transacoesFinaisFaltantes,
        idsParaExcluir: dadosSincronizacao.sobrando.filter(s => !s.ignorar).map(s => s.id || s.cod), 
        contaDoExtrato: String(contaDoExtrato).trim().toLowerCase(),
        dataMaxStr: rawMaxStr
      };

      let jsonRes = { status: "success" };
      if (window.USE_FIREBASE) {
         await window.DB.sincronizarPeriodo(
             payload.lancamentosNovos,
             payload.idsParaExcluir,
             payload.contaDoExtrato,
             payload.dataMaxStr
         );
      } else {
          const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          jsonRes = await res.json();
      }
      
      if (jsonRes.status === "error") throw new Error(jsonRes.message);

      alert("Sincronização realizada com sucesso! A página será atualizada.");
      window.location.reload();
      
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
      feedbackConsole.innerHTML += `\\n<span style="color:#ef4444">Erro ao salvar: ${err.message}</span>`;
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

function buscarPossiveisContraPartidas(txMirror) {
    if (!window.dadosFinanceiros || !window.dadosFinanceiros.lancamentos) return [];
    
    let baseLocal = window.dadosFinanceiros.lancamentos;
    
    let parts = txMirror.data.split('/');
    let tsMirror = new Date(parts[2], parseInt(parts[1])-1, parts[0]).getTime();
    
    let valStr = String(txMirror.valor).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    let valorMirror = parseFloat(valStr) || 0;
    
    let sugestoes = [];
    baseLocal.forEach(l => {
       if (!l.data || !l.valor) return;
       let p = String(l.data).split('/');
       if (p.length !== 3) return;
       let tsHist = new Date(p[2], parseInt(p[1])-1, p[0]).getTime();
       
       let diffDias = Math.abs((tsMirror - tsHist) / (1000 * 60 * 60 * 24));
       
       let vHistStr = String(l.valor).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
       let valHist = parseFloat(vHistStr) || 0;
       
       if (diffDias <= 3 && Math.abs(valorMirror - valHist) < 0.05) {
          sugestoes.push(l);
       }
    });
    
    // Filtra duplicatas nas próprias sugestões
    let seen = new Set();
    return sugestoes.filter(s => {
       let key = `${s.conta}-${s.data}-${s.valor}`;
       if (seen.has(key)) return false;
       seen.add(key);
       return true;
    });
}

function processarPasso3(txs) {
  let result = [];
  txs.forEach(t => {
     const cat = (t.categoria || '').toLowerCase();
     const isTransfer = cat.includes('transfer') || cat.includes('pagamento de cart') || cat.includes('investimento') || cat.includes('aplica');
     const isParcel = t.parcelamento === true || String(t.parcelamento).toLowerCase() === 'sim';

     if (isTransfer) {
        result.push({ ...t, isPasso3Original: true });
        
        let valStr = String(t.valor).replace(',', '.');
        let numVal = parseFloat(valStr) || 0;
        let mirroredVal = (numVal * -1).toFixed(2).replace('.', ',');
        if (mirroredVal.indexOf('-') === -1 && parseFloat(valStr) < 0) {
           mirroredVal = '+' + mirroredVal;
        }
        
        result.push({
           ...t,
           valor: mirroredVal,
           conta: '', 
           isPasso3Mirror: true,
           originalCod: t.cod 
        });
     }
     if (isParcel && !isTransfer) {
        result.push({ ...t, isPasso3ParcelaOriginal: true, parcelaAtual: 1, parcelasTotal: 1 });
     }
  });
  return result;
}

function renderizarPasso3(txs) {
  const container = document.getElementById('passo3-container');
  container.style.display = 'block';
  
  // Oculta a Tabela de Triagem e Mostra apenas o quadro de Transferências
  document.getElementById('import-table-content').style.display = 'none';

  // Na verdade, a regra diz para mantermos a mesma tabela estrutural. 
  // Mas como esse Passo 2 tem um header "Passo 2: Transferências", vamos exibi-lo acima da tabela.
  // Vamos reexibir a div da tabela, mas atualizar o CSS para step-3-active.
  document.getElementById('import-table-content').style.display = 'block';
  const unifiedTable = document.getElementById('unified-table');
  unifiedTable.className = 'step-3-active'; // Ocultará Parc. 

  let headerHtml = `
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #8b5cf6;"><i class="fas fa-random"></i> Passo 2: Transferências e Parcelamentos</h3>
      <p style="margin:0; font-size: 0.9rem; color: var(--text-secondary);">Identificamos transferências ou parcelamentos. Por favor, preencha a conta de destino/origem para as transferências e configure os parcelamentos.</p>
    </div>
  `;
  container.innerHTML = headerHtml; // Container gets only the header now
  
  let tbodyHtml = '';
  
  txs.forEach((t, i) => {
    const isIncome = String(t.valor).indexOf('-') === -1;
    const color = isIncome ? 'var(--color-income)' : 'var(--color-expense)';
    
    let acaoHtml = '';
    let extraDesc = t.descricao;
    let descColor = 'var(--text-primary)';
    let contaHtml = t.conta || 'N/A';
    
    if (t.isPasso3Original) {
       acaoHtml = `<span style="color:var(--text-muted); font-size:0.8rem;">Principal</span>`;
    } else if (t.isPasso3Mirror) {
       descColor = '#8b5cf6';
       let contasOptions = '<option value="">-- Selecione a Conta --</option>';
       const contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : []);
       let tTime = parseDataBR(t.data);
       contasInfo.forEach(c => {
         let cTimeAte = c.conciliado_ate ? parseDataBR(c.conciliado_ate) : 0;
         let cTimeDesde = c.conciliado_desde ? parseDataBR(c.conciliado_desde) : 0;
         
         let isBlocked = false;
         if (cTimeAte > 0) {
             if (cTimeDesde > 0) {
                 isBlocked = (tTime >= cTimeDesde && tTime <= cTimeAte);
             } else {
                 isBlocked = (tTime <= cTimeAte);
             }
         }
         
         if (isBlocked) {
             contasOptions += `<option value="${c.nome}" disabled>${c.nome} [BLOQUEADA - Conciliada]</option>`;
         } else {
             contasOptions += `<option value="${c.nome}">${c.nome}</option>`;
         }
       });
       
       extraDesc = `<strong>Contrapartida: ${t.descricao}</strong>`;
       contaHtml = `
         <select class="p3-conta-select" data-index="${i}" style="width:100%; padding:5px; background:var(--bg-card); color:var(--text-primary); border:1px solid #8b5cf6; border-radius:4px;">
           ${contasOptions}
         </select>
       `;
       
       let sugestoes = buscarPossiveisContraPartidas(t);
       if (sugestoes.length > 0) {
          contaHtml += `<div style="margin-top: 8px; font-size: 0.85rem; padding: 8px; background: rgba(139, 92, 246, 0.1); border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="color: #8b5cf6; margin-bottom: 5px; font-weight: bold;"><i class="fas fa-lightbulb"></i> Sugestões de contrapartida já existentes:</div>`;
          sugestoes.forEach((s, sIdx) => {
             contaHtml += `
               <label style="display: block; margin-bottom: 3px; cursor: pointer; color: var(--text-primary);">
                 <input type="radio" name="sugestao-${i}" class="p3-sugestao-radio" data-index="${i}" value='${JSON.stringify(s)}'>
                 <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 5px;">${s.conta}</span>
                 ${s.data} | ${s.categoria} | R$ ${s.valor}
               </label>
             `;
          });
          contaHtml += `
               <label style="display: block; margin-top: 5px; cursor: pointer; color: var(--text-secondary);">
                 <input type="radio" name="sugestao-${i}" class="p3-sugestao-radio" data-index="${i}" value="" checked>
                 Nenhuma dessas (Criar novo lançamento na conta selecionada acima)
               </label>
          </div>`;
       }
       
       acaoHtml = `<span style="color:#8b5cf6; font-size:0.8rem;">Contrapartida</span>`;
    } else if (t.isPasso3ParcelaOriginal) {
       acaoHtml = `
         <div style="display:flex; gap:5px; align-items:center;">
            <span>Parc. 1 de</span>
            <input type="number" class="p3-parcel-total" data-index="${i}" value="${t.parcelasTotal}" min="1" max="120" style="width:50px; padding:3px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:3px;">
         </div>
       `;
    }

    tbodyHtml += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td class="col-acao" style="padding:10px;">${acaoHtml}</td>
        <td class="col-data" style="padding:10px; color:var(--text-secondary);">${t.data}</td>
        <td class="col-desc" style="padding:10px; color:${descColor};">${extraDesc}</td>
        <td class="col-conta" style="padding:10px;">${contaHtml}</td>
        <td class="col-valor" style="padding:10px; text-align:right; color:${color}; font-weight:bold;">${t.valor}</td>
        <td class="col-cat" style="padding:10px;"><span style="background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:12px; font-size:0.75rem;">${t.categoria || 'Sem Categoria'}</span></td>
        <td class="col-subcat" style="padding:10px;">${t.subcategoria || '-'}</td>
        <td class="col-parc" style="padding:10px;">-</td>
      </tr>
    `;
  });
  
  if (txs.length === 0) {
     tbodyHtml += '<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhuma transferência pendente.</td></tr>';
  }

  document.getElementById('unified-table-body').innerHTML = tbodyHtml;
  
  document.querySelectorAll('.p3-conta-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-index');
      transacoesPasso3[idx].conta = e.target.value;
    });
  });
  
  document.querySelectorAll('.p3-sugestao-radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-index');
      const val = e.target.value;
      const selectElem = document.querySelector(`.p3-conta-select[data-index="${idx}"]`);
      const tr = e.target.closest('tr');
      
      if (val) {
         let sugestao = JSON.parse(val);
         transacoesPasso3[idx].conta = sugestao.conta; 
         transacoesPasso3[idx].sugestaoExistente = sugestao;
         
         if (selectElem) {
            selectElem.value = sugestao.conta;
            selectElem.disabled = true;
         }
         if (tr) {
            tr.style.opacity = '0.5';
            tr.style.textDecoration = 'line-through';
         }
      } else {
         transacoesPasso3[idx].sugestaoExistente = null;
         if (selectElem) {
            selectElem.disabled = false;
            transacoesPasso3[idx].conta = selectElem.value;
         }
         if (tr) {
            tr.style.opacity = '1';
            tr.style.textDecoration = 'none';
         }
      }
    });
  });

  document.querySelectorAll('.p3-parcel-total').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-index');
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      transacoesPasso3[idx].parcelasTotal = val;
      
      const t = transacoesPasso3[idx];
      let newTxs = transacoesPasso3.filter(tx => !(tx.originalParcelCod === t.cod));
      transacoesPasso3 = newTxs;
      
      if (val > 1) {
         let baseDate = t.vencimento || t.data;
         for (let p = 2; p <= val; p++) {
            let nextD = addMonthsStr(baseDate, p - 1);
            transacoesPasso3.push({
               ...t,
               data: nextD,
               vencimento: nextD,
               isPasso3ParcelaFutura: true,
               isPasso3ParcelaOriginal: false,
               parcelaAtual: p,
               parcelasTotal: val,
               originalParcelCod: t.cod,
               descricao: `${t.descricao} (${p}/${val})`
            });
         }
      }
    });
  });
}

function addMonthsStr(dateStr, months) {
  let parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  let d = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
  d.setMonth(d.getMonth() + months);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
