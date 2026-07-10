// Mobile Iframe Bypass
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  const mobileLink = document.createElement('link');
  mobileLink.rel = 'stylesheet';
  mobileLink.href = 'mobile.css?v=' + new Date().getTime();
  document.head.appendChild(mobileLink);
  document.documentElement.classList.add('mobile-mode');
}

// Error Handler
    window.onerror = function(mesg, url, lineNo, columnNo, error) {
      const errHtml = `<div id="error-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#1e293b;padding:25px;border-radius:12px;border:2px solid #ef4444;max-width:500px;width:100%;">
          <h2 style="color:#ef4444;margin-top:0;margin-bottom:15px;display:flex;align-items:center;gap:10px;"><i class="fas fa-exclamation-triangle"></i> ERRO NO DASHBOARD!</h2>
          <p style="color:#cbd5e1;font-size:0.95rem;margin-bottom:15px;">Por favor, copie essa mensagem e mande para a IA consertar:</p>
          <textarea readonly style="width:100%;height:120px;background:#0f172a;color:#f8fafc;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;font-family:monospace;font-size:0.85rem;margin-bottom:20px;resize:none;">Mensagem: ${mesg}\nLinha: ${lineNo}\nColuna: ${columnNo}</textarea>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button onclick="document.querySelector('textarea').select(); document.execCommand('copy'); alert('Copiado!');" style="background:#3b82f6;color:white;border:none;padding:10px 15px;border-radius:6px;cursor:pointer;font-weight:600;"><i class="fas fa-copy"></i> Copiar Erro</button>
            <button onclick="document.getElementById('error-overlay').remove();" style="background:transparent;border:1px solid #475569;color:#cbd5e1;padding:10px 15px;border-radius:6px;cursor:pointer;">Fechar</button>
          </div>
        </div>
      </div>`;
      document.body.insertAdjacentHTML('beforeend', errHtml);
      return false;
    };
    // ==========================================
    // CONFIGURAO DOS LINKS DO GOOGLE SHEETS
    // ==========================================
    
    // VARI VEIS DE PRODUO (Seu painel intocvel do dia a dia)
      let CSV_URL_LANCAMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=0&single=true&output=csv';
      let CSV_URL_ORCAMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=1770446607&single=true&output=csv';
      let CSV_URL_CATEGORIAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=758985032&single=true&output=csv';
      let CSV_URL_CONTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=1019128251&single=true&output=csv';
      let CSV_URL_AUDITORIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=279877792&single=true&output=csv';
      let CSV_URL_IMPORTACOES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?gid=2102288486&single=true&output=csv';
    let APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwJThDsXgr1YkA6xf4feuv4cU8HUFGyU8qrLnqTzQdnMeNCNVK9CXK7eNL6u6vtB0kIHA/exec';
    window.APPS_SCRIPT_WEBAPP_URL = APPS_SCRIPT_WEBAPP_URL;
    // INTERRUPTOR DE AMBIENTES (Staging vs Production)
    const isTestEnv = window.location.search.includes('teste=true');
    
    if (isTestEnv) {
      console.warn("Modo de teste ativado via URL (?teste=true), mas as planilhas de teste foram desativadas. Usando a base de dados oficial.");
    }

    // Global Data State
    // dadosFinanceiros is loaded from dados.js directly

    // DOM Elements
    const sidebarLinks = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.dashboard-panel');

    const valueIncome = document.getElementById('value-income');
    const valueExpense = document.getElementById('value-expense');
    const valueSavings = document.getElementById('value-savings');

    const transactionModal = document.getElementById('transaction-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTableBody = document.querySelector('#modal-table tbody');
    const cardIncome = document.getElementById('card-income');
    const cardExpense = document.getElementById('card-expense');

    const transactionsTableBody = document.querySelector('#transactions-table tbody');
    const searchInput = document.getElementById('search-input');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    const budgetContainer = document.getElementById('budget-container');
    const accountsContainer = document.getElementById('accounts-container');
    const auditContainer = document.getElementById('audit-container');

    // State Variables
    let searchQuery = '';
    let currentPage = 1;
    let txAccountFilter = 'all';
    let txCategoryFilter = 'all';
    let txPeriodFilter = 'current';
    let txCustomStart = '';
    let txCustomEnd = '';
    let txSortOrder = 'desc';
    const rowsPerPage = 15;

    let monthlyChart = null;
    let categoryChart = null;
    let favoriteCategoriesChart = null;
    let invHistoryChart = null;
    let invCompChart = null;
    let budgetConsumptionChart = null;

    // Helpers
    function parseDateString(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }

    function getDateColor(dateStr) {
      const d = parseDateString(dateStr);
      if (!d) return 'var(--text-muted)';
      
      const now = new Date();
      now.setHours(0,0,0,0);
      d.setHours(0,0,0,0);
      
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 60) return 'var(--color-expense)';
      if (diffDays > 30) return '#eab308'; // Amarelo
      if (diffDays <= 10) return 'var(--color-income)';
      return 'var(--text-primary)';
    }

    function formatBRL(val) {
      if (val === undefined || val === null || isNaN(val)) val = 0;
      return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    function getMonthLabel(monthYearStr) {
      const parts = monthYearStr.split('/');
      if (parts.length !== 2) return monthYearStr;
      return `${monthNames[parseInt(parts[0]) - 1]}/${parts[1]}`;
    }

    // Parse BRL Float strings (handles R$, commas, dots, and parentheses for negatives)
    function parseBrlFloat(str) {
      if (!str) return 0.0;
      let valStr = str.trim();
      // Remove R$ prefix
      valStr = valStr.replace(/R\$\s*/g, '');
      // Check for parentheses (negative) or leading minus
      let isNeg = false;
      if (valStr.includes('(') && valStr.includes(')')) {
        isNeg = true;
        valStr = valStr.replace(/[()]/g, '');
      } else if (valStr.startsWith('-')) {
        isNeg = true;
        valStr = valStr.replace(/^-/, '');
      }
      valStr = valStr.trim();
      // Remove thousands dots and convert decimal comma to dot
      if (valStr.includes(',')) {
        valStr = valStr.replace(/\./g, '').replace(',', '.');
      }
      let val = parseFloat(valStr) || 0.0;
      return isNeg ? -val : val;
    }

    // Asynchronously fetch and parse Google Sheet CSVs
    async function loadDataFromSheets() {
      if (CSV_URL_LANCAMENTOS.startsWith('COLE_AQUI')) {
        // Fallback demo message if links are not configured
        document.getElementById('loading-screen').style.display = 'flex';
        document.querySelector('#loading-screen div:last-child').innerHTML = `
          <div style="text-align: center; max-width: 500px; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius:12px; border: 1px solid var(--border-color);">
            <p style="margin-bottom:1rem; font-weight:600; color:var(--text-primary);">Configurao do Google Planilhas Necessria</p>
            <p style="font-size:0.9rem; margin-bottom:1rem; line-height:1.4;">Para exibir seus dados online, voc precisa publicar as abas da sua Planilha Google na Web como CSV e colar as URLs nao codigo deste painel.</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Edite este arquivo HTML e substitua as variveis <b>CSV_URL_LANCAMENTOS</b>, <b>CSV_URL_ORCAMENTO</b> e <b>CSV_URL_CONTAS</b>.</p>
          </div>
        `;
        document.querySelector('.spinner').style.display = 'none';
        return false;
      }

      try {
        const [resLanc, resOrc, resCat, resContas, resAudit, resImports] = await Promise.all([
          fetch(CSV_URL_LANCAMENTOS + '&_t=' + Date.now()).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Lancamentos');
            return r.text();
          }),
          fetch(CSV_URL_ORCAMENTO + '&_t=' + Date.now()).then(r => {
            if(!r.ok) return '';
            return r.text();
          }),
          fetch(CSV_URL_CATEGORIAS + '&_t=' + Date.now()).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Categorias');
            return r.text();
          }),
          fetch(CSV_URL_CONTAS + '&_t=' + Date.now()).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Contas');
            return r.text();
          }),
          fetch(CSV_URL_AUDITORIA + '&_t=' + Date.now()).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Auditoria');
            return r.text();
          }),
          fetch(CSV_URL_IMPORTACOES + '&_t=' + Date.now()).then(r => {
            if(!r.ok) return ''; // Importaes pode estar vazia/inexistente temporariamente
            return r.text();
          }).catch(() => '')
        ]);

        // Parse CSVs (trim headers to avoid whitespace mismatches)
        const parseOpts = { header: true, skipEmptyLines: true, transformHeader: h => h.trim() };
        const parsedLanc = Papa.parse(resLanc, parseOpts).data;
        const parsedOrc = Papa.parse(resOrc, parseOpts).data;
        const parsedCat = Papa.parse(resCat, parseOpts).data;
        const parsedContas = Papa.parse(resContas, parseOpts).data;

        // Populate global dicionarioGeral
        window.dicionarioGeral = {};
        parsedCat.forEach(row => {
          const cat = row['Categoria'];
          const sub = row['Subcategoria'];
          if (!cat) return;
          if (!window.dicionarioGeral[cat]) window.dicionarioGeral[cat] = [];
          if (sub && !window.dicionarioGeral[cat].includes(sub)) {
            window.dicionarioGeral[cat].push(sub);
          }
        });

        // Map arrays to our standardized structure
        dadosFinanceiros.lancamentos = parsedLanc.map(l => ({
          cod: l['COD'] || '',
          data: l['DATA'] || '',
          vencimento: l['VENCIMENTO'] || '',
          conta: l['CONTA'] || '',
          obs: l['OBS'] || '',
          valor: parseBrlFloat(l['VALOR']),
          categoria: l['CATEGORIA'] || 'Outros',
          subcategoria: l['SUB CATEGORIA'] || ''
        })).filter(l => l.valor !== 0);

        dadosFinanceiros.contas = parsedContas.map(c => {
          // Coluna E (sem cabecalho) contem o dia do vencimento da fatura para cartoes de credito
          // PapaParse com header vazio gera key '' ou coloca em __parsed_extra
          let diaVenc = 0;
          if (c[''] !== undefined && c[''] !== '') {
            diaVenc = parseInt(c['']) || 0;
          } else if (c.__parsed_extra && c.__parsed_extra.length > 0) {
            diaVenc = parseInt(c.__parsed_extra[0]) || 0;
          }
          return {
            cod: c['COD'] || '',
            nome: c['Nome da Conta'] || '',
            instituicao: c['Instituio Financeira'] || c['Instituicao Financeira'] || '',
            tipo: c['Tipo de conta'] || '',
            dia_vencimento: diaVenc,
            saldo_inicial: parseBrlFloat(c['Saldo inicial']),
            saldo: parseBrlFloat(c['Saldo atual'] || c['Saldo']),
            conciliado_ate: c['Conciliado até'] || c['Conciliado ate'] || c['Conciliado at'] || c['Conciliado atǸ'] || c['Conciliado atÃ©'] || c['Conciliado at\ufffd'] || '',
            conciliado_desde: c['Conciliado desde'] || '',
            saldo_lancado: parseBrlFloat(c['Saldo lanado']),
            saldo_apurado: parseBrlFloat(c['Saldo Apurado']),
            uultima_movimentacao: c['Data da ultima movimentao'] || c['ultima Movimentao'] || c['Data ultima mov.'] || c['Uultima mov'] || c['Data da uultima movimentacao'] || c['Conciliado at'] || c['Conciliado ate'] || ''
          };
        }).filter(c => c.nome !== '');

        dadosFinanceiros.orcamento = parsedOrc.map(o => ({
          categoria: o['Categorias'] || '',
          inicio: o['Inicio'] || '',
          fim: o['Fim'] || '',
          orcamento: parseBrlFloat(o['ORCAMENTO'] || o['Oramento'] || o['Orçamento'] || o['Orcamento']),
          realizado: parseBrlFloat(o['Realizado at hoje']),
          desvio: parseFloat((o['DESVIO'] || '0').replace('%', '').replace(',', '.')) || 0,
          sobra: parseBrlFloat(o['Sobra']),
          ideal: parseBrlFloat(o['Oramento Ideal'])
        })).filter(o => o.categoria !== '');

        const parsedAudit = Papa.parse(resAudit, parseOpts).data;
        dadosFinanceiros.auditoria = parsedAudit.map(a => ({
          conferencia: a['CONFERENCIA'] || '',
          status: (a['STATUS'] || '').trim(),
          resultado: a['RESULTADO'] || '',
          descricao: a['DESCRICAO'] || a['DESCRICAO'] || ''
        })).filter(a => a.conferencia !== '');

        if (resImports) {
          const parsedImports = Papa.parse(resImports, parseOpts).data;
          dadosFinanceiros.importacoes = parsedImports.map(l => ({
            cod: l['COD'] || '',
            data: l['DATA'] || '',
            vencimento: l['VENCIMENTO'] || '',
            conta: l['CONTA'] || '',
            obs: l['OBS'] || '',
            valor: parseBrlFloat(l['VALOR']),
            categoria: l['CATEGORIA'] || 'Outros',
            subcategoria: l['SUB CATEGORIA'] || ''
          })).filter(l => l.data !== '' && l.valor !== 0);
        }

        // Hide loading screen
        const loading = document.getElementById('loading-screen');
        loading.style.opacity = '0';
        setTimeout(() => {
          loading.style.visibility = 'hidden';
          loading.style.display = 'none';
        }, 500);

        return true;
      } catch (err) {
        console.error('Erro na sincronizao:', err);
        document.querySelector('#loading-screen div:last-child').innerHTML = `
          <div style="text-align: center; color: var(--color-expense);">
            <p style="font-weight:600; margin-bottom:0.5rem;">Erro de Sincronizao</p>
            <p style="font-size:0.9rem; color:var(--text-secondary); max-width:400px; line-height:1.4;">${err.message}. Verifique os links de publicao do Sheets e se o compartilhamento na Web est ativo.</p>
          </div>
        `;
        document.querySelector('.spinner').style.display = 'none';
        return false;
      }
    }

    function showAILoadingModal(fileName) {
      const mesgs = [
        "A IA est cruzando dados para categorizar suas compras...",
        "Assustado com esse lanamento aqui... ",
        "Hummm.... analisando possvel compra suprflua... ",
        "Ensinando matemtica financeira pro rob... ",
        "Procurando onde foi parar o seu dinheiro... ",
        "Escondendo essa fatura de voc sabe quem... ",
        "Invocando os deuses da contabilidade... ",
        "Quase l! O rob s parou pra tomar um cafzinho... "
      ];

      showGlassModal('Processando Extrato', `
        <div style="text-align:center; padding: 3rem 1rem;">
          <i class="fas fa-robot fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
          <h3 style="color: var(--text-primary); margin-bottom:0.5rem;">Analisando ${fileName}...</h3>
          <p id="funny-loading-mesg" style="color: var(--text-secondary); font-size: 1.1rem; height: 3rem; display: flex; align-itemes: center; justify-content: center; font-style: italic;">${mesgs[0]}</p>
        </div>
      `);

      let i = 1;
      return setInterval(() => {
        const p = document.getElementById('funny-loading-mesg');
        if (p) {
          p.innerText = mesgs[i % mesgs.length];
          i++;
        }
      }, 10000);
    }

    function hideAILoadingModal(intervalId) {
      if (intervalId) clearInterval(intervalId);
      closeGlassModal();
    }

    async function processarExtratoComIA(csvText, fileName = "extrato.csv", modelName = "claude-haiku-4-5-20251001") {
       throw new Error("processarExtratoComIA foi descontinuada. A logica agora roda na fila de upload em lote.");
    }

    function renderizarRevisaoIA(resultadoIA) {
      const dicionario = window.dicionarioCategorias || {};
      const opcoesCategoria = Object.keys(dicionario);

      // 1. Preparar dados com ID nico e Semforo de Confiana
      const allProcessedData = resultadoIA.map((d, i) => {
        let confianca = 'verde';
        let statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#10b981; margin:auto;" title="100% Certeza"></div>';
        if (d.duvida) {
          if (d.categoria && d.categoria.toUpperCase() !== 'OUTROS' && d.categoria.toUpperCase() !== 'DIVERSOS') {
            confianca = 'amarelo';
            statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#f59e0b; margin:auto;" title="Duvida (Sugesto da IA)"></div>';
          } else {
            confianca = 'vermelho';
            statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#ef4444; margin:auto;" title="A IA nao teve ideia"></div>';
          }
        }
        return { ...d, _id: 'tx_' + i, confianca, statusIcon, descricao: d.descricao != null ? d.descricao.toString() : '', vlrNumber: parseFloat(d.valor) || 0 };
      });

      // TODAS as transacoes vao para o Passo 2. A checkbox isSpecial separa na hora do "Confirmar".
      window.currentReviewData = allProcessedData;

      window.reviewSortCol = 'data';
      window.reviewSortAsc = true;
      window.reviewFilterConfianca = 'todas';
      window.reviewFilterData = 'todas';
      window.reviewSelectedIds = new Set();
      window.reviewPressTimer = null;

      window.rowTouchStart = function(e, id) {
        window.reviewPressTimer = setTimeout(() => {
          const isSelected = window.reviewSelectedIds.has(id);
          window.toggleReviewSelection(id, !isSelected);
          window.renderReviewTable();
          if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
      };

      window.rowTouchEnd = function(e) {
        if (window.reviewPressTimer) clearTimeout(window.reviewPressTimer);
      };

      window.rowClick = function(e, id) {
        if (e.target.tagName.toLowerCase() === 'select') return;
        if (e.target.tagName.toLowerCase() === 'input') return;
        
        if (e.ctrlKey || e.metaKey) {
          const isSelected = window.reviewSelectedIds.has(id);
          window.toggleReviewSelection(id, !isSelected);
        } else {
          window.reviewSelectedIds.clear();
          window.toggleReviewSelection(id, true);
        }
        window.renderReviewTable();
      };

      window.toggleReviewSelection = function(id, checked) {
        if (checked) window.reviewSelectedIds.add(id);
        else window.reviewSelectedIds.delete(id);
      };

      window.updateReviewData = function(id, field, value) {
        const item = window.currentReviewData.find(d => d._id === id);
        if (item) {
          // Se o item alterado estiver selecionado e houver mais de 1 item selecionado, edita em lote
          if (window.reviewSelectedIds.has(id) && window.reviewSelectedIds.size > 1) {
            window.currentReviewData.forEach(d => {
              if (window.reviewSelectedIds.has(d._id)) {
                d[field] = value;
                if (field === 'categoria') {
                  d.subcategoria = (dicionario[value] && dicionario[value].length > 0) ? dicionario[value][0] : '';
                }
              }
            });
          } else {
            item[field] = value;
            if (field === 'categoria') {
              item.subcategoria = (dicionario[value] && dicionario[value].length > 0) ? dicionario[value][0] : '';
            }
          }
          window.renderReviewTable(); // re-render to update UI
        }
      };

      window.sortReviewTable = function(col) {
        if (window.reviewSortCol === col) {
          window.reviewSortAsc = !window.reviewSortAsc;
        } else {
          window.reviewSortCol = col;
          window.reviewSortAsc = true;
        }
        
        window.currentReviewData.sort((a, b) => {
          let valA = a[col];
          let valB = b[col];
          
          if (col === 'valor') { valA = a.vlrNumber; valB = b.vlrNumber; }
          else if (col === 'confianca') {
            const peso = { 'vermelho': 0, 'amarelo': 1, 'verde': 2 };
            valA = peso[a.confianca]; valB = peso[b.confianca];
          }

          if (valA < valB) return window.reviewSortAsc ? -1 : 1;
          if (valA > valB) return window.reviewSortAsc ? 1 : -1;
          return 0;
        });

        window.renderReviewTable();
      };

      window.renderReviewTable = function() {
        const tbody = document.getElementById('review-tbody');
        if (!tbody) return;
        
        let dadosFiltrados = window.currentReviewData;

        if (window.reviewFilterConfianca !== 'todas') {
          if (window.reviewFilterConfianca === 'duvidas') {
            dadosFiltrados = dadosFiltrados.filter(d => d.confianca === 'amarelo' || d.confianca === 'vermelho');
          } else {
            dadosFiltrados = dadosFiltrados.filter(d => d.confianca === window.reviewFilterConfianca);
          }
        }

        if (window.reviewFilterData !== 'todas') {
          dadosFiltrados = dadosFiltrados.filter(d => {
            if (d.data && d.data.length >= 10) return d.data.substring(3, 10) === window.reviewFilterData;
            return window.reviewFilterData === 'Outros';
          });
        }

        tbody.innerHTML = dadosFiltrados.map(d => {
          const catAtual = d.categoria || opcoesCategoria[0];
          const opcoesSub = dicionario[catAtual] || [];
          const corValor = d.vlrNumber >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
          const isSelected = window.reviewSelectedIds.has(d._id);
          
          let gradientColor = 'transparent';
          if (d.confianca === 'verde') gradientColor = 'rgba(16, 185, 129, 0.15)'; // Emerald
          else if (d.confianca === 'amarelo') gradientColor = 'rgba(245, 158, 11, 0.15)'; // Amber
          else if (d.confianca === 'vermelho') gradientColor = 'rgba(239, 68, 68, 0.15)'; // Red

          let bgRow = isSelected ? 'background: rgba(59,130,246,0.2) !important;' : `background: linear-gradient(to right, ${gradientColor} 0%, transparent 50%);`;

          const isTransfer = (catAtual && catAtual.toLowerCase().includes('transfer'));
          const isInstallment = d.descricao && /\b\d{1,2}\s*\/\s*\d{1,2}\b/.test(d.descricao);
          const isSpecial = d.isSpecial !== undefined ? d.isSpecial : (isTransfer || isInstallment);

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; ${bgRow}" 
                onmouseover="if(!${isSelected}) this.style.background='rgba(255,255,255,0.02)'" 
                onmouseout="if(!${isSelected}) this.style.background='${bgRow.replace("background: ", "").replace(";", "")}'"
                ontouchstart="window.rowTouchStart(event, '${d._id}')" 
                ontouchend="window.rowTouchEnd(event)"
                oncontextmenu="event.preventDefault();"
                onclick="window.rowClick(event, '${d._id}')"
                title="Use Ctrl+Click ou Toque Longo para selecionar">
              <td style="padding: 0.8rem; text-align:center;" onclick="event.stopPropagation();">
                <input type="checkbox" onchange="window.updateReviewData('${d._id}', 'isSpecial', this.checked)" ${isSpecial ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer; accent-color: var(--color-warning);" title="Enviar para Passo 3 (Especiais)">
              </td>
              <td style="padding: 0.8rem; color: var(--text-secondary); font-size: 0.85rem; white-space: nowrap;">${d.data}</td>
              <td style="padding: 0.8rem;">
                <input type="text" value="${d.conta || ''}" onchange="window.updateReviewData('${d._id}', 'conta', this.value)" style="width: 100px; background: rgba(0,0,0,0.2); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 4px; font-size: 0.85rem;">
              </td>
              <td style="padding: 0.8rem; color: var(--text-primary); font-size: 0.9rem;">
                <input type="text" value="${d.descricao || ''}" onchange="window.updateReviewData('${d._id}', 'descricao', this.value)" style="width: 100%; min-width: 180px; background: transparent; border: 1px solid transparent; color: inherit; font-size: inherit; font-family: inherit;">
              </td>
              <td style="padding: 0.8rem; color: ${corValor}; font-weight: bold; white-space: nowrap;">R$ ${Math.abs(d.vlrNumber).toFixed(2)}</td>
              <td style="padding: 0.8rem;">
                <select onchange="window.updateReviewData('${d._id}', 'categoria', this.value)" style="width: 100%; min-width: 150px; background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 4px; font-size: 0.85rem;">
                  ${opcoesCategoria.map(c => `<option value="${c}" ${c === d.categoria ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </td>
              <td style="padding: 0.8rem;">
                <select onchange="window.updateReviewData('${d._id}', 'subcategoria', this.value)" style="width: 100%; min-width: 150px; background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 4px; font-size: 0.85rem;">
                  <option value="">-- Nenhuma --</option>
                  ${opcoesSub.map(s => `<option value="${s}" ${s === d.subcategoria ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
            </tr>
          `;
        }).join('');
      };

      const bannerDups = (window.resumoDuplicidades && window.resumoDuplicidades.ignoradas > 0) ? `
        <div style="background: rgba(234, 179, 8, 0.1); color: var(--color-warning); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display:flex; align-itemes:center; justify-content:space-between; gap: 1rem; border: 1px solid rgba(234, 179, 8, 0.2);">
          <div style="display:flex; align-itemes:center; gap: 1rem;">
            <i class="fas fa-shield-alt" style="font-size: 2rem;"></i>
            <div>
              <h4 style="margin:0;">Filtro Anti-Duplicidade Ativado</h4>
              <p style="margin:0; font-size:0.9rem; color:var(--text-secondary);">Das ${window.resumoDuplicidades.total} transacoes nao arquivo, <b>${window.resumoDuplicidades.ignoradas}</b> j existiam e foram descartadas.</p>
            </div>
          </div>
          <button onclick="window.showReviewDuplicatesModal()" style="background: var(--color-warning); color: #000; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; font-weight: bold; cursor: pointer; white-space: nowrap;">
             Revisar ${window.resumoDuplicidades.ignoradas} Ignorados
          </button>
        </div>
      ` : '';

      window.showReviewDuplicatesModal = function() {
        if (!window.transacoesDuplicadasPendentes || window.transacoesDuplicadasPendentes.length === 0) {
          alert('Nenhuma transacao ignorada para revisar.');
          return;
        }
        
        let modal = document.getElementById('duplicate-review-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'duplicate-review-modal';
          modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-itemes:center; justify-content:center; padding:1rem; box-sizing:border-box;';
          document.body.appendChild(modal);
        }
        
        window.dupsSelectedIds = new Set();
        
        window.toggleDupSelection = function(index) {
          if (window.dupsSelectedIds.has(index)) window.dupsSelectedIds.delete(index);
          else window.dupsSelectedIds.add(index);
          document.getElementById('dup-restore-btn').innerText = `Restaurar Selecionados (${window.dupsSelectedIds.size})`;
        };
        
        window.selectAllDups = function(btn) {
          if (window.dupsSelectedIds.size === window.transacoesDuplicadasPendentes.length) {
            window.dupsSelectedIds.clear();
            btn.innerText = "Selecionar Todos";
            document.querySelectorAll('.dup-checkbox').forEach(cb => cb.checked = false);
          } else {
            window.transacoesDuplicadasPendentes.forEach((_, i) => window.dupsSelectedIds.add(i));
            btn.innerText = "Desmarcar Todos";
            document.querySelectorAll('.dup-checkbox').forEach(cb => cb.checked = true);
          }
          document.getElementById('dup-restore-btn').innerText = `Restaurar Selecionados (${window.dupsSelectedIds.size})`;
        };
        
        window.restaurarDups = async function() {
          if (window.dupsSelectedIds.size === 0) {
            alert('Selecione ao menos um lanamento para restaurar.');
            return;
          }
          
          const itensRestaurar = [];
          const novosDupsPendentes = [];
          
          window.transacoesDuplicadasPendentes.forEach((t_obj, i) => {
            if (window.dupsSelectedIds.has(i)) itensRestaurar.push(t_obj.novo);
            else novosDupsPendentes.push(t_obj);
          });
          
          window.transacoesDuplicadasPendentes = novosDupsPendentes;
          modal.style.display = 'none';
          
          const queueStatus = document.getElementById('queue-status');
          const catStatusBox = document.getElementById('import-categorizer-status');
          
          if(queueStatus) { 
            queueStatus.innerText = `Recategorizando ${itensRestaurar.length} transacoes restauradas...`;
            queueStatus.style.color = 'var(--color-warning)';
          }
          
          try {
            const resCat = await fetch(APPS_SCRIPT_WEBAPP_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'categorize_json',
                transacoes: itensRestaurar
              })
            });
            const jsonCat = await resCat.json();
            if (jsonCat.status !== 'success') throw new Error(jsonCat.message);
            
            // Re-injeta na tabela principal
            const dicionario = window.dicionarioCategorias || {};
            const novosItensUI = jsonCat.data.map((d, i) => {
              let confianca = 'verde';
              let statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#10b981; margin:auto;"></div>';
              if (d.duvida) {
                if (d.categoria && d.categoria.toUpperCase() !== 'OUTROS' && d.categoria.toUpperCase() !== 'DIVERSOS') {
                  confianca = 'amarelo';
                  statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#f59e0b; margin:auto;"></div>';
                } else {
                  confianca = 'vermelho';
                  statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#ef4444; margin:auto;"></div>';
                }
              }
              return { ...d, _id: 'tx_restored_' + Date.now() + '_' + i, confianca, statusIcon, descricao: d.descricao ? d.descricao.toString() : '', vlrNumber: parseFloat(d.valor) || 0 };
            });
            
            window.currentReviewData.push(...novosItensUI);
            window.resumoDuplicidades.ignoradas -= itensRestaurar.length;
            
            if(queueStatus) { 
              queueStatus.innerText = ' Processamento em lote concluido!'; 
              queueStatus.style.color = '#10b981'; 
            }
            window.renderReviewTable();
          } catch (err) {
            alert('Erro ao recategorizar: ' + err.message);
            if(queueStatus) { queueStatus.innerText = ' Processamento em lote concluido!'; queueStatus.style.color = '#10b981'; }
          }
        };

        const cardsHTML = window.transacoesDuplicadasPendentes.map((t_obj, index) => {
          const t = t_obj.novo;
          const orig = t_obj.original || {};
          
          // Dados Originais
          const oData = orig.data || '-';
          const oVencimento = orig.vencimento || '-';
          const oConta = orig.conta || '-';
          const oDesc = orig.descricao || orig.obs || '-';
          const oCat = orig.categoria || '-';
          const oSubcat = orig.subcategoria || '-';
          const oValor = orig.valor || 0;

          // Dados Novos
          const nData = t.data || '-';
          const nVencimento = t.vencimento || '-';
          const nConta = t.conta || '-';
          const nDesc = t.descricao || t.obs || '-';
          const nCat = t.categoria || '-';
          const nSubcat = t.subcategoria || '-';
          const nValor = t.valor || 0;

          return `
            <div class="dup-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 1rem; padding: 1rem; display: flex; align-itemes: stretch; gap: 1rem; cursor: pointer; transition: all 0.2s ease;" onclick="const cb=document.getElementById('dup-cb-${index}'); cb.checked=!cb.checked; window.toggleDupSelection(${index}); this.style.borderColor = cb.checked ? 'var(--color-warning)' : 'rgba(255,255,255,0.1)';">
              <div style="display:flex; align-itemes:center;" onclick="event.stopPropagation();">
                <input type="checkbox" id="dup-cb-${index}" class="dup-checkbox" onchange="this.closest('.dup-card').style.borderColor = this.checked ? 'var(--color-warning)' : 'rgba(255,255,255,0.1)';" onclick="window.toggleDupSelection(${index});" style="transform:scale(1.2);">
              </div>
              
              <div style="flex: 1; overflow-x: auto;">
                <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.85rem; white-space: nowrap;">
                  <thead>
                    <tr style="color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <th style="padding: 4px 8px; width: 60px;"></th>
                      <th style="padding: 4px 8px;">DATA</th>
                      <th style="padding: 4px 8px;">VENCIMENTO</th>
                      <th style="padding: 4px 8px;">CONTA</th>
                      <th style="padding: 4px 8px; width: 100%;">DESCRICAO</th>
                      <th style="padding: 4px 8px;">CATEGORIA</th>
                      <th style="padding: 4px 8px;">SUBCATEGORIA</th>
                      <th style="padding: 4px 8px; text-align: right;">VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Original -->
                    <tr style="border-bottom: 1px dashed rgba(255,255,255,0.05);">
                      <td style="padding: 8px; color: var(--text-secondary);"><i class="fas fa-history" title="Original nao Historico"></i> Hist.</td>
                      <td style="padding: 8px; color: var(--text-secondary);">${oData}</td>
                      <td style="padding: 8px; color: var(--text-secondary);">${oVencimento}</td>
                      <td style="padding: 8px; color: var(--text-secondary);">${oConta}</td>
                      <td style="padding: 8px; font-weight: 500; color: var(--text-secondary); white-space: normal;">${oDesc}</td>
                      <td style="padding: 8px; color: var(--text-secondary);">${oCat}</td>
                      <td style="padding: 8px; color: var(--text-secondary);">${oSubcat}</td>
                      <td style="padding: 8px; text-align: right; font-family: monospace; color: var(--text-secondary);">${formatBRL(oValor)}</td>
                    </tr>
                    <!-- Nova Importao -->
                    <tr>
                      <td style="padding: 8px; color: var(--color-warning);"><i class="fas fa-file-import" title="Nova Importao"></i> Nova</td>
                      <td style="padding: 8px; color: var(--text-primary);">${nData}</td>
                      <td style="padding: 8px; color: var(--text-primary);">${nVencimento}</td>
                      <td style="padding: 8px; color: var(--text-primary);">${nConta}</td>
                      <td style="padding: 8px; color: var(--text-primary); font-weight: 500; white-space: normal;">${nDesc}</td>
                      <td style="padding: 8px; color: var(--text-primary);">${nCat}</td>
                      <td style="padding: 8px; color: var(--text-primary);">${nSubcat}</td>
                      <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: bold; color: ${nValor < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${formatBRL(nValor)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('');
        
        modal.innerHTML = `
          <div style="background:var(--bg-card); width:100%; max-width:1100px; max-height:90vh; border-radius:8px; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);">
            <div style="padding:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-itemes:center;">
              <h3 style="margin:0;"><i class="fas fa-shield-alt" style="color:var(--color-warning);"></i> Revisao de Possveis Duplicatas</h3>
              <button onclick="document.getElementById('duplicate-review-modal').style.display='none'" style="background:transparent; border:none; color:var(--text-secondary); font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div style="padding:1rem; background:rgba(234,179,8,0.05); color:var(--text-secondary); font-size:0.9rem; border-bottom:1px solid rgba(255,255,255,0.05);">
              O sistema ocultou estas transacoes por terem a <b>mesma data e valores semelhantes</b> de lancamentos que ja estao nao seu historico. Muitas vezes podem ser parcelas do mesmo dia. Revise a descricao completa abaixo. Se NO for duplicata, selecione-a e clique em Restaurar.
            </div>
            <div style="flex:1; overflow-y:auto; padding:1.5rem;">
              ${cardsHTML}
            </div>
            <div style="padding:1.5rem; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; gap:1rem;">
              <button onclick="window.selectAllDups(this)" class="btn btn-secondary">Selecionar Todos</button>
              <div style="display:flex; gap:1rem;">
                <button onclick="document.getElementById('duplicate-review-modal').style.display='none'" class="btn btn-secondary">Cancelar</button>
                <button id="dup-restore-btn" onclick="window.restaurarDups()" class="btn btn-primary" style="background:var(--color-warning); color:#000;">Restaurar Selecionados (0)</button>
              </div>
            </div>
          </div>
        `;
        modal.style.display = 'flex';
      };

      const periodosUnicos = [...new Set(window.currentReviewData.map(d => {
        if (d.data && d.data.length >= 10) return d.data.substring(3, 10);
        return 'Outros';
      }))].sort((a,b) => {
        if (a === 'Outros') return 1;
        if (b === 'Outros') return -1;
        const partsA = a.split('/'); const partsB = b.split('/');
        const numA = parseInt(partsA[1] + partsA[0]);
        const numB = parseInt(partsB[1] + partsB[0]);
        return numB - numA;
      });

      const filterBarHTML = `
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <div style="display: flex; flex-direction: column;">
            <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;"><i class="fas fa-filter"></i> Confiana da IA</label>
            <select onchange="window.reviewFilterConfianca = this.value; window.renderReviewTable();" style="background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.6rem; border-radius: 4px; font-size: 0.9rem; outline: none;">
              <option value="todas"> Todas as Transacoes</option>
              <option value="duvidas"> Apenas Duvidas (Revisar)</option>
              <option value="verde"> 100% de Certeza</option>
              <option value="amarelo"> Sugesto com Duvida</option>
              <option value="vermelho"> Nenhuma Ideia</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column;">
            <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;"><i class="far fa-calendar-alt"></i> Periodo (Ms/Ano)</label>
            <select onchange="window.reviewFilterData = this.value; window.renderReviewTable();" style="background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.6rem; border-radius: 4px; font-size: 0.9rem; outline: none;">
              <option value="todas">Todos os Periodos</option>
              ${periodosUnicos.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
        </div>
      `;

      // Banner de conferencia de conta
      const contaDetectada = window.currentReviewData.length > 0 ? (window.currentReviewData[0].conta || 'N/A') : 'N/A';
      const contasDisponiveis = (dadosFinanceiros.contas || []).map(c => c.nome).filter(c => c);
      let contaSelectOptions = contasDisponiveis.map(c => `<option value="${c}" ${c === contaDetectada ? 'selected' : ''}>${c}</option>`).join('');
      contaSelectOptions = `<option value="">-- Selecione --</option>` + contaSelectOptions;
      
      const bannerContaHTML = `
        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); padding: 1rem 1.5rem; border-radius: 10px; margin-bottom: 1.5rem; display:flex; align-items:center; justify-content:space-between; gap: 1.5rem; flex-wrap: wrap;">
          <div style="display:flex; align-items:center; gap: 1rem;">
            <i class="fas fa-university" style="font-size: 1.8rem; color: var(--color-primary);"></i>
            <div>
              <h4 style="margin:0; color: var(--text-primary); font-size: 1rem;">Conta Detectada pelo Importador</h4>
              <p style="margin:0; font-size:0.85rem; color:var(--text-secondary);">Confira se a conta esta correta. Se nao, selecione a conta certa abaixo.</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap: 0.8rem;">
            <span style="font-size:0.85rem; color:var(--text-secondary); white-space:nowrap;">Sugestao: <strong style="color:var(--color-primary);">${contaDetectada}</strong></span>
            <select id="review-conta-override" onchange="window.overrideReviewConta(this.value)" style="background: rgba(0,0,0,0.3); color: var(--text-primary); border: 2px solid var(--color-primary); padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.95rem; font-weight: 600; outline: none; min-width: 200px; cursor: pointer;">
              ${contaSelectOptions}
            </select>
          </div>
        </div>
      `;

      // Funcao para alterar a conta de TODAS as transacoes
      window.overrideReviewConta = function(novaConta) {
        if (!novaConta) return;
        window.currentReviewData.forEach(d => { d.conta = novaConta; });
        window.renderReviewTable();
      };
      const containerList = document.getElementById('import-review-list');
      const containerBox = document.getElementById('import-review-container') || document.getElementById('import-review-box');
      if (!containerList || !containerBox) return;

      const tableHTML = `
        ${bannerDups}
        ${filterBarHTML}
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: left;">
            <thead style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.85rem;">
              <tr>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center; color: var(--color-warning);" onclick="window.sortReviewTable('confianca')" title="Enviar para Passo 3 (Especiais)">Parcelamento</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('data')">Data ⇅</th>
                <th style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center; color: var(--color-warning);" title="Marcar para o Passo 3 (Transferencias/Parcelamentos)">Conta</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('descricao')">Descrição ⇅</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('valor')">Valor ⇅</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('categoria')">Categoria ⇅</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('subcategoria')">Subcategoria ⇅</th>
              </tr>
            </thead>
            <tbody id="review-tbody">
            </tbody>
          </table>
        </div>
      `;

      containerList.innerHTML = bannerContaHTML + tableHTML;
      window.sortReviewTable('confianca'); // Inicialmente ordena trazendo vermelhos e amarelos pro topo
      
      containerBox.style.display = 'block';

      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.remove('active'));
      const importNav = document.querySelector('[data-target="panel-import"]');
      if (importNav) importNav.classList.add('active');
      document.getElementById('panel-import').classList.add('active');

      setTimeout(() => {
        const saveTransactions = async (transacoes, updatesDb = []) => {
          if (transacoes.length === 0 && updatesDb.length === 0) return true;
          try {
            const webhookUrl = APPS_SCRIPT_WEBAPP_URL; 
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'salvar_ia',
                transacoes: transacoes,
                updatesDb: updatesDb
              })
            });
            const json = await response.json();
            return json.status === 'success';
          } catch (err) {
            console.error(err);
            return false;
          }
        };

        const showSuccessAndReload = () => {
          containerBox.style.display = 'none';
          containerList.innerHTML = '';
          showGlassModal('Sucesso!', `
            <div style="text-align:center; padding: 2rem 1rem;">
              <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--color-income); margin-bottom: 1.5rem;"></i>
              <h3 style="color: var(--text-primary);">Tudo Salvo!</h3>
              <p style="color: var(--text-secondary);">As importacoes e transferencias foram consolidadas com sucesso.</p>
            </div>
          `);
          setTimeout(() => {
            document.getElementById('glassModal').classList.remove('active');
            window.location.reload();
          }, 3000);
        };

        let _savingInProgress = false;
        const saveHandler = async () => {
          if (_savingInProgress) return;
          _savingInProgress = true;

          // Desabilitar botoes imediatamente para prevenir duplo-clique
          const btnTopo = document.getElementById('btnSalvarRevisaoPanel');
          const btnRodape = document.getElementById('btnSalvarRevisaoPanelBottom');
          if (btnTopo) { btnTopo.disabled = true; btnTopo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
          if (btnRodape) { btnRodape.disabled = true; btnRodape.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }

          const transacoesComIds = window.currentReviewData.map(d => {
            const cleanData = { ...d };
            // Recalcular isSpecial baseado no estado atual do checkbox
            const catAtual = d.categoria || '';
            const isTransferCat = catAtual.toLowerCase().includes('transfer') || catAtual === 'Investimentos' || catAtual === 'Pagamento de Cartão';
            const isInstallment = d.descricao && /\b\d{1,2}\s*\/\s*\d{1,2}\b/.test(d.descricao);
            const computedSpecial = d.isSpecial !== undefined ? d.isSpecial : (isTransferCat || isInstallment);
            cleanData.finalIsSpecial = computedSpecial;
            cleanData.isParcelaNova = false;
            cleanData.isTransfer = false;
            
            if (computedSpecial) {
              // Classificar: e parcela 01/XX? -> parcelamento novo
              const parcMatch = d.descricao && d.descricao.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
              if (parcMatch && parseInt(parcMatch[1]) === 1 && parseInt(parcMatch[2]) > 1) {
                cleanData.isParcelaNova = true;
              } else if (isTransferCat) {
                cleanData.isTransfer = true;
              }
              // Parcelas que NAO sao 01/XX (ex: 02/05) -> salvar como comuns
              if (parcMatch && parseInt(parcMatch[1]) !== 1) {
                cleanData.finalIsSpecial = false;
              }
            }
            
            delete cleanData.vlrNumber;
            delete cleanData.statusIcon;
            delete cleanData.confianca;
            delete cleanData.isSpecial;
            return cleanData; 
          });

          const transacoesTransferencias = transacoesComIds.filter(t => t.finalIsSpecial && t.isTransfer);
          const transacoesParceladas = transacoesComIds.filter(t => t.finalIsSpecial && t.isParcelaNova);
          const transacoesComuns = transacoesComIds.filter(t => !t.finalIsSpecial);
          
          // Cleanup the temp flags before sending
          [...transacoesTransferencias, ...transacoesParceladas, ...transacoesComuns].forEach(t => {
            delete t.finalIsSpecial;
            delete t.isParcelaNova;
            delete t.isTransfer;
          });

          if (transacoesTransferencias.length === 0 && transacoesParceladas.length === 0) {
             showGlassModal('Salvando...', `
               <div style="text-align:center; padding: 3rem 1rem;">
                 <i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
                 <h3 style="color: var(--text-primary);">Gravando na Planilha...</h3>
               </div>
             `);
             const limpas = transacoesComuns.map(d => { const {_id, ...c} = d; return c; });
             const success = await saveTransactions(limpas);
             if (success) showSuccessAndReload();
             else alert("Erro ao salvar. Tente novamente.");
             return;
          }

          showGlassModal('Processando...', `
            <div style="text-align:center; padding: 3rem 1rem;">
              <i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
              <h3 style="color: var(--text-primary);">Acionando Agentes de Lancamentos Especiais...</h3>
              <p style="color: var(--text-secondary); margin-top: 1rem;">Salvando lancamentos comuns e calculando projees/transferencias.</p>
            </div>
          `);

          if (transacoesComuns.length > 0) {
            const limpas = transacoesComuns.map(d => { const {_id, ...c} = d; return c; });
            const success = await saveTransactions(limpas);
            if (!success) {
              alert("Erro ao salvar transacoes comuns. Verifique sua conexao.");
              document.getElementById('glassModal').classList.remove('active');
              return;
            }
          }

          // ===== PASSO 3: Projecao Local de Parcelas =====
          window.expandedParcelas = [];
          if (transacoesParceladas.length > 0) {
            transacoesParceladas.forEach(t => {
              // Detectar o padrao de parcela na descricao (ex: 01/03, 1/12)
              const parcMatch = t.descricao.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
              if (!parcMatch) return; // Sem padrao, nao projeta
              
              const parcAtual = parseInt(parcMatch[1]);
              const parcTotal = parseInt(parcMatch[2]);
              
              // So projeta parcelas NOVAS (01/xx)
              if (parcAtual !== 1 || parcTotal <= 1) return;
              
              // Buscar o dia_vencimento da conta do cartão
              const contaObj = (dadosFinanceiros.contas || []).find(c => c.nome === t.conta);
              const diaVenc = (contaObj && contaObj.dia_vencimento) ? contaObj.dia_vencimento : 15;
              
              // Encontrar a data base para calcular vencimentos futuros
              let dataBase = null;
              const dateStr = t.vencimento || t.data;
              if (dateStr) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  dataBase = new Date(parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
              }
              if (!dataBase || isNaN(dataBase.getTime())) dataBase = new Date();
              
              // Gerar parcelas 02/xx ate xx/xx
              for (let p = 2; p <= parcTotal; p++) {
                const mesOffset = p - 1; // meses a frente da parcela 01
                const vencDate = new Date(dataBase.getFullYear(), dataBase.getMonth() + mesOffset, diaVenc);
                const vencStr = String(vencDate.getDate()).padStart(2, '0') + '/' + String(vencDate.getMonth() + 1).padStart(2, '0') + '/' + vencDate.getFullYear();
                
                // Substituir 01/XX por PP/XX na descricao
                const novaDescricao = t.descricao.replace(/(\d{1,2})\s*\/\s*(\d{1,2})/, String(p).padStart(2, '0') + '/' + String(parcTotal).padStart(2, '0'));
                
                window.expandedParcelas.push({
                  data: t.data || '',
                  vencimento: vencStr,
                  conta: t.conta,
                  descricao: novaDescricao,
                  categoria: t.categoria,
                  subcategoria: t.subcategoria || '',
                  valor: t.valor
                });
              }
            });
          }

          // ===== PASSO 4: Contra-partidas para Transferencias =====
          // Funcao para adivinhar a conta da contra-partida
          function guessContraPartidaConta(contaOriginal) {
            const contas = dadosFinanceiros.contas || [];
            const original = contas.find(c => c.nome === contaOriginal);
            if (!original) return '';
            // Se e Cartão de Credito, buscar Conta Corrente da mesma instituicao
            if (original.tipo && (original.tipo.toLowerCase().includes('cart') || original.tipo.toLowerCase().includes('credito'))) {
              const corrente = contas.find(c => c.instituicao === original.instituicao && c.tipo === 'Corrente');
              return corrente ? corrente.nome : '';
            }
            return '';
          }

          window.transacoesProcessadasStep4 = [];
          if (transacoesTransferencias.length > 0) {
            transacoesTransferencias.forEach(t => {
                // Perna 1: Original
                window.transacoesProcessadasStep4.push({
                   data: t.data || t.vencimento,
                   conta: t.conta,
                   descricao: t.descricao,
                   categoria: t.categoria,
                   subcategoria: t.subcategoria || '',
                   valor: t.valor
                });
                
                // Perna 2: Contra-partida com pre-selecao inteligente
                let contraValor = Number(t.valor) * -1;
                let contraConta = guessContraPartidaConta(t.conta);
                window.transacoesProcessadasStep4.push({
                   data: t.data || t.vencimento,
                   conta: contraConta,
                   descricao: "Contra-partida: " + t.descricao,
                   categoria: t.categoria,
                   subcategoria: t.subcategoria || '',
                   valor: contraValor
                });
            });
          }

          document.getElementById('glassModal').classList.remove('active');

          const titleEl = document.getElementById('import-review-title');
          if (titleEl) titleEl.innerHTML = `<i class="fas fa-star" style="color: var(--color-primary);"></i> Passo 3 e 4: Parcelamentos e Transferencias`;

          // Incluir as parcelas originais (01/XX) NO INICIO da tabela para revisao
          let parcelasOriginais = [];
          transacoesParceladas.forEach(t => {
            const parcMatch = t.descricao.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
            if (parcMatch && parseInt(parcMatch[1]) === 1 && parseInt(parcMatch[2]) > 1) {
              parcelasOriginais.push({
                data: t.data || '',
                vencimento: t.vencimento || t.data || '',
                conta: t.conta,
                descricao: t.descricao,
                categoria: t.categoria,
                subcategoria: t.subcategoria || '',
                valor: t.valor
              });
            }
          });
          // Juntar: originais + projetadas
          window.expandedParcelas = [...parcelasOriginais, ...window.expandedParcelas];

          let htmlParcelas = '';
          if (window.expandedParcelas.length > 0) {
             htmlParcelas += `<h4 style="color: var(--text-primary); margin-top: 1rem; margin-bottom: 0.5rem;"><i class="fas fa-layer-group"></i> Passo 3: Projecao de Parcelas</h4>`;
             htmlParcelas += `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">As parcelas 01/XX foram copiadas e projetadas ate o final. Verifique se os vencimentos futuros estao corretos.</p>`;
             
             htmlParcelas += `<div style="overflow-x: auto; margin-bottom: 2rem;">
               <table style="width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: left;">
                 <thead style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.85rem;">
                   <tr>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Data da Compra</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Vencimento</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Conta</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Descricao</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Valor</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><i class="fas fa-trash"></i></th>
                   </tr>
                 </thead>
                 <tbody>`;
                 
             window.expandedParcelas.forEach((p, idx) => {
                htmlParcelas += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);" id="parc-row-${idx}">
                  <td style="padding: 0.5rem;"><input type="text" value="${p.data}" onchange="window.expandedParcelas[${idx}].data=this.value" style="width:90px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="text" value="${p.vencimento}" onchange="window.expandedParcelas[${idx}].vencimento=this.value" style="width:90px; background:rgba(0,0,0,0.2); border:1px solid var(--color-accent); color:var(--color-accent); font-weight:600; padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="text" value="${p.conta}" onchange="window.expandedParcelas[${idx}].conta=this.value" style="width:100%; min-width:120px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="text" value="${p.descricao}" onchange="window.expandedParcelas[${idx}].descricao=this.value" style="width:100%; min-width:200px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="number" step="0.01" value="${Number(p.valor).toFixed(2)}" onchange="window.expandedParcelas[${idx}].valor=parseFloat(this.value)" style="width:90px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--color-expense); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem; text-align:center;"><button onclick="window.expandedParcelas.splice(${idx}, 1); this.closest('tr').remove();" style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); color:var(--color-expense); padding:6px 10px; border-radius:4px; cursor:pointer; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Remover Parcela"><i class="fas fa-trash"></i></button></td>
                </tr>`;
             });
             htmlParcelas += `</tbody></table></div>`;
          }

          let htmlStep4 = '';
          if (window.transacoesProcessadasStep4 && window.transacoesProcessadasStep4.length > 0) {
             htmlStep4 += `<h4 style="color: var(--text-primary); margin-top: 2rem; margin-bottom: 0.5rem;"><i class="fas fa-exchange-alt"></i> Passo 4: Conciliao de Transferencias (Agente 4)</h4>`;
             htmlStep4 += `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">O Agente analisou o historico e as novas importacoes, gerando as contrapartidas para zerar os saldos.</p>`;
             
             htmlStep4 += `<div style="overflow-x: auto; margin-bottom: 2rem;">
               <table style="width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: left;">
                 <thead style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.85rem;">
                   <tr>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Data</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Conta</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Descricao</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Valor</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">Categoria</th>
                     <th style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;"><i class="fas fa-trash"></i></th>
                   </tr>
                 </thead>
                 <tbody>`;
                 
             const contasConhecidas = (dadosFinanceiros.contas || []).map(c => c.nome).filter(c => c);

             window.transacoesProcessadasStep4.forEach((t, idx) => {
                let isContra = t.descricao && t.descricao.startsWith("Contra-partida");
                
                let contaOptions = `<option value="">-- Selecione --</option>`;
                contasConhecidas.forEach(c => {
                   contaOptions += `<option value="${c}" ${t.conta === c ? 'selected' : ''}>${c}</option>`;
                });

                htmlStep4 += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${isContra ? 'background: rgba(59, 130, 246, 0.05);' : ''}">
                  <td style="padding: 0.5rem;"><input type="text" value="${t.data || t.vencimento || ''}" onchange="window.transacoesProcessadasStep4[${idx}].data=this.value" style="width:90px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;">
                     <select onchange="window.transacoesProcessadasStep4[${idx}].conta=this.value" style="width:100%; min-width:120px; background:rgba(0,0,0,0.2); border:1px solid ${isContra && !t.conta ? 'var(--color-warning)' : 'rgba(255,255,255,0.1)'}; color:var(--text-primary); padding:6px; border-radius:4px; font-size:0.85rem;">
                        ${contaOptions}
                     </select>
                  </td>
                  <td style="padding: 0.5rem;"><input type="text" value="${t.descricao || ''}" onchange="window.transacoesProcessadasStep4[${idx}].descricao=this.value" style="width:100%; min-width:200px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="number" step="0.01" value="${Number(t.valor).toFixed(2)}" onchange="window.transacoesProcessadasStep4[${idx}].valor=parseFloat(this.value)" style="width:90px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:${t.valor < 0 ? 'var(--color-expense)' : 'var(--color-income)'}; padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem;"><input type="text" value="${t.categoria || 'Transferencias'}" onchange="window.transacoesProcessadasStep4[${idx}].categoria=this.value" style="width:120px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); padding:6px; border-radius:4px; font-size:0.85rem;"></td>
                  <td style="padding: 0.5rem; text-align:center;"><button onclick="window.transacoesProcessadasStep4.splice(${idx}, 1); this.closest('tr').remove();" style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); color:var(--color-expense); padding:6px 10px; border-radius:4px; cursor:pointer;" title="Remover"><i class="fas fa-trash"></i></button></td>
                </tr>`;
             });
             htmlStep4 += `</tbody></table></div>`;
          }

          // Renderizar conforme o que existe
          const hasParcelas = window.expandedParcelas.length > 0;
          const hasTransfers = window.transacoesProcessadasStep4 && window.transacoesProcessadasStep4.length > 0;

          if (hasParcelas && hasTransfers) {
            // Mostrar Passo 3 primeiro, com botao para avancar ao Passo 4
            if (titleEl) titleEl.innerHTML = `<i class="fas fa-layer-group" style="color: var(--color-accent);"></i> Passo 3: Projecao de Parcelas`;
            containerList.innerHTML = `
              <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; color: var(--color-income);">
                <i class="fas fa-check-circle"></i> Os lancamentos comuns do Passo 2 ja foram salvos com sucesso.
              </div>
              ${htmlParcelas}
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-arrow-right"></i> Apos revisar, avance para as Transferencias (Passo 4).</span>
                <button id="btn-avancar-step4" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem; padding: 15px 30px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: transform 0.2s;">
                  <i class="fas fa-save"></i> Salvar Parcelas e Avancar <i class="fas fa-arrow-right"></i>
                </button>
              </div>
            `;

            document.getElementById('btn-avancar-step4').onclick = async function() {
              this.disabled = true;
              this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando parcelas...';
              showGlassModal('Salvando Parcelas...', `
                <div style="text-align:center; padding: 3rem 1rem;">
                  <i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
                  <h3 style="color: var(--text-primary);">Gravando parcelas projetadas...</h3>
                </div>
              `);
              const successParc = await saveTransactions(window.expandedParcelas, []);
              document.getElementById('glassModal').classList.remove('active');
              if (!successParc) {
                alert('Erro ao salvar parcelas. Tente novamente.');
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save"></i> Salvar Parcelas e Avancar <i class="fas fa-arrow-right"></i>';
                return;
              }

              // Avancar para Passo 4
              if (titleEl) titleEl.innerHTML = `<i class="fas fa-exchange-alt" style="color: var(--color-primary);"></i> Passo 4: Transferencias e Contra-partidas`;
              containerList.innerHTML = `
                <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; color: var(--color-income);">
                  <i class="fas fa-check-circle"></i> Parcelas salvas com sucesso! Agora revise as transferencias abaixo.
                </div>
                ${htmlStep4}
                <div style="text-align: right; margin-top: 2rem;">
                  <button id="btn-final-save-reconcile" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem; padding: 15px 30px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: transform 0.2s;">
                    <i class="fas fa-save"></i> Finalizar Transferencias
                  </button>
                </div>
              `;
              window._attachFinalSaveHandler(saveTransactions, showSuccessAndReload);
            };
          } else if (hasParcelas && !hasTransfers) {
            // So parcelas
            if (titleEl) titleEl.innerHTML = `<i class="fas fa-layer-group" style="color: var(--color-accent);"></i> Passo 3: Projecao de Parcelas`;
            containerList.innerHTML = `
              <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; color: var(--color-income);">
                <i class="fas fa-check-circle"></i> Os lancamentos comuns do Passo 2 ja foram salvos com sucesso.
              </div>
              ${htmlParcelas}
              <div style="text-align: right; margin-top: 2rem;">
                <button id="btn-final-save-reconcile" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem; padding: 15px 30px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: transform 0.2s;">
                  <i class="fas fa-save"></i> Finalizar Parcelas
                </button>
              </div>
            `;
            window._attachFinalSaveHandler(saveTransactions, showSuccessAndReload);
          } else if (!hasParcelas && hasTransfers) {
            // So transferencias
            if (titleEl) titleEl.innerHTML = `<i class="fas fa-exchange-alt" style="color: var(--color-primary);"></i> Passo 4: Transferencias e Contra-partidas`;
            containerList.innerHTML = `
              <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; color: var(--color-income);">
                <i class="fas fa-check-circle"></i> Os lancamentos comuns do Passo 2 ja foram salvos com sucesso.
              </div>
              ${htmlStep4}
              <div style="text-align: right; margin-top: 2rem;">
                <button id="btn-final-save-reconcile" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem; padding: 15px 30px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: transform 0.2s;">
                  <i class="fas fa-save"></i> Finalizar Transferencias
                </button>
              </div>
            `;
            window._attachFinalSaveHandler(saveTransactions, showSuccessAndReload);
          }

          // Handler generico para o botao final de salvar
          window._attachFinalSaveHandler = function(saveTransactions, showSuccessAndReload) {
            const btn = document.getElementById('btn-final-save-reconcile');
            if (!btn) return;
            btn.onclick = async function() {
               this.disabled = true;
               this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
               
               showGlassModal('Finalizando...', `
                 <div style="text-align:center; padding: 3rem 1rem;">
                   <i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
                   <h3 style="color: var(--text-primary);">Gravando lancamentos...</h3>
                 </div>
               `);

               let finalTransacoes = [];
               if (window.expandedParcelas && window.expandedParcelas.length > 0) {
                 finalTransacoes.push(...window.expandedParcelas);
               }
               if (window.transacoesProcessadasStep4 && window.transacoesProcessadasStep4.length > 0) {
                 finalTransacoes.push(...window.transacoesProcessadasStep4);
               }
               
               const success = await saveTransactions(finalTransacoes, []);
               if (success) {
                 const containerList = document.getElementById('import-review-list');
                 if (containerList) containerList.innerHTML = '';
                 showSuccessAndReload();
               } else {
                 alert("Erro ao salvar. Tente novamente.");
                 this.disabled = false;
                 this.innerHTML = '<i class="fas fa-save"></i> Finalizar';
                 document.getElementById('glassModal').classList.remove('active');
               }
            };
          };
        };

        const btnSalvarTopo = document.getElementById('btnSalvarRevisaoPanel');
        const btnSalvarRodape = document.getElementById('btnSalvarRevisaoPanelBottom');
        
        if (btnSalvarTopo) {
          const newBtn = btnSalvarTopo.cloneNode(true);
          btnSalvarTopo.parentNode.replaceChild(newBtn, btnSalvarTopo);
          newBtn.addEventListener('click', saveHandler);
        }
        if (btnSalvarRodape) {
          const newBtn = btnSalvarRodape.cloneNode(true);
          btnSalvarRodape.parentNode.replaceChild(newBtn, btnSalvarRodape);
          newBtn.addEventListener('click', saveHandler);
        }

      }, 100);
    }

    async function checkSharedFile() {
      const urlParames = new URLSearchParams(window.location.search);
      if (urlParames.get('shared') === 'true') {
        try {
          const cache = await caches.open('shared-files-cache');
          const response = await cache.match('/shared-extrato-file');
          
          if (response) {
            const fileName = response.headers.get('X-Original-Name') || 'extrato_compartilhado.csv';
            
            // Limpa a URL para nao processar de novo em F5
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Mostra o loading inicial com mensagens dinmicas
            window.loadingInterval = showAILoadingModal(fileName);

            // L o texto do arquivo (na Fase 2 isso ir para o Webhook do n8n)
            const csvText = await response.text();
            
            // Chama a API de IA (Simulao por enquanto)
            const resultadoIA = await processarExtratoComIA(csvText);
            
            // Renderiza a interface de Human-in-the-Loop focada nas duvidas
            renderizarRevisaoIA(resultadoIA);
            
            await cache.delete('/shared-extrato-file');
          }
        } catch (err) {
          console.error('Erro ao ler arquivo compartilhado:', err);
        }
      }
    }

    // Bibliotecas de Conhecimento por Banco
    const BANK_LIBRARIES = {
      "banco_do_brasil": "Regras Banco do Brasil (BB) Conta Corrente: Geralmente possui colunas 'Data', 'Dependncia', 'Historico', 'Data do Balancete', 'Numero do Documento' e 'Valor'. Valores podem estar com o sinal de C (Credito) ou D (Debito) ao lado, ou negativo para sada. Cuidado com o cabecalho complexo.",
      "bb_cartão": "Regras Banco do Brasil (BB) Cartão: O formato da fatura difere da conta corrente. Identifique as compras e separe entradas e sadas corretamente.",
      "sicredi_cartão": "Regras Cartão Sicredi: Fique muito atento! A informacao da parcela da compra (ex: 01/03, 02/05) fica em uma coluna separada chamada 'Parcela', geralmente apos a Descricao. Voce DEVE EXTRITAMENTE concatenar essa parcela na 'descricao' final da transacao (ex: 'Loja XYZ 01/03') para que o sistema saiba que e parcelado. Nao perca esse dado!",
      "sicredi": "Regras Banco Sicredi Conta: Atente-se as colunas de data e historico.",
      "default": "Sem regras especficas mapeadas. Faa a deduo logica do formato das colunas. IMPORTANTE: Se houver uma coluna de 'Parcela' (ex: 01/05), voce DEVE anexar isso na descricao da transacao."
    };

    function identifyBankLibrary(fileName, csvText) {
      const lowerName = fileName.toLowerCase();
      const lowerText = csvText.toLowerCase().substring(0, 1000);

      if (lowerName.includes('sicredi') || lowerText.includes('sicredi')) {
          if (lowerName.includes('fatura') || lowerName.includes('cartão') || lowerText.includes('fatura') || lowerText.includes('cartão')) {
              return BANK_LIBRARIES["sicredi_cartão"];
          }
          return BANK_LIBRARIES["sicredi"];
      }

      if ((lowerName.includes('fatura') || lowerName.includes('cartão')) && (lowerName.includes('bb') || lowerText.includes('banco do brasil'))) return BANK_LIBRARIES["bb_cartão"];
      if (lowerName.includes('bb') || lowerText.includes('banco do brasil')) return BANK_LIBRARIES["banco_do_brasil"];
      
      return BANK_LIBRARIES["default"];
    }

    // Logica para upload em LOTE (Desktop)
    let selectedIaModel = 'claude-haiku-4-5-20251001';
    const btnImportModels = document.querySelectorAll('.btn-import-model');
    const uploadCsvIa = document.getElementById('uploadCsvIa');

    window.extractFileContent = extractFileContent;
  async function extractFileContent(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'pdf') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            resolve({ type: 'pdf', content: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } 
      
      if (ext === 'xls' || ext === 'xlsx') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, {type: 'array'});
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const csv = XLSX.utils.sheet_to_csv(worksheet);
              resolve({ type: 'text', content: csv });
            } catch(err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      }

      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'ISO-8859-1'); // Fix for Brazilian bank accents
      });
      return { type: 'text', content: text };
    }
    window.fileTransactions = {};
    
    window.updateCardInfo = function(idx, novaContaNome) {
      const contasArr = (window.dadosFinanceiros && window.dadosFinanceiros.contas) ? window.dadosFinanceiros.contas : (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.contas ? dadosFinanceiros.contas : []);
      const contaObj = contasArr.find(c => c.nome === novaContaNome);
      
      const spanInst = document.getElementById(`inst-conta-${idx}`);
      const spanTipo = document.getElementById(`tipo-conta-${idx}`);
      
      if (contaObj) {
        if (spanInst) spanInst.innerText = contaObj.instituicao || "N/A";
        if (spanTipo) spanTipo.innerText = contaObj.tipo || "N/A";
      } else {
        if (spanInst) spanInst.innerText = "N/A";
        if (spanTipo) spanTipo.innerText = "N/A";
      }
    };

    // --- FIREBASE INTEGRATION ---
    async function loadDataFromFirebase() {
        try {
            console.log("Carregando dados do Firebase...");
            const dbDados = await window.DB.loadAllData();
            
            // Map Firebase data to existing in-memory structure
            dadosFinanceiros.lancamentos = dbDados.lancamentos || [];
            dadosFinanceiros.contas = dbDados.contas || [];
            dadosFinanceiros.orcamento = dbDados.orcamentos || [];
            dadosFinanceiros.auditoria = dbDados.auditoria || [];
            dadosFinanceiros.importacoes = dbDados.importsInfo || [];
            
            window.dicionarioGeral = dbDados.categoriasDict || {};

            // Hide loading screen
            const loading = document.getElementById('loading-screen');
            if (loading) {
              loading.style.opacity = '0';
              setTimeout(() => {
                loading.style.visibility = 'hidden';
                loading.style.display = 'none';
              }, 500);
            }
            
            return true;
        } catch (err) {
            console.error("Erro ao carregar Firebase:", err);
            const loading = document.getElementById('loading-screen');
            if (loading) {
              loading.querySelector('div:last-child').innerHTML = `
                <div style="text-align: center; color: var(--color-expense);">
                  <p style="font-weight:600; margin-bottom:0.5rem;">Erro no Firebase</p>
                  <p style="font-size:0.9rem; color:var(--text-secondary); max-width:400px; line-height:1.4;">${err.message}</p>
                </div>
              `;
              document.querySelector('.spinner').style.display = 'none';
            }
            return false;
        }
    }

    window.USE_FIREBASE = true; // Firebase ativado permanentemente

    let isAppInitialized = false;

    function bootstrapApp() {
      // Elementos de UI de Login
      const loginScreen = document.getElementById('login-screen');
      const userProfilePic = document.getElementById('user-profile-pic');
      const userProfileName = document.getElementById('user-profile-name');
      const userProfileEmail = document.getElementById('user-profile-email');
      const btnLogout = document.getElementById('btn-logout');
      const btnLoginGoogle = document.getElementById('btn-login-google');
      const loadingScreen = document.getElementById('loading-screen');

      // Elementos de Grupo
      const groupIdDisplay = document.getElementById('group-id-display');
      const newGroupIdInput = document.getElementById('new-group-id-input');
      const btnJoinGroup = document.getElementById('btn-join-group');

      if (btnJoinGroup) {
        btnJoinGroup.addEventListener('click', async () => {
          const newId = newGroupIdInput.value.trim();
          if (!newId) return;
          if (newId === window.userGroupId) {
             alert('Você já está neste grupo!');
             return;
          }
          if (confirm(`Tem certeza que deseja mudar seu grupo para ${newId}? Seus lançamentos atuais ficarão invisíveis (mas seguros no banco).`)) {
             try {
                // Atualiza o perfil no Users
                await window.firebaseDB.collection('Users').doc(window.firebaseAuth.currentUser.uid).update({
                   groupId: newId
                });
                alert('Grupo alterado com sucesso! O aplicativo será recarregado.');
                window.location.reload();
             } catch (err) {
                console.error("Erro ao mudar de grupo", err);
                alert("Erro ao mudar de grupo: " + err.message);
             }
          }
        });
      }

      // Login Handle
      if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', () => {
          const provider = new firebase.auth.GoogleAuthProvider();
          window.firebaseAuth.signInWithPopup(provider).catch(err => {
            console.error("Erro no login:", err);
            alert("Erro ao fazer login: " + err.message);
          });
        });
      }

      // Logout Handle
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          if(confirm("Deseja realmente sair?")) {
            window.firebaseAuth.signOut();
          }
        });
      }

      // Listener Global de Autenticação
      window.firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
          // Logado
          loginScreen.style.display = 'none';
          
          // Atualiza Sidebar
          if (userProfilePic) {
             userProfilePic.src = user.photoURL || '';
             userProfilePic.style.display = 'block';
          }
          if (userProfileName) userProfileName.textContent = user.displayName || 'Usuário';
          if (userProfileEmail) userProfileEmail.textContent = user.email || '';
          if (btnLogout) btnLogout.style.display = 'block';

          // Lógica de Grupos (Família)
          const userDocRef = window.firebaseDB.collection('Users').doc(user.uid);
          const userDoc = await userDocRef.get();
          if (!userDoc.exists) {
            // Cria usuário com groupId = seu próprio uid
            await userDocRef.set({
              email: user.email,
              name: user.displayName,
              groupId: user.uid, // O grupo padrão é o próprio UID
              createdAt: new Date().toISOString()
            });
            window.userGroupId = user.uid;
          } else {
            window.userGroupId = userDoc.data().groupId || user.uid;
          }

          if (groupIdDisplay) {
            groupIdDisplay.value = window.userGroupId;
          }

          // ===== PROCESSA CONVITE POR LINK =====
          const urlParams = new URLSearchParams(window.location.search);
          const inviteCode = urlParams.get('invite');
          if (inviteCode) {
            try {
              loadingScreen.style.display = 'flex';
              const inviteRef = window.firebaseDB.collection('Invites').doc(inviteCode);
              const inviteSnap = await inviteRef.get();
              if (inviteSnap.exists) {
                const inviteData = inviteSnap.data();
                if (inviteData.groupId === window.userGroupId) {
                  alert('Você já está no grupo deste convite!');
                } else if (confirm(`Deseja entrar no grupo familiar associado a este convite? Seus lançamentos atuais ficarão isolados (mas seguros).`)) {
                  // Entrar no grupo
                  await window.firebaseDB.collection('Users').doc(user.uid).update({
                    groupId: inviteData.groupId
                  });
                  window.userGroupId = inviteData.groupId;
                  // Queimar o convite
                  await inviteRef.delete();
                  alert('Bem-vindo(a)! Você entrou no grupo com sucesso.');
                }
                // Limpar URL independente da escolha
                window.history.replaceState({}, document.title, window.location.pathname);
              } else {
                alert('Este link de convite é inválido ou já foi utilizado.');
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            } catch (err) {
              console.error("Erro ao processar convite:", err);
              alert("Erro ao processar o convite. Você tem permissão?");
            }
          }
          // =====================================

          // Inicializa o App com os dados do usuário
          loadingScreen.style.display = 'flex';
          await initApp();
          loadingScreen.style.display = 'none';
        } else {
          // Deslogado
          loginScreen.style.display = 'flex';
          loadingScreen.style.display = 'none';

          if (userProfilePic) {
             userProfilePic.src = '';
             userProfilePic.style.display = 'none';
          }
          if (userProfileName) userProfileName.textContent = 'Visitante';
          if (userProfileEmail) userProfileEmail.textContent = 'Faça login para usar';
          if (btnLogout) btnLogout.style.display = 'none';
        }
      });
    }

    async function initApp() {
      if (isAppInitialized) {
        // Se já inicializou e logou de novo (re-login), apenas recarrega dados
        await loadDataFromFirebase();
        updateAllViews();
        return;
      }
      isAppInitialized = true;

      setupNavigation();
      setupSwipeNavigation();
      
      const success = await loadDataFromFirebase();
      
      if (!success) return; // Stop if data is not loaded
      
      function recalculateBalances() {
        if (!dadosFinanceiros) return;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }

        dadosFinanceiros.contas.forEach(c => {
          c.saldo = 0; // Starts at 0 to avoid double counting if a transaction exists
          c.fatura_atual = 0;
          c.fatura_proxima = 0;
          c._has_saldo_tx = false;
        });

        dadosFinanceiros.lancamentos.forEach(l => {
          const conta = dadosFinanceiros.contas.find(c => c.nome === l.conta);
          if (!conta) return;

          if ((l.categoria || '').toLowerCase().trim() === 'saldo inicial') {
            conta._has_saldo_tx = true;
          }

          const val = parseFloat(l.valor) || 0;
          
          const isCartao = (conta.tipo || '').toLowerCase().includes('cart');
          if (!isCartao) {
             conta.saldo += val;
          } else {
             conta.saldo += val; // Total debt
             const d = parseDateString(l.data || l.vencimento);
             if (d) {
               const monthsDiff = (d.getFullYear() - currentYear) * 12 + (d.getMonth() - currentMonth);
               if (monthsDiff <= 0) {
                 conta.fatura_atual += val;
               } else if (monthsDiff === 1) {
                 conta.fatura_proxima += val;
               }
             }
          }
        });

        // Add the DB saldo_inicial ONLY if they didn't use a transaction for it
        dadosFinanceiros.contas.forEach(c => {
           if (!c._has_saldo_tx && c.saldo_inicial) {
               c.saldo += (parseFloat(c.saldo_inicial) || 0);
           }
        });
      }

      function updateAllViews() {
        recalculateBalances();
        if (typeof updateOverview === 'function') updateOverview();
        if (typeof renderBudgets === 'function') renderBudgets();
        if (typeof renderImportConciliacao === 'function') renderImportConciliacao();
        if (typeof renderAccounts === 'function') renderAccounts();
        if (typeof renderInvestments === 'function') renderInvestments();
        if (typeof renderInvestmentsDashboard === 'function') renderInvestmentsDashboard();
        if (typeof renderCreditCardsDashboard === 'function') renderCreditCardsDashboard();
        if (typeof renderAudit === 'function') renderAudit();
        if (typeof populateCategoryFilter === 'function') populateCategoryFilter();
        if (typeof renderTransactionsTable === 'function') renderTransactionsTable();
      }

      updateAllViews();
      // Captura de arquivo compartilhado nativamente
      await checkSharedFile();

      // Events listeners
      // Events listeners
      bindTabPeriodSelectors();

      if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
          currentPage++;
          if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
        });
      }

      if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
          if (currentPage > 1) {
            currentPage--;
            if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
          }
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value.toLowerCase();
          currentPage = 1;
          if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
        });
      }

      // New Lançamentos Toolbar Events
      const accFilterSelect = document.getElementById('transactions-account-filter');
      if (accFilterSelect) {
        accFilterSelect.addEventListener('change', (e) => {
          txAccountFilter = e.target.value;
          currentPage = 1;
          if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
        });
      }

      const perFilterSelect = document.getElementById('transactions-period-filter');
      const customDatesDiv = document.getElementById('transactions-custom-dates');
      const customStartInp = document.getElementById('transactions-date-start');
      const customEndInp = document.getElementById('transactions-date-end');
      const customBtn = document.getElementById('transactions-custom-btn');

      if (perFilterSelect) {
        perFilterSelect.addEventListener('change', (e) => {
          txPeriodFilter = e.target.value;
          if (txPeriodFilter === 'custom') {
             if(customDatesDiv) customDatesDiv.style.display = 'flex';
          } else {
             if(customDatesDiv) customDatesDiv.style.display = 'none';
             currentPage = 1;
             if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
          }
        });
      }

      if (customBtn) {
         customBtn.addEventListener('click', () => {
            if(customStartInp) txCustomStart = customStartInp.value;
            if(customEndInp) txCustomEnd = customEndInp.value;
            currentPage = 1;
            if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
         });
      }

      const catFilterSelect = document.getElementById('transactions-category-filter');
      if (catFilterSelect) {
        catFilterSelect.addEventListener('change', (e) => {
          txCategoryFilter = e.target.value;
          currentPage = 1;
          if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
        });
      }

      const sortBtn = document.getElementById('transactions-sort-btn');
      if (sortBtn) {
        sortBtn.addEventListener('click', () => {
          txSortOrder = txSortOrder === 'desc' ? 'asc' : 'desc';
          sortBtn.innerHTML = txSortOrder === 'desc' ? '<i class="fas fa-sort-amount-down"></i>' : '<i class="fas fa-sort-amount-up"></i>';
          if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
        });
      }

      // Modal Events
      if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
          transactionModal.classList.remove('active');
        });
      }
      
      if (transactionModal) {
        transactionModal.addEventListener('click', (e) => {
          if (e.target === transactionModal) {
            transactionModal.classList.remove('active');
          }
        });
      }
      
      if (cardIncome) {
        cardIncome.addEventListener('click', () => {
          showModalDetails('incomes');
        });
      }
      
      if (cardExpense) {
        cardExpense.addEventListener('click', () => {
          showModalDetails('expenses');
        });
      }

      const cardSavings = document.getElementById('card-savings');
      if (cardSavings) {
        cardSavings.addEventListener('click', () => {
          window.showContasModal('cc');
        });
      }
    }

    async function renderFamilyMembers() {
      const container = document.getElementById('family-members-container');
      if (!container || !window.userGroupId) return;

      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem;"><i class="fas fa-spinner fa-spin"></i> Carregando membros...</div>';

      try {
        const usersSnap = await window.firebaseDB.collection('Users').where('groupId', '==', window.userGroupId).get();
        if (usersSnap.empty) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Nenhum membro encontrado neste grupo.</div>';
          return;
        }

        let html = '';
        usersSnap.forEach(doc => {
          const user = doc.data();
          const isMe = doc.id === (window.firebaseAuth.currentUser ? window.firebaseAuth.currentUser.uid : null);
          const name = user.name || 'Usuário Anônimo';
          const email = user.email || 'Sem email';
          const avatar = name.charAt(0).toUpperCase();

          html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: rgba(0,0,0,0.1); border-radius: 8px; border-left: 4px solid ${isMe ? 'var(--color-income)' : 'var(--color-primary)'};">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 1.2rem;">
                  ${avatar}
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${name} ${isMe ? '<span style="font-size: 0.75rem; color: var(--color-income); background: rgba(34,197,94,0.1); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">Você</span>' : ''}</span>
                  <span style="color: var(--text-muted); font-size: 0.8rem;">${email}</span>
                </div>
              </div>
              ${!isMe ? `<button onclick="window.removeMember('${doc.id}', '${name}')" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85rem; background: rgba(239,68,68,0.1); color: var(--color-expense); border: 1px solid var(--color-expense);"><i class="fas fa-user-minus"></i> Remover</button>` : ''}
            </div>
          `;
        });
        container.innerHTML = html;
      } catch (err) {
        console.error("Erro ao carregar membros do grupo:", err);
        container.innerHTML = '<div style="color: var(--color-expense); font-size: 0.9rem;">Erro ao carregar membros. Verifique sua conexão.</div>';
      }
    }

    // ===== GESTÃO FAMILIAR: CONVITES E REMOÇÃO =====
    window.generateInviteLink = async function() {
      const btn = event.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
      btn.disabled = true;

      try {
        // Gera um ID de 8 caracteres alfanuméricos
        const inviteId = 'INV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        await window.firebaseDB.collection('Invites').doc(inviteId).set({
          groupId: window.userGroupId,
          createdBy: window.firebaseAuth.currentUser.uid,
          createdAt: new Date().toISOString()
        });

        // Monta a URL completa do site + ?invite=ID
        const baseUrl = window.location.href.split('?')[0];
        const fullLink = `${baseUrl}?invite=${inviteId}`;
        
        const inputDisplay = document.getElementById('invite-link-display');
        if (inputDisplay) {
          inputDisplay.value = fullLink;
        }
      } catch (err) {
        console.error("Erro ao gerar convite:", err);
        alert("Erro ao gerar convite. Você tem permissão?");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };

    window.removeMember = async function(memberUid, memberName) {
      if (!confirm(`ATENÇÃO: Você tem certeza que deseja expulsar ${memberName} do seu Grupo Familiar?`)) {
        return;
      }

      try {
        // Redefine o groupId do membro para ser o seu próprio UID (isolando-o)
        await window.firebaseDB.collection('Users').doc(memberUid).update({
          groupId: memberUid
        });
        alert(`${memberName} foi removido(a) do grupo com sucesso.`);
        renderFamilyMembers(); // Recarrega a lista
      } catch (err) {
        console.error("Erro ao remover membro:", err);
        alert("Erro ao remover membro. Atualize as regras do Firestore no Console do Firebase conforme as instruções.");
      }
    };
    // ================================================

    function setupNavigation() {
      sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          const targetPanel = link.getAttribute('data-target');
          if (!targetPanel) return; // Permite links reais funcionarem (ex: href="scanner.html")
          
          e.preventDefault();
          
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          window.switchToPanel(targetPanel);
        });
      });
    }

    window.switchToPanel = function(targetPanelId) {
      if (!targetPanelId) return;
      
      // Remove class active de todos os links e adiciona no correto
      const allLinks = document.querySelectorAll('.nav-item[data-target]');
      allLinks.forEach(l => {
        if (l.getAttribute('data-target') === targetPanelId) l.classList.add('active');
        else l.classList.remove('active');
      });

      // Troca os painéis
      const allPanels = document.querySelectorAll('.dashboard-panel');
      allPanels.forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add('active');
          // Lazy load callbacks
          if (targetPanelId === 'panel-investments') {
            setTimeout(() => { if (typeof renderInvestmentsDashboard === 'function') renderInvestmentsDashboard(); }, 10);
          } else if (targetPanelId === 'panel-budgets') {
            setTimeout(() => { if (typeof renderBudgets === 'function') renderBudgets(); }, 10);
          } else if (targetPanelId === 'panel-group') {
            setTimeout(() => { if (typeof renderFamilyMembers === 'function') renderFamilyMembers(); }, 10);
          } else if (targetPanelId === 'panel-credit-cards') {
            setTimeout(() => { if (typeof renderCreditCardsDashboard === 'function') renderCreditCardsDashboard(); }, 10);
          }
        } else {
          panel.classList.remove('active');
        }
      });
    };

    function setupSwipeNavigation() {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchEndX = 0;
      let touchEndY = 0;
      const swipeThreshold = 80; 
      
      const tabs = [
        'panel-overview', 
        'panel-import', 
        'panel-budgets', 
        'panel-accounts', 
        'panel-investments', 
        'panel-credit-cards'
      ];

      document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
      }, { passive: true });

      function handleSwipe() {
        if (window.innerWidth > 768) return;

        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Assegura que o swipe foi mais horizontal do que vertical para nao atrapalhar o scroll
        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
          const activeNav = document.querySelector('.nav-item.active');
          if (!activeNav) return;
          
          const currentTarget = activeNav.getAttribute('data-target');
          const currentIndex = tabs.indexOf(currentTarget);
          
          if (currentIndex === -1) return;

          if (diffX > 0) {
            // Swipe Esquerda: Prxima Aba
            if (currentIndex < tabs.length - 1) {
              const nextTarget = tabs[currentIndex + 1];
              const navItem = document.querySelector(`.nav-item[data-target="${nextTarget}"]`);
              if (navItem) navItem.click();
            }
          } else {
            // Swipe Direita: Aba Anterior
            if (currentIndex > 0) {
              const prevTarget = tabs[currentIndex - 1];
              const navItem = document.querySelector(`.nav-item[data-target="${prevTarget}"]`);
              if (navItem) navItem.click();
            }
          }
        }
      }
    }


    function getFilteredTransactions(tabData = 'current') {
      let now = new Date();
      const currMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currYearStr = `${now.getFullYear()}`;
      
      let prevNow = new Date();
      prevNow.setMonth(prevNow.getMonth() - 1);
      const prevMonthStr = `${prevNow.getFullYear()}-${String(prevNow.getMonth() + 1).padStart(2, '0')}`;

      let prev2Now = new Date();
      prev2Now.setMonth(prev2Now.getMonth() - 2);
      const prev2MonthStr = `${prev2Now.getFullYear()}-${String(prev2Now.getMonth() + 1).padStart(2, '0')}`;

      // Handle both string and object
      let period = typeof tabData === 'string' ? tabData : (tabData.period || 'current');
      let startStr = typeof tabData === 'object' ? tabData.start : '';
      let endStr = typeof tabData === 'object' ? tabData.end : '';

      const sD = startStr ? new Date(startStr + "T00:00:00") : new Date(0);
      const eD = endStr ? new Date(endStr + "T23:59:59") : new Date("2100-01-01");

      return dadosFinanceiros.lancamentos.filter(l => {
        if (!l.data) return false;
        
        // Month filter (decentralized)
        if (period !== 'all') {
          const parts = l.data.split('/');
          if (parts.length !== 3) return false;
          const yyyy_mm = `${parts[2]}-${parts[1]}`;
          
          if (period === 'current' && yyyy_mm !== currMonthStr) return false;
          if (period === 'previous' && yyyy_mm !== prevMonthStr) return false;
          if (period === 'last3' && yyyy_mm !== currMonthStr && yyyy_mm !== prevMonthStr && yyyy_mm !== prev2MonthStr) return false;
          if (period === '3months') {
            const d = parseDateString(l.data);
            const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            if (d < cutoff) return false;
          }
          if (period === '6months') {
            const d = parseDateString(l.data);
            const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            if (d < cutoff) return false;
          }
          if (period === 'year' && parts[2] !== currYearStr) return false;
          if (period === 'last_year' && parts[2] !== (parseInt(currYearStr) - 1).toString()) return false;
          if (period === 'custom') {
            const d = parseDateString(l.data);
            if (d < sD || d > eD) return false;
          }
        }

        // Global search query
        if (searchQuery !== '') {
          const obs = (l.obs || l.descricao || '').toLowerCase();
          const cat = (l.categoria || '').toLowerCase();
          const sub = (l.subcategoria || '').toLowerCase();
          if (!obs.includes(searchQuery) && !cat.includes(searchQuery) && !sub.includes(searchQuery)) {
            return false;
          }
        }

        return true;
      });
    }

    // --- Decentralized Widget Period Logic ---
    // --- Tab Period Logic ---
    function getTabPeriod(tabId, defaultPeriod = 'current') {
      try {
         const stored = localStorage.getItem('dashboardTabPeriods');
         if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed[tabId]) return parsed[tabId];
         }
      } catch(e) {}
      return { period: defaultPeriod, start: '', end: '' };
    }

    function saveTabPeriod(tabId, data) {
      try {
         let parsed = {};
         const stored = localStorage.getItem('dashboardTabPeriods');
         if (stored) parsed = JSON.parse(stored);
         parsed[tabId] = data;
         localStorage.setItem('dashboardTabPeriods', JSON.stringify(parsed));
      } catch(e) {}
    }

    function bindTabPeriodSelectors() {
      const tabs = [
        { filterId: 'investimentos-filter', startId: 'investimentos-date-start', endId: 'investimentos-date-end', customId: 'investimentos-custom-date', tabId: 'investimentos', updateFn: () => { if(typeof renderInvestmentsDashboard === 'function') renderInvestmentsDashboard(); if(typeof renderInvestments === 'function') renderInvestments(); } },
        { filterId: 'orcamento-dashboard-filter', startId: null, endId: null, customId: null, tabId: 'orcamentos-dash', updateFn: () => { renderBudgets(); } }
      ];

      tabs.forEach(tab => {
        const sel = document.getElementById(tab.filterId);
        const start = document.getElementById(tab.startId);
        const end = document.getElementById(tab.endId);
        const customContainer = document.getElementById(tab.customId);
        
        if (!sel) return;

        const currentData = getTabPeriod(tab.tabId);
        sel.value = currentData.period || 'current';
        if (start) start.value = currentData.start || '';
        if (end) end.value = currentData.end || '';

        if (sel.value === 'custom' && customContainer) {
           customContainer.style.display = 'flex';
        }

        const handleUpdate = () => {
           const val = sel.value;
           if (val === 'custom' && customContainer) {
              customContainer.style.display = 'flex';
           } else if (customContainer) {
              customContainer.style.display = 'none';
           }
           saveTabPeriod(tab.tabId, {
              period: val,
              start: start ? start.value : '',
              end: end ? end.value : ''
           });
           tab.updateFn();
        };

        sel.addEventListener('change', handleUpdate);
        if (start) start.addEventListener('change', handleUpdate);
        if (end) end.addEventListener('change', handleUpdate);
      });
    }

    function updateOverview() {
      // Default overview top cards to current month since global filter was removed
      const filtered = getFilteredTransactions('current');
      
      let income = 0;
      let expenses = 0;
      
      filtered.forEach(l => {
        const cat = (l.categoria || '').toLowerCase();
        if (cat.includes('transfer') || cat.includes('saldo inicial')) return;

        if (l.valor > 0) {
          income += l.valor;
        } else {
          expenses += l.valor;
        }
      });

      const net = income + expenses;

      if (valueIncome) valueIncome.textContent = formatBRL(income);
      if (valueExpense) valueExpense.textContent = formatBRL(Math.abs(expenses));
      
      // Animação de fade para income/expense
      [valueIncome, valueExpense].forEach(el => {
        if (el && el.parentElement) {
          el.parentElement.style.transition = 'none';
          el.parentElement.style.opacity = '0.3';
          setTimeout(() => {
            el.parentElement.style.transition = 'opacity 0.4s ease';
            el.parentElement.style.opacity = '1';
          }, 50);
        }
      });

      // Saldo Corrente (Total das Contas)
      const savingsListEl = document.getElementById('savings-account-list');
      if (valueSavings || savingsListEl) {
        let totalCC = 0;
        let savingsHtml = '';
        if (dadosFinanceiros && dadosFinanceiros.contas) {
          dadosFinanceiros.contas.forEach(c => {
            const t = (c.tipo || '').toLowerCase();
            // Somente Contas Correntes (ignora cartões e investimentos)
            if (!t.includes('cart') && !t.includes('credito') && !t.includes('investimento') && !t.includes('aplicao') && !t.includes('corretora') && !t.includes('aplicacao') && !t.includes('poupana') && !t.includes('poupanca')) {
              totalCC += c.saldo;
              savingsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem; align-items:center;">
                  <span style="color:var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 65%;">
                    ${c.nome}
                  </span>
                  <span style="color:${c.saldo < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">
                    ${formatBRL(c.saldo)}
                  </span>
                </div>
              `;
            }
          });
        }
        
        if (valueSavings) {
          valueSavings.textContent = formatBRL(totalCC);
          valueSavings.style.color = totalCC >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        }
        if (savingsListEl) {
          savingsListEl.innerHTML = savingsHtml || '<div style="color:var(--text-muted); text-align:center;">Nenhuma conta.</div>';
        }
      }

      // Render Dashboard Favorites (Novo Cartão)
      const favListEl = document.getElementById('favorite-budgets-list');
      if (favListEl && dadosFinanceiros && dadosFinanceiros.orcamento) {
        const favorites = getFavorites();
        let favHtml = '';
        const dashPeriod = 'current';

        dadosFinanceiros.orcamento.forEach(o => {
          if (o.categoria === 'TOTAL' || o.categoria === 'Sobra') return;
          if (favorites.includes(normalizeCat(o.categoria))) {
            const cardPer = getBudgetCardPeriod(o.categoria);
            const data = getCardData(o, cardPer);
            
            let periodLabel = 'Mês Atual';
            if (cardPer === 'previous') periodLabel = 'Mês Passado';
            else if (cardPer === '3months') periodLabel = '3 Meses';
            else if (cardPer === '6months') periodLabel = '6 Meses';
            else if (cardPer === 'year') periodLabel = 'Ano';

            let barColor = 'var(--color-income)';
            if (data.pct > 90) barColor = 'var(--color-expense)';
            else if (data.pct > 70) barColor = 'var(--color-warning)';

            favHtml += `
              <div class="budget-mini-item clickable-card" onclick="window.showCategoryDrilldown('${o.categoria}', '${cardPer}')" style="cursor: pointer;" title="Ver lançamentos">
                <div class="budget-mini-header">
                  <span class="budget-mini-title">${o.categoria} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal; margin-left: 4px;">(${periodLabel})</span></span>
                  <span class="budget-mini-values">
                    ${formatBRL(data.spent)} / ${formatBRL(data.limit)}
                  </span>
                </div>
                <div class="budget-mini-bar">
                  <div class="budget-mini-fill" style="width: ${Math.min(data.pct, 100)}%; background-color: ${barColor};"></div>
                </div>
              </div>
            `;
          }
        });

        if (favHtml === '') {
          favListEl.innerHTML = '<div style="text-align:center; color: var(--text-muted); font-size:0.85rem; padding-top: 1rem;">Nenhum favorito selecionado. Vá em Orçamentos e clique na estrela!</div>';
        } else {
          favListEl.innerHTML = favHtml;
        }
      }

      // Render Próximas Faturas (Substitui Top 5)
      const upcomingBillsList = document.getElementById('upcoming-bills-list');
      if (upcomingBillsList && dadosFinanceiros && dadosFinanceiros.contas) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }
        let faturas = [];
        
        const cartoes = dadosFinanceiros.contas.filter(c => {
          const t = (c.tipo || '').toLowerCase();
          return t.includes('cart') || t.includes('credito') || t.includes('credito');
        });
        
        cartoes.forEach(c => {
          let faturaAtual = 0;
          let faturaProxima = 0;
          let vencimentoAtual = null;
          let vencimentoProxima = null;
          
          const lancamentosConta = dadosFinanceiros.lancamentos.filter(l => (l.conta || '').toLowerCase() === c.nome.toLowerCase());
          lancamentosConta.forEach(l => {
            const d = parseDateString(l.vencimento || l.data);
            if (!d) return;
            const monthsDiff = (d.getFullYear() - currentYear) * 12 + (d.getMonth() - currentMonth);
            
            if (monthsDiff <= 0) {
              faturaAtual += l.valor;
              if (!vencimentoAtual) vencimentoAtual = d.getDate();
            } else if (monthsDiff === 1) {
              faturaProxima += l.valor;
              if (!vencimentoProxima) vencimentoProxima = d.getDate();
            }
          });
          
          if (faturaAtual !== 0) {
            faturas.push({ nome: c.nome || c.conta || 'Cartão', dia: vencimentoAtual || 1, mes: currentMonth, ano: currentYear, valor: faturaAtual, tipo: 'Atual' });
          }
          if (faturaProxima !== 0) {
             // Só exibe a próxima se a atual estiver vazia/zerada ou para dar contexto futuro
             // Vamos empurrar as próximas também para a lista
             faturas.push({ nome: c.nome + ' (Mês seg.)', dia: vencimentoProxima || 1, mes: nextMonth, ano: nextYear, valor: faturaProxima, tipo: 'Próxima' });
          }
        });
        
        faturas.sort((a, b) => {
          const dateA = new Date(a.ano, a.mes, a.dia);
          const dateB = new Date(b.ano, b.mes, b.dia);
          return dateA - dateB;
        });
        // Exibe apenas as 5 mais próximas
        faturas = faturas.slice(0, 5);
        
        upcomingBillsList.innerHTML = '';
        if (faturas.length === 0) {
          upcomingBillsList.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0; text-align:center;">Nenhuma fatura próxima</li>';
        } else {
          faturas.forEach(f => {
            const isProx = f.tipo === 'Próxima';
            const li = document.createElement('li');
            li.className = "clickable-card";
            li.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem; font-size: 0.85rem; padding: 0.6rem; border-radius: 8px; transition: background 0.2s; cursor: pointer;";
            li.setAttribute("onclick", `window.showFaturaModal('${f.nome.replace(' (Mês seg.)', '')}', '${isProx ? 'next' : 'current'}')`);
            li.setAttribute("onmouseover", "this.style.background='rgba(255,255,255,0.05)'");
            li.setAttribute("onmouseout", "this.style.background='transparent'");
            
            li.innerHTML = `
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600; color:var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 150px;">${f.nome}</span>
                <span style="color:var(--text-muted); font-size:0.75rem;">
                  <i class="fas fa-calendar-day" style="margin-right: 4px;"></i>Vence ${String(f.dia).padStart(2, '0')}/${String(f.mes + 1).padStart(2, '0')}
                </span>
              </div>
              <div style="font-weight:700; color:${f.valor < 0 ? 'var(--color-expense)' : 'var(--text-primary)'};">
                ${formatBRL(Math.abs(f.valor))}
              </div>
            `;
            upcomingBillsList.appendChild(li);
          });
        }
      }

      renderExecutiveSummary();
      if (typeof renderBudgets === 'function') renderBudgets();
    }

    function renderExecutiveSummary() {
      const container = document.getElementById('executive-summary-content');
      if (!container) return;

      let saldoCC = 0, saldoInv = 0, saldoCartãoes = 0;

      dadosFinanceiros.contas.forEach(c => {
        const tipo = (c.tipo || '').toLowerCase();
        if (tipo.includes('cart') || tipo.includes('credito') || tipo.includes('credito')) {
          saldoCartãoes += c.saldo;
        } else if (tipo.includes('investimento') || tipo.includes('aplicao') || tipo.includes('corretora')) {
          saldoInv += c.saldo;
        } else {
          saldoCC += c.saldo;
        }
      });

      const patrimonio = saldoCC + saldoInv + saldoCartãoes;
      const alertas = dadosFinanceiros.auditoria ? dadosFinanceiros.auditoria.length : 0;
      const pendentes = dadosFinanceiros.importacoes ? dadosFinanceiros.importacoes.length : 0;

      container.innerHTML = `
        <div class="exec-card inv" data-action="inv">
          <div class="exec-card-label">Investimentos</div>
          <div class="exec-card-value" style="color:#8b5cf6;">${formatBRL(saldoInv)}</div>
          <div class="exec-card-icon">??</div>
        </div>
        <div class="exec-card cartões" data-action="cartões">
          <div class="exec-card-label">Cartões de Credito</div>
          <div class="exec-card-value" style="color:var(--color-expense);">${formatBRL(Math.abs(saldoCartãoes))}</div>
          <div class="exec-card-icon">??</div>
        </div>
        <div class="exec-card patrimonio" data-action="patrimonio">
          <div class="exec-card-label">Patrimônio Total</div>
          <div class="exec-card-value" style="background:linear-gradient(to right, var(--color-income), #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${formatBRL(patrimonio)}</div>
          <div class="exec-card-icon">??</div>
        </div>
        <div class="exec-card audit" data-action="audit">
          <div class="exec-card-label">Alertas de Auditoria</div>
          <div class="exec-card-value" style="color:${alertas > 0 ? 'var(--color-expense)' : 'var(--color-income)'};">${alertas} ${alertas === 1 ? 'alerta' : 'alertas'}</div>
          <div class="exec-card-icon">??</div>
        </div>
        <div class="exec-card imports" data-action="imports">
          <div class="exec-card-label">A Conciliar</div>
          <div class="exec-card-value" style="color:${pendentes > 0 ? '#f97316' : 'var(--color-income)'};">${pendentes} ${pendentes === 1 ? 'item' : 'itens'}</div>
          <div class="exec-card-icon">??</div>
        </div>
      `;

      // Attach event listeners (Google Sites workaround)
      setTimeout(() => {
        const actionMap = {
          'inv': () => window.showContasModal('inv'),
          'cartões': () => window.showCartãoesModal(),
          'patrimonio': () => window.showPatrimonioModal(),
          'audit': () => window.showAuditoriaModal(),
          'imports': () => window.goToImportacoes()
        };
        container.querySelectorAll('.exec-card').forEach(card => {
          const action = card.dataset.action;
          if (action && actionMap[action]) {
            card.addEventListener('click', actionMap[action]);
          }
        });
      }, 0);
    }

    function populateCategoryFilter() {
      if (!dadosFinanceiros || !dadosFinanceiros.lancamentos) return;
      const catSelect = document.getElementById('transactions-category-filter');
      if (!catSelect || catSelect.options.length > 1) return; // Already populated

      const uniqueCats = new Set();
      dadosFinanceiros.lancamentos.forEach(l => {
         const c = (l.categoria || '').trim();
         if (c) uniqueCats.add(c);
      });

      const sortedCats = Array.from(uniqueCats).sort((a, b) => a.localeCompare(b));
      sortedCats.forEach(cat => {
         const opt = document.createElement('option');
         opt.value = cat;
         opt.textContent = cat;
         catSelect.appendChild(opt);
      });
      // Sync state from UI on first load
      txCategoryFilter = catSelect.value;
    }

    function renderTransactionsTable() {
      if (!dadosFinanceiros || !dadosFinanceiros.lancamentos) return;

      // 1. Populate Account Filter Dropdown (only once)
      const accFilterSelect = document.getElementById('transactions-account-filter');
      if (accFilterSelect && accFilterSelect.options.length <= 1 && dadosFinanceiros.contas.length > 0) {
        dadosFinanceiros.contas.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.nome;
          opt.textContent = c.nome;
          accFilterSelect.appendChild(opt);
        });
        // Sync state from UI on first load
        txAccountFilter = accFilterSelect.value;
        const perFilterSelect = document.getElementById('transactions-period-filter');
        if (perFilterSelect) {
          perFilterSelect.value = txPeriodFilter;
        }
      }

      // 2. Filter by Account
      let baseTxs = dadosFinanceiros.lancamentos.filter(l => {
        if (!l.data) return false;
        if (txAccountFilter !== 'all') {
          if ((l.conta || '').toLowerCase() !== txAccountFilter.toLowerCase()) return false;
        }
        if (txCategoryFilter !== 'all') {
          if ((l.categoria || '').toLowerCase() !== txCategoryFilter.toLowerCase()) return false;
        }
        return true;
      });

      // 3. Sort Chronologically (Oldest to Newest) to calculate running balance
      baseTxs.sort((a, b) => {
        const dA = parseDateString(a.data);
        const dB = parseDateString(b.data);
        return (dA || 0) - (dB || 0);
      });

      // 4. Calculate Running Balance
      let runningBalance = 0;
      baseTxs.forEach(tx => {
        runningBalance += tx.valor;
        tx._saldo_do_dia = runningBalance;
      });

      // 5. Filter by Period (using the same logic as getFilteredTransactions)
      let now = new Date();
      const currMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currYearStr = `${now.getFullYear()}`;
      let prevNow = new Date(); prevNow.setMonth(prevNow.getMonth() - 1);
      const prevMonthStr = `${prevNow.getFullYear()}-${String(prevNow.getMonth() + 1).padStart(2, '0')}`;
      let prev2Now = new Date(); prev2Now.setMonth(prev2Now.getMonth() - 2);
      const prev2MonthStr = `${prev2Now.getFullYear()}-${String(prev2Now.getMonth() + 1).padStart(2, '0')}`;

      let filtered = baseTxs.filter(l => {
        if (txPeriodFilter !== 'all') {
          const parts = l.data.split('/');
          if (parts.length !== 3) return false;
          const yyyy_mm = `${parts[2]}-${parts[1]}`;
          if (txPeriodFilter === 'current' && yyyy_mm !== currMonthStr) return false;
          if (txPeriodFilter === 'previous' && yyyy_mm !== prevMonthStr) return false;
          if (txPeriodFilter === '3months' && yyyy_mm !== currMonthStr && yyyy_mm !== prevMonthStr && yyyy_mm !== prev2MonthStr) return false;
          if (txPeriodFilter === '6months') {
             // simplified logic for 6 months
             const d = parseDateString(l.data);
             const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
             if (d < sixMonthsAgo) return false;
          }
          if (txPeriodFilter === 'year' && parts[2] !== currYearStr) return false;
          if (txPeriodFilter === 'custom') {
             const d = parseDateString(l.data);
             const sD = txCustomStart ? new Date(txCustomStart + "T00:00:00") : new Date(0);
             const eD = txCustomEnd ? new Date(txCustomEnd + "T23:59:59") : new Date("2100-01-01");
             if (d < sD || d > eD) return false;
          }
        }

        // Global search query
        if (searchQuery !== '') {
          const obs = (l.obs || l.descricao || '').toLowerCase();
          const cat = (l.categoria || '').toLowerCase();
          const sub = (l.subcategoria || '').toLowerCase();
          if (!obs.includes(searchQuery) && !cat.includes(searchQuery) && !sub.includes(searchQuery)) {
            return false;
          }
        }
        return true;
      });

      // 6. Apply Final Sort Order (Ascending or Descending)
      if (txSortOrder === 'desc') {
        filtered.reverse(); // Since it was already ascending, reverse makes it descending (Newest first)
      }

      // 7. Pagination
      const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
      if (currentPage > totalPages) currentPage = totalPages;

      const startIdx = (currentPage - 1) * rowsPerPage;
      const endIdx = Math.min(startIdx + rowsPerPage, filtered.length);
      const pageItemes = filtered.slice(startIdx, endIdx);

      pageInfo.textContent = `Página ${currentPage} de ${totalPages} (Total: ${filtered.length})`;
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;

      transactionsTableBody.innerHTML = '';

      if (pageItemes.length === 0) {
        transactionsTableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
              Nenhum lançamento encontrado para os filtros selecionados.
            </td>
          </tr>
        `;
        return;
      }

      pageItemes.forEach(l => {
        const row = document.createElement('tr');
        let valClass = '';
        let valPrefix = '';
        const cat = (l.categoria || '').toLowerCase();
        
        if (cat.includes('transfer')) {
          valClass = 'val-col';
          valPrefix = l.valor > 0 ? '+' : '';
        } else if (l.valor > 0) {
          valClass = 'val-col income';
          valPrefix = '+';
        } else {
          valClass = 'val-col expense';
          valPrefix = '';
        }

        let badgeClass = 'badge-expense';
        if (cat.includes('transfer')) {
          badgeClass = 'badge-transfer';
        } else if (cat.includes('provent') || cat.includes('salrio') || cat.includes('inicial') || l.valor > 0) {
          badgeClass = 'badge-income';
        }

        let saldoDiaHtml = '-';
        if (txAccountFilter !== 'all') {
          const saldoColor = l._saldo_do_dia >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
          saldoDiaHtml = `<span style="color: ${saldoColor}; font-weight: 600;">${formatBRL(l._saldo_do_dia)}</span>`;
        }

        row.innerHTML = `
          <td>${l.data || '-'}</td>
          <td>${l.conta || '-'}</td>
          <td><span class="badge ${badgeClass}">${l.categoria || 'Outros'}</span></td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${l.subcategoria || '-'}</td>
          <td>${l.obs || l.descricao || '-'}</td>
          <td class="${valClass}" style="text-align: right;">${valPrefix}${formatBRL(l.valor)}</td>
          <td style="text-align: right;">${saldoDiaHtml}</td>
          <td style="text-align: center; width: 50px;">
            <i class="fas fa-pencil-alt" style="color:var(--text-muted); cursor:pointer;" onclick="window.openEditTransactionModal('${l.cod}')" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'" title="Editar"></i>
          </td>
        `;
        transactionsTableBody.appendChild(row);
      });
    }

    function getFavorites() {
      return JSON.parse(localStorage.getItem('budgetFavorites') || '[]');
    }

    function normalizeCat(c) { return (c || '').trim().toLowerCase(); }

    function getCardData(o, cardPeriod) {
      const annualBudget = Math.abs(parseFloat(o.orcamento) || parseFloat(o.valor_mensal) || 0);
      let monthlyBudget = annualBudget / 12;
      const activePeriod = cardPeriod || document.getElementById('month-filter').value;
      let periodMonths = 12;
      if (activePeriod === 'current' || activePeriod === 'previous') periodMonths = 1;
      else if (activePeriod === 'year' || activePeriod === 'last_year') periodMonths = 12;
      else if (activePeriod === '3months') periodMonths = 3;
      else if (activePeriod === '6months') periodMonths = 6;
      else if (activePeriod === 'custom') {
         periodMonths = 1; // Simplified fallback
      }
      const limit = monthlyBudget * periodMonths;
      let dynamicSpent = 0;
      const catTxs = [];
      const now = new Date();
      const currYearStr = now.getFullYear().toString();
      const currMonthStr = currYearStr + '-' + String(now.getMonth()+1).padStart(2,'0');
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const prevMonthStr = prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth()+1).padStart(2,'0');
      
      if(dadosFinanceiros.lancamentos) {
        dadosFinanceiros.lancamentos.forEach(l => {
          if ((l.categoria || '').toLowerCase().trim() !== o.categoria.toLowerCase().trim() || l.valor >= 0) return;
          if (activePeriod !== 'all') {
            const p = (l.data || '').split('/');
            if (p.length === 3) {
              const lym = p[2] + '-' + p[1].padStart(2,'0');
              const lYear = p[2];
              if (activePeriod === 'current' && lym !== currMonthStr) return;
              if (activePeriod === 'previous' && lym !== prevMonthStr) return;
              if (activePeriod === 'year' && lYear !== currYearStr) return;
              if (activePeriod === 'last_year' && lYear !== (parseInt(currYearStr) - 1).toString()) return;
            }
          }
          dynamicSpent += Math.abs(l.valor);
          catTxs.push(l);
        });
      }
      const spent = dynamicSpent;
      const remaining = limit - spent;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      const isBurst = spent > limit;
      return { limit, spent, remaining, pct, isBurst, catTxs };
    }

    function buildDetailedBudgetCard(o) {
      const cardPer = getBudgetCardPeriod(o.categoria);
      const isFav = getFavorites().includes(normalizeCat(o.categoria));
      const d = getCardData(o, cardPer);
      
      const recent = d.catTxs.sort((a,b) => {
         const da = new Date(a.data.split('/').reverse().join('-'))||0; 
         const db = new Date(b.data.split('/').reverse().join('-'))||0;
         return db - da;
      });

      let biggestExpense = 0;
      let biggestExpenseName = "-";
      recent.forEach(tx => {
         const val = Math.abs(tx.valor);
         if (val > biggestExpense) {
            biggestExpense = val;
            biggestExpenseName = tx.obs || tx.descricao || "-";
         }
      });
      let statusText = " Dentro da Meta";
      let statusColor = "var(--color-income)";
      if (d.pct >= 100) {
         statusText = " Estourado";
         statusColor = "var(--color-expense)";
      } else if (d.pct >= 85) {
         statusText = " Ateno";
         statusColor = "#f59e0b";
      }

      let txHtml = '<div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed rgba(255,255,255,0.1); flex-grow: 1;">';
      txHtml += `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 8px;">
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Status</span>
            <span style="font-size: 0.9rem; font-weight: 600; color: ${statusColor};">${statusText}</span>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 8px;">
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Maior Gasto</span>
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--color-expense);" title="${biggestExpenseName}">${formatBRL(biggestExpense)}</span>
          </div>
        </div>
      `;
      txHtml += '<span style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem; display:block; font-weight:600; letter-spacing:0.5px;">ultimas Transacoes</span>';
      const recentSliced = recent.slice(0, 50);
      if (recentSliced.length === 0) {
         txHtml += '<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 1rem;">Nenhum gasto neste periodo.</p>';
      } else {
         txHtml += '<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.8rem;">';
         if (recent.length > 50) {
            txHtml += `<div style="font-size: 0.75rem; color: var(--color-warning); text-align: center; margin-bottom: 0.5rem; background: rgba(234, 179, 8, 0.1); padding: 4px; border-radius: 4px;">Exibindo as 50 mais recentes de ${recent.length} transacoes.</div>`;
         }
         recentSliced.forEach(tx => {
           txHtml += `
             <li style="display:flex; justify-content:space-between; font-size:0.85rem; align-itemes:center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
               <span style="color:var(--text-secondary); font-size:0.75rem; min-width:45px;">${tx.data.substring(0,5)}</span>
               <span style="color:var(--text-primary); flex:1; margin:0 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${tx.obs || tx.descricao || '-'}">${tx.obs || tx.descricao || '-'}</span>
               <span style="color:var(--color-expense); font-weight:500;">${formatBRL(Math.abs(tx.valor))}</span>
             </li>
           `;
         });
         txHtml += '</ul>';
      }
      txHtml += '</div>';

      return `
        <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative; background: linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95)); border: 1px solid rgba(59, 130, 246, 0.4); display: flex; flex-direction: column; min-height: 440px;">
          <div class="budget-title-row" style="margin-bottom: 1.5rem;">
            <div style="display:flex; align-itemes:center;">
              <span class="budget-star ${isFav ? 'active' : ''}" data-star-cat="${o.categoria}" title="Favoritar" style="font-size: 1.5rem; text-shadow: 0 0 10px rgba(250, 204, 21, 0.4); margin-right: 10px;">&#9733;</span>
              <div class="emoji-dropdown">
                <span class="emoji-btn card-period-btn" title="Alterar Periodo"></span>
                <div class="emoji-dropdown-menu card-period-menu" data-period-cat="${o.categoria}">
                  <div data-val="current">Mensal</div>
                  <div data-val="3months">Trimestral</div>
                  <div data-val="6months">Semestral</div>
                  <div data-val="year">Anual</div>
                  <div data-val="all">Tudo</div>
                </div>
              </div>
              <span class="budget-cat-name" style="font-size: 1.2rem; color: #fff; margin-left: 10px;">${o.categoria}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-top:4px;">Teto de Gastos</span>
              <span class="budget-limit" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${formatBRL(d.limit)}</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; font-size:0.95rem;">
             <span style="color:var(--text-secondary);">Realizado: <span style="color:var(--text-primary); font-weight:600;">${formatBRL(d.spent)}</span></span>
             <span style="color:${d.remaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}; font-weight:600;">${d.remaining >= 0 ? 'Sobra: ' : 'Estourou: '}${formatBRL(Math.abs(d.remaining))}</span>
          </div>
          <div class="budget-progress-bar" style="height: 12px; border-radius: 6px; background: rgba(0,0,0,0.3); margin-bottom: 1rem;">
            <div class="budget-progress-fill ${d.isBurst ? 'over' : ''}" style="height: 100%; border-radius: 6px; width: ${Math.min(d.pct, 100)}%; background: ${d.isBurst ? 'var(--color-expense)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)'}; box-shadow: 0 0 10px ${d.isBurst ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'};"></div>
          </div>
          ${txHtml}
        </div>
      `;
    }

    function getBudgetCardPeriod(cat) {
      const stored = localStorage.getItem('budgetCardPeriods');
      if (stored) {
        const dict = JSON.parse(stored);
        if (dict[normalizeCat(cat)]) return dict[normalizeCat(cat)];
      }
      return 'current';
    }

    function setBudgetCardPeriod(cat, period) {
      const stored = localStorage.getItem('budgetCardPeriods');
      let dict = {};
      if (stored) dict = JSON.parse(stored);
      dict[normalizeCat(cat)] = period;
      localStorage.setItem('budgetCardPeriods', JSON.stringify(dict));
    }

    function buildBudgetCard(o, isFav, isTopArea = false) {
      const cardPer = getBudgetCardPeriod(o.categoria);
      const d = getCardData(o, cardPer);
      const starClass = isFav ? 'active' : '';
      let html = `
        <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative; overflow: visible; ${isTopArea ? 'min-height: 420px; display: flex; flex-direction: column;' : ''}">
          <div class="budget-title-row" style="display:flex; justify-content:space-between; align-itemes:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-itemes:center; gap: 6px;">
              <span class="budget-star ${starClass}" data-star-cat="${o.categoria}" title="Favoritar" style="font-size: 1.5em; margin-right: 5px;">&#9733;</span>
              <span class="budget-cat-name" style="margin-left:4px;">${o.categoria}</span>
            </div>
            <div style="display:flex; align-itemes:center; gap: 10px;">
              <select class="budget-period-select" data-budget-cat="${o.categoria}" onclick="event.stopPropagation()" style="background:var(--bg-sidebar); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:2px 5px; font-size:0.8rem; outline:none; cursor:pointer;">
                <option value="current" ${cardPer === 'current' ? 'selected' : ''}>Mês Atual</option>
                <option value="previous" ${cardPer === 'previous' ? 'selected' : ''}>Mês Anterior</option>
                <option value="3months" ${cardPer === '3months' ? 'selected' : ''}>Últimos 3 Meses</option>
                <option value="6months" ${cardPer === '6months' ? 'selected' : ''}>Últimos 6 Meses</option>
                <option value="year" ${cardPer === 'year' ? 'selected' : ''}>Ano Atual</option>
                <option value="last_year" ${cardPer === 'last_year' ? 'selected' : ''}>Ano Anterior</option>
              </select>
              <span class="budget-limit" style="font-weight:600;">Teto: ${formatBRL(d.limit)}</span>
            </div>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill ${d.isBurst ? 'over' : ''}" style="width: ${Math.min(d.pct, 100)}%"></div>
          </div>
          <div class="budget-values-row">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-secondary); display: block;">Realizado:</span>
              <span class="budget-spent">${formatBRL(d.spent)}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.8rem; color: var(--text-secondary); display: block;">${d.remaining >= 0 ? 'Sobra:' : 'Estourou:'}</span>
              <span class="budget-remaining ${d.remaining >= 0 ? 'positive' : 'negative'}">${formatBRL(Math.abs(d.remaining))}</span>
            </div>
          </div>`;

      if (isTopArea) {
         const normalizeCat = (c) => (c || '').trim().toLowerCase();
         const orcObj = (dadosFinanceiros.orcamento || []).find(x => normalizeCat(x.categoria) === normalizeCat(o.categoria));
         const currentConfigValor = orcObj ? (orcObj.config_valor || orcObj.orcamento || 0) : 0;
         const currentConfigPeriodo = orcObj ? (orcObj.config_periodo || 'mensal') : 'mensal';
         const normCat = normalizeCat(o.categoria).replace(/\s+/g, '-');
         
         html += `<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-top: 1rem; flex-grow: 1; display: flex; flex-direction: column;" onclick="event.stopPropagation()">
            <style>
               .no-spinners::-webkit-outer-spin-button,
               .no-spinners::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
               }
               .no-spinners {
                  -moz-appearance: textfield;
               }
            </style>
            
            <div style="width:100%; height:180px; margin-bottom: 1.5rem;"><canvas id="favCatChart-${normCat}"></canvas></div>

            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.8rem; display: flex; align-items: center; gap: 6px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 1rem;">
               <i class="fas fa-cog"></i> Configurar Meta
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-end;">
               <div style="flex: 1;">
                  <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Valor</label>
                  <div style="display:flex; align-items:center; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; padding: 0 8px;">
                     <span style="color:var(--text-muted); font-size:0.8rem; margin-right:4px;">R$</span>
                     <input type="number" id="cat-config-valor-${normCat}" value="${currentConfigValor}" class="no-spinners" style="flex:1; width:100%; min-width: 0; background: transparent; border: none; color: var(--text-primary); padding: 6px 0; outline: none;">
                  </div>
               </div>
               <div style="flex: 1;">
                  <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Período</label>
                  <select id="cat-config-periodo-${normCat}" style="width: 100%; background: var(--bg-color); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 8px; border-radius: 4px; outline: none; font-size: 0.85rem; height: 30px;">
                     <option value="mensal" ${currentConfigPeriodo === 'mensal' ? 'selected' : ''}>Mensal</option>
                     <option value="anual" ${currentConfigPeriodo === 'anual' ? 'selected' : ''}>Anual</option>
                  </select>
               </div>
               <button id="cat-config-save-btn-${normCat}" data-cat="${o.categoria}" class="btn btn-primary dash-cat-save-btn" style="padding: 0 12px; height: 30px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-save"></i></button>
            </div>
         </div>`;
      }

      html += `</div>`;
      return html;
    }

    function openDetailedCardModal(cat) {
      const o = dadosFinanceiros.orcamento.find(x => x.categoria === cat);
      if(!o) return;
      const html = buildDetailedBudgetCard(o);
      document.getElementById('detailedModalBody').innerHTML = html;
      document.getElementById('detailedModal').classList.add('active');
      
      const modal = document.getElementById('detailedModal');
      modal.querySelectorAll('.card-period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.emoji-dropdown-menu.show').forEach(m => {
             if(m !== btn.nextElementSibling) m.classList.remove('active');
          });
          btn.nextElementSibling.classList.toggle('show');
        });
      });
      modal.querySelectorAll('.card-period-menu div').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          setBudgetCardPeriod(cat, opt.dataset.val);
          opt.parentElement.classList.remove('active');
          window.showCategoryDrilldown(cat, 'current');
          if (typeof renderBudgets === 'function') renderBudgets();
        });
      });
      modal.querySelectorAll('.budget-star').forEach(star => {
        star.addEventListener('click', (e) => {
          e.stopPropagation();
          let favs = getFavorites();
          if (favs.includes(normalizeCat(cat))) {
            favs = favs.filter(f => f !== normalizeCat(cat));
          } else {
            favs.push(normalizeCat(cat));
          }
          localStorage.setItem('budgetFavorites', JSON.stringify(favs));
          window.showCategoryDrilldown(cat, 'current');
          renderBudgets();
        });
      });
    }

    function renderBudgets() {
      const budgetContainer = document.getElementById('budget-container');
      if (!budgetContainer) return;
      budgetContainer.innerHTML = '';

      const favItemes = [];
      const normalItemes = [];
      const favorites = getFavorites();

      let tetoGlobal = 0;
      let gastoGlobal = 0;



      if (dadosFinanceiros.orcamento) {
        dadosFinanceiros.orcamento.forEach(o => {
          if (o.categoria === 'TOTAL' || o.categoria === 'Sobra') return;
          
          const isFav = favorites.includes(normalizeCat(o.categoria));
          if (isFav) favItemes.push(o);
          normalItemes.push(o);

          const dashPeriod = document.getElementById('orcamento-dashboard-filter')?.value || 'current';
          const dDash = getCardData(o, dashPeriod);
          
          tetoGlobal += dDash.limit;
          gastoGlobal += dDash.spent;


        });
      }

      // Update Dashboard Metrics
      const livreGlobal = tetoGlobal - gastoGlobal;
      const saudePct = tetoGlobal > 0 ? ((gastoGlobal / tetoGlobal) * 100).toFixed(1) : 0;
      
      const elTeto = document.getElementById('budget-dash-teto');
      const elRealizado = document.getElementById('budget-dash-realizado');
      const elLivre = document.getElementById('budget-dash-livre');
      const elSaude = document.getElementById('budget-dash-saude');

      if (elTeto) elTeto.textContent = formatBRL(tetoGlobal);
      if (elRealizado) elRealizado.textContent = formatBRL(gastoGlobal);
      if (elLivre) {
        elLivre.textContent = formatBRL(Math.abs(livreGlobal));
        elLivre.style.color = livreGlobal >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        elLivre.previousElementSibling.querySelector('span').textContent = livreGlobal >= 0 ? 'Espao Livre Global' : 'Estouro Global';
      }
      if (elSaude) {
        elSaude.textContent = saudePct + '%';
        elSaude.style.color = saudePct > 100 ? '#ef4444' : (saudePct > 80 ? '#f59e0b' : '#10b981');
      }



      if (!dadosFinanceiros.orcamento || dadosFinanceiros.orcamento.length === 0) {
        budgetContainer.innerHTML = '<p style="color: var(--text-muted);">Nenhuma meta de oramento definida.</p>';
        return;
      }

      let html = '';
      if (favItemes.length > 0) {
        html += `<div class="budget-favorites-section">
          <div class="budget-favorites-title"> Favoritos (Em Detalhes)</div>
          <div class="budget-grid">`;
        favItemes.forEach(o => { html += buildBudgetCard(o, true, true); });
        html += `</div></div>`;
      }

      html += `<div class="budget-grid">`;
      normalItemes.forEach(o => { 
        const isFav = favorites.includes(normalizeCat(o.categoria));
        html += buildBudgetCard(o, isFav, false); 
      });
      html += `</div>`;

      budgetContainer.innerHTML = html;

      setTimeout(() => {
        const normalizeCat = (c) => (c || '').trim().toLowerCase();
        
        // Init Save buttons
        document.querySelectorAll('.dash-cat-save-btn').forEach(btn => {
           btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const cat = btn.dataset.cat;
              const normCat = normalizeCat(cat).replace(/\s+/g, '-');
              const valInput = document.getElementById('cat-config-valor-' + normCat).value;
              const perInput = document.getElementById('cat-config-periodo-' + normCat).value;
              const val = parseFloat(valInput) || 0;
              const annualVal = perInput === 'mensal' ? val * 12 : val;
              
              btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
              try {
                 if (window.DB && window.DB.saveOrcamentoConfig) {
                    await window.DB.saveOrcamentoConfig({ categoria: cat, orcamento: annualVal, config_valor: val, config_periodo: perInput });
                 }
                 if (!dadosFinanceiros.orcamento) dadosFinanceiros.orcamento = [];
                 let orcObj = dadosFinanceiros.orcamento.find(o => normalizeCat(o.categoria) === normalizeCat(cat));
                 if (orcObj) {
                    orcObj.orcamento = annualVal;
                    orcObj.config_valor = val;
                    orcObj.config_periodo = perInput;
                 } else {
                    dadosFinanceiros.orcamento.push({ categoria: cat, orcamento: annualVal, config_valor: val, config_periodo: perInput });
                 }
                 
                 btn.innerHTML = '<i class="fas fa-check"></i>';
                 btn.style.background = 'var(--color-income)';
                 setTimeout(() => {
                     btn.innerHTML = '<i class="fas fa-save"></i>';
                     btn.style.background = '';
                     if (typeof updateDashboardCharts === 'function') updateDashboardCharts();
                 }, 1500);
              } catch(err) {
                 console.error(err);
                 btn.innerHTML = '<i class="fas fa-times"></i>';
                 setTimeout(() => btn.innerHTML = '<i class="fas fa-save"></i>', 2000);
              }
           });
        });

        // Init Charts
        favItemes.forEach(o => {
           if (typeof renderDashboardFavoriteChart === 'function') {
               renderDashboardFavoriteChart(o.categoria);
           }
        });
      }, 200);


      setTimeout(() => {
        // Change event for period selects
        budgetContainer.querySelectorAll('.budget-period-select').forEach(sel => {
          sel.addEventListener('change', (e) => {
            e.stopPropagation();
            const cat = sel.dataset.budgetCat;
            const newPeriod = sel.value;
            setBudgetCardPeriod(cat, newPeriod);
            renderBudgets();
          });
        });

        budgetContainer.querySelectorAll('.budget-star').forEach(star => {
          star.addEventListener('click', (e) => {
            e.stopPropagation();
            const cat = star.dataset.starCat;
            let favs = getFavorites();
            if (favs.includes(normalizeCat(cat))) {
              favs = favs.filter(f => f !== normalizeCat(cat));
            } else {
              favs.push(normalizeCat(cat));
            }
            localStorage.setItem('budgetFavorites', JSON.stringify(favs));
            renderBudgets();
          });
        });

        budgetContainer.querySelectorAll('.clickable-card').forEach(card => {
          card.addEventListener('click', () => {
            const cat = card.dataset.budgetCat;
            if (cat) window.showCategoryDrilldown(cat, 'current');
          });
        });
      }, 0);
    }

    function renderImportConciliacao() {
      const container = document.getElementById('import-conciliacao-status');
      if (!container) return;
      
      const contas = dadosFinanceiros.contas.filter(c => c.tipo !== 'Investimento' && c.tipo !== 'Empréstimo' && c.nome.toLowerCase() !== 'cofre');
      if (contas.length === 0) return;
      
      // Funcao para converter DD/MM/YYYY em Date
      function parseDateBr(dateStr) {
        if (!dateStr || dateStr === 'N/A') return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        return new Date(0);
      }

      // Ordenar por data crescente (mais antigos primeiro)
      contas.sort((a, b) => {
        const dateA = parseDateBr(a.conciliado_ate);
        const dateB = parseDateBr(b.conciliado_ate);
        return dateA - dateB;
      });
      
      let html = '';
      contas.forEach(c => {
        let conciliadoData = c.conciliado_ate || 'N/A';
        let nome = c.nome;
        
        let color = 'var(--text-secondary)';
        let bg = 'rgba(255,255,255,0.03)';
        let border = '1px solid var(--border-color)';
        let accent = 'var(--color-accent)';
        
        // Destacar os mais atrasados
        const d = parseDateBr(conciliadoData);
        const diasAtras = (new Date() - d) / (1000 * 60 * 60 * 24);
        if (diasAtras > 30 || conciliadoData === 'N/A') {
          color = 'var(--color-expense)';
          accent = 'var(--color-expense)';
          bg = 'rgba(239, 68, 68, 0.05)';
          border = '1px solid rgba(239, 68, 68, 0.2)';
        } else if (diasAtras > 15) {
          color = 'var(--color-warning)';
          accent = 'var(--color-warning)';
          bg = 'rgba(245, 158, 11, 0.05)';
          border = '1px solid rgba(245, 158, 11, 0.2)';
        }
        
        html += `
          <div style="background: ${bg}; border: ${border}; border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;" title="Conta: ${c.nome}">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-university" style="color: ${accent};"></i>
              <span style="font-weight: 500; color: var(--text-primary);">${nome}</span>
            </div>
            <span style="color: ${color}; font-family: monospace; font-weight: 600;">${conciliadoData}</span>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    function renderAccounts() {
      const container = document.getElementById('panel-accounts');
      if (!container) return;

      if (!dadosFinanceiros.contas || dadosFinanceiros.contas.length === 0) {
        container.innerHTML = `<h2 style="margin-bottom: 1.5rem;">Contas Bancrias</h2><p style="color: var(--text-muted);">Nenhuma conta cadastrada.</p>`;
        return;
      }

      const groups = {
        'Contas Correntes': [],
        'Cartões de Credito': [],
        'Investimentos': []
      };
      let totalCC = 0, totalCartãoes = 0, totalInv = 0;

      dadosFinanceiros.contas.forEach(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('credito') || t.includes('credito')) {
          groups['Cartões de Credito'].push(c);
          totalCartãoes += c.saldo;
        } else if (t.includes('investimento') || t.includes('aplicao') || t.includes('corretora') || t.includes('aplicacao') || t.includes('poupana') || t.includes('poupanca')) {
          groups['Investimentos'].push(c);
          totalInv += c.saldo;
        } else {
          groups['Contas Correntes'].push(c);
          totalCC += c.saldo;
        }
      });

      const patrimonio = totalCC + totalInv + totalCartãoes;

      const now = new Date();
      now.setHours(0,0,0,0);
      
      window.getLastTransactionDateForAccount = function(accountName) {
        if (!dadosFinanceiros || !dadosFinanceiros.lancamentos) return null;
        const name = (accountName || '').toLowerCase();
        let maxDate = null;
        dadosFinanceiros.lancamentos.forEach(l => {
           if ((l.conta || '').toLowerCase() === name) {
              const d = parseDateString(l.data);
              if (d) {
                 if (!maxDate || d.getTime() > maxDate.getTime()) {
                    maxDate = d;
                 }
              }
           }
        });
        if (maxDate) {
           const day = String(maxDate.getDate()).padStart(2, '0');
           const month = String(maxDate.getMonth() + 1).padStart(2, '0');
           const year = maxDate.getFullYear();
           return `${day}/${month}/${year}`;
        }
        return null;
      };

      const todasContasAtraso = [];
      dadosFinanceiros.contas.forEach(c => {
        const dateStr = c.uultima_movimentacao || window.getLastTransactionDateForAccount(c.nome || c.conta);
        if (!dateStr) return;
        const d = parseDateString(dateStr);
        if (d) {
          d.setHours(0,0,0,0);
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          todasContasAtraso.push({ ...c, diffDays, displayDate: dateStr });
        }
      });
      todasContasAtraso.sort((a,b) => b.diffDays - a.diffDays);
      
      const count60 = todasContasAtraso.filter(c => c.diffDays > 60).length;
      const count30 = todasContasAtraso.filter(c => c.diffDays > 30 && c.diffDays <= 60).length;
      const count10 = todasContasAtraso.filter(c => c.diffDays > 10 && c.diffDays <= 30).length;
      
      const temAtraso = (count60 + count30 + count10) > 0;
      
      const top5 = todasContasAtraso.slice(0, 5);
      
      let alertaHtml = '';
      if (temAtraso) {
        alertaHtml += `<div style="display:flex; justify-content:space-between; width:100%; margin-bottom:0.8rem;">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:1.2rem; font-weight:700; color:var(--color-expense);">${count60}</span>
            <span style="font-size:0.65rem; color:var(--text-muted);">> 60d</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:1.2rem; font-weight:700; color:#eab308;">${count30}</span>
            <span style="font-size:0.65rem; color:var(--text-muted);">> 30d</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:1.2rem; font-weight:700; color:var(--text-primary);">${count10}</span>
            <span style="font-size:0.65rem; color:var(--text-muted);">> 10d</span>
          </div>
        </div>`;
      } else {
        alertaHtml += `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; margin-bottom:0.8rem;">
           <div style="font-size:1.8rem; font-weight:700; color:var(--color-income); margin-bottom:0.5rem;"><i class="fas fa-check-circle"></i></div>
           <div style="font-size:0.85rem; color:var(--text-muted);">Tudo em dia!</div>
        </div>`;
      }
      
      alertaHtml += `<div style="width:100%; text-align:left; border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem;">`;
      top5.forEach(c => {
        let color = 'var(--text-primary)';
        if (c.diffDays > 60) color = 'var(--color-expense)';
        else if (c.diffDays > 30) color = '#eab308';
        
        alertaHtml += `<div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.25rem;">
          <span style="color:var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 75%;">${c.nome || c.conta || 'Conta'}</span>
          <span style="color:${color}; font-weight:600;">${c.diffDays}d</span>
        </div>`;
      });
      alertaHtml += `</div>`;

      let html = `
        <div class="metrics-grid" style="margin-bottom: 2rem;">
          <div class="card bg-card" id="card-composicao-saldos" style="cursor:pointer; border-left: 4px solid var(--color-accent);">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.8rem; font-weight:600;">Composição de Saldos</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem; font-size:0.9rem;">
              <span>Correntes</span><span style="color:var(--text-primary);">${formatBRL(totalCC)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem; font-size:0.9rem;">
              <span>Investimentos</span><span style="color:var(--text-primary);">${formatBRL(totalInv)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; font-size:0.9rem;">
              <span>Cartões</span><span style="color:var(--color-expense);">${formatBRL(totalCartãoes)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem; font-weight:700;">
              <span>Total (Líquido)</span><span style="color:var(--color-income); font-size:1.1rem;">${formatBRL(patrimonio)}</span>
            </div>
          </div>
          
          <div class="card bg-card" id="card-alertas-conciliacao" style="cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-itemes:center; text-align:center; border-left: 4px solid ${temAtraso ? 'var(--color-expense)' : 'var(--color-income)'};">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem; font-weight:600; align-self:flex-start; width:100%; text-align:left;">Status de Conciliao</div>
            ${alertaHtml}
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:1rem;">Clique para listar contas</div>
          </div>
        </div>
      `;

      html += `<div style="display:flex; flex-direction:column; gap:2.5rem;">`;
      
      const iconMap = {
        'Contas Correntes': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></svg>',
        'Cartões de Credito': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>'
      };

      const colorMap = {
        'Contas Correntes': 'income',
        'Cartões de Credito': 'expense',
        'Investimentos': 'accent'
      };

      const subtotals = {
        'Contas Correntes': totalCC,
        'Cartões de Credito': totalCartãoes,
        'Investimentos': totalInv
      };

      const subtotalColors = {
        'Contas Correntes': 'var(--color-income)',
        'Cartões de Credito': 'var(--color-expense)',
        'Investimentos': 'var(--color-accent)'
      };

      for (const groupName of ['Contas Correntes', 'Cartões de Credito']) {
        const contas = groups[groupName];
        if (contas.length === 0) continue;

        html += `<div>
          <div class="subtotal-row">
            <span style="color:var(--text-primary);">${groupName}</span>
            <span style="color:${subtotalColors[groupName]};">${formatBRL(subtotals[groupName])}</span>
          </div>
          <div class="metrics-grid">
        `;

        const now = new Date();
        const today = now.getDate();

        if (groupName === 'Cartões de Credito') {
           contas.sort((a, b) => {
              const diaA = parseInt(a.dia_vencimento) || 31;
              const diaB = parseInt(b.dia_vencimento) || 31;
              const nextDateA = new Date(now.getFullYear(), now.getMonth() + (diaA < today ? 1 : 0), diaA);
              const nextDateB = new Date(now.getFullYear(), now.getMonth() + (diaB < today ? 1 : 0), diaB);
              return nextDateA - nextDateB;
           });
        }

        contas.forEach(c => {
          const cName = c.nome || c.conta || 'Conta';
          const isCC = groupName === 'Cartões de Credito';
          
          let faturaAtual = c.fatura_atual || 0;
          let faturaProxima = c.fatura_proxima || 0;

          html += `
            <div class="card ${colorMap[groupName]}-card clickable-card" data-conta-name="${cName}" style="cursor:pointer; ${isCC ? 'border-top: 3px solid var(--color-expense);' : ''}">
              <div class="card-header">
                <span>${cName}</span>
                <div class="card-icon">${iconMap[groupName] || ''}</div>
              </div>
              <div class="card-value" style="font-size:1.6rem;">${formatBRL(c.saldo)}</div>
              
              ${isCC ? `
                <div style="display:flex; justify-content:space-between; margin-top:0.8rem; font-size:0.75rem; background: rgba(0,0,0,0.15); padding: 0.5rem; border-radius: 6px;">
                  <div>
                    <div style="color:var(--text-muted); font-size:0.65rem;">Última Fechada</div>
                    <div style="color:${faturaAtual < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaAtual)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="color:var(--text-muted); font-size:0.65rem;">Projeção Próxima</div>
                    <div style="color:${faturaProxima < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaProxima)}</div>
                  </div>
                </div>
              ` : ''}

              <div style="display:flex; justify-content:space-between; align-itemes:center; margin-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
                <div class="card-trend" style="color:var(--text-muted); font-size:0.75rem;">
                  Clique para ver extrato
                  ${c.conciliado_ate ? `<div style="font-size:0.65rem; opacity:0.6; margin-top:3px;"><i class="fas fa-check-circle"></i> Conciliado até: ${c.conciliado_ate}</div>` : ''}
                </div>
                ${c.uultima_movimentacao ? `<div style="font-size: 0.75rem; font-weight:600; color: ${getDateColor(c.uultima_movimentacao)};"><i class="fas fa-history" style="margin-right: 3px;"></i>${c.uultima_movimentacao}</div>` : ''}
              </div>
            </div>
          `;
        });
        html += `</div></div>`;
      }

      html += `</div>`;
      container.innerHTML = html;

      // Update Charts
      if (!monthlyChart) {
        if (typeof initCharts === 'function') initCharts();
      } else {
        if (typeof updateCharts === 'function') updateCharts();
      }

      setTimeout(() => {
        const compCard = document.getElementById('card-composicao-saldos');
        if (compCard) compCard.addEventListener('click', () => window.showPatrimonioModal());

        const alertCard = document.getElementById('card-alertas-conciliacao');
        if (alertCard) alertCard.addEventListener('click', () => window.showConciliacaoModal());

        container.querySelectorAll('[data-conta-name]').forEach(card => {
          card.addEventListener('click', () => {
            window.showExtratoContaModal(card.dataset.contaName);
          });
        });
      }, 0);
    }

    function renderInvestmentsDashboard() {
      const dashboardEl = document.getElementById('investments-dashboard');
      if (!dashboardEl) return;

      const filterPeriod = getTabPeriod('investimentos');
      const lancamentosFiltrados = getFilteredTransactions(filterPeriod);
      
      const invAccountNames = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('investimento') || t.includes('aplicao') || t.includes('corretora');
      }).map(c => c.nome);

      if (invAccountNames.length === 0) {
        dashboardEl.style.display = 'none';
        return;
      }
      dashboardEl.style.display = 'block';

      let aportesPeriodo = 0;
      let resgatesPeriodo = 0;
      let rendimentoPeriodo = 0;
      
      const monthlyData = {};

      lancamentosFiltrados.forEach(l => {
        if (!invAccountNames.includes(l.conta)) return;
        
        const cat = (l.categoria || '').trim().toLowerCase();
        const v = l.valor;

        if (cat === 'saldo inicial') return;

        // Rendimentos
        if (cat === 'rendimentos' || cat === 'outros') {
          rendimentoPeriodo += v;
          updateInvMonthly(monthlyData, l.data, v, 0, 0);
        } else {
          // Aportes / Resgates
          if (v > 0 && (cat === 'transferencia' || cat === 'proventos' || cat === 'transferencia')) {
            aportesPeriodo += v;
            updateInvMonthly(monthlyData, l.data, 0, v, 0);
          } else if (v < 0 && (cat === 'transferencia' || cat === 'diversos' || cat === 'transferencia')) {
            resgatesPeriodo += Math.abs(v);
            updateInvMonthly(monthlyData, l.data, 0, 0, Math.abs(v));
          }
        }
      });

      const crescimento = aportesPeriodo + rendimentoPeriodo - resgatesPeriodo;

      const aEl = document.getElementById('inv-dash-aportes');
      const rEl = document.getElementById('inv-dash-rendimento');
      const resEl = document.getElementById('inv-dash-resgates');
      const cEl = document.getElementById('inv-dash-crescimento');
      
      if(aEl) aEl.textContent = formatBRL(aportesPeriodo);
      if(rEl) rEl.textContent = formatBRL(rendimentoPeriodo);
      if(resEl) resEl.textContent = formatBRL(resgatesPeriodo);
      if(cEl) cEl.textContent = formatBRL(crescimento);
      
      // Update Composition Chart
      const compLabels = [];
      const compData = [];
      dadosFinanceiros.contas.forEach(c => {
         if (invAccountNames.includes(c.nome) && c.saldo > 0) {
            compLabels.push(c.nome);
            compData.push(c.saldo);
         }
      });
      
      const ctxInvComp = document.getElementById('inv-composition-chart');
      if (ctxInvComp) {
         if (invCompChart) invCompChart.destroy();
         invCompChart = new Chart(ctxInvComp.getContext('2d'), {
            type: 'doughnut',
            data: {
               labels: compLabels,
               datasets: [{
                  data: compData,
                  backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'],
                  borderWidth: 0,
                  hoverOffset: 4
               }]
            },
            options: {
               responsive: true,
               maintainAspectRatio: false,
               cutout: '70%',
               plugins: { legend: { position: 'right', labels: { color: '#a0aec0', padding: 15, boxWidth: 12 } } }
            }
         });
      }

      // Update History Chart
      const sortedKeys = Object.keys(monthlyData).sort();
      const histLabels = sortedKeys;
      const histAportes = sortedKeys.map(k => monthlyData[k].aportes);
      const histRends = sortedKeys.map(k => monthlyData[k].rendimentos);
      const histResgates = sortedKeys.map(k => monthlyData[k].resgates);
      
      const ctxInvHist = document.getElementById('inv-history-chart');
      if (ctxInvHist) {
         if (invHistoryChart) invHistoryChart.destroy();
         invHistoryChart = new Chart(ctxInvHist.getContext('2d'), {
            type: 'bar',
            data: {
               labels: histLabels,
               datasets: [
                  { label: 'Aportes (R$)', data: histAportes, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 },
                  { label: 'Rendimentos (R$)', data: histRends, backgroundColor: 'rgba(139, 92, 246, 0.8)', borderRadius: 4 },
                  { label: 'Resgates (R$)', data: histResgates, backgroundColor: 'rgba(244, 63, 94, 0.8)', borderRadius: 4 }
               ]
            },
            options: {
               responsive: true,
               maintainAspectRatio: false,
               plugins: { legend: { labels: { color: '#a0aec0' } } },
               scales: {
                  x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#a0aec0' } },
                  y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#a0aec0' } }
               }
            }
         });
      }
    }

    function updateInvMonthly(dict, dateStr, rend, aporte, resgate) {
       if (!dateStr) return;
       const p = dateStr.split('/');
       if (p.length === 3) {
          const key = p[2] + '-' + p[1];
          if (!dict[key]) dict[key] = { rendimentos: 0, aportes: 0, resgates: 0 };
          dict[key].rendimentos += rend || 0;
          dict[key].aportes += aporte || 0;
          dict[key].resgates += resgate || 0;
       }
    }

    function renderInvestments() {
      const container = document.getElementById('investments-container');
      if (!container) return;

      const investimentos = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('investimento') || t.includes('aplicao') || t.includes('corretora');
      });

      if (investimentos.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Nenhuma conta de investimento cadastrada.</p>';
        return;
      }

      let totalInv = investimentos.reduce((s, c) => s + c.saldo, 0);
      const invIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>';

      let html = `
        <div class="patrimonio-card-hero" style="background:linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.08));">
          <div class="patrimonio-label">Total Investido</div>
          <div class="patrimonio-value" style="background:linear-gradient(to right, #8b5cf6, var(--color-accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${formatBRL(totalInv)}</div>
        </div>
      `;

      html += `<div class="metrics-grid">`;
      investimentos.forEach(c => {
        const cName = c.nome || c.conta || 'Conta';
        const pctOfTotal = totalInv > 0 ? ((c.saldo / totalInv) * 100).toFixed(1) : 0;
        html += `
          <div class="card saving-card clickable-card" data-inv-name="${cName}" style="cursor:pointer;">
            <div class="card-header">
              <span>${cName}</span>
              <div class="card-icon">${invIcon}</div>
            </div>
            <div class="card-value" style="font-size:1.6rem; color:#8b5cf6;">${formatBRL(c.saldo)}</div>
            <div class="card-trend" style="color:var(--text-muted);">
              ${pctOfTotal}% do total  Clique para ver extrato
              ${c.conciliado_ate ? `<div style="font-size:0.65rem; opacity:0.6; margin-top:3px;"><i class="fas fa-check-circle"></i> Conciliado até: ${c.conciliado_ate}</div>` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;

      container.innerHTML = html;

      setTimeout(() => {
        container.querySelectorAll('[data-inv-name]').forEach(card => {
          card.addEventListener('click', () => {
            window.showExtratoContaModal(card.dataset.invName, getTabPeriod('investimentos'));
          });
        });
      }, 0);
    }

    function renderAudit() {
      auditContainer.innerHTML = '';

      // Use data from Google Sheets AUDITORIA tab
      if (dadosFinanceiros.auditoria && dadosFinanceiros.auditoria.length > 0) {
        dadosFinanceiros.auditoria.forEach(rule => {
          const item = document.createElement('div');
          item.className = 'audit-item';
          const status = rule.status.toUpperCase();
          const isOk = status === 'OK';
          const isErro = status === 'ERRO';
          const statusClass = isOk ? 'ok' : 'error';
          const statusLabel = status || 'PENDENTE';

          item.innerHTML = `
            <div class="audit-title">
              <span>${rule.conferencia}</span>
              <span class="audit-status ${statusClass}">${statusLabel}</span>
            </div>
            ${rule.descricao ? `<div class="audit-desc">${rule.descricao}</div>` : ''}
            ${rule.resultado ? `<div class="audit-result" style="color: ${isOk ? 'var(--color-income)' : 'var(--color-expense)'}">
              Resultado Apurado: ${rule.resultado}
            </div>` : ''}
          `;
          auditContainer.appendChild(item);
        });
      } else {
        // Fallback: calculate transfer audit locally
        let transferSum = 0;
        dadosFinanceiros.lancamentos.forEach(l => {
          const cat = (l.categoria || '').toLowerCase();
          if (cat.includes('transfer')) transferSum += l.valor;
        });

        const item = document.createElement('div');
        item.className = 'audit-item';
        const isOk = Math.abs(transferSum) < 0.01;
        item.innerHTML = `
          <div class="audit-title">
            <span>Verificao de Transferencias Globais</span>
            <span class="audit-status ${isOk ? 'ok' : 'error'}">${isOk ? 'OK' : 'ERRO'}</span>
          </div>
          <div class="audit-desc">A soma de todos os lancamentos de transferencia deve ser R$ 0,00.</div>
          <div class="audit-result" style="color: ${isOk ? 'var(--color-income)' : 'var(--color-expense)'}">
            Resultado Apurado: ${isOk ? 'R$ 0,00 (Total Conciliado)' : formatBRL(transferSum)}
          </div>
        `;
        auditContainer.appendChild(item);
      }
    }


    function initCharts() {
      const ctxMonthly = document.getElementById('monthly-evolution-chart').getContext('2d');
      const ctxCategory = document.getElementById('category-distribution-chart').getContext('2d');
      const chartData = getChartsFilteredData();

      monthlyChart = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: chartData.monthlyLabels,
          datasets: [
            {
              label: 'Receitas',
              data: chartData.monthlyIncome,
              backgroundColor: '#10b981',
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: 'Despesas',
              data: chartData.monthlyExpense.map(Math.abs),
              backgroundColor: '#f43f5e',
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` ${context.dataset.label}: ${formatBRL(context.raw)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            }
          }
        }
      });

      categoryChart = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
          labels: chartData.categoryLabels,
          datasets: [{
            data: chartData.categoryValues,
            backgroundColor: [
              '#f43f5e', '#3b82f6', '#10b981', '#eab308', 
              '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', 
              '#14b8a6', '#64748b'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` Gastos: ${formatBRL(context.raw)}`;
                }
              }
            }
          },
          cutout: '70%'
        }
      });
      
      const ctxFav = document.getElementById('favorite-categories-chart');
      if (ctxFav) {
        if (chartData.favoriteDatasets.length === 0) {
          document.getElementById('favorite-categories-empty').style.display = 'block';
          ctxFav.style.display = 'none';
        } else {
          document.getElementById('favorite-categories-empty').style.display = 'none';
          ctxFav.style.display = 'block';
          
          favoriteCategoriesChart = new Chart(ctxFav.getContext('2d'), {
            type: 'bar',
            data: {
              labels: chartData.favoriteLabels,
              datasets: chartData.favoriteDatasets
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit' }, boxWidth: 12 } },
                tooltip: {
                  callbacks: {
                    label: function(context) { return ` ${context.dataset.label}: ${context.raw}%`; }
                  }
                }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Outfit' } } },
                y: { 
                  min: 0, 
                  max: 120,
                  grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
                  ticks: { 
                    color: '#94a3b8', 
                    font: { family: 'Outfit' },
                    callback: function(value) { return value + '%'; }
                  } 
                }
              }
            }
          });
        }
      }
    }

    function updateMonthlyChart() {
      if (!monthlyChart) return;
      const chartData = getChartsFilteredData();
      monthlyChart.data.labels = chartData.monthlyLabels;
      monthlyChart.data.datasets[0].data = chartData.monthlyIncome;
      monthlyChart.data.datasets[1].data = chartData.monthlyExpense.map(Math.abs);
      monthlyChart.update();
    }

    function updateCategoryChart() {
      if (!categoryChart) return;
      const chartData = getChartsFilteredData();
      categoryChart.data.labels = chartData.categoryLabels;
      categoryChart.data.datasets[0].data = chartData.categoryValues;
      categoryChart.update();
    }

    function updateCharts() {
      updateMonthlyChart();
      updateCategoryChart();
      
      if (favoriteCategoriesChart) {
        const chartData = getChartsFilteredData();
        if (chartData.favoriteDatasets.length === 0) {
          document.getElementById('favorite-categories-empty').style.display = 'block';
          document.getElementById('favorite-categories-chart').style.display = 'none';
        } else {
          document.getElementById('favorite-categories-empty').style.display = 'none';
          document.getElementById('favorite-categories-chart').style.display = 'block';
          favoriteCategoriesChart.data.labels = chartData.favoriteLabels;
          favoriteCategoriesChart.data.datasets = chartData.favoriteDatasets;
          favoriteCategoriesChart.update();
        }
      }
    }

    function getChartsFilteredData() {
      // Bar Chart: Period filter
      const monthlySelect = document.getElementById('monthly-evolution-period');
      const monthlyPeriod = monthlySelect ? monthlySelect.value : '6months';
      const filteredMonthly = getFilteredTransactions(monthlyPeriod);
      const monthlyData = {};
      
      filteredMonthly.forEach(l => {
        if (!l.data) return;
        const parts = l.data.split('/');
        const monthYear = `${parts[1]}/${parts[2]}`;
        const cat = (l.categoria || '').toLowerCase();
        if (cat.includes('transfer') || cat.includes('saldo inicial')) return;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        if (l.valor > 0) {
          monthlyData[monthYear].income += l.valor;
        } else {
          monthlyData[monthYear].expense += l.valor;
        }
      });

      const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const partsA = a.split('/');
        const partsB = b.split('/');
        return new Date(partsA[1], partsA[0] - 1) - new Date(partsB[1], partsB[0] - 1);
      });

      const monthlyLabels = sortedMonths.map(getMonthLabel);
      const monthlyIncome = sortedMonths.map(m => monthlyData[m].income);
      const monthlyExpense = sortedMonths.map(m => monthlyData[m].expense);

      // Pie Chart: Category breakdown (uses its own period selector)
      const categorySelect = document.getElementById('category-distribution-period');
      const categoryPeriod = categorySelect ? categorySelect.value : 'current';
      const filteredCategory = getFilteredTransactions(categoryPeriod);
      const categoryData = {};
      filteredCategory.forEach(l => {
        if (l.valor >= 0) return;
        const cat = l.categoria || 'Outros';
        if (cat.toLowerCase().includes('transfer') || cat.toLowerCase().includes('saldo inicial')) return;

        if (!categoryData[cat]) categoryData[cat] = 0;
        categoryData[cat] += Math.abs(l.valor);
      });

      const sortedCategories = Object.keys(categoryData).sort((a, b) => categoryData[b] - categoryData[a]);
      let categoryLabels = [];
      let categoryValues = [];

      if (sortedCategories.length > 9) {
        categoryLabels = sortedCategories.slice(0, 9);
        categoryValues = categoryLabels.map(c => categoryData[c]);
        let otherSum = 0;
        for (let i = 9; i < sortedCategories.length; i++) {
          otherSum += categoryData[sortedCategories[i]];
        }
        categoryLabels.push('Outros');
        categoryValues.push(otherSum);
      } else {
        categoryLabels = sortedCategories;
        categoryValues = sortedCategories.map(c => categoryData[c]);
      }

      // Novo cálculo para Favoritos mês a mês (Últimos 4 meses)
      let rawFavorites = getFavorites() || [];
      // Remove duplicatas (case insensitive)
      const favorites = [];
      const seenFavs = new Set();
      rawFavorites.forEach(f => {
         const norm = normalizeCat(f);
         if (!seenFavs.has(norm)) {
            seenFavs.add(norm);
            favorites.push(f);
         }
      });
      
      const favData = {};
      
      const now = new Date();
      const last4Months = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const yStr = d.getFullYear();
        last4Months.push({
           key: `${mStr}/${yStr}`,
           label: getMonthLabel(`${mStr}/${yStr}`),
           monthIndex: 3 - i
        });
      }

      favorites.forEach(fav => { 
        favData[fav] = { budget: 0, spent: [0, 0, 0, 0] };
        if (dadosFinanceiros && dadosFinanceiros.orcamento) {
           const orcObj = dadosFinanceiros.orcamento.find(o => normalizeCat(o.categoria) === normalizeCat(fav));
           if (orcObj) {
              const annualBudget = Math.abs(parseFloat(orcObj.orcamento) || parseFloat(orcObj.valor_mensal) || 0);
              let monthlyBudget = annualBudget / 12;
              favData[fav].budget = monthlyBudget;
           }
        }
      });
      
      if (dadosFinanceiros && dadosFinanceiros.lancamentos) {
        dadosFinanceiros.lancamentos.forEach(l => {
          if (!l.data || l.valor >= 0) return;
          const d = parseDateString(l.data || l.vencimento);
          if (!d) return;
          
          const cat = (l.categoria || '');
          if (cat.toLowerCase().includes('transfer') || cat.toLowerCase().includes('saldo inicial')) return;
          
          const favMatch = favorites.find(f => normalizeCat(f) === normalizeCat(cat));
          if (favMatch) {
             const mKey = String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
             const monthObj = last4Months.find(m => m.key === mKey);
             if (monthObj) {
                favData[favMatch].spent[monthObj.monthIndex] += Math.abs(l.valor);
             }
          }
        });
      }

      const favoriteDatasets = last4Months.map(mObj => {
         const dataForMonth = favorites.map(fav => {
            const spent = favData[fav].spent[mObj.monthIndex];
            const budget = favData[fav].budget;
            if (budget === 0) return 0;
            let pct = (spent / budget) * 100;
            if (pct > 120) pct = 120; // Cap at 120%
            return parseFloat(pct.toFixed(1));
         });
         const bgColors = favorites.map(fav => {
            const spent = favData[fav].spent[mObj.monthIndex];
            const budget = favData[fav].budget;
            if (budget === 0) return 'rgba(139, 92, 246, 0.9)'; // Neon Purple fallback
            const pct = (spent / budget) * 100;
            if (pct > 100) return 'rgba(244, 63, 94, 0.9)'; // Neon Rose
            if (pct >= 80) return 'rgba(251, 191, 36, 0.9)'; // Neon Gold
            return 'rgba(16, 185, 129, 0.9)'; // Neon Emerald
         });
         
         return {
            label: mObj.label,
            data: dataForMonth,
            backgroundColor: bgColors,
            borderRadius: 4,
            borderSkipped: false
         };
      });

      const favoriteLabels = favorites.map(fav => {
         const budget = favData[fav].budget || 0;
         let isExploding = false;
         if (budget > 0) {
            for (let i = 0; i < 4; i++) {
               const spent = favData[fav].spent[i] || 0;
               const pct = (spent / budget) * 100;
               if (pct > 120) {
                   isExploding = true;
                   break;
               }
            }
         }
         let label = fav.charAt(0).toUpperCase() + fav.slice(1);
         if (isExploding) {
             label = `💣 ${label} 💣`;
         }
         const budgetStr = `R$ ${budget.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
         return [label, budgetStr];
      });

      return { monthlyLabels, monthlyIncome, monthlyExpense, categoryLabels, categoryValues, favoriteDatasets, favoriteLabels };
    }

    function showModalDetails(type) {
      window.showReceitasDespesasModal(type, 'current');
    }

    document.addEventListener('DOMContentLoaded', bootstrapApp);

    // Funes Globais de Modal
    window.showGlassModal = function(title, htmlContent) {
      const modal = document.getElementById('glassModal');
      document.getElementById('glassModalTitle').textContent = title;
      document.getElementById('glassModalBody').innerHTML = htmlContent;
      modal.classList.add('active');
    };

    window.closeGlassModal = function() {
      document.getElementById('glassModal').classList.remove('active');
    };

    window.showReceitasDespesasModal = function(type, period = 'current') {
      const isIncome = type === 'incomes';
      const filtered = getFilteredTransactions(period);
      const itemes = filtered.filter(l => {
        const cat = (l.categoria || '').toLowerCase();
        if (cat.includes('transfer') || cat.includes('saldo inicial')) return false;
        return isIncome ? l.valor > 0 : l.valor < 0;
      });

      if (itemes.length === 0) {
        showGlassModal(isIncome ? 'Receitas' : 'Despesas', '<p style="color:var(--text-muted);">Nenhum lanamento nao periodo.</p>');
        return;
      }

      const grouped = {};
      let total = 0;
      itemes.forEach(item => {
        const cat = item.categoria || 'Outros';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
        total += Math.abs(item.valor);
      });

      const sorted = Object.entries(grouped).sort((a,b) => {
        const sumA = a[1].reduce((s,i) => s + Math.abs(i.valor), 0);
        const sumB = b[1].reduce((s,i) => s + Math.abs(i.valor), 0);
        return sumB - sumA;
      });

      const color = isIncome ? 'var(--color-income)' : 'var(--color-expense)';

      let html = `<div style="margin-bottom:1.5rem; font-size:1.8rem; font-weight:bold; color:${color}; text-align:center;">${formatBRL(total)}</div>`;
      html += `<p style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin-bottom:1.5rem;">Clique numa categoria para ver os lancamentos</p>`;
      
      sorted.forEach(([cat, catItemes], idx) => {
        const catTotal = catItemes.reduce((s,i) => s + Math.abs(i.valor), 0);
        const pct = total > 0 ? (catTotal / total * 100).toFixed(1) : 0;
        const drillId = `drill-${type}-${idx}`;
        const iconId = `icon-${type}-${idx}`;

        html += `
          <div class="drilldown-category" data-drill-target="${drillId}" data-icon-id="${iconId}">
            <div class="bar-chart-labels">
              <span style="color:var(--text-primary); font-weight:500;"><i id="${iconId}" class="fas fa-chevron-right drilldown-expand-icon"></i> ${cat}</span>
              <span style="color:var(--text-muted);">${formatBRL(catTotal)} (${pct}%)</span>
            </div>
            <div class="bar-chart-bar-bg">
              <div class="bar-chart-bar-fill" style="width: ${pct}%; background: ${color}; animation: fillBar 1s ease-out forwards;"></div>
            </div>
          </div>
          <div id="${drillId}" class="drilldown-itemes">
        `;
        catItemes.sort((a,b) => Math.abs(b.valor) - Math.abs(a.valor)).forEach(item => {
          html += `
            <div class="drilldown-item-row">
              <span style="color:var(--text-muted);">${item.data}</span>
              <span style="color:var(--text-primary);">${item.obs || item.descricao || item.conta || '-'}</span>
              <span style="color:${color}; font-weight:600;">${formatBRL(Math.abs(item.valor))}</span><span style="text-align:center; cursor:pointer;" onclick="window.openEditTransactionModal('${item.cod}')"><i class="fas fa-pencil-alt" style="color:var(--text-muted); opacity: 0.75;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'"></i></span></div>
          `;
        });
        html += `</div>`;
      });
      
      showGlassModal(isIncome ? 'Detalhamento de Receitas' : 'Detalhamento de Despesas', html);

      // Attach drill-down toggle events after modal is rendered
      setTimeout(() => {
        document.querySelectorAll('.drilldown-category').forEach(row => {
          row.addEventListener('click', () => {
            const targetId = row.dataset.drillTarget;
            const iconId = row.dataset.iconId;
            const panel = document.getElementById(targetId);
            const icon = document.getElementById(iconId);
            if (panel) {
              panel.classList.toggle('show');
              if (icon) icon.classList.toggle('open');
            }
          });
        });
      }, 50);
    };

    // NEW: Show category drilldown (used by Top 5 and Budget cards)
    window.showCategoryDrilldown = function(categoria, period = 'current') {
      const normalizeCat = (c) => (c || '').trim().toLowerCase();
      const filtered = getFilteredTransactions(period);
      const itemes = filtered.filter(l => {
        return normalizeCat(l.categoria) === normalizeCat(categoria);
      });

      const favs = JSON.parse(localStorage.getItem('budgetFavorites') || '[]');
      const isFav = favs.some(f => normalizeCat(f) === normalizeCat(categoria));

      if (itemes.length === 0 && !isFav) {
        showGlassModal(categoria, '<p style="color:var(--text-muted); text-align:center;">Nenhum lançamento encontrado para esta categoria no período.</p>');
        return;
      }

      let totalPos = 0, totalNeg = 0;
      itemes.forEach(i => { if (i.valor > 0) totalPos += i.valor; else totalNeg += Math.abs(i.valor); });
      const mainTotal = totalNeg > 0 ? totalNeg : totalPos;
      const color = totalNeg > 0 ? 'var(--color-expense)' : 'var(--color-income)';

      let html = `<div style="margin-bottom:1rem; text-align:center;">
        <div style="font-size:1.6rem; font-weight:bold; color:${color};">${formatBRL(mainTotal)}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${itemes.length} lançamento${itemes.length > 1 ? 's' : ''}</div>
      </div>`;

      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th style="text-align:right">Valor</th><th></th></tr></thead><tbody>`;
      
      let displayItems = itemes.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dB||0) - (dA||0);
      });

      if (isFav) {
         displayItems = displayItems.slice(0, 10);
      }

      displayItems.forEach(item => {
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || item.descricao || '-'}</td>
          <td style="color:var(--text-secondary);">${item.conta || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(Math.abs(item.valor))}</td><td style="text-align:center; cursor:pointer; width: 40px;" onclick="window.openEditTransactionModal('${item.cod}')"><i class="fas fa-pencil-alt" style="color:var(--text-muted); opacity: 0.75;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'"></i></td></tr>`;
      });
      html += `</tbody></table>`;

      if (isFav && itemes.length > 10) {
         html += `<div style="text-align:center; margin-top:10px; font-size:0.8rem; color:var(--text-muted);">Mostrando os últimos 10. Vá na aba Lançamentos para ver todos.</div>`;
      }

      showGlassModal(`Categoria: ${categoria}`, html);
    };

    function renderDashboardFavoriteChart(categoria) {
       const normalizeCat = (c) => (c || '').trim().toLowerCase();
       const normCat = normalizeCat(categoria).replace(/\s+/g, '-');
              const ctx = document.getElementById('favCatChart-' + normCat);
       if (!ctx) return;

       if (window.Chart && typeof Chart.getChart === 'function') {
           const existingChart = Chart.getChart(ctx);
           if (existingChart) existingChart.destroy();
       } else if (window.Chart) {
           Chart.helpers && Chart.helpers.each(Chart.instances, function(instance) {
               if (instance.chart.canvas.id === 'favCatChart-' + normCat) {
                   instance.destroy();
               }
           });
       }

       const orcObj = (dadosFinanceiros.orcamento || []).find(o => normalizeCat(o.categoria) === normalizeCat(categoria));
       const annualBudget = orcObj ? (Math.abs(parseFloat(orcObj.orcamento) || parseFloat(orcObj.valor_mensal) || 0)) : 0;
       const budget = annualBudget / 12;

       // Get last 7 months
       const now = new Date();
       const months = [];
       for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mStr = String(d.getMonth() + 1).padStart(2, '0');
          const yStr = d.getFullYear();
          months.push({
             key: `${mStr}/${yStr}`,
             label: getMonthLabel(`${mStr}/${yStr}`)
          });
       }

       // Calculate spent per month
       const spentData = [0, 0, 0, 0, 0, 0, 0];
       if (dadosFinanceiros && dadosFinanceiros.lancamentos) {
          dadosFinanceiros.lancamentos.forEach(l => {
             if (!l.data || l.valor >= 0) return;
             const cat = (l.categoria || '');
             if (normalizeCat(cat) === normalizeCat(categoria)) {
                const d = parseDateString(l.data || l.vencimento);
                if (d) {
                   const mKey = String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
                   const idx = months.findIndex(m => m.key === mKey);
                   if (idx !== -1) {
                      spentData[idx] += Math.abs(l.valor);
                   }
                }
             }
          });
       }

       const bgColors = spentData.map(spent => {
          if (budget === 0) return 'rgba(59, 130, 246, 0.7)'; // fallback blue
          const pct = (spent / budget) * 100;
          if (pct > 100) return 'rgba(239, 68, 68, 0.8)'; // Red
          if (pct >= 80) return 'rgba(234, 179, 8, 0.8)'; // Yellow
          return 'rgba(16, 185, 129, 0.8)'; // Green
       });

       new Chart(ctx, {
          type: 'bar',
          data: {
             labels: months.map(m => m.label),
             datasets: [{
                label: 'Gasto',
                data: spentData,
                backgroundColor: bgColors,
                borderRadius: 4
             }]
          },
          options: {
             responsive: true,
             maintainAspectRatio: false,
             plugins: {
                legend: { display: false },
                tooltip: {
                   callbacks: {
                      label: (ctx) => {
                         const val = ctx.raw;
                         let str = formatBRL(val);
                         if (budget > 0) {
                            str += ` (${((val/budget)*100).toFixed(1)}%)`;
                         }
                         return str;
                      }
                   }
                },
                annotation: budget > 0 ? {
                   annotations: {
                      line1: {
                         type: 'line',
                         yMin: budget,
                         yMax: budget,
                         borderColor: 'rgba(239, 68, 68, 0.7)',
                         borderWidth: 2,
                         borderDash: [4, 4],
                         label: {
                            display: false,
                            content: 'Orçamento: ' + formatBRL(budget),
                            position: 'end',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            font: { size: 10 }
                         }
                      }
                   }
                } : {}
             },
             scales: {
                x: {
                   grid: { color: 'rgba(255, 255, 255, 0.05)' },
                   ticks: { color: 'var(--text-muted)', font: { size: 10 } }
                },
                y: {
                   grid: { color: 'rgba(255, 255, 255, 0.05)' },
                   ticks: {
                      color: 'var(--text-muted)',
                      font: { size: 10 },
                      callback: (val) => 'R$ ' + val.toLocaleString('pt-BR')
                   },
                   beginAtZero: true
                }
             }
          }
       });
    }

    // NEW: Show extrato completo de uma conta
    window.showInvestmentsModal = function(type) {
      const period = getTabPeriod('investimentos');
      const filtered = getFilteredTransactions(period);
      
      const invAccountNames = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('investimento') || t.includes('aplicao') || t.includes('corretora');
      }).map(c => c.nome);

      const itemes = filtered.filter(l => {
        if (!invAccountNames.includes(l.conta)) return false;
        const cat = (l.categoria || '').trim().toLowerCase();
        const v = l.valor;
        if (cat === 'saldo inicial') return false;

        if (type === 'rendimentos') return (cat === 'rendimentos' || cat === 'outros');
        if (type === 'aportes') return (v > 0 && (cat === 'transferencia' || cat === 'proventos' || cat === 'transferencia'));
        if (type === 'resgates') return (v < 0 && (cat === 'transferencia' || cat === 'diversos' || cat === 'transferencia'));
        return false;
      });

      let title = type === 'rendimentos' ? 'Rendimento Líquido' : type === 'aportes' ? 'Aportes do Periodo' : 'Resgates do Periodo';

      if (itemes.length === 0) {
        showGlassModal(title, '<p style="color:var(--text-muted); text-align:center;">Nenhum lanamento encontrado para este tipo nao periodo.</p>');
        return;
      }

      itemes.sort((a,b) => (parseDateString(a.data)||0) - (parseDateString(b.data)||0));

      let total = 0;
      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${itemes.length} lanamento${itemes.length > 1 ? 's' : ''}</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Conta</th><th>Descricao</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:center; width:40px;"></th></tr></thead><tbody>`;

      itemes.forEach(item => {
        total += item.valor;
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        html += `<tr>
          <td style="color:var(--text-muted); font-size:0.85rem; white-space:nowrap;">${item.data}</td>
          <td style="font-size:0.85rem; color:var(--text-secondary);">${item.conta}</td>
          <td style="color:var(--text-primary); font-size:0.9rem;">${item.obs || item.descricao || '-'}</td>
          <td style="font-size:0.85rem;"><span class="badge" style="background:var(--bg-sidebar); border:1px solid var(--border-color); color:var(--text-secondary);">${item.categoria}</span></td>
          <td style="text-align:right; font-weight:600; color:${valColor};">${formatBRL(item.valor)}</td>
          <td style="text-align:center; cursor:pointer;" onclick="window.openEditTransactionModal('${item.cod}')"><i class="fas fa-pencil-alt" style="color:var(--text-muted); opacity: 0.75;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'"></i></td>
        </tr>`;
      });

      html += `</tbody><tfoot><tr><td colspan="4" style="text-align:right; font-weight:bold; color:var(--text-primary);">Total do Periodo</td><td style="text-align:right; font-weight:bold; font-size:1.1rem; color:${total >= 0 ? 'var(--color-income)' : 'var(--color-expense)'};">${formatBRL(total)}</td></tr></tfoot></table>`;

      showGlassModal(title, html);
    };

    window.showExtratoContaModal = function(nomeConta, period = 'all') {
      const filtered = getFilteredTransactions(period);
      const itemes = filtered.filter(l => (l.conta || '').toLowerCase().trim() === nomeConta.toLowerCase().trim());

      const contaObj = dadosFinanceiros.contas.find(c => (c.nome || c.conta || '').toLowerCase() === nomeConta.toLowerCase()) || {};
      let titleHtml = nomeConta;
      if (contaObj.conciliado_ate) {
        titleHtml += ` <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 10px;"><i class="fas fa-check-circle" style="color:var(--color-income);"></i> Conciliado até ${contaObj.conciliado_ate}</span>`;
      }

      if (itemes.length === 0) {
        showGlassModal(titleHtml, '<p style="color:var(--text-muted); text-align:center;">Nenhum lanamento encontrado para esta conta no periodo.</p>');
        return;
      }

      itemes.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dA||0) - (dB||0);
      });

      // Calcula o saldo cumulativo para TODOS os itens primeiro para ficar correto
      let saldoAcum = 0;
      itemes.forEach(item => {
        saldoAcum += item.valor;
        item._saldoAcum = saldoAcum;
      });

      // Limita aos 50 mais recentes
      const totalItens = itemes.length;
      let displayItemes = itemes;
      let warnHtml = '';
      if (totalItens > 50) {
        displayItemes = itemes.slice(-50); // Pega os ultimos 50 (mais recentes)
        warnHtml = `<div style="background: rgba(239,68,68,0.1); border-left: 3px solid var(--color-expense); padding: 0.8rem; border-radius: 4px; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.85rem;">
                      <i class="fas fa-exclamation-triangle" style="color: var(--color-expense); margin-right: 5px;"></i>
                      Exibindo os 50 lancamentos mais recentes para evitar lentido. Total nao periodo: ${totalItens}.
                    </div>`;
      }

      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${totalItens} lanamento${totalItens > 1 ? 's' : ''} nao periodo</div>`;
      html += warnHtml;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">Saldo</th><th style="text-align:center; width:60px;">Editar</th></tr></thead><tbody>`;

      // Exibe a ordem decrescente (mais recentes nao topo) para que o usuario veja os ultimos logo de cara
      displayItemes.reverse().forEach(item => {
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        const saldoClass = item._saldoAcum >= 0 ? 'extrato-saldo-pos' : 'extrato-saldo-neg';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || item.descricao || '-'}</td>
          <td style="color:var(--text-secondary); font-size:0.78rem;">${item.categoria || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(item.valor)}</td>
          <td style="text-align:right;" class="${saldoClass}">${formatBRL(item._saldoAcum)}</td><td style="text-align:center; cursor:pointer; width: 40px;" onclick="window.openEditTransactionModal('${item.cod}')"><i class="fas fa-pencil-alt" style="color:var(--text-muted); opacity: 0.75;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'"></i></td></tr>`;
      });
      html += `</tbody></table>`;
      showGlassModal(`Extrato: ${titleHtml}`, html);
    };

    // NEW: Show cartões de credito modal
    window.showCartãoesModal = function() {
      let total = 0;
      const cartões = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('credito') || t.includes('credito')) {
          total += c.saldo;
          return true;
        }
        return false;
      }).sort((a,b) => a.saldo - b.saldo);

      if (cartões.length === 0) {
        showGlassModal('Cartões de Credito', '<p style="color:var(--text-muted); text-align:center;">Nenhum cartão cadastrado.</p>');
        return;
      }

      const color = 'var(--color-expense)';
      let html = `<div style="margin-bottom:1.5rem; font-size:1.8rem; font-weight:bold; color:${color}; text-align:center;">${formatBRL(Math.abs(total))}</div>`;
      const maxVal = Math.max(...cartões.map(c => Math.abs(c.saldo)), 1);
      cartões.forEach(c => {
        const pct = (Math.abs(c.saldo) / maxVal * 100).toFixed(1);
        html += `
          <div class="bar-chart-row" style="cursor:pointer;" data-conta-extrato="${c.nome}">
            <div class="bar-chart-labels">
              <span style="color:var(--text-primary); font-weight:500;">${c.nome}</span>
              <span style="color:var(--text-muted);">${formatBRL(c.saldo)}</span>
            </div>
            <div class="bar-chart-bar-bg">
              <div class="bar-chart-bar-fill" style="width: ${pct}%; background: ${color}; animation: fillBar 1s ease-out forwards;"></div>
            </div>
          </div>
        `;
      });

      showGlassModal('Cartões de Credito', html);
      setTimeout(() => {
        document.querySelectorAll('[data-conta-extrato]').forEach(el => {
          el.addEventListener('click', () => window.showExtratoContaModal(el.dataset.contaExtrato));
        });
      }, 50);
    };

    // NEW: Show modal para fatura especifica
    window.showFaturaModal = function(nomeCartao, tipoPeriodo) {
      const isProx = tipoPeriodo === 'next';
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const itemes = dadosFinanceiros.lancamentos.filter(l => (l.conta || '').toLowerCase() === nomeCartao.toLowerCase());

      const faturaItems = itemes.filter(l => {
        const d = parseDateString(l.vencimento || l.data);
        if (!d) return false;
        const monthsDiff = (d.getFullYear() - currentYear) * 12 + (d.getMonth() - currentMonth);
        if (isProx) return monthsDiff === 1;
        return monthsDiff <= 0;
      });

      if (faturaItems.length === 0) {
        showGlassModal(`Fatura: ${nomeCartao}`, '<p style="color:var(--text-muted); text-align:center;">Nenhum lanamento encontrado nesta fatura.</p>');
        return;
      }

      faturaItems.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dA||0) - (dB||0);
      });

      let saldoAcum = 0;
      faturaItems.forEach(item => {
        saldoAcum += item.valor;
        item._saldoAcum = saldoAcum;
      });

      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${faturaItems.length} lanamento${faturaItems.length > 1 ? 's' : ''}</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">Saldo</th><th style="text-align:center; width:60px;">Editar</th></tr></thead><tbody>`;

      faturaItems.reverse().forEach(item => {
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        const saldoClass = item._saldoAcum >= 0 ? 'extrato-saldo-pos' : 'extrato-saldo-neg';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || item.descricao || '-'}</td>
          <td style="color:var(--text-secondary); font-size:0.78rem;">${item.categoria || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(item.valor)}</td>
          <td style="text-align:right;" class="${saldoClass}">${formatBRL(item._saldoAcum)}</td><td style="text-align:center; cursor:pointer; width: 40px;" onclick="window.openEditTransactionModal('${item.cod}')"><i class="fas fa-pencil-alt" style="color:var(--text-muted); opacity: 0.75;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-muted)'"></i></td></tr>`;
      });
      html += `</tbody></table>`;
      showGlassModal(`Fatura ${isProx ? 'Próxima' : 'Atual'}: ${nomeCartao}`, html);
    };

    // NEW: Show patrimnio total modal
    window.showConciliacaoModal = function() {
      const now = new Date();
      now.setHours(0,0,0,0);
      
      const contasComAtraso = [];
      dadosFinanceiros.contas.forEach(c => {
        let diffDays = 0;
        const dateStr = c.uultima_movimentacao || window.getLastTransactionDateForAccount(c.nome || c.conta);
        if (dateStr) {
          const d = parseDateString(dateStr);
          if (d) {
            d.setHours(0,0,0,0);
            diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            diffDays = 999;
          }
        } else {
           diffDays = 999; // Se nao tem data, assume o maior atraso possivel
        }
        contasComAtraso.push({ ...c, diffDays, displayDate: dateStr });
      });
      
      contasComAtraso.sort((a,b) => b.diffDays - a.diffDays);

      let html = `<div style="margin-bottom:1.5rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">Acompanhamento de Conciliação Bancária</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Conta</th><th>Data de Conciliação</th><th style="text-align:right">Status</th></tr></thead><tbody>`;

      contasComAtraso.forEach(item => {
        let atrasoText = '';
        let color = 'var(--text-primary)';
        if (item.diffDays === 999 || !item.displayDate) {
           atrasoText = 'Sem registro';
           color = 'var(--text-muted)';
        } else {
           atrasoText = `${item.diffDays} dia${item.diffDays !== 1 ? 's' : ''}`;
           if (item.diffDays > 60) color = 'var(--color-expense)';
           else if (item.diffDays > 30) color = '#eab308';
           else if (item.diffDays <= 10) color = 'var(--color-income)';
        }

        html += `<tr>
          <td style="color:var(--text-primary); font-weight:500;">${item.nome || item.conta || '-'}</td>
          <td style="color:var(--text-muted);">${item.displayDate || '-'}</td>
          <td style="text-align:right; font-weight:600; color:${color};">${atrasoText}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      
      showGlassModal('Status de Conciliao', html);
    };

    window.showPatrimonioModal = function() {
      let saldoCC = 0, saldoInv = 0, saldoCartãoes = 0;
      dadosFinanceiros.contas.forEach(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('credito') || t.includes('credito')) {
          saldoCartãoes += c.saldo;
        } else if (t.includes('investimento') || t.includes('aplicao') || t.includes('corretora')) {
          saldoInv += c.saldo;
        } else {
          saldoCC += c.saldo;
        }
      });
      const patrimonio = saldoCC + saldoInv + saldoCartãoes;

      let html = `<div style="text-align:center; margin-bottom:2rem;">
        <div style="font-size:2rem; font-weight:bold; background:linear-gradient(to right, var(--color-income), #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${formatBRL(patrimonio)}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">Patrimônio Líquido Total</div>
      </div>`;

      const components = [
        { label: 'Contas Correntes', value: saldoCC, color: 'var(--color-income)' },
        { label: 'Investimentos', value: saldoInv, color: '#8b5cf6' },
        { label: 'Cartões de Credito', value: saldoCartãoes, color: 'var(--color-expense)' }
      ];
      const maxComp = Math.max(...components.map(c => Math.abs(c.value)), 1);

      components.forEach(comp => {
        const pct = (Math.abs(comp.value) / maxComp * 100).toFixed(1);
        html += `
          <div class="bar-chart-row">
            <div class="bar-chart-labels">
              <span style="color:var(--text-primary); font-weight:500;">${comp.label}</span>
              <span style="font-weight:600; color:${comp.color};">${formatBRL(comp.value)}</span>
            </div>
            <div class="bar-chart-bar-bg">
              <div class="bar-chart-bar-fill" style="width: ${pct}%; background: ${comp.color}; animation: fillBar 1s ease-out forwards;"></div>
            </div>
          </div>
        `;
      });

      showGlassModal('Composição do Patrimônio', html);
    };

    window.showContasModal = function(type) {
      const isInv = type === 'inv';
      const color = isInv ? '#8b5cf6' : 'var(--color-income)';
      let total = 0;
      const itemes = dadosFinanceiros.contas.filter(c => {
        const cType = (c.tipo || '').toLowerCase();
        const isInvAccount = cType.includes('investimento') || cType.includes('aplicao') || cType.includes('corretora');
        if (isInv && isInvAccount) { total += c.saldo; return true; }
        if (!isInv && !isInvAccount && !cType.includes('cartão') && !cType.includes('credito')) { total += c.saldo; return true; }
        return false;
      }).sort((a,b) => b.saldo - a.saldo);

      if (itemes.length === 0) {
        showGlassModal(isInv ? 'Investimentos' : 'Contas Correntes', '<p style="color:var(--text-muted);">Nenhuma conta encontrada.</p>');
        return;
      }

      const maxAbs = Math.max(...itemes.map(c => Math.abs(c.saldo)), 1);
      let html = `<div style="margin-bottom:1.5rem; font-size:1.8rem; font-weight:bold; color:${color}; text-align:center;">${formatBRL(total)}</div>`;
      itemes.forEach(c => {
        const pct = c.saldo < 0 ? 0 : (Math.abs(c.saldo) / maxAbs * 100).toFixed(1);
        const barColor = c.saldo < 0 ? 'var(--color-expense)' : color;
        html += `
          <div class="bar-chart-row">
            <div class="bar-chart-labels">
              <span style="color:var(--text-primary); font-weight:500;">${c.nome}</span>
              <span style="color:${c.saldo < 0 ? 'var(--color-expense)' : 'var(--text-muted)'};">${formatBRL(c.saldo)}</span>
            </div>
            <div class="bar-chart-bar-bg">
              <div class="bar-chart-bar-fill" style="width: ${pct}%; background: ${barColor}; opacity: 0.9; animation: fillBar 1s ease-out forwards;"></div>
            </div>
          </div>
        `;
      });

      showGlassModal(isInv ? 'Relatrio de Investimentos' : 'Relatrio de Contas Correntes', html);
    };

    window.showAuditoriaModal = function() {
      const itemes = dadosFinanceiros.auditoria || [];
      if (itemes.length === 0) {
        showGlassModal('Auditoria', '<p style="color:var(--text-muted); text-align:center;">Tudo certo! Nenhuma pendncia encontrada. ?</p>');
        return;
      }
      let html = `<p style="margin-bottom:1rem; color:var(--text-muted);">Os seguintes itens precisam da sua ateno:</p>`;
      itemes.forEach(a => {
        html += `
          <div style="background:rgba(239, 68, 68, 0.05); border-left:4px solid var(--color-expense); padding:1rem; margin-bottom:1rem; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <div style="font-weight:600; color:var(--color-expense); margin-bottom:0.3rem;"><i class="fas fa-exclamation-triangle"></i> ${a.item}</div>
            <div style="font-size:0.95rem; color:var(--text-primary); margin-bottom:0.5rem;">${a.descricao}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
              <span>Responsvel: <b>${a.responsavel}</b></span>
              <span>Status: <b style="color:var(--color-expense)">${a.status}</b></span>
            </div>
          </div>
        `;
      });
      showGlassModal('Alertas de Auditoria', html);
    };

    window.goToImportacoes = function() {
      document.querySelectorAll('.nav-item').forEach(nav => {
        if (nav.dataset.target === 'imports') nav.click();
      });
    };
