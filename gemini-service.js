// gemini-service.js v3
// Corta Gastos - Servico Gemini
// Substituicao do Claude por Gemini 2.5.
// Chave API: prioridade Firestore > Remote Config > window.GEMINI_API_KEY

window.GeminiService = (function() {

  var MODEL_FLASH  = 'gemini-2.5-flash-lite'; 
  var MODEL_LITE   = 'gemini-3.1-flash-lite';
  var MODEL_VISION = 'gemini-3.1-pro-preview'; 
  var MODEL_PRO    = 'gemini-3.1-pro-preview'; 
  var MODEL_BKP    = 'gemini-3.1-pro-preview';
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
          MODEL_FLASH = 'gemini-2.5-flash-lite';
          MODEL_LITE  = 'gemini-3.1-flash-lite';
          MODEL_PRO   = 'gemini-3.1-pro-preview';
          MODEL_BKP   = 'gemini-3.1-pro-preview';
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
  async function _chamarGemini(model, systemPrompt, userContent, inlineData) {
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

    var parts = [{ text: userContent }];
    if (inlineData) {
      parts.push({
        inlineData: {
          mimeType: inlineData.mimeType,
          data: inlineData.data
        }
      });
    }

    var body = {
      contents: [{ role: 'user', parts: parts }],
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

      if (res.status === 503) {
          throw new Error('Atenção Ninja 🥷: Os servidores do Google estão muito congestionados agora (Erro 503). Como um bom ninja, aguarde nas sombras e tente enviar novamente em alguns segundos!');
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

  // 1. IA EXTRATORA (O Operário de Dados)
  async function extrairExtrato(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        console.warn('[GeminiService] 🥔 MODO BATATA ATIVADO!');
        await new Promise(r => setTimeout(r, 800)); // Simula tempo de rede
        
        var extensao = (opts.fileName || "").split('.').pop().toLowerCase();
        if (opts.fileType === 'pdf' || extensao === 'pdf' || extensao === 'png' || extensao === 'jpg') {
            throw new Error("Modo Batata não aceita PDF ou Imagens. Envie um extrato em CSV ou Excel.");
        }

        let lancamentos_batata = [];
        try {
            let csvText = opts.fileContent || "";
            if (!csvText.includes('\n')) {
               try { csvText = decodeURIComponent(escape(atob(csvText))); } catch(e){}
            }

            let linhas = csvText.split('\n');
            for(let l of linhas) {
                if(!l.trim()) continue;
                let delimiter = l.includes(';') ? ';' : (l.includes('\t') ? '\t' : ',');
                let parts = l.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
                if(parts.length >= 2) {
                   let dataMatch = l.match(/\d{2}\/\d{2}\/\d{2,4}/);
                   if (!dataMatch) continue; // Pula linha se não achar data
                   
                   let data = dataMatch[0];
                   if (data.length === 8) { // converte dd/mm/yy p dd/mm/yyyy
                       let pData = data.split('/');
                       data = pData[0] + '/' + pData[1] + '/20' + pData[2];
                   }
                   
                   let strValor = parts.find(p => p.match(/^-?\s*(R\$)?\s*-?\s*\d[\d.,]*\s*$/) && !p.match(/\d{2}\/\d{2}/));
                   
                   let valor = 0;
                   if (strValor) {
                       strValor = strValor.replace(/R\$/g, '').replace(/\s/g, '');
                       // Tratamento inteligente de ponto e vírgula
                       if (strValor.includes(',') && strValor.includes('.')) {
                           let lastComma = strValor.lastIndexOf(',');
                           let lastDot = strValor.lastIndexOf('.');
                           if (lastComma > lastDot) {
                               strValor = strValor.replace(/\./g, '').replace(',', '.');
                           } else {
                               strValor = strValor.replace(/,/g, '');
                           }
                       } else if (strValor.includes(',')) {
                           strValor = strValor.replace(',', '.');
                       }
                       valor = parseFloat(strValor);
                   }
                   if (isNaN(valor) || valor === 0) continue;
                   
                   let descParts = parts.filter(p => !p.match(/\d{2}\/\d{2}/) && !p.match(/^-?\s*(R\$)?\s*-?\s*\d[\d.,]*\s*$/) && p.length > 2);
                   let desc = descParts.sort((a,b)=>b.length - a.length)[0] || "Transação";
                   
                   lancamentos_batata.push({
                       data: data,
                       vencimento: data,
                       descricao: "🥔 " + desc,
                       valor: valor,
                       conta: "Conta Batata"
                   });
                }
            }
        } catch(e) {
            console.error("Erro no parser batata:", e);
        }

        if (lancamentos_batata.length === 0) {
            lancamentos_batata = [
                { data: "10/07/2026", vencimento: "10/07/2026", descricao: "🥔 MOCK FALLBACK - COMPRA", valor: -150.00, conta: "Conta Batata" }
            ];
        }

        return {
            status: 'success',
            analise_ia: "Importação simulada via Modo Batata 100% offline",
            data: {
                cabecalho: {
                    "Nome da conta": "Conta Batata",
                    "Vencimento da fatura": null,
                    "saldo_inicial": 0,
                    "saldo_final": 0
                },
                lancamentos: lancamentos_batata
            }
        };
    }

    var fileContent = opts.fileContent;
    var fileType = opts.fileType;
    var fileName = opts.fileName;
    var contasInfo = opts.contasInfo || [];

    var systemPrompt = 'Você é um sistema estrito de extração de dados financeiros. Sua única função é converter o documento bruto (extrato bancário) em um esquema JSON preciso. Não invente dados e não categorize nada.';

    if (fileType === 'pdf') {
      systemPrompt += ' ATENÇÃO: Analise todas as páginas meticulosamente linha por linha. Não omita nenhuma transação sob nenhuma circunstância.';
    }

    var contaNomes = contasInfo.map(function(c) { return c.nome; });

    var userContent =
      'Extraia as transacoes do extrato abaixo.\n\n' +
      'CONTAS CADASTRADAS DO USUARIO: ' + JSON.stringify(contasInfo) + '\n\n' +
      'ARQUIVO (' + fileName + ', tipo: ' + fileType + '):\n';
    
    var inlineData = null;
    if (fileType === 'pdf' || fileType === 'png' || fileType === 'jpg') {
        userContent += '[O documento foi anexado nativamente na requisicao]\n\n';
        inlineData = { mimeType: fileType === 'pdf' ? 'application/pdf' : 'image/' + fileType, data: fileContent };
    } else {
        userContent += fileContent + '\n\n';
    }

    userContent +=
      'REGRAS ESTRITAS DE EXTRAÇÃO:\n' +
      '1. Identifique a conta exata que corresponde ao documento usando a lista CONTAS CADASTRADAS.\n' +
      '2. Extraia o saldo_inicial e saldo_final exatos contidos no documento. Se não houver, retorne null.\n' +
      '3. Extraia a lista de transações com data (DD/MM/AAAA), descricao original bruta, e valor numérico (negativo para débitos, positivo para créditos).\n' +
      '4. Para conta corrente, vencimento = data. Para cartão de crédito, procure e extraia a data de vencimento da fatura.\n' +
      '5. IGNORE transferências internas de pagamento de fatura do próprio usuário se explicitamente marcadas assim.\n\n' +
      'RETORNE EXATAMENTE NESTE FORMATO JSON:\n' +
      '{"status":"success","data":{"cabecalho":{"Nome da conta":"BB Conta Corrente 1234-5","banco":"Banco do Brasil","Vencimento da fatura":null,"saldo_inicial":1500.00,"saldo_final":2300.00},"lancamentos":[{"data":"DD/MM/AAAA","vencimento":"DD/MM/AAAA","descricao":"...","valor":-100.00,"conta":"..."}]}}';

    var modelToUse = (fileType === 'pdf' || fileType === 'png' || fileType === 'jpg') ? MODEL_FLASH : MODEL_LITE;
    return await _chamarGemini(modelToUse, systemPrompt, userContent, inlineData);
  }

  // 2. IA CATEGORIZADORA (O Cérebro Analítico)
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

    var transacoes = opts.transacoes;
    var categoriasTree = opts.categoriasTree;
    var isCartaoCredito = opts.isCartaoCredito;
    
    // Novo contexto massivo
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

    var userContent = 
      '<vocabulario_usuario>\n' + JSON.stringify(vocabulario) + '\n</vocabulario_usuario>\n\n' +
      '<historico_conta_atual_360d>\n' + (formatHistory(historicoConta360d) || 'Sem historico.') + '\n</historico_conta_atual_360d>\n\n' +
      '<historico_transferencias_360d>\n' + (formatHistory(historicoTransferencias360d) || 'Sem transferencias.') + '\n</historico_transferencias_360d>\n\n' +
      '<historico_global_recentes_120d>\n' + (formatHistory(historicoGlobal120d) || 'Sem historico global.') + '\n</historico_global_recentes_120d>\n\n' +
      '<regras_semanticas_basicas>\n' +
      '- iFood, Rappi, Zé Delivery -> Alimentação > Delivery\n' +
      '- Uber, 99, Cabify -> Transporte > App\n' +
      '- Posto, Ipiranga, Shell, Petrobras -> Transporte > Combustível\n' +
      '- Enel, Sabesp, Light, Copel, Sanepar -> Casa > Contas Básicas\n' +
      '</regras_semanticas_basicas>\n\n' +
      '<novas_transacoes>\n' + JSON.stringify(transacoes) + '\n</novas_transacoes>\n\n' +
      '<instrucoes_finais>\n' +
      '1. Priorize o <historico_conta_atual_360d> e o <vocabulario_usuario> para decidir a categoria.\n' +
      '2. Se a descrição for semanticamente muito similar a uma do histórico, herde a categoria.\n' +
      '3. Use APENAS categorias da lista: ' + JSON.stringify(categoriasTree) + '.\n' +
      '4. Valores negativos são despesas, positivos são receitas.\n' +
      '5. REGRAS DE PARCELAMENTO (Installments): Busque ativamente na descrição por indicadores de parcelamento nos formatos: "1/6", "01/06", "2/12", "1-6", "01-06", "01 de 06", "parc 1/6". ' +
      'Se encontrar, remova o indicador da descrição original e preencha "parcela_atual" e "total_parcelas", marcando "is_parcelado": true.\n' +
      '6. Coloque o campo "analise_ia" NO INÍCIO do JSON, para "pensar em voz alta" e racionalizar sua análise antes de gerar o array de dados, garantindo alta precisão.\n' +
      'RETORNE EXATAMENTE NESTE FORMATO JSON:\n' +
      '{\n' +
      '  "status": "success",\n' +
      '  "analise_ia": "Explique brevemente o seu raciocínio aqui...",\n' +
      '  "data": [\n' +
      '    { "id": "...", "categoria": "...", "subcategoria": "...", "descricao_limpa": "...", "is_parcelado": false, "parcela_atual": null, "total_parcelas": null }\n' +
      '  ]\n' +
      '}\n' +
      '</instrucoes_finais>';

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

  // 3. IA CONCILIADORA (A Auditora)
  async function conciliar(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        return { status: 'success', analise_ia: 'Conciliação MOCK', sugestoes_juncao: [], alertas: [] };
    }

    var mathSummary = opts.mathSummary || {}; // { inicial, final_extrato, calculado, divergencia }
    var extractedTransactions = opts.extractedTransactions || [];
    var manualPendingTransactions = opts.manualPendingTransactions || [];

    var systemPrompt = 'Você é um auditor financeiro de conciliação. ' +
      'Sua função é analisar discrepâncias matemáticas já calculadas e identificar o porquê o extrato não bate, ' +
      'além de cruzar transações manuais com as extraídas pelo banco. Retorne APENAS JSON válido.';

    var userContent = 
      '<resumo_matematico>\n' + JSON.stringify(mathSummary) + '\n</resumo_matematico>\n\n' +
      '<transacoes_extraidas_do_banco>\n' + JSON.stringify(extractedTransactions) + '\n</transacoes_extraidas_do_banco>\n\n' +
      '<transacoes_manuais_pendentes>\n' + JSON.stringify(manualPendingTransactions) + '\n</transacoes_manuais_pendentes>\n\n' +
      '<instrucoes>\n' +
      '1. Análise de Discrepância: Se "divergencia" for diferente de 0, analise as <transacoes_extraidas_do_banco> para sugerir causas (ex: lançamentos duplicados, tarifas ocultas, sinais trocados). Retorne isso no campo "alertas". Se não houver divergência, retorne array vazio.\n' +
      '2. Sugestão de Junção (Merge): Compare <transacoes_manuais_pendentes> com <transacoes_extraidas_do_banco>. Apenas se a Inteligência Artificial, diferente da matemática crua (que tem sliding window de proximidade de data e valor do frontend) enxergar que são a mesma transação por nomeação ou comportamento, informe os pares no campo "sugestoes_juncao" retornando os IDs pareados.\n' +
      '3. Coloque o campo "analise_ia" NO INÍCIO do JSON para pensar passo a passo de onde vêm as diferenças antes de gerar as listas.\n' +
      'RETORNE EXATAMENTE NESTE FORMATO JSON:\n' +
      '{\n' +
      '  "status": "success",\n' +
      '  "analise_ia": "Seu raciocínio de auditoria...",\n' +
      '  "sugestoes_juncao": [ { "id_manual": "...", "id_extraida": "...", "confianca": 0.95 } ],\n' +
      '  "alertas": [ "Aviso: Há uma diferença de R$ 20. O lançamento X parece estar duplicado." ]\n' +
      '}\n' +
      '</instrucoes>';

    return await _chamarGemini(MODEL_LITE, systemPrompt, userContent);
  }

  return { extrairExtrato, categorizar, conciliar, categorizarProduto, melhorarNomesEmLote };

})();

console.log('[GeminiService] v3 carregado (Firestore > RemoteConfig > local).');
