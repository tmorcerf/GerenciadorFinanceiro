REGRAS DE AVALIAÇÃO DE CERTEZA E DÚVIDA (MUITO IMPORTANTE):
1. Para cada transação, avalie o nível de confiança na categorização (escore de 0.0 a 1.0).
2. STATUS "certeza": APENAS se a confiança for muito alta (>= 0.85) ou houver histórico/regras claras.
   - NUNCA use "Diversos" com status "certeza" se a descrição for o nome de uma pessoa física ou empresa desconhecida!
   - Se você não sabe o que é, NÃO CHUTE COM CERTEZA.
   - "pergunta": null, "opcoes_sugeridas": null
3. STATUS "duvida": Se a descrição for ambígua, nome de pessoa (PIX), nome fantasia obscuro, ou se você estiver inclinado a colocar em "Diversos":
   - "status": "duvida"
   - "categoria" e "subcategoria": Preencha com seu MELHOR PALPITE (ex: "Diversos").
   - "pergunta": FORMULE UMA PERGUNTA DIRETA ao usuário. Ex: "Você fez um Pix para JOAO SILVA. Isso foi pagamento de algum serviço, empréstimo, ou rachou a conta?"
   - "opcoes_sugeridas": Array com 3 palpites prováveis (ex: ["Serviço", "Empréstimo", "Rachar Conta", "Outro"]).
   - É preferível perguntar e ter status="duvida" do que classificar errado silenciosamente.REGRAS DE AVALIAÇÃO DE CERTEZA E DÚVIDA:
1. Para cada transação, avalie o nível de confiança na categorização (escore de 0.0 a 1.0).
2. STATUS "certeza": Se a confiança for alta (>= 0.80) ou houver histórico/regras claras:
   - "status": "certeza"
   - "categoria" e "subcategoria": Preencha com a categoria exata da lista.
   - "confianca": valor entre 0.80 e 1.00.
   - "pergunta": null
   - "opcoes_sugeridas": null
3. STATUS "duvida": Se a descrição for ambígua, genérica (ex: "PAGTO PIX", "MERCADO", "COMPRA SP", "ZAMP S.A.") ou puder pertencer a múltiplas categorias:
   - "status": "duvida"
   - "categoria" e "subcategoria": Preencha OBRIGATORIAMENTE com seu MELHOR PALPITE da lista (NUNCA deixe em branco ou nulo).
   - "confianca": valor entre 0.30 e 0.79.
   - "pergunta": Formula uma pergunta clara, curta e amigável para o usuário esclarecer a despesa.
   - "opcoes_sugeridas": Array com 2 a 4 opções curtas de resposta (ex: ["Refeição", "Corporativo", "Outro"]).

REGRAS ESTABELECIDAS:
1. O array de saída "data" DEVE ter EXATAMENTE o mesmo número de itens do array de entrada.
2. O campo "cod" deve ser copiado exatamente como recebido.
3. Valores negativos = despesas. Positivos = receitas, transferências ou ESTORNOS.
4. CATEGORIAS DE SISTEMA (PRIORIDADE MÁXIMA):
   - Se for estorno, devolução ou reembolso (ex: "Estorno de Débito", "Pix devolvido"), use a categoria "Estorno" (status: "certeza").
   - Se for pagamento de fatura de cartão de crédito, use a categoria "Pagamento de Cartão" (status: "certeza").
   - Se for transferência entre contas próprias, envio/recebimento de mesmo titular, use a categoria "Transf. entre Contas" (status: "certeza").
   - Se for aplicação, CDB, Tesouro, ou corretora, use a categoria "Investimentos" (status: "certeza").
