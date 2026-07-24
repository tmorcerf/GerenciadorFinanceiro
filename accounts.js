class AccountManager extends window.StoreManager {
  constructor() {
    super('Contas', 'contas', 'account_state_changed');
  }
  
  onDataUpdated() {
    // Quando as contas mudarem, avisa o CategoryManager para reconstruir o dicionÃ¡rio
    if (window.categoryManager && typeof window.categoryManager.rebuildCategoriasDict === 'function') {
        window.categoryManager.rebuildCategoriasDict();
    }
  }

  async checkAndCreateAccount(nome, tipo, saldo_inicial = 0, conciliado_ate = null) {
      if (!nome || nome.trim() === '') return null;
      const nomeStr = nome.trim();
      const nLower = nomeStr.toLowerCase();

      // R2: Do not auto-create pending destination or generic placeholder accounts
      if (nLower === 'pendente de destino' || nLower === 'pendente' || nLower === 'unassigned' || 
          nLower === 'desconhecido' || nLower === 'desconhecida' || nLower === 'indefinido' || 
          nLower === 'indefinida' || nLower === 'sem destino' || nLower === 'dinheiro' || 
          nLower === 'carteira' || nLower === 'diversos') {
          return null;
      }
      
      const contaExistente = (this.data || []).find(c => (c.nome || '').toLowerCase() === nLower);
      if (contaExistente) return contaExistente.id;
      
      return await this.createAccount({
          nome: nomeStr,
          tipo: tipo || 'Conta Corrente',
          saldo_inicial: saldo_inicial,
          saldo: saldo_inicial,
          conciliado_ate: conciliado_ate
      });
  }

  recalcularSaldo(nomeConta, lancamentos = null) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      const txs = lancamentos || (win.dadosFinanceiros ? win.dadosFinanceiros.lancamentos : []) || (win.transactionManager ? win.transactionManager.data : []) || [];
      
      if (nomeConta) {
          const nLower = String(nomeConta).trim().toLowerCase();
          const contaObj = (this.data || []).find(c => (c.nome || '').trim().toLowerCase() === nLower);
          const saldoInicial = contaObj ? (parseFloat(contaObj.saldo_inicial) || 0) : 0;
          let hasSaldoTx = false;
          let total = 0;
          
          txs.forEach(l => {
              const lContaLower = (l.conta || '').trim().toLowerCase();
              if (lContaLower === nLower) {
                  if ((l.categoria || '').toLowerCase().trim() === 'saldo inicial') {
                      hasSaldoTx = true;
                  }
                  total += (parseFloat(l.valor) || 0);
              }
          });
          return hasSaldoTx ? total : total + saldoInicial;
      }

      (this.data || []).forEach(c => {
          const nLower = (c.nome || '').trim().toLowerCase();
          const saldoInicial = parseFloat(c.saldo_inicial) || 0;
          let hasSaldoTx = false;
          let total = 0;
          
          txs.forEach(l => {
              const lContaLower = (l.conta || '').trim().toLowerCase();
              if (lContaLower === nLower) {
                  if ((l.categoria || '').toLowerCase().trim() === 'saldo inicial') {
                      hasSaldoTx = true;
                  }
                  total += (parseFloat(l.valor) || 0);
              }
          });
          c.saldo = hasSaldoTx ? total : total + saldoInicial;
      });
  }

  async createAccount(payload) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB || !win.userGroupId) throw new Error("Sistema não inicializado.");
      const docRef = win.firebaseDB.collection(this.collectionName).doc();
      await docRef.set({
          groupId: win.userGroupId,
          createdAt: new Date().toISOString(),
          ...payload
      });
      return docRef.id;
  }

  async updateAccount(id, payload) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB) return;
      
      // Validação de segurança: Saldo inicial não pode ser editado em contas conciliadas
      if (payload.saldo_inicial !== undefined) {
          const acc = (this.data || []).find(c => c.id === id);
          if (acc && acc.conciliado_ate) {
              throw new Error("Não é possível alterar o saldo inicial de uma conta com conciliação ativa.");
          }
      }
      
      await win.firebaseDB.collection(this.collectionName).doc(id).update(payload);
  }

  async deleteAccount(id) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB) return;
      await win.firebaseDB.collection(this.collectionName).doc(id).delete();
  }
}

const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
win.AccountManager = AccountManager;
if (!win.accountManager) {
    win.accountManager = new AccountManager();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AccountManager };
}

