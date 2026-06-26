// importacao.js
// LÃƒÂ³gica simplificada para a nova aba de ImportaÃƒÂ§ÃƒÂ£o

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('uploadFileImportacao');
  const statusBox = document.getElementById('import-status-box');
  const resultContainer = document.getElementById('import-result-container');
  const resultContent = document.getElementById('import-result-content');
  const btnSalvar = document.getElementById('btnSalvarImportacaoNova');
  const uploadZone = document.getElementById('upload-zone-container');

  if (!uploadInput) return;

  // Drag and drop magic
  if (uploadZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

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

  // Variável para guardar o resultado temporário antes de salvar
  let transacoesParaSalvar = [];
  let cabecalhoAtual = null;
  let isPasso2Concluido = false;
  let isPasso3Ativo = false;
  let transacoesPasso3 = [];
  let transacoesNormais = [];

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset UI
    resultContainer.style.display = 'none';
    btnSalvar.style.display = 'none';
    resultContent.innerHTML = '';
    statusBox.style.display = 'flex';
    btnSalvar.innerHTML = 'Ir para o Passo 3 <i class="fas fa-arrow-right"></i>';
    
    try {
      statusBox.innerHTML = '<i class="fas fa-sync-alt fa-spin" style="color: var(--color-primary);"></i> Lendo arquivo localmente...';
      statusBox.style.borderLeftColor = 'var(--color-primary)';
      
      // Utiliza a função global existente no app.js para ler o arquivo (PDF/CSV)
      const fileData = await window.extractFileContent(file);

      statusBox.innerHTML = '<i class="fas fa-magic fa-bounce" style="color: var(--color-warning);"></i> Extraindo inteligência dos dados (aguarde até 30s)...';
      statusBox.style.borderLeftColor = 'var(--color-warning)';

      // Requisição para o backend
      // APPS_SCRIPT_WEBAPP_URL is defined in app.js (global)
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'importar_simples_v2',
          fileContent: fileData.content,
          fileType: fileData.type,
          fileName: file.name
        })
      });

      const json = await res.json();
      
      if (json.status !== 'success') {
        throw new Error(json.message || "Erro desconhecido na IA.");
      }

      statusBox.innerHTML = '<i class="fas fa-check-circle" style="color: var(--color-income);"></i> Mágica concluída com sucesso!';
      statusBox.style.borderLeftColor = 'var(--color-income)';

      // Processa a resposta
      const dataIA = json.data;
      let transacoes = [];
      let cabecalho = null;

      if (Array.isArray(dataIA)) {
        transacoes = dataIA;
      } else if (dataIA && dataIA.lancamentos) {
        transacoes = dataIA.lancamentos;
        cabecalho = dataIA.cabecalho;
      } else if (dataIA && dataIA.transacoes) {
        transacoes = dataIA.transacoes;
        cabecalho = dataIA.cabecalho;
      }

      // Limpa a tentativa de categorização do Passo 1 para não confundir o usuário
      transacoes.forEach(t => {
        t.categoria = '';
        t.subcategoria = '';
        let dupVal = false;
        if (t) {
          for (let key in t) {
            if (key.toLowerCase().includes('duplicad')) {
              dupVal = t[key];
              break;
            }
          }
        }
        t.duplicado = (dupVal === true || String(dupVal).toLowerCase().trim() === 'sim');
      });

      transacoesParaSalvar = transacoes;
      cabecalhoAtual = cabecalho;
      isPasso2Concluido = false;
      isPasso3Ativo = false;
      if (document.getElementById('passo3-container')) document.getElementById('passo3-container').style.display = 'none';
      
      // Renderiza a Tabela de Debug
      renderizarTabelaDebug(transacoes, cabecalho);
      

      if (transacoes.length > 0) {
        btnSalvar.style.display = 'inline-block';
        const btnCategorizar = document.getElementById('btnCategorizarIA');
        if (btnCategorizar) btnCategorizar.style.display = 'inline-block';
      }

    } catch (err) {
      console.error(err);
      statusBox.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--color-expense);"></i> Erro: ${err.message}`;
      statusBox.style.borderLeftColor = 'var(--color-expense)';
    } finally {
      // Limpa o input para permitir enviar o mesmo arquivo novamente se necessário
      uploadInput.value = '';
    }
  });

  function renderizarTabelaDebug(transacoes, cabecalho) {
    let html = '';

    if (cabecalho && Object.keys(cabecalho).length > 0) {
      html += `
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(145deg, var(--bg-card) 0%, rgba(30, 37, 51, 0.6) 100%); border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 1.2rem 0; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
            <i class="fas fa-file-invoice-dollar" style="color: var(--color-accent); font-size: 1.3rem;"></i> Resumo da Extração
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      `;
      
      for (const [key, value] of Object.entries(cabecalho)) {
        // Ignora propriedades que não devem aparecer como cards
        if (typeof value === 'object') continue;
        
        let icon = 'fa-info-circle';
        const keyLower = key.toLowerCase();
        if (keyLower.includes('conta')) icon = 'fa-university';
        else if (keyLower.includes('institui')) icon = 'fa-building-columns';
        else if (keyLower.includes('periodo') || keyLower.includes('data')) icon = 'fa-calendar-alt';
        else if (keyLower.includes('quantidade') || keyLower.includes('total')) icon = 'fa-hashtag';
        
        html += `
            <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 1.2rem; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px;">
                <i class="fas ${icon}" style="color: rgba(255,255,255,0.3);"></i> ${key}
              </div>
              <div style="font-size: 1.15rem; font-weight: 600; color: var(--color-primary); word-break: break-word;">${value || '-'}</div>
            </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }

    if (transacoes.length === 0) {
      html += `<p style="color:var(--text-secondary);">Nenhuma transação encontrada.</p>`;
    } else {
      const dic = window.dicionarioGeral || {};
      const catKeys = Object.keys(dic).sort();

      const duplicadas = [];
      const unicas = [];
      
      transacoes.forEach((t, index) => {
        let dupVal = false;
        if (t) {
          for (let key in t) {
            if (key.toLowerCase().includes('duplicad')) {
              dupVal = t[key];
              break;
            }
          }
        }
        t.duplicado = (dupVal === true || String(dupVal).toLowerCase().trim() === 'sim');
        
        if (t.duplicado) {
          duplicadas.push({t, index});
        } else {
          unicas.push({t, index});
        }
      });

      if (duplicadas.length > 0) {
        html += `
          <details style="margin-bottom: 1.5rem; background: rgba(220, 53, 69, 0.05); border: 1px solid var(--color-expense); border-radius: 6px; padding: 10px;">
            <summary style="cursor: pointer; color: var(--color-expense); font-weight: bold; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-exclamation-triangle"></i> Lançamentos Duplicados (${duplicadas.length}) - Expanda para ver
            </summary>
            <div style="margin-top: 10px; overflow-x:auto; max-height: 250px; overflow-y: auto;">
              <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
                <thead style="position: sticky; top: 0; background: rgba(30, 37, 51, 0.95); z-index: 1;">
                  <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                    <th style="padding:8px; display:none;">COD</th>
                    <th style="padding:8px;">DATA</th>
                    <th style="padding:8px;">VENCIMENTO</th>
                    <th style="padding:8px;">CONTA</th>
                    <th style="padding:8px;">DESCRICAO</th>
                    <th style="padding:8px;">VALOR</th>
                    <th style="padding:8px; text-align:center;">DUPLICADO?</th>
                  </tr>
                </thead>
                <tbody>
        `;
        duplicadas.forEach((item) => {
          const t = item.t;
          const index = item.index;
          let valColor = (t.valor && String(t.valor).includes('-')) ? 'var(--color-expense)' : 'var(--color-income)';
          
          html += `
            <tr style="border-bottom: 1px solid var(--border-color); opacity: 0.8;">
              <td style="padding:8px; color: var(--text-muted); display:none;">${t.cod || ''}</td>
              <td style="padding:8px; white-space: nowrap;">${t.data || ''}</td>
              <td style="padding:8px; white-space: nowrap;">${t.vencimento || ''}</td>
              <td style="padding:8px;"><span style="display:inline-block; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.05); color:var(--text-secondary);"><i class="fas fa-university"></i> ${t.conta || ''}</span></td>
              <td style="padding:8px;">${t.descricao || ''}</td>
              <td style="padding:8px; white-space: nowrap; color: ${valColor}; font-weight: 600;">${t.valor || ''}</td>
              <td style="padding:8px; text-align:center;">
                <input type="checkbox" class="import-chk-duplicado" data-index="${index}" checked style="cursor:pointer; transform:scale(1.2);">
              </td>
            </tr>
          `;
        });
        html += `</tbody></table></div></details>`;
      }

      if (unicas.length > 0) {
        html += `
          <strong style="color:var(--text-secondary); display:block; margin-bottom: 6px;">Transações Únicas (${unicas.length}):</strong>
          <div style="overflow-x:auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
            <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
              <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                  <th style="padding:8px; display:none;">COD</th>
                  <th style="padding:8px;">DATA</th>
                  <th style="padding:8px;">VENCIMENTO</th>
                  <th style="padding:8px;">CONTA</th>
                  <th style="padding:8px;">DESCRICAO</th>
                  <th style="padding:8px;">VALOR</th>
                  <th style="padding:8px;">CATEGORIA</th>
                  <th style="padding:8px;">SUBCATEGORIA</th>
                  <th style="padding:8px; text-align:center;">CONFIANCA</th>
                  <th style="padding:8px; text-align:center;">PARCEL.</th>
                  ${!isPasso2Concluido ? '<th style="padding:8px; text-align:center;">DUPLICADO?</th>' : ''}
                </tr>
              </thead>
              <tbody>
        `;

        unicas.forEach((item) => {
          const t = item.t;
          const index = item.index;
          // Sanitize and match IA output with dictionary (case-insensitive and trim)
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
            catOptions += `<option value="${t.categoria}" selected>⚠️ ${t.categoria} (Não encontrada na lista)</option>`;
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
            subcatOptions += `<option value="${t.subcategoria}" selected>⚠️ ${t.subcategoria} (Não encontrada na lista)</option>`;
          }

          // Confiança badge color
          let corConfianca = 'var(--text-muted)';
          if (t.confianca) {
            const lowerConf = String(t.confianca).toLowerCase();
            if (lowerConf.includes('alta') || lowerConf.includes('verde')) corConfianca = 'var(--color-income)';
            else if (lowerConf.includes('media') || lowerConf.includes('amarela')) corConfianca = 'var(--color-warning)';
            else if (lowerConf.includes('baixa') || lowerConf.includes('vermelha')) corConfianca = 'var(--color-expense)';
          }

          html += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
              <td style="padding:12px 8px; color: var(--text-muted); display:none;">${t.cod || ''}</td>
              <td style="padding:12px 8px; white-space: nowrap;">${t.data || ''}</td>
              <td style="padding:12px 8px; white-space: nowrap;">${t.vencimento || ''}</td>
              <td style="padding:12px 8px; font-size: 0.8rem;">
                <span style="display:inline-block; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.05); color:var(--text-secondary);">
                  <i class="fas fa-university"></i> ${t.conta || ''}
                </span>
              </td>
              <td style="padding:12px 8px;">${t.descricao || ''}</td>
              <td style="padding:12px 8px; white-space: nowrap; color: ${valColor}; font-weight: 600;">${t.valor || ''}</td>
              <td style="padding:12px 8px;">
                <select class="import-sel-cat" data-index="${index}" style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:4px; width: 150px;">
                  ${catOptions}
                </select>
              </td>
              <td style="padding:12px 8px;">
                <select class="import-sel-subcat" data-index="${index}" style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:4px; width: 150px;">
                  ${subcatOptions}
                </select>
              </td>
              <td style="padding:8px; text-align:center;">
                <span style="font-weight:bold; color: ${corConfianca};">${t.confianca || '-'}</span>
              </td>
              <td style="padding:8px; text-align:center;">
                <input type="checkbox" class="import-chk-parcel" data-index="${index}" ${t.parcelamento ? 'checked' : ''} style="cursor:pointer; transform:scale(1.2);">
              </td>
              ${!isPasso2Concluido ? `
              <td style="padding:8px; text-align:center;">
                <input type="checkbox" class="import-chk-duplicado" data-index="${index}" ${t.duplicado ? 'checked' : ''} style="cursor:pointer; transform:scale(1.2);">
              </td>` : ''}
            </tr>
          `;
        });
        html += `</tbody></table></div>`;
      }
    }

      html += `
        <details style="margin-bottom: 1.5rem; background: rgba(30, 37, 51, 0.5); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
          <summary style="cursor: pointer; color: var(--text-secondary); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-code"></i> Inspecionar JSON bruto da IA (Debug)
          </summary>
          <pre style="margin-top: 10px; padding: 10px; background: #000; color: #0f0; font-size: 0.75rem; overflow-x: auto; max-height: 200px;">${JSON.stringify(transacoes, null, 2)}</pre>
        </details>
      `;

    resultContent.innerHTML = html;
    resultContainer.style.display = 'block';

    // Adicionar listener para atualizar subcategorias dinamicamente se o usuario mudar a categoria
    document.querySelectorAll('.import-sel-cat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        const newCat = e.target.value;
        transacoesParaSalvar[idx].categoria = newCat;
        
        transacoesParaSalvar[idx].subcategoria = ''; // reset subcat
        
        // Atualizar options do subcat correspondente
        const subcatSel = document.querySelector(`.import-sel-subcat[data-index="${idx}"]`);
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

    // Atualizar objeto global ao mudar os outros inputs
    document.querySelectorAll('.import-sel-subcat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        transacoesParaSalvar[idx].subcategoria = e.target.value;
      });
    });
    
    document.querySelectorAll('.import-chk-parcel').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        transacoesParaSalvar[idx].parcelamento = e.target.checked;
        
      });
    });

    document.querySelectorAll('.import-chk-duplicado').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-index');
        transacoesParaSalvar[idx].duplicado = e.target.checked;
        renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual);
        
      });
    });
  }

  // Ação de Salvar Lançamentos
  btnSalvar.addEventListener('click', async () => {
    if (transacoesParaSalvar.length === 0) return;
    
    if (!isPasso3Ativo) {
      const txNormais = [];
      const txPasso3 = [];
      transacoesParaSalvar.filter(t => !t.duplicado).forEach(t => {
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
        
        resultContent.style.display = 'none';
        renderizarPasso3(transacoesPasso3);
        
        btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar TUDO';
        return; 
      }
    }
    
    let transacoesFinais = isPasso3Ativo ? [...transacoesNormais, ...transacoesPasso3] : transacoesParaSalvar.filter(t => !t.duplicado);
    
    // Mostra feedback de carregamento
    const btnOriginalText = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    try {
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'salvar_ia',
          transacoes: transacoesFinais
        })
      });

      const result = await res.json();
      if (result.status === 'success') {
        alert("Lançamentos salvos com sucesso!");
        // Limpa a tela
        resultContainer.style.display = 'none';
        transacoesParaSalvar = [];
        statusBox.innerHTML = '<i class="fas fa-check-double"></i> Tudo salvo. Aguardando novo arquivo...';
        statusBox.style.color = 'var(--text-secondary)';
      } else {
        throw new Error(result.message);
      }

    } catch(err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      btnSalvar.innerHTML = btnOriginalText;
      btnSalvar.disabled = false;
    }
  });

  const btnCategorizar = document.getElementById('btnCategorizarIA');
  if (btnCategorizar) {
    btnCategorizar.addEventListener('click', async () => {
      if (transacoesParaSalvar.length === 0) return;
      
      const btnOriginalText = btnCategorizar.innerHTML;
      btnCategorizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando Histórico...';
      btnCategorizar.disabled = true;
      
      statusBox.innerHTML = '<i class="fas fa-magic fa-bounce" style="color: var(--color-accent);"></i> Cruzando dados com histórico (pode levar 30s)...';
      statusBox.style.display = 'flex';
      statusBox.style.borderLeftColor = 'var(--color-accent)';
      
      try {
        const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'categorizar_v2',
            transacoes: transacoesParaSalvar.filter(t => !t.duplicado),
            categoriasTree: window.dicionarioGeral || {}
          })
        });

        const json = await res.json();
        
        if (json.status === 'error' || json.error) {
          alert("Erro: " + (json.message || json.error));
        } else {
          transacoesParaSalvar = json.data;
          isPasso2Concluido = true;
          renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual);
        
          
          btnSalvar.innerHTML = 'Ir para o Passo 3 <i class="fas fa-arrow-right"></i>';
          
          statusBox.innerHTML = '<i class="fas fa-check-circle" style="color: var(--color-income);"></i> Categorização inteligente aplicada!';
          statusBox.style.borderLeftColor = 'var(--color-income)';
        }
      } catch(err) {
        alert("Erro ao categorizar: " + err.message);
      } finally {
        btnCategorizar.innerHTML = btnOriginalText;
        btnCategorizar.disabled = false;
      }
    });
  }

});

