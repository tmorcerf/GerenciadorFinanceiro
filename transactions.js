const _win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
const BaseStore = (_win && _win.StoreManager) ? _win.StoreManager : class {
    constructor(collectionName, dataKey, eventName) {
        this.collectionName = collectionName;
        this.dataKey = dataKey;
        this.eventName = eventName;
        this.data = [];
    }
};

class TransactionManager extends BaseStore {
  constructor() {
    super('Lancamentos', 'lancamentos', 'transaction_state_changed');
    this.collectionName = 'Lancamentos';
  }

  async createTransaction(payload) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB || !win.userGroupId) throw new Error("Sistema não inicializado.");
      
      const catLower = (payload.categoria || '').toLowerCase();
      const isTransfer = catLower.includes('transferência entre contas') || 
                         catLower.includes('pagamento de fatura') || 
                         catLower.includes('investimento') || 
                         catLower.includes('saque') || 
                         (catLower.includes('transfer') && !catLower.includes('estorno'));

      if (isTransfer) {
          const sub = (payload.subcategoria || '').trim();
          const sLower = sub.toLowerCase();
          const isPending = !sub || 
                            sLower === 'pendente de destino' || 
                            sLower === 'pendente' || 
                            sLower === 'unassigned' || 
                            sLower === 'desconhecido' || 
                            sLower === 'desconhecida' || 
                            sLower === 'indefinido' || 
                            sLower === 'indefinida' || 
                            sLower === 'sem destino';

          if (isPending) {
              // R2: Pending Destination Protocol
              payload.pendente_destino = true;
              payload.subcategoria = 'Pendente de Destino';
              payload.transfer_match_id = null;
              
              const docRef = win.firebaseDB.collection(this.collectionName).doc();
              const txData = {
                  groupId: win.userGroupId,
                  createdAt: new Date().toISOString(),
                  ...payload
              };
              await docRef.set(txData);
              return docRef.id;
          } else {
              // R1: Double-Entry Counterparty Creation Protocol
              payload.pendente_destino = false;
              const matchId = payload.transfer_match_id || ('match_' + Date.now() + '_' + Math.floor(Math.random() * 100000));
              payload.transfer_match_id = matchId;

              // Leg 1 (Original)
              const docRef1 = win.firebaseDB.collection(this.collectionName).doc();
              const leg1Data = {
                  groupId: win.userGroupId,
                  createdAt: new Date().toISOString(),
                  ...payload
              };
              await docRef1.set(leg1Data);

              // Leg 2 (Counterparty)
              if (!payload._isCounterparty && !payload._skipCounterparty) {
                  const docRef2 = win.firebaseDB.collection(this.collectionName).doc();
                  const descOriginal = payload.descricao || '';
                  const descLeg2 = descOriginal.startsWith('Contra-partida: ') ? descOriginal : 'Contra-partida: ' + descOriginal;
                  const rawVal = parseFloat(payload.valor || 0);
                  const leg2Val = rawVal === 0 ? 0 : -1 * rawVal;
                  const leg2Data = {
                      groupId: win.userGroupId,
                      createdAt: new Date().toISOString(),
                      cod: `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                      data: payload.data,
                      descricao: descLeg2,
                      conta: payload.subcategoria,
                      subcategoria: payload.conta,
                      valor: leg2Val,
                      categoria: payload.categoria || 'Transferência',
                      pendente_destino: false,
                      transfer_match_id: matchId,
                      conciliado: payload.conciliado || false,
                      extrato_id: null,
                      _isCounterparty: true
                  };
                  await docRef2.set(leg2Data);
                  docRef1.counterpartyId = docRef2.id;
              }

              return docRef1.id;
          }
      }

      // Standard single transaction
      const docRef = win.firebaseDB.collection(this.collectionName).doc();
      const transactionData = {
          groupId: win.userGroupId,
          createdAt: new Date().toISOString(),
          ...payload
      };
      await docRef.set(transactionData);
      return docRef.id;
  }

  async resolvePendingDestination(id, targetAccount) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB) return;
      let tx = (this.data || []).find(t => t.id === id || t.cod === id || t.firebaseId === id);
      if (!tx) {
          const docSnap = await win.firebaseDB.collection(this.collectionName).doc(id).get();
          if (docSnap && docSnap.exists) {
              tx = { id: docSnap.id, ...docSnap.data() };
          }
      }
      if (!tx) throw new Error("Lançamento não encontrado.");
      if (!targetAccount || targetAccount.trim() === '' || targetAccount === 'Pendente de Destino') {
          throw new Error("Conta de destino inválida.");
      }

      const cleanTarget = targetAccount.trim();
      const matchId = 'match_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

      // Update Leg 1
      await this.updateTransaction(tx.id || id, {
          subcategoria: cleanTarget,
          pendente_destino: false,
          transfer_match_id: matchId
      });

      // Create Leg 2
      const docRef2 = win.firebaseDB.collection(this.collectionName).doc();
      const descOriginal = tx.descricao || '';
      const descLeg2 = descOriginal.startsWith('Contra-partida: ') ? descOriginal : 'Contra-partida: ' + descOriginal;
      const rawVal = parseFloat(tx.valor || 0);
      const leg2Val = rawVal === 0 ? 0 : -1 * rawVal;
      const leg2Data = {
          groupId: win.userGroupId,
          createdAt: new Date().toISOString(),
          cod: `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          data: tx.data,
          descricao: descLeg2,
          conta: cleanTarget,
          subcategoria: tx.conta,
          valor: leg2Val,
          categoria: tx.categoria || 'Transferência',
          pendente_destino: false,
          transfer_match_id: matchId,
          conciliado: false,
          extrato_id: null,
          _isCounterparty: true
      };
      await docRef2.set(leg2Data);
      return matchId;
  }

  async updateTransaction(id, payload) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB) return;

      // Gold Rule check: locked reconciled transactions cannot have financial fields modified
      const currentTx = this.data.find(t => t.id === id || t.cod === id);
      if (currentTx && currentTx.conciliado) {
          if (payload.valor !== undefined && parseFloat(payload.valor) !== parseFloat(currentTx.valor)) {
              throw new Error("Lançamento conciliado está bloqueado pela Regra de Ouro (âncora bancária).");
          }
          if (payload.conta !== undefined && payload.conta !== currentTx.conta) {
              throw new Error("Lançamento conciliado está bloqueado pela Regra de Ouro (âncora bancária).");
          }
          if (payload.data !== undefined && payload.data !== currentTx.data) {
              throw new Error("Lançamento conciliado está bloqueado pela Regra de Ouro (âncora bancária).");
          }
      }

      const docId = currentTx ? (currentTx.id || currentTx.firebaseId) : id;
      await win.firebaseDB.collection(this.collectionName).doc(docId).update(payload);
  }

  async deleteTransaction(id) {
      const win = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (!win.firebaseDB) return;
      const currentTx = this.data.find(t => t.id === id || t.cod === id);
      if (currentTx && currentTx.conciliado) {
          throw new Error("Não é possível excluir um lançamento conciliado com o extrato bancário.");
      }
      const docId = currentTx ? (currentTx.id || currentTx.firebaseId) : id;
      await win.firebaseDB.collection(this.collectionName).doc(docId).delete();
  }
}

if (typeof window !== 'undefined') {
    window.TransactionManager = TransactionManager;
    window.transactionManager = new TransactionManager();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TransactionManager };
}
