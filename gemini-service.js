// gemini-service.js v3
// Corta Gastos - Servico Gemini
// Substituicao do Claude por Gemini 2.5.
// Chave API: prioridade Firestore > Remote Config > window.GEMINI_API_KEY

window.GeminiService = (function() {

  var MODEL_FLASH  = 'gemini-3.5-flash'; 
  var MODEL_LITE   = 'gemini-3.1-flash-lite';
  var MODEL_VISION = 'gemini-3.1-pro-preview'; 
  var MODEL_PRO    = 'gemini-3.1-pro-preview'; 
  var MODEL_BKP    = 'gemini-3.5-flash';
  var API_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

  var _apiKey = null;

  // Obtem a API key e modelos do Firestore AppConfig/gemini
  async function _getApiKey() {
    if (_apiKey) return _apiKey;

    // 1. Firestore /AppConfig/gemini -> apiKey + modelFlash + modelPro
    try {
      if (window.firebaseDB) {
        var snap = await window.firebaseDB.collection('AppConfig').doc('gemini').get();
        if (snap.exists) {
          var cfg = snap.data();
          if (cfg.apiKey && cfg.apiKey.length > 10) {
            _apiKey = cfg.apiKey;
          }
          // Modelos forçados no código conforme solicitação
          // Modelos forçados no código conforme solicitação
          MODEL_FLASH = 'gemini-3.5-flash';
          MODEL_LITE  = 'gemini-3.1-flash-lite';
          MODEL_PRO   = 'gemini-3.1-pro-preview';
          MODEL_BKP   = 'gemini-3.5-flash';
          console.log('[GeminiService] Config: key=' + (_apiKey ? 'OK' : 'ausente') +
                      ' | flash=' + MODEL_FLASH + ' | lite=' + MODEL_LITE + ' | pro=' + MODEL_PRO + ' | bkp=' + (MODEL_BKP || 'nenhum'));
          if (_apiKey) return _apiKey;
        }
      }
    } catch (fsErr) {
      console.warn('[GeminiService] Firestore AppConfig falhou:', fsErr.message);
    }

    // 2. Firebase Remote Config (gemini_api_key)
    try {
      if (typeof firebase !== 'undefined' && typeof firebase.remoteConfig === 'function') {
        var rc = firebase.remoteConfig();
        rc.settings = { minimumFetchIntervalMillis: 3600000 };
        await rc.fetchAndActivate();
        var rcKey = rc.getString('gemini_api_key');
        if (rcKey && rcKey.length > 10) {
          _apiKey = rcKey;
          console.log('[GeminiService] Chave carregada do Remote Config.');
          return _apiKey;
        }
      }
    } catch (rcErr) {
      console.warn('[GeminiService] Remote Config falhou:', rcErr.message);
    }

    // 3. Fallback local de desenvolvimento
    if (window.GEMINI_API_KEY) {
      _apiKey = window.GEMINI_API_KEY;
      console.log('[GeminiService] Chave carregada de window.GEMINI_API_KEY.');
      return _apiKey;
    }

    throw new Error('Gemini: chave nao encontrada. Crie AppConfig/gemini no Firestore com campo "apiKey".');
  }

  // Chamada base para a API Gemini REST
  async function _chamarGemini(model, systemPrompt, userContent) {
    if (localStorage.getItem('gemini_mock') === 'true') {
      console.warn('[GeminiService] ⚠️ MODO MOCK ATIVADO! Nenhuma chamada real à IA foi feita.');
      await new Promise(r => setTimeout(r, 1000));
      if (systemPrompt.includes('Extraia transacoes')) {
         return [
           { data: "01/01/2026", descricao: "MOCK SUPERMERCADO", valor: -150.50, tipo_transacao: "debito", identificador_bancario: "MCK1", categoria: "Supermercado" },
           { data: "02/01/2026", descricao: "MOCK PIX RECEBIDO", valor: 300.00, tipo_transacao: "credito", identificador_bancario: "MCK2", categoria: "Renda" }
         ];
      }
      if (systemPrompt.includes('Categorize as transacoes')) {
         var mockArr1 = [];
         try {
            var items = JSON.parse(userContent);
            for (var i of items) { mockArr1.push({ id: i.id, categoria: "Mock Categoria", subcategoria: "Mock Sub" }); }
         } catch(e){}
         return mockArr1;
      }
      if (systemPrompt.includes('abreviações de nota fiscal')) {
         var mockArr2 = [];
         try {
            var linhas = userContent.split('\n');
            for(var l of linhas) {
               var parts = l.split('|');
               if (parts.length >= 2) {
                   mockArr2.push({ id: parts[0].trim(), nomeLimpo: parts[1].trim() + " (Mock)", categoria: "Mercado", subcategoria: "Alimentação" });
               }
            }
         } catch(e){}
         return mockArr2;
      }
      return { mock: true };
    }

    var apiKey = await _getApiKey();

    var body = {
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    var url = API_BASE + '/' + model + ':generateContent?key=' + apiKey;
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var errText = await res.text();
      var errObj = {};
      try { errObj = JSON.parse(errText); } catch(e) {}
      var errMsg = (errObj.error && errObj.error.message) ? errObj.error.message : errText.substring(0, 200);

      // Tenta o modelo de backup antes de desistir
      if (MODEL_BKP && MODEL_BKP !== model) {
        console.warn('[GeminiService] ' + model + ' falhou (' + res.status + '), tentando backup: ' + MODEL_BKP);
        var resBkp = await fetch(API_BASE + '/' + MODEL_BKP + ':generateContent?key=' + apiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (resBkp.ok) {
          var jsonBkp = await resBkp.json();
          var textBkp = (jsonBkp.candidates && jsonBkp.candidates[0] &&
                         jsonBkp.candidates[0].content && jsonBkp.candidates[0].content.parts &&
                         jsonBkp.candidates[0].content.parts[0] &&
                         jsonBkp.candidates[0].content.parts[0].text) || '{}';
          var cleanBkp = textBkp.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
          return JSON.parse(cleanBkp);
        }
      }

      throw new Error('Gemini API [' + res.status + ']: ' + errMsg);
    }

    var json = await res.json();
    var text = (json.candidates && json.candidates[0] &&
                json.candidates[0].content && json.candidates[0].content.parts &&
                json.candidates[0].content.parts[0] &&
                json.candidates[0].content.parts[0].text) || '{}';

    var clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(clean);
  }

  // EXTRACAO DE EXTRATO - substitui action: 'importar_simples_v2'
  async function extrairExtrato(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        console.warn('[GeminiService] MODO MOCK ATIVADO: Redirecionando importação para o Apps Script original');
        var extensao = (opts.fileName || "").split('.').pop().toLowerCase();
        var base64Data = (opts.fileType === 'pdf') ? opts.fileContent : btoa(unescape(encodeURIComponent(opts.fileContent)));
        
        var payload = {
            action: 'importar_simples_v2',
            arquivoBase64: base64Data,
            tipo: opts.fileType,
            nome: opts.fileName,
            extensao: extensao
        };
        
        var res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        var json = await res.json();
        if (json.status === 'success') {
            return json.dados;
        } else {
            throw new Error(json.message || "Erro no importador legado");
        }
    }

    var fileContent = opts.fileContent;
    var fileType = opts.fileType;
    var fileName = opts.fileName;
    var contasInfo = opts.contasInfo || [];

    var systemPrompt = 'Voce e um especialista em financas pessoais brasileiras. ' +
      'Extraia transacoes de extratos bancarios. Retorne APENAS JSON valido.';

    if (fileType === 'pdf') {
      systemPrompt += ' ATENÇÃO: Analise todas as páginas meticulosamente linha por linha. Não omita nenhuma transação nem pule páginas sob nenhuma circunstância.';
    }

    var userContent =
      'Extraia as transacoes do extrato abaixo.\n\n' +
      'CONTAS CONHECIDAS: ' + JSON.stringify(contasInfo) + '\n\n' +
      'ARQUIVO (' + fileName + ', tipo: ' + fileType + '):\n' +
      fileContent + '\n\n' +
      'REGRAS:\n' +
      '1. Colunas: data (DD/MM/AAAA), vencimento (DD/MM/AAAA), descricao, valor (negativo=debito), conta\n' +
      '2. Para conta corrente: vencimento = data. Para cartao: vencimento = data da fatura\n' +
      '3. IGNORE transferencias proprias, pagamentos de fatura\n' +
      '4. PARCELAS formato (1/6): projete todas com vencimentos mensais\n' +
      '5. Identifique o nome da conta e vencimento se for cartao\n' +
      '6. Se o documento contiver saldo inicial e/ou saldo final (ou anterior para cartao), extraia-os como numeros. Se nao, retorne null.\n\n' +
      'RETORNE EXATAMENTE:\n' +
      '{"status":"success","analise_ia":"resumo em 1 frase","data":{"cabecalho":{"Nome da conta":"...","Vencimento da fatura":null,"saldo_inicial":null,"saldo_final":null},"lancamentos":[{"data":"DD/MM/AAAA","vencimento":"DD/MM/AAAA","descricao":"...","valor":-100.00,"conta":"..."}]}}';

    var modelToUse = (fileType === 'pdf') ? MODEL_FLASH : MODEL_LITE;
    return await _chamarGemini(modelToUse, systemPrompt, userContent);
  }

  // CATEGORIZACAO COM HISTORICO - substitui action: 'categorizar_v2'
  async function categorizar(opts) {
    var transacoes = opts.transacoes;
    var categoriasTree = opts.categoriasTree;
    var isCartaoCredito = opts.isCartaoCredito;
    var historico180dias = opts.historico180dias || [];

    var systemPrompt = 'Voce e um categorizador financeiro pessoal brasileiro. ' +
      'Use o historico para aprender o padrao de categorizacao do usuario. ' +
      'Retorne APENAS JSON valido.';

    var historicoCompacto = historico180dias
      .slice(-150)
      .map(function(l) {
        return l.data + '|' + l.descricao + '|' + l.valor + '|' + (l.categoria || '') + '|' + (l.subcategoria || '');
      })
      .join('\n');

    var userContent =
      'HISTORICO 180 DIAS (padrao do usuario):\n' +
      (historicoCompacto || 'Sem historico.') + '\n\n' +
      'CATEGORIAS: ' + JSON.stringify(categoriasTree) + '\n\n' +
      'CARTAO: ' + isCartaoCredito + '\n\n' +
      'TRANSACOES:\n' + JSON.stringify(transacoes) + '\n\n' +
      'REGRAS:\n' +
      '1. Use APENAS categorias da lista\n' +
      '2. Incerto: categoria=""\n' +
      '3. Aprenda com historico\n\n' +
      'RETORNE:\n' +
      '{"status":"success","analise_ia":"resumo","data":[{...transacao_com_categoria}]}';

    return await _chamarGemini(MODEL_PRO, systemPrompt, userContent);
  }

  // CATEGORIZAR PRODUTO INDIVIDUAL (NF-e Scanner)
  async function categorizarProduto(nomeProduto, codigoProduto) {
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

    return await _chamarGemini(MODEL_FLASH, systemPrompt, userContent);
  }

  async function melhorarNomesEmLote(itens) {
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
      var response = await _chamarGemini(MODEL_FLASH, systemInstruction, userPrompt);
      if (Array.isArray(response)) return response;
      return [];
    } catch(err) {
      console.error("[GeminiService] Erro melhorarNomesEmLote:", err);
      return [];
    }
  }

  return { extrairExtrato, categorizar, categorizarProduto, melhorarNomesEmLote };

})();

console.log('[GeminiService] v3 carregado (Firestore > RemoteConfig > local).');
