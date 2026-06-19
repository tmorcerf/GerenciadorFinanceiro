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

    