// Global Error Handler for Debugging Google Sites Limitations
    window.onerror = function(mesg, url, lineNo, columnNo, error) {
      const errHtml = `<div id="error-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#1e293b;padding:25px;border-radius:12px;border:2px solid #ef4444;max-width:500px;width:100%;">
          <h2 style="color:#ef4444;margin-top:0;margin-bottom:15px;display:flex;align-items:center;gap:10px;"><i class="fas fa-exclamation-triangle"></i> ERRO NO DASHBOARD!</h2>
          <p style="color:#cbd5e1;font-size:0.95rem;margin-bottom:15px;">Por favor, copie essa mensagem e mande para a IA consertar:</p>
          <textarea readonly style="width:100%;height:120px;background:#0f172a;color:#f8fafc;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;font-family:monospace;font-size:0.85rem;margin-bottom:20px;resize:none;">Mensagem: ${mesg}\nLinha: ${lineNo}\nColuna: ${columnNo}</textarea>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button onclick="document.querySelector('textarea').select(); document.execCommand('copy'); alert('Copiado!');" style="background:#3b82f6;color:white;border:none;padding:10px 15px;border-radius:6px;cursor:pointer;font-weight:600;"><i class="fas fa-copy"></i> Copiar Erro</button>
            <button onclick="document.getElementById('error-overlay').remove();" style="background:transparent;border:1px solid #475569;color:#cbd5e1;padding:10px 15px;border-radius:6px;cursor:pointer;">Fechar</button>
          </div>
        </div>
      </div>`;
      document.body.insertAdjacentHTML('beforeend', errHtml);
      return false;
    };

    // Configuraes do Feedback
    document.addEventListener('DOMContentLoaded', () => {
      const btnFeedback = document.getElementById('btnFeedback');
      const feedbackModal = document.getElementById('feedbackModal');
      const btnCloseFeedback = document.getElementById('btnCloseFeedback');
      const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
      const feedbackText = document.getElementById('feedbackText');
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwJThDsXgr1YkA6xf4feuv4cU8HUFGyU8qrLnqTzQdnMeNCNVK9CXK7eNL6u6vtB0kIHA/exec';

      if (btnFeedback) {
        btnFeedback.onclick = () => {
          feedbackModal.style.display = feedbackModal.style.display === 'none' ? 'block' : 'none';
        };
        
        btnCloseFeedback.onclick = () => {
          feedbackModal.style.display = 'none';
        }

        // Logica do Modal Translcido (Glassmorphism)
        const glassModal = document.getElementById('glassModal');
        const glassModalCloseBtn = document.getElementById('glassModalCloseBtn');
        
        if (glassModal && glassModalCloseBtn) {
          glassModalCloseBtn.addEventListener('click', () => {
            window.closeGlassModal();
          });
          
          glassModal.addEventListener('click', (event) => {
            if (event.target === glassModal) {
              window.closeGlassModal();
            }
          });
        }

        btnSubmitFeedback.onclick = async () => {
          const text = feedbackText.value.trim();
          if (!text) return;

          btnSubmitFeedback.innerText = 'Enviando...';
          btnSubmitFeedback.disabled = true;

          try {
            await fetch(APPS_SCRIPT_WEBAPP_URL, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify({
                action: 'sugestao',
                texto: text
              })
            });
            alert('Sugestão enviada com sucesso! Ela foi salva na aba SUGESTOES.');
            feedbackText.value = '';
            feedbackModal.style.display = 'none';
          } catch (e) {
            alert('Erro ao enviar sugestão: ' + e.message);
          } finally {
            btnSubmitFeedback.innerText = 'Enviar Sugestão';
            btnSubmitFeedback.disabled = false;
          }
        };
      }
    });
    function renderCreditCardsDashboard() {
      const dashboardEl = document.getElementById('credit-cards-dashboard');
      if (!dashboardEl) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalAtual = 0;
      let totalProxima = 0;
      let totalFuturo = 0;

      const labels6Meses = [];
      const dados6Meses = [0, 0, 0, 0, 0, 0];
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      for (let i = 0; i < 6; i++) {
        let m = currentMonth + i;
        let y = currentYear;
        if (m > 11) {
          m -= 12;
          y++;
        }
        labels6Meses.push(`${monthNames[m]}/${y.toString().slice(-2)}`);
      }

      const cartões = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('cart') || t.includes('credito') || t.includes('credito');
      });

      if (cartões.length === 0) {
        dashboardEl.innerHTML = '<p style="color:var(--text-muted);">Nenhum cartão de credito cadastrado.</p>';
        return;
      }

      let faturasAtual = [];
      let faturasProxima = [];

      cartões.forEach(c => {
        let faturaCardAtual = 0;
        let faturaCardProxima = 0;
        let diaVencimentoAtual = null;
        let diaVencimentoProxima = null;

        const lancamentosConta = dadosFinanceiros.lancamentos.filter(l => (l.conta || '').toLowerCase() === c.nome.toLowerCase());
        lancamentosConta.forEach(l => {
          const dateStr = l.vencimento || l.data;
          if (!dateStr) return;
          const d = parseDateString(dateStr);
          if (!d) return;

          const dM = d.getMonth();
          const dY = d.getFullYear();

          const monthsDiff = (dY - currentYear) * 12 + (dM - currentMonth);

          if (monthsDiff === 0) {
            totalAtual += l.valor;
            faturaCardAtual += l.valor;
            if (!diaVencimentoAtual) diaVencimentoAtual = d.getDate();
            dados6Meses[0] += Math.abs(l.valor);
          } else if (monthsDiff === 1) {
            totalProxima += l.valor;
            faturaCardProxima += l.valor;
            if (!diaVencimentoProxima) diaVencimentoProxima = d.getDate();
            dados6Meses[1] += Math.abs(l.valor);
          } else if (monthsDiff > 1) {
            totalFuturo += l.valor;
            if (monthsDiff < 6) {
              dados6Meses[monthsDiff] += Math.abs(l.valor);
            }
          }
        });

        if (faturaCardAtual !== 0) {
           faturasAtual.push({ nome: c.nome || c.conta || 'Cartão', dia: diaVencimentoAtual || 1, valor: faturaCardAtual });
        }
        if (faturaCardProxima !== 0) {
           faturasProxima.push({ nome: c.nome || c.conta || 'Cartão', dia: diaVencimentoProxima || 1, valor: faturaCardProxima });
        }
      });

      faturasAtual.sort((a, b) => a.dia - b.dia);
      faturasProxima.sort((a, b) => a.dia - b.dia);

      const renderFaturasList = (list) => {
        if (list.length === 0) return '<div style="color:var(--text-muted); font-size:0.75rem; margin-top:0.5rem;">Sem faturas</div>';
        return '<div style="margin-top:0.8rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.5rem;">' + list.map(f => `
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.3rem;">
            <span style="color:var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 65%;"><span style="color:var(--text-muted); margin-right:4px;">Dia ${String(f.dia).padStart(2, '0')}</span> ${f.nome}</span>
            <span style="color:${f.valor < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(f.valor)}</span>
          </div>
        `).join('') + '</div>';
      };

      let html = `
        <div class="metrics-grid" style="margin-bottom: 2rem; align-itemes: stretch;">
          <div class="card bg-card" style="display:flex; flex-direction:column;">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Fatura do Ms Atual</div>
            <div style="font-size:1.8rem; font-weight:700; color:${totalAtual < 0 ? 'var(--color-expense)' : 'var(--text-primary)'};">${formatBRL(totalAtual)}</div>
            <div style="margin-top:auto;">${renderFaturasList(faturasAtual)}</div>
          </div>
          <div class="card bg-card" style="display:flex; flex-direction:column;">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Proximo Ms</div>
            <div style="font-size:1.8rem; font-weight:700; color:${totalProxima < 0 ? 'var(--color-expense)' : 'var(--text-primary)'};">${formatBRL(totalProxima)}</div>
            <div style="margin-top:auto;">${renderFaturasList(faturasProxima)}</div>
          </div>
          <div class="card bg-card" style="display:flex; flex-direction:column;">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Faturas Futuras (+2 meses)</div>
            <div style="font-size:1.8rem; font-weight:700; color:${totalFuturo < 0 ? 'var(--color-expense)' : 'var(--text-primary)'};">${formatBRL(totalFuturo)}</div>
          </div>
        </div>
      `;

      html += `
        <div class="card charts-container" style="margin-bottom: 2rem;">
          <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem;">Projeo de Faturas (Proximos 6 Meses)</h3>
          <div style="height: 250px; position: relative;">
            <canvas id="creditCardsProjectionChart"></canvas>
          </div>
        </div>
      `;

      html += `<h3 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 1rem;">Meus Cartões</h3>`;
      html += `<div class="accounts-grid" id="credit-cards-list-container">`;
      
      const iconCC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>';

      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 11) { nextMonth = 0; nextYear++; }

      cartões.forEach(c => {
        const cName = c.nome || c.conta || 'Cartão';
        
        let faturaAtualCC = 0;
        let faturaProximaCC = 0;
        
        const lancamentosConta = dadosFinanceiros.lancamentos.filter(l => (l.conta || '').toLowerCase() === c.nome.toLowerCase());
        lancamentosConta.forEach(l => {
           const dateStr = l.vencimento || l.data; 
           if (!dateStr) return;
           const d = parseDateString(dateStr);
           if (!d) return;
           if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) { faturaAtualCC += l.valor; } 
           else if (d.getMonth() === nextMonth && d.getFullYear() === nextYear) { faturaProximaCC += l.valor; }
        });

        html += `
          <div class="card expense-card clickable-card" data-conta-name="${cName}" style="cursor:pointer; border-top: 3px solid var(--color-expense);">
            <div class="card-header">
              <span>${cName}</span>
              <div class="card-icon">${iconCC}</div>
            </div>
            <div class="card-value" style="font-size:1.6rem;">${formatBRL(c.saldo)}</div>
            
            <div style="display:flex; justify-content:space-between; margin-top:0.8rem; font-size:0.75rem; background: rgba(0,0,0,0.15); padding: 0.5rem; border-radius: 6px;">
              <div>
                <div style="color:var(--text-muted); font-size:0.65rem;">Última Fechada</div>
                <div style="color:${faturaAtualCC < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaAtualCC)}</div>
              </div>
              <div style="text-align:right;">
                <div style="color:var(--text-muted); font-size:0.65rem;">Projeção Próxima</div>
                <div style="color:${faturaProximaCC < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaProximaCC)}</div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-itemes:center; margin-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
              <div class="card-trend" style="color:var(--text-muted); font-size:0.75rem;">Clique para ver extrato</div>
              ${c.uultima_movimentacao ? `<div style="font-size: 0.75rem; font-weight:600; color: ${getDateColor(c.uultima_movimentacao)};"><i class="fas fa-history" style="margin-right: 3px;"></i>${c.uultima_movimentacao}</div>` : ''}
            </div>
          </div>
        `;
      });

      html += `</div>`;
      dashboardEl.innerHTML = html;

      setTimeout(() => {
        const listContainer = document.getElementById('credit-cards-list-container');
        if (listContainer) {
          listContainer.querySelectorAll('[data-conta-name]').forEach(card => {
            card.addEventListener('click', () => {
              window.showExtratoContaModal(card.dataset.contaName);
            });
          });
        }

        const ctx = document.getElementById('creditCardsProjectionChart');
        if (ctx) {
          if (window.creditCardsChartInstance) {
            window.creditCardsChartInstance.destroy();
          }
          window.creditCardsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels6Meses,
              datasets: [{
                label: 'Fatura Projetada',
                data: dados6Meses,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function(context) { return formatBRL(-context.raw); }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(255, 255, 255, 0.05)' },
                  ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                x: {
                  grid: { display: false },
                  ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
              }
            }
          });
        }
      }, 50);
    }

