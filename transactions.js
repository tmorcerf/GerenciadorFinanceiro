class TransactionManager extends window.StoreManager {
  constructor() {
    super('Lancamentos', 'lancamentos', 'transaction_state_changed');
  }

  async createTransaction(payload) {
      if (!window.firebaseDB || !window.userGroupId) throw new Error("Sistema nÃ£o inicializado.");
      
      const docRef = window.firebaseDB.collection(this.collectionName).doc();
      const transactionData = {
          groupId: window.userGroupId,
          createdAt: new Date().toISOString(),
          ...payload
      };
      await docRef.set(transactionData);
      
      return docRef.id;
  }

  async updateTransaction(id, payload) {
      if (!window.firebaseDB) return;
      await window.firebaseDB.collection(this.collectionName).doc(id).update(payload);
  }

  async deleteTransaction(id) {
      if (!window.firebaseDB) return;
      await window.firebaseDB.collection(this.collectionName).doc(id).delete();
  }
}
window.transactionManager = new TransactionManager();
