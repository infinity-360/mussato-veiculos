/* Serve a vitrine gerada (_site) em http://localhost:4000/mussato-veiculos/ — igual ao GitHub Pages. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '_site');
const BASE = '/mussato-veiculos';
const PORT = process.env.PORT || 4000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === BASE) { res.writeHead(302, { Location: BASE + '/' }); return res.end(); }
  if (!p.startsWith(BASE + '/')) { res.writeHead(404); return res.end(); }
  p = p.slice(BASE.length);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(OUT, p));
  if (!file.startsWith(OUT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': MIME['.html'] }); return fs.createReadStream(path.join(OUT, '404.html')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Vitrine em http://localhost:${PORT}${BASE}/`));
