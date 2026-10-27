/* Romaneio Digital – service worker
 * Guarda a "casca" do app no celular para abrir rápido.
 * As chamadas para o Apps Script (dados) sempre vão para a internet. */
const VERSAO = 'romaneio-v6';
const CASCA = ['./', './index.html', './config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // dados e fontes: direto da internet
  const paginaOuConfig = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('config.js') || url.pathname.endsWith('/');
  if (paginaOuConfig) {
    // versão mais nova primeiro; sem internet, usa a guardada
    // sem cópia guardada do navegador: sempre a versão que está no GitHub agora
    e.respondWith(fetch(new Request(url.href, { cache: 'no-store', credentials: 'same-origin' })).then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
