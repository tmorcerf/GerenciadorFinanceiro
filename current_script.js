
let dadosFinanceiros = { lancamentos: [], orcamento: [], contas: [], auditoria: [], importacoes: [] };
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.error("ERRO NO DASHBOARD!\n\nMensagem: " + msg + "\nLinha: " + lineNo + "\nColuna: " + columnNo);
      return false;
    };
    const CSV_URL_LANCAMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=0';
    const CSV_URL_ORCAMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1770446607';
    const CSV_URL_CONTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1019128251';
    const CSV_URL_AUDITORIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=279877792';
    const CSV_URL_IMPORTACOES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLH7461ccd_LohlJm_U_4lEpG4lvALEsnwUDlfpmfJH6PLakeOt7U_0hqel8EsS_0Zt8RQF996iZEs/pub?output=csv&gid=1791414224';
    const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqLpSwGCcDhmbXrVKlhwiIq7LH89RjK0dOU2EoWRnIl_K4F2tHqXdluQVguY16-mNxZw/exec';


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

    // V2.1: Favorites helper (in-memory + localStorage fallback)
    // localStorage is blocked inside Google Sites iframes, so we use window._budgetFavorites
    window._budgetFavorites = [];
                // Helpers Re-injected
    let currentMonth = 'current';
    let currentAccount = 'all';
    let customDateStart = '';
    let customDateEnd = '';

    function parseDateString(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }

    function formatBRL(val) {
      return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getFilteredTransactions() {
      if (!dadosFinanceiros || !dadosFinanceiros.lancamentos) return [];
      let res = dadosFinanceiros.lancamentos;
      
      if (currentAccount !== 'all') {
        res = res.filter(l => l.conta === currentAccount);
      }
      
      if (currentMonth === 'current') {
        const now = new Date();
        res = res.filter(l => {
          const d = parseDateString(l.data);
          return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (currentMonth === 'previous') {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        res = res.filter(l => {
          const d = parseDateString(l.data);
          return d && d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
        });
      } else if (currentMonth === 'year') {
        const now = new Date();
        res = res.filter(l => {
          const d = parseDateString(l.data);
          return d && d.getFullYear() === now.getFullYear();
        });
      } else if (currentMonth === 'custom' && customDateStart && customDateEnd) {
        const s = new Date(customDateStart);
        const e = new Date(customDateEnd);
        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        res = res.filter(l => {
          const d = parseDateString(l.data);
          return d && d >= s && d <= e;
        });
      }
      return res;
    }

    function showGlassModal(title, htmlContent) {
      const modal = document.getElementById('transaction-modal');
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-table-container');
      if(modal && modalTitle && modalBody) {
         modalTitle.textContent = title;
         modalBody.innerHTML = htmlContent;
         modal.classList.add('active');
      }
    }
    
    function closeGlassModal() {
      const modal = document.getElementById('transaction-modal');
      if(modal) modal.classList.remove('active');
    }
    
    window.closeGlassModal = closeGlassModal;
    
    window.showCategoryDrilldown = function(categoria) {
      const filtered = getFilteredTransactions();
      const catTxs = filtered.filter(l => (l.categoria || '').toLowerCase().trim() === categoria.toLowerCase().trim() && l.valor < 0);
      
      if(catTxs.length === 0) {
        showGlassModal(categoria, '<p style="color:var(--text-secondary); text-align:center;">Nenhum gasto neste perÃ­odo.</p>');
        return;
      }
      
      catTxs.sort((a,b) => {
         const da = parseDateString(a.data)||0; const db = parseDateString(b.data)||0;
         return db - da;
      });
      
      let html = `<table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
            <th style="padding:0.5rem;">Data</th>
            <th style="padding:0.5rem;">DescriÃ§Ã£o</th>
            <th style="padding:0.5rem;">Conta</th>
            <th style="padding:0.5rem; text-align:right;">Valor</th>
          </tr>
        </thead>
        <tbody>`;
        
      catTxs.forEach(item => {
        html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding:0.5rem; color:var(--text-secondary);">${item.data}</td>
          <td style="padding:0.5rem; color:var(--text-primary);">${item.obs || '-'}</td>
          <td style="padding:0.5rem; color:var(--text-secondary);">${item.conta || '-'}</td>
          <td style="padding:0.5rem; text-align:right; color:var(--color-expense); font-weight:600;">${formatBRL(Math.abs(item.valor))}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      showGlassModal(categoria, html);
    };

    function normalizeCat(c) { return (c || '').trim().toLowerCase(); }

    function getFavorites() {
      // spreadsheet fallback
      if (!window._budgetFavorites || window._budgetFavorites.length === 0) {
         if (typeof dadosFinanceiros !== 'undefined' && dadosFinanceiros.orcamento) {
            let preFavs = [];
            dadosFinanceiros.orcamento.forEach(o => {
               const keys = Object.keys(o);
               if (keys.length > 1) {
                  const bVal = String(o[keys[1]]).trim().toLowerCase();
                  if (bVal === 'sim' || bVal === 's' || bVal === 'true' || bVal === 'x') {
                     preFavs.push(normalizeCat(o.categoria));
                  } else {
                     for (let k of keys) {
                        const kl = k.toLowerCase();
                        if (kl.includes('pre') || kl.includes('fav')) {
                           const val = String(o[k]).trim().toLowerCase();
                           if (val === 'sim' || val === 's' || val === 'true' || val === 'x') {
                              if (!preFavs.includes(normalizeCat(o.categoria))) preFavs.push(normalizeCat(o.categoria));
                           }
                        }
                     }
                  }
               }
            });
            window._budgetFavorites = preFavs;
         }
      }
      // load from localStorage if possible
      try {
         const stored = localStorage.getItem('budgetFavorites');
         if (stored !== null) window._budgetFavorites = JSON.parse(stored).map(normalizeCat);
      } catch(e) {}
      return window._budgetFavorites || [];
    }

    function saveFavorites(arr) {
      window._budgetFavorites = arr.map(normalizeCat);
      try { localStorage.setItem('budgetFavorites', JSON.stringify(window._budgetFavorites)); } catch(e) {}
      renderBudgets();
    }

    function renderBudgets() {
      const budgetContainer = document.getElementById('budget-container');
      if (!budgetContainer) return;
      budgetContainer.innerHTML = '';
      if (!dadosFinanceiros.orcamento || dadosFinanceiros.orcamento.length === 0) {
        budgetContainer.innerHTML = '<p style="color: var(--text-muted);">Nenhuma meta de orÃ§amento definida.</p>';
        return;
      }

      const filtered = getFilteredTransactions();
      const favorites = getFavorites();

      function getCardData(o) {
        const annualLimit = Math.abs(o.orcamento);
        let periodMonths = 12;
        if (currentMonth === 'current' || currentMonth === 'previous') periodMonths = 1;
        else if (currentMonth === 'year') periodMonths = 12;
        else if (currentMonth === 'custom' && customDateStart && customDateEnd) {
          const s = new Date(customDateStart);
          const e = new Date(customDateEnd);
          periodMonths = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.44)));
        }
        const limit = annualLimit * (periodMonths / 12);
        let dynamicSpent = 0;
        const catTxs = [];
        filtered.forEach(l => {
          if ((l.categoria || '').toLowerCase().trim() === o.categoria.toLowerCase().trim() && l.valor < 0) {
            dynamicSpent += Math.abs(l.valor);
            catTxs.push(l);
          }
        });
        const spent = dynamicSpent;
        const remaining = limit - spent;
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const isBurst = spent > limit;
        return { limit, spent, remaining, pct, isBurst, catTxs };
      }

      function buildBudgetCard(o, isFav) {
        const d = getCardData(o);
        const starClass = isFav ? 'active' : '';
        return `
          <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative;">
            <div class="budget-title-row">
              <div style="display:flex; align-items:center;">
                <span class="budget-star ${starClass}" data-star-cat="${o.categoria}" title="Favoritar">&#9733;</span>
                <span class="budget-cat-name">${o.categoria}</span>
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

      function buildDetailedBudgetCard(o) {
        const d = getCardData(o);
        
        // Sort txs by date descending
        const recent = d.catTxs.sort((a,b) => {
           const da = parseDateString(a.data)||0; const db = parseDateString(b.data)||0;
           return db - da;
        }).slice(0, 4);

        let txHtml = '<div style="margin-top: 1.2rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1);">';
        txHtml += '<span style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem; display:block; font-weight:600; letter-spacing:0.5px;">Ãšltimas TransaÃ§Ãµes</span>';
        if (recent.length === 0) {
           txHtml += '<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 0.5rem;">Nenhum gasto neste perÃ­odo.</p>';
        } else {
           txHtml += '<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.6rem;">';
           recent.forEach(tx => {
             txHtml += `
               <li style="display:flex; justify-content:space-between; font-size:0.85rem; align-items:center;">
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
          <div class="card budget-card clickable-card" data-budget-cat="${o.categoria}" style="cursor:pointer; position:relative; background: linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95)); border: 1px solid rgba(59, 130, 246, 0.4);">
            <div class="budget-title-row" style="margin-bottom: 1.2rem;">
              <div style="display:flex; align-items:center;">
                <span class="budget-star active" data-star-cat="${o.categoria}" title="Desfavoritar" style="font-size: 1.4rem;">&#9733;</span>
                <span class="budget-cat-name" style="font-size: 1.1rem; color: #fff;">${o.categoria}</span>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">Teto de Gastos</span>
                <span class="budget-limit" style="font-size: 1rem; color: var(--text-primary);">${formatBRL(d.limit)}</span>
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.9rem;">
               <span style="color:var(--text-secondary);">Realizado: <span style="color:var(--text-primary); font-weight:600;">${formatBRL(d.spent)}</span></span>
               <span style="color:${d.remaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}; font-weight:600;">${d.remaining >= 0 ? 'Sobra: ' : 'Estourou: '}${formatBRL(Math.abs(d.remaining))}</span>
            </div>
            
            <div class="budget-progress-bar" style="height: 10px; border-radius: 5px;">
              <div class="budget-progress-fill ${d.isBurst ? 'over' : ''}" style="width: ${Math.min(d.pct, 100)}%; border-radius: 5px;"></div>
            </div>
            
            ${txHtml}
          </div>
        `;
      }

      let html = '';

      const favOrcamentos = dadosFinanceiros.orcamento.filter(o => favorites.includes(normalizeCat(o.categoria)) && o.categoria !== 'TOTAL' && o.categoria !== 'Sobra');
      
      if (favOrcamentos.length > 0) {
         html += '<h3 style="margin-top: 0.5rem; margin-bottom: 1.5rem; color: var(--text-primary); font-size: 1.3rem; display:flex; align-items:center; gap: 8px;"><span style="color:#fbbf24;">&#9733;</span> Metas em Destaque</h3>';
         html += '<div class="budget-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-bottom: 3.5rem;">';
         favOrcamentos.forEach(o => {
            html += buildDetailedBudgetCard(o);
         });
         html += '</div>';
         
         html += '<h3 style="margin-bottom: 1.5rem; color: var(--text-primary); font-size: 1.3rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem;">&#128194; Todas as Categorias</h3>';
      }

      html += '<div class="budget-grid">';
      
      // All cards
      dadosFinanceiros.orcamento.forEach(o => {
        if (o.categoria === 'TOTAL' || o.categoria === 'Sobra') return;
        html += buildBudgetCard(o, favorites.includes(normalizeCat(o.categoria)));
      });
      html += '</div>';

      budgetContainer.innerHTML = html;

      setTimeout(() => {
                budgetContainer.querySelectorAll('.budget-star').forEach(star => {
          star.addEventListener('click', (e) => {
            e.stopPropagation();
            const cat = normalizeCat(star.dataset.starCat);
            let favs = getFavorites();
            if (favs.includes(cat)) {
              favs = favs.filter(f => f !== cat);
            } else {
              favs.push(cat);
            }
            saveFavorites(favs);
          });
        });
        });

        budgetContainer.querySelectorAll('.clickable-card').forEach(card => {
          card.addEventListener('click', () => {
            const cat = card.dataset.budgetCat;
            if (cat) window.showCategoryDrilldown(cat);
          });
        });
      }, 0);
    }

        let sidebarChart = null;
    let barChart = null;

    function initCharts() {
      const canvasEvo = document.getElementById('sidebar-evolution-chart');
      if (canvasEvo) {
        sidebarChart = new Chart(canvasEvo.getContext('2d'), {
          type: 'line',
          data: { labels: [], datasets: [{ label: 'EvoluÃ§Ã£o', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
          }
        });
      }
      
      const canvasBar = document.getElementById('top-bar-chart');
      if (canvasBar) {
        barChart = new Chart(canvasBar.getContext('2d'), {
          type: 'bar',
          data: { labels: ['Receitas', 'Despesas'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#f43f5e'], borderRadius: 4 }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { display: false } }
          }
        });
      }
    }

    function updateCharts() {
      const filtered = getFilteredTransactions();
      
      // Update Line Chart
      if (sidebarChart) {
        let balance = 0;
        const dailyBalances = [];
        const labels = [];
        
                const sorted = [...filtered].sort((a,b) => {
          const da = parseDateString(a.data);
          const db = parseDateString(b.data);
          if (!da) return -1;
          if (!db) return 1;
          return da - db;
        });
        
        // Compute running balance based on just this period
        // Or if we want an accurate balance, we just sum up what we have.
        sorted.forEach(l => {
          balance += l.valor;
          dailyBalances.push(balance);
          // Just use the day/month for better formatting
          const dateParts = (l.data||'').split('/');
          labels.push(dateParts.length >= 2 ? `${dateParts[0]}/${dateParts[1]}` : l.data);
        });

        // If no data, push a dummy zero so it's not totally blank
        if(dailyBalances.length === 0) { dailyBalances.push(0); labels.push(''); }

        sidebarChart.data.labels = labels;
        sidebarChart.data.datasets[0].data = dailyBalances;
        sidebarChart.update();
      }

      // Update Bar Chart
      if (barChart) {
        let inc = 0; let exp = 0;
        filtered.forEach(l => {
          const cat = (l.categoria || '').toLowerCase();
          if (cat.includes('transfer') || cat.includes('saldo inicial')) return;
          if (l.valor > 0) inc += l.valor;
          else exp += Math.abs(l.valor);
        });
        barChart.data.datasets[0].data = [inc, exp];
        barChart.update();
      }
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
      showGlassModal(categoria, html);
    };

    // Global Error Handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      alert("ERRO NO DASHBOARD!\n\nMensagem: " + msg + "\nLinha: " + lineNo + "\nColuna: " + columnNo);
      return false;
    };

    // Feedback
    document.addEventListener('DOMContentLoaded', () => {
      const btnFeedback = document.getElementById('btnFeedback');
      const feedbackModal = document.getElementById('feedbackModal');
      const btnCloseFeedback = document.getElementById('btnCloseFeedback');
      const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
      const feedbackText = document.getElementById('feedbackText');
      const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqLpSwGCcDhmbXrVKlhwiIq7LH89RjK0dOU2EoWRnIl_K4F2tHqXdluQVguY16-mNxZw/exec';

      if (btnFeedback) {
        btnFeedback.onclick = () => {
          feedbackModal.style.display = feedbackModal.style.display === 'none' ? 'block' : 'none';
        };
        
        btnCloseFeedback.onclick = () => {
          feedbackModal.style.display = 'none';
        }

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
              body: JSON.stringify({ action: 'sugestao', texto: text })
            });
            alert('Sugestão enviada!');
            feedbackText.value = '';
            feedbackModal.style.display = 'none';
          } catch (e) {
            alert('Erro: ' + e.message);
          } finally {
            btnSubmitFeedback.innerText = 'Enviar Sugestão';
            btnSubmitFeedback.disabled = false;
          }
        };
      }
    });


