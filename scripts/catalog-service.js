/**
 * catalog-service.js — Serviço de Catálogo Inteligente de Produtos
 * 
 * Responsabilidades:
 * - Consultar produtos no Firestore (catalogo-produtos)
 * - Salvar novos produtos padronizados (cache)
 * - Lidar com colisão de códigos internos via CNPJ_Codigo
 */

window.CatalogService = (() => {
    'use strict';

    /**
     * Gera o ID único do produto no Firestore.
     * Se for EAN (13-14 dígitos), usa o próprio EAN.
     * Se for código interno (curto), usa CNPJ_Codigo para evitar colisão.
     */
    function getDocId(codigo, cnpj) {
        if (!codigo) return null;
        // Considera EAN códigos com 13 ou 14 dígitos inteiramente numéricos
        const eanRegex = /^\d{13,14}$/;
        if (eanRegex.test(codigo)) {
            return codigo;
        } else {
            // Remove pontuação do CNPJ caso tenha sido passado formatado
            const cnpjLimpo = cnpj ? cnpj.replace(/[^\d]/g, '') : 'SEMCNPJ';
            return `${cnpjLimpo}_${codigo}`;
        }
    }

    /**
     * Busca um produto no catálogo.
     * @param {string} codigo - Código EAN ou interno
     * @param {string} cnpj - CNPJ do mercado (para resolver colisão de código interno)
     * @returns {Promise<Object|null>}
     */
    async function buscarProduto(codigo, cnpj) {
        const id = getDocId(codigo, cnpj);
        if (!id) return null;

        const db = window.firebaseDB;
        if (!db) {
            console.warn('[CatalogService] firebaseDB não está inicializado.');
            return null;
        }

        try {
            const doc = await db.collection('catalogo-produtos').doc(id).get();
            if (doc.exists) {
                console.log(`[CatalogService] Cache HIT para ${id}:`, doc.data());
                return doc.data();
            }
            console.log(`[CatalogService] Cache MISS para ${id}`);
            return null;
        } catch (err) {
            console.error('[CatalogService] Erro ao buscar produto no Firestore:', err);
            return null;
        }
    }

    /**
     * Salva um produto categorizado no catálogo.
     * @param {string} codigo - Código EAN ou interno
     * @param {string} cnpj - CNPJ do mercado
     * @param {Object} dados - { nomeLimpo, categoria, original }
     */
    async function salvarProduto(codigo, cnpj, dados) {
        const id = getDocId(codigo, cnpj);
        if (!id) return false;

        const db = window.firebaseDB;
        if (!db) return false;

        try {
            const payload = {
                ...dados,
                codigo: codigo,
                atualizadoEm: new Date().toISOString()
            };
            
            // Usamos merge para não sobrescrever métricas ou histórico que possamos adicionar no futuro
            await db.collection('catalogo-produtos').doc(id).set(payload, { merge: true });
            console.log(`[CatalogService] Produto salvo no catálogo (${id})`);
            return true;
        } catch (err) {
            console.error('[CatalogService] Erro ao salvar produto no Firestore:', err);
            return false;
        }
    }

    return {
        buscarProduto,
        salvarProduto
    };
})();
