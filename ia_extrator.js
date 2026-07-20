// ia_extrator.js v1 — O Ninja Extrator (Operário de Dados)
// Corta Gastos

window.IAExtrator = (function() {
  
  async function extrairExtrato(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        console.warn('[IAExtrator] 🥔 MODO BATATA ATIVADO!');
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

    if (!window.IACore) throw new Error('IACore não carregado!');

    var fileContent = opts.fileContent;
    var fileType = opts.fileType;
    var fileName = opts.fileName;
    var contasInfo = opts.contasInfo || [];

    var systemPrompt = 'Você é um sistema estrito de extração de dados financeiros. Sua única função é converter o documento bruto (extrato bancário) em um esquema JSON preciso. Não invente dados e não categorize nada.';

    if (fileType === 'pdf') {
      systemPrompt += ' ATENÇÃO: Analise todas as páginas meticulosamente linha por linha. Não omita nenhuma transação sob nenhuma circunstância.';
    }

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
      '3. Extraia a lista de transações com data (DD/MM/AAAA obrigatoriamente 4 dígitos no ano), descricao original bruta, e valor numérico (negativo para débitos, positivo para créditos).\n' +
      '4. Para conta corrente, vencimento = data. Para cartão de crédito, procure e extraia a data de vencimento da fatura.\n' +
      '5. IGNORE transferências internas de pagamento de fatura do próprio usuário se explicitamente marcadas assim.\n\n' +
      'RETORNE EXATAMENTE NESTE FORMATO JSON (coloque analise_ia PRIMEIRO, no máximo 1 frase curta sendo bem direto, em tom cômico de um mestre Ninja cortador de gastos. Nada de bom dia):\n' +
      '{"status":"success","analise_ia":"Cortei as gorduras do PDF como uma katana! Extrato de X a Y pronto, mestre.","data":{"cabecalho":{"Nome da conta":"BB Conta Corrente 1234-5","banco":"Banco do Brasil","Vencimento da fatura":null,"saldo_inicial":1500.00,"saldo_final":2300.00},"lancamentos":[{"data":"DD/MM/AAAA","vencimento":"DD/MM/AAAA","descricao":"...","valor":-100.00,"conta":"..."}]}}';

    var isBinario = (fileType === 'pdf' || fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg');
    var modelToUse = isBinario ? window.IACore.MODEL_VISION_FX : window.IACore.MODEL_LITE;
    
    return await window.IACore.chamarGemini(modelToUse, systemPrompt, userContent, inlineData, { _maxOutputTokens: 16384 });
  }

  return { extrairExtrato };
})();
