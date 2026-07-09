// Script temporário para migração do Google Sheets para o Firebase
// Deve ser executado no console do navegador na página do painel

async function runFirebaseMigration() {
    console.log("Iniciando migração para o Firebase...");
    if (!window.DB || !window.DB.db) {
        console.error("Firebase DB não inicializado. Verifique db.js e firebase-config.js");
        return;
    }

    let batch = window.DB.db.batch();
    let count = 0;
    const MAX_BATCH_SIZE = 490; // Firebase batch limit is 500

    function commitBatchIfNeeded() {
        if (count >= MAX_BATCH_SIZE) {
            console.log(`Commitando ${count} documentos...`);
            // Nota: na real precisaríamos esperar o batch.commit() ou gerenciar múltiplos batches.
            // Para simplicidade, vamos usar múltiplos batches.
            // Pular o gerenciamento complexo e apenas usar insert direto se for mais fácil.
        }
    }

    try {
        console.log("Dados carregados do Sheets na variável global dadosFinanceiros:", dadosFinanceiros);
        
        // 1. Migrar Lancamentos
        const lancamentos = dadosFinanceiros.lancamentos || [];
        console.log(`Migrando ${lancamentos.length} Lançamentos...`);
        for (const l of lancamentos) {
            const docRef = window.DB.db.collection('Lancamentos').doc();
            batch.set(docRef, l);
            count++;
            if(count >= MAX_BATCH_SIZE) { await batch.commit(); batch = window.DB.db.batch(); count = 0; }
        }

        // 2. Migrar Contas
        const contas = dadosFinanceiros.contas || [];
        console.log(`Migrando ${contas.length} Contas...`);
        for (const c of contas) {
            const docRef = window.DB.db.collection('Contas').doc();
            batch.set(docRef, c);
            count++;
            if(count >= MAX_BATCH_SIZE) { await batch.commit(); batch = window.DB.db.batch(); count = 0; }
        }

        // 3. Migrar Categorias (dicionarioGeral para Firestore Collections)
        // dicionarioGeral { "Alimentacao": ["Mercado", "Restaurante"], ... }
        const categorias = window.dicionarioGeral || {};
        console.log(`Migrando ${Object.keys(categorias).length} Categorias...`);
        for (const [catName, subCats] of Object.entries(categorias)) {
            const docRef = window.DB.db.collection('Categorias').doc();
            batch.set(docRef, { nome: catName, subcategorias: subCats });
            count++;
            if(count >= MAX_BATCH_SIZE) { await batch.commit(); batch = window.DB.db.batch(); count = 0; }
        }

        // 4. Migrar Orçamentos
        const orcamentos = dadosFinanceiros.orcamento || [];
        console.log(`Migrando ${orcamentos.length} Orçamentos...`);
        for (const o of orcamentos) {
            const docRef = window.DB.db.collection('Orcamentos').doc();
            batch.set(docRef, o);
            count++;
            if(count >= MAX_BATCH_SIZE) { await batch.commit(); batch = window.DB.db.batch(); count = 0; }
        }

        // 5. Migrar Auditoria
        const auditoria = dadosFinanceiros.auditoria || [];
        console.log(`Migrando ${auditoria.length} Auditorias...`);
        for (const a of auditoria) {
            const docRef = window.DB.db.collection('Auditoria').doc();
            batch.set(docRef, a);
            count++;
            if(count >= MAX_BATCH_SIZE) { await batch.commit(); batch = window.DB.db.batch(); count = 0; }
        }

        if (count > 0) {
            await batch.commit();
        }
        console.log("Migração concluída com sucesso!");
        alert("Migração para o Firebase concluída!");

    } catch (e) {
        console.error("Erro durante a migração:", e);
        alert("Erro na migração. Verifique o console.");
    }
}

window.runFirebaseMigration = runFirebaseMigration;
