/* Mussato Veículos — painel do lojista */
const { $, $$, esc, brl, km, date, api: baseApi, store, TOKEN_KEY, vehicleVisual, vTitle, STATUS_LABEL, toast, formData } = M;
const api = (path, opts = {}) => baseApi(path, { ...opts, role: 'admin' }).catch((err) => {
  if (err.status === 401 && !path.includes('/login')) { store.set(TOKEN_KEY.admin, null); showLogin(); }
  throw err;
});

const BG_REMOVAL_URL = 'https://esm.sh/@imgly/background-removal@1.4.5';
let vehicles = [], messages = [], customers = [], settings = {};
let editing = null;      // veículo em edição
let photos = [];         // URLs das fotos no editor
let pending = 0;         // fotos em processamento

/* ================= LOGIN ================= */
function showLogin() { $('#app-view').hidden = true; $('#login-view').hidden = false; $('#pw').focus(); }
async function showApp(mustChange) {
  $('#login-view').hidden = true; $('#app-view').hidden = false;
  $('#pw-banner').hidden = !mustChange;
  await loadAll();
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/admin/login', { method: 'POST', body: formData(e.target) });
    store.set(TOKEN_KEY.admin, r.token);
    store.set('mussato_admin_must_change', r.mustChange ? '1' : null);
    e.target.reset(); showApp(r.mustChange);
  } catch (err) { toast(err.message, 'err'); }
});
$('#logout').onclick = () => { store.set(TOKEN_KEY.admin, null); showLogin(); };

/* ================= NAVEGAÇÃO ================= */
const TITLES = { dash: 'Painel', vehicles: 'Veículos', messages: 'Mensagens', customers: 'Clientes', settings: 'Dados da loja' };
function go(tab) {
  $$('.adm-side [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('[data-view]').forEach((s) => (s.hidden = s.dataset.view !== tab));
  $('#page-title').textContent = TITLES[tab];
  $('#side').classList.remove('open');
  history.replaceState(null, '', '#' + tab);
}
$$('.adm-side [data-tab]').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });
$('#adm-burger').onclick = () => $('#side').classList.toggle('open');

async function loadAll() {
  try {
    [vehicles, messages, customers, settings] = await Promise.all([
      api('/api/admin/vehicles'), api('/api/admin/messages'), api('/api/admin/customers'), api('/api/settings'),
    ]);
  } catch (err) { if (err.status !== 401) toast(err.message, 'err'); return; }
  renderDash(); renderVehicles(); renderMessages(); renderCustomers(); renderSettings();
  go(TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'dash');
}

/* ================= DASHBOARD ================= */
function renderDash() {
  const av = vehicles.filter((v) => v.status === 'disponivel');
  const open = messages.filter((m) => m.status !== 'respondida');
  const kpis = [
    ['Veículos no estoque', av.length],
    ['Valor em estoque', brl(av.reduce((s, v) => s + v.price, 0))],
    ['Vendidos', vehicles.filter((v) => v.status === 'vendido').length],
    ['Clientes cadastrados', customers.length],
    ['Mensagens abertas', open.length],
  ];
  $('#kpis').innerHTML = kpis.map(([l, v]) => `<div class="kpi"><small>${l}</small><strong>${v}</strong></div>`).join('');
  $('#msg-count').hidden = !open.length; $('#msg-count').textContent = open.length;
  $('#dash-msgs').innerHTML = messages.slice(0, 5).map(msgHTML).join('') || '<p style="color:var(--muted)">Nenhuma mensagem ainda.</p>';
}

