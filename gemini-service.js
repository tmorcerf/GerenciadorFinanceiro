// gemini-service.js
// Corta Gastos - Servico Gemini
// Substitui as chamadas ao Claude (Anthropic via Apps Script) pelo Gemini.
// Chave API via Firebase Remote Config (segura) ou window.GEMINI_API_KEY (fallback local).

window.GeminiService = (function() {

  var MODEL_FLASH = 'gemini-2.5-flash'; // Extracao (rapido, barato)
  var MODEL_PRO   = 'gemini-2.5-pro';   // Categorizacao (inteligente)
  var API_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

  var _apiKey = null;

  // Obtem a API key do Firebase Remote Config, fallback para variavel local
  async function _getApiKey() {
    if (_apiKey) return _apiKey;

    try {
      if (typeof firebase !== 'undefined' && firebase.remoteConfig) {
        var rc = firebase.remoteConfig();
        rc.settings = { minimumFetchIntervalMillis: 3600000 };
        await rc.fetchAndActivate();
        var key = rc.getString('gemini_api_key');
        if (key && key.length > 10) {
          _apiKey = key;
          console.log('[GeminiService] Chave carregada do Remote Config.');
          return _apiKey;
        }
      }
    } catch (err) {
      console.warn('[GeminiService] Remote Config indisponivel:', err.message);
    }

    if (window.GEMINI_API_KEY) {
      _apiKey = window.GEMINI_API_KEY;
      return _apiKey;
    }

    throw new Error('Chave da API Gemini nao configurada. Acesse o Firebase Remote Config e defina "gemini_api_key".');
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
      throw new Error('Gemini API error ' + res.status + ': ' + errText);
    }

    var json = await res.json();
    var text = (json.candidates && json.candidates[0] &&
                json.candidates[0].content && json.candidates[0].content.parts &&
                json.candidates[0].content.parts[0] &&
                json.candidates[0].content.parts[0].text) || '{}';

    // Remove markdown code fences se presentes
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
      'Sua funcao e extrair transacoes de extratos bancarios. ' +
      'Retorne APENAS JSON valido, sem explicacoes, sem markdown.';

    var userContent =
      'Extraia as transacoes do extrato bancario abaixo.\n\n' +
      'CONTAS CONHECIDAS: ' + JSON.stringify(contasInfo) + '\n\n' +
      'ARQUIVO (' + fileName + ', tipo: ' + fileType + '):\n' +
      fileContent + '\n\n' +
      'REGRAS:\n' +
      '1. Colunas: data (DD/MM/AAAA), vencimento (DD/MM/AAAA), descricao, valor (numero puro, negativo=debito), conta\n' +
      '2. Para conta corrente: vencimento = data. Para cartao: vencimento = data de vencimento da fatura\n' +
      '3. IGNORE transferencias proprias, pagamentos de fatura, aplicacoes (serao tratados separadamente)\n' +
      '4. PARCELAS: se encontrar formato (1/6), projete todas as 6 parcelas com vencimentos mensais\n' +
      '5. Identifique "Nome da conta" para o cabecalho. Se for cartao, identifique "Vencimento da fatura"\n\n' +
      'RETORNE EXATAMENTE ESTE JSON:\n' +
      '{"status":"success","analise_ia":"resumo em 1 frase","data":{"cabecalho":{"Nome da conta":"...","Vencimento da fatura":null},"lancamentos":[{"data":"DD/MM/AAAA","vencimento":"DD/MM/AAAA","descricao":"...","valor":-100.00,"conta":"..."}]}}';

    return await _chamarGemini(MODEL_FLASH, systemPrompt, userContent);
  }

  // CATEGORIZACAO COM HISTORICO - substitui action: 'categorizar_v2'
  async function categorizar(opts) {
    var transacoes = opts.transacoes;
    var categoriasTree = opts.categoriasTree;
    var isCartaoCredito = opts.isCartaoCredito;
    var historico180dias = opts.historico180dias || [];

    var systemPrompt = 'Voce e um categorizador financeiro pessoal brasileiro expert. ' +
      'Use o historico do usuario para APRENDER o padrao de categorizacao DELE especificamente. ' +
      'Retorne APENAS JSON valido, sem explicacoes, sem markdown.';

    // Formata historico de forma compacta para economizar tokens
    var historicoCompacto = historico180dias
      .slice(-150)
      .map(function(l) {
        return l.data + '|' + l.descricao + '|' + l.valor + '|' + (l.categoria || '') + '|' + (l.subcategoria || '');
      })
      .join('\n');

    var userContent =
      'HISTORICO DOS ULTIMOS 180 DIAS (aprenda o padrao do usuario):\n' +
      (historicoCompacto || 'Sem historico.') + '\n\n' +
      'CATEGORIAS DISPONÍVEIS:\n' + JSON.stringify(categoriasTree) + '\n\n' +
      'E CARTAO DE CREDITO: ' + isCartaoCredito + '\n\n' +
      'TRANSACOES PARA CATEGORIZAR:\n' + JSON.stringify(transacoes) + '\n\n' +
      'REGRAS:\n' +
      '1. Use APENAS categorias da lista. PROIBIDO inventar categorias.\n' +
      '2. Se incerto, deixe categoria="" e subcategoria=""\n' +
      '3. Aprenda com o historico: se o usuario sempre classifica "Padaria X" como "Alimentacao/Padaria", repita\n' +
      '4. Para parcelamentos, preencha parcelamento_info: { "parcela_atual": N, "parcelas_total": Y }\n\n' +
      'RETORNE EXATAMENTE ESTE JSON:\n' +
      '{"status":"success","analise_ia":"resumo em 1 frase","data":[{...transacao_com_categoria_e_subcategoria}]}';

    return await _chamarGemini(MODEL_PRO, systemPrompt, userContent);
  }

  return { extrairExtrato, categorizar };

})();

console.log('[GeminiService] Modulo carregado. Pronto para substituir Claude.');