function processarPasso3(txs) {
  let result = [];
  txs.forEach(t => {
     const cat = (t.categoria || '').toLowerCase();
     const isTransfer = cat.includes('transfer') || cat.includes('pagamento de cart') || cat.includes('investimento') || cat.includes('aplica');
     const isParcel = t.parcelamento === true || String(t.parcelamento).toLowerCase() === 'sim';

     if (isTransfer) {
        // Row 1: Original
        result.push({ ...t, isPasso3Original: true });
        
        // Row 2: Counterpart
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
        let currentParcel = 1;
        let totalParcel = 1;
        const match = (t.descricao || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
           currentParcel = parseInt(match[1], 10);
           totalParcel = parseInt(match[2], 10);
        }
        
        result.push({ ...t, isPasso3ParcelaOriginal: true, parcelaAtual: currentParcel, totalParcelas: totalParcel });
        
        if (totalParcel > currentParcel) {
           for (let i = currentParcel + 1; i <= totalParcel; i++) {
              let newVenc = addMonthsStr(t.vencimento, i - currentParcel);
              let newDesc = t.descricao.replace(/(\d+)\s*\/\s*(\d+)/, i + '/' + totalParcel);
              
              result.push({
                 ...t,
                 vencimento: newVenc,
                 descricao: newDesc,
                 isPasso3ParcelaFutura: true,
                 parcelaAtual: i,
                 totalParcelas: totalParcel
              });
           }
        }
     }
  });
  return result;
}

