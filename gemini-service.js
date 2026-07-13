// gemini-service.js v3
// Corta Gastos - Servico Gemini
// Substituicao do Claude por Gemini 2.5.
// Chave API: prioridade Firestore > Remote Config > window.GEMINI_API_KEY

window.GeminiService = (function() {

  var MODEL_FLASH = 'gemini-3.1-pro';
  var MODEL_PRO   = 'gemini-3.1-pro';
  var API_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

  var _apiKey = null;

  // Obtem a API key em tres fontes, em ordem de prioridade
  async function _getApiKey() {
    if (_apiKey) return _apiKey;

    // 1. Firestore /AppConfig/gemini -> apiKey (mais simples e confiavel)
    try {
      if (window.firebaseDB) {
        var snap = await window.firebaseDB.collection('AppConfig').doc('gemini').get();
        if (snap.exists && snap.data().apiKey && snap.data().apiKey.length > 10) {
          _apiKey = snap.data().apiKey;
          console.log('[GeminiService] Chave carregada do Firestore/AppConfig.');
          return _apiKey;
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
    var fileContent = opts.fileContent;
    var fileType = opts.fileType;
    var fileName = opts.fileName;
    var contasInfo = opts.contasInfo || [];

    var systemPrompt = 'Voce e um especialista em financas pessoais brasileiras. ' +
      'Extraia transacoes de extratos bancarios. Retorne APENAS JSON valido.';

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
      '5. Identifique o nome da conta e vencimento se for cartao\n\n' +
      'RETORNE EXATAMENTE:\n' +
      '{"status":"success","analise_ia":"resumo em 1 frase","data":{"cabecalho":{"Nome da conta":"...","Vencimento da fatura":null},"lancamentos":[{"data":"DD/MM/AAAA","vencimento":"DD/MM/AAAA","descricao":"...","valor":-100.00,"conta":"..."}]}}';

    return await _chamarGemini(MODEL_FLASH, systemPrompt, userContent);
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

  return { extrairExtrato, categorizar };

})();

console.log('[GeminiService] v3 carregado (Firestore > RemoteConfig > local).');
