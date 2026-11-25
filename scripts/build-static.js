/*
 * Gera a vitrine estática (GitHub Pages) em ./_site a partir de public/ + data/seed.json + data/uploads.
 * Uso: npm run build:static
 * Sem servidor: sem painel do lojista e área do cliente; formulários abrem o WhatsApp.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const SKIP = new Set(['admin.html', 'cliente.html', path.join('js', 'admin.js'), path.join('css', 'admin.css')]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, {
  recursive: true,
  filter: (src) => !SKIP.has(path.relative(path.join(ROOT, 'public'), src)),
});

// Dados: só o que é público (sem segredos), com caminhos de foto relativos
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));
const vehicles = (seed.vehicles || [])
  .filter((v) => v.status !== 'oculto')
  .sort((a, b) => b.createdAt - a.createdAt)
  .map(({ demo, ...v }) => ({ ...v, photos: (v.photos || []).map((p) => p.replace(/^\//, '')) }));
const used = new Set(vehicles.flatMap((v) => v.photos.map((p) => path.basename(p))));

fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'data', 'settings.json'), JSON.stringify(seed.settings || {}));
fs.writeFileSync(path.join(OUT, 'data', 'vehicles.json'), JSON.stringify(vehicles));

// Só as fotos usadas pelos veículos publicados
fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });
let missing = 0;
for (const name of used) {
  const src = path.join(ROOT, 'data', 'uploads', name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, 'uploads', name));
  else { missing++; console.warn('Foto não encontrada:', name); }
}

fs.writeFileSync(path.join(OUT, 'js', 'config.js'), '/* Gerado por scripts/build-static.js */\nwindow.MUSSATO_STATIC = true;\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.copyFileSync(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));

console.log(`Vitrine gerada em _site/: ${vehicles.length} veículos, ${used.size - missing} fotos.`);
if (missing) process.exitCode = 1;
