class StoreManager extends EventTarget {
  constructor(collectionName, legacyKey, eventName) {
    super();
    this.collectionName = collectionName;
    this.legacyKey = legacyKey; // Chave usada no window.dadosFinanceiros (ex: 'contas', 'lancamentos')
    this.eventName = eventName; // Nome do evento a disparar no window (ex: 'account_state_changed')
    this.data = [];
    this.unsubscribe = null;
    this.initialLoadResolved = false;
    this.initialLoadPromise = new Promise(resolve => { this.resolveInitialLoad = resolve; });
  }

  listen(groupId) {
    if (!groupId) {
        console.error("StoreManager: groupId ausente para", this.collectionName);
        return;
    }
    if (this.unsubscribe) this.unsubscribe();
    
    if (!window.firebaseDB) {
        console.error("StoreManager: Firebase DB nÃ£o inicializado para", this.collectionName);
        return;
    }

    const query = window.firebaseDB.collection(this.collectionName).where('groupId', '==', groupId);
    
    this.unsubscribe = query.onSnapshot((snapshot) => {
      const docs = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
      this.data = docs;
      
      // Bridge para o sistema legado (IA, Importador, etc)
      if (!window.dadosFinanceiros) window.dadosFinanceiros = {};
      if (this.legacyKey) {
          window.dadosFinanceiros[this.legacyKey] = this.data;
      }
      
      // Hook customizÃ¡vel para as subclasses
      this.onDataUpdated();

      // Dispara evento para a Interface reagir (usando window para que a UI capture)
      if (this.eventName) {
          window.dispatchEvent(new CustomEvent(this.eventName, { detail: this.data }));
      }
      
      if (!this.initialLoadResolved) {
        this.initialLoadResolved = true;
        this.resolveInitialLoad(this.data);
      }
    }, (error) => {
       console.error(`StoreManager: Erro no onSnapshot do ${this.collectionName}:`, error);
    });
  }

  onDataUpdated() {} // Sobrescrito pelas subclasses

  waitForInitialLoad() {
    return this.initialLoadPromise;
  }
}
window.StoreManager = StoreManager;
