// shared-file-bridge.js v2
// Corta Gastos - Web Share Target Bridge
// Ponte entre o Service Worker (cache) e a tela de importacao.
// v2: usa sessionStorage para sobreviver ao fluxo de login.

(function initSharedFileBridge() {

  var STORAGE_KEY = 'cortaGastos_pendingShare';

  // --- Ao abrir via ?shared=true: salva flag e limpa URL ---
  var params = new URLSearchParams(window.location.search);
  if (params.get('shared') === 'true') {
    sessionStorage.setItem(STORAGE_KEY, '1');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (params.get('share_error') === 'true') {
    sessionStorage.removeItem(STORAGE_KEY);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  // Se nao ha pendencia, nada a fazer
  if (!sessionStorage.getItem(STORAGE_KEY)) return;

  // --- Funcao principal: recupera arquivo do cache e carrega na importacao ---
  async function tryLoadSharedFile() {
    try {
      var cache = await caches.open('shared-files-cache');
      var response = await cache.match('/shared-extrato-file');
      if (!response) {
        console.warn('[SharedBridge] Arquivo nao encontrado no cache. Ja foi consumido?');
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      var blob = await response.blob();
      var filename = response.headers.get('X-Original-Name') || 'extrato.csv';
      var fileType = response.headers.get('Content-Type') || 'text/csv';
      var file = new File([blob], filename, { type: fileType });

      // 1. Navega para o painel de importacao
      var importNavItem = document.querySelector('[data-target="panel-import"]');
      if (importNavItem) {
        importNavItem.click();
        await new Promise(function(r) { setTimeout(r, 400); });
      }

      // 2. Injeta o arquivo no input
      var uploadInput = document.getElementById('uploadFileImportacao');
      if (!uploadInput) {
        console.warn('[SharedBridge] Input #uploadFileImportacao nao encontrado.');
        return;
      }

      var dt = new DataTransfer();
      dt.items.add(file);
      uploadInput.files = dt.files;
      uploadInput.dispatchEvent(new Event('change', { bubbles: true }));

      // 3. Limpa tudo apos sucesso
      await cache.delete('/shared-extrato-file');
      sessionStorage.removeItem(STORAGE_KEY);

      if (typeof window.showToast === 'function') {
        window.showToast('Arquivo "' + filename + '" carregado!', 'success');
      }
      console.log('[SharedBridge] Arquivo "' + filename + '" injetado com sucesso.');

    } catch (err) {
      console.error('[SharedBridge] Erro:', err);
    }
  }

  // --- Aguarda o usuario estar autenticado e o app pronto ---
  // Observa o elemento #user-profile-name que so aparece APOS o login
  function waitForLogin(timeoutMs) {
    timeoutMs = timeoutMs || 30000;
    return new Promise(function(resolve) {

      // Verifica se ja esta logado (perfil visivel)
      var profileName = document.getElementById('user-profile-name') ||
                        document.querySelector('.user-profile-name') ||
                        document.querySelector('[id*="profile"][id*="name"]');
      if (profileName && profileName.textContent && profileName.textContent.trim().length > 0) {
        resolve(true); return;
      }

      // Usa Firebase Auth diretamente se disponivel
      function tryFirebaseAuth() {
        if (window.firebaseAuth) {
          var unsub = window.firebaseAuth.onAuthStateChanged(function(user) {
            if (user) { unsub(); resolve(true); }
          });
          return true;
        }
        return false;
      }

      if (tryFirebaseAuth()) return;

      // Fallback: polling ate o Firebase Auth estar pronto
      var tentativas = 0;
      var intervalo = setInterval(function() {
        tentativas++;
        if (tryFirebaseAuth()) { clearInterval(intervalo); return; }
        if (tentativas > 100) { clearInterval(intervalo); resolve(false); }
      }, 300);

      setTimeout(function() { clearInterval(intervalo); resolve(false); }, timeoutMs);
    });
  }

  async function start() {
    var loggedIn = await waitForLogin(30000);
    if (!loggedIn) {
      console.warn('[SharedBridge] Timeout: usuario nao autenticou em 30s.');
      return;
    }
    // Pequeno delay para o app terminar de carregar dados
    await new Promise(function(r) { setTimeout(r, 800); });
    await tryLoadSharedFile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
