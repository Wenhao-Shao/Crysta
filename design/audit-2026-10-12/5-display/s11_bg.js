// The four backgrounds: auto light, auto dark, white, black. Colours of text, lines, glow and labels, and their contrast.
const L = require('./lib.js');
const K = require('./pick.js');
const fs = require('fs');
const hex = (h) => { h = h.trim(); if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map((c) => c + c).join(''); return [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)); };
const rl = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const cr = (a, b) => { const x = rl(hex(a)), y = rl(hex(b)); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const over = (fg, bg, a) => '#' + hex(fg).map((v, k) => Math.round(v * a + hex(bg)[k] * (1 - a)).toString(16).padStart(2, '0')).join('');
(async () => {
  const out = {};
  for (const [mode, scheme, bg] of [['auto-light', 'light', 'auto'], ['auto-dark', 'dark', 'auto'], ['white', 'dark', 'white'], ['black', 'light', 'black']]) {
    const { b, ctx, p, errs } = await L.open({ ctx: { colorScheme: scheme, reducedMotion: 'reduce' } });
    if (bg !== 'auto') { await p.selectOption('#selBg', bg); await p.waitForTimeout(300); }
    await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
    await p.selectOption('#selLabels', 'heavy'); await p.waitForTimeout(1500);
    await p.click('h2:text-is("Measure")');
    await K.installRecorder(p);
    const { list } = await K.screenAtoms(p);
    const fr = list.filter((a) => a.front && a.onStage && a.el === 'Br');
    let pair = null;
    for (const a of fr) for (const c of fr) if (!pair && a !== c && Math.hypot(a.xyz[0] - c.xyz[0], a.xyz[1] - c.xyz[1], a.xyz[2] - c.xyz[2]) < 6 && Math.hypot(a.sx - c.sx, a.sy - c.sy) > 60) pair = [a, c];
    if (pair) { await K.clickAtom(p, pair[0]); await K.clickAtom(p, pair[1]); }
    await p.click('#fwTitle');
    await p.click('[data-glow="12"] .glowbtn'); await p.waitForTimeout(1500);
    await p.mouse.move(5, 5); await p.waitForTimeout(500);
    const v = await p.evaluate(() => { const g = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); const o = {}; for (const n of ['--bg', '--panel', '--stage', '--ink', '--muted', '--line', '--accent', '--on-accent', '--warn', '--atom-pb', '--atom-c']) o[n] = g(n); o.theme = document.documentElement.getAttribute('data-theme'); o.dataBg = document.documentElement.getAttribute('data-bg'); o.bodyBg = getComputedStyle(document.body).backgroundColor; o.sel = document.getElementById('selBg').value; return o; });
    const sc = await p.evaluate(() => window.__rec);
    const labels = sc.filter((x) => x.fn === 'addLabel').map((x) => ({ text: x.text, fg: x.o.fontColor, bg: x.o.backgroundColor }));
    const cyl = {}; for (const x of sc) if (x.fn === 'addCylinder') { const k = x.o.radius + ' ' + x.o.color + (x.o.dashed ? ' dashed' : ''); cyl[k] = (cyl[k] || 0) + 1; }
    const viewerBg = await p.evaluate(() => { const c = document.querySelector('#gl canvas'); const v = window.crysta.viewer(); return v.getBackgroundColor ? JSON.stringify(v.getBackgroundColor()) : null; });
    // contrast of the main pairs
    const c = {
      'ink/panel': cr(v['--ink'], v['--panel']), 'muted/panel': cr(v['--muted'], v['--panel']), 'muted/bg': cr(v['--muted'], v['--bg']), 'accent/panel': cr(v['--accent'], v['--panel']), 'on-accent/accent': cr(v['--on-accent'], v['--accent']),
      'warn/panel': cr(v['--warn'], v['--panel']), 'muted(cell lines)/stage': cr(v['--muted'], v['--stage']), 'accent(glow, H bonds)/stage': cr(v['--accent'], v['--stage']), 'line/panel': cr(v['--line'], v['--panel']),
      'atom label ink on panel@0.55 over stage': cr(v['--ink'], over(v['--panel'], v['--stage'], 0.55)), 'measure label panel on ink@0.9': cr(v['--panel'], over(v['--ink'], v['--stage'], 0.9)),
      'Pb/stage': cr(v['--atom-pb'], v['--stage']), 'C/stage': cr(v['--atom-c'], v['--stage']), 'Br(#a9582c)/stage': cr('#a9582c', v['--stage']), 'N(#3d64d8)/stage': cr('#3d64d8', v['--stage'])
    };
    const shot = L.W + '/shots/bg_' + mode + '.png';
    await p.screenshot({ path: shot });
    // the saved PNG and its background
    await p.click('h2:text-is("Export")');
    const dP = p.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await p.selectOption('#pngScale', '1');
    await p.click('#btnPng');
    const d = await dP; let png = null;
    if (d) { png = L.W + '/bg_' + mode + '_saved.png'; await d.saveAs(png); }
    const dS = p.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await p.click('#btnSvg');
    const ds = await dS; let svg = null;
    if (ds) { svg = L.W + '/bg_' + mode + '_saved.svg'; await ds.saveAs(svg); }
    const svgBg = svg ? (fs.readFileSync(svg, 'utf8').match(/<rect class="background"[^>]*fill="([^"]+)"/) || [])[1] : null;
    // PXRD window colours
    const popP = ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await p.click('#btnPxrd');
    const w = await popP; let px = null;
    if (w) { await w.waitForTimeout(3000); px = await w.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), dataBg: document.documentElement.getAttribute('data-bg'), bg: getComputedStyle(document.body.querySelector('.px')).backgroundColor, plotRect: (document.querySelector('#pxPlot svg rect') || {}).getAttribute ? document.querySelector('#pxPlot svg rect').getAttribute('fill') : null })); await w.screenshot({ path: L.W + '/shots/bg_' + mode + '_pxrd.png' }); }
    out[mode] = { vars: v, contrast: c, labels: labels.slice(0, 8), cyl, viewerBg, shot, png, svgBg, px, errs };
    await b.close();
  }
  fs.writeFileSync(L.W + '/s11_bg.json', JSON.stringify(out, null, 1));
  for (const m of Object.keys(out)) console.log(m, JSON.stringify({ theme: out[m].vars.theme, dataBg: out[m].vars.dataBg, stage: out[m].vars['--stage'], viewerBg: out[m].viewerBg, svgBg: out[m].svgBg, px: out[m].px, contrast: out[m].contrast, labels: out[m].labels.slice(0, 6), cyl: out[m].cyl }));
})();
