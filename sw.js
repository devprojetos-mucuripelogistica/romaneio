/* Romaneio Digital – service worker
 * Guarda a "casca" do app no celular: abre mesmo sem internet (modo offline).
 * As chamadas para o Apps Script (dados) sempre vão para a internet; sem sinal, o app guarda tudo numa fila. */
const VERSAO = 'romaneio-v16';
const CASCA = ['./', './index.html', './config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && k !== 'romaneio-fontes').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

/** Sinal fraco: espera no máximo alguns segundos pela internet e usa a cópia guardada. */
function comLimite(p, ms) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('lento')), ms); p.then((r) => { clearTimeout(t); res(r); }, (e) => { clearTimeout(t); rej(e); }); }); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  // fontes do Google: guardadas no celular depois da primeira vez
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('romaneio-fontes').then((c) => c.match(req).then((r) => r || fetch(req).then((n) => { c.put(req, n.clone()); return n; }).catch(() => Response.error()))));
    return;
  }
  if (url.origin !== self.location.origin) return; // dados: direto da internet
  const paginaOuConfig = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('config.js') || url.pathname.endsWith('/');
  if (paginaOuConfig) {
    // versão mais nova primeiro; sem internet (ou sinal muito fraco), usa a guardada
    const rede = fetch(new Request(url.href, { cache: 'no-store', credentials: 'same-origin' })).then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); return r; });
    e.respondWith(comLimite(rede, 6000).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')).then((r) => r || rede)));
  } else {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
