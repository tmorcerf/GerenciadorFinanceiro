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
      const [lancamentos, contas, categorias, orcamentos, auditoria, importsInfo, produtos, extratos] = await Promise.all([
        this.getCollectionData(this.db.collection('Lancamentos').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Contas').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Categorias').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Orcamentos').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Auditoria').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Imports').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Produtos').where('groupId', '==', gid)),
        this.getCollectionData(this.db.collection('Extratos').where('groupId', '==', gid))
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
        importsInfo,
        produtos,
        extratos
      };
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
      throw err;
    }
  }

  // --- GRAVAÇÃO ---

  async sincronizarPeriodo(lancamentosNovos, idsParaExcluir, contaDoExtrato, dataMaxStr, extratoPayload) {
    const gid = window.userGroupId;
    if (!gid) throw new Error("Grupo não definido.");

    const batch = this.db.batch();
    
    let novoExtratoId = null;
    if (extratoPayload) {
        const extratoRef = this.db.collection('Extratos').doc();
        novoExtratoId = extratoRef.id;
        batch.set(extratoRef, {
            groupId: gid,
            ...extratoPayload,
            importado_em: new Date().toISOString(),
            importado_por: window.firebaseUser ? window.firebaseUser.uid : 'desconhecido'
        });
    }

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
          criado_em: new Date().toISOString(),
          conciliado: extratoPayload ? true : false,
          extrato_id: novoExtratoId
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

  // --- MÉTODOS DE EXTRATOS E CASCATA ---
  
  async reabrirExtrato(extratoId) {
    const gid = window.userGroupId;
    if (!gid) throw new Error("Grupo não definido.");
    
    // Marca o extrato como aberto
    await this.db.collection('Extratos').doc(extratoId).update({ status: 'aberto' });
    
    // Remove conciliado dos lançamentos
    const lancs = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('extrato_id', '==', extratoId).get();
    const batch = this.db.batch();
    lancs.forEach(doc => {
      batch.update(doc.ref, { conciliado: false, extrato_id: null });
    });
    await batch.commit();
  }

  async recalcularExtratoEAtualizarCascata(extratoId, conta, dataCascataBR) {
      const gid = window.userGroupId;
      const batch = this.db.batch();
      
      // 1. Recalcular o Extrato atual
      if (extratoId) {
          const extratoDoc = await this.db.collection('Extratos').doc(extratoId).get();
          if (extratoDoc.exists) {
              const extData = extratoDoc.data();
              // Buscar os lançamentos que ainda pertencem a ele
              const lancs = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('extrato_id', '==', extratoId).get();
              let soma = 0;
              lancs.forEach(d => soma += parseFloat(d.data().valor || 0));
              
              let diff = extData.saldo_final - extData.saldo_inicial - soma;
              let novoStatus = Math.abs(diff) < 0.05 ? 'conciliado' : 'divergente';
              
              batch.update(extratoDoc.ref, {
                  soma_lancamentos: soma,
                  diferenca: diff,
                  status: novoStatus
              });
          }
      }
      
      // 2. Cascata total para frente (desconciliar lançamentos)
      if (conta && dataCascataBR) {
          const parts = dataCascataBR.split('/');
          const dataCascataTs = new Date(parts[2], parseInt(parts[1])-1, parts[0], 0,0,0).getTime();
          
          const todosLancs = await this.db.collection('Lancamentos').where('groupId', '==', gid).where('conta', '==', conta).where('conciliado', '==', true).get();
          todosLancs.forEach(doc => {
              const d = doc.data();
              if (d.data) {
                  const p2 = String(d.data).split('/');
                  if (p2.length === 3) {
                      const t = new Date(p2[2], parseInt(p2[1])-1, p2[0], 0,0,0).getTime();
                      if (t >= dataCascataTs) {
                          batch.update(doc.ref, { conciliado: false, extrato_id: null });
                      }
                  }
              }
          });
          
          // 3. Extratos para frente viram abertos
          const extratosConta = await this.db.collection('Extratos').where('groupId', '==', gid).where('conta', '==', conta).get();
          let maxDataConciliada = 0;
          let novaDataConciliadoAte = '';
          
          extratosConta.forEach(doc => {
              const ext = doc.data();
              if (ext.status === 'conciliado' || ext.status === 'divergente') {
                  const p3 = String(ext.periodo_fim).split('/');
                  if (p3.length === 3) {
                      const extEndTs = new Date(p3[2], parseInt(p3[1])-1, p3[0], 0,0,0).getTime();
                      if (extEndTs >= dataCascataTs) {
                          batch.update(doc.ref, { status: 'aberto' });
                      } else {
                          // Manter como conciliado/divergente. E achar o mais recente.
                          if (ext.status === 'conciliado' && extEndTs > maxDataConciliada) {
                              maxDataConciliada = extEndTs;
                              novaDataConciliadoAte = ext.periodo_fim;
                          }
                      }
                  }
              }
          });
          
          // 4. Atualizar conciliado_ate da conta
          const contas = await this.db.collection('Contas').where('groupId', '==', gid).where('nome', '==', conta).get();
          contas.forEach(doc => {
              batch.update(doc.ref, { conciliado_ate: novaDataConciliadoAte || '' });
          });
      }
      
      await batch.commit();
  }

  async limparExtratosAntigos(conta, manter = 5) {
      const gid = window.userGroupId;
      const extratosRef = await this.db.collection('Extratos').where('groupId', '==', gid).where('conta', '==', conta).get();
      
      let lista = [];
      extratosRef.forEach(doc => lista.push({id: doc.id, ...doc.data()}));
      
      if (lista.length <= manter) return;
      
      // Ordenar do mais recente para o mais antigo (baseado em importado_em)
      lista.sort((a, b) => new Date(b.importado_em || 0).getTime() - new Date(a.importado_em || 0).getTime());
      
      const toDelete = lista.slice(manter);
      const batch = this.db.batch();
      toDelete.forEach(ext => {
          batch.delete(this.db.collection('Extratos').doc(ext.id));
      });
      await batch.commit();
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
     if (!gid) throw new Error("Grupo nǜo definido.");

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

  async saveProdutosBatch(produtos) {
    const gid = window.userGroupId;
    if (!gid) throw new Error("Grupo nǜo definido.");
    if (!produtos || produtos.length === 0) return;

    // Firebase batch limit is 500 operations
    const batch = this.db.batch();
    
    for (const p of produtos) {
        if (!p.ean) continue;
        const snapshot = await this.db.collection('Produtos').where('groupId', '==', gid).where('ean', '==', p.ean).get();
        
        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            const currentData = snapshot.docs[0].data();
            
            // Update last price and descriptions
            let newDescOficial = currentData.descricao_oficial || '';
            if (p.descricao_oficial) {
                newDescOficial = p.descricao_oficial; // Keep updating if found again
            }
            
            let newDescSefaz = currentData.descricao_sefaz || currentData.descricao_padrao || '';
            if (p.descricao_sefaz && p.descricao_sefaz.length > newDescSefaz.length) {
                newDescSefaz = p.descricao_sefaz;
            }
            
            let newDescIa = currentData.descricao_ia || '';
            if (p.descricao_ia) {
                newDescIa = p.descricao_ia;
            }

            batch.update(this.db.collection('Produtos').doc(docId), {
                ultimo_preco: parseFloat(p.preco || 0),
                descricao_sefaz: newDescSefaz,
                descricao_oficial: newDescOficial,
                descricao_ia: newDescIa,
                atualizado_em: new Date().toISOString()
            });
        } else {
            const docRef = this.db.collection('Produtos').doc();
            batch.set(docRef, {
                groupId: gid,
                ean: p.ean,
                descricao_sefaz: p.descricao_sefaz || '',
                descricao_oficial: p.descricao_oficial || '',
                descricao_ia: p.descricao_ia || '',
                ultimo_preco: parseFloat(p.preco || 0),
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            });
        }
    }
    
    await batch.commit();
  }
}

window.DB = new Database();
