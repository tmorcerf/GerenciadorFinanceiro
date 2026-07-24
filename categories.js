class CategoryManager extends window.StoreManager {
  constructor() {
    super('Categorias', null, 'category_state_changed');
  }
  
  onDataUpdated() {
    this.rebuildCategoriasDict();
  }

  rebuildCategoriasDict() {
    const dict = {};
    this.data.forEach(cat => {
      dict[cat.nome] = cat.subcategorias || [];
    });
    
    // Adicionar TransferÃªncias dinamicamente com base nas Contas
    const contas = window.accountManager ? window.accountManager.data : [];
    dict["Transferencia"] = contas.map(c => c.nome);
    
    if (!window.dadosFinanceiros) window.dadosFinanceiros = {};
    window.dadosFinanceiros.categoriasDict = dict;
    if (typeof window.dicionarioGeral !== 'undefined') {
        window.dicionarioGeral = dict;
    }
  }

  async checkAndCreateCategory(nome) {
      if (!nome) return;
      const nLower = nome.trim().toLowerCase();
      const existe = this.data.find(c => c.nome.toLowerCase() === nLower);
      if (!existe) {
          await this.saveCategory(nome.trim(), []);
      }
  }

  async saveCategory(nome, subcategoriasArray) {
      if (!window.firebaseDB || !window.userGroupId) throw new Error("Sistema nÃ£o inicializado.");
      const existing = this.data.find(c => c.nome === nome);
      if (existing) {
          await window.firebaseDB.collection(this.collectionName).doc(existing.id).update({
              subcategorias: subcategoriasArray
          });
      } else {
          await window.firebaseDB.collection(this.collectionName).add({
              groupId: window.userGroupId,
              nome: nome,
              subcategorias: subcategoriasArray,
              createdAt: new Date().toISOString()
          });
      }
  }

  async updateLimit(nome, newLimit) {
      const existing = this.data.find(c => c.nome === nome);
      if (existing) {
          await window.firebaseDB.collection(this.collectionName).doc(existing.id).update({ limit: newLimit });
      } else {
          await window.firebaseDB.collection(this.collectionName).add({
              groupId: window.userGroupId,
              nome: nome,
              subcategorias: [],
              limit: newLimit,
              createdAt: new Date().toISOString()
          });
      }
  }

  async deleteCategory(id) {
      if (!window.firebaseDB) return;
      await window.firebaseDB.collection(this.collectionName).doc(id).delete();
  }

  async replaceAllCategories(categoriasDict) {
      if (!window.firebaseDB || !window.userGroupId) throw new Error("Sistema nÃ£o inicializado.");
      
      const batch = window.firebaseDB.batch();
      
      // Apaga as categorias antigas
      const catSnap = await window.firebaseDB.collection(this.collectionName).where('groupId', '==', window.userGroupId).get();
      catSnap.forEach(doc => batch.delete(doc.ref));
      
      // Insere as categorias novas
      Object.keys(categoriasDict).forEach(cat => {
          if (cat.toLowerCase().includes('transferencia') || cat.toLowerCase().includes('transferÃªncia')) return;
          const newCatRef = window.firebaseDB.collection(this.collectionName).doc();
          batch.set(newCatRef, {
              groupId: window.userGroupId,
              nome: cat,
              subcategorias: categoriasDict[cat],
              createdAt: new Date().toISOString()
          });
      });
      
      await batch.commit();
  }
}
window.categoryManager = new CategoryManager();
