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
      if (!nome) return null;
      const nLower = nome.trim().toLowerCase();
      
      const contaExistente = this.data.find(c => (c.nome || '').toLowerCase() === nLower);
      if (contaExistente) return contaExistente.id;
      
      return await this.createAccount({
          nome: nome.trim(),
          tipo: tipo || 'Conta Corrente',
          saldo_inicial: saldo_inicial,
          saldo: saldo_inicial,
          conciliado_ate: conciliado_ate
      });
  }

  async createAccount(payload) {
      if (!window.firebaseDB || !window.userGroupId) throw new Error("Sistema nÃ£o inicializado.");
      const docRef = window.firebaseDB.collection(this.collectionName).doc();
      await docRef.set({
          groupId: window.userGroupId,
          createdAt: new Date().toISOString(),
          ...payload
      });
      return docRef.id;
  }

  async updateAccount(id, payload) {
      if (!window.firebaseDB) return;
      
      // ValidaÃ§Ã£o de seguranÃ§a: Saldo inicial nÃ£o pode ser editado em contas conciliadas
      if (payload.saldo_inicial !== undefined) {
          const acc = this.data.find(c => c.id === id);
          if (acc && acc.conciliado_ate) {
              throw new Error("NÃ£o Ã© possÃ­vel alterar o saldo inicial de uma conta com conciliaÃ§Ã£o ativa.");
          }
      }
      
      await window.firebaseDB.collection(this.collectionName).doc(id).update(payload);
  }

  async deleteAccount(id) {
      if (!window.firebaseDB) return;
      await window.firebaseDB.collection(this.collectionName).doc(id).delete();
  }
}
window.accountManager = new AccountManager();
