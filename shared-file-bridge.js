// shared-file-bridge.js
// Corta Gastos - Web Share Target Bridge
// Completa a ponte entre o Service Worker (sw.js) e a tela de importação.
// O SW captura o arquivo compartilhado pelo usuário (PDF/CSV do banco) e
// este módulo o recupera do cache e carrega na tela de importação.

(function initSharedFileBridge() {
  const params = new URLSearchParams(window.location.search);
  const isShared = params.get('shared') === 'true';
  const hasError = params.get('share_error') === 'true';

  if (!isShared && !hasError) return;

  // Limpa a URL sem recarregar a página
  window.history.replaceState({}, document.title, window.location.pathname);

  if (hasError) {
    console.warn('[SharedBridge] Erro ao receber arquivo compartilhado.');
    return;
  }

  async function tryLoadSharedFile() {
    try {
      const cache = await caches.open('shared-files-cache');
      const response = await cache.match('/shared-extrato-file');

      if (!response) {
        console.warn('[SharedBridge] Arquivo nao encontrado no cache.');
        return;
      }

      const blob = await response.blob();
      const filename = response.headers.get('X-Original-Name') || 'extrato_compartilhado.csv';
      const fileType = response.headers.get('Content-Type') || 'text/csv';
      const file = new File([blob], filename, { type: fileType });

      // 1. Navega para o painel de importacao
      const importNavItem = document.querySelector('[data-target="panel-import"]');
      if (importNavItem) {
        importNavItem.click();
        await new Promise(r => setTimeout(r, 300));
      }

      // 2. Injeta o arquivo no input de upload
      const uploadInput = document.getElementById('uploadFileImportacao');
      if (!uploadInput) {
        console.warn('[SharedBridge] Input de upload nao encontrado.');
        return;
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      uploadInput.files = dataTransfer.files;
      uploadInput.dispatchEvent(new Event('change', { bubbles: true }));

      // 3. Remove do cache apos uso
      await cache.delete('/shared-extrato-file');

      if (typeof window.showToast === 'function') {
        window.showToast('Arquivo "' + filename + '" carregado!', 'success');
      }

      console.log('[SharedBridge] Arquivo "' + filename + '" carregado com sucesso.');

    } catch (err) {
      console.error('[SharedBridge] Erro ao recuperar arquivo compartilhado:', err);
    }
  }

  // Aguarda o elemento de upload existir (usuario logado + app pronta)
  function waitForElement(selector, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    return new Promise(function(resolve) {
      var el = document.querySelector(selector);
      if (el) { resolve(el); return; }

      var observer = new MutationObserver(function() {
        var found = document.querySelector(selector);
        if (found) { observer.disconnect(); resolve(found); }
      });

      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      setTimeout(function() { observer.disconnect(); resolve(null); }, timeoutMs);
    });
  }

  async function start() {
    var uploadInput = await waitForElement('#uploadFileImportacao');
    if (uploadInput) {
      setTimeout(tryLoadSharedFile, 600);
    } else {
      console.warn('[SharedBridge] Timeout: tela de importacao nao ficou disponivel em 20s.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