// ==========================================
    // Logica do COPILOT FINANCEIRO (Chat IA)
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
      const btnChatSend = document.getElementById('btn-chat-send');
      const chatInput = document.getElementById('chat-input');
      const chatMessages = document.getElementById('chat-messages');
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwJThDsXgr1YkA6xf4feuv4cU8HUFGyU8qrLnqTzQdnMeNCNVK9CXK7eNL6u6vtB0kIHA/exec';
      
      let historicoChat = [];

      function addMessage(text, isUser = false) {
        const div = document.createElement('div');
        div.style.padding = '0.85rem 1.1rem';
        div.style.borderRadius = '12px';
        div.style.maxWidth = '90%';
        div.style.marginBottom = '1rem';
        div.style.fontSize = '0.9rem';
        div.style.lineHeight = '1.4';
        
        if (isUser) {
          div.style.background = 'rgba(255, 255, 255, 0.1)';
          div.style.color = '#fff';
          div.style.alignSelf = 'flex-end';
          div.style.borderBottomRightRadius = '2px';
        } else {
          div.style.background = 'rgba(59, 130, 246, 0.15)';
          div.style.color = '#fff';
          div.style.alignSelf = 'flex-start';
          div.style.borderBottomLeftRadius = '2px';
          div.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        }
        
        div.innerHTML = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      async function enviarMensagemCopilot() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        historicoChat.push({ role: 'user', content: text });
        chatInput.value = '';
        
        btnChatSend.disabled = true;
        btnChatSend.innerText = '...';

        // Tabela atual (estado global do Dashboard)
        // Adicionando um ID/Index para a IA referenciar
        const tabelaAtual = (dadosFinanceiros && dadosFinanceiros.importacoes) ? 
          dadosFinanceiros.importacoes.map((item, idx) => ({ index: idx, ...item })) : [];

        try {
          const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
              action: 'chat',
              mensagem: text,
              tabela: tabelaAtual,
              historicoChat: historicoChat
            })
          });
          
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            const respostaIA = result.data;
            
            // Adiciona a resposta da IA nao chat
            addMessage(respostaIA.mensagem, false);
            historicoChat.push({ role: 'assistant', content: respostaIA.mensagem });
            
            // Aplica as alteracoes na tabela global
            if (respostaIA.alteracoes && Array.isArray(respostaIA.alteracoes)) {
              let changed = false;
              respostaIA.alteracoes.forEach(alt => {
                try {
                  const idx = parseInt(alt.index);
                  if (!isNaN(idx) && dadosFinanceiros.importacoes[idx]) {
                    if (alt.categoria !== undefined) dadosFinanceiros.importacoes[idx].categoria = alt.categoria;
                    if (alt.subcategoria !== undefined) dadosFinanceiros.importacoes[idx].subcategoria = alt.subcategoria;
                    if (alt.conta !== undefined) dadosFinanceiros.importacoes[idx].conta = alt.conta;
                    if (alt.favorecido !== undefined) dadosFinanceiros.importacoes[idx].favorecido = alt.favorecido;
                    changed = true;
                  }
                } catch(e) { console.error("Erro ao aplicar alteracao:", e); }
              });
              
            }
          } else {
            addMessage("Desculpe, ocorreu um erro do servidor: " + (result.message || "Tente novamente."), false);
          }
        } catch (error) {
          addMessage("Erro internao do painel: " + error.message, false);
          console.error(error);
        } finally {
          btnChatSend.disabled = false;
          btnChatSend.innerText = 'Enviar';
        }
      }

      if (btnChatSend) {
        btnChatSend.addEventListener('click', enviarMensagemCopilot);
      }
      
      if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') enviarMensagemCopilot();
        });
      }
      
      // --- GERENCIADOR DE CONFIGURAES (CATEGORIAS E CONTAS) ---
      
      window.renderEditCategories = function() {
        const container = document.getElementById('categories-editor-container');
        if (!container) return;
        
        if (!window.editCategorias) {
          window.editCategorias = JSON.parse(JSON.stringify(window.dicionarioGeral || {}));
        }
        
        let html = '';
        Object.keys(window.editCategorias).forEach(cat => {
          html += `<div style="min-width: 250px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-itemes: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 1rem;">
              <input type="text" value="${cat}" onchange="window.renameCategory('${cat}', this.value)" style="background:transparent; border:none; color:var(--text-primary); font-weight:bold; font-size:1.1rem; width:80%;">
              <button onclick="window.removeCategory('${cat}')" style="background:transparent; border:none; color:var(--color-expense); cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0; display:flex; flex-direction:column; gap:0.5rem;">`;
            
          window.editCategorias[cat].forEach((sub, idx) => {
            html += `<li style="display: flex; justify-content: space-between; align-itemes: center; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px;">
              <input type="text" value="${sub}" onchange="window.renameSubcategory('${cat}', ${idx}, this.value)" style="background:transparent; border:none; color:var(--text-secondary); width:80%;">
              <button onclick="window.removeSubcategory('${cat}', ${idx})" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-times"></i></button>
            </li>`;
          });
          
          html += `</ul>
            <div style="margin-top: 1rem; display:flex; gap:0.5rem;">
              <input type="text" id="new-sub-${cat.replace(/\s+/g, '')}" placeholder="Nova sub..." style="width: 100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); padding:0.5rem; border-radius:4px;">
              <button onclick="window.addSubcategory('${cat}')" class="btn btn-secondary" style="padding:0.5rem;"><i class="fas fa-plus"></i></button>
            </div>
          </div>`;
        });
        
        html += `<div style="min-width: 250px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 1rem; display:flex; flex-direction:column; justify-content:center; align-itemes:center; gap:1rem;">
          <input type="text" id="new-cat-input" placeholder="Nova Categoria..." style="width: 100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); padding:0.8rem; border-radius:4px; text-align:center;">
          <button onclick="window.addCategory()" class="btn btn-primary" style="width:100%;"><i class="fas fa-plus"></i> Adicionar</button>
        </div>`;
        
        container.innerHTML = html;
      };

      window.renderEditAccounts = function() {
        const list = document.getElementById('accounts-editor-list');
        if (!list) return;
        
        if (!window.editContas) {
          window.editContas = JSON.parse(JSON.stringify((typeof dadosFinanceiros !== 'undefined' ? dadosFinanceiros.contas : null) || window.contasAtivas || []));
        }
        
        list.innerHTML = window.editContas.map((c, idx) => `
          <li style="display: flex; justify-content: space-between; align-itemes: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 6px;">
            <div style="display:flex; align-itemes:center; gap:1rem; flex:1;">
              <i class="fas fa-wallet" style="color:var(--color-income);"></i>
              <div style="display:flex; flex-direction:column; flex:1;">
                <input type="text" value="${c.nome}" onchange="window.renameAccount(${idx}, this.value)" style="background:transparent; border:none; color:var(--text-primary); font-size:1rem; width:80%;">
                ${c.conciliado_ate ? `<span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; opacity: 0.7;"><i class="fas fa-check-circle" style="font-size: 0.7rem; color: var(--color-income);"></i> Conciliado até ${c.conciliado_ate}</span>` : ''}
              </div>
            </div>
            <button onclick="window.removeAccount(${idx})" style="background:transparent; border:none; color:var(--color-expense); cursor:pointer;"><i class="fas fa-trash"></i></button>
          </li>
        `).join('');
      };

      window.renameCategory = function(oldName, newName) {
        if (!newName.trim() || oldName === newName) return;
        window.editCategorias[newName] = window.editCategorias[oldName];
        delete window.editCategorias[oldName];
        window.renderEditCategories();
      };
      window.removeCategory = function(cat) {
        if (confirm('Excluir a categoria ' + cat + ' e todas as suas subcategorias?')) {
          delete window.editCategorias[cat];
          window.renderEditCategories();
        }
      };
      window.addCategory = function() {
        const val = document.getElementById('new-cat-input').value.trim();
        if (val && !window.editCategorias[val]) {
          window.editCategorias[val] = [];
          window.renderEditCategories();
        }
      };
      window.renameSubcategory = function(cat, idx, newName) {
        if (newName.trim()) window.editCategorias[cat][idx] = newName.trim();
        window.renderEditCategories();
      };
      window.removeSubcategory = function(cat, idx) {
        window.editCategorias[cat].splice(idx, 1);
        window.renderEditCategories();
      };
      window.addSubcategory = function(cat) {
        const input = document.getElementById('new-sub-' + cat.replace(/\\s+/g, ''));
        if (input && input.value.trim()) {
          window.editCategorias[cat].push(input.value.trim());
          window.renderEditCategories();
        }
      };
      
      window.renameAccount = function(idx, newName) {
        if (newName.trim()) window.editContas[idx].nome = newName.trim();
        window.renderEditAccounts();
      };
      window.removeAccount = function(idx) {
        if (confirm("Excluir esta conta?")) {
          window.editContas.splice(idx, 1);
          window.renderEditAccounts();
        }
      };
      window.addContaConfig = function() {
        const val = document.getElementById('new-account-input').value.trim();
        if (val) {
          window.editContas.push({nome: val});
          document.getElementById('new-account-input').value = '';
          window.renderEditAccounts();
        }
      };

      window.saveConfigsToServer = async function() {
        if (!confirm("Isso ir sobrescrever as abas CATEGORIAS e CONTAS na sua planilha. Continuar?")) return;
        
        const catKeys = Object.keys(window.editCategorias);
        let maxLen = 0;
        catKeys.forEach(k => { if(window.editCategorias[k].length > maxLen) maxLen = window.editCategorias[k].length; });
        
        const cat2D = [];
        cat2D.push(catKeys);
        for (let i = 0; i < maxLen; i++) {
          const row = [];
          catKeys.forEach(k => {
             row.push(window.editCategorias[k][i] || "");
          });
          cat2D.push(row);
        }
        
        const contas2D = [["Contas"]];
        window.editContas.forEach(c => contas2D.push([c.nome]));
        
        const btnHtml = event.currentTarget.innerHTML;
        const btnEl = event.currentTarget;
        btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        try {
          const response = await fetch(APPS_SCRIPT_WEBAPP_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'salvar_configs',
              categorias: cat2D,
              contas: contas2D
            })
          });
          const result = await response.json();
          if (result.status === 'success') {
            alert("Configuraes salvas com sucesso!");
            window.dicionarioGeral = window.editCategorias;
            window.contasAtivas = window.editContas;
          } else {
            alert("Erro: " + result.message);
          }
        } catch(e) {
          alert("Erro na conexao: " + e.message);
        }
        btnEl.innerHTML = btnHtml;
      };

      document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => {
          if (el.dataset.target === 'panel-categories') window.renderEditCategories();
          if (el.dataset.target === 'panel-accounts-edit') window.renderEditAccounts();
        });
      });
      
    });

window.openEditTransactionModal = function(cod) {
  const t = dadosFinanceiros.lancamentos.find(l => l.cod == cod);
  if(!t) return;
  document.getElementById('edit-tx-id').value = t.cod;
  document.getElementById('edit-tx-original-data').value = t.data;
  document.getElementById('edit-tx-original-valor').value = t.valor;

  let dateVal = '';
  if(t.data) {
    const parts = t.data.split('/');
    if(parts.length === 3) dateVal = parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  document.getElementById('edit-tx-data').value = dateVal;

  const contaSelect = document.getElementById('edit-tx-conta');
  contaSelect.innerHTML = '';
  dadosFinanceiros.contas.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nome; opt.textContent = c.nome;
    if(c.nome === t.conta) opt.selected = true;
    contaSelect.appendChild(opt);
  });

  document.getElementById('edit-tx-valor').value = Math.abs(t.valor).toFixed(2).replace('.', ',');
  document.getElementById('edit-tx-obs').value = t.obs || t.descricao || '';

  const catSelect = document.getElementById('edit-tx-categoria');
  catSelect.innerHTML = '';
  Object.keys(window.dicionarioGeral || window.dadosFinanceiros.categoriasDict).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    if(c.toLowerCase() === (t.categoria||'').toLowerCase()) opt.selected = true;
    catSelect.appendChild(opt);
  });

  const subSelect = document.getElementById('edit-tx-subcategoria');
  const updateSubcats = () => {
    subSelect.innerHTML = '<option value="">Sem Subcategoria</option>';
    const cat = catSelect.value;
    const dict = window.dicionarioGeral || window.dadosFinanceiros.categoriasDict;
    if(dict[cat]) {
      dict[cat].forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub; opt.textContent = sub;
        if(sub.toLowerCase() === (t.subcategoria||'').toLowerCase()) opt.selected = true;
        subSelect.appendChild(opt);
      });
    }
  };
  updateSubcats();
  catSelect.onchange = () => {
    updateSubcats();
    checkTransfer();
  };

  const transferBlock = document.getElementById('edit-tx-transfer-block');
  const checkTransfer = () => {
    if(catSelect.value.toLowerCase().includes('transfer')) {
      transferBlock.style.display = 'block';
    } else {
      transferBlock.style.display = 'none';
      document.getElementById('edit-tx-create-contrapartida').checked = false;
    }
  };
  checkTransfer();

  const contrapartidaDestBlock = document.getElementById('edit-tx-contrapartida-dest-block');
  const cbContra = document.getElementById('edit-tx-create-contrapartida');
  cbContra.onchange = () => {
    contrapartidaDestBlock.style.display = cbContra.checked ? 'block' : 'none';
  };
  cbContra.checked = false;
  contrapartidaDestBlock.style.display = 'none';

  const destContaSelect = document.getElementById('edit-tx-contrapartida-conta');
  destContaSelect.innerHTML = '';
  dadosFinanceiros.contas.forEach(c => {
    if(c.nome !== t.conta) {
      const opt = document.createElement('option');
      opt.value = c.nome; opt.textContent = c.nome;
      destContaSelect.appendChild(opt);
    }
  });

  const isConciliado = t.conciliado === true;
  document.getElementById('edit-tx-data').disabled = isConciliado;
  document.getElementById('edit-tx-conta').disabled = isConciliado;
  document.getElementById('edit-tx-valor').disabled = isConciliado;
  document.getElementById('edit-tx-obs').disabled = isConciliado;
  document.getElementById('edit-tx-create-contrapartida').disabled = isConciliado;

  document.getElementById('editTransactionModal').classList.add('active');
};

document.getElementById('edit-tx-cancel')?.addEventListener('click', () => {
  document.getElementById('editTransactionModal').classList.remove('active');
});

document.getElementById('edit-tx-save')?.addEventListener('click', () => {
  const id = document.getElementById('edit-tx-id').value;
  const origData = document.getElementById('edit-tx-original-data').value;
  const origValor = parseFloat(document.getElementById('edit-tx-original-valor').value);
  
  const dVal = document.getElementById('edit-tx-data').value;
  let newDataStr = origData;
  if(dVal) {
    const parts = dVal.split('-');
    newDataStr = parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  const rawVal = document.getElementById('edit-tx-valor').value.replace('.', '').replace(',', '.');
  let newVal = parseFloat(rawVal);
  if(isNaN(newVal)) {
    alert('Valor inválido!');
    return;
  }
  
  const selectedCat = document.getElementById('edit-tx-categoria').value;
  if (!selectedCat.toLowerCase().includes('transfer')) {
     const isExpense = origValor < 0;
     if(isExpense) newVal = -Math.abs(newVal);
     else newVal = Math.abs(newVal);
  } else {
     newVal = -Math.abs(newVal); 
  }

  if (newDataStr !== origData || Math.abs(newVal) !== Math.abs(origValor)) {
    if(!confirm('Você está alterando a Data ou o Valor desta transação. Isso pode afetar a conciliação do seu extrato. Tem certeza?')) {
      return;
    }
  }

  const payload = {
    action: 'editar_lancamento',
    cod: id,
    novaData: newDataStr,
    novaConta: document.getElementById('edit-tx-conta').value,
    novoValor: newVal,
    novaCategoria: selectedCat,
    novaSubcategoria: document.getElementById('edit-tx-subcategoria').value,
    novaObs: document.getElementById('edit-tx-obs').value
  };

  const createContra = document.getElementById('edit-tx-create-contrapartida').checked;
  if(createContra) {
    payload.contraPartida = {
      data: newDataStr,
      conta: document.getElementById('edit-tx-contrapartida-conta').value,
      valor: Math.abs(newVal),
      categoria: selectedCat,
      subcategoria: payload.novaSubcategoria,
      obs: payload.novaObs + ' (Entrada de Transferência)'
    };
  }

  const btn = document.getElementById('edit-tx-save');
  const origText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  let savePromise;
  if (window.USE_FIREBASE) {
     savePromise = window.DB.editarLancamento(payload.cod, {
         data: payload.novaData,
         conta: payload.novaConta,
         valor: payload.novoValor,
         categoria: payload.novaCategoria,
         subcategoria: payload.novaSubcategoria,
         obs: payload.novaObs
     }).then(() => {
         if (payload.contraPartida) {
             return window.DB.sincronizarPeriodo([payload.contraPartida], [], null, null);
         }
     });
  } else {
      savePromise = fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  }

  savePromise.then(() => {
    const tx = dadosFinanceiros.lancamentos.find(l => l.cod == id);
    if(tx) {
      tx.data = payload.novaData;
      tx.conta = payload.novaConta;
      tx.valor = payload.novoValor;
      tx.categoria = payload.novaCategoria;
      tx.subcategoria = payload.novaSubcategoria;
      tx.obs = payload.novaObs;
    }
    if(payload.contraPartida) {
      const maxId = Math.max(...dadosFinanceiros.lancamentos.map(l => parseInt(l.cod) || 0));
      dadosFinanceiros.lancamentos.push({
        cod: maxId + 1,
        data: payload.contraPartida.data,
        vencimento: '',
        conta: payload.contraPartida.conta,
        obs: payload.contraPartida.obs,
        valor: payload.contraPartida.valor,
        categoria: payload.contraPartida.categoria,
        subcategoria: payload.contraPartida.subcategoria
      });
    }
    
    alert('Lançamento atualizado com sucesso!');
    document.getElementById('editTransactionModal').classList.remove('active');
    
    if (typeof processRawData === 'function') {
      processRawData(dadosFinanceiros.lancamentos);
      const activeNav = document.querySelector('.nav-item.active');
      if (activeNav) activeNav.click(); 
    }
  }).catch(err => {
    alert('Erro ao salvar: ' + err);
  }).finally(() => {
    btn.innerHTML = origText;
    btn.disabled = false;
  });
});