function addMonthsStr(dateStr, months) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
     let d = parseInt(parts[0], 10);
     let m = parseInt(parts[1], 10) - 1;
     let y = parseInt(parts[2], 10);
     let date = new Date(y, m + months, d);
     let dd = String(date.getDate()).padStart(2, '0');
     let mm = String(date.getMonth() + 1).padStart(2, '0');
     let yyyy = date.getFullYear();
     return dd + '/' + mm + '/' + yyyy;
  }
  return dateStr;
}

function renderizarPasso3(txs) {
  let passo3Div = document.getElementById('passo3-container');
  if (!passo3Div) {
    passo3Div = document.createElement('div');
    passo3Div.id = 'passo3-container';
    passo3Div.style.marginTop = '2rem';
    document.getElementById('import-result-container').appendChild(passo3Div);
  }
  
  let contasOptions = '<option value="">-- Selecione a Contrapartida --</option>';
  const contasArr = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : (window.dadosFinanceiros && window.dadosFinanceiros.contas ? window.dadosFinanceiros.contas : []);
  if (contasArr && Array.isArray(contasArr)) {
     contasArr.forEach(c => {
        if (c.nome) {
           contasOptions += `<option value="` + c.nome + `">` + c.nome + `</option>`;
        }
     });
  }

  const txsTransfers = txs.filter(t => t.isPasso3Original || t.isPasso3Mirror);
  const txsParcels = txs.filter(t => t.isPasso3ParcelaOriginal || t.isPasso3ParcelaFutura);

  let html = `<div style="padding: 1.5rem; background: linear-gradient(145deg, rgba(30,37,51,0.6) 0%, var(--bg-card) 100%); border-radius: 12px; border: 1px solid var(--border-color);">
      <h4 style="margin: 0 0 1.2rem 0; color: var(--color-accent); display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
        <i class="fas fa-random"></i> Passo 3: Revisão Final
      </h4>
      <p style="color:var(--text-secondary); margin-bottom:1rem; font-size:0.9rem;">
        Abaixo estão os lançamentos que exigem sua atenção especial.
      </p>`;

  const generateTable = (list, title, titleColor, icon) => {
      if (list.length === 0) return '';
      let tableHtml = `
      <h5 style="margin: 1.5rem 0 1rem 0; color: ` + titleColor + `; display: flex; align-items: center; gap: 8px; font-size: 1.05rem;">
        <i class="fas ` + icon + `"></i> ` + title + `
      </h5>
      <div style="overflow-x:auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 2rem;">
        <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
          <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
            <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
              <th style="padding:8px; display:none;">COD</th>
              <th style="padding:8px;">TIPO</th>
              <th style="padding:8px;">DATA</th>
              <th style="padding:8px;">VENCIMENTO</th>
              <th style="padding:8px;">CONTA</th>
              <th style="padding:8px;">DESCRICAO</th>
              <th style="padding:8px;">VALOR</th>
              <th style="padding:8px;">CATEGORIA</th>
            </tr>
          </thead>
          <tbody>`;
          
      list.forEach((t) => {
          const idxOriginal = txs.indexOf(t);
          let valColor = (t.valor && String(t.valor).includes('-')) ? 'var(--color-expense)' : 'var(--color-income)';
          
          let tipoBadge = '';
          let bgStyle = "transparent";
          
          if (t.isPasso3Original) {
              tipoBadge = '<span style="background:var(--color-accent); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Origem (TR)</span>';
          } else if (t.isPasso3Mirror) {
              tipoBadge = '<span style="background:var(--color-warning); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Destino (TR)</span>';
              bgStyle = "rgba(255,193,7,0.05)";
          } else if (t.isPasso3ParcelaOriginal) {
              tipoBadge = `<span style="background:var(--color-income); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Parcela ` + t.parcelaAtual + `/` + t.totalParcelas + `</span>`;
          } else if (t.isPasso3ParcelaFutura) {
              tipoBadge = `<span style="background:var(--text-muted); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">Projeção ` + t.parcelaAtual + `/` + t.totalParcelas + `</span>`;
              bgStyle = "rgba(255,255,255,0.02)";
          }
    
          let contaContent = t.conta || '';
          if (t.isPasso3Mirror) {
              contaContent = `<select class="import-passo3-conta" data-index="` + idxOriginal + `" style="background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:4px; width:150px;">
                  ` + contasOptions + `
              </select>`;
          } else {
              contaContent = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.05); color:var(--text-secondary);"><i class="fas fa-university"></i> ` + (t.conta||'') + `</span>`;
          }
    
          tableHtml += `<tr style="border-bottom: 1px solid var(--border-color); background:`+bgStyle+`;">
              <td style="padding:12px 8px; display:none;">` + (t.originalCod || t.cod || '') + `</td>
              <td style="padding:12px 8px;">` + tipoBadge + `</td>
              <td style="padding:12px 8px;">` + (t.data || '') + `</td>
              <td style="padding:12px 8px;">` + (t.vencimento || '') + `</td>
              <td style="padding:12px 8px;">` + contaContent + `</td>
              <td style="padding:12px 8px;">` + (t.descricao || '') + `</td>
              <td style="padding:12px 8px; color: `+valColor+`; font-weight: 600;">` + (t.valor || '') + `</td>
              <td style="padding:12px 8px;">` + (t.categoria || '') + `</td>
          </tr>`;
      });
      
      tableHtml += `</tbody></table></div>`;
      return tableHtml;
  };

  html += generateTable(txsTransfers, 'Transferências (Origem e Destino)', 'var(--color-warning)', 'fa-exchange-alt');
  html += generateTable(txsParcels, 'Projeção de Parcelamentos', 'var(--color-income)', 'fa-layer-group');
  
  html += `
        <details style="margin-bottom: 1.5rem; background: rgba(30, 37, 51, 0.5); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
          <summary style="cursor: pointer; color: var(--text-secondary); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-code"></i> Inspecionar JSON bruto recebido da IA (Debug)
          </summary>
          <pre style="margin-top: 10px; padding: 10px; background: #000; color: #0f0; font-size: 0.75rem; overflow-x: auto; max-height: 200px;">${JSON.stringify(txs, null, 2)}</pre>
        </details>
      `;

  html += `</div>`;
  passo3Div.innerHTML = html;
  passo3Div.style.display = 'block';
  
  // Attach events
  document.querySelectorAll('.import-passo3-conta').forEach(sel => {
      sel.addEventListener('change', (e) => {
          const idx = e.target.getAttribute('data-index');
          txs[idx].conta = e.target.value;
      });
  });
}