/* ================= VEÍCULOS ================= */
function renderVehicles() {
  const q = $('#v-search').value.toLowerCase(), st = $('#v-status').value;
  const list = vehicles.filter((v) => (!st || v.status === st) && (!q || `${v.brand} ${v.model} ${v.version} ${v.year}`.toLowerCase().includes(q)));
  $('#vlist').innerHTML = list.map((v) => `
    <div class="vrow" data-id="${v.id}">
      <div class="car-photo">${vehicleVisual(v)}</div>
      <div><h4>${esc(vTitle(v))} ${v.demo ? '<span class="demo-tag">EXEMPLO</span>' : ''}</h4>
        <div class="sub">${esc(v.version)} • ${esc(v.year)} • ${v.km ? km(v.km) : 'km não informado'} • ${v.photos.length} foto(s)</div>
        <div class="price" style="font-size:1.2rem;margin-top:4px">${M.priceLabel(v)}</div></div>
      <select class="status-sel" data-status aria-label="Status">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="actions">
        <button class="icon-btn ${v.featured ? 'on' : ''}" data-feat title="Destaque"><svg class="ico"><use href="assets/icons.svg#i-star"/></svg></button>
        <a class="icon-btn" href="/?v=${v.id}" target="_blank" title="Ver no site"><svg class="ico"><use href="assets/icons.svg#i-search"/></svg></a>
        <button class="icon-btn" data-edit title="Editar"><svg class="ico"><use href="assets/icons.svg#i-edit"/></svg></button>
        <button class="icon-btn" data-del title="Excluir"><svg class="ico"><use href="assets/icons.svg#i-trash"/></svg></button>
      </div>
    </div>`).join('') || '<div class="empty">Nenhum veículo encontrado.</div>';
}
$('#v-search').oninput = renderVehicles;
$('#v-status').onchange = renderVehicles;
async function saveVehicle(v, patch) {
  const updated = await api('/api/vehicles/' + v.id, { method: 'PUT', body: { ...v, ...patch } });
  vehicles = vehicles.map((x) => (x.id === v.id ? updated : x));
  renderVehicles(); renderDash();
  return updated;
}
$('#vlist').addEventListener('click', async (e) => {
  const row = e.target.closest('.vrow'); if (!row) return;
  const v = vehicles.find((x) => x.id === row.dataset.id);
  try {
    if (e.target.closest('[data-edit]')) openEditor(v);
    if (e.target.closest('[data-feat]')) { await saveVehicle(v, { featured: !v.featured }); toast('Destaque atualizado'); }
    if (e.target.closest('[data-del]')) {
      if (!confirm(`Excluir definitivamente o ${vTitle(v)} e suas fotos? Essa ação não pode ser desfeita.`)) return;
      await api('/api/vehicles/' + v.id, { method: 'DELETE' });
      vehicles = vehicles.filter((x) => x.id !== v.id); renderVehicles(); renderDash(); toast('Veículo excluído');
    }
  } catch (err) { toast(err.message, 'err'); }
});
$('#vlist').addEventListener('change', async (e) => {
  if (!e.target.matches('[data-status]')) return;
  const v = vehicles.find((x) => x.id === e.target.closest('.vrow').dataset.id);
  try { await saveVehicle(v, { status: e.target.value }); toast('Status: ' + STATUS_LABEL[e.target.value]); } catch (err) { toast(err.message, 'err'); }
});

/* ---------- Editor ---------- */
const editor = $('#editor');
function openEditor(v) {
  editing = v || null;
  const f = $('#vform'); f.reset();
  $('#ed-title').textContent = v ? 'Editar ' + vTitle(v) : 'Novo veículo';
  if (v) {
    for (const k of ['brand', 'model', 'version', 'year', 'color', 'doors', 'description', 'category', 'transmission', 'fuel', 'status']) if (f.elements[k]) f.elements[k].value = v[k] ?? '';
    f.elements.km.value = Number(v.km || 0).toLocaleString('pt-BR');
    f.elements.price.value = Number(v.price || 0).toLocaleString('pt-BR');
    f.elements.features.value = (v.features || []).join(', ');
    f.elements.featured.checked = !!v.featured;
  } else { f.elements.doors.value = 4; }
  photos = [...(v?.photos || [])];
  renderPhotos();
  editor.classList.add('open'); document.body.style.overflow = 'hidden';
  f.elements.brand.focus();
}
function closeEditor() {
  if (pending && !confirm('Ainda há fotos sendo processadas. Fechar mesmo assim?')) return;
  editor.classList.remove('open'); document.body.style.overflow = '';
}
$('#new-vehicle').onclick = () => { go('vehicles'); openEditor(null); };
editor.addEventListener('click', (e) => { if (e.target === editor || e.target.closest('[data-close]')) closeEditor(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && editor.classList.contains('open')) closeEditor(); });
['km', 'price'].forEach((n) => $('#vform').elements[n].addEventListener('input', (e) => {
  const d = Number(e.target.value.replace(/\D/g, '')); e.target.value = d ? d.toLocaleString('pt-BR') : '';
}));

