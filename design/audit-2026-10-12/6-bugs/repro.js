// Minimal reproduction of the findings of auditor 6 in the built page.
// run: NODE_PATH=/opt/npm-tools/node_modules node repro.js [A6-01 ...]   (no argument: all but the slow A6-01 and A6-08)
const H = require('./h.js');
const fs = require('fs');
const EX = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/';
const want = process.argv.slice(2);
const on = (id) => (want.length ? want.includes(id) : !['A6-01', 'A6-08'].includes(id));
const rows = (p) => p.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('#dlCrystal dt')).map((dt) => [dt.textContent, dt.nextElementSibling.textContent])));
async function freeAtoms(p, n) {
  return p.evaluate((n) => {
    const v = window.crysta.viewer(); const m = v.getModel(); const box = document.getElementById('gl').getBoundingClientRect();
    const pts = new Map();
    for (const a of m.selectedAtoms({})) { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); const x = s.x - scrollX, y = s.y - scrollY; const k = Math.round(x) + ',' + Math.round(y); if (!pts.has(k)) pts.set(k, { x, y }); }
    const P = Array.from(pts.values()); const ok = [];
    for (const a of P) {
      if (ok.length >= n) break;
      if (a.x < box.left + 60 || a.x > box.right - 60 || a.y < Math.max(box.top, 0) + 40 || a.y > Math.min(box.bottom, innerHeight) - 60) continue;
      if (P.some((b) => b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 10) || ok.some((b) => Math.hypot(b.x - a.x, b.y - a.y) < 24)) continue;
      ok.push(a);
    }
    return ok;
  }, n);
}
const click = async (p, a) => { await p.mouse.move(a.x, a.y); await p.waitForTimeout(60); await p.mouse.click(a.x, a.y); await p.waitForTimeout(250); };
const unfold = (p) => p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));

