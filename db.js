// db.js - Camada de acesso a dados do Firebase

class Database {
  constructor() {
    this.db = window.firebaseDB;
  }

  // Wrapper helper para aproveitar o cache e o resume token
  getCollectionData(queryRef) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      // Ao deixar o onSnapshot aberto, o SDK do Firebase magicamente atualiza o cache (IndexedDB)
      // em background enviando apenas os Diffs (documentos alterados). O custo despenca!
      queryRef.onSnapshot(
        { includeMetadataChanges: false },
        (snapshot) => {
          if (!resolved) {
            resolved = true;
            const docs = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              data.firebaseId = doc.id;
              docs.push(data);
            });
            resolve(docs);
          }
        },
        (err) => {
          if (!resolved) reject(err);
        }
      );
    });
  }

  // --- LEITURA ---
  async loadAllData() {
    try {
      const gid = window.userGroupId;
      if (!gid) throw new Error("Grupo de usuário não definido.");

      // Em vez de usar .get() (que custa milhares de leituras toda vez), 
      // delegamos para o getCollectionData que usa .onSnapshot() (custa quase zero com cache ativado).
      const [lancamentos, contas, categorias, orcamentos, auditoria, importsInfo] = await Promise.all([
        this.getCollectionData(this.db.collection('Lancamentos').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Contas').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Categorias').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Orcamentos').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Auditoria').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Imports').where('groupId', '==', gid))
      ]);

      const categoriasDict = {};
      categorias.forEach(cat => {
         if (!categoriasDict[cat.nome]) categoriasDict[cat.nome] = [];
         if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
            categoriasDict[cat.nome] = cat.subcategorias;
         }
      });

      const nomesContas = contas.map(c => c.nome);
      categoriasDict["Transferência"] = nomesContas;
      categoriasDict["Transferencias"] = nomesContas;

      return {
        lancamentos,
        contas,
        categoriasDict,
        orcamentos,
        auditoria,
        importsInfo
      };
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
      throw err;
    }
  }

  // --- GRAVAÇÃO ---

  async sincronizarPeriodo(lancamentosNovos, idsParaExcluir, contaDoExtrato, dataMaxStr) {
    const gid = window.userGroupId;
    if (!gid) throw new Error("Grupo não definido.");

    const batch = this.db.batch();

    // 1. Adicionar lançamentos novos
    if (lancamentosNovos && lancamentosNovos.length > 0) {
      lancamentosNovos.forEach(lanc => {
        const docRef = this.db.collection('Lancamentos').doc();
        batch.set(docRef, {
          groupId: gid,
          cod: lanc.cod || `TX_${new Date().getTime()}_${Math.floor(Math.random()*1000)}`,
          data: lanc.data || '',
          descricao: lanc.descricao || '',
          conta: lanc.conta || contaDoExtrato || '',
          valor: parseFloat(lanc.valor) || 0,
          categoria: lanc.categoria || '',
          subcategoria: lanc.subcategoria || '',
          parcelamento: lanc.parcelamento || '',
          vencimento: lanc.vencimento || '',
          criado_em: new Date().toISOString()
        });
      });
    }

    // 2. Excluir ids
    if (idsParaExcluir && idsParaExcluir.length > 0) {
      for (const id of idsParaExcluir) {
         const snapshot = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('cod', '==', String(id)).get();
         snapshot.forEach(doc => {
            batch.delete(doc.ref);
         });
      }
    }

    // 3. Atualizar Conciliação da Conta
    if (contaDoExtrato && dataMaxStr) {
       const contasSnap = await this.db.collection('Contas').where('groupId', '==', gid).where('nome', '==', contaDoExtrato).get();
       contasSnap.forEach(doc => {
          batch.update(doc.ref, { conciliado_ate: dataMaxStr });
       });
    }

    await batch.commit();
  }

  async editarLancamento(cod, newData) {
     const gid = window.userGroupId;
     if (!gid) throw new Error("Grupo não definido.");

     const snapshot = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('cod', '==', String(cod)).get();
     if (snapshot.empty) throw new Error("Lançamento não encontrado");
     
     const docId = snapshot.docs[0].id;
     await this.db.collection('Lancamentos').doc(docId).update(newData);
  }

  async excluirLancamento(cod) {
     const gid = window.userGroupId;
     if (!gid) throw new Error("Grupo não definido.");

     const snapshot = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('cod', '==', String(cod)).get();
     if (snapshot.empty) throw new Error("Lançamento não encontrado");
     
     const docId = snapshot.docs[0].id;
     await this.db.collection('Lancamentos').doc(docId).delete();
  }

  async saveContaConfig(payload) {
     const gid = window.userGroupId;
     if (!gid) throw new Error("Grupo não definido.");

     const snapshot = await this.db.collection('Contas').where('groupId', '==', gid).where('nome', '==', payload.originalNome).get();
     if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await this.db.collection('Contas').doc(docId).update({
           nome: payload.novoNome,
           tipo: payload.tipo,
           banco: payload.banco,
           dia_fechamento: payload.diaFechamento,
           dia_vencimento: payload.diaVencimento,
           ignorar_dashboard: payload.ignorar,
           saldo_inicial: parseFloat(payload.saldoInicial || 0)
        });
     } else {
        await this.db.collection('Contas').add({
           groupId: gid,
           nome: payload.novoNome || payload.originalNome,
           tipo: payload.tipo,
           banco: payload.banco,
           dia_fechamento: payload.diaFechamento,
           dia_vencimento: payload.diaVencimento,
           ignorar_dashboard: payload.ignorar,
           saldo_inicial: parseFloat(payload.saldoInicial || 0)
        });
     }
  }

  async saveOrcamentoConfig(payload) {
     const gid = window.userGroupId;
     if (!gid) throw new Error("Grupo não definido.");

     const snapshot = await this.db.collection('Orcamentos').where('groupId', '==', gid).where('categoria', '==', payload.categoria).get();
     if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await this.db.collection('Orcamentos').doc(docId).update({
           orcamento: parseFloat(payload.orcamento || 0),
           config_valor: parseFloat(payload.config_valor || 0),
           config_periodo: payload.config_periodo || 'mensal'
        });
     } else {
        await this.db.collection('Orcamentos').add({
           groupId: gid,
           categoria: payload.categoria,
           orcamento: parseFloat(payload.orcamento || 0),
           config_valor: parseFloat(payload.config_valor || 0),
           config_periodo: payload.config_periodo || 'mensal'
        });
     }
  }
}

window.DB = new Database();
