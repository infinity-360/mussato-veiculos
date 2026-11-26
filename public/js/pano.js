/* Visualizador 360° em canvas 2D — não precisa de WebGL, funciona em qualquer navegador.
   Projeção ajustável: t = 0 é a visão normal; t > 0 abre para o "modo mundo" (planetinha). */
window.Pano = function (box) {
  const rad = (d) => d * Math.PI / 180;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  box.appendChild(cv);
  const ui = document.createElement('div');
  ui.className = 'pano-ui';
  ui.innerHTML = '<button type="button" data-z="-12" aria-label="Aproximar">+</button><button type="button" data-z="12" aria-label="Afastar">−</button>'
    + (box.requestFullscreen ? '<button type="button" data-fs aria-label="Tela cheia">⛶</button>' : '');
  box.appendChild(ui);

  const v = { yaw: 0, pitch: 0, fov: 75, t: 0 };
  let tex = null, TW = 0, TH = 0, W = 0, H = 0, rays = null, rayKey = '', out = null, frame = null;
  let full = true, raf = 0, idle = 0, busy = false;

  function size() {
    const cw = box.clientWidth || 1, ch = box.clientHeight || 1;
    const s = Math.min(1, Math.sqrt(900000 / (cw * ch))) * (full ? 1 : 0.45); // limite de pixels para manter fluido
    return [Math.max(2, Math.round(cw * s)), Math.max(2, Math.round(ch * s))];
  }
  function buildRays() {
    const key = [W, H, v.fov, v.t].join();
    if (key === rayKey) return;
    rayKey = key; rays = new Float32Array(W * H * 3);
    const t = v.t, half = rad(v.fov) / 2;
    const k = (t + 1) * Math.sin(half) / (t + Math.cos(half)); // meia-altura no plano de projeção
    const aspect = W / H;
    for (let j = 0, n = 0; j < H; j++) {
      const Y = (1 - 2 * (j + 0.5) / H) * k;
      for (let i = 0; i < W; i++, n += 3) {
        const X = (2 * (i + 0.5) / W - 1) * k * aspect, Z = 1 + t;
        const l = Math.hypot(X, Y, Z), dx = X / l, dy = Y / l, dz = Z / l;
        const s = t * dz + Math.sqrt(Math.max(0, t * t * dz * dz - t * t + 1)); // raio saindo de (0,0,-t) até a esfera
        rays[n] = s * dx; rays[n + 1] = s * dy; rays[n + 2] = s * dz - t;
      }
    }
  }
  function draw() {
    raf = 0;
    if (!tex) return;
    const [w, h] = size();
    if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; frame = ctx.createImageData(W, H); out = new Uint32Array(frame.data.buffer); }
    buildRays();
    const cp = Math.cos(rad(v.pitch)), sp = Math.sin(rad(v.pitch)), cy = Math.cos(rad(v.yaw)), sy = Math.sin(rad(v.yaw));
    const fu = TW / (2 * Math.PI), fv = TH / Math.PI;
    for (let p = 0, n = 0, N = W * H; p < N; p++, n += 3) {
      const x = rays[n], y = rays[n + 1], z = rays[n + 2];
      const y1 = y * cp + z * sp, z1 = z * cp - y * sp;
      const x2 = x * cy + z1 * sy, z2 = z1 * cy - x * sy;
      let u = ((Math.atan2(x2, z2) + Math.PI) * fu) | 0; if (u >= TW) u = TW - 1;
      let q = ((Math.PI / 2 - Math.asin(y1 > 1 ? 1 : y1 < -1 ? -1 : y1)) * fv) | 0; if (q >= TH) q = TH - 1;
      out[p] = tex[q * TW + u];
    }
    ctx.putImageData(frame, 0, 0);
  }
  const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function moving() { // baixa resolução enquanto mexe, alta quando para
    full = false; redraw(); clearTimeout(idle);
    idle = setTimeout(() => { full = true; redraw(); }, 180);
  }
  const clamp = () => { v.pitch = Math.max(-88, Math.min(88, v.pitch)); v.fov = Math.max(30, Math.min(100, v.fov)); };

  let drag = null;
  cv.addEventListener('pointerdown', (e) => { if (busy) return; drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const d = v.fov / box.clientHeight;
    v.yaw -= (e.clientX - drag.x) * d; v.pitch += (e.clientY - drag.y) * d;
    drag = { x: e.clientX, y: e.clientY }; clamp(); moving();
  });
  const end = () => { drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  ui.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.fs !== undefined) return document.fullscreenElement ? document.exitFullscreen() : box.requestFullscreen();
    v.fov += Number(b.dataset.z); clamp(); moving();
  });
  new ResizeObserver(() => moving()).observe(box);

  return {
    setImage(src) {
      return new Promise((ok, fail) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); TW = c.width = im.naturalWidth; TH = c.height = im.naturalHeight;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          tex = new Uint32Array(x.getImageData(0, 0, TW, TH).data.buffer); redraw(); ok();
        };
        im.onerror = fail; im.src = src;
      });
    },
    look(yaw) { Object.assign(v, { yaw: yaw || 0, pitch: 0, fov: 75, t: 0 }); moving(); },
    intro(yaw, ms = 3000) { // modo mundo -> visão normal
      busy = true;
      const from = { pitch: -90, fov: 150, t: 2, yaw: (yaw || 0) - 120 }, to = { pitch: 0, fov: 75, t: 0, yaw: yaw || 0 };
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        for (const key in to) v[key] = from[key] + (to[key] - from[key]) * e;
        full = p >= 1; draw();
        if (p < 1) requestAnimationFrame(step); else busy = false;
      };
      requestAnimationFrame(step);
    },
  };
};
