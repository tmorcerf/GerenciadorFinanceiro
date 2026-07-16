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

        let totalValor = nota.valorTotal || 0;
        if (totalValor === 0 && nota.itens) {
            nota.itens.forEach(i => totalValor += (i.valorTotal || (i.quantidade * i.valorUnitario) || 0));
        }

        const novaNota = {
            chave: nota.chaveAcesso || nota.chave, 
            uf: nota.uf || '',
            emitente: { nome: nota.estabelecimento || nota.razaoSocial || 'Estabelecimento', cnpj: nota.cnpj || '' },
            dataEmissao: nota.dataEmissao || new Date().toISOString().substring(0, 10).split('-').reverse().join('/'),
            valorTotal: totalValor,
            status: 'concluida',
            urlOriginal: nota.urlOriginal || '',
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            uid: uid
        };

        if (db) {
            const batch = db.batch();
            
            // 1. Salvar no histórico (nfe_notas)
            const notaId = nota.chaveAcesso || nota.chave || Date.now().toString();
            const notaRef = db.collection('nfe_notas').doc(notaId);
            batch.set(notaRef, novaNota);
            novaNota.id = notaId;

            // 2. Processar Itens e Agrupar
            if (nota.itens && nota.itens.length > 0) {
                const categoriasAgrupadas = {};

                for (const item of nota.itens) {
                    const cat = item.categoria || nota.categoria || 'Outros';
                    const valorFinal = item.valorTotal || (item.quantidade * item.valorUnitario) || 0;

                    // Rede Colaborativa (nfe_itens)
                    const itemRef = db.collection('nfe_itens').doc();
                    batch.set(itemRef, {
                        notaId: notaId,
                        chave: novaNota.chave,
                        nomeProduto: item.descricao || item.nomeProduto || '',
                        ean: item.codigo || item.ean || '',
                        quantidade: item.quantidade || 1,
                        valorUnitario: item.valorUnitario || valorFinal,
                        valorTotal: valorFinal,
                        categoria: cat,
                        cnpjEmitente: novaNota.emitente.cnpj,
                        uf: novaNota.uf,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                        uid: uid
                    });

                    // Soma para Agrupamento Financeiro
                    if (!categoriasAgrupadas[cat]) {
                        categoriasAgrupadas[cat] = 0;
                    }
                    categoriasAgrupadas[cat] += valorFinal;
                }

                // Lançamento Privado Agrupado
                for (const [cat, somaValor] of Object.entries(categoriasAgrupadas)) {
                    if (somaValor > 0) {
                        const lancRef = db.collection('lancamentos').doc();
                        batch.set(lancRef, {
                            data: novaNota.dataEmissao,
                            vencimento: novaNota.dataEmissao,
                            conta: 'Cofre/Carteira',
                            obs: `${novaNota.emitente.nome} (Agrupado: ${cat})`,
                            valor: -Math.abs(somaValor),
                            categoria: cat,
                            subcategoria: 'Scanner',
                            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                            origem: 'scanner_nfe',
                            chave_nfe: novaNota.chave,
                            groupId: groupId,
                            uid: uid
                        });
                    }
                }
            }

            await batch.commit();

            // 3. Recompensar Colaborador (CortaCoins) - 1 a cada R$ 10
            if (window.CortaCoins && typeof window.CortaCoins.creditar === 'function') {
                const xpGanho = Math.max(1, Math.floor(totalValor / 10));
                await window.CortaCoins.creditar(xpGanho, `Leitura NF-e ${novaNota.chave.substring(0,6)}...`);
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
