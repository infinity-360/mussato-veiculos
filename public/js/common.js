/* Mussato Veículos — utilidades compartilhadas */
const M = (() => {
  const TOKEN_KEY = { admin: 'mussato_admin_token', customer: 'mussato_customer_token' };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };

  async function api(path, { method = 'GET', body, role } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const roles = role ? [role] : ['customer'];
    for (const r of roles) { const t = store.get(TOKEN_KEY[r]); if (t) headers.Authorization = 'Bearer ' + t; }
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data?.error || 'Erro de conexão');
      err.status = res.status; throw err;
    }
    return data;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const km = (n) => Number(n || 0).toLocaleString('pt-BR') + ' km';
  const date = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Silhuetas de carro (usadas quando o veículo ainda não tem foto) ---------- */
  const COLORS = {
    branco: '#eef0f3', preto: '#1b1d22', prata: '#b9bec5', cinza: '#6a7079', azul: '#1f4fa8', vermelho: '#d3141c',
    laranja: '#e66a16', verde: '#1f7a45', amarelo: '#e8b913', marrom: '#6b4429', bege: '#cdb894', vinho: '#6d1020', dourado: '#b99645',
  };
  const colorOf = (name) => {
    const k = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const key in COLORS) if (k.includes(key)) return COLORS[key];
    return '#c9ccd2';
  };
  const SHAPES = {
    // [frente capô Y, base para-brisa X, teto início X, teto fim X, base vidro traseiro X, teto Y, linha cintura Y, traseira X, chão Y]
    hatch: [86, 140, 182, 300, 344, 42, 76, 360, 116],
    sedan: [86, 140, 184, 268, 318, 44, 74, 382, 116],
    suv: [74, 136, 172, 330, 352, 28, 66, 364, 120],
    picape: [80, 146, 180, 248, 254, 40, 72, 386, 118],
  };
  function shapeFor(category) {
    const c = String(category || '').toLowerCase();
    if (c.includes('suv') || c.includes('utilit')) return 'suv';
    if (c.includes('picape') || c.includes('pick')) return 'picape';
    if (c.includes('sedan') || c.includes('sedã')) return 'sedan';
    return 'hatch';
  }
  let svgSeq = 0;
  function carSVG({ category, color, mono } = {}) {
    const [hoodY, a, b, c, d, roofY, beltY, rearX, groundY] = SHAPES[shapeFor(category)];
    const fill = mono || colorOf(color);
    const id = 'g' + (++svgSeq);
    const wy = groundY - 2, w1 = 96, w2 = rearX - 70, r = 25;
    const body = `M16,${groundY - 6} Q14,${hoodY + 8} 30,${hoodY} L${a - 24},${beltY + 2} Q${a - 6},${beltY} ${a},${beltY - 2}
      L${b},${roofY + 4} Q${b + 6},${roofY} ${b + 18},${roofY} L${c - 10},${roofY} Q${c},${roofY} ${c + 6},${roofY + 6}
      L${d},${beltY - 2} L${rearX - 8},${beltY + 2} Q${rearX + 4},${beltY + 6} ${rearX + 4},${beltY + 22}
      L${rearX + 4},${groundY - 6} Q${rearX + 4},${groundY} ${rearX - 4},${groundY} L24,${groundY} Q16,${groundY} 16,${groundY - 6}Z`;
    const win = `M${a + 10},${beltY - 3} L${b + 6},${roofY + 9} Q${b + 10},${roofY + 6} ${b + 20},${roofY + 6} L${c - 12},${roofY + 6} Q${c - 4},${roofY + 6} ${c},${roofY + 11} L${d - 12},${beltY - 3}Z`;
    const pillar = (b + c) / 2 + 6;
    const wheel = (x) => mono ? `<circle cx="${x}" cy="${wy}" r="${r}" fill="#000"/>` : `
      <circle cx="${x}" cy="${wy}" r="${r}" fill="#111"/><circle cx="${x}" cy="${wy}" r="${r - 8}" fill="#9aa1aa"/>
      <circle cx="${x}" cy="${wy}" r="${r - 12}" fill="#4a5058"/><circle cx="${x}" cy="${wy}" r="4" fill="#cfd4da"/>`;
    return `<svg class="car-svg" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${mono ? '' : `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
      <ellipse cx="200" cy="${groundY + 6}" rx="190" ry="9" fill="#000" opacity=".35"/>`}
      <path d="${body}" fill="${fill}"/>
      ${mono ? '' : `<path d="${body}" fill="url(#${id})"/>
      <path d="${win}" fill="#1c2430" opacity=".92"/>
      <rect x="${pillar}" y="${roofY + 4}" width="6" height="${beltY - roofY - 4}" fill="${fill}"/>
      <path d="M20,${hoodY + 12} q8,-4 22,-2" stroke="#fff6c8" stroke-width="5" stroke-linecap="round" fill="none"/>
      <rect x="${rearX - 2}" y="${beltY + 6}" width="7" height="12" rx="2" fill="#c3141b"/>
      <line x1="${a + 30}" y1="${beltY + 20}" x2="${d - 10}" y2="${beltY + 20}" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`}
      <circle cx="${w1}" cy="${wy}" r="${r + 5}" fill="${mono ? '#000' : '#0d0f12'}" opacity="${mono ? 1 : .55}"/>
      <circle cx="${w2}" cy="${wy}" r="${r + 5}" fill="${mono ? '#000' : '#0d0f12'}" opacity="${mono ? 1 : .55}"/>
      ${wheel(w1)}${wheel(w2)}
    </svg>`;
  }

  /** Imagem principal de um veículo: foto enviada (recortada) ou silhueta */
  function vehicleVisual(v, i = 0) {
    const src = v.photos?.[i];
    if (src) {
      const full = !src.includes('/cut-'); // foto sem recorte ocupa todo o quadro
      return `<img src="${esc(src)}" ${full ? 'class="full"' : ''} alt="${esc(v.brand + ' ' + v.model)}" loading="lazy" decoding="async">`;
    }
    return carSVG(v);
  }
  const vTitle = (v) => `${v.brand} ${v.model}`;
  const priceLabel = (v) => (v.price > 0 ? brl(v.price) : 'Consulte');
  const STATUS_LABEL = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido', oculto: 'Oculto' };

  function waLink(settings, text) {
    const n = String(settings?.whatsapp || '554432880611').replace(/\D/g, '');
    return `https://wa.me/${n}?text=${encodeURIComponent(text || 'Olá! Vim pelo site da Mussato Veículos.')}`;
  }

  /** Parcela pela tabela Price */
  function installment(pv, ratePct, n) {
    const i = ratePct / 100;
    if (pv <= 0) return 0;
    if (!i) return pv / n;
    return (pv * i) / (1 - Math.pow(1 + i, -n));
  }

  function toast(msg, type = 'ok') {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg; t.setAttribute('role', 'status');
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  const formData = (form) => Object.fromEntries(new FormData(form).entries());

  return { api, store, TOKEN_KEY, esc, brl, km, date, $, $$, carSVG, vehicleVisual, vTitle, priceLabel, STATUS_LABEL, waLink, installment, toast, formData, colorOf };
})();
