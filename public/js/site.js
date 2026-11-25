/* Mussato Veículos — site público */
(() => {
  const { $, $$, esc, brl, km, api, carSVG, vehicleVisual, vTitle, priceLabel, waLink, installment, toast, formData, store, TOKEN_KEY } = M;
  const kmLabel = (v) => (v.km > 0 ? km(v.km) : v.category === 'Moto' ? 'Moto' : 'Km: consulte');
  let settings = {};
  let vehicles = [];
  let me = null;
  const state = { q: '', brand: '', category: '', transmission: '', max: '', sort: 'new' };

  /* ================= INTRO ================= */
  function runIntro() {
    const intro = $('#intro');
    const seen = (() => { try { return sessionStorage.getItem('mussato_intro'); } catch { return null; } })();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen) { intro.remove(); return; }
    document.body.style.overflow = 'hidden';
    const lanes = [
      { top: 60, w: 170, dur: 1.9, delay: 0.0, color: 'Branco', cat: 'Sedan', op: .55, blur: 1.5 },
      { top: 62, w: 200, dur: 1.7, delay: 1.0, color: 'Prata', cat: 'SUV', op: .6, blur: 1.2 },
      { top: 66, w: 280, dur: 1.4, delay: 0.35, color: 'Vermelho', cat: 'Hatch', op: .85, blur: .6 },
      { top: 67, w: 300, dur: 1.3, delay: 1.45, color: 'Azul', cat: 'Hatch', op: .85, blur: .6 },
      { top: 74, w: 440, dur: 1.15, delay: 0.7, color: 'Branco', cat: 'Sedan', op: 1, blur: 0 },
      { top: 76, w: 470, dur: 1.05, delay: 1.9, color: 'Preto', cat: 'SUV', op: 1, blur: 0 },
    ];
    if (!reduce) {
      $('#intro-cars').innerHTML = lanes.map((l) => `
        <div class="intro-car" style="top:${l.top}%;width:${l.w}px;opacity:${l.op};filter:blur(${l.blur}px);animation-duration:${l.dur}s;animation-delay:${l.delay}s;z-index:${Math.round(l.w / 100)}">
          ${carSVG({ category: l.cat, color: l.color })}
        </div>`).join('');
    }
    let done = false;
    const close = () => {
      if (done) return; done = true;
      intro.classList.add('hide');
      document.body.style.overflow = '';
      try { sessionStorage.setItem('mussato_intro', '1'); } catch {}
      setTimeout(() => intro.remove(), 1000);
    };
    $('#intro-skip').addEventListener('click', close);
    intro.addEventListener('click', close);
    setTimeout(close, reduce ? 1400 : 3700);
  }

  /* ================= CONFIGURAÇÕES / CONTATO ================= */
  function applySettings() {
    const s = settings;
    const wa = waLink(s);
    $$('[data-wa]').forEach((a) => (a.href = wa));
    const ig = `https://www.instagram.com/${encodeURIComponent(s.instagram || 'mussato_veiculos')}/`;
    $$('[data-ig]').forEach((a) => (a.href = ig));
    const tel = 'tel:+55' + String(s.phone).replace(/\D/g, '');
    $('#ct-phone').href = tel; $('#ct-phone strong').textContent = s.phone;
    $('#ct-wa').textContent = s.phone && s.whatsapp?.endsWith(String(s.phone).replace(/\D/g, '').slice(-8)) ? s.phone : '+' + s.whatsapp;
    $('#ct-ig').textContent = '@' + (s.instagram || 'mussato_veiculos');
    const addr = [s.address, s.city].filter(Boolean).join(' — ');
    const q = s.mapQuery || addr;
    $('#ct-addr strong').textContent = addr;
    $('#ct-addr').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    $('#ct-hours').textContent = s.hours;
    $('#ct-sellers').innerHTML = (s.sellers || []).map((x) => `<a href="${waLink({ whatsapp: '55' + x.phone.replace(/\D/g, '') })}" target="_blank" rel="noopener">
      <svg class="ico" style="color:#1fae54;width:26px;height:26px"><use href="assets/icons.svg#i-wa"/></svg><div><small>Vendedor</small><strong>${esc(x.name)}</strong><small>${esc(x.phone)}</small></div></a>`).join('');
    $('#map').innerHTML = s.mapQuery || /\d/.test(s.address || '') && !/informe/i.test(s.address)
      ? `<iframe title="Mapa da loja" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed"></iframe>`
      : `<div class="empty" style="border:0">O mapa aparece aqui assim que o endereço for cadastrado no painel do lojista.</div>`;
    $('#ft-phone').textContent = s.phone; $('#ft-addr').textContent = addr; $('#ft-hours').textContent = s.hours;
    $('#faq').innerHTML = (s.faq || []).map((f, i) => `<details class="faq" ${i === 0 ? 'open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
    updateSim();
  }

  /* ================= MARCAS ================= */
  const brandsOf = () => {
    const map = {};
    vehicles.filter((v) => v.status !== 'vendido').forEach((v) => (map[v.brand] = (map[v.brand] || 0) + 1));
    return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  function renderBrands() {
    const list = brandsOf();
    const total = list.reduce((s, [, n]) => s + n, 0);
    $('#brands').innerHTML = [['', total], ...list].map(([b, n]) => `
      <button class="brand-btn ${state.brand === b ? 'active' : ''}" data-brand="${esc(b)}" type="button">
        <div class="brand-mark">${b ? esc(b.slice(0, 2).toUpperCase()) : '★'}</div>
        <strong>${b ? esc(b) : 'Todas'}</strong><small>${n} veículo${n === 1 ? '' : 's'}</small>
      </button>`).join('');
    const opts = '<option value="">Todas as marcas</option>' + list.map(([b]) => `<option>${esc(b)}</option>`).join('');
    $('#hs-brand').innerHTML = opts;
    $('#filters [name=brand]').innerHTML = opts.replace('Todas as marcas', 'Marca');
    const cats = [...new Set(vehicles.map((v) => v.category).filter(Boolean))].sort();
    $('#filters [name=category]').innerHTML = '<option value="">Categoria</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
    $('#st-stock').textContent = vehicles.filter((v) => v.status === 'disponivel').length;
    $('#st-brands').textContent = list.length;
    syncFilterForm();
  }
  $('#brands').addEventListener('click', (e) => {
    const b = e.target.closest('[data-brand]'); if (!b) return;
    state.brand = b.dataset.brand;
    renderBrands(); renderGrid();
    $('#estoque').scrollIntoView({ behavior: 'smooth' });
  });

  /* ================= ESTOQUE ================= */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function filtered() {
    const q = norm(state.q);
    let list = vehicles.filter((v) =>
      (!q || norm(`${v.brand} ${v.model} ${v.version} ${v.color} ${v.year}`).includes(q)) &&
      (!state.brand || v.brand === state.brand) &&
      (!state.category || v.category === state.category) &&
      (!state.transmission || v.transmission === state.transmission) &&
      (!state.max || v.price <= Number(state.max)));
    const yr = (v) => parseInt(String(v.year).split('/').pop()) || 0;
    const sorters = {
      new: (a, b) => (b.status === 'disponivel') - (a.status === 'disponivel') || b.createdAt - a.createdAt,
      low: (a, b) => (a.price || Infinity) - (b.price || Infinity), high: (a, b) => b.price - a.price, km: (a, b) => a.km - b.km, year: (a, b) => yr(b) - yr(a),
    };
    return list.sort(sorters[state.sort] || sorters.new);
  }
  function card(v) {
    const fav = me?.favorites?.includes(v.id);
    const badge = v.status === 'reservado' ? '<span class="badge reservado">Reservado</span>'
      : v.status === 'vendido' ? '<span class="badge vendido">Vendido</span>'
      : v.featured ? '<span class="badge">Destaque</span>' : '';
    return `<article class="car-card" data-id="${v.id}" tabindex="0" aria-label="${esc(vTitle(v))}">
      <div class="car-photo">${badge}
        <button class="fav-btn ${fav ? 'on' : ''}" data-fav="${v.id}" aria-label="Favoritar"><svg class="ico"><use href="assets/icons.svg#i-heart"/></svg></button>
        ${vehicleVisual(v)}
      </div>
      <div class="car-body">
        <h3>${esc(vTitle(v))}<small>${esc(v.version)}</small></h3>
        <div class="specs"><span>${esc(v.year)}</span>${v.km > 0 ? `<span>${km(v.km)}</span>` : ''}<span>${esc(v.transmission)}</span><span>${esc(v.fuel)}</span></div>
        <div class="car-foot">
          <div class="price">${priceLabel(v)}<small>${v.price > 0 ? `ou ${brl(installment(v.price * .7, settings.financeRate || 1.89, 48))}/mês*` : 'Financiamos • entrada em até 12x'}</small></div>
          <span class="btn btn-red btn-sm">Ver</span>
        </div>
      </div>
    </article>`;
  }
  function renderGrid() {
    const list = filtered();
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1">Nenhum veículo encontrado com esses filtros.<br><br><a class="btn btn-wa btn-sm" href="${waLink(settings, 'Olá! Procuro um veículo que não encontrei no site.')}" target="_blank" rel="noopener">Pedir pelo WhatsApp</a></div>`;
    $('#result-count').textContent = `${list.length} veículo${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}`;
    const labels = { q: 'Busca', brand: 'Marca', category: 'Categoria', transmission: 'Câmbio', max: 'Até' };
    $('#chips').innerHTML = Object.keys(labels).filter((k) => state[k]).map((k) =>
      `<button class="chip" data-clear="${k}" type="button">${labels[k]}: ${esc(k === 'max' ? brl(state[k]) : state[k])} <svg class="ico" style="width:14px"><use href="assets/icons.svg#i-x"/></svg></button>`).join('');
  }
  function syncFilterForm() {
    const f = $('#filters');
    for (const k in state) if (f.elements[k]) f.elements[k].value = state[k];
  }
  $('#filters').addEventListener('input', (e) => { state[e.target.name] = e.target.value; renderGrid(); if (e.target.name === 'brand') renderBrands(); });
  $('#chips').addEventListener('click', (e) => {
    const c = e.target.closest('[data-clear]'); if (!c) return;
    state[c.dataset.clear] = ''; syncFilterForm(); renderBrands(); renderGrid();
  });
  $('#hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = formData(e.target);
    Object.assign(state, { brand: d.brand, q: d.q, max: d.max });
    renderBrands(); renderGrid();
    $('#estoque').scrollIntoView({ behavior: 'smooth' });
  });
  $('#grid').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fav]');
    if (f) { e.stopPropagation(); return toggleFav(f.dataset.fav); }
    const c = e.target.closest('.car-card'); if (c) openVehicle(c.dataset.id);
  });
  $('#grid').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.car-card')) openVehicle(e.target.dataset.id); });

  /* ================= VITRINE (destaques) ================= */
  let scIndex = 0, scTimer;
  const showcaseList = () => {
    const av = vehicles.filter((v) => v.status === 'disponivel');
    const f = av.filter((v) => v.featured);
    return (f.length ? f : av).slice(0, 8);
  };
  function renderShowcase(dir = 1) {
    const list = showcaseList(); if (!list.length) return;
    scIndex = (scIndex + list.length) % list.length;
    const v = list[scIndex];
    const el = $('#sc-car');
    el.classList.add(dir > 0 ? 'leave' : 'enter');
    setTimeout(() => {
      el.innerHTML = vehicleVisual(v);
      el.dataset.id = v.id;
      el.classList.remove('leave', 'enter');
      el.classList.add(dir > 0 ? 'enter' : 'leave');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter', 'leave')));
      $('#sc-title').textContent = vTitle(v);
      $('#sc-sub').textContent = [v.version, v.year, v.km > 0 ? km(v.km) : ''].filter(Boolean).join(' • ');
      $('#sc-price').textContent = priceLabel(v);
    }, el.innerHTML ? 280 : 0);
    clearInterval(scTimer);
    scTimer = setInterval(() => { scIndex++; renderShowcase(1); }, 5500);
  }
  $('#sc-next').onclick = () => { scIndex++; renderShowcase(1); };
  $('#sc-prev').onclick = () => { scIndex--; renderShowcase(-1); };
  $('#sc-open').onclick = () => $('#sc-car').dataset.id && openVehicle($('#sc-car').dataset.id);
  $('#sc-car').onclick = () => $('#sc-car').dataset.id && openVehicle($('#sc-car').dataset.id);
  $('#sc-car').style.cursor = 'pointer';

  /* ================= DETALHE DO VEÍCULO ================= */
  let lastFocus = null;
  function openVehicle(id) {
    const v = vehicles.find((x) => x.id === id); if (!v) return;
    lastFocus = document.activeElement;
    const fav = me?.favorites?.includes(v.id);
    const msg = `Olá! Tenho interesse no ${vTitle(v)} ${v.version} ${v.year}${v.price > 0 ? ` anunciado por ${brl(v.price)}` : ''} no site. Pode me passar mais informações?`;
    const photos = v.photos?.length ? v.photos : [null];
    $('#modal-box').innerHTML = `
      <button class="round-btn modal-close" data-close aria-label="Fechar"><svg class="ico"><use href="assets/icons.svg#i-x"/></svg></button>
      <div class="detail">
        <div>
          <div class="car-photo gallery-main" id="g-main">${vehicleVisual(v)}</div>
          ${photos.length > 1 ? `<div class="thumbs">${photos.map((p, i) => `<button data-ph="${i}" class="${i ? '' : 'active'}" aria-label="Foto ${i + 1}"><img src="${esc(p)}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="detail-info">
          <div class="kicker">${esc(v.brand)} • ${esc(v.category || 'Veículo')}</div>
          <h2 id="md-title">${esc(v.model)}</h2>
          <div class="ver">${esc(v.version)}</div>
          <div class="price" style="font-size:2.2rem">${priceLabel(v)}<small>${v.status !== 'disponivel' ? M.STATUS_LABEL[v.status] : v.price > 0 ? 'à vista ou financiado' : 'Fale com um vendedor e faça sua simulação'}</small></div>
          <div class="spec-grid">
            <div><small>Ano</small><strong>${esc(v.year)}</strong></div>
            <div><small>Quilometragem</small><strong>${kmLabel(v)}</strong></div>
            <div><small>Câmbio</small><strong>${esc(v.transmission)}</strong></div>
            <div><small>Combustível</small><strong>${esc(v.fuel)}</strong></div>
            <div><small>Cor</small><strong>${esc(v.color) || '—'}</strong></div>
            <div><small>${v.category === 'Moto' ? 'Tipo' : 'Portas'}</small><strong>${v.category === 'Moto' ? 'Moto' : esc(v.doors)}</strong></div>
          </div>
          <div class="detail-actions">
            <a class="btn btn-wa" href="${waLink(settings, msg)}" target="_blank" rel="noopener"><svg class="ico"><use href="assets/icons.svg#i-wa"/></svg>Tenho interesse</a>
            <button class="btn btn-ghost" data-fav-modal="${v.id}"><svg class="ico" ${fav ? 'style="fill:var(--red-2)"' : ''}><use href="assets/icons.svg#i-heart"/></svg>${fav ? 'Favorito' : 'Favoritar'}</button>
          </div>
        </div>
      </div>
      <div class="detail-extra">
        <div>
          ${v.description ? `<h3 style="font-style:italic;text-transform:uppercase">Sobre o veículo</h3><p style="color:var(--muted);margin-top:0">${esc(v.description)}</p>` : ''}
          ${v.features?.length ? `<h3 style="font-style:italic;text-transform:uppercase">Opcionais</h3><ul class="feat-list">${v.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
          ${v.price > 0 ? `<div class="card" style="margin-top:18px;padding:20px">
            <h3 style="font-size:1.05rem">Simulação rápida</h3>
            <div class="sim-result" style="margin-top:0">${[24, 36, 48, 60].map((n) => `<div>${n}x<strong>${brl(installment(v.price * .7, settings.financeRate || 1.89, n))}</strong></div>`).join('')}</div>
            <p class="fine">Com 30% de entrada (${brl(v.price * .3)}). Taxa ref. ${String(settings.financeRate || 1.89).replace('.', ',')}% a.m. Sujeito à aprovação de crédito.</p>
          </div>` : `<div class="card" style="margin-top:18px;padding:20px">
            <h3 style="font-size:1.05rem">Financiamento facilitado</h3>
            <p style="color:var(--muted);margin:0 0 12px">Financiamento com excelentes condições e entrada parcelada em até 12x no cartão. Fale com um de nossos vendedores:</p>
            <div style="display:grid;gap:8px">${(settings.sellers || []).map((s) => `<a class="btn btn-wa btn-sm" href="${waLink({ whatsapp: '55' + s.phone.replace(/\D/g, '') }, msg)}" target="_blank" rel="noopener"><svg class="ico"><use href="assets/icons.svg#i-wa"/></svg>${esc(s.name)} • ${esc(s.phone)}</a>`).join('')}</div>
          </div>`}
        </div>
        <div class="card" style="padding:22px">
          <h3 style="font-size:1.1rem">Enviar proposta / agendar visita</h3>
          <form class="stack" data-msg="interesse" data-vehicle="${v.id}" data-label="${esc(vTitle(v) + ' ' + v.year)}">
            <input class="field" name="name" placeholder="Seu nome" required value="${esc(me?.name || '')}">
            <input class="field" name="phone" placeholder="WhatsApp" required value="${esc(me?.phone || '')}" inputmode="tel">
            <input class="field" name="email" type="email" placeholder="E-mail (opcional)" value="${esc(me?.email || '')}">
            <textarea class="field" name="message" required>Olá! Tenho interesse no ${esc(vTitle(v))} ${esc(v.year)}. Gostaria de mais informações.</textarea>
            <button class="btn btn-red" type="submit">Enviar</button>
          </form>
        </div>
      </div>`;
    const modal = $('#modal');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('.modal-close').focus();
    history.replaceState(null, '', '?v=' + v.id + location.hash);
    $$('.thumbs [data-ph]').forEach((b) => b.onclick = () => {
      $$('.thumbs [data-ph]').forEach((x) => x.classList.toggle('active', x === b));
      $('#g-main').innerHTML = vehicleVisual(v, Number(b.dataset.ph));
    });
    $('[data-fav-modal]').onclick = () => toggleFav(v.id, true);
  }
  function closeModal() {
    $('#modal').classList.remove('open');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.hash);
    lastFocus?.focus?.();
  }
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

  /* ================= FAVORITOS (cliente logado; na vitrine, salvos no navegador) ================= */
  const FAV_KEY = 'mussato_favs';
  async function toggleFav(id, reopen) {
    if (M.STATIC) {
      const favs = me.favorites.includes(id) ? me.favorites.filter((f) => f !== id) : [...me.favorites, id];
      me.favorites = favs; store.set(FAV_KEY, JSON.stringify(favs));
      toast(favs.includes(id) ? 'Salvo nos favoritos deste navegador' : 'Removido dos favoritos');
      renderGrid(); if (reopen) openVehicle(id); return;
    }
    if (!me) { toast('Entre ou cadastre-se para salvar favoritos', 'err'); setTimeout(() => (location.href = '/cliente?fav=' + id), 900); return; }
    try {
      me = await api('/api/me/favorites', { method: 'POST', body: { vehicleId: id } });
      toast(me.favorites.includes(id) ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
      renderGrid(); if (reopen) openVehicle(id);
    } catch (err) { toast(err.message, 'err'); }
  }

  /* ================= FORMULÁRIOS ================= */
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-msg]'); if (!form) return;
    e.preventDefault();
    const d = formData(form);
    const type = form.dataset.msg;
    let message = d.message || '';
    if (type === 'venda') message = `Veículo: ${d.car} | Ano/km: ${d.yearkm || '-'}\n${message}`;
    if (M.STATIC) { // vitrine: sem servidor, a mensagem vai pelo WhatsApp da loja
      const head = { venda: 'Quero vender/trocar meu veículo', duvida: 'Tenho uma dúvida', interesse: `Interesse: ${form.dataset.label || ''}`, contato: 'Contato pelo site' }[type] || 'Contato pelo site';
      const text = [`*${head}*`, `Nome: ${d.name}`, d.phone && `WhatsApp: ${d.phone}`, d.email && `E-mail: ${d.email}`, '', message].filter((x) => x !== undefined && x !== false && x !== '').join('\n');
      window.open(waLink(settings, text), '_blank', 'noopener');
      if (type !== 'interesse') form.reset();
      return;
    }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await api('/api/messages', { method: 'POST', body: { type, name: d.name, phone: d.phone, email: d.email, message, vehicleId: form.dataset.vehicle, vehicleLabel: form.dataset.label } });
      toast('Mensagem enviada! Em breve entraremos em contato.');
      if (type !== 'interesse') form.reset();
    } catch (err) { toast(err.message, 'err'); }
    btn.disabled = false;
  });

  /* ================= SIMULADOR ================= */
  const parseMoney = (s) => Number(String(s).replace(/\D/g, '')) || 0;
  function updateSim() {
    const price = parseMoney($('#sim-price').value);
    const pct = Number($('#sim-down').value), n = Number($('#sim-n').value);
    const down = price * pct / 100, fin = price - down, rate = settings.financeRate || 1.89;
    $('#sim-down-l').textContent = `${pct}% • ${brl(down)}`;
    $('#sim-n-l').textContent = `${n}x`;
    $('#r-down').textContent = brl(down); $('#r-fin').textContent = brl(fin);
    $('#r-n').textContent = n + 'x'; $('#r-pmt').textContent = brl(installment(fin, rate, n));
    $('#sim-fine').textContent = `Simulação ilustrativa pela tabela Price com taxa de referência de ${String(rate).replace('.', ',')}% a.m. Valores finais dependem da análise de crédito.`;
  }
  $('#sim-price').addEventListener('input', (e) => { const n = parseMoney(e.target.value); e.target.value = n ? n.toLocaleString('pt-BR') : ''; updateSim(); });
  ['#sim-down', '#sim-n'].forEach((s) => $(s).addEventListener('input', updateSim));
  $('#sim-send').onclick = () => {
    const t = `Olá! Fiz uma simulação no site: veículo de ${$('#sim-price').value ? 'R$ ' + $('#sim-price').value : '-'}, entrada de ${$('#r-down').textContent}, em ${$('#r-n').textContent} de ${$('#r-pmt').textContent}. Podem me ajudar?`;
    window.open(waLink(settings, t), '_blank', 'noopener');
  };

  /* ================= UI GERAL ================= */
  const burger = $('#burger');
  burger.onclick = () => { const o = $('#nav-links').classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => { $('#nav-links').classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.reveal').forEach((el) => io.observe(el));
  $('#year').textContent = new Date().getFullYear();

  /* ================= INICIALIZAÇÃO ================= */
  runIntro();
  (async () => {
    try {
      [settings, vehicles] = await Promise.all([api('/api/settings'), api('/api/vehicles')]);
    } catch (err) {
      toast('Não foi possível carregar o estoque. Tente novamente.', 'err'); return;
    }
    if (M.STATIC) {
      let favs = []; try { favs = JSON.parse(store.get(FAV_KEY) || '[]'); } catch {}
      me = { name: '', phone: '', email: '', favorites: Array.isArray(favs) ? favs : [] };
    } else if (store.get(TOKEN_KEY.customer)) {
      try { me = await api('/api/me'); $('#client-link span').textContent = 'Olá, ' + me.name.split(' ')[0]; }
      catch { store.set(TOKEN_KEY.customer, null); }
    }
    const params = new URLSearchParams(location.search);
    if (params.get('marca')) state.brand = params.get('marca');
    applySettings(); renderBrands(); renderGrid(); renderShowcase();
    if (params.get('v')) openVehicle(params.get('v'));
  })();
})();
