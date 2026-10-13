// Page checks for auditors 5 and 6. NODE_PATH=/opt/npm-tools/node_modules W=... node page2.js [only]
const { chromium } = require('playwright');
const fs = require('fs');
const W = process.env.W;
const EX = '/home/claude/crysta/examples/';
const only = process.argv[2] || '';
const run = (k) => !only || only.split(',').includes(k);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = {};
  async function page(files, vp) {
    const ctx = await b.newContext({ viewport: vp || { width: 1400, height: 900 }, acceptDownloads: true });
    if (process.env.CLIP) await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const p = await ctx.newPage();
    p._errs = []; p.on('pageerror', (e) => p._errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_TUNNEL|net::/.test(m.text())) p._errs.push(m.text()); });
    await p.goto('file:///home/claude/crysta/dist/Crysta.html');
    if (files && files.length) { await p.setInputFiles('#fileIn', files); await p.waitForTimeout(2500 + 800 * files.length); }
    return p;
  }
  const openCard = async (p, title) => { await p.click('#rail > .card h2:text-is("' + title + '")'); await p.waitForTimeout(250); };
  const S = (p, fn, arg) => p.evaluate(fn, arg);
  async function clickAtoms(p, labels, which) {
    const pos = await p.evaluate(([labels, which]) => {
      const v = window.crysta.viewer(); const m = v.getModel(); const at = m.selectedAtoms({});
      return labels.map((l, k) => { const cands = at.filter((x) => x.xl === l); const a = cands[Math.min(cands.length - 1, (which && which[k]) || 0)]; const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return [s.x, s.y]; });
    }, [labels, which]);
    for (const [x, y] of pos) { await p.mouse.click(x, y); await p.waitForTimeout(500); }
  }
  // A5-01: default block of PEA2PbBr4
  if (run('a501')) {
    const p = await page([EX + 'PEA2PbBr4.cif']);
    out.a501 = await S(p, () => {
      const C = window.XtalCore; const st = window.crysta.state; const d = st.docs[st.cur];
      const blk = C.assemble(d.uc, d.lo, d.hi, d.polyRules);
      const A = blk.atoms; const br = A.filter((a) => d.uc.metalsOf[a.src].length >= 2);
      const cnt = {}; br.forEach((a) => { const k = a.bonds.filter((j) => d.uc.center[A[j].src]).length; cnt[k] = (cnt[k] || 0) + 1; });
      const rows = d.info.layer.bridges.map((x) => { const h = C.highlightSet(blk, d.uc, d.info, { type: 'bridge', m1: x.m1, x: x.x, m2: x.m2, theta: x.theta }); return x.m1 + '-' + x.x + '-' + x.m2 + ' arcs ' + h.arcs.length; });
      const hbEmpty = d.hbRows.filter((r) => C.highlightSet(blk, d.uc, d.info, { type: 'hbond', D: r.D, H: r.H, A: r.A, dDA: r.dDA }).atoms.length === 0).length;
      return { lo: d.lo, hi: d.hi, bridgingByMetalsDrawn: cnt, rows, hbRows: d.hbRows.length, hbEmpty };
    });
    // press the row Pb1-Br4-Pb2 and read the note
    await openCard(p, 'Inorganic framework');
    const btn = p.locator('#tblBr button.glowbtn', { hasText: 'Pb1–Br4–Pb2' });
    if (await btn.count()) { await btn.first().click(); await p.waitForTimeout(800); out.a501.note = await S(p, () => document.getElementById('defNote').textContent); out.a501.glowAtoms = await S(p, () => { const g = window.crysta.state.glow; return g ? { atoms: (g.atoms || g.seen || []).length, keys: Object.keys(g) } : null; }); }
    await p.screenshot({ path: W + '/shots/a501.png' });
    await p.close();
  }
  // A5-04 and A5-12: PNG sizes
  if (run('png')) {
    const p = await page([EX + 'urea.cif']);
    await openCard(p, 'Export');
    out.png = { stage: await S(p, () => { const g = document.getElementById('gl'); const cv = window.crysta.viewer().getCanvas(); return [g.clientWidth, g.clientHeight, cv.width, cv.height, window.devicePixelRatio]; }) };
    for (const k of ['1', '2', '4']) {
      await p.selectOption('#pngScale', k);
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnPng')]);
      const path = W + '/shots/png_' + k + 'x.png'; await dl.saveAs(path);
      const buf = fs.readFileSync(path); out.png[k] = [buf.readUInt32BE(16), buf.readUInt32BE(20), dl.suggestedFilename()];
    }
    // drawing buffer at 4x: repeat the export steps by hand
    out.png.buf4 = await S(p, () => { const gl = document.getElementById('gl'); const w = gl.clientWidth, h = gl.clientHeight; gl.style.inset = 'auto'; gl.style.left = '0'; gl.style.top = '0'; gl.style.width = (w * 4) + 'px'; gl.style.height = (h * 4) + 'px'; const v = window.crysta.viewer(); v.resize(); const cv = v.getCanvas(); const ctx = cv.getContext('webgl2') || cv.getContext('webgl'); const r = [cv.width, cv.height, ctx ? ctx.drawingBufferWidth : null, ctx ? ctx.drawingBufferHeight : null]; gl.style.inset = ''; gl.style.left = ''; gl.style.top = ''; gl.style.width = ''; gl.style.height = ''; v.resize(); return r; });
    await p.close();
  }
  // A6-06: measure mode after a structure switch
  if (run('a606')) {
    const p = await page([EX + 'PEA2PbBr4.cif', EX + 'urea.cif']);
    await S(p, () => { const st = window.crysta.state; st.docs.forEach((d, i) => { d._i = i; }); });
    await p.click('button.linkbtn[data-open="0"]'); await p.waitForTimeout(1500);
    await openCard(p, 'Measure');
    await p.click('#mpHkl'); await p.waitForTimeout(400);
    await clickAtoms(p, ['Pb1']); await p.waitForTimeout(500);
    const mp = await S(p, () => window.crysta.state.docs[window.crysta.state.cur].mplanes.length);
    if (await p.locator('#mpDone').isVisible().catch(() => false)) await p.click('#mpDone');
    await p.click('#measAPlane'); await p.waitForTimeout(300);
    const before = await S(p, () => window.crysta.state.measure);
    await p.click('button.linkbtn[data-open="1"]'); await p.waitForTimeout(1500);
    await clickAtoms(p, ['C1', 'O1', 'N1', 'C1']);
    out.a606 = await S(p, ([mp, before]) => { const st = window.crysta.state; const d = st.docs[st.cur]; const bt = document.getElementById('measAPlane'); return { planesMadeOnPEA: mp, modeBefore: before, cur: d.name, measure: st.measure, pressed: bt.getAttribute('aria-pressed'), disabled: bt.disabled, hint: document.getElementById('measHint').textContent, measures: d.measures.length, notice: st.notice }; }, [mp, before]);
    await p.close();
  }
  // A6-09 (21 distances) and A6-10 (Minor box)
  if (run('a609')) {
    const p = await page([EX + 'urea.cif']);
    await openCard(p, 'Measure');
    const labs = await S(p, () => { const at = window.crysta.viewer().getModel().selectedAtoms({}); return at.map((a) => a.xl); });
    // 21 pairs of distinct atoms (index pairs)
    const pos = await S(p, () => { const v = window.crysta.viewer(); const at = v.getModel().selectedAtoms({}); return at.map((a) => { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return [s.x, s.y]; }); });
    let made = 0, first = null;
    for (let k = 0; k + 1 < pos.length && made < 21; k += 2) {
      await p.mouse.click(...pos[k]); await p.waitForTimeout(250); await p.mouse.click(...pos[k + 1]); await p.waitForTimeout(250);
      const n = await S(p, () => window.crysta.state.docs[window.crysta.state.cur].measures.length);
      if (n > made || n === 20) { if (!first) first = await S(p, () => window.crysta.state.docs[window.crysta.state.cur].measures[0].labels.join('-') + ' ' + window.crysta.state.docs[window.crysta.state.cur].measures[0].value.toFixed(3)); made++; }
    }
    out.a609 = await S(p, (first) => { const st = window.crysta.state; const d = st.docs[st.cur]; return { attempted: 21, kept: d.measures.length, firstBefore: first, firstNow: d.measures[0].labels.join('-') + ' ' + d.measures[0].value.toFixed(3), notice: st.notice }; }, first);
    await p.close();
  }
  if (run('a610')) {
    const p = await page([EX + 'FCA3_2PbBr4_294K.cif']);
    await openCard(p, 'Measure');
    await clickAtoms(p, ['Pb1', 'Br1']);
    await p.click('#mpHkl'); await p.waitForTimeout(300); await clickAtoms(p, ['Pb1']);
    const before = await S(p, () => { const d = window.crysta.state.docs[window.crysta.state.cur]; return [d.measures.length, d.mplanes.length]; });
    await openCard(p, 'Display');
    const lbl = await S(p, () => !document.getElementById('lblMinor').hidden);
    await S(p, () => { const c = document.getElementById('chkMinor'); c.click(); });
    await p.waitForTimeout(1500);
    const mid = await S(p, () => { const d = window.crysta.state.docs[window.crysta.state.cur]; return [d.measures.length, d.mplanes.length, window.crysta.state.notice]; });
    await S(p, () => { document.getElementById('chkMinor').click(); }); await p.waitForTimeout(1500);
    const after = await S(p, () => { const d = window.crysta.state.docs[window.crysta.state.cur]; return [d.measures.length, d.mplanes.length]; });
    out.a610 = { minorBoxShown: lbl, before, afterTick: mid, afterUntick: after };
    await p.close();
  }
  // A6-15: Escape in a plane pick
  if (run('a615')) {
    const p = await page([EX + 'quartz_SiO2.cif']);
    await openCard(p, 'Measure');
    await p.click('#mpAtoms'); await p.waitForTimeout(300);
    const a = await S(p, () => !!window.crysta.state.planePick);
    await p.mouse.click(500, 400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    out.a615 = { pickOn: a, afterEscape: await S(p, () => !!window.crysta.state.planePick) };
    await p.close();
  }
  // A6-13, A6-14, A6-16 through addFiles (the path of a dropped file)
  if (run('names')) {
    const p = await page([]);
    const urea = fs.readFileSync(EX + 'urea.cif', 'utf8');
    const ampSg = urea.replace(/_symmetry_space_group_name_H-M\s+.*\n/, "_symmetry_space_group_name_H-M 'P 1 & <x>'\n").replace(/_space_group_name_H-M_alt\s+.*\n/, "_space_group_name_H-M_alt 'P 1 & <x>'\n");
    await S(p, ([u, a]) => { window.crysta.addFiles([{ name: '溴化铅钙钛矿.cif', text: u }, { name: '=SUM(1,2).cif', text: u }, { name: 'sg_amp.cif', text: a }]); }, [urea, ampSg]);
    await p.waitForTimeout(3000);
    out.names = { sub: await S(p, () => document.getElementById('sub').textContent), sgMeta: await S(p, () => window.crysta.state.docs[window.crysta.state.cur].struct.meta.spaceGroup) };
    await S(p, () => document.querySelector('button.linkbtn[data-open="0"]').click()); await p.waitForTimeout(1500);
    await openCard(p, 'Export');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnSvg')]);
    out.names.svgName = dl.suggestedFilename();
    await S(p, () => document.getElementById('btnCopy').click()); await p.waitForTimeout(800);
    out.names.tsv = await S(p, async () => { try { return await navigator.clipboard.readText(); } catch (e) { return 'BOX:' + document.getElementById('tsvBox').value; } });
    await p.close();
  }
  // A5-07: narrow layout and the definition note
  if (run('a507')) {
    for (const vp of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
      const p = await page([EX + 'PEA2PbBr4.cif'], vp);
      await openCard(p, 'Inorganic framework');
      const btn = p.locator('#dlFw button.glowbtn', { hasText: 'Stacking offset' });
      await btn.first().scrollIntoViewIfNeeded(); await btn.first().click(); await p.waitForTimeout(900);
      await p.locator('#stage').scrollIntoViewIfNeeded();
      const r = await S(p, () => { const R = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; const n = document.getElementById('defNote'); const ov = (a, c) => !(a[0] + a[2] <= c[0] || c[0] + c[2] <= a[0] || a[1] + a[3] <= c[1] || c[1] + c[3] <= a[1]); const nr = R(n); const btns = Array.from(document.querySelectorAll('#stage button')).filter((x) => x.offsetParent && !n.contains(x)); return { note: nr, hidden: n.hidden, stage: R(document.getElementById('stage')), covered: btns.filter((x) => ov(nr, R(x))).map((x) => x.textContent.trim() || x.title) }; });
      await p.screenshot({ path: W + '/shots/a507_' + vp.width + '.png' });
      out['a507_' + vp.width] = r;
      await p.close();
    }
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
