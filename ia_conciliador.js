// ia_conciliador.js v1 — O Ninja Auditor
// Corta Gastos

window.IAConciliador = (function() {

  async function conciliar(opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
        return { status: 'success', analise_ia: 'Conciliação MOCK', sugestoes_juncao: [], alertas: [] };
    }

    if (!window.IACore) throw new Error('IACore não carregado!');

    var mathSummary = opts.mathSummary || {}; 
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

    return await window.IACore.chamarGemini(window.IACore.MODEL_LITE, systemPrompt, userContent, null, { _maxOutputTokens: 2048 });
  }

  return { conciliar };
})();
