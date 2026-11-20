const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || 'TU_CLAVE_SECRETA';
const FILE = 'signals.json';

const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return []; } };
const save = (l) => fs.writeFileSync(FILE, JSON.stringify(l.slice(0, 500)));

const PAGE = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b1220">
<link rel="manifest" href="/manifest.json"><title>Mis Señales</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#e6edf7}
header{padding:16px;font-size:20px;font-weight:bold;background:#111a2e;position:sticky;top:0}
.card{margin:10px;padding:12px;border-radius:10px;background:#16213a}
.row{display:flex;justify-content:space-between}
.buy{color:#22c55e;font-weight:bold}.sell{color:#ef4444;font-weight:bold}
.hora{font-size:12px;opacity:.6;margin-top:6px}
</style></head><body><header>Mis Señales</header><div id="lista"></div>
<script>
async function cargar(){
  const d = await (await fetch('/api/signals')).json();
  const c = document.getElementById('lista');
  if(!d.length){c.innerHTML='<div class="card">Aún no hay señales</div>';return;}
  c.innerHTML = d.map(s=>{
    const a=String(s.accion).toLowerCase();
    const k=(a.includes('buy')||a.includes('compra'))?'buy':(a.includes('sell')||a.includes('venta'))?'sell':'';
    return '<div class="card"><div class="row"><span>'+s.simbolo+'</span><span class="'+k+'">'+s.accion+'</span></div>'
      +'<div>'+(s.precio?'Precio: '+s.precio:'')+'</div><div>'+(s.mensaje||'')+'</div>'
      +'<div class="hora">'+new Date(s.hora).toLocaleString('es-MX')+'</div></div>';
  }).join('');
}
cargar(); setInterval(cargar,5000);
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
</script></body></html>`;

const MANIFEST = JSON.stringify({
  name: 'Mis Señales', short_name: 'Señales', start_url: '/', display: 'standalone',
  background_color: '#0b1220', theme_color: '#0b1220',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
});

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#0b1220"/><path d="M15 70 L40 45 L58 60 L85 28" stroke="#22c55e" stroke-width="8" fill="none"/></svg>';

const SW = "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>new Response('Sin conexion')))});";

const send = (res, type, body, code = 200) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/webhook/' + SECRET) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let b;
      try { b = JSON.parse(raw); } catch (e) { b = { mensaje: raw }; }
      const list = load();
      list.unshift({
        id: Date.now(), hora: new Date().toISOString(),
        simbolo: b.simbolo || b.ticker || 'N/A',
        accion: b.accion || b.action || 'N/A',
        precio: b.precio || b.price || '',
        mensaje: b.mensaje || ''
      });
      save(list);
      send(res, 'text/plain', 'ok');
    });
    return;
  }

  if (url === '/api/signals') return send(res, 'application/json', JSON.stringify(load()));
  if (url === '/manifest.json') return send(res, 'application/json', MANIFEST);
  if (url === '/icon.svg') return send(res, 'image/svg+xml', ICON);
  if (url === '/sw.js') return send(res, 'application/javascript', SW);
  if (url === '/') return send(res, 'text/html; charset=utf-8', PAGE);
  send(res, 'text/plain', 'no encontrado', 404);
}).listen(PORT, () => console.log('Listo en puerto ' + PORT));
