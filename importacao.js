// importacao.js
// LÃ³gica simplificada para a nova aba de ImportaÃ§Ã£o

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('uploadFileImportacao');
  const statusBox = document.getElementById('import-status-box');
  const resultContainer = document.getElementById('import-result-container');
  const resultContent = document.getElementById('import-result-content');
  const btnSalvar = document.getElementById('btnSalvarImportacaoNova');

  if (!uploadInput) return;

  // VariÃ¡vel para guardar o resultado temporÃ¡rio antes de salvar
  let transacoesParaSalvar = [];

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset UI
    resultContainer.style.display = 'none';
    btnSalvar.style.display = 'none';
    resultContent.innerHTML = '';
    
    try {
      statusBox.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Lendo arquivo localmente...';
      statusBox.style.color = 'var(--color-primary)';
      
      // Utiliza a funÃ§Ã£o global existente no app.js para ler o arquivo (PDF/CSV)
      const fileData = await window.extractFileContent(file);

      statusBox.innerHTML = '<i class="fas fa-paper-plane"></i> Enviando para a IA (Isso pode levar atÃ© 30 segundos)...';
      statusBox.style.color = 'var(--color-warning)';

      // RequisiÃ§Ã£o para o backend
      // APPS_SCRIPT_WEBAPP_URL is defined in app.js (global)
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'importar_simples_v2',
          fileContent: fileData.content,
          fileType: fileData.type,
          fileName: file.name
        })
      });

      const json = await res.json();
      
      if (json.status !== 'success') {
        throw new Error(json.message || "Erro desconhecido na IA.");
      }

      statusBox.innerHTML = '<i class="fas fa-check-circle"></i> Retorno recebido com sucesso!';
      statusBox.style.color = 'var(--color-income)';

      // Processa a resposta
      const dataIA = json.data;
      let transacoes = [];
      let cabecalho = null;

      if (Array.isArray(dataIA)) {
        transacoes = dataIA;
      } else if (dataIA && dataIA.lancamentos) {
        transacoes = dataIA.lancamentos;
        cabecalho = dataIA.cabecalho;
      } else if (dataIA && dataIA.transacoes) {
        transacoes = dataIA.transacoes;
        cabecalho = dataIA.cabecalho;
      }

      transacoesParaSalvar = transacoes;

      // Renderiza a Tabela de Debug
      renderizarTabelaDebug(transacoes, cabecalho);

      if (transacoes.length > 0) {
        btnSalvar.style.display = 'inline-block';
      }

    } catch (err) {
      console.error(err);
      statusBox.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Erro: ${err.message}`;
      statusBox.style.color = 'var(--color-expense)';
    } finally {
      // Limpa o input para permitir enviar o mesmo arquivo novamente se necessÃ¡rio
      uploadInput.value = '';
    }
  });

  function renderizarTabelaDebug(transacoes, cabecalho) {
    let html = '';

    if (cabecalho) {
      html += `
        <div style="margin-bottom:15px; background:var(--bg-card); padding:10px; border-radius:6px; border:1px solid var(--border-color); font-family:monospace; font-size:0.8rem; overflow-x:auto;">
          <strong style="color:var(--color-accent); display:block; margin-bottom: 6px;">Cabeçalho Retornado:</strong>
          <pre style="margin:0; color:var(--text-primary);">${JSON.stringify(cabecalho, null, 2)}</pre>
        </div>
      `;
    }

    if (transacoes.length === 0) {
      html += `<p style="color:var(--text-secondary);">Nenhuma transação encontrada.</p>`;
    } else {
      html += `
        <strong style="color:var(--text-secondary); display:block; margin-bottom: 6px;">Transações Extraídas (${transacoes.length}):</strong>
        <div style="overflow-x:auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
          <table style="width:100%; border-collapse: collapse; font-size: 0.8rem; color:var(--text-primary);">
            <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
              <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                <th style="padding:8px;">Data</th>
                <th style="padding:8px;">Descrição</th>
                <th style="padding:8px;">Valor</th>
                <th style="padding:8px;">Conta/Categoria (Se houver)</th>
              </tr>
            </thead>
            <tbody>
      `;

      transacoes.forEach(t => {
        let valColor = (t.valor && String(t.valor).includes('-')) ? 'var(--color-expense)' : 'var(--color-income)';
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding:8px; white-space: nowrap;">${t.data || ''}</td>
            <td style="padding:8px;">${t.descricao || ''}</td>
            <td style="padding:8px; white-space: nowrap; color: ${valColor}; font-weight: 500;">${t.valor || ''}</td>
            <td style="padding:8px; font-size: 0.75rem; color: var(--text-muted);">
              ${t.conta ? `C: ${t.conta}` : ''} <br>
              ${t.categoria ? `Cat: ${t.categoria}` : ''}
            </td>
          </tr>
        `;
      });

      html += `</tbody></table></div>`;
    }

    resultContent.innerHTML = html;
    resultContainer.style.display = 'block';
  }

  // AÃ§Ã£o de Salvar LanÃ§amentos
  btnSalvar.addEventListener('click', async () => {
    if (transacoesParaSalvar.length === 0) return;
    
    // Mostra feedback de carregamento
    const btnOriginalText = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    try {
      const res = await fetch(window.APPS_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'salvar_ia',
          transacoes: transacoesParaSalvar
        })
      });

      const result = await res.json();
      if (result.status === 'success') {
        alert("LanÃ§amentos salvos com sucesso!");
        // Limpa a tela
        resultContainer.style.display = 'none';
        transacoesParaSalvar = [];
        statusBox.innerHTML = '<i class="fas fa-check-double"></i> Tudo salvo. Aguardando novo arquivo...';
        statusBox.style.color = 'var(--text-secondary)';
      } else {
        throw new Error(result.message);
      }

    } catch(err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      btnSalvar.innerHTML = btnOriginalText;
      btnSalvar.disabled = false;
    }
  });

});

