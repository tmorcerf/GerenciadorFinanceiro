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

  function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) val = 0;
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function analisarTransferencias(txs, contas) {
    txs = txs || [];
    contas = contas || [];

    var isTransfer = function(t) {
      var cat = (t.categoria || '').toLowerCase();
      var sub = (t.subcategoria || '').toLowerCase();
      return cat.includes('transfer') || sub.includes('transfer') || t.pendente_destino === true || sub === 'pendente de destino';
    };

    var isLockedTx = function(t) {
      if (t.conciliado === true) return true;
      var acc = (contas || []).find(function(c) {
        return (c.nome || '').trim().toLowerCase() === (t.conta || '').trim().toLowerCase();
      });
      if (acc && acc.conciliado_ate) {
        return true;
      }
      return false;
    };

    var isPendingDest = function(t) {
      var sub = (t.subcategoria || '').trim().toLowerCase();
      return t.pendente_destino === true || sub === 'pendente de destino' || sub === 'pendente' || sub === 'unassigned' || sub === 'desconhecido' || sub === 'sem destino';
    };

    var allTransfers = txs.filter(isTransfer);
    var pendentesDestino = allTransfers.filter(isPendingDest);

    var orphanOutflows = allTransfers.filter(function(t) {
      return (parseFloat(t.valor) || 0) < 0 && !t.transfer_match_id && !isPendingDest(t);
    });
    var orphanInflows = allTransfers.filter(function(t) {
      return (parseFloat(t.valor) || 0) > 0 && !t.transfer_match_id && !isPendingDest(t);
    });

    var conflitos = [];
    var sugestoesIA = [];

    // 1. Detect Matches (Orphan pairs with equal magnitude)
    var matchedOuts = new Set();
    var matchedIns = new Set();

    orphanOutflows.forEach(function(out) {
      var valOut = Math.abs(parseFloat(out.valor) || 0);
      orphanInflows.forEach(function(inTx) {
        var outKey = out.cod || out.id;
        var inKey = inTx.cod || inTx.id;
        if (matchedOuts.has(outKey) || matchedIns.has(inKey)) return;
        var valIn = Math.abs(parseFloat(inTx.valor) || 0);
        if (Math.abs(valOut - valIn) < 0.01) {
          matchedOuts.add(outKey);
          matchedIns.add(inKey);

          sugestoesIA.push({
            id: 'sug_match_' + outKey + '_' + inKey,
            tipo: 'match',
            titulo: 'Sugestão de Junção (Match de Transferência)',
            descricao: 'Vincular saída de ' + out.conta + ' (' + formatCurrency(valOut) + ') com entrada em ' + inTx.conta + ' (' + formatCurrency(valIn) + ').',
            txOut: out,
            txIn: inTx,
            confianca: 0.95,
            actionLabel: 'Aceitar Sugestão'
          });
        }
      });
    });

    // 2. Gold Rule Conflict Detection & Suggestions
    allTransfers.forEach(function(t1) {
      var locked1 = isLockedTx(t1);
      if (!locked1) return; // Account X / T1 is locked ("Verdade Absoluta")

      var val1 = parseFloat(t1.valor) || 0;
      var contaX = t1.conta;
      var subX = (t1.subcategoria || '').trim();

      var t2 = null;
      if (t1.transfer_match_id) {
        t2 = allTransfers.find(function(x) {
          return (x.cod || x.id) !== (t1.cod || t1.id) && x.transfer_match_id === t1.transfer_match_id;
        });
      }
      if (!t2 && subX && !isPendingDest(t1)) {
        t2 = allTransfers.find(function(x) {
          return (x.cod || x.id) !== (t1.cod || t1.id) && (x.conta || '').trim().toLowerCase() === subX.toLowerCase() && Math.abs(parseFloat(x.valor) + val1) < 0.01;
        });
      }

      if (t2) {
        var locked2 = isLockedTx(t2);
        var t2SubLower = (t2.subcategoria || '').trim().toLowerCase();
        var contaXLower = (contaX || '').trim().toLowerCase();

        if (t2SubLower !== contaXLower || isPendingDest(t2)) {
          if (!locked2) {
            conflitos.push({
              id: 'conflict_' + (t1.cod || t1.id) + '_' + (t2.cod || t2.id),
              lockedTx: t1,
              unlockedTx: t2,
              contaBloqueada: contaX,
              contaParaCorrigir: t2.conta,
              descricao: 'A conta ' + contaX + ' está Conciliada (Verdade Absoluta). O lançamento na conta ' + t2.conta + ' deve ter subcategoria "' + contaX + '".'
            });

            sugestoesIA.push({
              id: 'sug_gold_' + (t1.cod || t1.id) + '_' + (t2.cod || t2.id),
              tipo: 'gold_rule_correction',
              titulo: 'Regra de Ouro: Corrigir ' + t2.conta,
              descricao: 'Conta ' + contaX + ' é Conciliada (Verdade Absoluta). Ajustar subcategoria de ' + t2.conta + ' para "' + contaX + '".',
              targetTx: t2,
              lockedTx: t1,
              updateData: {
                subcategoria: contaX,
                pendente_destino: false,
                transfer_match_id: t1.transfer_match_id || ('match_' + Date.now() + '_' + Math.floor(Math.random()*1000))
              },
              confianca: 0.99,
              actionLabel: 'Aceitar Sugestão'
            });
          } else {
            conflitos.push({
              id: 'conflict_double_lock_' + (t1.cod || t1.id) + '_' + (t2.cod || t2.id),
              lockedTx: t1,
              lockedTx2: t2,
              contaBloqueada: contaX,
              contaBloqueada2: t2.conta,
              descricao: 'Conflito entre duas contas conciliadas (' + contaX + ' e ' + t2.conta + '). Ambas são intocáveis.'
            });
          }
        }
      } else if (subX && !isPendingDest(t1)) {
        var orphanOnY = allTransfers.find(function(x) {
          return !isLockedTx(x) && (x.conta || '').trim().toLowerCase() === subX.toLowerCase() && Math.abs(parseFloat(x.valor) + val1) < 0.01;
        });
        if (orphanOnY) {
          conflitos.push({
            id: 'conflict_orphan_' + (t1.cod || t1.id) + '_' + (orphanOnY.cod || orphanOnY.id),
            lockedTx: t1,
            unlockedTx: orphanOnY,
            contaBloqueada: contaX,
            contaParaCorrigir: orphanOnY.conta,
            descricao: 'Lançamento em ' + contaX + ' (Conciliada) aponta para ' + subX + '. Lançamento em ' + orphanOnY.conta + ' precisa ser alinhado.'
          });

          sugestoesIA.push({
            id: 'sug_gold_align_' + (t1.cod || t1.id) + '_' + (orphanOnY.cod || orphanOnY.id),
            tipo: 'gold_rule_correction',
            titulo: 'Regra de Ouro: Alinhar ' + orphanOnY.conta + ' com ' + contaX,
            descricao: 'Alinhar subcategoria de ' + orphanOnY.conta + ' para "' + contaX + '" (âncora ' + contaX + ' intocável).',
            targetTx: orphanOnY,
            lockedTx: t1,
            updateData: {
              subcategoria: contaX,
              pendente_destino: false,
              transfer_match_id: t1.transfer_match_id || ('match_' + Date.now() + '_' + Math.floor(Math.random()*1000))
            },
            confianca: 0.98,
            actionLabel: 'Aceitar Sugestão'
          });
        }
      }
    });

    // 3. Pending Destination AI Suggestions
    pendentesDestino.forEach(function(pt) {
      if (isLockedTx(pt)) return;
      var valPt = Math.abs(parseFloat(pt.valor) || 0);

      var candidate = allTransfers.find(function(x) {
        return (x.cod || x.id) !== (pt.cod || pt.id) &&
               (x.conta || '').trim().toLowerCase() !== (pt.conta || '').trim().toLowerCase() &&
               Math.abs(Math.abs(parseFloat(x.valor) || 0) - valPt) < 0.01;
      });
      if (candidate) {
        var ptKey = pt.cod || pt.id;
        var alreadySuggested = sugestoesIA.some(function(s) {
          return (s.txOut && (s.txOut.cod || s.txOut.id) === ptKey) || (s.targetTx && (s.targetTx.cod || s.targetTx.id) === ptKey);
        });
        if (!alreadySuggested) {
          sugestoesIA.push({
            id: 'sug_pending_' + ptKey + '_' + (candidate.cod || candidate.id),
            tipo: 'pending_resolution',
            titulo: 'Sugestão para Pendente de Destino em ' + pt.conta,
            descricao: 'Definir contra-partida como "' + candidate.conta + '" (Lançamento correspondente de ' + formatCurrency(valPt) + ').',
            targetTx: pt,
            targetAccount: candidate.conta,
            updateData: {
              subcategoria: candidate.conta,
              pendente_destino: false,
              transfer_match_id: candidate.transfer_match_id || ('match_' + Date.now() + '_' + Math.floor(Math.random()*1000))
            },
            confianca: 0.90,
            actionLabel: 'Aceitar Sugestão'
          });
        }
      }
    });

    return {
      pendentesDestino: pendentesDestino,
      conflitos: conflitos,
      sugestoesIA: sugestoesIA
    };
  }

  return { conciliar, analisarTransferencias };
})();
