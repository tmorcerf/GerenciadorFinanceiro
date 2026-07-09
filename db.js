// db.js - Camada de acesso a dados do Firebase

class Database {
  constructor() {
    this.db = window.firebaseDB;
  }

  // --- LEITURA ---
  async loadAllData() {
    try {
      const gid = window.userGroupId;
      if (!gid) throw new Error("Grupo de usuário não definido.");

      const [lancamentosSnap, contasSnap, categoriasSnap, orcamentosSnap, auditoriaSnap, importsSnap] = await Promise.all([
        this.db.collection('Lancamentos').where('groupId', '==', gid).get(),
        this.db.collection('Contas').where('groupId', '==', gid).get(),
        this.db.collection('Categorias').where('groupId', '==', gid).get(),
        this.db.collection('Orcamentos').where('groupId', '==', gid).get(),
        this.db.collection('Auditoria').where('groupId', '==', gid).get(),
        this.db.collection('Imports').where('groupId', '==', gid).get()
      ]);

      const dados = {
        lancamentos: [],
        contas: [],
        categoriasDict: {}, // formato esperado: { "Alimentacao": ["Restaurante", "Mercado"] }
        orcamentos: [],
        auditoria: [],
        importsInfo: []
      };

      lancamentosSnap.forEach(doc => {
        let data = doc.data();
        data.firebaseId = doc.id; // Guarda o ID do firebase
        dados.lancamentos.push(data);
      });

      contasSnap.forEach(doc => {
        dados.contas.push({ ...doc.data(), firebaseId: doc.id });
      });

      categoriasSnap.forEach(doc => {
        let cat = doc.data();
        if (!dados.categoriasDict[cat.nome]) {
           dados.categoriasDict[cat.nome] = [];
        }
        if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
           dados.categoriasDict[cat.nome] = cat.subcategorias;
        }
      });

      orcamentosSnap.forEach(doc => {
        dados.orcamentos.push({ ...doc.data(), firebaseId: doc.id });
      });

      auditoriaSnap.forEach(doc => {
        dados.auditoria.push({ ...doc.data(), firebaseId: doc.id });
      });

      importsSnap.forEach(doc => {
        dados.importsInfo.push({ ...doc.data(), firebaseId: doc.id });
      });

      return dados;
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
}

window.DB = new Database();
