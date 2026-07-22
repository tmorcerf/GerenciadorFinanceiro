// ia_categorizador.js v1 — O Ninja Analítico
// Corta Gastos

window.IACategorizador = (function() {

  async function categorizar(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockedData = (opts.transacoes || []).map(t => ({
                    ...t,
                    categoria: 'DIVERSOS',
                    subcategoria: 'DIVERSOS'
                }));
                resolve({
                    status: 'success',
                    analise_ia: 'Categorização simulada (Modo Batata 🥔)',
                    data: mockedData
                });
            }, 800);
        });
    }

    if (!window.IACore) throw new Error('IACore não carregado!');

    var transacoesAll = opts.transacoes;
    var categoriasTree = opts.categoriasTree;
    
    var historicoConta360d = opts.historicoConta360d || [];
    var historicoTransferencias360d = opts.historicoTransferencias360d || [];
    var historicoGlobal120d = opts.historicoGlobal120d || [];
    var vocabulario = opts.vocabulario || {};

    function sanitizeForLLM(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF\uFFFD]/g, '')
            .trim();
    }

    function extractKeywords(text) {
        if (!text) return [];
        return text.toLowerCase()
                   .replace(/[^a-z0-9à-ÿ]/g, ' ')
                   .split(/\s+/)
                   .filter(w => w.length > 3 && !['para', 'com', 'dos', 'das'].includes(w));
    }

    var systemPrompt = `Você é um motor de categorização financeira de precisão militar. 
Sua única função é mapear um array de entrada para um array de saída 1-para-1, sem perder ou omitir NENHUM item.

REGRAS ESTABELECIDAS:
1. O array de saída "data" DEVE ter EXATAMENTE o mesmo número de itens do array de entrada.
2. O campo "cod" deve ser copiado exatamente como recebido.
3. Valores negativos = despesas. Positivos = receitas, transferências ou ESTORNOS.
4. REGRA DE ESTORNO: Estornos devem manter a categoria da despesa original.
5. Para transações novas, deduza a natureza real do gasto por trás do nome (Ex: "ZAMP S.A." -> Alimentação, "Energisa" -> Casa, "Brasilprev" -> Seguros/Previdência).
6. Use APENAS as categorias da lista fornecida no Prompt do Usuário.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Retorne APENAS um objeto JSON válido seguindo exatamente esta estrutura:
{
  "status": "success",
  "data": [
    {
      "cod": "ID_COPIADO_DA_ENTRADA",
      "categoria": "Categoria Principal",
      "subcategoria": "Subcategoria",
      "descricao_limpa": "Descrição amigável sem lixo"
    }
  ]
}`;

    function formatHistory(arr) {
        return arr.map(function(l) {
            var descComObs = l.descricao + (l.obs ? ' [' + l.obs + ']' : '');
            return l.data + '|' + descComObs + '|' + l.valor + '|' + (l.categoria || '') + '|' + (l.subcategoria || '');
        }).join('\n');
    }

    var vocabEntries = Object.entries(vocabulario || {});
    var vocabCompacto = vocabEntries
        .slice(0, 200)
        .map(function(e) { var v = e[1]; return e[0] + ' → ' + (typeof v === 'object' ? (v.categoria || '') + (v.subcategoria ? '/' + v.subcategoria : '') : String(v)); })
        .join('\n');

    let allData = [];
    let analiseFinal = "Classifiquei seus gastos e escapei das armadilhas da preguiça!";
    const CHUNK_SIZE = 15;

    var transacoesLimpas = transacoesAll.map(t => ({
        ...t,
        descricao: sanitizeForLLM(t.descricao),
        conta: sanitizeForLLM(t.conta)
    }));

    var allHistory = [...historicoConta360d, ...historicoTransferencias360d, ...historicoGlobal120d];
    var uniqueHistory = new Map();
    allHistory.forEach(t => {
        var cleanDesc = sanitizeForLLM(t.descricao || '').toUpperCase().replace(/[0-9]/g, '').trim();
        var key = cleanDesc + '|' + (t.categoria||'') + '|' + (t.subcategoria||'');
        if (!uniqueHistory.has(key)) uniqueHistory.set(key, t);
    });
    var deduplicatedHistory = Array.from(uniqueHistory.values());

    console.groupCollapsed(`[Ninja Categorizador] Iniciando Processamento IA - Total: ${transacoesLimpas.length} transações`);
    console.log("Categorias Tree:", categoriasTree);
    console.log("Histórico Dedup Total:", deduplicatedHistory.length, "itens únicos de um total de", allHistory.length);
    console.log("Vocabulário:", vocabEntries.length, "itens");

    for (let i = 0; i < transacoesLimpas.length; i += CHUNK_SIZE) {
        let chunk = transacoesLimpas.slice(i, i + CHUNK_SIZE);
        console.groupCollapsed(`[Ninja Categorizador] Processando Lote ${Math.floor(i/CHUNK_SIZE)+1} (Tamanho do Lote: ${chunk.length})`);

        let chunkKeywords = new Set();
        chunk.forEach(t => { extractKeywords(t.descricao).forEach(w => chunkKeywords.add(w)); });

        let relevantHistory = deduplicatedHistory.filter(h => {
            let hWords = extractKeywords(h.descricao);
            return hWords.some(w => chunkKeywords.has(w));
        }).slice(0, 30);

        var userContent = 
          '[CATEGORIAS VALIDAS]\n' + JSON.stringify(categoriasTree) + '\n\n' +
          '[REFERENCIA: VOCABULARIO]\n' + (vocabCompacto || 'Vazio') + '\n\n' +
          '[REFERENCIA: HISTORICO JIT]\n' + (formatHistory(relevantHistory) || 'Vazio') + '\n\n' +
          `[TAREFA: NOVAS TRANSACOES (TOTAL: ${chunk.length} ITENS)]\n` + JSON.stringify(chunk) + '\n\n' +
          `Lembrete: O array "data" no seu JSON de resposta DEVE conter exatamente ${chunk.length} itens correspondentes aos itens acima. Mantenha os "cod" idênticos.`;

        console.log("User Content Completo enviado à API:", userContent);
        
        let t0 = performance.now();
        let resultCat = await window.IACore.chamarGemini(window.IACore.MODEL_PRO, systemPrompt, userContent, null, { _maxOutputTokens: 16384 });
        let t1 = performance.now();
        
        console.log(`Tempo de resposta Gemini: ${(t1 - t0).toFixed(2)}ms`);
        console.log("Resposta Bruta Gemini:", resultCat);
        
        if (resultCat && resultCat.status === 'success' && Array.isArray(resultCat.data)) {
            console.log(`Sucesso no Lote! Retornados: ${resultCat.data.length} de ${chunk.length} originais.`);
            if (resultCat.data.length < chunk.length) {
                console.error(`🚨 ALERTA DE PREGUIÇA IA: Faltaram ${chunk.length - resultCat.data.length} itens neste lote!`);
            }
            
            let parsedData = resultCat.data.map(item => {
                let originalTx = chunk.find(t => t.cod === item.cod);
                let is_parcelado = false;
                let parcela_atual = null;
                let total_parcelas = null;
                
                if (originalTx && originalTx.descricao) {
                    let pMatch = originalTx.descricao.match(/(\d{1,2})\/(\d{1,2})/);
                    if (pMatch) {
                        is_parcelado = true;
                        parcela_atual = parseInt(pMatch[1], 10);
                        total_parcelas = parseInt(pMatch[2], 10);
                    }
                }
                
                return {
                    ...item,
                    is_parcelado,
                    parcela_atual,
                    total_parcelas
                };
            });
            
            allData = allData.concat(parsedData);
        } else if (resultCat && Array.isArray(resultCat)) {
            console.warn("API retornou um array puro em vez de objeto status:", resultCat);
            allData = allData.concat(resultCat);
        } else {
            console.error("Falha bizarra no formato de resposta da API:", resultCat);
        }
        
        console.groupEnd();
    }

    console.log("Resumo Final de Categorização compilado:", allData);
    console.groupEnd();

    return { status: 'success', analise_ia: analiseFinal, data: allData };
  }

  async function categorizarProduto(nomeProduto, codigoProduto) {
    if (!window.IACore) throw new Error('IACore não carregado!');
    
    var systemPrompt = 'Voce e um assistente especialista em padronizar compras de supermercado e farmacia no Brasil. ' +
      'Seu objetivo e limpar o nome do produto (removendo abreviacoes confusas) e atribuir uma categoria principal. ' +
      'Retorne APENAS um JSON valido.';

    var userContent =
      'NOME DO PRODUTO (bruto da nota): ' + nomeProduto + '\n' +
      'CODIGO: ' + codigoProduto + '\n\n' +
      'REGRAS:\n' +
      '1. Limpe o nome: expanda abreviacoes (ex: "LG COST ANG" -> "Linguica de Costela Angus", "CR LEITE" -> "Creme de Leite").\n' +
      '2. Escolha uma categoria de supermercado (ex: "Mercado > Acougue", "Mercado > Limpeza", "Farmacia > Remedios").\n' +
      '3. Retorne EXATAMENTE este formato JSON: {"nomeLimpo": "Nome Formatado", "categoria": "Categoria Sugerida"}\n';

    return await window.IACore.chamarGemini(window.IACore.MODEL_LITE, systemPrompt, userContent, null, {});
  }

  async function melhorarNomesEmLote(itens) {
    if (!window.IACore) throw new Error('IACore não carregado!');
    if (!itens || itens.length === 0) return [];
    
    var systemInstruction = "Você é um especialista em produtos de supermercado brasileiro. Sua tarefa é transformar abreviações de nota fiscal em dados de produtos reais, completos e comerciais. Responda APENAS em formato JSON válido (um array de objetos).";

    var userPrompt = "Abaixo está uma lista de produtos de uma nota fiscal (EAN e Nome Abreviado).\n" +
      "Para cada um, descubra as informações reais e retorne a resposta como um array JSON exatamente no formato abaixo.\n\n" +
      "Formato de Saída esperado (exemplo):\n" +
      "[\n" +
      "  {\n" +
      "    \"ean\": \"123456\",\n" +
      "    \"descricao_ia\": \"Ração Úmida Whiskas Sachê Adulto Sabor Salmão 85g\",\n" +
      "    \"marca_fabricante\": \"Whiskas / Mars\",\n" +
      "    \"categoria\": \"Pet Shop\",\n" +
      "    \"volume_quantidade\": \"85\",\n" +
      "    \"unidade_medida\": \"g\"\n" +
      "  }\n" +
      "]\n\n" +
      "Lista para processar:\n" +
      JSON.stringify(itens.map(i => ({ ean: i.ean, descricao_abreviada: i.descricao })), null, 2);

    try {
      var response = await window.IACore.chamarGemini(window.IACore.MODEL_LITE, systemInstruction, userPrompt, null, { _maxOutputTokens: 8192 });
      if (Array.isArray(response)) return response;
      return [];
    } catch(err) {
      console.error("[IACategorizador] Erro melhorarNomesEmLote:", err);
      return [];
    }
  }

  return { categorizar, categorizarProduto, melhorarNomesEmLote };
})();
