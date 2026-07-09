// db.js - Camada de acesso a dados do Firebase

class Database {
  constructor() {
    this.db = window.firebaseDB;
  }

  // --- LEITURA ---
  async loadAllData() {
    try {
      const [lancamentosSnap, contasSnap, categoriasSnap, orcamentosSnap, auditoriaSnap, importsSnap] = await Promise.all([
        this.db.collection('Lancamentos').get(),
        this.db.collection('Contas').get(),
        this.db.collection('Categorias').get(),
        this.db.collection('Orcamentos').get(),
        this.db.collection('Auditoria').get(),
        this.db.collection('Imports').get() // Histórico de AI Imports se houver
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
    const batch = this.db.batch();

    // 1. Adicionar lançamentos novos
    if (lancamentosNovos && lancamentosNovos.length > 0) {
      lancamentosNovos.forEach(lanc => {
        const docRef = this.db.collection('Lancamentos').doc();
        batch.set(docRef, {
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
      // Como os IDs vêm da tabela, precisamos achar o documento correto no Firestore
      // Se tivermos salvo o firebaseId na propriedade id, usamos direto:
      for (const id of idsParaExcluir) {
         // O ID do firebase geralmente é alfanumérico. Se o usuário passar o `cod` antigo (TX_123),
         // precisamos fazer uma query primeiro (ou assumir que o sistema passa o firebaseId)
         // Para simplificar no batch, faremos queries antes para pegar a ref
         const snapshot = await this.db.collection('Lancamentos').where('cod', '==', String(id)).get();
         snapshot.forEach(doc => {
            batch.delete(doc.ref);
         });
      }
    }

    // 3. Atualizar Conciliação da Conta
    if (contaDoExtrato && dataMaxStr) {
       const contasSnap = await this.db.collection('Contas').where('nome', '==', contaDoExtrato).get();
       contasSnap.forEach(doc => {
          batch.update(doc.ref, { conciliado_ate: dataMaxStr });
       });
    }

    await batch.commit();
  }

  async editarLancamento(cod, newData) {
     const snapshot = await this.db.collection('Lancamentos').where('cod', '==', String(cod)).get();
     if (snapshot.empty) throw new Error("Lançamento não encontrado");
     
     const docId = snapshot.docs[0].id;
     await this.db.collection('Lancamentos').doc(docId).update(newData);
  }

  async excluirLancamento(cod) {
     const snapshot = await this.db.collection('Lancamentos').where('cod', '==', String(cod)).get();
     if (snapshot.empty) throw new Error("Lançamento não encontrado");
     
     const docId = snapshot.docs[0].id;
     await this.db.collection('Lancamentos').doc(docId).delete();
  }

  async saveContaConfig(payload) {
     const snapshot = await this.db.collection('Contas').where('nome', '==', payload.originalNome).get();
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
        // Se a conta não existe ainda, cria
        await this.db.collection('Contas').add({
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
