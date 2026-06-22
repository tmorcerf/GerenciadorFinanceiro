// Mobile Iframe Bypass
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  const mobileLink = document.createElement('link');
  mobileLink.rel = 'stylesheet';
  mobileLink.href = 'mobile.css?v=' + new Date().getTime();
  document.head.appendChild(mobileLink);
  document.documentElement.classList.add('mobile-mode');
}

// Error Handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      alert("ERRO NO DASHBOARD!\n\nMensagem: " + msg + "\nLinha: " + lineNo + "\nColuna: " + columnNo + "\n\nCopie essa mensagem e mande para a IA!");
      return false;
    };
    // ==========================================
    // CONFIGURAÇÃO DOS LINKS DO GOOGLE SHEETS
    // ==========================================
    
    // VARIÁVEIS DE PRODUÇÃO (Seu painel intocável do dia a dia)
    let CSV_URL_LANCAMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=0';
    let CSV_URL_ORCAMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1770446607';
    let CSV_URL_CONTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1019128251';
    let CSV_URL_AUDITORIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=279877792';
    let CSV_URL_IMPORTACOES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1791414224';
    let APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxr9YewljAU2MF9uZoV52tGVEZwFMaOD_Iyg7bxsekE8-RI4a0_8giiMbqzc_bYNDZxSQ/exec';
    
    // INTERRUPTOR DE AMBIENTES (Staging vs Production)
    const isTestEnv = window.location.search.includes('teste=true');
    
    if (isTestEnv) {
      console.warn("⚠️ AVISO: MODO DE TESTES ATIVADO. CONECTADO AO BANCO DE DADOS LAB.");
      CSV_URL_LANCAMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyhAHH1P-kzmoVyuhI9syJ-xnG5SbYrC_dHpSQFQCsfiBOBQHeZnR7EvdIaHUoKV0JqjCf1lgX3t9/pub?gid=0&single=true&output=csv';
      CSV_URL_ORCAMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyhAHH1P-kzmoVyuhI9syJ-xnG5SbYrC_dHpSQFQCsfiBOBQHeZnR7EvdIaHUoKV0JqjCf1lgX3t9/pub?gid=1706980119&single=true&output=csv';
      CSV_URL_CONTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyhAHH1P-kzmoVyuhI9syJ-xnG5SbYrC_dHpSQFQCsfiBOBQHeZnR7EvdIaHUoKV0JqjCf1lgX3t9/pub?gid=1748033613&single=true&output=csv';
      CSV_URL_AUDITORIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyhAHH1P-kzmoVyuhI9syJ-xnG5SbYrC_dHpSQFQCsfiBOBQHeZnR7EvdIaHUoKV0JqjCf1lgX3t9/pub?gid=2078075619&single=true&output=csv';
      CSV_URL_IMPORTACOES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyyhAHH1P-kzmoVyuhI9syJ-xnG5SbYrC_dHpSQFQCsfiBOBQHeZnR7EvdIaHUoKV0JqjCf1lgX3t9/pub?gid=0&single=true&output=csv'; // Fallback na aba 0 se não existir
      APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxr9YewljAU2MF9uZoV52tGVEZwFMaOD_Iyg7bxsekE8-RI4a0_8giiMbqzc_bYNDZxSQ/exec';
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
    const rowsPerPage = 15;

    let monthlyChart = null;
    let categoryChart = null;
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
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
            <p style="margin-bottom:1rem; font-weight:600; color:var(--text-primary);">Configuração do Google Planilhas Necessária</p>
            <p style="font-size:0.9rem; margin-bottom:1rem; line-height:1.4;">Para exibir seus dados online, você precisa publicar as abas da sua Planilha Google na Web como CSV e colar as URLs no código deste painel.</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Edite este arquivo HTML e substitua as variáveis <b>CSV_URL_LANCAMENTOS</b>, <b>CSV_URL_ORCAMENTO</b> e <b>CSV_URL_CONTAS</b>.</p>
          </div>
        `;
        document.querySelector('.spinner').style.display = 'none';
        return false;
      }

      try {
        const [resLanc, resOrc, resContas, resAudit, resImports] = await Promise.all([
          fetch(CSV_URL_LANCAMENTOS).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Lançamentos');
            return r.text();
          }),
          fetch(CSV_URL_ORCAMENTO).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Orçamentos');
            return r.text();
          }),
          fetch(CSV_URL_CONTAS).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Contas');
            return r.text();
          }),
          fetch(CSV_URL_AUDITORIA).then(r => {
            if(!r.ok) throw new Error('Falha ao acessar Auditoria');
            return r.text();
          }),
          fetch(CSV_URL_IMPORTACOES).then(r => {
            if(!r.ok) return ''; // Importações pode estar vazia/inexistente temporariamente
            return r.text();
          }).catch(() => '')
        ]);

        // Parse CSVs (trim headers to avoid whitespace mismatches)
        const parseOpts = { header: true, skipEmptyLines: true, transformHeader: h => h.trim() };
        const parsedLanc = Papa.parse(resLanc, parseOpts).data;
        const parsedOrc = Papa.parse(resOrc, parseOpts).data;
        const parsedContas = Papa.parse(resContas, parseOpts).data;

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

        dadosFinanceiros.contas = parsedContas.map(c => ({
          cod: c['COD'] || '',
          nome: c['Nome da Conta'] || '',
          instituicao: c['Instituição Financeira'] || '',
          tipo: c['Tipo de conta'] || '',
          saldo_inicial: parseBrlFloat(c['Saldo inicial']),
          saldo: parseBrlFloat(c['Saldo atual'] || c['Saldo']),
          conciliado_ate: c['Conciliado até'] || '',
          saldo_lancado: parseBrlFloat(c['Saldo lançado']),
          saldo_apurado: parseBrlFloat(c['Saldo Apurado']),
          ultima_movimentacao: c['Data da última movimentação'] || c['Última Movimentação'] || c['Data última mov.'] || c['Ultima mov'] || c['Data da ultima movimentacao'] || c['Conciliado até'] || c['Conciliado ate'] || ''
        })).filter(c => c.nome !== '');

        dadosFinanceiros.orcamento = parsedOrc.map(o => ({
          categoria: o['Categorias'] || '',
          inicio: o['Inicio'] || '',
          fim: o['Fim'] || '',
          orcamento: parseBrlFloat(o['Orçamento']),
          realizado: parseBrlFloat(o['Realizado até hoje']),
          desvio: parseFloat((o['DESVIO'] || '0').replace('%', '').replace(',', '.')) || 0,
          sobra: parseBrlFloat(o['Sobra']),
          ideal: parseBrlFloat(o['Orçamento Ideal'])
        })).filter(o => o.categoria !== '');

        const parsedAudit = Papa.parse(resAudit, parseOpts).data;
        dadosFinanceiros.auditoria = parsedAudit.map(a => ({
          conferencia: a['CONFERENCIA'] || '',
          status: (a['STATUS'] || '').trim(),
          resultado: a['RESULTADO'] || '',
          descricao: a['DESCRIÇÃO'] || a['DESCRICAO'] || ''
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
        console.error('Erro na sincronização:', err);
        document.querySelector('#loading-screen div:last-child').innerHTML = `
          <div style="text-align: center; color: var(--color-expense);">
            <p style="font-weight:600; margin-bottom:0.5rem;">Erro de Sincronização</p>
            <p style="font-size:0.9rem; color:var(--text-secondary); max-width:400px; line-height:1.4;">${err.message}. Verifique os links de publicação do Sheets e se o compartilhamento na Web está ativo.</p>
          </div>
        `;
        document.querySelector('.spinner').style.display = 'none';
        return false;
      }
    }

    function showAILoadingModal(fileName) {
      const msgs = [
        "A IA está cruzando dados para categorizar suas compras...",
        "Assustado com esse lançamento aqui... 😱",
        "Hummm.... analisando possível compra supérflua... 🍔",
        "Ensinando matemática financeira pro robô... 🧮",
        "Procurando onde foi parar o seu dinheiro... 🕵️‍♂️",
        "Escondendo essa fatura de você sabe quem... 🤫",
        "Invocando os deuses da contabilidade... ⚡",
        "Quase lá! O robô só parou pra tomar um cafézinho... ☕"
      ];

      showGlassModal('Processando Extrato', `
        <div style="text-align:center; padding: 3rem 1rem;">
          <i class="fas fa-robot fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
          <h3 style="color: var(--text-primary); margin-bottom:0.5rem;">Analisando ${fileName}...</h3>
          <p id="funny-loading-msg" style="color: var(--text-secondary); font-size: 1.1rem; height: 3rem; display: flex; align-items: center; justify-content: center; font-style: italic;">${msgs[0]}</p>
        </div>
      `);

      let i = 1;
      return setInterval(() => {
        const p = document.getElementById('funny-loading-msg');
        if (p) {
          p.innerText = msgs[i % msgs.length];
          i++;
        }
      }, 10000);
    }

    function hideAILoadingModal(intervalId) {
      if (intervalId) clearInterval(intervalId);
      closeGlassModal();
    }

    // Função processarExtratoComIA substituída pela lógica de fila em lote acima.
    // Mantida temporariamente como fallback se houver referências antigas.
    async function processarExtratoComIA(csvText, fileName = "extrato.csv", modelName = "claude-opus-4-8") {
       throw new Error("processarExtratoComIA foi descontinuada. A lógica agora roda na fila de upload em lote.");
    }

    function renderizarRevisaoIA(resultadoIA) {
      const dicionario = window.dicionarioCategorias || {};
      const opcoesCategoria = Object.keys(dicionario);

      // 1. Preparar dados com ID único e Semáforo de Confiança
      window.currentReviewData = resultadoIA.map((d, i) => {
        let confianca = 'verde';
        let statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#10b981; margin:auto;" title="100% Certeza"></div>';
        
        if (d.duvida) {
          if (d.categoria && d.categoria.toUpperCase() !== 'OUTROS' && d.categoria.toUpperCase() !== 'DIVERSOS') {
            confianca = 'amarelo';
            statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#f59e0b; margin:auto;" title="Dúvida (Sugestão da IA)"></div>';
          } else {
            confianca = 'vermelho';
            statusIcon = '<div style="width:12px; height:12px; border-radius:50%; background:#ef4444; margin:auto;" title="A IA não teve ideia"></div>';
          }
        }
        return { ...d, _id: 'tx_' + i, confianca, statusIcon, vlrNumber: parseFloat(d.valor) || 0 };
      });

      window.reviewSortCol = 'data';
      window.reviewSortAsc = true;

      window.updateReviewData = function(id, field, value) {
        const item = window.currentReviewData.find(d => d._id === id);
        if (item) {
          item[field] = value;
          if (field === 'categoria') {
            item.subcategoria = (dicionario[value] && dicionario[value].length > 0) ? dicionario[value][0] : '';
            window.renderReviewTable(); // re-render to update cascaded subcategory dropdown
          }
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
        
        tbody.innerHTML = window.currentReviewData.map(d => {
          const catAtual = d.categoria || opcoesCategoria[0];
          const opcoesSub = dicionario[catAtual] || [];
          const corValor = d.vlrNumber >= 0 ? 'var(--color-income)' : 'var(--color-expense)';

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 0.8rem; text-align:center;">${d.statusIcon}</td>
              <td style="padding: 0.8rem; color: var(--text-secondary); font-size: 0.85rem; white-space: nowrap;">${d.data}</td>
              <td style="padding: 0.8rem; color: var(--text-primary); font-size: 0.9rem;">${d.descricao}</td>
              <td style="padding: 0.8rem; color: ${corValor}; font-weight: bold; white-space: nowrap;">R$ ${Math.abs(d.vlrNumber).toFixed(2)}</td>
              <td style="padding: 0.8rem;">
                <select onchange="window.updateReviewData('${d._id}', 'categoria', this.value)" style="width: 100%; min-width: 150px; background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 4px; font-size: 0.85rem;">
                  ${opcoesCategoria.map(c => `<option value="${c}" ${c === d.categoria ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </td>
              <td style="padding: 0.8rem;">
                <select onchange="window.updateReviewData('${d._id}', 'subcategoria', this.value)" style="width: 100%; min-width: 150px; background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 4px; font-size: 0.85rem;">
                  ${opcoesSub.map(s => `<option value="${s}" ${s === d.subcategoria ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
            </tr>
          `;
        }).join('');
      };

      const resumoDups = window.resumoDuplicidades || { total: 0, ignoradas: 0 };
      const bannerDups = resumoDups.ignoradas > 0 ? `
        <div style="background: rgba(234, 179, 8, 0.1); color: var(--color-warning); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display:flex; align-items:center; gap: 1rem; border: 1px solid rgba(234, 179, 8, 0.2);">
          <i class="fas fa-shield-alt" style="font-size: 2rem;"></i>
          <div>
            <h4 style="margin:0;">Filtro Anti-Duplicidade Ativado</h4>
            <p style="margin:0; font-size:0.9rem; color:var(--text-secondary);">Das ${resumoDups.total} transações no arquivo, <b>${resumoDups.ignoradas}</b> já existiam e foram descartadas.</p>
          </div>
        </div>
      ` : '';

      const tableHTML = `
        ${bannerDups}
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: left;">
            <thead style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.85rem;">
              <tr>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); text-align:center;" onclick="window.sortReviewTable('confianca')">Confiança ↕</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('data')">Data ↕</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('descricao')">Descrição ↕</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('valor')">Valor ↕</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('categoria')">Categoria ↕</th>
                <th style="padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="window.sortReviewTable('subcategoria')">Subcategoria ↕</th>
              </tr>
            </thead>
            <tbody id="review-tbody">
            </tbody>
          </table>
        </div>
      `;

      const containerList = document.getElementById('import-review-list');
      const containerBox = document.getElementById('import-review-container');
      const titleEl = document.getElementById('import-review-title');
      
      const duvidasTotais = window.currentReviewData.filter(d => d.confianca !== 'verde').length;
      titleEl.innerHTML = `<i class="fas fa-clipboard-list" style="color: var(--color-primary);"></i> Revisão Final (${window.currentReviewData.length} itens, ${duvidasTotais} dúvidas)`;
      
      containerList.innerHTML = tableHTML;
      window.sortReviewTable('confianca'); // Inicialmente ordena trazendo vermelhos e amarelos pro topo
      
      containerBox.style.display = 'block';

      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.remove('active'));
      const importNav = document.querySelector('[data-target="panel-import"]');
      if (importNav) importNav.classList.add('active');
      document.getElementById('panel-import').classList.add('active');

      setTimeout(() => {
        const saveHandler = async () => {
          // Extrai o resultado final e remove campos temporários do frontend
          const transacoesFinais = window.currentReviewData.map(d => {
            const { _id, confianca, statusIcon, vlrNumber, duvida, ...cleanData } = d;
            return cleanData;
          });

          showGlassModal('Salvando...', `
            <div style="text-align:center; padding: 3rem 1rem;">
              <i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
              <h3 style="color: var(--text-primary);">Gravando na Planilha...</h3>
            </div>
          `);

          try {
            const webhookUrl = APPS_SCRIPT_WEBAPP_URL; 
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'salvar_ia',
                transacoes: transacoesFinais
              })
            });

            const json = await response.json();
            if (json.status === 'success') {
              // Limpa a tela de revisão
              containerBox.style.display = 'none';
              containerList.innerHTML = '';
              
              showGlassModal('Sucesso!', `
                <div style="text-align:center; padding: 2rem 1rem;">
                  <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--color-income); margin-bottom: 1.5rem;"></i>
                  <h3 style="color: var(--text-primary);">Tudo Salvo!</h3>
                  <p style="color: var(--text-secondary);">Os lançamentos foram importados para a sua planilha e o robô aprendeu suas correções.</p>
                </div>
              `);
              
              setTimeout(() => {
                document.getElementById('glassModal').classList.remove('active');
                
                // Retorna para a Visão Geral e recarrega
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.remove('active'));
                document.querySelector('[data-target="panel-overview"]').classList.add('active');
                document.getElementById('panel-overview').classList.add('active');
                
                window.location.reload();
              }, 3000);
            } else {
              throw new Error(json.message);
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao salvar na planilha: " + err.message);
            document.getElementById('glassModal').classList.remove('active');
          }
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
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('shared') === 'true') {
        try {
          const cache = await caches.open('shared-files-cache');
          const response = await cache.match('/shared-extrato-file');
          
          if (response) {
            const fileName = response.headers.get('X-Original-Name') || 'extrato_compartilhado.csv';
            
            // Limpa a URL para não processar de novo em F5
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Mostra o loading inicial com mensagens dinâmicas
            window.loadingInterval = showAILoadingModal(fileName);

            // Lê o texto do arquivo (na Fase 2 isso irá para o Webhook do n8n)
            const csvText = await response.text();
            
            // Chama a API de IA (Simulação por enquanto)
            const resultadoIA = await processarExtratoComIA(csvText);
            
            // Renderiza a interface de Human-in-the-Loop focada nas dúvidas
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
      "banco_do_brasil": "Regras Banco do Brasil (BB) Conta Corrente: Geralmente possui colunas 'Data', 'Dependência', 'Histórico', 'Data do Balancete', 'Número do Documento' e 'Valor'. Valores podem estar com o sinal de C (Crédito) ou D (Débito) ao lado, ou negativo para saída. Cuidado com o cabeçalho complexo.",
      "bb_cartao": "Regras Banco do Brasil (BB) Cartão: O formato da fatura difere da conta corrente. Identifique as compras e separe entradas e saídas corretamente.",
      "default": "Sem regras específicas mapeadas. Faça a dedução lógica do formato das colunas."
    };

    function identifyBankLibrary(fileName, csvText) {
      const lowerName = fileName.toLowerCase();
      const lowerText = csvText.toLowerCase().substring(0, 1000);

      if ((lowerName.includes('fatura') || lowerName.includes('cartao')) && (lowerName.includes('bb') || lowerText.includes('banco do brasil'))) return BANK_LIBRARIES["bb_cartao"];
      if (lowerName.includes('bb') || lowerText.includes('banco do brasil')) return BANK_LIBRARIES["banco_do_brasil"];
      
      return BANK_LIBRARIES["default"];
    }

    // Lógica para upload em LOTE (Desktop)
    let selectedIaModel = 'claude-opus-4-8';
    const btnImportModels = document.querySelectorAll('.btn-import-model');
    const uploadCsvIa = document.getElementById('uploadCsvIa');

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

      const text = await file.text();
      return { type: 'text', content: text };
    }
    
    const btnImportSingle = document.getElementById('btn-import-single');
    if (btnImportSingle && uploadCsvIa) {
      btnImportSingle.addEventListener('click', () => {
        selectedIaModel = 'claude-haiku-4-5-20251001';
        uploadCsvIa.click();
      });

      uploadCsvIa.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files).slice(0, 10);
        if (files.length === 0) return;
        
        e.target.value = '';

        const queueContainer = document.getElementById('batch-queue-container');
        const queueLeft = document.getElementById('batch-queue-left');
        const queueRight = document.getElementById('batch-queue-right');
        const queueStatus = document.getElementById('batch-queue-status');
        
        if(queueContainer) queueContainer.style.display = 'block';
        if(queueLeft) queueLeft.innerHTML = '';
        if(queueRight) queueRight.innerHTML = '';
        if(queueStatus) queueStatus.innerText = 'Processando a fila...';

        files.forEach((f, i) => {
          const li = document.createElement('li');
          li.id = `queue-item-${i}`;
          li.style.cssText = "display:flex; flex-direction:column; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.3s ease;";
          li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="font-weight:600; color:var(--text-primary);"><i class="fas fa-file-alt" style="color:var(--color-primary); margin-right:6px;"></i>${f.name}</span>
              <span id="queue-status-${i}" style="color:var(--text-secondary); font-weight:bold; font-size: 0.85rem;">⏳ Na fila...</span>
            </div>
            <div id="queue-meta-${i}" style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
              <div><strong>🏦 Banco:</strong> ????</div>
              <div><strong>🏷️ Tipo:</strong> ????</div>
              <div><strong>📅 Período:</strong> ????</div>
            </div>
          `;
          if(queueLeft) queueLeft.appendChild(li);
        });

        let todasIneditasAgrupadas = [];
        let totalDuplicadasIgnoradas = 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const statusSpan = document.getElementById(`queue-status-${i}`);
          
          try {
            if(statusSpan) { statusSpan.innerText = '⚙️ Lendo arquivo...'; statusSpan.style.color = '#3b82f6'; }
            
            const fileData = await extractFileContent(file);
            const isPdf = fileData.type === 'pdf';
            const bankRules = identifyBankLibrary(file.name, isPdf ? "Arquivo em formato PDF (Base64)" : fileData.content);

            if(statusSpan) { statusSpan.innerText = '🤖 Extraindo (Haiku)...'; }
            const resExtrair = await fetch(APPS_SCRIPT_WEBAPP_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'extract_raw',
                fileContent: fileData.content,
                fileType: fileData.type,
                fileName: file.name,
                bankLibraryRules: bankRules
              })
            });

            const jsonBruto = await resExtrair.json();
            if (jsonBruto.status !== 'success') throw new Error(jsonBruto.message || "Erro extração.");

            // O novo prompt retorna um objeto: { nomeConta, tipoConta, transacoes: [] }
            const extrato = jsonBruto.data || {};
            const transacoesExtraidas = extrato.transacoes || extrato || []; // fallback se a IA retornar array direto
            
            let nomeConta = extrato.nomeConta || 'Desconhecida';
            let tipoConta = extrato.tipoConta || 'Indefinido';
            let periodoStr = 'N/A';

            if (transacoesExtraidas.length > 0) {
              const datas = transacoesExtraidas.map(t => {
                if(!t.data) return NaN;
                const parts = t.data.split('/');
                return new Date(parts[2], parts[1]-1, parts[0]).getTime();
              }).filter(d => !isNaN(d));

              if (datas.length > 0) {
                const minDate = new Date(Math.min(...datas));
                const maxDate = new Date(Math.max(...datas));
                const formata = d => d.toLocaleDateString('pt-BR');
                periodoStr = `${formata(minDate)} a ${formata(maxDate)}`;
              }
            }

            const metaDiv = document.getElementById(`queue-meta-${i}`);
            if(metaDiv) {
              metaDiv.innerHTML = `
                <div><strong>🏦 Banco:</strong> ${nomeConta}</div>
                <div><strong>🏷️ Tipo:</strong> ${tipoConta}</div>
                <div><strong>📅 Período:</strong> ${periodoStr}</div>
              `;
            }

            if(statusSpan) { statusSpan.innerText = '🔍 Filtrando duplicidades...'; }
            const historico = (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.lancamentos) ? dadosFinanceiros.lancamentos : [];
            
            const ineditasDoArquivo = transacoesExtraidas.filter(t => {
              const isDuplicate = historico.some(h => h.data === t.data && Math.abs(h.valor - t.valor) < 0.01);
              return !isDuplicate;
            });

            totalDuplicadasIgnoradas += (transacoesExtraidas.length - ineditasDoArquivo.length);
            todasIneditasAgrupadas.push(...ineditasDoArquivo);

            if(statusSpan) { statusSpan.innerText = `✅ ${ineditasDoArquivo.length} inéditas`; statusSpan.style.color = '#10b981'; }
            
            // Move o card para a coluna "Finalizados"
            const liItem = document.getElementById(`queue-item-${i}`);
            const queueRight = document.getElementById('batch-queue-right');
            if (liItem && queueRight) {
              queueRight.appendChild(liItem);
            }
            
          } catch (err) {
            console.error(err);
            if(statusSpan) { statusSpan.innerText = `❌ Falhou`; statusSpan.style.color = '#ef4444'; }
            
            // Em caso de erro, detalha no card (que continua na coluna da esquerda) e pinta borda
            const liItem = document.getElementById(`queue-item-${i}`);
            if(liItem) liItem.style.borderColor = '#ef4444';
            
            const metaDiv = document.getElementById(`queue-meta-${i}`);
            if(metaDiv) {
              metaDiv.innerHTML = `<div style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 8px; border-radius: 4px; margin-top: 8px;">
                🚨 Erro do Google Apps Script:<br>
                <span style="font-weight: normal; font-family: monospace;">${err.message}</span>
              </div>`;
            }
          }
        }

        if (todasIneditasAgrupadas.length === 0) {
          if(queueStatus) queueStatus.innerText = 'Concluído: Nenhuma transação inédita encontrada nos arquivos.';
          alert('Processamento finalizado. Nenhuma transação nova foi encontrada nos arquivos (todas já existiam ou houve falha na leitura).');
          return;
        }

        if(queueStatus) { 
          queueStatus.innerText = `Categorizando ${todasIneditasAgrupadas.length} transações inéditas com a IA Mestra...`;
          queueStatus.style.color = 'var(--color-primary)';
          queueStatus.style.fontWeight = 'bold';
        }
        
        const catStatusBox = document.getElementById('import-categorizer-status');
        let funInterval;
        if (catStatusBox) {
          catStatusBox.style.display = 'block';
          catStatusBox.innerHTML = `
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
              <i class="fas fa-brain fa-pulse" style="font-size: 2.5rem; color: var(--color-primary); margin-bottom: 1rem;"></i>
              <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary);" id="inline-cat-title">Classificando Lote (0 de ${todasIneditasAgrupadas.length} itens)...</h3>
              
              <!-- Barra de Progresso -->
              <div style="width: 100%; max-width: 400px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 1rem auto; overflow: hidden;">
                <div id="inline-cat-progress" style="width: 0%; height: 100%; background: var(--color-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>

              <p style="margin: 0; font-style: italic; color: var(--text-secondary);" id="inline-cat-desc">Filtro Local ignorou ${totalDuplicadasIgnoradas} duplicidades. Chamando IA Mestra...</p>
            </div>
          `;

          const funMessages = [
            "Acordando os neurônios financeiros...",
            "Lendo seu Dicionário de Regras Mágicas...",
            "Cruzando dados com a base da NASA...",
            "Tomando um café antes de continuar...",
            "Identificando seus padrões de consumo...",
            "Calculando os últimos centavos...",
            "A Mestra está pensando forte..."
          ];
          let msgIdx = 0;
          funInterval = setInterval(() => {
            const descEl = document.getElementById('inline-cat-desc');
            if (descEl) descEl.innerText = funMessages[msgIdx % funMessages.length];
            msgIdx++;
          }, 2500);
        }

        try {
          const CHUNK_SIZE = 40;
          let arrayFinalCategorizado = [];
          let dicionarioFinal = {};
          
          for (let c = 0; c < todasIneditasAgrupadas.length; c += CHUNK_SIZE) {
            const currentTotal = Math.min(c + CHUNK_SIZE, todasIneditasAgrupadas.length);
            const titleEl = document.getElementById('inline-cat-title');
            const progressEl = document.getElementById('inline-cat-progress');
            
            if (titleEl) titleEl.innerText = `Classificando Lote (${currentTotal} de ${todasIneditasAgrupadas.length} itens)...`;
            if (progressEl) {
              const perc = (c / todasIneditasAgrupadas.length) * 100;
              progressEl.style.width = \`\${perc}%\`;
            }
            
            const resCategorizar = await fetch(APPS_SCRIPT_WEBAPP_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'categorize_json',
                payload: JSON.stringify(todasIneditasAgrupadas.slice(c, c + CHUNK_SIZE)),
                model: selectedIaModel
              })
            });

            const jsonCat = await resCategorizar.json();
            if (jsonCat.status !== 'success') throw new Error(jsonCat.message || "Erro desconhecido na categorização.");
            
            arrayFinalCategorizado.push(...jsonCat.data);
            dicionarioFinal = jsonCat.dicionario;
          }

          if (document.getElementById('inline-cat-progress')) {
            document.getElementById('inline-cat-progress').style.width = '100%';
          }
          if (funInterval) clearInterval(funInterval);

          window.dicionarioCategorias = dicionarioFinal;
          window.resumoDuplicidades = { total: todasIneditasAgrupadas.length + totalDuplicadasIgnoradas, ignoradas: totalDuplicadasIgnoradas };

          if (catStatusBox) catStatusBox.style.display = 'none';
          if(queueStatus) { queueStatus.innerText = '✨ Processamento em lote concluído!'; queueStatus.style.color = '#10b981'; }
          
          renderizarRevisaoIA(arrayFinalCategorizado);
        } catch (err) {
          if (funInterval) clearInterval(funInterval);
          if (catStatusBox) {
            catStatusBox.innerHTML = `
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <h3 style="margin: 0 0 0.5rem 0; color: #ef4444;">Falha na Inteligência Artificial (Categorização)</h3>
                <p style="margin: 0; color: var(--text-secondary);">${err.message}</p>
              </div>
            `;
          }
          if(queueStatus) { queueStatus.innerText = '❌ Erro na categorização final.'; queueStatus.style.color = '#ef4444'; }
          console.error('Erro na IA Mestra:', err);
        }
      });
    }


    async function init() {
      setupNavigation();
      setupSwipeNavigation();
      
      const success = await loadDataFromSheets();
      if (!success) return; // Stop if sheets are not loaded


      updateOverview();
      renderBudgets();
      renderAccounts();
      renderInvestments();
      renderAudit();
      // Removemos as chamadas para renderTransactionsTable pois criaremos o Executive Summary
      
      initCharts();
      renderInvestmentsDashboard();
      renderCreditCardsDashboard();
      
      // Captura de arquivo compartilhado nativamente
      await checkSharedFile();

      // Events listeners
      bindTabPeriodSelectors();

      if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
          const totalPages = Math.ceil(getFilteredTransactions().length / rowsPerPage);
          if (currentPage < totalPages) {
            currentPage++;
            if(typeof renderTransactionsTable === 'function') renderTransactionsTable();
          }
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

    function setupNavigation() {
      sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPanel = link.getAttribute('data-target');
          
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          
          panels.forEach(panel => {
            if (panel.id === targetPanel) {
              panel.classList.add('active');
              if (targetPanel === 'panel-investments') {
                setTimeout(() => {
                  if (typeof renderInvestmentsDashboard === 'function') renderInvestmentsDashboard();
                }, 10);
              } else if (targetPanel === 'panel-budgets') {
                setTimeout(() => {
                  if (typeof renderBudgets === 'function') renderBudgets();
                }, 10);
              }
            } else {
              panel.classList.remove('active');
            }
          });
        });
      });
    }

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
        
        // Assegura que o swipe foi mais horizontal do que vertical para não atrapalhar o scroll
        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
          const activeNav = document.querySelector('.nav-item.active');
          if (!activeNav) return;
          
          const currentTarget = activeNav.getAttribute('data-target');
          const currentIndex = tabs.indexOf(currentTarget);
          
          if (currentIndex === -1) return;

          if (diffX > 0) {
            // Swipe Esquerda: Próxima Aba
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
          if (period === 'year' && parts[2] !== currYearStr) return false;
          if (period === 'custom') {
            const d = parseDateString(l.data);
            if (d < sD || d > eD) return false;
          }
        }

        // Global search query
        if (searchQuery !== '') {
          const obs = (l.obs || '').toLowerCase();
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
        { filterId: 'visao-geral-filter', startId: 'visao-geral-date-start', endId: 'visao-geral-date-end', customId: 'visao-geral-custom-date', tabId: 'visao-geral', updateFn: () => { updateOverview(); updateCharts(); } },
        { filterId: 'investimentos-filter', startId: 'investimentos-date-start', endId: 'investimentos-date-end', customId: 'investimentos-custom-date', tabId: 'investimentos', updateFn: () => { if(typeof renderInvestmentsDashboard === 'function') renderInvestmentsDashboard(); if(typeof renderInvestments === 'function') renderInvestments(); } }
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
      const filtered = getFilteredTransactions(getTabPeriod('visao-geral'));
      
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

      valueIncome.textContent = formatBRL(income);
      valueExpense.textContent = formatBRL(Math.abs(expenses));
      valueSavings.textContent = formatBRL(net);
      
      if (net >= 0) {
        valueSavings.style.color = 'var(--color-income)';
      } else {
        valueSavings.style.color = 'var(--color-expense)';
      }

      const savingsTrend = document.getElementById('value-savings-trend');
      if (savingsTrend) {
        savingsTrend.textContent = net >= 0 ? 'Positivo no período' : 'Negativo no período';
      }

      // Render Top 5 Gastos
      const filteredTop5 = getFilteredTransactions(getTabPeriod('visao-geral'));
      const expenseGroup = {};
      filteredTop5.forEach(l => {
        if (l.valor >= 0) return;
        const cat = l.categoria || 'Outros';
        if (cat.toLowerCase().includes('transfer') || cat.toLowerCase().includes('saldo inicial')) return;
        
        if (!expenseGroup[cat]) expenseGroup[cat] = 0;
        expenseGroup[cat] += Math.abs(l.valor);
      });
      
      const sortedExpenses = Object.keys(expenseGroup).map(cat => ({
        name: cat,
        value: expenseGroup[cat]
      })).sort((a, b) => b.value - a.value);
      
      const top5 = sortedExpenses.slice(0, 5);
      const maxExpense = top5.length > 0 ? top5[0].value : 1;
      
      const top5List = document.getElementById('top-5-list');
      if (top5List) {
        top5List.innerHTML = '';
        if (top5.length === 0) {
          top5List.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">Sem gastos no período</li>';
        } else {
          top5.forEach(item => {
            const pctOfMax = (item.value / maxExpense) * 100;
            const li = document.createElement('li');
            li.className = 'top-5-item clickable';
            li.dataset.catName = item.name;
            li.innerHTML = `
              <div class="top-5-info-row">
                <span class="top-5-name">${item.name}</span>
                <span class="top-5-value">${formatBRL(item.value)}</span>
              </div>
              <div class="top-5-bar-bg">
                <div class="top-5-bar-fill" style="width: ${pctOfMax}%"></div>
              </div>
            `;
            li.addEventListener('click', () => window.showCategoryDrilldown(item.name, getTabPeriod('visao-geral')));
            top5List.appendChild(li);
          });
        }
      }

      renderExecutiveSummary();
      if (typeof renderBudgets === 'function') renderBudgets();
    }

    function renderExecutiveSummary() {
      const container = document.getElementById('executive-summary-content');
      if (!container) return;

      let saldoCC = 0, saldoInv = 0, saldoCartoes = 0;

      dadosFinanceiros.contas.forEach(c => {
        const tipo = (c.tipo || '').toLowerCase();
        if (tipo.includes('cart') || tipo.includes('crédito') || tipo.includes('credito')) {
          saldoCartoes += c.saldo;
        } else if (tipo.includes('investimento') || tipo.includes('aplicação') || tipo.includes('corretora')) {
          saldoInv += c.saldo;
        } else {
          saldoCC += c.saldo;
        }
      });

      const patrimonio = saldoCC + saldoInv + saldoCartoes;
      const alertas = dadosFinanceiros.auditoria ? dadosFinanceiros.auditoria.length : 0;
      const pendentes = dadosFinanceiros.importacoes ? dadosFinanceiros.importacoes.length : 0;

      container.innerHTML = `
        <div class="exec-card inv" data-action="inv">
          <div class="exec-card-label">Investimentos</div>
          <div class="exec-card-value" style="color:#8b5cf6;">${formatBRL(saldoInv)}</div>
          <div class="exec-card-icon">??</div>
        </div>
        <div class="exec-card cartoes" data-action="cartoes">
          <div class="exec-card-label">Cartões de Crédito</div>
          <div class="exec-card-value" style="color:var(--color-expense);">${formatBRL(Math.abs(saldoCartoes))}</div>
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
          'cartoes': () => window.showCartoesModal(),
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

    function renderTransactionsTable() {
      const filtered = getFilteredTransactions();
      const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
      
      if (currentPage > totalPages) currentPage = totalPages;

      const startIdx = (currentPage - 1) * rowsPerPage;
      const endIdx = Math.min(startIdx + rowsPerPage, filtered.length);
      const pageItems = filtered.slice(startIdx, endIdx);

      pageInfo.textContent = `Página ${currentPage} de ${totalPages} (Total: ${filtered.length})`;
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;

      transactionsTableBody.innerHTML = '';

      if (pageItems.length === 0) {
        transactionsTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
              Nenhum lançamento encontrado para os filtros selecionados.
            </td>
          </tr>
        `;
        return;
      }

      pageItems.forEach(l => {
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
        } else if (cat.includes('provent') || cat.includes('salário') || cat.includes('inicial') || l.valor > 0) {
          badgeClass = 'badge-income';
        }

        row.innerHTML = `
          <td>${l.data || '-'}</td>
          <td>${l.vencimento || '-'}</td>
          <td>${l.conta || '-'}</td>
          <td>${l.obs || '-'}</td>
          <td><span class="badge ${badgeClass}">${l.categoria || 'Outros'}</span></td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${l.subcategoria || '-'}</td>
          <td class="${valClass}">${valPrefix}${formatBRL(l.valor)}</td>
        `;
        transactionsTableBody.appendChild(row);
      });
    }

    function getFavorites() {
      return JSON.parse(localStorage.getItem('budgetFavorites') || '[]');
    }

    function normalizeCat(c) { return (c || '').trim().toLowerCase(); }

    function getCardData(o, cardPeriod) {
      const annualLimit = Math.abs(o.orcamento);
      const activePeriod = cardPeriod || document.getElementById('month-filter').value;
      let periodMonths = 12;
      if (activePeriod === 'current' || activePeriod === 'previous') periodMonths = 1;
      else if (activePeriod === 'year') periodMonths = 12;
      else if (activePeriod === '3months') periodMonths = 3;
      else if (activePeriod === '6months') periodMonths = 6;
      else if (activePeriod === 'custom') {
         periodMonths = 1; // Simplified fallback
      }
      const limit = annualLimit * (periodMonths / 12);
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
            biggestExpenseName = tx.obs || "-";
         }
      });
      let statusText = "🟢 Dentro da Meta";
      let statusColor = "var(--color-income)";
      if (d.pct >= 100) {
         statusText = "🔴 Estourado";
         statusColor = "var(--color-expense)";
      } else if (d.pct >= 85) {
         statusText = "🟠 Atenção";
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
      txHtml += '<span style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem; display:block; font-weight:600; letter-spacing:0.5px;">Últimas Transações</span>';
      const recentSliced = recent.slice(0, 50);
      if (recentSliced.length === 0) {
         txHtml += '<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 1rem;">Nenhum gasto neste período.</p>';
      } else {
         txHtml += '<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.8rem;">';
         if (recent.length > 50) {
            txHtml += `<div style="font-size: 0.75rem; color: var(--color-warning); text-align: center; margin-bottom: 0.5rem; background: rgba(234, 179, 8, 0.1); padding: 4px; border-radius: 4px;">Exibindo as 50 mais recentes de ${recent.length} transações.</div>`;
         }
         recentSliced.forEach(tx => {
           txHtml += `
             <li style="display:flex; justify-content:space-between; font-size:0.85rem; align-items:center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
               <span style="color:var(--text-secondary); font-size:0.75rem; min-width:45px;">${tx.data.substring(0,5)}</span>
               <span style="color:var(--text-primary); flex:1; margin:0 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${tx.obs || '-'}">${tx.obs || '-'}</span>
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
            <div style="display:flex; align-items:center;">
              <span class="budget-star ${isFav ? 'active' : ''}" data-star-cat="${o.categoria}" title="Favoritar" style="font-size: 1.5rem; text-shadow: 0 0 10px rgba(250, 204, 21, 0.4); margin-right: 10px;">&#9733;</span>
              <div class="emoji-dropdown">
                <span class="emoji-btn card-period-btn" title="Alterar Período">📅</span>
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
        <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative; overflow: visible;">
          <div class="budget-title-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap: 6px;">
              <span class="budget-star ${starClass}" data-star-cat="${o.categoria}" title="Favoritar">&#9733;</span>
              <span class="budget-cat-name" style="margin-left:4px;">${o.categoria}</span>
            </div>
            <div style="display:flex; align-items:center; gap: 10px;">
              <select class="budget-period-select" data-budget-cat="${o.categoria}" onclick="event.stopPropagation()" style="background:var(--bg-sidebar); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:2px 5px; font-size:0.8rem; outline:none; cursor:pointer;">
                <option value="current" ${cardPer === 'current' ? 'selected' : ''}>Este Mês</option>
                <option value="previous" ${cardPer === 'previous' ? 'selected' : ''}>Mês Passado</option>
                <option value="3months" ${cardPer === '3months' ? 'selected' : ''}>Últimos 3 Meses</option>
                <option value="6months" ${cardPer === '6months' ? 'selected' : ''}>Últimos 6 Meses</option>
                <option value="year" ${cardPer === 'year' ? 'selected' : ''}>Este Ano</option>
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
        const txs = getFilteredTransactions(cardPer).filter(l => (l.categoria || '').toLowerCase().trim() === o.categoria.toLowerCase().trim());
        txs.sort((a,b) => Math.abs(b.valor) - Math.abs(a.valor));
        const topTxs = txs.slice(0, 3);
        if (topTxs.length > 0) {
          html += `<div style="margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05);">`;
          html += `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">Maiores Gastos no Período:</div>`;
          topTxs.forEach(t => {
            html += `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.85rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;" title="${t.obs || t.conta}">${t.obs || t.conta}</span>
                <span style="font-size:0.85rem; color:var(--color-expense); font-weight:600;">${formatBRL(Math.abs(t.valor))}</span>
              </div>
            `;
          });
          html += `</div>`;
        } else {
          html += `<div style="margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); font-size:0.8rem; color:var(--text-muted); text-align:center;">Nenhum gasto no período.</div>`;
        }
      }

      html += `</div>`;
      return html;
    }

    function openDetailedCardModal(cat) {
      const o = dadosFinanceiros.orcamento.find(x => x.categoria === cat);
      if(!o) return;
      const html = buildDetailedBudgetCard(o);
      document.getElementById('detailedModalBody').innerHTML = html;
      document.getElementById('detailedModal').classList.add('show');
      
      const modal = document.getElementById('detailedModal');
      modal.querySelectorAll('.card-period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.emoji-dropdown-menu.show').forEach(m => {
             if(m !== btn.nextElementSibling) m.classList.remove('show');
          });
          btn.nextElementSibling.classList.toggle('show');
        });
      });
      modal.querySelectorAll('.card-period-menu div').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          setBudgetCardPeriod(cat, opt.dataset.val);
          opt.parentElement.classList.remove('show');
          openDetailedCardModal(cat);
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
          openDetailedCardModal(cat);
          renderBudgets();
        });
      });
    }

    function renderBudgets() {
      const budgetContainer = document.getElementById('budget-container');
      if (!budgetContainer) return;
      budgetContainer.innerHTML = '';

      const favItems = [];
      const normalItems = [];
      const favorites = getFavorites();

      let tetoGlobal = 0;
      let gastoGlobal = 0;

      const chartLabels = [];
      const chartTeto = [];
      const chartGasto = [];
      const chartColors = [];

      if (dadosFinanceiros.orcamento) {
        dadosFinanceiros.orcamento.forEach(o => {
          if (o.categoria === 'TOTAL' || o.categoria === 'Sobra') return;
          
          const isFav = favorites.includes(normalizeCat(o.categoria));
          if (isFav) favItems.push(o);
          normalItems.push(o);

          const cardPer = getBudgetCardPeriod(o.categoria);
          const d = getCardData(o, cardPer);
          
          tetoGlobal += d.limit;
          gastoGlobal += d.spent;

          chartLabels.push(o.categoria);
          chartTeto.push(d.limit);
          chartGasto.push(d.spent);
          chartColors.push(d.isBurst ? '#ef4444' : (d.pct > 80 ? '#f59e0b' : '#3b82f6'));
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
        elLivre.previousElementSibling.querySelector('span').textContent = livreGlobal >= 0 ? 'Espaço Livre Global' : 'Estouro Global';
      }
      if (elSaude) {
        elSaude.textContent = saudePct + '%';
        elSaude.style.color = saudePct > 100 ? '#ef4444' : (saudePct > 80 ? '#f59e0b' : '#10b981');
      }

      // Render Chart
      const ctxBudget = document.getElementById('budget-consumption-chart');
      if (ctxBudget) {
        if (budgetConsumptionChart) budgetConsumptionChart.destroy();
        budgetConsumptionChart = new Chart(ctxBudget.getContext('2d'), {
          type: 'bar',
          data: {
            labels: chartLabels,
            datasets: [
              { label: 'Realizado (R$)', data: chartGasto, backgroundColor: chartColors, borderRadius: 4, stack: 'Stack 0' },
              { label: 'Limite Disponível', data: chartTeto.map((t, i) => Math.max(0, t - chartGasto[i])), backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, stack: 'Stack 0' }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#a0aec0' } },
              y: { stacked: true, grid: { display: false }, ticks: { color: '#a0aec0' } }
            }
          }
        });
      }

      if (!dadosFinanceiros.orcamento || dadosFinanceiros.orcamento.length === 0) {
        budgetContainer.innerHTML = '<p style="color: var(--text-muted);">Nenhuma meta de orçamento definida.</p>';
        return;
      }

      let html = '';
      if (favItems.length > 0) {
        html += `<div class="budget-favorites-section">
          <div class="budget-favorites-title">⭐ Favoritos (Em Detalhes)</div>
          <div class="budget-grid">`;
        favItems.forEach(o => { html += buildBudgetCard(o, true, true); });
        html += `</div></div>`;
      }

      html += `<div class="budget-grid">`;
      normalItems.forEach(o => { 
        const isFav = favorites.includes(normalizeCat(o.categoria));
        html += buildBudgetCard(o, isFav, false); 
      });
      html += `</div>`;

      budgetContainer.innerHTML = html;

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
            if (cat) openDetailedCardModal(cat);
          });
        });
      }, 0);
    }

    function renderAccounts() {
      const container = document.getElementById('panel-accounts');
      if (!container) return;

      if (!dadosFinanceiros.contas || dadosFinanceiros.contas.length === 0) {
        container.innerHTML = `<h2 style="margin-bottom: 1.5rem;">Contas Bancárias</h2><p style="color: var(--text-muted);">Nenhuma conta cadastrada.</p>`;
        return;
      }

      const groups = {
        'Contas Correntes': [],
        'Cartões de Crédito': [],
        'Investimentos': []
      };
      let totalCC = 0, totalCartoes = 0, totalInv = 0;

      dadosFinanceiros.contas.forEach(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('crédito') || t.includes('credito')) {
          groups['Cartões de Crédito'].push(c);
          totalCartoes += c.saldo;
        } else if (t.includes('investimento') || t.includes('aplicação') || t.includes('corretora') || t.includes('aplicacao') || t.includes('poupança') || t.includes('poupanca')) {
          groups['Investimentos'].push(c);
          totalInv += c.saldo;
        } else {
          groups['Contas Correntes'].push(c);
          totalCC += c.saldo;
        }
      });

      const patrimonio = totalCC + totalInv + totalCartoes;

      const now = new Date();
      now.setHours(0,0,0,0);
      
      const todasContasAtraso = [];
      dadosFinanceiros.contas.forEach(c => {
        if (!c.ultima_movimentacao) return;
        const d = parseDateString(c.ultima_movimentacao);
        if (d) {
          d.setHours(0,0,0,0);
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          todasContasAtraso.push({ ...c, diffDays });
        }
      });
      todasContasAtraso.sort((a,b) => b.diffDays - a.diffDays);
      
      const count60 = todasContasAtraso.filter(c => c.diffDays > 60).length;
      const count30 = todasContasAtraso.filter(c => c.diffDays > 30 && c.diffDays <= 60).length;
      const count10 = todasContasAtraso.filter(c => c.diffDays > 10 && c.diffDays <= 30).length;
      
      const temAtraso = (count60 + count30 + count10) > 0;
      
      const top5 = todasContasAtraso.filter(c => c.diffDays > 10).slice(0, 5);
      
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
      } else {
        alertaHtml = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%;">
           <div style="font-size:1.8rem; font-weight:700; color:var(--color-income); margin-bottom:0.5rem;"><i class="fas fa-check-circle"></i></div>
           <div style="font-size:0.85rem; color:var(--text-muted);">Tudo em dia!</div>
        </div>`;
      }

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
              <span>Cartões</span><span style="color:var(--color-expense);">${formatBRL(totalCartoes)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem; font-weight:700;">
              <span>Total (Líquido)</span><span style="color:var(--color-income); font-size:1.1rem;">${formatBRL(patrimonio)}</span>
            </div>
          </div>
          
          <div class="card bg-card" id="card-alertas-conciliacao" style="cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border-left: 4px solid ${temAtraso ? 'var(--color-expense)' : 'var(--color-income)'};">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem; font-weight:600; align-self:flex-start; width:100%; text-align:left;">Status de Conciliação</div>
            ${alertaHtml}
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:1rem;">Clique para listar contas</div>
          </div>
        </div>
      `;

      html += `<div style="display:flex; flex-direction:column; gap:2.5rem;">`;
      
      const iconMap = {
        'Contas Correntes': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></svg>',
        'Cartões de Crédito': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>'
      };

      const colorMap = {
        'Contas Correntes': 'income',
        'Cartões de Crédito': 'expense',
        'Investimentos': 'accent'
      };

      const subtotals = {
        'Contas Correntes': totalCC,
        'Cartões de Crédito': totalCartoes,
        'Investimentos': totalInv
      };

      const subtotalColors = {
        'Contas Correntes': 'var(--color-income)',
        'Cartões de Crédito': 'var(--color-expense)',
        'Investimentos': 'var(--color-accent)'
      };

      for (const groupName of ['Contas Correntes', 'Cartões de Crédito', 'Investimentos']) {
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
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }

        contas.forEach(c => {
          const cName = c.nome || c.conta || 'Conta';
          const isCC = groupName === 'Cartões de Crédito';
          
          let faturaAtual = 0;
          let faturaProxima = 0;
          
          if (isCC) {
            const lancamentosConta = dadosFinanceiros.lancamentos.filter(l => (l.conta || '').toLowerCase() === c.nome.toLowerCase());
            lancamentosConta.forEach(l => {
               const dateStr = l.vencimento || l.data; 
               if (!dateStr) return;
               const d = parseDateString(dateStr);
               if (!d) return;
               
               if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                   faturaAtual += l.valor;
               } else if (d.getMonth() === nextMonth && d.getFullYear() === nextYear) {
                   faturaProxima += l.valor;
               }
            });
          }

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
                    <div style="color:var(--text-muted); font-size:0.65rem;">Fatura Atual (Mês)</div>
                    <div style="color:${faturaAtual < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaAtual)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="color:var(--text-muted); font-size:0.65rem;">Próxima Fatura</div>
                    <div style="color:${faturaProxima < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaProxima)}</div>
                  </div>
                </div>
              ` : ''}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
                <div class="card-trend" style="color:var(--text-muted); font-size:0.75rem;">Clique para ver extrato</div>
                ${c.ultima_movimentacao ? `<div style="font-size: 0.75rem; font-weight:600; color: ${getDateColor(c.ultima_movimentacao)};"><i class="fas fa-history" style="margin-right: 3px;"></i>${c.ultima_movimentacao}</div>` : ''}
              </div>
            </div>
          `;
        });
        html += `</div></div>`;
      }

      html += `</div>`;
      container.innerHTML = html;

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
        return t.includes('investimento') || t.includes('aplicação') || t.includes('corretora');
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
          if (v > 0 && (cat === 'transferência' || cat === 'proventos' || cat === 'transferencia')) {
            aportesPeriodo += v;
            updateInvMonthly(monthlyData, l.data, 0, v, 0);
          } else if (v < 0 && (cat === 'transferência' || cat === 'diversos' || cat === 'transferencia')) {
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
        return t.includes('investimento') || t.includes('aplicação') || t.includes('corretora');
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
            <div class="card-trend" style="color:var(--text-muted);">${pctOfTotal}% do total • Clique para ver extrato</div>
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
            <span>Verificação de Transferências Globais</span>
            <span class="audit-status ${isOk ? 'ok' : 'error'}">${isOk ? 'OK' : 'ERRO'}</span>
          </div>
          <div class="audit-desc">A soma de todos os lançamentos de transferência deve ser R$ 0,00.</div>
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
    }

    function updateCharts() {
      const chartData = getChartsFilteredData();
      monthlyChart.data.labels = chartData.monthlyLabels;
      monthlyChart.data.datasets[0].data = chartData.monthlyIncome;
      monthlyChart.data.datasets[1].data = chartData.monthlyExpense.map(Math.abs);
      monthlyChart.update();

      categoryChart.data.labels = chartData.categoryLabels;
      categoryChart.data.datasets[0].data = chartData.categoryValues;
      categoryChart.update();
    }

    function getChartsFilteredData() {
      const filteredMonthly = getFilteredTransactions(getTabPeriod('visao-geral'));
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

      const filteredCategory = getFilteredTransactions(getTabPeriod('visao-geral'));
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

      return { monthlyLabels, monthlyIncome, monthlyExpense, categoryLabels, categoryValues };
    }

    function showModalDetails(type) {
      window.showReceitasDespesasModal(type, getTabPeriod('visao-geral'));
    }

    document.addEventListener('DOMContentLoaded', init);

    // Funções Globais de Modal
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
      const items = filtered.filter(l => {
        const cat = (l.categoria || '').toLowerCase();
        if (cat.includes('transfer') || cat.includes('saldo inicial')) return false;
        return isIncome ? l.valor > 0 : l.valor < 0;
      });

      if (items.length === 0) {
        showGlassModal(isIncome ? 'Receitas' : 'Despesas', '<p style="color:var(--text-muted);">Nenhum lançamento no período.</p>');
        return;
      }

      const grouped = {};
      let total = 0;
      items.forEach(item => {
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
      html += `<p style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin-bottom:1.5rem;">Clique numa categoria para ver os lançamentos</p>`;
      
      sorted.forEach(([cat, catItems], idx) => {
        const catTotal = catItems.reduce((s,i) => s + Math.abs(i.valor), 0);
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
          <div id="${drillId}" class="drilldown-items">
        `;
        catItems.sort((a,b) => Math.abs(b.valor) - Math.abs(a.valor)).forEach(item => {
          html += `
            <div class="drilldown-item-row">
              <span style="color:var(--text-muted);">${item.data}</span>
              <span style="color:var(--text-primary);">${item.obs || item.conta || '-'}</span>
              <span style="color:${color}; font-weight:600;">${formatBRL(Math.abs(item.valor))}</span>
            </div>
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
      const filtered = getFilteredTransactions(period);
      const items = filtered.filter(l => {
        return (l.categoria || '').toLowerCase().trim() === categoria.toLowerCase().trim();
      });

      if (items.length === 0) {
        showGlassModal(categoria, '<p style="color:var(--text-muted); text-align:center;">Nenhum lançamento encontrado para esta categoria no período.</p>');
        return;
      }

      let totalPos = 0, totalNeg = 0;
      items.forEach(i => { if (i.valor > 0) totalPos += i.valor; else totalNeg += Math.abs(i.valor); });
      const mainTotal = totalNeg > 0 ? totalNeg : totalPos;
      const color = totalNeg > 0 ? 'var(--color-expense)' : 'var(--color-income)';

      let html = `<div style="margin-bottom:1rem; text-align:center;">
        <div style="font-size:1.6rem; font-weight:bold; color:${color};">${formatBRL(mainTotal)}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${items.length} lançamento${items.length > 1 ? 's' : ''}</div>
      </div>`;

      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th style="text-align:right">Valor</th></tr></thead><tbody>`;
      items.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dA||0) - (dB||0);
      }).forEach(item => {
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || '-'}</td>
          <td style="color:var(--text-secondary);">${item.conta || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(Math.abs(item.valor))}</td>
        </tr>`;
      });
      html += `</tbody></table>`;

      showGlassModal(`Categoria: ${categoria}`, html);
    };

    // NEW: Show extrato completo de uma conta
    window.showInvestmentsModal = function(type) {
      const period = getTabPeriod('investimentos');
      const filtered = getFilteredTransactions(period);
      
      const invAccountNames = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('investimento') || t.includes('aplicação') || t.includes('corretora');
      }).map(c => c.nome);

      const items = filtered.filter(l => {
        if (!invAccountNames.includes(l.conta)) return false;
        const cat = (l.categoria || '').trim().toLowerCase();
        const v = l.valor;
        if (cat === 'saldo inicial') return false;

        if (type === 'rendimentos') return (cat === 'rendimentos' || cat === 'outros');
        if (type === 'aportes') return (v > 0 && (cat === 'transferência' || cat === 'proventos' || cat === 'transferencia'));
        if (type === 'resgates') return (v < 0 && (cat === 'transferência' || cat === 'diversos' || cat === 'transferencia'));
        return false;
      });

      let title = type === 'rendimentos' ? 'Rendimento Líquido' : type === 'aportes' ? 'Aportes do Período' : 'Resgates do Período';

      if (items.length === 0) {
        showGlassModal(title, '<p style="color:var(--text-muted); text-align:center;">Nenhum lançamento encontrado para este tipo no período.</p>');
        return;
      }

      items.sort((a,b) => (parseDateString(a.data)||0) - (parseDateString(b.data)||0));

      let total = 0;
      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${items.length} lançamento${items.length > 1 ? 's' : ''}</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Conta</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead><tbody>`;

      items.forEach(item => {
        total += item.valor;
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        html += `<tr>
          <td style="color:var(--text-muted); font-size:0.85rem; white-space:nowrap;">${item.data}</td>
          <td style="font-size:0.85rem; color:var(--text-secondary);">${item.conta}</td>
          <td style="color:var(--text-primary); font-size:0.9rem;">${item.obs || '-'}</td>
          <td style="font-size:0.85rem;"><span class="badge" style="background:var(--bg-sidebar); border:1px solid var(--border-color); color:var(--text-secondary);">${item.categoria}</span></td>
          <td style="text-align:right; font-weight:600; color:${valColor};">${formatBRL(item.valor)}</td>
        </tr>`;
      });

      html += `</tbody><tfoot><tr><td colspan="4" style="text-align:right; font-weight:bold; color:var(--text-primary);">Total do Período</td><td style="text-align:right; font-weight:bold; font-size:1.1rem; color:${total >= 0 ? 'var(--color-income)' : 'var(--color-expense)'};">${formatBRL(total)}</td></tr></tfoot></table>`;

      showGlassModal(title, html);
    };

    window.showExtratoContaModal = function(nomeConta, period = 'all') {
      const filtered = getFilteredTransactions(period);
      const items = filtered.filter(l => (l.conta || '').toLowerCase().trim() === nomeConta.toLowerCase().trim());

      if (items.length === 0) {
        showGlassModal(nomeConta, '<p style="color:var(--text-muted); text-align:center;">Nenhum lançamento encontrado para esta conta no período.</p>');
        return;
      }

      items.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dA||0) - (dB||0);
      });

      // Calcula o saldo cumulativo para TODOS os itens primeiro para ficar correto
      let saldoAcum = 0;
      items.forEach(item => {
        saldoAcum += item.valor;
        item._saldoAcum = saldoAcum;
      });

      // Limita aos 50 mais recentes
      const totalItens = items.length;
      let displayItems = items;
      let warnHtml = '';
      if (totalItens > 50) {
        displayItems = items.slice(-50); // Pega os últimos 50 (mais recentes)
        warnHtml = `<div style="background: rgba(239,68,68,0.1); border-left: 3px solid var(--color-expense); padding: 0.8rem; border-radius: 4px; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.85rem;">
                      <i class="fas fa-exclamation-triangle" style="color: var(--color-expense); margin-right: 5px;"></i>
                      Exibindo os 50 lançamentos mais recentes para evitar lentidão. Total no período: ${totalItens}.
                    </div>`;
      }

      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${totalItens} lançamento${totalItens > 1 ? 's' : ''} no período</div>`;
      html += warnHtml;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">Saldo</th></tr></thead><tbody>`;

      // Exibe a ordem decrescente (mais recentes no topo) para que o usuário veja os últimos logo de cara
      displayItems.reverse().forEach(item => {
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        const saldoClass = item._saldoAcum >= 0 ? 'extrato-saldo-pos' : 'extrato-saldo-neg';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || '-'}</td>
          <td style="color:var(--text-secondary); font-size:0.78rem;">${item.categoria || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(item.valor)}</td>
          <td style="text-align:right;" class="${saldoClass}">${formatBRL(item._saldoAcum)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;

      showGlassModal(`Extrato: ${nomeConta}`, html);
    };

    // NEW: Show cartoes de crédito modal
    window.showCartoesModal = function() {
      let total = 0;
      const cartoes = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('crédito') || t.includes('credito')) {
          total += c.saldo;
          return true;
        }
        return false;
      }).sort((a,b) => a.saldo - b.saldo);

      if (cartoes.length === 0) {
        showGlassModal('Cartões de Crédito', '<p style="color:var(--text-muted); text-align:center;">Nenhum cartão cadastrado.</p>');
        return;
      }

      const color = 'var(--color-expense)';
      let html = `<div style="margin-bottom:1.5rem; font-size:1.8rem; font-weight:bold; color:${color}; text-align:center;">${formatBRL(Math.abs(total))}</div>`;
      const maxVal = Math.max(...cartoes.map(c => Math.abs(c.saldo)), 1);
      cartoes.forEach(c => {
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

      showGlassModal('Cartões de Crédito', html);
      setTimeout(() => {
        document.querySelectorAll('[data-conta-extrato]').forEach(el => {
          el.addEventListener('click', () => window.showExtratoContaModal(el.dataset.contaExtrato));
        });
      }, 50);
    };

    // NEW: Show patrimônio total modal
    window.showConciliacaoModal = function() {
      const now = new Date();
      now.setHours(0,0,0,0);
      
      const contasComAtraso = [];
      dadosFinanceiros.contas.forEach(c => {
        let diffDays = 0;
        if (c.ultima_movimentacao) {
          const d = parseDateString(c.ultima_movimentacao);
          if (d) {
            d.setHours(0,0,0,0);
            diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            diffDays = 999;
          }
        } else {
           diffDays = 999; // Se não tem data, assume o maior atraso possível
        }
        contasComAtraso.push({ ...c, diffDays });
      });
      
      contasComAtraso.sort((a,b) => b.diffDays - a.diffDays);

      let html = `<div style="margin-bottom:1.5rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">Acompanhamento de Conciliação Bancária</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Conta</th><th>Últ. Movimentação</th><th style="text-align:right">Status</th></tr></thead><tbody>`;

      contasComAtraso.forEach(item => {
        let atrasoText = '';
        let color = 'var(--text-primary)';
        if (item.diffDays === 999 || !item.ultima_movimentacao) {
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
          <td style="color:var(--text-muted);">${item.ultima_movimentacao || '-'}</td>
          <td style="text-align:right; font-weight:600; color:${color};">${atrasoText}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      
      showGlassModal('Status de Conciliação', html);
    };

    window.showPatrimonioModal = function() {
      let saldoCC = 0, saldoInv = 0, saldoCartoes = 0;
      dadosFinanceiros.contas.forEach(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('crédito') || t.includes('credito')) {
          saldoCartoes += c.saldo;
        } else if (t.includes('investimento') || t.includes('aplicação') || t.includes('corretora')) {
          saldoInv += c.saldo;
        } else {
          saldoCC += c.saldo;
        }
      });
      const patrimonio = saldoCC + saldoInv + saldoCartoes;

      let html = `<div style="text-align:center; margin-bottom:2rem;">
        <div style="font-size:2rem; font-weight:bold; background:linear-gradient(to right, var(--color-income), #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${formatBRL(patrimonio)}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">Patrimônio Líquido Total</div>
      </div>`;

      const components = [
        { label: 'Contas Correntes', value: saldoCC, color: 'var(--color-income)' },
        { label: 'Investimentos', value: saldoInv, color: '#8b5cf6' },
        { label: 'Cartões de Crédito', value: saldoCartoes, color: 'var(--color-expense)' }
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
      const items = dadosFinanceiros.contas.filter(c => {
        const cType = (c.tipo || '').toLowerCase();
        const isInvAccount = cType.includes('investimento') || cType.includes('aplicação') || cType.includes('corretora');
        if (isInv && isInvAccount) { total += c.saldo; return true; }
        if (!isInv && !isInvAccount && !cType.includes('cartão') && !cType.includes('credito')) { total += c.saldo; return true; }
        return false;
      }).sort((a,b) => b.saldo - a.saldo);

      if (items.length === 0) {
        showGlassModal(isInv ? 'Investimentos' : 'Contas Correntes', '<p style="color:var(--text-muted);">Nenhuma conta encontrada.</p>');
        return;
      }

      const maxAbs = Math.max(...items.map(c => Math.abs(c.saldo)), 1);
      let html = `<div style="margin-bottom:1.5rem; font-size:1.8rem; font-weight:bold; color:${color}; text-align:center;">${formatBRL(total)}</div>`;
      items.forEach(c => {
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

      showGlassModal(isInv ? 'Relatório de Investimentos' : 'Relatório de Contas Correntes', html);
    };

    window.showAuditoriaModal = function() {
      const items = dadosFinanceiros.auditoria || [];
      if (items.length === 0) {
        showGlassModal('Auditoria', '<p style="color:var(--text-muted); text-align:center;">Tudo certo! Nenhuma pendência encontrada. ?</p>');
        return;
      }
      let html = `<p style="margin-bottom:1rem; color:var(--text-muted);">Os seguintes itens precisam da sua atenção:</p>`;
      items.forEach(a => {
        html += `
          <div style="background:rgba(239, 68, 68, 0.05); border-left:4px solid var(--color-expense); padding:1rem; margin-bottom:1rem; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <div style="font-weight:600; color:var(--color-expense); margin-bottom:0.3rem;"><i class="fas fa-exclamation-triangle"></i> ${a.item}</div>
            <div style="font-size:0.95rem; color:var(--text-primary); margin-bottom:0.5rem;">${a.descricao}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
              <span>Responsável: <b>${a.responsavel}</b></span>
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
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      alert("ERRO NO DASHBOARD!\n\nMensagem: " + msg + "\nLinha: " + lineNo + "\nColuna: " + columnNo + "\n\nPor favor, copie essa mensagem e mande para a IA consertar!");
      return false;
    };

    // Configurações do Feedback
    document.addEventListener('DOMContentLoaded', () => {
      const btnFeedback = document.getElementById('btnFeedback');
      const feedbackModal = document.getElementById('feedbackModal');
      const btnCloseFeedback = document.getElementById('btnCloseFeedback');
      const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
      const feedbackText = document.getElementById('feedbackText');
      // Necessitamos pegar o URL definido no outro script (é global)
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxr9YewljAU2MF9uZoV52tGVEZwFMaOD_Iyg7bxsekE8-RI4a0_8giiMbqzc_bYNDZxSQ/exec';

      if (btnFeedback) {
        btnFeedback.onclick = () => {
          feedbackModal.style.display = feedbackModal.style.display === 'none' ? 'block' : 'none';
        };
        
        btnCloseFeedback.onclick = () => {
          feedbackModal.style.display = 'none';
        }

        // Lógica do Modal Translúcido (Glassmorphism)
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

      const cartoes = dadosFinanceiros.contas.filter(c => {
        const t = (c.tipo || '').toLowerCase();
        return t.includes('cart') || t.includes('crédito') || t.includes('credito');
      });

      if (cartoes.length === 0) {
        dashboardEl.innerHTML = '<p style="color:var(--text-muted);">Nenhum cartão de crédito cadastrado.</p>';
        return;
      }

      let faturasAtual = [];
      let faturasProxima = [];

      cartoes.forEach(c => {
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
        <div class="metrics-grid" style="margin-bottom: 2rem; align-items: stretch;">
          <div class="card bg-card" style="display:flex; flex-direction:column;">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Fatura do Mês Atual</div>
            <div style="font-size:1.8rem; font-weight:700; color:${totalAtual < 0 ? 'var(--color-expense)' : 'var(--text-primary)'};">${formatBRL(totalAtual)}</div>
            <div style="margin-top:auto;">${renderFaturasList(faturasAtual)}</div>
          </div>
          <div class="card bg-card" style="display:flex; flex-direction:column;">
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Próximo Mês</div>
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
          <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem;">Projeção de Faturas (Próximos 6 Meses)</h3>
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

      cartoes.forEach(c => {
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
                <div style="color:var(--text-muted); font-size:0.65rem;">Fatura Atual</div>
                <div style="color:${faturaAtualCC < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaAtualCC)}</div>
              </div>
              <div style="text-align:right;">
                <div style="color:var(--text-muted); font-size:0.65rem;">Próxima Fatura</div>
                <div style="color:${faturaProximaCC < 0 ? 'var(--color-expense)' : 'var(--text-primary)'}; font-weight:600;">${formatBRL(faturaProximaCC)}</div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
              <div class="card-trend" style="color:var(--text-muted); font-size:0.75rem;">Clique para ver extrato</div>
              ${c.ultima_movimentacao ? `<div style="font-size: 0.75rem; font-weight:600; color: ${getDateColor(c.ultima_movimentacao)};"><i class="fas fa-history" style="margin-right: 3px;"></i>${c.ultima_movimentacao}</div>` : ''}
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
    // Lógica do COPILOT FINANCEIRO (Chat IA)
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
      const btnChatSend = document.getElementById('btn-chat-send');
      const chatInput = document.getElementById('chat-input');
      const chatMessages = document.getElementById('chat-messages');
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxr9YewljAU2MF9uZoV52tGVEZwFMaOD_Iyg7bxsekE8-RI4a0_8giiMbqzc_bYNDZxSQ/exec';
      
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
            
            // Adiciona a resposta da IA no chat
            addMessage(respostaIA.mensagem, false);
            historicoChat.push({ role: 'assistant', content: respostaIA.mensagem });
            
            // Aplica as alterações na tabela global
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
                } catch(e) { console.error("Erro ao aplicar alteração:", e); }
              });
              
            }
          } else {
            addMessage("Desculpe, ocorreu um erro do servidor: " + (result.message || "Tente novamente."), false);
          }
        } catch (error) {
          addMessage("Erro interno do painel: " + error.message, false);
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
    });

