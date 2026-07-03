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
  const btnSalvar = document.getElementById('btnSalvarImportacaoNova');
  const uploadZone = document.getElementById('upload-zone-container');
  const feedbackConsole = document.getElementById('importFeedbackConsole');
  const resumoDiv = document.getElementById('importResumo');

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

  function parseDataBR(str) {
    if (!str) return 0;
    let p = str.split('/');
    if (p.length === 3) return new Date(p[2], parseInt(p[1]) - 1, p[0], 0, 0, 0).getTime();
    p = str.split('-'); 
    if (p.length === 3) return new Date(p[0], parseInt(p[1]) - 1, p[2], 0, 0, 0).getTime();
    return 0;
  }



  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    window.currentImportFile = file;

    // Reset UI e Estados
    resultContainer.style.display = 'none';
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
    
    btnSalvar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-arrow-right"></i>';
    
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

      const contaDoExtrato = String(cabecalho['Nome da conta'] || cabecalho['conta'] || '').trim().toLowerCase();
      feedbackConsole.innerHTML += `\n<span style="color: var(--accent-blue);">Sucesso! Extraídas ${dadosExtrato.length} transações. Conta: ${cabecalho['Nome da conta'] || 'Desconhecida'}</span>\n`;

      if (dadosExtrato.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo.");
      }

      let minTime = Infinity;
      let maxTime = 0;
      dadosExtrato.forEach(t => {
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
      const _df = typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros : window.dadosFinanceiros;
      if (_df && _df.lancamentos) {
         baseLocal = _df.lancamentos;
      }

      feedbackConsole.innerHTML += `DEBUG: minTime=${new Date(minTime).toLocaleDateString()}, maxTime=${new Date(maxTime).toLocaleDateString()}\\n`;
      let debugLocal = baseLocal.filter(l => String(l.conta).trim().toLowerCase() === contaDoExtrato);
      feedbackConsole.innerHTML += `DEBUG: Temos ${debugLocal.length} itens na base local para a conta '${contaDoExtrato}'.\\n`;
      if (debugLocal.length > 0) {
          let l = debugLocal[0];
          feedbackConsole.innerHTML += `Exemplo: data=${l.data}, valor=${l.valor}, tTime=${parseDataBR(l.data)}.\\n`;
      }

      let poolLocal = baseLocal.filter(L => {
         let matchConta = String(L.conta).trim().toLowerCase() === contaDoExtrato;
         let tTime = parseDataBR(L.data);
         let matchTempo = (tTime >= (minTime - 3*86400000) && tTime <= (maxTime + 3*86400000));
         return matchConta && matchTempo;
      });

      feedbackConsole.innerHTML += `Encontrados ${poolLocal.length} lançamentos locais na conta '${contaDoExtrato}' no período (com margem de 3 dias).\\n`;

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
         return diff <= (2 * 24 * 60 * 60 * 1000); // 2 dias margem
      };

      dadosExtrato.forEach((ext, index) => {
         ext.cod = ext.cod || "TX_NEW_" + index;
         
         let matchIdx = poolLocal.findIndex(loc => {
            let dataOk = isDataIgual(ext.data, loc.data);
            let valOk = isValorIgual(ext.valor, loc.valor);
            return dataOk && valOk;
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

      // Itens "sobrando" (para excluir) só devem ser aqueles que caem EXATAMENTE no período do extrato. 
      // Se caírem na "margem de 3 dias" fora do extrato e não casarem, apenas ignoramos.
      let sobrando = poolLocal.filter(loc => {
         let tTime = parseDataBR(loc.data);
         return (tTime >= minTime && tTime <= maxTime);
      });

      dadosSincronizacao = { corretos, faltantes, sobrando };
      
      feedbackConsole.innerHTML += `Cruzamento finalizado! Faltantes (novos): ${faltantes.length} | Corretos: ${corretos.length} | Sobrando (excluir): ${sobrando.length}.\n`;

      renderizarTabelaUnificada();
      
      resultContainer.style.display = 'block';
      resumoDiv.style.display = 'block';
      resumoDiv.innerHTML = `<strong>Resumo:</strong> <span style="color:var(--accent-blue)">+${faltantes.length} novos</span> | <span style="color:#ef4444">-${sobrando.length} a excluir</span> | <span style="color:var(--text-muted)">${corretos.length} corretos mantidos</span>`;

      if (faltantes.length > 0) {
         btnSalvar.style.display = 'inline-flex';
         btnSalvar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
      } else if (sobrando.length > 0) {
         // Não tem faltantes, mas tem sobrando -> Vai direto pro fim
         isCategorizado = true;
         btnSalvar.style.display = 'inline-flex';
         btnSalvar.innerHTML = 'Sincronizar Exclusões <i class="fas fa-save"></i>';
      } else {
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
      
      let catOptions = '<option value="">-- Selecione --</option>';
      let catFound = false;
      catKeys.forEach(k => {
        const selected = (t.categoria === k) ? 'selected' : '';
        if (selected) catFound = true;
        catOptions += `<option value="${k}" ${selected}>${k}</option>`;
      });
      if (t.categoria && !catFound) {
        catOptions += `<option value="${t.categoria}" selected>⚠️ ${t.categoria} (Não encontrada)</option>`;
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
        subcatOptions += `<option value="${t.subcategoria}" selected>⚠️ ${t.subcategoria} (Não encontrada)</option>`;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
          <td class="col-acao" style="padding:10px; color: ${colorTipo}; font-weight: bold;">${icon} ${tipo}</td>
          <td class="col-data" style="padding:10px; white-space: nowrap;">${t.data || ''}</td>
          <td class="col-desc" style="padding:10px;">${t.descricao || ''}</td>
          <td class="col-conta" style="padding:10px;">${t.conta || contaDoExtrato || ''}</td>
          <td class="col-valor" style="padding:10px; white-space: nowrap; text-align:right; color: ${valColor}; font-weight: 600;">${t.valor || ''}</td>
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
            <input type="checkbox" class="import-chk-parcel" data-index="${index}" data-tipo="${tipo}" ${t.parcelamento ? 'checked' : ''} style="cursor:pointer; transform:scale(1.2);">
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

        t.categoria = e.target.value;
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
        t.subcategoria = e.target.value;
      });
    });

    document.querySelectorAll('.import-chk-parcel').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const tipo = e.target.getAttribute('data-tipo');
        let txList = tipo === 'Adicionar' ? dadosSincronizacao.faltantes : (tipo === 'Excluir' ? dadosSincronizacao.sobrando : dadosSincronizacao.corretos);
        let t = (tipo === 'Correto') ? txList[idx].planilha : txList[idx];
        t.parcelamento = e.target.checked;
      });
    });
  }

  // FLUXO DO BOTÃO PRINCIPAL
  btnSalvar.addEventListener('click', async () => {
    // ESTADO 1: Acabou de fazer a triagem, vai categorizar os faltantes
    if (!isCategorizado) {
       if (dadosSincronizacao.faltantes.length > 0) {
         try {
           btnSalvar.disabled = true;
           btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Categorizando (IA)...';
           feedbackConsole.innerHTML += `\nEnviando ${dadosSincronizacao.faltantes.length} transações para a IA Categorizar...`;
           
           const categoriasTree = (window.dadosFinanceiros && window.dadosFinanceiros.categorias) ? window.dadosFinanceiros.categorias : window.dicionarioGeral || {};
           const resCat = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
             method: 'POST',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
               action: 'categorizar_v2',
               transacoes: dadosSincronizacao.faltantes,
               categoriasTree: categoriasTree
             })
           });
           const jsonCat = await resCat.json();
           if (jsonCat.status === "error") throw new Error(jsonCat.message);
           
           dadosSincronizacao.faltantes = jsonCat.data || dadosSincronizacao.faltantes; 
           analiseCategorizacao = jsonCat.analise_ia || "Categorização concluída.";
           feedbackConsole.innerHTML += ` Concluído!\\n`;

           isCategorizado = true;
           
           // Renderizar a tabela com os selects
           renderizarTabelaUnificada();
           
           btnSalvar.innerHTML = 'Prosseguir para Transferências <i class="fas fa-arrow-right"></i>';
           btnSalvar.disabled = false;
           return; 

         } catch (err) {
           alert("Erro na IA: " + err.message);
           feedbackConsole.innerHTML += `\\n<span style="color:#ef4444">Erro: ${err.message}</span>`;
           btnSalvar.disabled = false;
           btnSalvar.innerHTML = 'Categorizar Faltantes (IA) <i class="fas fa-magic"></i>';
           return;
         }
       }
    }
    
    // ESTADO 2: Já categorizou (ou não tinha faltantes), vai processar as transferências (Passo 3)
    if (isCategorizado && !isPasso3Ativo && dadosSincronizacao.faltantes.length > 0) {
       const txNormais = [];
       const txPasso3 = [];
       
       dadosSincronizacao.faltantes.forEach(t => {
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
         let unselected = transacoesPasso3.filter(t => t.isPasso3Mirror && !t.conta);
         if (unselected.length > 0) {
            alert("Por favor, selecione a conta de destino/origem para todas as transferências!");
            return;
         }
      }

      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando (Salvando)...';
      
      let transacoesFinaisFaltantes = isPasso3Ativo ? [...transacoesNormais, ...transacoesPasso3] : dadosSincronizacao.faltantes;

      const contaDoExtrato = dadosSincronizacao.faltantes.length > 0 ? dadosSincronizacao.faltantes[0].conta : 
                             (dadosSincronizacao.corretos.length > 0 ? dadosSincronizacao.corretos[0].extrato.conta : "");

      const payload = {
        action: 'sincronizar_periodo', 
        lancamentosNovos: transacoesFinaisFaltantes,
        idsParaExcluir: dadosSincronizacao.sobrando.map(s => s.id || s.cod), 
        contaDoExtrato: String(contaDoExtrato).trim().toLowerCase(),
        dataMaxStr: transacoesFinaisFaltantes.length > 0 || dadosSincronizacao.corretos.length > 0 
           ? [...transacoesFinaisFaltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].reduce((acc, curr) => {
               let tTime = parseDataBR(curr.data);
               return tTime > acc.time ? {time: tTime, str: curr.data} : acc;
             }, {time: 0, str: ""}).str 
           : ""
      };

      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const jsonRes = await res.json();
      
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
       contasInfo.forEach(c => {
         contasOptions += `<option value="${c.nome}">${c.nome}</option>`;
       });
       
       extraDesc = `<strong>Contrapartida: ${t.descricao}</strong>`;
       contaHtml = `
         <select class="p3-conta-select" data-index="${i}" style="width:100%; padding:5px; background:var(--bg-card); color:var(--text-primary); border:1px solid #8b5cf6; border-radius:4px;">
           ${contasOptions}
         </select>
       `;
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
