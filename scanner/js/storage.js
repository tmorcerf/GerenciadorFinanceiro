/**
 * storage.js — Armazenamento de notas escaneadas no Firestore
 * 
 * Módulo: Corta Gastos Scanner
 * Usa o mesmo Firestore do Corta Gastos (projeto "organizaze").
 * Coleção: "notas-scanner" — separada das movimentações do app principal.
 * 
 * Responsabilidades:
 *   - Salvar/buscar/deletar notas escaneadas (Firestore)
 *   - Verificar duplicatas por chave de acesso
 *   - Histórico com busca
 *   - Exportação JSON
 *   - Sincronização automática entre dispositivos
 */

window.Storage = (() => {
    'use strict';

    const COLECAO = 'notas-scanner';
    let _notas = [];
    let _loaded = false;
    let _unsubscribe = null;

    async function init() {
        try {
            const db = window.firebaseDB;
            if (!db) {
                console.warn('[Storage] Firestore não disponível, usando localStorage');
                return _initLocalFallback();
            }

            _unsubscribe = db.collection(COLECAO)
                .orderBy('criadoEm', 'desc')
                .onSnapshot((snapshot) => {
                    _notas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    _loaded = true;
                    console.log(`[Storage] ${_notas.length} notas sincronizadas`);
                    if (window._onStorageUpdate) window._onStorageUpdate();
                }, (err) => {
                    console.error('[Storage] Erro no listener:', err);
                });

            const snapshot = await db.collection(COLECAO).orderBy('criadoEm', 'desc').get();
            _notas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            _loaded = true;
            console.log(`[Storage] ${_notas.length} notas carregadas do Firestore`);
        } catch (err) {
            console.error('[Storage] Erro ao carregar:', err);
            _initLocalFallback();
        }
    }

    function _initLocalFallback() {
        const raw = localStorage.getItem('cgs_notas');
        _notas = raw ? JSON.parse(raw) : [];
        _loaded = true;
    }

    async function salvar(nota) {
        if (!_loaded) await init();
        
        const db = window.firebaseDB;
        const uid = window.currentUser ? window.currentUser.uid : 'anonimo';
        const groupId = window.userGroupId || uid;

        const novaNota = {
            chaveAcesso: nota.chaveAcesso, cnpj: nota.cnpj, cnpjFormatado: nota.cnpjFormatado,
            uf: nota.uf, modelo: nota.modelo, modeloDesc: nota.modeloDesc,
            serie: nota.serie, numeroNota: nota.numeroNota, dataEmissao: nota.dataEmissao,
            valorTotal: nota.valorTotal || 0, estabelecimento: nota.estabelecimento || 'Não identificado',
            razaoSocial: nota.razaoSocial || '', categoria: nota.categoria || 'Outros',
            geminiConfianca: nota.geminiConfianca || 'baixa', urlOriginal: nota.urlOriginal || '',
            metodoExtracao: nota.metodoExtracao || 'manual', itens: nota.itens || [],
            exportado: false, origem: 'scanner-nfe', criadoEm: new Date().toISOString(),
            uid: uid
        };

        if (db) {
            const batch = db.batch();
            
            // 1. Salvar no histórico do scanner (Opcional, mas mantém a UI do Opus funcionando)
            const notaRef = db.collection(COLECAO).doc();
            batch.set(notaRef, novaNota);
            novaNota.id = notaRef.id;

            // 2. Salvar o Estabelecimento no Mapa Global
            if (nota.cnpj) {
                const estabRef = db.collection('estabelecimentos').doc(nota.cnpj);
                batch.set(estabRef, {
                    razaoSocial: nota.razaoSocial,
                    nomeFantasia: nota.estabelecimento,
                    uf: nota.uf,
                    atualizadoEm: new Date().toISOString()
                }, { merge: true });
            }

            // 3. Processar Itens
            if (nota.itens && nota.itens.length > 0) {
                for (const item of nota.itens) {
                    // A. Lançamento Privado (Corta Gastos Dashboard)
                    const lancRef = db.collection('lancamentos').doc();
                    batch.set(lancRef, {
                        descricao: `${item.descricao} (${nota.estabelecimento})`,
                        valor: item.valorTotal,
                        tipo: 'despesa',
                        data: nota.dataEmissao ? nota.dataEmissao.split('T')[0] : new Date().toISOString().split('T')[0],
                        categoria: nota.categoria || 'Outros',
                        subcategoria: '',
                        conta: 'Cofre/Carteira',
                        groupId: groupId,
                        origem: 'scanner-nfe',
                        uid: uid,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // B. Rede Colaborativa (Preços Globais)
                    const precoRef = db.collection('precos_colaborativos').doc();
                    batch.set(precoRef, {
                        codigo_barras: item.codigo || '',
                        produto_nome: item.descricao,
                        categoria: nota.categoria || 'Outros',
                        valor_unitario: item.valorUnitario,
                        data_captura: firebase.firestore.FieldValue.serverTimestamp(),
                        estabelecimento_cnpj: nota.cnpj || '',
                        estabelecimento_nome: nota.estabelecimento || '',
                        usuario_colaborador: uid
                    });
                }
            }

            await batch.commit();

            // 4. Recompensar Colaborador (CortaCoins)
            if (window.CortaCoins && typeof window.CortaCoins.creditar === 'function') {
                // Ganha 10 XP base + 2 XP por item
                const xpGanho = 10 + ((nota.itens || []).length * 2);
                await window.CortaCoins.creditar(xpGanho, `Contribuição Colaborativa (Scanner)`);
                console.log(`[Storage] Creditado ${xpGanho} CortaCoins pela contribuição.`);
                if (window.App && window.App.toast) {
                    window.App.toast(`🪙 +${xpGanho} CortaCoins pelo envio!`, 'success');
                }
            }

        } else {
            // Fallback offline / sem firebase
            novaNota.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            _notas.unshift(novaNota);
            localStorage.setItem('cgs_notas', JSON.stringify(_notas));
        }
        return novaNota;
    }

    function buscarPorId(id) { return _notas.find(n => n.id === id) || null; }

    function verificarDuplicata(chaveAcesso) {
        const existente = _notas.find(n => n.chaveAcesso === chaveAcesso);
        return { duplicada: !!existente, nota: existente || null };
    }

    async function remover(id) {
        const db = window.firebaseDB;
        if (db) { await db.collection(COLECAO).doc(id).delete(); }
        else { _notas = _notas.filter(n => n.id !== id); localStorage.setItem('cgs_notas', JSON.stringify(_notas)); }
    }

    function listar(filtros = {}) {
        let resultado = [..._notas];
        if (filtros.busca) {
            const termo = filtros.busca.toLowerCase();
            resultado = resultado.filter(n =>
                (n.estabelecimento || '').toLowerCase().includes(termo) ||
                (n.cnpjFormatado || '').includes(termo) ||
                (n.cnpj || '').includes(termo)
            );
        }
        if (filtros.ano && filtros.mes) {
            const prefix = `${filtros.ano}-${String(filtros.mes).padStart(2, '0')}`;
            resultado = resultado.filter(n => (n.dataEmissao || '').startsWith(prefix));
        }
        if (filtros.limite) resultado = resultado.slice(0, filtros.limite);
        return resultado;
    }

    function contarHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        return _notas.filter(n => (n.criadoEm || '').startsWith(hoje)).length;
    }

    function estatisticas() {
        return {
            total: _notas.length,
            valorTotal: _notas.reduce((sum, n) => sum + (n.valorTotal || 0), 0),
            totalItens: _notas.reduce((sum, n) => sum + (n.itens?.length || 0), 0),
            estados: [...new Set(_notas.map(n => n.uf))]
        };
    }

    function exportarJSON(apenasNaoExportadas = false) {
        let notas = apenasNaoExportadas ? _notas.filter(n => !n.exportado) : [..._notas];
        return {
            versao: '1.0', app: 'Corta Gastos Scanner',
            exportadoEm: new Date().toISOString(), totalNotas: notas.length,
            notas: notas.map(n => ({
                chaveAcesso: n.chaveAcesso, cnpj: n.cnpj, cnpjFormatado: n.cnpjFormatado,
                estabelecimento: n.estabelecimento, razaoSocial: n.razaoSocial, uf: n.uf,
                data: n.dataEmissao, valorTotal: n.valorTotal, categoria: n.categoria,
                metodoExtracao: n.metodoExtracao, itens: n.itens
            }))
        };
    }

    async function marcarExportadas(ids) {
        const db = window.firebaseDB;
        if (db) {
            const batch = db.batch();
            for (const id of ids) batch.update(db.collection(COLECAO).doc(id), { exportado: true });
            await batch.commit();
        } else {
            for (const nota of _notas) { if (ids.includes(nota.id)) nota.exportado = true; }
            localStorage.setItem('cgs_notas', JSON.stringify(_notas));
        }
    }

    return { init, salvar, buscarPorId, verificarDuplicata, remover, listar, contarHoje, estatisticas, exportarJSON, marcarExportadas };
})();
