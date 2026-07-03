// importacao.js
// Lógica para a aba de Sincronização de Período Fechado (agora unificado na Importação Principal)

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

  let dadosSincronizacao = { corretos: [], faltantes: [], sobrando: [] };
  
  // Máquina de estados
  let isCategorizado = false;
  let isPasso3Ativo = false;
  
  let transacoesPasso3 = [];
  let transacoesNormais = [];

  let analiseExtracao = "";
  let analiseCategorizacao = "";
  let cabecalhoAtual = null;

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    window.currentImportFile = file;

    // Reset UI e Estados
    resultContainer.style.display = 'none';
    btnSalvar.style.display = 'none';
    document.getElementById('import-table-content').innerHTML = '';
    resumoDiv.style.display = 'none';
    resumoDiv.innerHTML = '';
    isCategorizado = false;
    isPasso3Ativo = false;
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
      if (window.dadosFinanceiros && window.dadosFinanceiros.lancamentos) {
         baseLocal = window.dadosFinanceiros.lancamentos;
      }

      let poolLocal = baseLocal.filter(L => {
         if (String(L.conta).trim().toLowerCase() !== contaDoExtrato) return false;
         let tTime = parseDataBR(L.data);
         return (tTime >= minTime && tTime <= maxTime);
      });

      feedbackConsole.innerHTML += `Encontrados ${poolLocal.length} lançamentos locais neste mesmo período para esta conta.\nCruzando dados...\n`;

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
         // Garantir que todos tenham cod para não bugar o fluxo
         ext.cod = ext.cod || "TX_NEW_" + index;
         
         let matchIdx = poolLocal.findIndex(loc => {
            return isDataIgual(ext.data, loc.data) && isValorIgual(ext.valor, loc.valor);
         });

         if (matchIdx !== -1) {
            let matchedLocal = poolLocal.splice(matchIdx, 1)[0];
            corretos.push({
               extrato: ext,
               planilha: matchedLocal
            });
         } else {
            faltantes.push(ext);
         }
      });

      let sobrando = poolLocal.map(loc => loc);

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
    let html = `
      <div style="margin-bottom: 1.5rem; background: rgba(30, 37, 51, 0.5); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
        <h4 style="margin: 0 0 10px 0; color: var(--color-warning);"><i class="fas fa-robot"></i> Mente da IA (${isCategorizado ? 'Categorização' : 'Extração'})</h4>
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary); font-style: italic;">"${isCategorizado ? analiseCategorizacao : analiseExtracao}"</p>
      </div>
      
      <div style="overflow-x:auto; max-height: 500px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
        <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; color:var(--text-primary);">
          <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
            <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
              <th style="padding:10px;">AÇÃO</th>
              <th style="padding:10px;">DATA</th>
              <th style="padding:10px;">DESCRIÇÃO</th>
              <th style="padding:10px; text-align:right;">VALOR</th>
              <th style="padding:10px;">CATEGORIA</th>
              <th style="padding:10px;">SUBCATEGORIA</th>
              <th style="padding:10px; text-align:center;" title="Parcelamento?">PARC.</th>
            </tr>
          </thead>
          <tbody>
    `;

    const dic = window.dicionarioGeral || {};
    const catKeys = Object.keys(dic).sort();

    const criarLinha = (tipo, item, index, isFaltante) => {
      let icon = tipo === "Adicionar" ? "➕" : (tipo === "Excluir" ? "🗑️" : "✔️");
      let colorTipo = tipo === "Adicionar" ? "var(--accent-blue)" : (tipo === "Excluir" ? "#ef4444" : "var(--text-muted)");
      
      let t = isFaltante ? item : (tipo === "Correto" ? item.planilha : item);
      let disabledAttr = !isFaltante ? "disabled" : "";
      
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
          <td style="padding:10px; color: ${colorTipo}; font-weight: bold;">${icon} ${tipo}</td>
          <td style="padding:10px; white-space: nowrap;">${t.data || ''}</td>
          <td style="padding:10px;">${t.descricao || ''}</td>
          <td style="padding:10px; white-space: nowrap; text-align:right; color: ${valColor}; font-weight: 600;">${t.valor || ''}</td>
          <td style="padding:10px;">
            <select class="import-sel-cat" data-index="${index}" ${disabledAttr} style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:6px; width: 150px; font-size:0.8rem;">
              ${catOptions}
            </select>
          </td>
          <td style="padding:10px;">
            <select class="import-sel-subcat" data-index="${index}" ${disabledAttr} style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:6px; width: 150px; font-size:0.8rem;">
              ${subcatOptions}
            </select>
          </td>
          <td style="padding:10px; text-align:center;">
            <input type="checkbox" class="import-chk-parcel" data-index="${index}" ${t.parcelamento ? 'checked' : ''} ${disabledAttr} style="cursor:pointer; transform:scale(1.2);">
          </td>
        </tr>
      `;
    };

    dadosSincronizacao.sobrando.forEach((item, i) => {
       html += criarLinha("Excluir", item, i, false);
    });
    dadosSincronizacao.faltantes.forEach((item, i) => {
       html += criarLinha("Adicionar", item, i, true);
    });
    dadosSincronizacao.corretos.forEach((item, i) => {
       html += criarLinha("Correto", item, i, false);
    });

    if (dadosSincronizacao.sobrando.length === 0 && dadosSincronizacao.faltantes.length === 0 && dadosSincronizacao.corretos.length === 0) {
       html += '<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum lançamento processado.</td></tr>';
    }

    html += `</tbody></table></div>`;
    document.getElementById('import-table-content').innerHTML = html;

    // Listeners apenas para os Adicionar (faltantes) que não estão disabled
    document.querySelectorAll('.import-sel-cat:not([disabled])').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const newCat = e.target.value;
        dadosSincronizacao.faltantes[idx].categoria = newCat;
        dadosSincronizacao.faltantes[idx].subcategoria = ''; 
        
        // Pega o select de subcategoria na mesma linha (parent tr -> find select)
        const tr = e.target.closest('tr');
        const subcatSel = tr.querySelector('.import-sel-subcat');
        
        if (subcatSel) {
          let subOptions = '<option value="">-- Selecione --</option>';
          if (newCat && window.dicionarioGeral && window.dicionarioGeral[newCat]) {
            window.dicionarioGeral[newCat].forEach(sub => {
              subOptions += `<option value="${sub}">${sub}</option>`;
            });
          }
          subcatSel.innerHTML = subOptions;
        }
      });
    });

    document.querySelectorAll('.import-sel-subcat:not([disabled])').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        dadosSincronizacao.faltantes[idx].subcategoria = e.target.value;
      });
    });
    
    document.querySelectorAll('.import-chk-parcel:not([disabled])').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        dadosSincronizacao.faltantes[idx].parcelamento = e.target.checked;
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
  
  let html = `
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #8b5cf6;"><i class="fas fa-random"></i> Passo 2: Transferências e Parcelamentos</h3>
      <p style="margin:0; font-size: 0.9rem; color: var(--text-secondary);">Identificamos transferências ou parcelamentos. Por favor, preencha a conta de destino/origem para as transferências e configure os parcelamentos.</p>
    </div>
    
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse: collapse; font-size: 0.85rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
            <th style="padding:10px;">DATA</th>
            <th style="padding:10px;">DESCRIÇÃO / CONTA</th>
            <th style="padding:10px;">CATEGORIA</th>
            <th style="padding:10px; text-align:right;">VALOR</th>
            <th style="padding:10px;">AÇÃO</th>
          </tr>
        </thead>
        <tbody id="passo3-tbody">
  `;
  
  txs.forEach((t, i) => {
    const isIncome = String(t.valor).indexOf('-') === -1;
    const color = isIncome ? 'var(--color-income)' : 'var(--color-expense)';
    
    let acaoHtml = '';
    let extraDesc = t.descricao;
    let descColor = 'var(--text-primary)';
    
    if (t.isPasso3Original) {
       extraDesc = `<strong>${t.descricao}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);"><i class="fas fa-university"></i> ${t.conta}</span>`;
       acaoHtml = `<span style="color:var(--text-muted); font-size:0.8rem;">Principal</span>`;
    } else if (t.isPasso3Mirror) {
       descColor = '#8b5cf6';
       let contasOptions = '<option value="">-- Selecione a Conta Destino/Origem --</option>';
       const contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : []);
       contasInfo.forEach(c => {
         contasOptions += `<option value="${c.nome}">${c.nome}</option>`;
       });
       
       extraDesc = `<strong>Contrapartida: ${t.descricao}</strong><br>
                    <select class="p3-conta-select" data-index="${i}" style="margin-top:5px; width:100%; padding:5px; background:var(--bg-card); color:var(--text-primary); border:1px solid #8b5cf6; border-radius:4px;">
                      ${contasOptions}
                    </select>`;
       acaoHtml = `<span style="color:#8b5cf6; font-size:0.8rem;">Contrapartida</span>`;
    } else if (t.isPasso3ParcelaOriginal) {
       extraDesc = `<strong>${t.descricao}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);"><i class="fas fa-university"></i> ${t.conta}</span>`;
       acaoHtml = `
         <div style="display:flex; gap:5px; align-items:center;">
            <span>Parc. 1 de</span>
            <input type="number" class="p3-parcel-total" data-index="${i}" value="${t.parcelasTotal}" min="1" max="120" style="width:50px; padding:3px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:3px;">
         </div>
       `;
    }

    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding:10px; color:var(--text-secondary);">${t.data}</td>
        <td style="padding:10px; color:${descColor};">${extraDesc}</td>
        <td style="padding:10px;"><span style="background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:12px; font-size:0.75rem;">${t.categoria || 'Sem Categoria'}</span></td>
        <td style="padding:10px; text-align:right; color:${color}; font-weight:bold;">${t.valor}</td>
        <td style="padding:10px;">${acaoHtml}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
  
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