(async () => {
  const b = await H.launch();
  const page = async () => { const o = await H.open(b); o.p.setDefaultTimeout(240000); return o; };
  if (on('A6-01')) {
    const { p } = await page();
    const t0 = Date.now();
    await p.setInputFiles('#fileIn', [H.F('big_10k.cif')]);
    let miss = 0;
    for (;;) { const r = await Promise.race([p.evaluate(() => window.crysta.state.docs.length), new Promise((res) => setTimeout(() => res(null), 2000))]); if (r === null) { miss++; continue; } if (r) break; await p.waitForTimeout(1000); }
    console.log('A6-01 big_10k.cif: structure shown after', Date.now() - t0, 'ms; probes with no answer within 2 s:', miss, '; notice:', JSON.stringify(await p.evaluate(() => window.crysta.state.notice)));
    await p.close();
  }
  if (on('A6-02')) {
    const { p } = await page();
    await H.load(p, [H.F('loop_short_row.cif')], 2500);
    const s = await H.snap(p);
    console.log('A6-02 loop_short_row.cif: formula', (await rows(p)).Formula, '| atoms', (await rows(p))['Atoms per cell'], '| notice', JSON.stringify(s.notice), '| Not read row', (await rows(p))['Not read'] || 'none');
    await p.close();
  }
  if (on('A6-03')) {
    const { p } = await page();
    await H.load(p, [H.F('odd_ortho_Cmce.cif'), H.F('odd_ortho_Cmca.cif')], 4000);
    for (const i of [0, 1]) { await p.click('#tblCmp button[data-open="' + i + '"]'); await p.waitForTimeout(1200); const r = await rows(p); console.log('A6-03', await p.evaluate(() => document.getElementById('title').textContent), '| SG', r['Space group'], '| atoms', r['Atoms per cell'], '| Symmetry', r.Symmetry); }
    await p.close();
  }
  if (on('A6-04')) {
    const { p } = await page();
    await H.load(p, [H.F('odd_calcite_rhombo_number_only.cif'), H.F('odd_calcite_R-3c_rhombo_symbol.cif')], 4000);
    for (const i of [0, 1]) { await p.click('#tblCmp button[data-open="' + i + '"]'); await p.waitForTimeout(1200); const r = await rows(p); console.log('A6-04', await p.evaluate(() => document.getElementById('title').textContent), '| formula', r.Formula, '| atoms', r['Atoms per cell'], '| Z', r.Z, '| rho', r['ρcalc'], '| Symmetry', r.Symmetry); }
    await p.close();
  }
  if (on('A6-05')) {
    const { p } = await page();
    await H.load(p, [H.F('odd_diamond_Fd-3m.cif')], 2500);
    const r = await rows(p);
    console.log('A6-05 odd_diamond_Fd-3m.cif: atoms', r['Atoms per cell'], '| rho', r['ρcalc'], '| Symmetry', r.Symmetry);
    await p.close();
  }
  if (on('A6-06')) {
    const { p } = await page();
    await H.load(p, [EX + 'PEA2PbBr4.cif', EX + 'urea.cif'], 4000);
    await p.click('#tblCmp button[data-open="0"]'); await p.waitForTimeout(1500);
    await unfold(p);
    await p.click('#mpHkl'); await p.waitForTimeout(400);
    const a = await freeAtoms(p, 1); await click(p, a[0]);
    await p.click('#measAPlane'); await p.waitForTimeout(300);
    await p.click('#tblCmp button[data-open="1"]'); await p.waitForTimeout(1500);
    await p.evaluate(() => scrollTo(0, 0));
    const u = await freeAtoms(p, 4);
    for (const q of u) await click(p, q);
    console.log('A6-06 after switching to urea and clicking', u.length, 'atoms:', JSON.stringify(await p.evaluate(() => { const s = window.crysta.state; const d = s.docs[s.cur]; return { mode: s.measure, aplane: { disabled: document.getElementById('measAPlane').disabled, pressed: document.getElementById('measAPlane').getAttribute('aria-pressed') }, hint: document.getElementById('measHint').textContent, measures: d.measures.length, notice: s.notice }; })));
    await p.close();
  }
  if (on('A6-07')) {
    const { p } = await page();
    for (const f of ['cell_zero.cif', 'cell_negative.cif', 'cell_angles_impossible.cif', 'cell_gamma0.cif']) {
      await H.load(p, [H.F(f)], 2500);
      const r = await rows(p);
      console.log('A6-07', f, '| a', r.a, 'α β γ', r['α'], r['β'], r['γ'], '| V', r.V, '| rho', r['ρcalc'], '| notice', JSON.stringify(await p.evaluate(() => window.crysta.state.notice)));
    }
    await p.close();
  }
  if (on('A6-08')) {
    const { p } = await page();
    await H.load(p, [H.F('big_10k.cif')], 60000);
    await p.evaluate(() => { const s = window.crysta.state; const d = s.docs[s.cur]; window.__lim = [d.lo.slice(), d.hi.slice(), d.uc.atoms.length, s.shown]; });
    await unfold(p);
    await p.click('#btnPackReset'); await p.waitForTimeout(500);
    console.log('A6-08 big_10k: block', JSON.stringify(await p.evaluate(() => window.__lim)), '| Reset gives:', JSON.stringify(await p.evaluate(() => window.crysta.state.notice)));
    await p.close();
  }
  if (on('A6-09')) {
    const { p } = await page();
    await H.load(p, [EX + 'urea.cif'], 2500);
    const u = await freeAtoms(p, 44);
    let first = null;
    for (let k = 0; k < 21; k++) { await click(p, u[2 * k]); await click(p, u[2 * k + 1]); if (!k) first = await p.evaluate(() => window.crysta.state.docs[0].measures[0].pts.map((q) => q.map((x) => x.toFixed(3)).join(',')).join(' / ')); }
    const s = await p.evaluate(() => ({ n: window.crysta.state.docs[0].measures.length, first: window.crysta.state.docs[0].measures[0].pts.map((q) => q.map((x) => x.toFixed(3)).join(',')).join(' / '), notice: window.crysta.state.notice, list: document.querySelectorAll('#measList .mrow').length }));
    console.log('A6-09 21 distances made: kept', s.n, '(list rows', s.list + ')', '| first measurement still there:', s.first === first, '| notice', JSON.stringify(s.notice));
    await p.close();
  }
  if (on('A6-10')) {
    const { p } = await page();
    await H.load(p, [EX + 'FCA3_2PbBr4_294K.cif'], 3500);
    await p.evaluate(() => scrollTo(0, 0));
    const f = await freeAtoms(p, 4);
    for (const q of f) await click(p, q);
    await unfold(p);
    await p.click('#mpHkl'); await p.waitForTimeout(300);
    await p.evaluate(() => scrollTo(0, 0));
    const g = await freeAtoms(p, 1); await click(p, g[0]);
    const before = await p.evaluate(() => { const d = window.crysta.state.docs[0]; return [d.measures.length, d.mplanes.length]; });
    await p.check('#chkMinor'); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => { const d = window.crysta.state.docs[0]; return [d.measures.length, d.mplanes.length, window.crysta.state.notice]; });
    console.log('A6-10 measures, planes before the Minor box', JSON.stringify(before), '| after', JSON.stringify(after));
    await p.close();
  }
  if (on('A6-11')) {
    for (const f of ['zip_corrupt_data.zip', 'zip_empty.zip', 'zip_truncated.zip']) {
      const { p } = await page();
      await H.load(p, [H.F(f)], 2500);
      console.log('A6-11', f, '->', JSON.stringify(await p.evaluate(() => window.crysta.state.notice)));
      await p.close();
    }
  }
  if (on('A6-12')) {
    const { p } = await page();
    await H.load(p, [H.F('zip_bomb_lying.zip')], 9000);
    console.log('A6-12 zip_bomb_lying.zip (header 1000 B, content 200 MB):', JSON.stringify(await p.evaluate(() => ({ notice: window.crysta.state.notice, heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6) }))));
    await p.close();
  }
  if (on('A6-13')) {
    const { p } = await page();
    await H.load(p, [H.F('formula_in_sg.cif')], 2500);
    await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
    await p.click('#btnCopy'); await p.waitForTimeout(300);
    const t = await p.evaluate(() => document.getElementById('tsvBox').value);
    console.log('A6-13 Copy table, cells that start with "=":', JSON.stringify(t.split('\n').flatMap((r) => r.split('\t')).filter((c) => /^=/.test(c))));
    await p.close();
  }
  if (on('A6-14')) {
    const { p } = await page();
    const txt = fs.readFileSync(H.F('溴化铅钙钛矿.cif'), 'utf8');
    await p.evaluate((txt) => { const dt = new DataTransfer(); dt.items.add(new File([txt], '溴化铅钙钛矿.cif')); document.getElementById('stage').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, txt);
    await p.waitForTimeout(3000);
    const names = []; p.on('download', (d) => names.push(d.suggestedFilename()));
    await unfold(p);
    for (const id of ['#btnPng', '#btnSvg', '#btnMol2']) { await p.click(id); await p.waitForTimeout(2000); }
    console.log('A6-14 structure', JSON.stringify(await p.evaluate(() => document.getElementById('title').textContent)), 'saved as', JSON.stringify(names));
    await p.close();
  }
  if (on('A6-15')) {
    const { p } = await page();
    await p.evaluate(() => { window.open = () => null; });
    await H.load(p, [EX + 'quartz_SiO2.cif'], 2500);
    await unfold(p);
    await p.click('#mpAtoms'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const a = await p.evaluate(() => !!window.crysta.state.planePick);
    await p.click('#mpCancel');
    await p.click('#btnPxrd'); await p.waitForTimeout(800); await p.focus('#pxTmin'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const b2 = await p.evaluate(() => document.querySelectorAll('.pxfloat').length);
    await p.click('#pxClose');
    await p.evaluate(() => document.getElementById('btnDbs').click()); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const c = await p.evaluate(() => document.querySelectorAll('.dbfloat').length);
    console.log('A6-15 after Escape: plane pick still on', a, '| PXRD windows open', b2, '| Databases windows open', c);
    await p.close();
  }
  if (on('A6-16')) {
    const { p } = await page();
    fs.writeFileSync(H.F('sg_amp.cif'), "data_amp\n_symmetry_space_group_name_H-M 'P 1 & <x>'\n_cell_length_a 5\n_cell_length_b 5\n_cell_length_c 5\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_\n_symmetry_equiv_pos_as_xyz\n'x,y,z'\nloop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nPb1 Pb 0 0 0\n");
    await H.load(p, [H.F('sg_amp.cif')], 2500);
    console.log('A6-16 file gives "P 1 & <x>"; the header shows', JSON.stringify(await p.evaluate(() => document.getElementById('sub').children[1].textContent)), '; Crystal data shows', JSON.stringify((await rows(p))['Space group']));
    await p.close();
  }
  await b.close();
})();