$('#vform').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (pending) return toast('Aguarde o processamento das fotos', 'err');
  const d = formData(e.target);
  const body = { ...d, km: d.km.replace(/\D/g, ''), price: d.price.replace(/\D/g, ''), featured: e.target.elements.featured.checked, photos };
  const btn = $('#vsave'); btn.disabled = true;
  try {
    if (editing) {
      const u = await api('/api/vehicles/' + editing.id, { method: 'PUT', body });
      vehicles = vehicles.map((x) => (x.id === u.id ? u : x));
    } else {
      vehicles.unshift(await api('/api/vehicles', { method: 'POST', body }));
    }
    toast('Veículo salvo e publicado no site!');
    editor.classList.remove('open'); document.body.style.overflow = '';
    renderVehicles(); renderDash();
  } catch (err) { toast(err.message, 'err'); }
  btn.disabled = false;
});

/* ---------- Fotos: envio, recorte (IA) e tratamento ---------- */
function renderPhotos() {
  const fake = { brand: '', model: '' };
  $('#photos').innerHTML = photos.map((p, i) => `
    <div class="ph" data-i="${i}">${i === 0 ? '<span class="cover">Capa</span>' : ''}
      <div class="car-photo">${vehicleVisual({ ...fake, photos: [p] })}</div>
      <div class="ph-bar">
        <span style="display:flex;gap:4px"><button type="button" data-mv="-1" aria-label="Mover para esquerda"><svg class="ico"><use href="assets/icons.svg#i-left"/></svg></button><button type="button" data-mv="1" aria-label="Mover para direita"><svg class="ico"><use href="assets/icons.svg#i-right"/></svg></button></span>
        <button type="button" data-rm aria-label="Remover foto"><svg class="ico"><use href="assets/icons.svg#i-trash"/></svg></button>
      </div>
    </div>`).join('') + Array.from({ length: pending }, (_, k) => `<div class="ph processing" id="proc-${k}"><div>Processando foto…<div class="bar"><i></i></div></div></div>`).join('');
}
$('#photos').addEventListener('click', (e) => {
  const ph = e.target.closest('.ph[data-i]'); if (!ph) return;
  const i = Number(ph.dataset.i);
  const mv = e.target.closest('[data-mv]');
  if (mv) {
    const j = i + Number(mv.dataset.mv);
    if (j < 0 || j >= photos.length) return;
    [photos[i], photos[j]] = [photos[j], photos[i]]; renderPhotos();
  }
  if (e.target.closest('[data-rm]')) { photos.splice(i, 1); renderPhotos(); }
});
const drop = $('#drop');
drop.onclick = () => $('#file').click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } };
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files); };
$('#file').onchange = (e) => { handleFiles(e.target.files); e.target.value = ''; };

let bgModule = null;
async function getBgRemover() {
  if (!bgModule) bgModule = import(BG_REMOVAL_URL);
  return bgModule;
}
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

/** Recorta bordas transparentes deixando uma pequena margem */
function trimCanvas(c) {
  const ctx = c.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return c;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

async function processFile(file, { removeBg, enhance }, onProgress) {
  let blob = file, cutout = false;
  if (removeBg) {
    try {
      const mod = await getBgRemover();
      const remove = mod.removeBackground || mod.default;
      blob = await remove(file, {
        output: { format: 'image/png' },
        progress: (key, cur, total) => onProgress(key.startsWith('fetch') ? 0.1 + 0.5 * (cur / (total || 1)) : 0.7),
      });
      cutout = true;
    } catch (err) {
      console.error(err);
      toast('Não foi possível remover o fundo desta foto (verifique a internet). Enviando com fundo original.', 'err');
    }
  }
  onProgress(0.8);
  const url = URL.createObjectURL(blob);
  const img = await loadImg(url);
  URL.revokeObjectURL(url);
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  let c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (enhance) ctx.filter = 'brightness(1.05) contrast(1.1) saturate(1.15)';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.filter = 'none';
  if (cutout) c = trimCanvas(c);
  const dataUrl = cutout ? c.toDataURL('image/webp', 0.9) : c.toDataURL('image/jpeg', 0.86);
  onProgress(0.9);
  const { url: saved } = await api('/api/upload', { method: 'POST', body: { dataUrl, kind: cutout ? 'cutout' : 'photo' } });
  onProgress(1);
  return saved;
}

async function handleFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const opts = { removeBg: $('#opt-bg').checked, enhance: $('#opt-enh').checked };
  if (opts.removeBg) toast('Removendo o fundo com IA… a primeira foto demora um pouco mais (baixando o modelo).');
  for (const file of files) {
    pending++; renderPhotos();
    const bar = () => $(`#proc-0 .bar i`);
    try {
      const url = await processFile(file, opts, (p) => { const b = bar(); if (b) b.style.width = Math.round(p * 100) + '%'; });
      photos.push(url);
    } catch (err) { toast('Erro ao enviar foto: ' + err.message, 'err'); }
    pending--; renderPhotos();
  }
  toast('Fotos prontas! Lembre de salvar o veículo.');
}

