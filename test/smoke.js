/*
 * Teste de fumaça: sobe o servidor numa pasta temporária (instalação limpa, a partir do data/seed.json)
 * e confere páginas, API pública, proteção do painel e o fluxo do cliente.
 * Uso: npm test
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');

const ROOT = path.join(__dirname, '..');
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;

// Copia o necessário para uma pasta temporária, para não tocar no data/db.json local
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mussato-smoke-'));
fs.cpSync(path.join(ROOT, 'server.js'), path.join(tmp, 'server.js'));
fs.cpSync(path.join(ROOT, 'public'), path.join(tmp, 'public'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'data'));
fs.cpSync(path.join(ROOT, 'data', 'seed.json'), path.join(tmp, 'data', 'seed.json'));
fs.cpSync(path.join(ROOT, 'data', 'uploads'), path.join(tmp, 'data', 'uploads'), { recursive: true });

const server = spawn(process.execPath, ['server.js'], { cwd: tmp, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/api/settings'); return; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error('Servidor não iniciou');
}
const json = async (p, opts = {}) => {
  const r = await fetch(BASE + p, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FALHOU', name, e.message]); }
}

(async () => {
  try {
    await waitUp();
    for (const page of ['/', '/cliente', '/admin', '/css/style.css', '/js/site.js', '/assets/icons.svg']) {
      await check(`GET ${page} responde 200`, async () => assert.equal((await fetch(BASE + page)).status, 200));
    }
    await check('página inexistente responde 404', async () => assert.equal((await fetch(BASE + '/nao-existe')).status, 404));
    await check('estoque do seed carregado', async () => {
      const { status, body } = await json('/api/vehicles');
      assert.equal(status, 200); assert.ok(body.length > 0, 'nenhum veículo');
    });
    await check('fotos do estoque existem', async () => {
      const { body } = await json('/api/vehicles');
      const photo = body.find((v) => v.photos.length)?.photos[0];
      assert.ok(photo, 'nenhuma foto'); assert.equal((await fetch(BASE + photo)).status, 200);
    });
    await check('dados da loja carregados', async () => {
      const { body } = await json('/api/settings'); assert.ok(body.address); assert.ok(body.phone);
    });
    await check('painel bloqueia acesso sem login', async () => assert.equal((await json('/api/admin/vehicles')).status, 401));
    await check('senha errada do painel é recusada', async () => assert.equal((await json('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'errada' }) })).status, 401));
    await check('cadastro de cliente + dúvida', async () => {
      const reg = await json('/api/customers/register', { method: 'POST', body: JSON.stringify({ name: 'Teste CI', email: `ci${Date.now()}@exemplo.test`, password: 'teste123' }) });
      assert.equal(reg.status, 201);
      const msg = await json('/api/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + reg.body.token }, body: JSON.stringify({ type: 'duvida', message: 'Teste automatizado' }) });
      assert.equal(msg.status, 201);
    });
    await check('mensagem incompleta é recusada', async () => assert.equal((await json('/api/messages', { method: 'POST', body: '{}' })).status, 400));
  } catch (e) {
    results.push(['FALHOU', 'inicialização', e.message]);
  } finally {
    const exited = new Promise((r) => server.once('exit', r));
    server.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* pasta temporária; o sistema limpa depois */ }
  }
  for (const [s, n, e] of results) console.log(`${s === 'ok' ? '✔' : '✘'} ${n}${e ? ' — ' + e : ''}`);
  const failed = results.filter((r) => r[0] !== 'ok').length;
  console.log(`\n${results.length - failed}/${results.length} verificações passaram`);
  process.exit(failed ? 1 : 0);
})();