5. Para demais gastos, deduza a natureza real por trás do nome (Ex: "ZAMP S.A." -> Alimentação, "Energisa" -> Moradia, "Brasilprev" -> Seguros).
6. Use APENAS as categorias da lista fornecida no Prompt do Usuário. NUNCA invente categorias novas.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Retorne APENAS um objeto JSON válido seguindo exatamente esta estrutura:
{
  "status": "success",
  "data": [
    {
      "cod": "ID_COPIADO_DA_ENTRADA",
      "status": "certeza",
      "categoria": "Alimentação",
      "subcategoria": "Restaurante",
      "confianca": 0.95,
      "pergunta": null,
      "opcoes_sugeridas": null,
      "descricao_limpa": "Descrição amigável sem lixo"
    },
    {
      "cod": "ID_COPIADO_DA_ENTRADA_2",
      "status": "duvida",
      "categoria": "Alimentação",
      "subcategoria": "Restaurante",
      "confianca": 0.60,
      "pergunta": "Sua compra na ZAMP S.A. foi refeição individual ou compra corporativa?",
      "opcoes_sugeridas": ["Refeição", "Corporativo", "Outro"],
      "descricao_limpa": "Zamp S.A."
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

    const normalizeDesc = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\x00-\x1F\x7F-\x9F]/g, '').replace(/\s+/g, ' ').trim();

    let transacoesParaLLM = [];
    let transacoesShortCircuited = [];

    (transacoesLimpas || []).forEach(t => {
        const normT = normalizeDesc(t.descricao);
        const matchingRule = (Array.isArray(regrasIA) ? regrasIA : []).find(r => {
            const normR = normalizeDesc(r.descricao_padrao || r.descricao);
            return normR && normT === normR;
        });

        if (matchingRule) {
            let is_parcelado = false;
            let parcela_atual = null;
            let total_parcelas = null;
            if (t.descricao) {
                let pMatch = t.descricao.match(/(\d{1,2})\/(\d{1,2})/);
                if (pMatch) {
                    is_parcelado = true;
                    parcela_atual = parseInt(pMatch[1], 10);
                    total_parcelas = parseInt(pMatch[2], 10);
                }
            }

            transacoesShortCircuited.push({
                ...t,
                cod: t.cod,
                status: 'certeza',
                categoria: matchingRule.categoria,
                subcategoria: matchingRule.subcategoria || '',
                confianca: 1.0,
                pergunta: null,
                opcoes_sugeridas: null,
                descricao_limpa: t.descricao || '',
                is_parcelado,
                parcela_atual,
                total_parcelas
            });
        } else {
            transacoesParaLLM.push(t);
        }
    });

    var allHistory = [...historicoConta360d, ...historicoTransferencias360d, ...historicoGlobal120d];
    var uniqueHistory = new Map();
    allHistory.forEach(t => {
        var cleanDesc = sanitizeForLLM(t.descricao || '').toUpperCase().replace(/[0-9]/g, '').trim();
        var key = cleanDesc + '|' + (t.categoria||'') + '|' + (t.subcategoria||'');
        if (!uniqueHistory.has(key)) uniqueHistory.set(key, t);
    });
    var deduplicatedHistory = Array.from(uniqueHistory.values());

    console.groupCollapsed(`[Ninja Categorizador] Iniciando Processamento IA - Total: ${transacoesLimpas.length} transações (${transacoesShortCircuited.length} via regras, ${transacoesParaLLM.length} via LLM)`);
    console.log("Categorias Tree:", categoriasTree);
    console.log("Histórico Dedup Total:", deduplicatedHistory.length, "itens únicos de um total de", allHistory.length);
    console.log("Vocabulário:", vocabEntries.length, "itens");

    for (let i = 0; i < transacoesParaLLM.length; i += CHUNK_SIZE) {
        let chunk = transacoesParaLLM.slice(i, i + CHUNK_SIZE);
        console.groupCollapsed(`[Ninja Categorizador] Processando Lote ${Math.floor(i/CHUNK_SIZE)+1} (Tamanho do Lote: ${chunk.length})`);

        let chunkKeywords = new Set();
        chunk.forEach(t => { extractKeywords(t.descricao).forEach(w => chunkKeywords.add(w)); });

        let relevantHistory = deduplicatedHistory.filter(h => {
            let hWords = extractKeywords(h.descricao);
            return hWords.some(w => chunkKeywords.has(w));
        }).slice(0, 30);

        var regrasFormatadas = (Array.isArray(regrasIA) && regrasIA.length > 0)
            ? '[REGRAS APRENDIDAS DO USUÁRIO (PRIORIDADE MÁXIMA)]\n' + regrasIA.map(function(r) {
                return '- "' + (r.descricao_padrao || r.descricao || '') + '" → Categoria: "' + (r.categoria || '') + '", Subcategoria: "' + (r.subcategoria || '') + '" (FORÇAR CERTEZA)';
              }).join('\n') + '\n\n'
            : '';

        var userContent = 
          '[CATEGORIAS VALIDAS]\n' + JSON.stringify(categoriasTree) + '\n\n' +
          regrasFormatadas +
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
        
        let rawItems = null;
        if (resultCat && resultCat.status === 'success' && Array.isArray(resultCat.data)) {
            rawItems = resultCat.data;
        } else if (resultCat && Array.isArray(resultCat)) {
            console.warn("API retornou um array puro em vez de objeto status:", resultCat);
            rawItems = resultCat;
        }

        if (rawItems) {
            console.log(`Sucesso no Lote! Retornados: ${rawItems.length} de ${chunk.length} originais.`);
            if (rawItems.length < chunk.length) {
                console.error(`🚨 ALERTA DE PREGUIÇA IA: Faltaram ${chunk.length - rawItems.length} itens neste lote!`);
            }
            
            let parsedData = rawItems.map(item => {
                let originalTx = chunk.find(t => t.cod === item.cod);
                let status = item.status === 'duvida' ? 'duvida' : 'certeza';
                let confianca = typeof item.confianca === 'number' ? item.confianca : (status === 'duvida' ? 0.60 : 0.95);
                let pergunta = status === 'duvida' ? (item.pergunta || `Como deseja categorizar "${item.descricao_limpa || (originalTx ? originalTx.descricao : '')}"?`) : null;
                let opcoes = status === 'duvida'
                    ? (Array.isArray(item.opcoes_sugeridas) && item.opcoes_sugeridas.length > 0 ? item.opcoes_sugeridas : ['Confirmar', 'Alterar'])
                    : null;

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
                    status: status,
                    categoria: item.categoria || 'DIVERSOS',
                    subcategoria: item.subcategoria || 'Diversos',
                    confianca: confianca,
                    pergunta: pergunta,
                    opcoes_sugeridas: opcoes,
                    descricao_limpa: item.descricao_limpa || (originalTx ? originalTx.descricao : ''),
                    is_parcelado,
                    parcela_atual,
                    total_parcelas
                };
            });
            
            allData = allData.concat(parsedData);
        } else {
            console.error("Falha bizarra no formato de resposta da API:", resultCat);
        }
        
        console.groupEnd();
    }

    const finalCombinedData = [...transacoesShortCircuited, ...allData];
    console.log("Resumo Final de Categorização compilado:", finalCombinedData);
    console.groupEnd();

    return { status: 'success', analise_ia: analiseFinal, data: finalCombinedData };
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