/* ================= MENSAGENS ================= */
const TYPE_LABEL = { interesse: 'Interesse', duvida: 'Dúvida', venda: 'Vender/Trocar', financiamento: 'Financiamento', contato: 'Contato' };
function msgHTML(m) {
  return `<div class="msg" data-id="${m.id}">
    <div class="meta"><span><b style="color:#fff">${esc(m.name)}</b> • ${esc(TYPE_LABEL[m.type] || m.type)}${m.vehicleLabel ? ' • ' + esc(m.vehicleLabel) : ''}${m.customerId ? ' • cliente cadastrado' : ''}</span>
      <span><span class="tag ${m.status === 'em atendimento' ? 'em' : esc(m.status)}">${esc(m.status)}</span> ${date(m.createdAt)}</span></div>
    <p style="margin:8px 0;white-space:pre-wrap">${esc(m.message)}</p>
    <div class="meta"><span>${m.phone ? '📱 ' + esc(m.phone) : ''} ${m.email ? '✉️ ' + esc(m.email) : ''}</span></div>
    ${m.answer ? `<div class="answer"><small style="color:var(--muted)">Resposta (${date(m.answeredAt)}):</small><div>${esc(m.answer)}</div></div>` : ''}
  </div>`;
}
function renderMessages() {
  const t = $('#m-type').value, s = $('#m-status').value;
  const list = messages.filter((m) => (!t || m.type === t) && (!s || m.status === s));
  $('#mlist').innerHTML = list.map((m) => {
    const base = msgHTML(m);
    const wa = m.phone ? `https://wa.me/${(m.phone.replace(/\D/g, '').length <= 11 ? '55' : '') + m.phone.replace(/\D/g, '')}` : '';
    return base.replace(/<\/div>$/, `
      <form class="stack" data-answer style="margin-top:10px">
        <textarea class="field" name="answer" placeholder="Escreva a resposta (aparece na área do cliente)" style="min-height:70px">${esc(m.answer || '')}</textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-red btn-sm" type="submit">Salvar resposta</button>
          <button class="btn btn-ghost btn-sm" type="button" data-st="em atendimento">Em atendimento</button>
          ${wa ? `<a class="btn btn-wa btn-sm" href="${wa}" target="_blank" rel="noopener">Responder no WhatsApp</a>` : ''}
          ${m.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(m.email)}">E-mail</a>` : ''}
          <button class="btn btn-ghost btn-sm" type="button" data-mdel style="margin-left:auto">Excluir</button>
        </div>
      </form></div>`);
  }).join('') || '<div class="empty">Nenhuma mensagem por aqui.</div>';
}
$('#m-type').onchange = renderMessages; $('#m-status').onchange = renderMessages;
async function updateMsg(id, body) {
  const u = await api('/api/admin/messages/' + id, { method: 'PUT', body });
  messages = messages.map((m) => (m.id === id ? u : m)); renderMessages(); renderDash();
}
$('#mlist').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = e.target.closest('.msg').dataset.id;
  try { await updateMsg(id, { answer: e.target.elements.answer.value }); toast('Resposta salva'); } catch (err) { toast(err.message, 'err'); }
});
$('#mlist').addEventListener('click', async (e) => {
  const id = e.target.closest('.msg')?.dataset.id; if (!id) return;
  try {
    if (e.target.closest('[data-st]')) { await updateMsg(id, { status: e.target.closest('[data-st]').dataset.st }); toast('Status atualizado'); }
    if (e.target.closest('[data-mdel]')) {
      if (!confirm('Excluir esta mensagem definitivamente?')) return;
      await api('/api/admin/messages/' + id, { method: 'DELETE' });
      messages = messages.filter((m) => m.id !== id); renderMessages(); renderDash();
    }
  } catch (err) { toast(err.message, 'err'); }
});

/* ================= CLIENTES ================= */
function renderCustomers() {
  const q = $('#c-search').value.toLowerCase();
  const list = customers.filter((c) => !q || `${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q));
  $('#clist').innerHTML = list.map((c) => {
    const digits = (c.phone || '').replace(/\D/g, '');
    return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${esc(c.city)}</td>
      <td>${(c.favorites || []).map((id) => { const v = vehicles.find((x) => x.id === id); return v ? esc(vTitle(v)) : ''; }).filter(Boolean).join(', ') || '—'}</td>
      <td>${new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
      <td>${digits ? `<a class="btn btn-wa btn-sm" href="https://wa.me/${digits.length <= 11 ? '55' : ''}${digits}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px">Nenhum cliente cadastrado ainda.</td></tr>';
}
$('#c-search').oninput = renderCustomers;
$('#c-export').onclick = () => {
  const rows = [['Nome', 'E-mail', 'Telefone', 'Cidade', 'Cadastro'], ...customers.map((c) => [c.name, c.email, c.phone, c.city, new Date(c.createdAt).toLocaleDateString('pt-BR')])];
  const csv = '﻿' + rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'clientes-mussato.csv'; a.click();
};

/* ================= CONFIGURAÇÕES ================= */
function faqItem(f = { q: '', a: '' }) {
  return `<div class="item"><div class="stack"><input class="field" data-q placeholder="Pergunta" value="${esc(f.q)}"><textarea class="field" data-a placeholder="Resposta" style="min-height:60px">${esc(f.a)}</textarea></div>
    <button type="button" class="icon-btn" data-faq-rm aria-label="Remover"><svg class="ico"><use href="assets/icons.svg#i-trash"/></svg></button></div>`;
}
function renderSettings() {
  const f = $('#settings-form');
  for (const k of ['storeName', 'phone', 'whatsapp', 'email', 'instagram', 'address', 'city', 'mapQuery', 'hours', 'financeRate']) f.elements[k].value = settings[k] ?? '';
  f.elements.sellersText.value = (settings.sellers || []).map((s) => `${s.name}: ${s.phone}`).join('\n');
  $('#faq-edit').innerHTML = (settings.faq || []).map(faqItem).join('');
}
$('#faq-add').onclick = () => $('#faq-edit').insertAdjacentHTML('beforeend', faqItem());
$('#faq-edit').addEventListener('click', (e) => { if (e.target.closest('[data-faq-rm]')) e.target.closest('.item').remove(); });
$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = formData(e.target);
  body.financeRate = String(body.financeRate).replace(',', '.');
  body.sellers = body.sellersText.split('\n').map((l) => l.split(':')).filter((p) => p.length > 1).map(([n, ...t]) => ({ name: n.trim(), phone: t.join(':').trim() }));
  delete body.sellersText;
  body.faq = $$('#faq-edit .item').map((it) => ({ q: $('[data-q]', it).value, a: $('[data-a]', it).value }));
  try { settings = await api('/api/settings', { method: 'PUT', body }); renderSettings(); toast('Dados da loja salvos!'); } catch (err) { toast(err.message, 'err'); }
});
$('#pw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/password', { method: 'POST', body: formData(e.target) });
    e.target.reset(); $('#pw-banner').hidden = true; store.set('mussato_admin_must_change', null);
    toast('Senha alterada com sucesso');
  } catch (err) { toast(err.message, 'err'); }
});

/* ================= INÍCIO ================= */
if (store.get(TOKEN_KEY.admin)) showApp(!!store.get('mussato_admin_must_change')); else showLogin();
