// importacao.js
// LÃƒÂ³gica simplificada para a nova aba de ImportaÃƒÂ§ÃƒÂ£o

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('uploadFileImportacao');
  
  const btnImport = document.getElementById('btn-import-novo');
  let btnImportOriginal = '';
  const resultContainer = document.getElementById('import-result-container');
  
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
  let analiseExtracao = "";
  let analiseCategorizacao = "";
  let isPasso2Concluido = false;
  let isPasso3Ativo = false;
  let transacoesPasso3 = [];
  let transacoesNormais = [];
  let currentSortCol = null;
  let currentSortDir = 'asc';

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    window.currentImportFile = file;

    // Reset UI
    resultContainer.style.display = 'none';
    btnSalvar.style.display = 'none';
    const existingBtn = document.getElementById('view-doc-btn');
    if (existingBtn) existingBtn.style.display = 'none';
    document.getElementById('import-summary-content').innerHTML = '';
    document.getElementById('import-table-content').innerHTML = '';
    if (btnImport) {
      btnImportOriginal = btnImport.innerHTML;
      btnImport.disabled = true;
    }
    
    btnSalvar.innerHTML = 'Tratar Transferências e Parcelamentos <i class="fas fa-arrow-right"></i>';
    
    try {
      if (btnImport) btnImport.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Lendo arquivo localmente...';
      
      // Utiliza a função global existente no app.js para ler o arquivo (PDF/CSV)
      const fileData = await window.extractFileContent(file);

      if (btnImport) btnImport.innerHTML = '<i class="fas fa-magic fa-bounce"></i> Extraindo dados (aguarde até 30s)...';

      // Requisição para o backend
      // APPS_SCRIPT_WEBAPP_URL is defined in app.js (global)
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

      // --- INÍCIO DO FILTRO INVISÍVEL DE CONCILIADOS (FRONTEND) ---
      const contasInfo = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas) ? dadosFinanceiros.contas : ((window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : []);
      if (contasInfo.length > 0) {
        const parseLocalDt = (str) => {
          if (!str) return 0;
          let s = String(str).trim().split(' ')[0]; 
          let p = s.split('/');
          if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0])).getTime();
          p = s.split('-');
          if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2])).getTime();
          if (typeof str === 'object' && str instanceof Date) return str.getTime();
          return 0;
        };

        transacoes = transacoes.filter(t => {
           let tTime = parseLocalDt(t.data);
           let tContaName = String(t.conta || cabecalho['Nome da conta'] || cabecalho['conta'] || '').toLowerCase().trim();
           
           let contaObj = contasInfo.find(c => String(c.nome).toLowerCase().trim() === tContaName);
           if (contaObj && contaObj.conciliado_ate) {
              let concTime = parseLocalDt(contaObj.conciliado_ate);
              if (tTime > 0 && concTime > 0 && tTime <= concTime) {
                 return false; // Descarta silenciosamente
              }
           }
           return true; 
        });
      }
      // --- FIM DO FILTRO INVISÍVEL ---

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
      
      // cabecalhoAtual já preenchido
      analiseExtracao = json.analise_ia || "";
      analiseCategorizacao = "";
      renderizarTabelaDebug(transacoes, cabecalho, analiseExtracao, analiseCategorizacao);
      

      if (transacoes.length > 0) {
        btnSalvar.style.display = 'inline-block';
        const btnCategorizarContainer = document.getElementById('import-ia-btn-container');
        if (btnCategorizarContainer) btnCategorizarContainer.style.display = 'flex';
        
        // Botão flutuante para ver documento original
        let viewDocBtn = document.getElementById('view-doc-btn');
        if (!viewDocBtn) {
          viewDocBtn = document.createElement('button');
          viewDocBtn.id = 'view-doc-btn';
          viewDocBtn.innerHTML = '<i class="fas fa-file-invoice"></i> Ver Extrato Original';
          viewDocBtn.style.position = 'fixed';
          viewDocBtn.style.bottom = '30px';
          viewDocBtn.style.right = '30px';
          viewDocBtn.style.zIndex = '9999';
          viewDocBtn.style.padding = '15px 25px';
          viewDocBtn.style.background = 'var(--color-primary)';
          viewDocBtn.style.color = '#fff';
          viewDocBtn.style.border = 'none';
          viewDocBtn.style.borderRadius = '50px';
          viewDocBtn.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
          viewDocBtn.style.cursor = 'pointer';
          viewDocBtn.style.fontSize = '15px';
          viewDocBtn.style.fontWeight = 'bold';
          viewDocBtn.style.transition = 'all 0.3s ease';
          viewDocBtn.onmouseover = () => { viewDocBtn.style.transform = 'scale(1.05) translateY(-5px)'; };
          viewDocBtn.onmouseout = () => { viewDocBtn.style.transform = 'scale(1) translateY(0)'; };
          viewDocBtn.addEventListener('click', () => {
             if (window.currentImportFile) {
                const url = URL.createObjectURL(window.currentImportFile);
                window.open(url, '_blank');
             }
          });
          document.body.appendChild(viewDocBtn);
          
          // Oculta quando sai da aba
          const observer = new MutationObserver(() => {
            const importSec = document.getElementById('import-section');
            if (importSec && importSec.style.display === 'none') {
              viewDocBtn.style.display = 'none';
            } else if (transacoesParaSalvar.length > 0) {
              viewDocBtn.style.display = 'block';
            }
          });
          const importSec = document.getElementById('import-section');
          if (importSec) {
             observer.observe(importSec, { attributes: true, attributeFilter: ['style'] });
          }
        }
        viewDocBtn.style.display = 'block';
      }

    } catch (err) {
      console.error(err);
      if (btnImport) {
        btnImport.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Erro na extração`;
        setTimeout(() => {
          btnImport.innerHTML = btnImportOriginal;
          btnImport.disabled = false;
        }, 4000);
      }
      alert('Erro na extração: ' + err.message);
    } finally {
      // Limpa o input para permitir enviar o mesmo arquivo novamente se necessário
      uploadInput.value = '';
    }
  });

  function renderizarTabelaDebug(transacoes, cabecalho, analiseExtra = "", analiseCat = "") {
    let summaryHtml = '';
    let tableHtml = '';

    if (cabecalho && Object.keys(cabecalho).length > 0) {
      let analiseHtml = '';
      if (analiseExtra) {
        analiseHtml = `
          <div style="flex: 1 1 300px; max-width: 33%; padding-right: 1.5rem; border-right: 1px solid rgba(255,255,255,0.1);">
            <h4 style="margin: 0 0 0.8rem 0; color: var(--color-warning); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-magic"></i> A Mente da IA (Extração)
            </h4>
            <p style="margin: 0; color: var(--text-primary); font-size: 0.9rem; font-style: italic; line-height: 1.6;">"${analiseExtra}"</p>
          </div>
        `;
      }
      
      let cardsHtml = `<div style="flex: 2 1 400px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; align-content: start;">`;
      for (const [key, value] of Object.entries(cabecalho)) {
        if (typeof value === 'object') continue;
        let icon = 'fa-info-circle';
        const keyLower = key.toLowerCase();
        if (keyLower.includes('conta')) icon = 'fa-university';
        else if (keyLower.includes('institui')) icon = 'fa-building-columns';
        else if (keyLower.includes('periodo') || keyLower.includes('data')) icon = 'fa-calendar-alt';
        else if (keyLower.includes('quantidade') || keyLower.includes('total')) icon = 'fa-hashtag';
        
        cardsHtml += `
            <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 1.2rem; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px;">
                <i class="fas ${icon}" style="color: rgba(255,255,255,0.3);"></i> ${key}
              </div>
              <div style="font-size: 1.15rem; font-weight: 600; color: var(--color-primary); word-break: break-word;">${value || '-'}</div>
            </div>
        `;
      }
      cardsHtml += `</div>`;

      summaryHtml += `
        <details ${isPasso2Concluido ? '' : 'open'} style="margin-bottom: 1.5rem; padding: 1.5rem; background: linear-gradient(145deg, var(--bg-card) 0%, rgba(30, 37, 51, 0.6) 100%); border-radius: 12px; border: 1px solid var(--border-color);">
          <summary style="cursor: pointer; user-select: none; list-style: none; outline: none; margin-bottom: 0;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem; color: var(--text-secondary); width: 100%;">
              <i class="fas fa-file-invoice-dollar" style="color: var(--color-accent); font-size: 1.3rem;"></i> 
              <strong style="font-weight: 600;">Resumo da Extração</strong>
              <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 0.9rem; color: var(--text-muted);"></i>
            </div>
          </summary>
          <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.2rem;">
            ${analiseHtml}
            ${cardsHtml}
          </div>
        </details>
      `;
    } else if (analiseExtra) {
      summaryHtml += `
        <div style="margin-bottom: 2rem; padding: 1.2rem; background: rgba(255, 193, 7, 0.1); border-left: 4px solid var(--color-warning); border-radius: 8px;">
          <h4 style="margin: 0 0 0.5rem 0; color: var(--color-warning); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-magic"></i> A Mente da IA (Extração)
          </h4>
          <p style="margin: 0; color: var(--text-primary); font-size: 0.9rem; font-style: italic; line-height: 1.5;">"${analiseExtra}"</p>
        </div>
      `;
    }

    if (analiseCat) {
      let counts = { categorizados: 0, revisao: 0 };
      if (transacoes) {
        transacoes.forEach(t => {
          if (t.categoria && t.categoria !== '-- Selecione --' && t.categoria !== '') {
            counts.categorizados++;
          } else {
            counts.revisao++;
          }
        });
      }
      summaryHtml += `
        <details open style="margin-bottom: 1.5rem; padding: 1.5rem; background: linear-gradient(145deg, var(--bg-card) 0%, rgba(30, 37, 51, 0.6) 100%); border-radius: 12px; border: 1px solid var(--border-color);">
          <summary style="cursor: pointer; user-select: none; list-style: none; outline: none; margin-bottom: 0;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem; color: var(--text-secondary); width: 100%;">
              <i class="fas fa-tags" style="color: var(--color-income); font-size: 1.3rem;"></i> 
              <strong style="font-weight: 600;">Resumo da Categorização</strong>
              <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 0.9rem; color: var(--text-muted);"></i>
            </div>
          </summary>
          <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.2rem;">
            <div style="flex: 1 1 300px; max-width: 33%; padding-right: 1.5rem; border-right: 1px solid rgba(255,255,255,0.1);">
              <h4 style="margin: 0 0 0.8rem 0; color: var(--color-warning); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-magic"></i> A Mente da IA (Categorização)
              </h4>
              <p style="margin: 0; color: var(--text-primary); font-size: 0.9rem; font-style: italic; line-height: 1.6;">"${analiseCat}"</p>
            </div>
            <div style="flex: 2 1 400px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; align-content: start;">
              <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 1.2rem;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px;">
                  <i class="fas fa-check-circle" style="color: var(--color-income);"></i> Categorizados
                </div>
                <div style="font-size: 1.15rem; font-weight: 600; color: var(--color-primary);">${counts.categorizados}</div>
              </div>
              <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 1.2rem;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px;">
                  <i class="fas fa-exclamation-triangle" style="color: var(--color-warning);"></i> Revisão Pendente
                </div>
                <div style="font-size: 1.15rem; font-weight: 600; color: var(--color-primary);">${counts.revisao}</div>
              </div>
            </div>
          </div>
        </details>
      `;
    }

    

    if (transacoes.length === 0) {
      tableHtml += `<p style="color:var(--text-secondary);">Nenhuma transação encontrada.</p>`;
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

      if (currentSortCol) {
        unicas.sort((a, b) => {
          let valA = a.t[currentSortCol] || '';
          let valB = b.t[currentSortCol] || '';
          if (currentSortCol === 'valor' || currentSortCol === 'confianca') {
            valA = parseFloat(String(valA).replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
            valB = parseFloat(String(valB).replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
          } else if (currentSortCol === 'data' || currentSortCol === 'vencimento') {
            const parseDate = (d) => {
              if (!d) return '';
              const parts = d.split('/');
              if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
              return d;
            };
            valA = parseDate(String(valA));
            valB = parseDate(String(valB));
          } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
          }
          if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
          if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      function getSortIcon(col) {
        if (currentSortCol !== col) return '<i class="fas fa-sort" style="opacity:0.3; margin-left:4px;"></i>';
        return currentSortDir === 'asc' ? '<i class="fas fa-sort-up" style="margin-left:4px; color:var(--color-accent);"></i>' : '<i class="fas fa-sort-down" style="margin-left:4px; color:var(--color-accent);"></i>';
      }

      if (duplicadas.length > 0) {
        tableHtml += `
          <details style="margin-bottom: 1.5rem; background: rgba(220, 53, 69, 0.05); border: 1px solid var(--color-expense); border-radius: 6px; padding: 10px;">
            <summary style="cursor: pointer; color: var(--color-expense); font-weight: bold; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-exclamation-triangle"></i> Lançamentos Fechados/Duplicados (${duplicadas.length}) - Expanda para ver
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
                    <th style="padding:8px; text-align:center;">FECHADO/DUPLICADO?</th>
                  </tr>
                </thead>
                <tbody>
        `;
        duplicadas.forEach((item) => {
          const t = item.t;
          const index = item.index;
          let valColor = (t.valor && String(t.valor).includes('-')) ? 'var(--color-expense)' : 'var(--color-income)';
          
          tableHtml += `
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
        tableHtml += `</tbody></table></div></details>`;
      }

      if (unicas.length > 0) {
        tableHtml += `
          <div style="margin-bottom: 8px;">
            <strong style="color:var(--text-secondary);">Transações Únicas (${unicas.length}):</strong>
          </div>
          <div style="overflow-x:auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
            <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
              <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                  <th style="padding:8px; display:none;">COD</th>
                  <th class="import-sortable" data-col="data" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Data">DATA ${getSortIcon('data')}</th>
                  <th class="import-sortable" data-col="vencimento" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Vencimento">VENCIMENTO ${getSortIcon('vencimento')}</th>
                  <th class="import-sortable" data-col="conta" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Conta">CONTA ${getSortIcon('conta')}</th>
                  <th class="import-sortable" data-col="descricao" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Descrição">DESCRICAO ${getSortIcon('descricao')}</th>
                  <th class="import-sortable" data-col="valor" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Valor">VALOR ${getSortIcon('valor')}</th>
                  <th class="import-sortable" data-col="categoria" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Categoria">CATEGORIA ${getSortIcon('categoria')}</th>
                  <th class="import-sortable" data-col="subcategoria" style="padding:8px; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Subcategoria">SUBCATEGORIA ${getSortIcon('subcategoria')}</th>
                  <th class="import-sortable" data-col="confianca" style="padding:8px; text-align:center; cursor:pointer; user-select:none; white-space:nowrap;" title="Ordenar por Confiança">CONFIANCA ${getSortIcon('confianca')}</th>
                  <th style="padding:8px; text-align:center;">PARCEL.</th>
                  ${!isPasso2Concluido ? '<th style="padding:8px; text-align:center;">FECHADO/DUPLICADO?</th>' : ''}
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

          tableHtml += `
            <tr class="unica-row" style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
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
        tableHtml += `</tbody></table></div>`;
      }
    }

      tableHtml += `
        <details style="margin-bottom: 1.5rem; background: rgba(30, 37, 51, 0.5); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
          <summary style="cursor: pointer; color: var(--text-secondary); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-code"></i> Inspecionar JSON bruto da IA (Debug)
          </summary>
          <pre style="margin-top: 10px; padding: 10px; background: #000; color: #0f0; font-size: 0.75rem; overflow-x: auto; max-height: 200px;">${JSON.stringify(transacoes, null, 2)}</pre>
        </details>
      `;

    document.getElementById('import-summary-content').innerHTML = summaryHtml;
    document.getElementById('import-table-content').innerHTML = tableHtml;
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
        renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual, analiseExtracao, analiseCategorizacao);
      });
    });

    // Event listeners para ordenação
    document.querySelectorAll('.import-sortable').forEach(th => {
      th.addEventListener('click', (e) => {
        const col = e.currentTarget.getAttribute('data-col');
        if (currentSortCol === col) {
          currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortCol = col;
          currentSortDir = 'asc';
        }
        renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual, analiseExtracao, analiseCategorizacao);
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
        
        document.getElementById('import-summary-content').style.display = 'none';
        document.getElementById('import-table-content').style.display = 'none';
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
          if (json.analise_ia) analiseCategorizacao = json.analise_ia;
          isPasso2Concluido = true;
          renderizarTabelaDebug(transacoesParaSalvar, cabecalhoAtual, analiseExtracao, analiseCategorizacao);
          
          btnSalvar.innerHTML = 'Tratar Transferências e Parcelamentos <i class="fas fa-arrow-right"></i>';
          
          
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
  passo3Div.style.display = 'block';
  
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



