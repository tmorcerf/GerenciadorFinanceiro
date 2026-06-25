// importacao.js
// LÃ³gica simplificada para a nova aba de ImportaÃ§Ã£o

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

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset UI
    resultContainer.style.display = 'none';
    btnSalvar.style.display = 'none';
    resultContent.innerHTML = '';
    statusBox.style.display = 'flex';
    
    try {
      statusBox.innerHTML = '<i class="fas fa-sync-alt fa-spin" style="color: var(--color-primary);"></i> Lendo arquivo localmente...';
      statusBox.style.borderLeftColor = 'var(--color-primary)';
      
      // Utiliza a função global existente no app.js para ler o arquivo (PDF/CSV)
      const fileData = await window.extractFileContent(file);

      statusBox.innerHTML = '<i class="fas fa-magic fa-bounce" style="color: var(--color-warning);"></i> Extraindo inteligência dos dados (aguarde até 30s)...';
      statusBox.style.borderLeftColor = 'var(--color-warning)';

      // RequisiÃ§Ã£o para o backend
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
      });

      transacoesParaSalvar = transacoes;
      cabecalhoAtual = cabecalho;
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
      // Limpa o input para permitir enviar o mesmo arquivo novamente se necessÃ¡rio
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
      html += `
        <strong style="color:var(--text-secondary); display:block; margin-bottom: 6px;">Transações Extraídas (${transacoes.length}):</strong>
        <div style="overflow-x:auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
          <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
            <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
              <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                <th style="padding:8px;">COD</th>
                <th style="padding:8px;">DATA</th>
                <th style="padding:8px;">VENCIMENTO</th>
                <th style="padding:8px;">CONTA</th>
                <th style="padding:8px;">DESCRICAO</th>
                <th style="padding:8px;">VALOR</th>
                <th style="padding:8px;">CATEGORIA</th>
                <th style="padding:8px;">SUBCATEGORIA</th>
                <th style="padding:8px; text-align:center;">CONFIANCA</th>
                <th style="padding:8px; text-align:center;">PARCEL.</th>
              </tr>
            </thead>
            <tbody>
      `;

      const dic = window.dicionarioGeral || {};
      const catKeys = Object.keys(dic).sort();

      transacoes.forEach((t, index) => {
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

        const isParcel = (t.parcelamento === true || String(t.parcelamento).toLowerCase() === 'sim') ? 'checked' : '';
        
        // Confiança badge color
        let confColor = 'var(--text-muted)';
        let confText = t.confianca || '';
        if (confText) {
          const lowerConf = confText.toLowerCase();
          if (lowerConf.includes('alta') || lowerConf.includes('verde')) confColor = 'var(--color-income)';
          else if (lowerConf.includes('media') || lowerConf.includes('amarela')) confColor = 'var(--color-warning)';
          else if (lowerConf.includes('baixa') || lowerConf.includes('vermelha')) confColor = 'var(--color-expense)';
        }

        html += `
          <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <td style="padding:12px 8px; color: var(--text-muted);">${t.cod || ''}</td>
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
            <td style="padding:12px 8px; text-align:center;">
              ${confText ? `<span style="display:inline-block; padding:3px 8px; border-radius:12px; border:1px solid ${confColor}; color:${confColor}; font-size:0.75rem;">${confText}</span>` : ''}
            </td>
            <td style="padding:12px 8px; text-align:center;">
              <input type="checkbox" class="import-chk-parcel" data-index="${index}" ${isParcel} style="cursor:pointer; transform:scale(1.2);">
            </td>
          </tr>
        `;
      });

      html += `</tbody></table></div>`;
    }

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
  }

  // AÃ§Ã£o de Salvar LanÃ§amentos
  btnSalvar.addEventListener('click', async () => {
    if (transacoesParaSalvar.length === 0) return;
    
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
          transacoes: transacoesParaSalvar
        })
      });

      const result = await res.json();
      if (result.status === 'success') {
        alert("LanÃ§amentos salvos com sucesso!");
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
            transacoes: transacoesParaSalvar,
            categoriasTree: window.dicionarioGeral || {}
          })
        });

        const json = await res.json();
        
        if (json.status === 'error' || json.error) {
          alert("Erro: " + (json.message || json.error));
        } else {
          transacoesParaSalvar = json.data;
          renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual);
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

