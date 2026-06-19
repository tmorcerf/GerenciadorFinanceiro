
// Error Handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      alert("ERRO NO DASHBOARD!\n\nMensagem: " + msg + "\nLinha: " + lineNo + "\nColuna: " + columnNo + "\n\nCopie essa mensagem e mande para a IA!");
      return false;
    };
    // ==========================================
    // CONFIGURAÇÃO DOS LINKS DO GOOGLE SHEETS
    // ==========================================
    // Substitua os links abaixo após publicar as abas correspondentes na Web como CSV
    // No Planilhas Google: Arquivo > Compartilhar > Publicar na Web
    // Escolha a aba correspondente e o formato "Valores separados por vírgula (.csv)"
    const CSV_URL_LANCAMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=0';
    const CSV_URL_ORCAMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1770446607';
    const CSV_URL_CONTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1019128251';
    const CSV_URL_AUDITORIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=279877792';
    const CSV_URL_IMPORTACOES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1791414224';
    const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqLpSwGCcDhmbXrVKlhwiIq7LH89RjK0dOU2EoWRnIl_K4F2tHqXdluQVguY16-mNxZw/exec';

    // Global Data State
    // dadosFinanceiros is loaded from dados.js directly

    // DOM Elements
    const sidebarLinks = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.dashboard-panel');
    const monthFilter = document.getElementById('month-filter');
    const accountFilter = document.getElementById('account-filter');

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
    let currentMonth = 'current';
    let currentAccount = 'all';
    let searchQuery = '';
    let customDateStart = '';
    let customDateEnd = '';
    const rowsPerPage = 15;

    let monthlyChart = null;
    let categoryChart = null;

    // Helpers
    function parseDateString(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
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
          saldo: parseBrlFloat(c['Saldo']),
          conciliado_ate: c['Conciliado até'] || '',
          saldo_lancado: parseBrlFloat(c['Saldo lançado']),
          saldo_apurado: parseBrlFloat(c['Saldo Apurado'])
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

    // App Initialize Logic
    async function init() {
      setupNavigation();
      
      const success = await loadDataFromSheets();
      if (!success) return; // Stop if sheets are not loaded

      populateFilters();
      updateOverview();
      renderBudgets();
      renderAccounts();
      renderInvestments();
      renderAudit();
      // Removemos as chamadas para renderTransactionsTable pois criaremos o Executive Summary
      
      initCharts();

      // Events listeners
      const customDateContainer = document.getElementById('custom-date-container');
      const dateStartInput = document.getElementById('date-start');
      const dateEndInput = document.getElementById('date-end');

      if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
          currentMonth = e.target.value;
          if (currentMonth === 'custom') {
            customDateContainer.style.display = 'flex';
          } else {
            customDateContainer.style.display = 'none';
          }
          updateOverview();
          updateCharts();
        });
      }

      if (dateStartInput) {
        dateStartInput.addEventListener('change', (e) => {
          customDateStart = e.target.value;
          updateOverview();
          updateCharts();
        });
      }

      if (dateEndInput) {
        dateEndInput.addEventListener('change', (e) => {
          customDateEnd = e.target.value;
          updateOverview();
          updateCharts();
        });
      }

      if (accountFilter) {
        accountFilter.addEventListener('change', (e) => {
          currentAccount = e.target.value;
          updateOverview();
          updateCharts();
        });
      }

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
            } else {
              panel.classList.remove('active');
            }
          });
        });
      });
    }

    function populateFilters() {
      // monthFilter HTML já possui as opções 'current', 'previous', 'year' e 'custom'
      // O accountFilter precisa ser populado dinamicamente

      const accountsSet = new Set();
      dadosFinanceiros.lancamentos.forEach(l => {
        if (l.conta) accountsSet.add(l.conta);
      });

      Array.from(accountsSet).sort().forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        accountFilter.appendChild(option);
      });
    }

    function getFilteredTransactions() {
      const now = new Date();
      const currYearStr = now.getFullYear().toString();
      const currMonthStr = `${currYearStr}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let prevNow = new Date();
      prevNow.setMonth(prevNow.getMonth() - 1);
      const prevMonthStr = `${prevNow.getFullYear()}-${String(prevNow.getMonth() + 1).padStart(2, '0')}`;

      const sD = customDateStart ? new Date(customDateStart + "T00:00:00") : new Date(0);
      const eD = customDateEnd ? new Date(customDateEnd + "T23:59:59") : new Date("2100-01-01");

      return dadosFinanceiros.lancamentos.filter(l => {
        if (!l.data) return false;
        
        // Month filter
        if (currentMonth !== 'all') {
          const parts = l.data.split('/');
          if (parts.length !== 3) return false;
          const yyyy_mm = `${parts[2]}-${parts[1]}`;
          
          if (currentMonth === 'current' && yyyy_mm !== currMonthStr) return false;
          if (currentMonth === 'previous' && yyyy_mm !== prevMonthStr) return false;
          if (currentMonth === 'year' && parts[2] !== currYearStr) return false;
          if (currentMonth === 'custom') {
            const d = parseDateString(l.data);
            if (d < sD || d > eD) return false;
          }
        }

        if (currentAccount !== 'all') {
          if (l.conta !== currentAccount) return false;
        }

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

    function updateOverview() {
      const filtered = getFilteredTransactions();
      
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
      const expenseGroup = {};
      filtered.forEach(l => {
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
            li.addEventListener('click', () => window.showCategoryDrilldown(item.name));
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
        transactionsTabl    function getCardPeriod(cat) {
      try {
         const stored = localStorage.getItem('budgetCardPeriods');
         if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed[cat]) return parsed[cat];
         }
      } catch(e) {}
      return 'current';
    }

    function saveCardPeriod(cat, period) {
      try {
         let parsed = {};
         const stored = localStorage.getItem('budgetCardPeriods');
         if (stored) parsed = JSON.parse(stored);
         parsed[cat] = period;
         localStorage.setItem('budgetCardPeriods', JSON.stringify(parsed));
      } catch(e) {}
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
      const cardPer = getCardPeriod(o.categoria);
      const isFav = getFavorites().includes(normalizeCat(o.categoria));
      const d = getCardData(o, cardPer);
      
      const recent = d.catTxs.sort((a,b) => {
         const da = new Date(a.data.split('/').reverse().join('-'))||0; 
         const db = new Date(b.data.split('/').reverse().join('-'))||0;
         return db - da;
      });
      const recentSliced = recent.slice(0, 6);
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
      if (recentSliced.length === 0) {
         txHtml += '<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 1rem;">Nenhum gasto neste período.</p>';
      } else {
         txHtml += '<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.8rem;">';
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

    function buildBudgetCard(o, isFav) {
      const cardPer = getCardPeriod(o.categoria);
      const d = getCardData(o, cardPer);
      const starClass = isFav ? 'active' : '';
      return `
        <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative;">
          <div class="budget-title-row">
            <div style="display:flex; align-items:center; gap: 6px;">
              <span class="budget-star ${starClass}" data-star-cat="${o.categoria}" title="Favoritar">&#9733;</span>
              <span class="budget-cat-name" style="margin-left:4px;">${o.categoria}</span>
            </div>
            <span class="budget-limit">Teto: ${formatBRL(d.limit)}</span>
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
          </div>
        </div>
      `;
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
          saveCardPeriod(cat, opt.dataset.val);
          opt.parentElement.classList.remove('show');
          openDetailedCardModal(cat);
          renderBudgets();
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
      budgetContainer.innerHTML = '';
      if (!dadosFinanceiros.orcamento || dadosFinanceiros.orcamento.length === 0) {
        budgetContainer.innerHTML = '<p style="color: var(--text-muted);">Nenhuma meta de orçamento definida.</p>';
        return;
      }

      const favorites = getFavorites();
      
      const favItems = dadosFinanceiros.orcamento.filter(o => 
        o.categoria !== 'TOTAL' && o.categoria !== 'Sobra' && favorites.includes(normalizeCat(o.categoria))
      );

      let html = '';
      if (favItems.length > 0) {
        html += `<div class="budget-favorites-section">
          <div class="budget-favorites-title">⭐ Favoritos</div>
          <div class="budget-grid">`;
        favItems.forEach(o => { html += buildBudgetCard(o, true); });
        html += `</div></div>`;
      }

      html += `<div class="budget-grid">`;
      dadosFinanceiros.orcamento.forEach(o => {
        if (o.categoria === 'TOTAL' || o.categoria === 'Sobra') return;
        const isFav = favorites.includes(normalizeCat(o.categoria));
        html += buildBudgetCard(o, isFav);
      });
      html += `</div>`;

      budgetContainer.innerHTML = html;

      setTimeout(() => {
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
        'Cartões de Crédito': []
      };
      let totalCC = 0, totalCartoes = 0, totalInv = 0;

      dadosFinanceiros.contas.forEach(c => {
        const t = (c.tipo || '').toLowerCase();
        if (t.includes('cart') || t.includes('crédito') || t.includes('credito')) {
          groups['Cartões de Crédito'].push(c);
          totalCartoes += c.saldo;
        } else if (t.includes('investimento') || t.includes('aplicação') || t.includes('corretora')) {
          totalInv += c.saldo;
        } else {
          groups['Contas Correntes'].push(c);
          totalCC += c.saldo;
        }
      });

      const patrimonio = totalCC + totalInv + totalCartoes;

      let html = `
        <div class="patrimonio-card-hero" id="patrimonio-hero">
          <div class="patrimonio-label">Patrimônio Líquido</div>
          <div class="patrimonio-value">${formatBRL(patrimonio)}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.75rem;">Clique para ver composição</div>
        </div>
      `;

      html += `<div style="display:flex; flex-direction:column; gap:2.5rem;">`;
      
      const iconMap = {
        'Contas Correntes': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></svg>',
        'Cartões de Crédito': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>'
      };

      const colorMap = {
        'Contas Correntes': 'income',
        'Cartões de Crédito': 'expense'
      };

      const subtotals = {
        'Contas Correntes': totalCC,
        'Cartões de Crédito': totalCartoes
      };

      const subtotalColors = {
        'Contas Correntes': 'var(--color-income)',
        'Cartões de Crédito': 'var(--color-expense)'
      };

      for (const groupName of ['Contas Correntes', 'Cartões de Crédito']) {
        const contas = groups[groupName];
        if (contas.length === 0) continue;

        html += `<div>
          <div class="subtotal-row">
            <span style="color:var(--text-primary);">${groupName}</span>
            <span style="color:${subtotalColors[groupName]};">${formatBRL(subtotals[groupName])}</span>
          </div>
          <div class="metrics-grid">
        `;

        contas.forEach(c => {
          const cName = c.nome || c.conta || 'Conta';
          html += `
            <div class="card ${colorMap[groupName]}-card clickable-card" data-conta-name="${cName}" style="cursor:pointer;">
              <div class="card-header">
                <span>${cName}</span>
                <div class="card-icon">${iconMap[groupName]}</div>
              </div>
              <div class="card-value" style="font-size:1.6rem;">${formatBRL(c.saldo)}</div>
              <div class="card-trend" style="color:var(--text-muted);">Clique para ver extrato</div>
            </div>
          `;
        });
        html += `</div></div>`;
      }

      html += `</div>`;
      container.innerHTML = html;

      setTimeout(() => {
        const heroCard = document.getElementById('patrimonio-hero');
        if (heroCard) heroCard.addEventListener('click', () => window.showPatrimonioModal());

        container.querySelectorAll('[data-conta-name]').forEach(card => {
          card.addEventListener('click', () => {
            window.showExtratoContaModal(card.dataset.contaName);
          });
        });
      }, 0);
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
            window.showExtratoContaModal(card.dataset.invName);
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
      const filtered = getFilteredTransactions();
      const monthlyData = {};
      
      filtered.forEach(l => {
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

      const categoryData = {};
      filtered.forEach(l => {
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
      window.showReceitasDespesasModal(type);
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

    window.showReceitasDespesasModal = function(type) {
      const isIncome = type === 'incomes';
      const filtered = getFilteredTransactions();
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
              <span style="color:var(--text-primary); font-weight:500;"><span id="${iconId}" class="drilldown-expand-icon">?</span>${cat}</span>
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
    window.showCategoryDrilldown = function(categoria) {
      const filtered = getFilteredTransactions();
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
    window.showExtratoContaModal = function(nomeConta) {
      const filtered = getFilteredTransactions();
      const items = filtered.filter(l => (l.conta || '').toLowerCase().trim() === nomeConta.toLowerCase().trim());

      if (items.length === 0) {
        showGlassModal(nomeConta, '<p style="color:var(--text-muted); text-align:center;">Nenhum lançamento encontrado para esta conta no período.</p>');
        return;
      }

      items.sort((a,b) => {
        const dA = parseDateString(a.data), dB = parseDateString(b.data);
        return (dA||0) - (dB||0);
      });

      let saldoAcum = 0;
      let html = `<div style="margin-bottom:1rem; text-align:center; font-size:0.85rem; color:var(--text-muted);">${items.length} lançamento${items.length > 1 ? 's' : ''} no período</div>`;
      html += `<table class="extrato-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">Saldo</th></tr></thead><tbody>`;

      items.forEach(item => {
        saldoAcum += item.valor;
        const valColor = item.valor >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
        const saldoClass = saldoAcum >= 0 ? 'extrato-saldo-pos' : 'extrato-saldo-neg';
        html += `<tr>
          <td style="color:var(--text-muted);">${item.data}</td>
          <td>${item.obs || '-'}</td>
          <td style="color:var(--text-secondary); font-size:0.78rem;">${item.categoria || '-'}</td>
          <td style="text-align:right; color:${valColor}; font-weight:600;">${formatBRL(item.valor)}</td>
          <td style="text-align:right;" class="${saldoClass}">${formatBRL(saldoAcum)}</td>
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
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqLpSwGCcDhmbXrVKlhwiIq7LH89RjK0dOU2EoWRnIl_K4F2tHqXdluQVguY16-mNxZw/exec';

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
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
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
// ==========================================
    // Lógica do COPILOT FINANCEIRO (Chat IA)
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
      const btnChatSend = document.getElementById('btn-chat-send');
      const chatInput = document.getElementById('chat-input');
      const chatMessages = document.getElementById('chat-messages');
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqLpSwGCcDhmbXrVKlhwiIq7LH89RjK0dOU2EoWRnIl_K4F2tHqXdluQVguY16-mNxZw/exec';
      
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

