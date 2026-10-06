/* PXRD window: simulated powder patterns of the open structures, compared with measured data.
   Interface code only. The numbers come from XtalCore.powderPattern and XtalCore.powderProfile.
   The window is a separate browser window. If the browser blocks that window, the same content is shown as a
   floating window in the page. All code runs in the Crysta page, so the window closes with that page.
   Use: const pxrd = CrystaPxrd.create({ docs, current, addFiles, name, version }); pxrd.open(); pxrd.sync(); */
(function () {
  'use strict';
  const C = window.XtalCore;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Line colours of the patterns, in a fixed order: eight hues that stay apart for the common forms of colour
     blindness, with separate steps for the light and the dark page. The first measured data set is drawn in ink. */
  const SERIES = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
  };
  const FONT_UI = "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif";
  const FONT_DATA = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";
  const STRUCTURE_FILE = /\.(cif|res|ins|vasp|poscar|xyz|extxyz|mol2|in)$|^(POSCAR|CONTCAR)/i;
  const MAX_ROWS = 1500;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const lum = (h) => (/^#[0-9a-f]{6}$/i.test(h) ? (0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16)) / 255 : 1);
  const toHex = (c) => {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('').toLowerCase();
    return '#1e1a22';
  };
  /* first index with a[i] >= v in a sorted array */
  const lowerBound = (a, v) => {
    let lo = 0, hi = a.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < v) lo = mid + 1; else hi = mid; }
    return lo;
  };
  function niceTicks(a, b, target) {
    const raw = (b - a) / Math.max(1, target);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return { step, out, dec: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
  }
  /* Ticks of the d axis on top of the plot. d = lambda / (2 sin theta) is not linear in 2-theta, so the ticks are
     round d values: first the multiples of 100, then of 50, 20, 10 and so on. A value gets a tick where it has
     room, and only where its step is not much finer than that room. Thus no odd value fills a small space. */
  function dTicks(view, lambda, sx, xl, xr, gap) {
    const rad = Math.PI / 180;
    const dOf = (t) => lambda / (2 * Math.sin(t / 2 * rad));
    const xOf = (d) => sx(2 * Math.asin(lambda / (2 * d)) / rad);
    const dLo = dOf(Math.min(179.9, view[1])), dHi = dOf(Math.max(0.3, view[0]));
    const placed = [];
    for (const step of [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001]) {
      const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
      const k0 = Math.ceil(dLo / step - 1e-9);
      // large d values lie closer together on the plot, so the first 2000 values of a step hold every one that fits
      for (let k = Math.max(1, k0); k < k0 + 2000 && k * step <= dHi + 1e-9; k++) {
        const d = k * step;
        if (lambda / (2 * d) >= 1) continue;
        const x = xOf(d);
        // the label must not touch the axis title at the left end
        if (x < xl + 8 || x > xr + 0.5) continue;
        if (x - xOf(d + step) < gap / 2) break;          // from here on, the values of this step lie too close together
        if (placed.some((p) => Math.abs(p.x - x) < gap)) continue;
        placed.push({ x, text: d.toFixed(dec) });
      }
    }
    return placed;
  }
  let meter = null;
  const textWidth = (s, px) => {
    if (!meter) meter = document.createElement('canvas').getContext('2d');
    if (!meter) return s.length * px * 0.55;
    meter.font = px + 'px ' + FONT_UI;
    return meter.measureText(s).width;
  };
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  function create(host) {
    const px = {
      win: null, root: null, float: null, observer: null,
      lambda: 1.54059, source: 'Cu', ka2: false, lambda2: 1.54443, ratio: 0.5,
      tmin: 3, tmax: 70, rangeSet: false, fwhm: 0.1, eta: 0.5, step: 0.01, bDefault: 1,
      stack: false, sqrt: false, marks: true, minRel: 0.1, order: 'tth',
      data: [], nextSlot: 0, nextId: 1, tableDoc: null, view: null, mark: null, rows: [], geo: null, notice: '', timer: 0, dragFrom: null
    };
    const q = (sel) => (px.root ? px.root.querySelector(sel) : null);
    const isOpen = () => !!px.root && (px.float ? true : !!px.win && !px.win.closed);
    const dark = () => lum(toHex(cssVar('--bg'))) < 0.4;
    const colorOf = (it) => it.color || (it.slot < 0 ? toHex(cssVar('--ink')) : SERIES[dark() ? 'dark' : 'light'][it.slot % 8]);
    const hasLattice = (d) => !(d.struct.meta && d.struct.meta.molecular);
    /* the PXRD record of an open structure: shown or not, colour, and the latest pattern and profile */
    const simOf = (d) => d.px || (d.px = { id: 's' + px.nextId++, on: false, slot: px.nextSlot++, color: null, pat: null, prof: null, patSig: '', profSig: '' });
    const sims = () => host.docs().filter(hasLattice).map((d) => ({ d, s: simOf(d) }));
    const shownSims = () => sims().filter((x) => x.s.on);

    /* ---------- numbers ---------- */
    function compute() {
      for (const { d, s } of shownSims()) {
        const patSig = [px.lambda, px.tmin, px.tmax, px.bDefault].join('|');
        if (s.patSig !== patSig || s.struct !== d.struct) {
          s.pat = C.powderPattern(d.struct, { lambda: px.lambda, tthMin: px.tmin, tthMax: px.tmax, bDefault: px.bDefault });
          s.pat.tths = Float64Array.from(s.pat.reflections, (r) => r.tth);
          s.patSig = patSig;
          s.struct = d.struct;
          s.profSig = '';
        }
        const profSig = [patSig, px.fwhm, px.eta, px.step, px.ka2 ? px.lambda2 + ':' + px.ratio : ''].join('|');
        if (s.profSig !== profSig) {
          const p = C.powderProfile(s.pat.reflections, {
            tthMin: px.tmin, tthMax: s.pat.tthMax, step: px.step, fwhm: px.fwhm, eta: px.eta, lambda: px.lambda,
            waves: px.ka2 ? [{ lambda: px.lambda2, weight: px.ratio }] : []
          });
          const X = new Float64Array(p.y.length);
          for (let i = 0; i < X.length; i++) X[i] = p.x0 + i * p.step;
          s.prof = { X, Y: p.y, x0: p.x0, step: p.step };
          s.profSig = profSig;
        }
      }
      for (const it of px.data) {
        // measured data: shifted in 2-theta, then scaled so that its highest point inside the range is 100
        const sig = [it.shift, px.tmin, px.tmax].join('|');
        if (it.sig === sig) continue;
        const X = new Float64Array(it.x.length), Y = new Float64Array(it.x.length);
        let top = 0, any = 0;
        for (let i = 0; i < X.length; i++) {
          X[i] = it.x[i] + it.shift;
          if (X[i] >= px.tmin && X[i] <= px.tmax) { any++; if (it.y[i] > top) top = it.y[i]; }
        }
        if (!any || !(top > 0)) { top = 0; for (let i = 0; i < X.length; i++) if (it.y[i] > top) top = it.y[i]; }
        const k = top > 0 ? 100 / top : 1;
        for (let i = 0; i < X.length; i++) Y[i] = it.y[i] * k;
        it.X = X; it.Y = Y; it.inRange = any; it.sig = sig;
      }
    }
    /* the patterns that are drawn, measured data first */
    function seriesList() {
      const out = [];
      for (const it of px.data) if (it.on && it.X) out.push({ kind: 'data', name: it.name, color: colorOf(it), X: it.X, Y: it.Y, ref: it });
      for (const { d, s } of shownSims()) if (s.prof) out.push({ kind: 'sim', name: d.name, color: colorOf(s), X: s.prof.X, Y: s.prof.Y, ref: s, pat: s.pat });
      return out;
    }

    /* ---------- the window ---------- */
    function shell() {
      const A = C.ANODES;
      return '<div class="px" id="pxTop">' +
        '<header class="px-head"><div><div class="eyebrow">' + esc(host.name) + ' ' + esc(host.version) + '  ·  PXRD</div><h1>Powder X-ray diffraction</h1></div>' +
        '<div class="tools"><label class="filebtn">Add PXRD data<input type="file" id="pxFile" multiple></label>' +
        (px.float ? '<button type="button" id="pxClose">Close</button>' : '') + '</div></header>' +
        '<div class="px-main"><aside class="px-side">' +
        '<section class="card"><h2>Reference structures</h2><div class="px-list" id="pxSims"></div>' +
        '<div class="small">This list shows each structure that is open in ' + esc(host.name) + '. Select a structure to show its simulated pattern.</div></section>' +
        '<section class="card"><h2>Measured data</h2><div class="px-list" id="pxData"></div>' +
        '<div class="small">Add a text file with two columns: 2θ in degrees, then intensity (.xy, .xye, .csv, .txt). You can also drop files on this window. The data stay in your browser.</div></section>' +
        '<section class="card"><h2>Radiation</h2><div class="px-form">' +
        '<label for="pxSource">Source</label><select id="pxSource" data-k="source">' + A.map((a) => '<option value="' + a.key + '">' + a.key + ' Kα₁, ' + a.l1.toFixed(5) + ' Å</option>').join('') + '<option value="other">Other wavelength</option></select>' +
        '<label for="pxLambda">λ₁</label><span class="unit"><input type="number" class="wl" id="pxLambda" data-k="lambda" step="0.00001" min="0.1" max="5"> Å</span>' +
        '<label class="chk wide"><input type="checkbox" id="pxKa2" data-k="ka2">Add a second wavelength (Kα₂)</label>' +
        '<label for="pxLambda2" class="k2">λ₂</label><span class="unit k2"><input type="number" class="wl" id="pxLambda2" data-k="lambda2" step="0.00001" min="0.1" max="5"> Å</span>' +
        '<label for="pxRatio" class="k2">I₂ / I₁</label><span class="unit k2"><input type="number" id="pxRatio" data-k="ratio" step="0.05" min="0" max="1"></span>' +
        '</div></section>' +
        '<section class="card"><h2>Pattern</h2><div class="px-form">' +
        '<label for="pxTmin">2θ range</label><span class="unit"><input type="number" class="rg" id="pxTmin" data-k="tmin" step="1" min="0" max="170" aria-label="Start of the 2-theta range in degrees"> to <input type="number" class="rg" id="pxTmax" data-k="tmax" step="1" min="2" max="175" aria-label="End of the 2-theta range in degrees"> °</span>' +
        '<label for="pxFwhm">Peak width</label><span class="unit"><input type="number" id="pxFwhm" data-k="fwhm" step="0.01" min="0.01" max="2"> ° FWHM</span>' +
        '<label for="pxEta">Lorentzian part</label><span class="unit"><input type="number" id="pxEta" data-k="eta" step="0.1" min="0" max="1"> 0 to 1</span>' +
        '<label for="pxStep">Step</label><span class="unit"><select id="pxStep" data-k="step"><option value="0.005">0.005</option><option value="0.01">0.01</option><option value="0.02">0.02</option><option value="0.05">0.05</option></select> °</span>' +
        '<label for="pxB" title="Isotropic displacement parameter B for each atom that has no value in the file">B if not in the file</label><span class="unit"><input type="number" id="pxB" data-k="bDefault" step="0.1" min="0" max="20"> Å²</span>' +
        '</div></section>' +
        '</aside><div class="px-work">' +
        '<section class="card px-plotcard"><div class="row">' +
        '<div class="seg" role="group" aria-label="How the patterns are arranged"><button type="button" data-a="overlay">Overlay</button><button type="button" data-a="stack">Stacked</button></div>' +
        '<div class="seg" role="group" aria-label="Intensity scale"><button type="button" data-a="lin">Linear</button><button type="button" data-a="sqrt">Square root</button></div>' +
        '<label class="chk"><input type="checkbox" id="pxMarks" data-k="marks">Reflection marks</label>' +
        '<span style="flex:1"></span>' +
        '<button type="button" data-a="reset">Reset zoom</button><button type="button" data-a="png">Save PNG</button><button type="button" data-a="svg">Save SVG</button>' +
        '<button type="button" data-a="csv" title="The shown patterns as a table: one 2θ column, then one intensity column for each pattern, for the full 2θ range. Measured data are put on the 2θ grid of the Pattern settings by linear interpolation.">Save CSV</button></div>' +
        '<div class="px-plot" id="pxPlot"></div>' +
        '<div class="small" id="pxNote" aria-live="polite"></div></section>' +
        '<section class="card px-tablecard"><div class="row">' +
        '<h2 id="pxTblTitle">Reflections of</h2><select id="pxTableDoc" data-k="tableDoc" aria-labelledby="pxTblTitle"></select>' +
        '<label class="small" for="pxMinRel" title="Reflections weaker than this are not listed and get no mark. They stay in the pattern. Set 0 to list all.">Weakest <i>I</i> listed</label><input type="number" id="pxMinRel" data-k="minRel" step="0.1" min="0" max="100">' +
        '<label class="small" for="pxOrder">Order</label><select id="pxOrder" data-k="order"><option value="tth">2θ</option><option value="rel">Intensity</option></select>' +
        '<span style="flex:1"></span>' +
        '<button type="button" class="mini" data-a="copy">Copy table</button><button type="button" class="mini" data-a="savetbl">Save table</button><button type="button" class="mini" data-a="savexy">Save pattern (.xy)</button></div>' +
        '<div class="tbl-wrap" id="pxTblWrap"><table id="pxTbl"></table></div>' +
        '<div class="small" id="pxTblNote"></div></section>' +
        '</div></div></div>';
    }

    function mount(root) {
      px.root = root;
      root.innerHTML = shell();
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('input', onInput);
      const top = q('#pxTop');
      top.addEventListener('dragover', (e) => { e.preventDefault(); top.classList.add('drag'); });
      top.addEventListener('dragleave', (e) => { if (e.target === top) top.classList.remove('drag'); });
      top.addEventListener('drop', (e) => { e.preventDefault(); top.classList.remove('drag'); readFiles(e.dataTransfer.files); });
      const plot = q('#pxPlot');
      plot.addEventListener('pointerdown', onDown);
      plot.addEventListener('pointermove', onMove);
      plot.addEventListener('pointerup', onUp);
      plot.addEventListener('pointercancel', () => { px.dragFrom = null; hideHover(); });
      plot.addEventListener('pointerleave', () => { if (px.dragFrom === null) hideHover(); });
      plot.addEventListener('dblclick', () => { px.view = null; draw(); });
      plot.addEventListener('wheel', onWheel, { passive: false });
      const w = px.win || window;
      if (w.ResizeObserver) { px.observer = new w.ResizeObserver(() => later(draw, 30)); px.observer.observe(plot); }
      else w.addEventListener('resize', () => later(draw, 30));
      // on first use the structure that is shown in the page becomes the reference
      const all = sims();
      const cur = host.current();
      if (all.length && !all.some((x) => x.s.on)) (all.find((x) => x.d === cur) || all[0]).s.on = true;
      fillForm();
      drawLists();
      refresh();
    }
    function unmount() {
      if (px.observer) { try { px.observer.disconnect(); } catch (err) { /* window already gone */ } }
      px.observer = null; px.root = null; px.win = null; px.geo = null;
      if (px.float) { px.float.remove(); px.float = null; }
    }

    /* the PXRD window takes the colours of the page: its theme and its Background choice */
    function copyTheme(doc) {
      for (const name of ['data-theme', 'data-bg']) {
        const v = document.documentElement.getAttribute(name);
        if (v) doc.documentElement.setAttribute(name, v); else doc.documentElement.removeAttribute(name);
      }
    }
    function open() {
      if (px.win && !px.win.closed && px.root) { px.win.focus(); return; }
      if (px.float) return;
      unmount();
      let w = null;
      try { w = window.open('', 'crystaPxrd', 'popup=yes,width=1240,height=820'); } catch (err) { w = null; }
      if (w) {
        try {
          const doc = w.document;
          const css = document.getElementById('appCss');
          const font = document.getElementById('fontCss');
          doc.open();
          doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>PXRD: ' + esc(host.name) + '</title>' + (font ? '<link rel="stylesheet" href="' + esc(font.href) + '">' : '') +
            '<style>' + (css ? css.textContent : '') + '</style></head><body class="pxbody"><div id="pxMount" style="height:100%"></div></body></html>');
          doc.close();
          copyTheme(doc);
          px.win = w;
          w.addEventListener('pagehide', () => { if (px.win === w) unmount(); });
          mount(doc.getElementById('pxMount'));
          w.focus();
          return;
        } catch (err) {
          // the new window cannot be written to (a sandboxed page): close it and use the floating window
          unmount();
          try { w.close(); } catch (err2) { /* nothing to close */ }
        }
      }
      // the browser blocked the new window: show the same content as a floating window in this page
      const box = document.createElement('div');
      box.className = 'pxfloat';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Powder X-ray diffraction');
      document.body.appendChild(box);
      px.float = box;
      px.notice = 'Your browser did not open a new window. This page shows the PXRD window instead.';
      mount(box);
      const head = q('.px-head');
      head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, input, label, select') || window.innerWidth <= 760) return;
        const r = box.getBoundingClientRect();
        const dx = e.clientX - r.left, dy = e.clientY - r.top;
        box.style.transform = 'none';
        const move = (ev) => {
          box.style.left = clamp(ev.clientX - dx, 40 - r.width, window.innerWidth - 40) + 'px';
          box.style.top = clamp(ev.clientY - dy, 0, window.innerHeight - 40) + 'px';
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
        move(e);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
      });
    }
    window.addEventListener('pagehide', () => { if (px.win && !px.win.closed) px.win.close(); });

    function later(fn, ms) {
      clearTimeout(px.timer);
      px.timer = setTimeout(() => { if (isOpen()) fn(); }, ms || 0);
    }

    /* ---------- lists and form ---------- */
    function fillForm() {
      if (!px.root) return;
      const set = (id, v) => { const e = q(id); if (e && String(e.value) !== String(v)) e.value = v; };
      set('#pxSource', px.source);
      set('#pxLambda', px.lambda);
      set('#pxLambda2', px.lambda2);
      set('#pxRatio', px.ratio);
      set('#pxTmin', px.tmin);
      set('#pxTmax', px.tmax);
      set('#pxFwhm', px.fwhm);
      set('#pxEta', px.eta);
      set('#pxStep', px.step);
      set('#pxB', px.bDefault);
      set('#pxMinRel', px.minRel);
      set('#pxOrder', px.order);
      q('#pxKa2').checked = px.ka2;
      q('#pxMarks').checked = px.marks;
      px.root.querySelectorAll('.k2').forEach((e) => { e.hidden = !px.ka2; });
      const press = (a, on) => { const b = q('button[data-a="' + a + '"]'); if (b) b.setAttribute('aria-pressed', String(on)); };
      press('overlay', !px.stack); press('stack', px.stack); press('lin', !px.sqrt); press('sqrt', px.sqrt);
    }
    function drawLists() {
      if (!px.root) return;
      const all = sims();
      q('#pxSims').innerHTML = all.length ? all.map(({ d, s }) =>
        '<div class="px-item"><input type="checkbox" id="on_' + s.id + '" data-sim="' + s.id + '" data-f="on"' + (s.on ? ' checked' : '') + '>' +
        '<input type="color" data-sim="' + s.id + '" data-f="color" value="' + colorOf(s) + '" aria-label="Line colour of ' + esc(d.name) + '">' +
        '<label class="nm" for="on_' + s.id + '" title="' + esc(d.name) + '">' + esc(d.name) + '</label><span></span>' +
        '<div class="more" data-info="' + s.id + '"></div></div>').join('')
        : '<div class="small">No structure with a lattice is open. Open a structure file in the ' + esc(host.name) + ' page.</div>';
      q('#pxData').innerHTML = px.data.map((it) =>
        '<div class="px-item"><input type="checkbox" id="on_' + it.id + '" data-set="' + it.id + '" data-f="on"' + (it.on ? ' checked' : '') + '>' +
        '<input type="color" data-set="' + it.id + '" data-f="color" value="' + colorOf(it) + '" aria-label="Line colour of ' + esc(it.name) + '">' +
        '<label class="nm" for="on_' + it.id + '" title="' + esc(it.name) + '">' + esc(it.name) + '</label>' +
        '<button type="button" class="xbtn" data-a="remove" data-set="' + it.id + '" aria-label="Remove ' + esc(it.name) + '" title="Remove this data set">×</button>' +
        '<div class="more"><label for="sh_' + it.id + '" title="Added to every 2θ value of this data set. Use it to correct a zero-point error.">2θ shift</label>' +
        '<input type="number" id="sh_' + it.id + '" data-set="' + it.id + '" data-f="shift" step="0.01" min="-5" max="5" value="' + it.shift + '"> °' +
        '<span>' + it.x.length + ' points</span></div></div>').join('');
      // the structure whose reflections are listed
      const on = all.filter((x) => x.s.on);
      if (!on.some((x) => x.d === px.tableDoc)) px.tableDoc = on.length ? on[0].d : null;
      q('#pxTableDoc').innerHTML = on.map((x) => '<option value="' + x.s.id + '"' + (x.d === px.tableDoc ? ' selected' : '') + '>' + esc(short(x.d.name, 48)) + '</option>').join('');
      q('#pxTableDoc').hidden = !on.length;
      drawInfo();
    }

    /* under each shown structure: how many reflections its pattern has in the range */
    function drawInfo() {
      for (const { s } of sims()) {
        const e = q('[data-info="' + s.id + '"]');
        if (!e) continue;
        const n = s.on && s.pat ? s.pat.reflections.filter((r) => r.tth >= px.tmin && r.tth <= s.pat.tthMax).length : 0;
        e.textContent = s.on && s.pat ? n + ' reflections, ' + s.pat.nAtoms + ' atoms per cell' : '';
      }
    }
    function refresh() {
      if (!isOpen()) return;
      let failed = '';
      try { compute(); } catch (err) { failed = 'The pattern could not be calculated. ' + err.message; }
      drawInfo();
      draw();
      drawTable();
      drawNote(failed);
    }

    function drawNote(failed) {
      const notes = [];
      if (failed) notes.push(failed);
      if (px.notice) notes.push(px.notice);
      const anode = C.anodeOf(px.lambda);
      const shown = shownSims().filter((x) => x.s.pat);
      if (shown.length && !anode) notes.push('The corrections f′ and f″ are tabulated for the Kα lines of Cu, Mo, Co, Fe, Cr and Ag only. At this wavelength the simulation uses f′ = f″ = 0.');
      for (const { d, s } of shown) {
        if (s.pat.cut) notes.push(short(d.name, 40) + ': the simulation stops at 2θ = ' + s.pat.tthMax.toFixed(0) + '° because this structure has too many reflections for a larger range.');
        if (s.pat.noU) notes.push(short(d.name, 40) + ': ' + s.pat.noU + (s.pat.noU === 1 ? ' site has' : ' sites have') + ' no displacement parameter in the file. The simulation uses B = ' + px.bDefault + ' Å² for ' + (s.pat.noU === 1 ? 'it.' : 'them.'));
        if (s.pat.missing.length) notes.push(short(d.name, 40) + ': ' + host.name + ' has no scattering factor for ' + s.pat.missing.join(', ') + '.');
      }
      for (const it of px.data) {
        if (!it.on) continue;
        if (!it.inRange) notes.push(short(it.name, 40) + ' has no point inside the 2θ range.');
        if (it.anode && anode && it.anode !== anode.key) notes.push('The header of ' + short(it.name, 40) + ' names a ' + it.anode + ' anode, but the simulation uses a ' + anode.key + ' wavelength.');
      }
      const e = q('#pxNote');
      e.textContent = notes.length ? notes.join(' ') : 'Drag across the plot to zoom. Turn the mouse wheel to zoom at the pointer. Double-click to show the full range.';
      e.classList.toggle('alert', !!failed);
    }

    /* ---------- plot ---------- */
    function pathOf(X, Y, v0, v1, sx, sy, plotW) {
      let i0 = Math.max(0, lowerBound(X, v0) - 1), i1 = Math.min(X.length - 1, lowerBound(X, v1) + 1);
      if (i1 <= i0) return '';
      const parts = [];
      const n = i1 - i0 + 1;
      if (n <= 3 * plotW) {
        for (let i = i0; i <= i1; i++) parts.push((i === i0 ? 'M' : 'L') + sx(X[i]).toFixed(1) + ' ' + sy(Y[i]).toFixed(1));
        return parts.join('');
      }
      // more points than pixels: keep the lowest and the highest point of each pixel column, in their order
      let col = null, lo = 0, hi = 0, iLo = 0, iHi = 0;
      const flush = () => {
        if (col === null) return;
        const a = iLo <= iHi ? [lo, hi] : [hi, lo];
        parts.push((parts.length ? 'L' : 'M') + col + ' ' + sy(a[0]).toFixed(1));
        if (a[1] !== a[0]) parts.push('L' + col + ' ' + sy(a[1]).toFixed(1));
      };
      for (let i = i0; i <= i1; i++) {
        const c = Math.round(sx(X[i]));
        if (c !== col) { flush(); col = c; lo = hi = Y[i]; iLo = iHi = i; continue; }
        if (Y[i] < lo) { lo = Y[i]; iLo = i; }
        if (Y[i] > hi) { hi = Y[i]; iHi = i; }
      }
      flush();
      return parts.join('');
    }

    function draw() {
      const box = q('#pxPlot');
      if (!box) return;
      const W = Math.floor(box.clientWidth), H = Math.floor(box.clientHeight);
      if (W < 120 || H < 100) return;
      const series = seriesList();
      const ink = toHex(cssVar('--ink')), muted = toHex(cssVar('--muted')), line = toHex(cssVar('--line')), panel = toHex(cssVar('--panel')), accent = toHex(cssVar('--accent'));
      px.root.querySelectorAll('[data-a="reset"], [data-a="png"], [data-a="svg"], [data-a="csv"]').forEach((b) => { b.disabled = !series.length; });
      if (!series.length) {
        box.innerHTML = '<div class="stage-msg"><strong>No pattern to show</strong><p>Select a reference structure in the list, or add PXRD data.</p></div>';
        px.geo = null;
        return;
      }
      const full = [px.tmin, px.tmax];
      const view = px.view ? [clamp(px.view[0], full[0], full[1]), clamp(px.view[1], full[0], full[1])] : full;
      if (!(view[1] - view[0] > 1e-6)) { view[0] = full[0]; view[1] = full[1]; }
      // legend: one entry for each pattern, in the order of the bands
      const legend = [];
      let lx = 0, ly = 0;
      for (const s of series) {
        const text = short(s.name, 44) + (s.kind === 'sim' ? ', simulated' : ', measured');
        const w = 24 + textWidth(text, 12) + 18;
        if (lx > 0 && lx + w > W - 66) { lx = 0; ly++; }
        legend.push({ s, text, x: lx, row: ly });
        lx += w;
      }
      const markSims = px.marks ? series.filter((s) => s.kind === 'sim') : [];
      const m = { l: 54, r: 14, t: 10 + (ly + 1) * 18 + 4 + 22, b: 40 };   // 22: the d axis above the plot
      const marksH = markSims.length ? markSims.length * 11 + 5 : 0;
      const xl = m.l, xr = W - m.r, yt = m.t, ya = H - m.b, yb = ya - marksH;
      const plotW = xr - xl;
      const sx = (v) => xl + (v - view[0]) / (view[1] - view[0]) * plotW;
      const T = px.sqrt ? (v) => Math.sqrt(Math.max(0, v)) : (v) => v;
      const topOf = (s) => {
        let top = 0;
        const i0 = lowerBound(s.X, view[0]), i1 = Math.min(s.X.length, lowerBound(s.X, view[1]) + 1);
        for (let i = i0; i < i1; i++) if (s.Y[i] > top) top = s.Y[i];
        return top;
      };
      const out = [];
      out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + FONT_UI + '" font-size="12" role="img" aria-label="Powder diffraction patterns: intensity against 2-theta. The reflection table lists the same data.">');
      out.push('<rect width="' + W + '" height="' + H + '" fill="' + panel + '"/>');
      out.push('<defs><clipPath id="pxClip"><rect x="' + xl + '" y="' + (yt - 2) + '" width="' + plotW + '" height="' + (ya - yt + 2) + '"/></clipPath></defs>');
      for (const L of legend) {
        const y = 14 + L.row * 18;
        out.push('<line x1="' + (xl + L.x) + '" x2="' + (xl + L.x + 16) + '" y1="' + (y - 4) + '" y2="' + (y - 4) + '" stroke="' + L.s.color + '" stroke-width="2" stroke-linecap="round"/>' +
          '<text x="' + (xl + L.x + 22) + '" y="' + y + '" fill="' + ink + '">' + esc(L.text) + '</text>');
      }
      const paths = [];
      let yTitle;
      if (!px.stack) {
        let top = 0;
        for (const s of series) top = Math.max(top, topOf(s));
        if (!(top > 0)) top = 100;
        top *= 1.06;
        const sy = (v) => yb - T(v) / T(top) * (yb - yt);
        const ticks = px.sqrt ? [0, 1, 5, 10, 25, 50, 75, 100].filter((v) => v <= top) : niceTicks(0, top, Math.max(2, (yb - yt) / 50)).out;
        for (const v of ticks) {
          const y = sy(v).toFixed(1);
          out.push('<line x1="' + xl + '" x2="' + xr + '" y1="' + y + '" y2="' + y + '" stroke="' + line + '" stroke-width="1"/>' +
            '<text x="' + (xl - 7) + '" y="' + (+y + 4) + '" text-anchor="end" fill="' + muted + '" font-family="' + FONT_DATA + '" font-size="11">' + (v >= 10 || v === 0 ? v.toFixed(0) : String(+v.toFixed(2))) + '</text>');
        }
        for (const s of series) paths.push({ s, d: pathOf(s.X, s.Y, view[0], view[1], sx, sy, plotW) });
        yTitle = 'Intensity (highest point = 100)';
      } else {
        const bh = (yb - yt) / series.length;
        series.forEach((s, i) => {
          const base = yt + (i + 1) * bh - 8, head = yt + i * bh + 18;
          const top = (topOf(s) || 100) * 1.04;
          const sy = (v) => base - T(v) / T(top) * (base - head);
          out.push('<line x1="' + xl + '" x2="' + xr + '" y1="' + base.toFixed(1) + '" y2="' + base.toFixed(1) + '" stroke="' + line + '" stroke-width="1"/>');
          out.push('<text x="' + (xr - 4) + '" y="' + (yt + i * bh + 14).toFixed(1) + '" text-anchor="end" fill="' + muted + '" font-size="11">' + esc(short(s.name, 40)) + '</text>');
          paths.push({ s, d: pathOf(s.X, s.Y, view[0], view[1], sx, sy, plotW) });
        });
        yTitle = 'Intensity (own scale each)';
      }
      out.push('<g clip-path="url(#pxClip)" fill="none" stroke-linejoin="round" stroke-linecap="round">');
      for (const p of paths) if (p.d) out.push('<path d="' + p.d + '" stroke="' + p.s.color + '" stroke-width="' + (p.s.kind === 'data' ? 1.25 : 1.5) + '"/>');
      // reflection marks: one row for each simulated pattern, in the colour of that pattern
      markSims.forEach((s, i) => {
        const y0 = yb + 5 + i * 11;
        const R = s.pat.reflections;
        const seg = [];
        for (let k = lowerBound(s.pat.tths, view[0]); k < R.length && R[k].tth <= view[1]; k++) {
          if (R[k].rel < px.minRel || R[k].tth > s.pat.tthMax) continue;
          const x = sx(R[k].tth).toFixed(1);
          seg.push('M' + x + ' ' + y0 + 'V' + (y0 + 8));
        }
        if (seg.length) out.push('<path d="' + seg.join('') + '" stroke="' + s.color + '" stroke-width="1.25"/>');
      });
      if (px.mark && px.mark.tth >= view[0] && px.mark.tth <= view[1]) {
        const x = sx(px.mark.tth).toFixed(1);
        out.push('<line x1="' + x + '" x2="' + x + '" y1="' + yt + '" y2="' + ya + '" stroke="' + accent + '" stroke-width="1"/>');
      }
      out.push('</g>');
      if (px.mark && px.mark.tth >= view[0] && px.mark.tth <= view[1]) {
        const x = sx(px.mark.tth);
        const right = x < xr - 90;
        out.push('<text x="' + (x + (right ? 5 : -5)).toFixed(1) + '" y="' + (yt + 11) + '" text-anchor="' + (right ? 'start' : 'end') + '" fill="' + ink + '" font-family="' + FONT_DATA + '" font-size="11.5" paint-order="stroke" stroke="' + panel + '" stroke-width="3">' + esc(px.mark.label) + '</text>');
      }
      // axes
      out.push('<line x1="' + xl + '" x2="' + xr + '" y1="' + ya + '" y2="' + ya + '" stroke="' + muted + '" stroke-width="1"/>');
      const xt = niceTicks(view[0], view[1], Math.max(2, plotW / 80));
      for (const v of xt.out) {
        const x = sx(v).toFixed(1);
        out.push('<line x1="' + x + '" x2="' + x + '" y1="' + ya + '" y2="' + (ya + 5) + '" stroke="' + muted + '" stroke-width="1"/>' +
          '<text x="' + x + '" y="' + (ya + 18) + '" text-anchor="middle" fill="' + muted + '" font-family="' + FONT_DATA + '" font-size="11">' + v.toFixed(xt.dec) + '</text>');
      }
      // second axis on top: the d spacing for the first wavelength
      out.push('<line x1="' + xl + '" x2="' + xr + '" y1="' + yt + '" y2="' + yt + '" stroke="' + muted + '" stroke-width="1"/>');
      for (const t of dTicks(view, px.lambda, sx, xl, xr, 38)) {
        const x = t.x.toFixed(1);
        out.push('<line x1="' + x + '" x2="' + x + '" y1="' + yt + '" y2="' + (yt - 5) + '" stroke="' + muted + '" stroke-width="1"/>' +
          '<text x="' + x + '" y="' + (yt - 9) + '" text-anchor="middle" fill="' + muted + '" font-family="' + FONT_DATA + '" font-size="11">' + t.text + '</text>');
      }
      out.push('<text x="' + (xl - 7) + '" y="' + (yt - 9) + '" text-anchor="end" fill="' + ink + '"><tspan font-style="italic">d</tspan> (Å)</text>');
      const waves = 'λ = ' + px.lambda + ' Å' + (px.ka2 ? ' and ' + px.lambda2 + ' Å' : '');
      out.push('<text x="' + ((xl + xr) / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="' + ink + '">2θ (degrees), ' + esc(waves) + '</text>');
      out.push('<text transform="translate(14 ' + ((yt + yb) / 2).toFixed(1) + ') rotate(-90)" text-anchor="middle" fill="' + ink + '">' + yTitle + '</text>');
      // pointer layer: left out of the saved picture
      out.push('<rect class="ui" id="pxBand" x="0" y="' + yt + '" width="0" height="' + (ya - yt) + '" fill="' + accent + '" fill-opacity="0.14" visibility="hidden"/>');
      out.push('<line class="ui" id="pxCross" x1="0" x2="0" y1="' + yt + '" y2="' + ya + '" stroke="' + muted + '" stroke-width="1" visibility="hidden"/>');
      out.push('</svg><div class="px-tip" id="pxTip" hidden></div>');
      box.innerHTML = out.join('');
      px.geo = { xl, xr, yt, ya, W, H, view, series };
    }

    const xOf = (e) => {
      const r = q('#pxPlot').getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    };
    const valueAt = (g, p) => g.view[0] + (clamp(p, g.xl, g.xr) - g.xl) / (g.xr - g.xl) * (g.view[1] - g.view[0]);
    /* the listed reflection of a pattern that is nearest to a 2-theta value, within reach */
    function nearestReflection(pat, v, reach) {
      let best = null;
      for (const r of pat.reflections) {
        if (r.rel < px.minRel || r.tth > pat.tthMax) continue;
        const dd = Math.abs(r.tth - v);
        if (dd > reach) { if (r.tth > v) break; continue; }
        if (!best || dd < Math.abs(best.tth - v) - 1e-9 || (Math.abs(dd - Math.abs(best.tth - v)) < 1e-9 && r.rel > best.rel)) best = r;
      }
      return best;
    }
    const hklText = (r) => '(' + r.h + ' ' + r.k + ' ' + r.l + ')';
    function hideHover() {
      const c = q('#pxCross'), t = q('#pxTip');
      if (c) c.setAttribute('visibility', 'hidden');
      if (t) t.hidden = true;
    }
    function onDown(e) {
      const g = px.geo;
      if (!g || e.button > 0) return;
      const p = xOf(e);
      if (p.px < g.xl || p.px > g.xr || p.py < g.yt - 4) return;
      px.dragFrom = p.px;
      try { q('#pxPlot').setPointerCapture(e.pointerId); } catch (err) { /* no capture for this pointer */ }
    }
    function onMove(e) {
      const g = px.geo;
      if (!g) return;
      const p = xOf(e);
      const band = q('#pxBand');
      if (px.dragFrom !== null) {
        const a = Math.min(px.dragFrom, clamp(p.px, g.xl, g.xr)), b = Math.max(px.dragFrom, clamp(p.px, g.xl, g.xr));
        band.setAttribute('x', a); band.setAttribute('width', b - a);
        band.setAttribute('visibility', b - a > 4 ? 'visible' : 'hidden');
      }
      if (p.px < g.xl - 2 || p.px > g.xr + 2 || p.py < 0 || p.py > g.H) { hideHover(); return; }
      const v = valueAt(g, p.px);
      const cross = q('#pxCross');
      const x = clamp(p.px, g.xl, g.xr);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      // readout: the 2-theta value, its d spacing, each pattern at that angle, and the nearest reflection of each simulation
      const tip = q('#pxTip');
      const doc = tip.ownerDocument;
      tip.textContent = '';
      const at = doc.createElement('div');
      at.className = 'at';
      const sn = Math.sin(v / 2 * Math.PI / 180);
      at.textContent = '2θ ' + v.toFixed(3) + '°' + (sn > 0 ? '   d ' + (px.lambda / (2 * sn)).toFixed(4) + ' Å' : '');
      tip.appendChild(at);
      const reach = Math.max(px.fwhm, 8 * (g.view[1] - g.view[0]) / (g.xr - g.xl));
      for (const s of g.series) {
        const i = clamp(lowerBound(s.X, v), 0, s.X.length - 1);
        const j = i > 0 && Math.abs(s.X[i - 1] - v) < Math.abs(s.X[i] - v) ? i - 1 : i;
        const inside = v >= s.X[0] - 0.05 && v <= s.X[s.X.length - 1] + 0.05;
        const row = doc.createElement('div');
        row.className = 'ln';
        const key = doc.createElement('i');
        key.style.background = s.color;
        const name = doc.createElement('span');
        name.textContent = short(s.name, 30);
        const val = doc.createElement('b');
        val.textContent = inside ? s.Y[j].toFixed(1) : '–';
        row.appendChild(key); row.appendChild(name); row.appendChild(val);
        tip.appendChild(row);
        if (s.kind === 'sim') {
          const r = nearestReflection(s.pat, v, reach);
          if (r) {
            const hk = doc.createElement('div');
            hk.className = 'hk';
            hk.textContent = hklText(r) + '  2θ ' + r.tth.toFixed(3) + '°  I ' + r.rel.toFixed(1);
            tip.appendChild(hk);
          }
        }
      }
      tip.hidden = false;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = (x + 14 + tw > g.W ? Math.max(0, x - 14 - tw) : x + 14) + 'px';
      tip.style.top = clamp(p.py - th - 10, 2, Math.max(2, g.H - th - 2)) + 'px';
    }
    function onUp(e) {
      const g = px.geo;
      const from = px.dragFrom;
      px.dragFrom = null;
      if (!g || from === null) return;
      const p = xOf(e);
      const a = Math.min(from, clamp(p.px, g.xl, g.xr)), b = Math.max(from, clamp(p.px, g.xl, g.xr));
      if (b - a > 6) {
        const v0 = valueAt(g, a), v1 = valueAt(g, b);
        if (v1 - v0 >= 0.05) { px.view = [v0, v1]; draw(); }
        else q('#pxBand').setAttribute('visibility', 'hidden');
        return;
      }
      q('#pxBand').setAttribute('visibility', 'hidden');
      // a click selects the nearest reflection of the structure in the table
      const s = px.tableDoc && px.tableDoc.px;
      if (!s || !s.on || !s.pat) return;
      const v = valueAt(g, p.px);
      const r = nearestReflection(s.pat, v, Math.max(px.fwhm, 8 * (g.view[1] - g.view[0]) / (g.xr - g.xl)));
      if (r) selectReflection(r, true);
    }
    function onWheel(e) {
      const g = px.geo;
      if (!g) return;
      const p = xOf(e);
      if (p.px < g.xl || p.px > g.xr) return;
      e.preventDefault();
      const v = valueAt(g, p.px);
      const k = e.deltaY > 0 ? 1.25 : 0.8;
      let v0 = v - (v - g.view[0]) * k, v1 = v + (g.view[1] - v) * k;
      v0 = Math.max(px.tmin, v0); v1 = Math.min(px.tmax, v1);
      if (v1 - v0 < 0.2) return;
      px.view = v0 <= px.tmin + 1e-9 && v1 >= px.tmax - 1e-9 ? null : [v0, v1];
      draw();
    }

    /* ---------- reflection table ---------- */
    function tableRows() {
      const s = px.tableDoc && px.tableDoc.px;
      if (!s || !s.on || !s.pat) return null;
      const all = s.pat.reflections.filter((r) => r.tth >= px.tmin && r.tth <= s.pat.tthMax);
      const rows = all.filter((r) => r.rel >= px.minRel);
      if (px.order === 'rel') rows.sort((p, r) => r.rel - p.rel || p.tth - r.tth);
      return { rows, total: all.length };
    }
    function drawTable() {
      const tbl = q('#pxTbl');
      if (!tbl) return;
      const t = tableRows();
      px.rows = t ? t.rows : [];
      px.root.querySelectorAll('[data-a="copy"], [data-a="savetbl"], [data-a="savexy"]').forEach((b) => { b.disabled = !t; });
      if (!t) {
        tbl.innerHTML = '';
        q('#pxTblNote').textContent = 'Select a reference structure to list its reflections.';
        return;
      }
      const shown = t.rows.slice(0, MAX_ROWS);
      tbl.innerHTML = '<colgroup><col style="width:6%"><col style="width:6%"><col style="width:6%"><col><col><col><col><col><col><col style="width:7%"></colgroup><thead><tr><th><i>h</i></th><th><i>k</i></th><th><i>l</i></th><th><i>d</i> (Å)</th><th><i>F</i> (real)</th><th><i>F</i> (imag.)</th><th>|<i>F</i>|</th><th>2θ (°)</th><th><i>I</i></th><th><i>M</i></th></tr></thead><tbody>' +
        shown.map((r, i) => '<tr data-row="' + i + '"' + (px.mark && px.mark.r === r ? ' class="on"' : '') + '><td>' + r.h + '</td><td>' + r.k + '</td><td>' + r.l + '</td><td>' + r.d.toFixed(4) + '</td><td>' + r.fre.toFixed(3) + '</td><td>' + r.fim.toFixed(3) + '</td><td>' + r.f.toFixed(3) + '</td><td>' + r.tth.toFixed(3) + '</td><td>' + r.rel.toFixed(2) + '</td><td>' + r.m + '</td></tr>').join('') + '</tbody>';
      const bits = [t.rows.length === t.total ? t.total + ' reflections.' : 'The table lists ' + t.rows.length + ' of ' + t.total + ' reflections: those with I of ' + px.minRel + ' or more. Set 0 to list all.'];
      if (t.rows.length > MAX_ROWS) bits.push('The table shows the first ' + MAX_ROWS + '. The copied and the saved table hold all of them.');
      bits.push('I is on a scale where the strongest reflection in the range is 100. M is the multiplicity. |F| is for one reflection of the set. Press a row to mark that reflection in the plot.');
      q('#pxTblNote').textContent = bits.join(' ');
    }
    function selectReflection(r, scroll) {
      px.mark = { r, tth: r.tth, label: hklText(r) };
      const g = px.geo;
      if (g && (r.tth < g.view[0] || r.tth > g.view[1])) {
        const half = (g.view[1] - g.view[0]) / 2;
        let v0 = r.tth - half, v1 = r.tth + half;
        if (v0 < px.tmin) { v1 += px.tmin - v0; v0 = px.tmin; }
        if (v1 > px.tmax) { v0 -= v1 - px.tmax; v1 = px.tmax; }
        px.view = [Math.max(px.tmin, v0), v1];
      }
      draw();
      const i = px.rows.indexOf(r);
      px.root.querySelectorAll('#pxTbl tr.on').forEach((e) => e.classList.remove('on'));
      const row = i >= 0 ? q('#pxTbl tr[data-row="' + i + '"]') : null;
      if (row) { row.classList.add('on'); if (scroll && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' }); }
    }
    function tableText() {
      const t = tableRows();
      if (!t) return '';
      return ['h\tk\tl\td (A)\tF(real)\tF(imag)\t|F|\t2theta (deg)\tI\tM'].concat(t.rows.map((r) =>
        [r.h, r.k, r.l, r.d.toFixed(5), r.fre.toFixed(4), r.fim.toFixed(4), r.f.toFixed(4), r.tth.toFixed(4), r.rel.toFixed(4), r.m].join('\t'))).join('\n') + '\n';
    }

    /* ---------- save and copy ---------- */
    const stem = (name) => String(name).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._()+-]+/g, '_') || 'pattern';
    function save(parts, type, filename) {
      const doc = px.root.ownerDocument;
      const w = doc.defaultView || window;
      const blob = parts instanceof w.Blob || parts instanceof Blob ? parts : new Blob(parts, { type });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function svgText() {
      const svg = q('#pxPlot svg');
      if (!svg) return null;
      const copy = svg.cloneNode(true);
      copy.querySelectorAll('.ui').forEach((e) => e.remove());
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(copy);
    }
    const pictureName = () => {
      const s = px.geo && px.geo.series[0];
      return (s ? stem(s.name) : 'pattern') + '_pxrd';
    };
    function savePng(btn) {
      const text = svgText();
      if (!text || !px.geo) return;
      const { W, H } = px.geo;
      const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
      const img = new Image();
      const done = () => URL.revokeObjectURL(url);
      img.onload = () => {
        const k = 3;
        const cv = document.createElement('canvas');
        cv.width = W * k; cv.height = H * k;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, W * k, H * k);
        done();
        try { cv.toBlob((b) => { if (b) save(b, 'image/png', pictureName() + '.png'); }, 'image/png'); } catch (err) { say(btn, 'Not possible'); }
      };
      img.onerror = () => { done(); say(btn, 'Not possible'); };
      img.src = url;
    }
    function say(btn, text) {
      const old = btn.dataset.label || btn.textContent;
      btn.dataset.label = old;
      btn.textContent = text;
      setTimeout(() => { btn.textContent = old; }, 1600);
    }
    function copyText(text, btn) {
      const doc = px.root.ownerDocument;
      const w = doc.defaultView || window;
      const fallback = () => {
        const ta = doc.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-999px;top:0';
        doc.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
        say(btn, ok ? 'Copied' : 'Use Save table');
      };
      if (w.navigator.clipboard && w.navigator.clipboard.writeText) w.navigator.clipboard.writeText(text).then(() => say(btn, 'Copied'), fallback);
      else fallback();
    }

    /* ---------- events ---------- */
    function onClick(e) {
      const row = e.target.closest('#pxTbl tbody tr');
      if (row) { const r = px.rows[+row.dataset.row]; if (r) selectReflection(r, false); return; }
      if (e.target.id === 'pxClose') { unmount(); return; }
      const b = e.target.closest('button[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'overlay' || a === 'stack') { px.stack = a === 'stack'; fillForm(); draw(); }
      else if (a === 'lin' || a === 'sqrt') { px.sqrt = a === 'sqrt'; fillForm(); draw(); }
      else if (a === 'reset') { px.view = null; draw(); }
      else if (a === 'svg') { const t = svgText(); if (t) save([t], 'image/svg+xml', pictureName() + '.svg'); }
      else if (a === 'png') savePng(b);
      else if (a === 'csv') {
        // every shown pattern as a column on one 2-theta column, as plotted: the highest point of each is 100
        const series = seriesList();
        if (!series.length) return;
        const n = Math.round((px.tmax - px.tmin) / px.step) + 1;
        const text = C.patternsCsv(px.tmin, px.step, n, series.map((s) => ({ name: s.name + (s.kind === 'sim' ? ' (simulated)' : ' (measured)'), X: s.X, Y: s.Y })));
        save([text], 'text/csv', pictureName() + '.csv');
      }
      else if (a === 'copy') copyText(tableText(), b);
      else if (a === 'savetbl') save([tableText()], 'text/plain', stem(px.tableDoc.name) + '_reflections.txt');
      else if (a === 'savexy') {
        const s = px.tableDoc.px;
        const text = C.toXY(s.prof.x0, s.prof.step, s.prof.Y, host.name + ' ' + host.version + ', simulated powder pattern of ' + px.tableDoc.name + ', wavelength ' + px.lambda + (px.ka2 ? ' and ' + px.lambda2 + ' (ratio ' + px.ratio + ')' : '') + ' A, FWHM ' + px.fwhm + ' deg');
        save([text], 'text/plain', stem(px.tableDoc.name) + '_simulated.xy');
      } else if (a === 'remove') {
        px.data = px.data.filter((it) => it.id !== b.dataset.set);
        drawLists();
        refresh();
      }
    }
    function onInput(e) {
      // a colour changes while the picker is open
      const t = e.target;
      if (t.dataset.f !== 'color') return;
      const it = t.dataset.sim ? sims().map((x) => x.s).find((s) => s.id === t.dataset.sim) : px.data.find((x) => x.id === t.dataset.set);
      if (it) { it.color = t.value; later(draw, 30); }
    }
    function onChange(e) {
      const t = e.target;
      px.notice = '';
      if (t.id === 'pxFile') { readFiles(t.files); t.value = ''; return; }
      if (t.dataset.f) {
        const it = t.dataset.sim ? sims().map((x) => x.s).find((s) => s.id === t.dataset.sim) : px.data.find((x) => x.id === t.dataset.set);
        if (!it) return;
        if (t.dataset.f === 'on') { it.on = t.checked; drawLists(); refresh(); }
        else if (t.dataset.f === 'shift') { const v = parseFloat(t.value); it.shift = isFinite(v) ? clamp(v, -5, 5) : 0; t.value = it.shift; refresh(); }
        return;
      }
      const k = t.dataset.k;
      if (!k) return;
      const num = (lo, hi, def) => { const v = parseFloat(t.value); return isFinite(v) ? clamp(v, lo, hi) : def; };
      if (k === 'source') {
        px.source = t.value;
        const a = C.ANODES.find((x) => x.key === t.value);
        if (a) { px.lambda = a.l1; px.lambda2 = a.l2; }
      } else if (k === 'lambda') {
        px.lambda = num(0.1, 5, px.lambda);
        const a = C.ANODES.find((x) => Math.abs(x.l1 - px.lambda) < 1e-6);
        px.source = a ? a.key : 'other';
        if (a) px.lambda2 = a.l2;
      } else if (k === 'ka2') px.ka2 = t.checked;
      else if (k === 'lambda2') px.lambda2 = num(0.1, 5, px.lambda2);
      else if (k === 'ratio') px.ratio = num(0, 1, px.ratio);
      else if (k === 'tmin') { px.tmin = num(0, 170, px.tmin); if (px.tmax < px.tmin + 2) px.tmax = Math.min(175, px.tmin + 2); px.rangeSet = true; px.view = null; }
      else if (k === 'tmax') { px.tmax = num(2, 175, px.tmax); if (px.tmin > px.tmax - 2) px.tmin = Math.max(0, px.tmax - 2); px.rangeSet = true; px.view = null; }
      else if (k === 'fwhm') px.fwhm = num(0.01, 2, px.fwhm);
      else if (k === 'eta') px.eta = num(0, 1, px.eta);
      else if (k === 'step') px.step = num(0.005, 0.05, px.step);
      else if (k === 'bDefault') px.bDefault = num(0, 20, px.bDefault);
      else if (k === 'marks') px.marks = t.checked;
      else if (k === 'minRel') px.minRel = num(0, 100, px.minRel);
      else if (k === 'order') px.order = t.value;
      else if (k === 'tableDoc') { const x = sims().find((y) => y.s.id === t.value); px.tableDoc = x ? x.d : null; px.mark = null; }
      fillForm();
      refresh();
    }

    /* ---------- measured data ---------- */
    function addData(list) {
      const errors = [];
      let added = 0;
      for (const src of list) {
        try {
          const r = C.readXY(src.text);
          const usedInk = px.data.some((it) => it.slot < 0);
          px.data.push({ id: 'd' + px.nextId++, name: src.name, x: r.x, y: r.y, anode: r.anode, on: true, shift: 0, color: null, slot: usedInk ? px.nextSlot++ : -1, sig: '' });
          added++;
        } catch (err) {
          errors.push('Could not read ' + src.name + '. ' + err.message);
        }
      }
      // the first data set gives the 2-theta range, unless the range was typed in
      if (added && !px.rangeSet) {
        let lo = Infinity, hi = -Infinity;
        for (const it of px.data) { lo = Math.min(lo, it.x[0]); hi = Math.max(hi, it.x[it.x.length - 1]); }
        if (hi - lo >= 2) { px.tmin = clamp(Math.floor(lo), 0, 170); px.tmax = clamp(Math.ceil(hi), px.tmin + 2, 175); px.view = null; }
      }
      px.notice = errors.join(' ');
      if (!isOpen()) open(); else { fillForm(); drawLists(); refresh(); }
      return added;
    }
    function readFiles(files) {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      const out = new Array(arr.length);
      let left = arr.length;
      const done = () => {
        if (--left) return;
        const got = out.filter(Boolean);
        const structures = got.filter((x) => STRUCTURE_FILE.test(x.name));
        const data = got.filter((x) => !STRUCTURE_FILE.test(x.name));
        if (structures.length) host.addFiles(structures);
        if (data.length) addData(data);
      };
      arr.forEach((file, i) => {
        const fr = new FileReader();
        fr.onload = () => { out[i] = { text: String(fr.result), name: file.name }; done(); };
        fr.onerror = () => { px.notice = 'Could not read ' + file.name + '.'; done(); };
        fr.readAsText(file);
      });
    }

    /* the list of open structures changed, or another structure is shown in the page */
    function sync() {
      if (!isOpen()) return;
      const all = sims();
      const cur = host.current();
      if (all.length && !all.some((x) => x.s.on)) { const x = all.find((y) => y.d === cur); if (x) x.s.on = true; }
      if (px.mark && !all.some((x) => x.s.pat && x.s.pat.reflections.includes(px.mark.r))) px.mark = null;
      drawLists();
      refresh();
    }
    function retheme() {
      if (!isOpen()) return;
      if (px.win) copyTheme(px.win.document);
      drawLists();
      draw();
    }

    return { open, sync, addData, retheme, isOpen, state: px, STRUCTURE_FILE };
  }

  window.CrystaPxrd = { create };
})();
