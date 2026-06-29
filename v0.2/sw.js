const CACHE_NAME = 'shared-files-cache';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Intercept the POST request from the native Share Menu
  if (event.request.method === 'POST' && url.pathname.includes('share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const extratoFile = formData.get('extrato');
        
        if (extratoFile) {
          const cache = await caches.open(CACHE_NAME);
          const headers = new Headers();
          headers.append('Content-Type', extratoFile.type);
          headers.append('Content-Length', extratoFile.size);
          headers.append('X-Original-Name', extratoFile.name || 'extrato.csv');
          
          await cache.put(
            new Request('/shared-extrato-file'),
            new Response(extratoFile, { headers: headers })
          );
        }
        
        // Em vez de um redirect 303 que pode ser bloqueado em alguns browsers mobile,
        // retornamos um HTML limpo que faz o redirect via JavaScript.
        const redirectHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta http-equiv="refresh" content="0; url=./index.html?shared=true">
              <title>Processando...</title>
            </head>
            <body style="background:#0f172a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
              <h2>Carregando arquivo...</h2>
              <script>
                window.location.href = './index.html?shared=true';
              </script>
            </body>
          </html>
        `;
        return new Response(redirectHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (err) {
        console.error('Error handling share target POST:', err);
        return Response.redirect('./index.html?share_error=true', 303);
      }
    })());
  }
});
