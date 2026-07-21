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

    var systemPrompt = 'Você é um motor de categorização financeira semântica de alta precisão. ' +
      'Analise as transações fornecidas e mapeie cada uma para a categoria mais apropriada, ' +
      'baseando-se EXCLUSIVAMENTE nos padrões históricos do usuário fornecidos. Retorne APENAS JSON válido.';

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
    let analiseFinal = "Classifiquei seus gastos mais rápido que um golpe de shuriken!";
    const CHUNK_SIZE = 15;

    for (let i = 0; i < transacoesAll.length; i += CHUNK_SIZE) {
        let chunk = transacoesAll.slice(i, i + CHUNK_SIZE);

        var userContent = 
          '<vocabulario_usuario>\n' + (vocabCompacto || 'Sem vocabulario.') + '\n</vocabulario_usuario>\n\n' +
          '<historico_conta_atual_360d>\n' + (formatHistory(historicoConta360d) || 'Sem historico.') + '\n</historico_conta_atual_360d>\n\n' +
          '<historico_transferencias_30>\n' + (formatHistory(historicoTransferencias360d) || 'Sem transferencias.') + '\n</historico_transferencias_30>\n\n' +
          '<historico_global_recentes_120d>\n' + (formatHistory(historicoGlobal120d) || 'Sem historico global.') + '\n</historico_global_recentes_120d>\n\n' +
          '<novas_transacoes>\n' + JSON.stringify(chunk) + '\n</novas_transacoes>\n\n' +
          '<instrucoes_finais>\n' +
          'Você é um cientista de dados financeiro Ninja. Siga estas regras estritas:\n' +
          '1. Priorize <historico_conta_atual_360d> e <vocabulario_usuario> para decidir a categoria.\n' +
          '2. Para transações novas, aja analiticamente: deduza a natureza real do gasto por trás do nome (Ex: "ZAMP S.A." -> Alimentação, "Energisa" -> Casa, "Brasilprev" -> Seguros/Previdência).\n' +
          '3. Valores negativos = despesas. Valores positivos = receitas, transferências ou ESTORNOS.\n' +
          '4. REGRA DE ESTORNO: Se for um estorno ou devolução (ex: "Estorno de Débito SEGURO DE VIDA"), a categoria DEVE SER EXATAMENTE A MESMA da despesa original. Nunca classifique estornos de despesas como Receitas.\n' +
          '5. Use APENAS categorias da lista: ' + JSON.stringify(categoriasTree) + '.\n' +
          '6. PARCELAMENTO: Busque "1/6", "01/06", "1-6". Se achar, is_parcelado=true e preencha as parcelas.\n' +
          '7. Campo "analise_ia" NO INICIO do JSON - MAX 1 FRASE CURTA sendo bem direto, em tom cômico de um mestre Ninja cortador de gastos. SEM QUEBRAS DE LINHA, sem acento.\n' +
          '8. CRÍTICO: array "data" contem EXATAMENTE ' + chunk.length + ' elementos - um para cada item de <novas_transacoes>. PROIBIDO incluir histórico. OBRIGATÓRIO manter o valor "cod" original exato (copie igual da entrada).\n' +
          'RETORNE EXATAMENTE (com ' + chunk.length + ' itens no array data):\n' +
          '{"status":"success","analise_ia":"Classifiquei seus gastos mais rapido que um golpe de shuriken!","data":[{"cod":"(copie o cod original)","categoria":"...","subcategoria":"...","descricao_limpa":"...","is_parcelado":false,"parcela_atual":null,"total_parcelas":null}]}\n' +
          '</instrucoes_finais>';

        let resultCat = await window.IACore.chamarGemini(window.IACore.MODEL_PRO, systemPrompt, userContent, null, { _maxOutputTokens: 8192 });
        
        if (resultCat && resultCat.status === 'success' && Array.isArray(resultCat.data)) {
            allData = allData.concat(resultCat.data);
            if (resultCat.analise_ia) analiseFinal = resultCat.analise_ia;
        } else if (resultCat && Array.isArray(resultCat)) {
            allData = allData.concat(resultCat);
        }
    }

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
      var response = await window.IACore.chamarGemini(window.IACore.MODEL_LITE, systemInstruction, userPrompt, null, { _maxOutputTokens: 4096 });
      if (Array.isArray(response)) return response;
      return [];
    } catch(err) {
      console.error("[IACategorizador] Erro melhorarNomesEmLote:", err);
      return [];
    }
  }

  return { categorizar, categorizarProduto, melhorarNomesEmLote };
})();
