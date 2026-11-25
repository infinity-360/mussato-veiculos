/*
 * Mussato Veículos — servidor do site
 * Node.js puro (sem dependências). Rode com:  node server.js
 * Dados em ./data/db.json  •  Fotos em ./data/uploads
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 20 * 1024 * 1024; // 20MB (fotos em base64)

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------------- Banco de dados (arquivo JSON) ---------------- */
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pw), salt, 64);
  const orig = Buffer.from(hash, 'hex');
  return orig.length === test.length && crypto.timingSafeEqual(orig, test);
}
const uid = () => crypto.randomBytes(8).toString('hex');

function seed() {
  const now = Date.now();
  const v = (o, i) => ({
    id: uid(), status: 'disponivel', featured: false, photos: [], features: [],
    doors: 4, createdAt: now - i * 3600e3, demo: true, ...o,
  });
  return {
    secret: crypto.randomBytes(32).toString('hex'),
    admin: { password: hashPassword('mussato2026'), mustChange: true },
    settings: {
      storeName: 'Mussato Veículos',
      slogan: 'As melhores vantagens você encontra aqui',
      phone: '(44) 3288-0611',
      whatsapp: '554432880611',
      email: '',
      instagram: 'mussato_veiculos',
      address: 'Avenida Antônio Volpato, 1086',
      city: 'Sarandi – PR',
      sellers: [
        { name: 'Kelvin', phone: '(44) 98422-7968' },
        { name: 'Genivaldo', phone: '(44) 99968-1317' },
        { name: 'Giliarde', phone: '(44) 99928-6678' },
      ],
      mapQuery: '',
      hours: 'Seg a Sex: 8h às 18h • Sáb: 8h às 12h',
      financeRate: 1.89,
      faq: [
        { q: 'Vocês aceitam meu carro na troca?', a: 'Sim! Avaliamos seu veículo na hora e usamos o valor como entrada na compra do seu próximo carro.' },
        { q: 'Como funciona o financiamento?', a: 'Trabalhamos com os principais bancos. Fazemos a simulação e a análise de crédito rapidamente, com entrada a partir de 0% conforme aprovação.' },
        { q: 'Os veículos são vistoriados?', a: 'Todos os veículos do nosso estoque passam por vistoria cautelar e revisão antes da venda.' },
        { q: 'Vocês compram carros?', a: 'Sim, compramos seu veículo à vista. Envie fotos e informações pelo WhatsApp ou venha até a loja para uma avaliação.' },
        { q: 'O estoque é próprio?', a: 'Sim. Todos os veículos anunciados estão disponíveis na nossa loja, prontos para você ver e fazer test-drive.' },
      ],
    },
    vehicles: [
      v({ brand: 'Chevrolet', model: 'Onix Plus', version: '1.0 Turbo LT', year: '2022/2023', km: 38500, price: 84900, fuel: 'Flex', transmission: 'Automático', color: 'Branco', category: 'Sedan', featured: true, features: ['Ar-condicionado', 'Direção elétrica', 'Multimídia MyLink', 'Câmera de ré', 'Sensor de estacionamento'], description: 'Sedan econômico, revisado e com manual. Ótimo para família.' }, 0),
      v({ brand: 'Hyundai', model: 'HB20', version: '1.0 Platinum Turbo', year: '2023/2024', km: 21000, price: 92900, fuel: 'Flex', transmission: 'Automático', color: 'Azul', category: 'Hatch', featured: true, features: ['Ar digital', 'Bancos em couro', 'Central multimídia', 'Faróis em LED', 'Chave presencial'], description: 'Único dono, todas as revisões na concessionária.' }, 1),
      v({ brand: 'Fiat', model: 'Mobi', version: '1.0 Like', year: '2022/2022', km: 42000, price: 54900, fuel: 'Flex', transmission: 'Manual', color: 'Branco', category: 'Hatch', featured: true, features: ['Ar-condicionado', 'Direção elétrica', 'Vidros elétricos', 'Travas elétricas'], description: 'Econômico e ideal para o dia a dia na cidade.' }, 2),
      v({ brand: 'Volkswagen', model: 'T-Cross', version: '200 TSI', year: '2021/2022', km: 51000, price: 109900, fuel: 'Flex', transmission: 'Automático', color: 'Prata', category: 'SUV', features: ['Ar digital', 'Multimídia', 'Rodas de liga', 'Piloto automático'], description: 'SUV completo, pneus novos.' }, 3),
      v({ brand: 'Toyota', model: 'Corolla', version: '2.0 XEi', year: '2020/2021', km: 68000, price: 119900, fuel: 'Flex', transmission: 'Automático', color: 'Preto', category: 'Sedan', features: ['Bancos em couro', 'Multimídia', 'Câmera de ré', 'Controle de estabilidade'], description: 'Sedan médio com conforto e confiabilidade Toyota.' }, 4),
      v({ brand: 'Fiat', model: 'Strada', version: '1.3 Freedom CD', year: '2022/2023', km: 33000, price: 104900, fuel: 'Flex', transmission: 'Manual', color: 'Vermelho', category: 'Picape', features: ['Cabine dupla', 'Multimídia', 'Ar-condicionado', 'Rodas de liga'], description: 'Picape mais vendida do Brasil, cabine dupla.' }, 5),
      v({ brand: 'Jeep', model: 'Renegade', version: '1.3 T270 Longitude', year: '2022/2022', km: 45000, price: 112900, fuel: 'Flex', transmission: 'Automático', color: 'Cinza', category: 'SUV', features: ['Teto solar', 'Multimídia', 'Bancos em couro', 'Sensor de chuva'], description: 'Robusto e confortável.' }, 6),
      v({ brand: 'Renault', model: 'Kwid', version: '1.0 Zen', year: '2021/2022', km: 39000, price: 46900, fuel: 'Flex', transmission: 'Manual', color: 'Laranja', category: 'Hatch', features: ['Ar-condicionado', 'Direção elétrica', 'Vidros elétricos'], description: 'Carro de entrada com baixo consumo.' }, 7),
    ],
    customers: [],
    messages: [],
  };
}

