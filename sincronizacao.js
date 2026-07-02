// sincronizacao.js
// Lógica para a aba de Sincronização de Período Fechado

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('syncFileInput');
  const textInput = document.getElementById('syncTextInput');
  const btnProcessar = document.getElementById('btnProcessarSync');
  const feedback = document.getElementById('syncFeedback');
  const resumoDiv = document.getElementById('syncResumo');
  const areaTabela = document.getElementById('syncAreaTabela');
  const tabelaBody = document.querySelector('#tabelaSync tbody');
  const btnSalvar = document.getElementById('btnSalvarSync');

  let arquivoAtual = null;
  let dadosSincronizacao = {
    corretos: [],
    faltantes: [],
    sobrando: []
  };
  let contaDoExtrato = "";

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      arquivoAtual = e.target.files[0];
      if (arquivoAtual) {
        feedback.innerHTML = `Arquivo carregado: ${arquivoAtual.name}`;
      }
    });
  }

  // Função utilitária para converter dd/mm/yyyy para timestamp (zerando horas)
  function parseDataBR(str) {
    if (!str) return 0;
    let p = str.split('/');
    if (p.length === 3) return new Date(p[2], parseInt(p[1]) - 1, p[0], 0, 0, 0).getTime();
    p = str.split('-'); // fallback caso venha aaaa-mm-dd
    if (p.length === 3) return new Date(p[0], parseInt(p[1]) - 1, p[2], 0, 0, 0).getTime();
    return 0;
  }

  btnProcessar.addEventListener('click', async () => {
    let fileContent = "";
    let fileType = "text";
    let fileName = "Texto_Colado";

    if (arquivoAtual) {
      if (!window.extractFileContent) {
        feedback.innerHTML = `<span style="color: red;">Erro: Função de extração global não encontrada.</span>`;
        return;
      }
      btnProcessar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lendo arquivo localmente...';
      const extracted = await window.extractFileContent(arquivoAtual);
      fileContent = extracted.content;
      fileType = extracted.type;
      fileName = arquivoAtual.name;
    } else if (textInput && textInput.value.trim() !== '') {
      fileContent = textInput.value.trim();
    } else {
      alert("Selecione um arquivo ou cole o texto do extrato.");
      return;
    }

    try {
      btnProcessar.disabled = true;
      btnProcessar.innerHTML = '<i class="fas fa-magic fa-spin"></i> Extraindo dados com IA (pode levar 30s)...';
      feedback.innerHTML = "Enviando para a IA extrair transações (Modo Período Fechado - Ignorando datas de corte da planilha)...";

      // 1. EXTRAÇÃO VIA IA (Passo 1)
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'importar_simples_v2',
          fileContent: fileContent,
          fileType: fileType,
          fileName: fileName,
          contasInfo: [] // VAZIO de propósito para não podar transações passadas
        })
      });

      const jsonRes = await res.json();
      if (jsonRes.status === "error") {
        throw new Error(jsonRes.message);
      }

      const dadosExtrato = jsonRes.data.lancamentos || [];
      const cabecalho = jsonRes.data.cabecalho || {};
      contaDoExtrato = String(cabecalho['Nome da conta'] || '').trim().toLowerCase();

      if (dadosExtrato.length === 0) {
         throw new Error("A IA não conseguiu extrair nenhuma transação do documento.");
      }

      feedback.innerHTML += `\n<span style="color: var(--accent-blue);">Sucesso! Extraídas ${dadosExtrato.length} transações. Conta identificada: ${cabecalho['Nome da conta']}</span>\n`;

      // 2. DESCOBRIR O PERÍODO DO EXTRATO
      let minTime = Infinity;
      let maxTime = 0;
      dadosExtrato.forEach(t => {
         let time = parseDataBR(t.data);
         if (time > 0) {
            if (time < minTime) minTime = time;
            if (time > maxTime) maxTime = time;
         }
      });

      if (minTime === Infinity || maxTime === 0) {
         throw new Error("Não foi possível determinar o período (datas inválidas no extrato).");
      }

      let dataInicio = new Date(minTime).toLocaleDateString('pt-BR');
      let dataFim = new Date(maxTime).toLocaleDateString('pt-BR');
      feedback.innerHTML += `Período identificado: ${dataInicio} até ${dataFim}.\n`;

      // 3. CRUZAMENTO COM A BASE LOCAL
      let baseLocal = [];
      if (window.dadosFinanceiros && window.dadosFinanceiros.lancamentos) {
         baseLocal = window.dadosFinanceiros.lancamentos;
      }

      // Filtra os lançamentos da base local que perteçam à mesma conta e ao mesmo período
      let poolLocal = baseLocal.filter(L => {
         if (String(L.conta).trim().toLowerCase() !== contaDoExtrato) return false;
         let tTime = parseDataBR(L.data); // Coluna B
         return (tTime >= minTime && tTime <= maxTime);
      });

      feedback.innerHTML += `Encontrados ${poolLocal.length} lançamentos na planilha neste mesmo período para esta conta.\nCruzando dados...\n`;

      let faltantes = [];
      let corretos = [];

      // Helper para checar similaridade de valores (margem de R$ 0,50)
      const isValorIgual = (v1, v2) => {
         let val1 = parseFloat(String(v1).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
         let val2 = parseFloat(String(v2).replace(/[^\d,\.-]/g, '').replace(',', '.')) || 0;
         return Math.abs(val1 - val2) <= 0.50;
      };

      // Helper para similaridade de data (margem de 2 dias)
      const isDataIgual = (d1, d2) => {
         let t1 = parseDataBR(d1);
         let t2 = parseDataBR(d2);
         let diff = Math.abs(t1 - t2);
         return diff <= (2 * 24 * 60 * 60 * 1000);
      };

      dadosExtrato.forEach(ext => {
         // Procura um match no poolLocal
         let matchIdx = poolLocal.findIndex(loc => {
            return isDataIgual(ext.data, loc.data) && isValorIgual(ext.valor, loc.valor);
         });

         if (matchIdx !== -1) {
            // Deu match! Retira do poolLocal e marca como correto
            let matchedLocal = poolLocal.splice(matchIdx, 1)[0];
            corretos.push({
               extrato: ext,
               planilha: {
                 cod: matchedLocal.id,
                 data: matchedLocal.data,
                 descricao: matchedLocal.descricao,
                 categoria: matchedLocal.categoria,
                 valor: matchedLocal.valor
               }
            });
         } else {
            // Não achou na planilha -> É novo (Faltante)
            faltantes.push(ext);
         }
      });

      // O que sobrou no poolLocal são coisas que estão na planilha mas NÃO no extrato (Sobrando)
      let sobrando = poolLocal.map(loc => ({
         cod: loc.id,
         data: loc.data,
         descricao: loc.descricao,
         categoria: loc.categoria,
         valor: loc.valor
      }));

      feedback.innerHTML += `Cruzamento finalizado! Faltantes (novos): ${faltantes.length} | Corretos: ${corretos.length} | Sobrando (excluir): ${sobrando.length}.\n`;

      // 4. CATEGORIZAÇÃO DOS FALTANTES
      if (faltantes.length > 0) {
         feedback.innerHTML += `\nEnviando ${faltantes.length} lançamentos novos para o Agente Categorizador (IA)...`;
         
         const categoriasTree = (window.dadosFinanceiros && window.dadosFinanceiros.categorias) ? window.dadosFinanceiros.categorias : {};
         const resCat = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
           method: 'POST',
           headers: { 'Content-Type': 'text/plain;charset=utf-8' },
           body: JSON.stringify({
             action: 'categorizar_v2',
             transacoes: faltantes,
             categoriasTree: categoriasTree
           })
         });
         const jsonCat = await resCat.json();
         if (jsonCat.status === "error") throw new Error(jsonCat.message);
         
         faltantes = jsonCat.data || faltantes; // Atualiza com as categorias
         feedback.innerHTML += ` Categorização concluída!\n`;
      }

      // Guardar na variável global do script
      dadosSincronizacao = { corretos, faltantes, sobrando };

      // 5. RENDERIZAR TABELA
      renderizarTabelaSync();
      
      areaTabela.style.display = 'block';
      resumoDiv.style.display = 'block';
      resumoDiv.innerHTML = `<strong>Resumo:</strong> <span style="color:var(--accent-blue)">+${faltantes.length} novos</span> | <span style="color:#ef4444">-${sobrando.length} a excluir</span> | <span style="color:var(--text-muted)">${corretos.length} corretos mantidos</span>`;

      // Scroll para a tabela
      areaTabela.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      feedback.innerHTML += `\n<span style="color: #ef4444;">ERRO: ${err.message}</span>`;
      console.error(err);
    } finally {
      btnProcessar.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Processar Sincronização';
      btnProcessar.disabled = false;
    }
  });

  function renderizarTabelaSync() {
    tabelaBody.innerHTML = '';
    
    // Função para renderizar as linhas
    const criarLinha = (tipo, data, descricao, categoria, valor, icon, color) => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${color}; font-weight: bold;">
           ${icon} ${tipo}
         </td>
         <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">${data || ''}</td>
         <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">${descricao || ''}</td>
         <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);"><span class="badge" style="background: rgba(255,255,255,0.1)">${categoria || '-'}</span></td>
         <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; font-weight: 500;">
           ${Number(valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
         </td>
       `;
       return tr;
    };

    // 1. Sobrando (Excluir) - Vermelho
    dadosSincronizacao.sobrando.forEach(item => {
       tabelaBody.appendChild(criarLinha("Excluir", item.data, item.descricao, item.categoria, item.valor, "🗑️", "#ef4444"));
    });

    // 2. Faltantes (Adicionar) - Azul
    dadosSincronizacao.faltantes.forEach(item => {
       let catString = item.categoria ? `${item.categoria} ${item.subcategoria ? ' > '+item.subcategoria : ''}` : 'Sem Categoria';
       tabelaBody.appendChild(criarLinha("Adicionar", item.data, item.descricao, catString, item.valor, "➕", "var(--accent-blue)"));
    });

    // 3. Corretos (Manter) - Cinza
    dadosSincronizacao.corretos.forEach(item => {
       tabelaBody.appendChild(criarLinha("Correto", item.planilha.data, item.planilha.descricao, item.planilha.categoria, item.planilha.valor, "✔️", "var(--text-muted)"));
    });

    if (tabelaBody.innerHTML === '') {
       tabelaBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum lançamento no período.</td></tr>';
    }
  }

  btnSalvar.addEventListener('click', async () => {
    if (dadosSincronizacao.faltantes.length === 0 && dadosSincronizacao.sobrando.length === 0) {
       alert("Não há novos lançamentos para adicionar e nem sobrando para excluir. A planilha já está 100% idêntica ao extrato!");
       return;
    }

    if (!confirm(`Você está prestes a:\n\n- ADICIONAR ${dadosSincronizacao.faltantes.length} lançamentos.\n- DELETAR FISICAMENTE ${dadosSincronizacao.sobrando.length} lançamentos da planilha.\n\nTem certeza que o extrato carregado representa a verdade absoluta do período?`)) {
       return;
    }

    try {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
      
      const payload = {
        action: 'sincronizar_periodo',
        lancamentosNovos: dadosSincronizacao.faltantes,
        idsParaExcluir: dadosSincronizacao.sobrando.map(s => s.cod),
        contaDoExtrato: contaDoExtrato,
        dataMaxStr: dadosSincronizacao.faltantes.length > 0 || dadosSincronizacao.corretos.length > 0 
           ? [...dadosSincronizacao.faltantes, ...dadosSincronizacao.corretos.map(c => c.extrato)].reduce((acc, curr) => {
               let tTime = parseDataBR(curr.data);
               return tTime > acc.time ? {time: tTime, str: curr.data} : acc;
             }, {time: 0, str: ""}).str 
           : ""
      };

      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const jsonRes = await res.json();
      
      if (jsonRes.status === "error") throw new Error(jsonRes.message);

      alert("Sincronização realizada com sucesso! A página será atualizada.");
      window.location.reload();
      
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Confirmar e Sincronizar';
    }
  });

});