const SEED_FILE = path.join(DATA_DIR, 'seed.json'); // estoque inicial versionado (sem segredos)
let db;
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    db = seed();
    if (fs.existsSync(SEED_FILE)) {
      const s = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      if (s.settings) db.settings = { ...db.settings, ...s.settings };
      if (Array.isArray(s.vehicles)) db.vehicles = s.vehicles;
    }
    saveDb(); return;
  }
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
loadDb();

/* ---------------- Tokens (assinados com HMAC) ---------------- */
function signToken(payload, days = 7) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 })).toString('base64url');
  const sig = crypto.createHmac('sha256', db.secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function readToken(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [body, sig] = tok.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', db.secret).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

/* ---------------- Utilidades HTTP ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif',
};
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Arquivo muito grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, baseDir, rel) {
  const file = path.normalize(path.join(baseDir, rel));
  if (!file.startsWith(baseDir)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>Página não encontrada. <a href="/">Voltar</a></p>');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ['.html', '.css', '.js'].includes(ext) ? 'no-cache' : 'public, max-age=86400',
    });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- Regras ---------------- */
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const STATUSES = ['disponivel', 'reservado', 'vendido', 'oculto'];

function cleanVehicle(b, prev = {}) {
  const v = {
    ...prev,
    brand: str(b.brand, 40), model: str(b.model, 60), version: str(b.version, 80),
    year: str(b.year, 12), km: Math.max(0, Math.round(num(b.km))), price: Math.max(0, num(b.price)),
    fuel: str(b.fuel, 20), transmission: str(b.transmission, 20), color: str(b.color, 30),
    category: str(b.category, 20), doors: Math.round(num(b.doors)) || 4, plate: str(b.plate, 4),
    description: str(b.description, 3000),
    features: (Array.isArray(b.features) ? b.features : str(b.features, 2000).split(/[\n,;]/)).map((f) => str(f, 60)).filter(Boolean).slice(0, 40),
    photos: (Array.isArray(b.photos) ? b.photos : []).map((p) => str(p, 200)).filter((p) => p.startsWith('/uploads/')).slice(0, 20),
    featured: !!b.featured,
    status: STATUSES.includes(b.status) ? b.status : 'disponivel',
    updatedAt: Date.now(),
  };
  if (!v.brand || !v.model) fail(400, 'Marca e modelo são obrigatórios');
  delete v.demo;
  return v;
}
const publicCustomer = (c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, city: c.city, favorites: c.favorites || [], createdAt: c.createdAt });

const loginAttempts = new Map();
function throttle(req) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();
  const list = (loginAttempts.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  if (list.length >= 15) fail(429, 'Muitas tentativas. Aguarde alguns minutos.');
  list.push(now); loginAttempts.set(ip, list);
}

/* ---------------- Rotas da API ---------------- */
async function api(req, res, url) {
  const p = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  const auth = readToken(req);
  const isAdmin = auth?.role === 'admin';
  const needAdmin = () => { if (!isAdmin) fail(401, 'Acesso restrito ao lojista'); };
  const needCustomer = () => {
    const c = auth?.role === 'customer' && db.customers.find((x) => x.id === auth.id);
    if (!c) fail(401, 'Faça login para continuar');
    return c;
  };
  let mm;

  // Configurações da loja
  if (p === '/api/settings' && m === 'GET') return send(res, 200, db.settings);
  if (p === '/api/settings' && m === 'PUT') {
    needAdmin();
    const b = await readBody(req);
    const s = db.settings;
    for (const k of ['storeName', 'slogan', 'phone', 'whatsapp', 'email', 'instagram', 'address', 'city', 'mapQuery', 'hours']) if (k in b) s[k] = str(b[k], 300);
    s.whatsapp = s.whatsapp.replace(/\D/g, '');
    if ('financeRate' in b) s.financeRate = Math.min(10, Math.max(0, num(b.financeRate)));
    if (Array.isArray(b.sellers)) s.sellers = b.sellers.map((x) => ({ name: str(x.name, 60), phone: str(x.phone, 30) })).filter((x) => x.name && x.phone).slice(0, 20);
    if (Array.isArray(b.faq)) s.faq = b.faq.map((f) => ({ q: str(f.q, 300), a: str(f.a, 2000) })).filter((f) => f.q && f.a).slice(0, 40);
    saveDb(); return send(res, 200, s);
  }

  // Veículos
  if (p === '/api/vehicles' && m === 'GET') {
    return send(res, 200, db.vehicles.filter((v) => v.status !== 'oculto').sort((a, b) => b.createdAt - a.createdAt));
  }
  if ((mm = p.match(/^\/api\/vehicles\/([\w]+)$/)) && m === 'GET') {
    const v = db.vehicles.find((x) => x.id === mm[1] && (x.status !== 'oculto' || isAdmin));
    if (!v) fail(404, 'Veículo não encontrado');
    return send(res, 200, v);
  }
  if (p === '/api/admin/vehicles' && m === 'GET') { needAdmin(); return send(res, 200, [...db.vehicles].sort((a, b) => b.createdAt - a.createdAt)); }
  if (p === '/api/vehicles' && m === 'POST') {
    needAdmin();
    const v = { id: uid(), createdAt: Date.now(), ...cleanVehicle(await readBody(req)) };
    db.vehicles.push(v); saveDb(); return send(res, 201, v);
  }
  if ((mm = p.match(/^\/api\/vehicles\/([\w]+)$/)) && m === 'PUT') {
    needAdmin();
    const i = db.vehicles.findIndex((x) => x.id === mm[1]);
    if (i < 0) fail(404, 'Veículo não encontrado');
    const before = db.vehicles[i].photos || [];
    db.vehicles[i] = cleanVehicle(await readBody(req), db.vehicles[i]);
    for (const ph of before) if (!db.vehicles[i].photos.includes(ph)) fs.rm(path.join(UPLOAD_DIR, path.basename(ph)), () => {});
    saveDb(); return send(res, 200, db.vehicles[i]);
  }
  if ((mm = p.match(/^\/api\/vehicles\/([\w]+)$/)) && m === 'DELETE') {
    needAdmin();
    const i = db.vehicles.findIndex((x) => x.id === mm[1]);
    if (i < 0) fail(404, 'Veículo não encontrado');
    const [v] = db.vehicles.splice(i, 1);
    for (const ph of v.photos) fs.rm(path.join(UPLOAD_DIR, path.basename(ph)), () => {});
    saveDb(); return send(res, 200, { ok: true });
  }

  // Upload de fotos (dataURL já tratada no navegador)
  if (p === '/api/upload' && m === 'POST') {
    needAdmin();
    const { dataUrl, kind } = await readBody(req);
    const mt = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(String(dataUrl || ''));
    if (!mt) fail(400, 'Imagem inválida');
    const ext = mt[1] === 'jpeg' ? 'jpg' : mt[1];
    const name = `${kind === 'cutout' ? 'cut' : 'img'}-${Date.now()}-${uid()}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(mt[2], 'base64'));
    return send(res, 201, { url: `/uploads/${name}` });
  }

  // Login do lojista
  if (p === '/api/admin/login' && m === 'POST') {
    throttle(req);
    const { password } = await readBody(req);
    if (!checkPassword(password, db.admin.password)) fail(401, 'Senha incorreta');
    return send(res, 200, { token: signToken({ role: 'admin' }, 1), mustChange: !!db.admin.mustChange });
  }
  if (p === '/api/admin/password' && m === 'POST') {
    needAdmin();
    const { current, next } = await readBody(req);
    if (!checkPassword(current, db.admin.password)) fail(400, 'Senha atual incorreta');
    if (String(next || '').length < 8) fail(400, 'A nova senha precisa ter ao menos 8 caracteres');
    db.admin.password = hashPassword(next); db.admin.mustChange = false;
    saveDb(); return send(res, 200, { ok: true });
  }
  if (p === '/api/admin/stats' && m === 'GET') {
    needAdmin();
    const vs = db.vehicles;
    return send(res, 200, {
      vehicles: vs.length,
      available: vs.filter((v) => v.status === 'disponivel').length,
      sold: vs.filter((v) => v.status === 'vendido').length,
      stockValue: vs.filter((v) => v.status === 'disponivel').reduce((s, v) => s + v.price, 0),
      customers: db.customers.length,
      openMessages: db.messages.filter((x) => x.status !== 'respondida').length,
    });
  }
  if (p === '/api/admin/customers' && m === 'GET') { needAdmin(); return send(res, 200, db.customers.map(publicCustomer).reverse()); }
  if (p === '/api/admin/messages' && m === 'GET') { needAdmin(); return send(res, 200, [...db.messages].reverse()); }
  if ((mm = p.match(/^\/api\/admin\/messages\/([\w]+)$/)) && m === 'PUT') {
    needAdmin();
    const msg = db.messages.find((x) => x.id === mm[1]);
    if (!msg) fail(404, 'Mensagem não encontrada');
    const b = await readBody(req);
    if ('answer' in b) { msg.answer = str(b.answer, 3000); msg.answeredAt = Date.now(); msg.status = msg.answer ? 'respondida' : 'aberta'; }
    if (b.status && ['aberta', 'em atendimento', 'respondida'].includes(b.status)) msg.status = b.status;
    saveDb(); return send(res, 200, msg);
  }
  if ((mm = p.match(/^\/api\/admin\/messages\/([\w]+)$/)) && m === 'DELETE') {
    needAdmin();
    db.messages = db.messages.filter((x) => x.id !== mm[1]); saveDb(); return send(res, 200, { ok: true });
  }

  // Clientes
  if (p === '/api/customers/register' && m === 'POST') {
    throttle(req);
    const b = await readBody(req);
    const email = str(b.email, 120).toLowerCase();
    if (!str(b.name) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, 'Informe nome e e-mail válidos');
    if (String(b.password || '').length < 6) fail(400, 'A senha precisa ter ao menos 6 caracteres');
    if (db.customers.some((c) => c.email === email)) fail(409, 'Este e-mail já está cadastrado');
    const c = { id: uid(), name: str(b.name, 100), email, phone: str(b.phone, 30), city: str(b.city, 80), password: hashPassword(b.password), favorites: [], createdAt: Date.now() };
    db.customers.push(c); saveDb();
    return send(res, 201, { token: signToken({ role: 'customer', id: c.id }, 30), customer: publicCustomer(c) });
  }
  if (p === '/api/customers/login' && m === 'POST') {
    throttle(req);
    const b = await readBody(req);
    const c = db.customers.find((x) => x.email === str(b.email, 120).toLowerCase());
    if (!c || !checkPassword(b.password, c.password)) fail(401, 'E-mail ou senha incorretos');
    return send(res, 200, { token: signToken({ role: 'customer', id: c.id }, 30), customer: publicCustomer(c) });
  }
  if (p === '/api/me' && m === 'GET') return send(res, 200, publicCustomer(needCustomer()));
  if (p === '/api/me' && m === 'PUT') {
    const c = needCustomer(); const b = await readBody(req);
    for (const k of ['name', 'phone', 'city']) if (k in b) c[k] = str(b[k], 100);
    saveDb(); return send(res, 200, publicCustomer(c));
  }
  if (p === '/api/me/favorites' && m === 'POST') {
    const c = needCustomer(); const { vehicleId } = await readBody(req);
    c.favorites = c.favorites || [];
    c.favorites = c.favorites.includes(vehicleId) ? c.favorites.filter((f) => f !== vehicleId) : [...c.favorites, str(vehicleId, 40)];
    saveDb(); return send(res, 200, publicCustomer(c));
  }
  if (p === '/api/me/messages' && m === 'GET') {
    const c = needCustomer();
    return send(res, 200, db.messages.filter((x) => x.customerId === c.id).reverse());
  }

  // Mensagens: dúvidas, contato, interesse, financiamento, venda do carro
  if (p === '/api/messages' && m === 'POST') {
    const b = await readBody(req);
    const c = auth?.role === 'customer' ? db.customers.find((x) => x.id === auth.id) : null;
    const msg = {
      id: uid(), createdAt: Date.now(), status: 'aberta',
      type: ['duvida', 'contato', 'interesse', 'financiamento', 'venda'].includes(b.type) ? b.type : 'contato',
      name: str(b.name || c?.name, 100), email: str(b.email || c?.email, 120), phone: str(b.phone || c?.phone, 30),
      message: str(b.message, 3000), vehicleId: str(b.vehicleId, 40), vehicleLabel: str(b.vehicleLabel, 120),
      customerId: c?.id || null,
    };
    if (!msg.name || (!msg.email && !msg.phone) || !msg.message) fail(400, 'Preencha nome, contato e mensagem');
    db.messages.push(msg); saveDb();
    return send(res, 201, { ok: true, id: msg.id });
  }

  fail(404, 'Rota não encontrada');
}

/* ---------------- Servidor ---------------- */
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/uploads/')) return serveStatic(req, res, UPLOAD_DIR, decodeURIComponent(url.pathname.slice(9)));
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    else if (!path.extname(rel)) rel += '.html';
    return serveStatic(req, res, PUBLIC_DIR, rel);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? 'Erro interno do servidor' : e.message });
  }
}).listen(PORT, () => {
  console.log(`\n  Mussato Veículos rodando em http://localhost:${PORT}`);
  console.log(`  Painel do lojista: http://localhost:${PORT}/admin  (senha inicial: mussato2026)\n`);
});
