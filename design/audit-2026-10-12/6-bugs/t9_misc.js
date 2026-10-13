// Measure mode after a switch, the 20-measure limit, the minor-parts box, PXRD and Databases windows opened and
// closed many times, Escape and keyboard, drag and drop, and the Structures table as text.
const H = require('./h.js');
const path = require('path');
const fs = require('fs');
const EX = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/';
const log = [];
const say = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); log.push(s); console.log(s); };
const part = process.argv[2] || 'all';

async function freeAtoms(p, n) {
  // screen points of drawn atoms; atoms that coincide on the screen (copies along the view) count once,
  // a point must be 10 px from every other point, and the chosen points are 24 px apart
  return p.evaluate((n) => {
    const v = window.crysta.viewer(); const m = v.getModel();
    const atoms = m.selectedAtoms({});
    const box = document.getElementById('gl').getBoundingClientRect();
    const pts = new Map();
    for (const a of atoms) {
      const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z });
      const x = s.x - window.scrollX, y = s.y - window.scrollY;
      const k = Math.round(x) + ',' + Math.round(y);
      if (!pts.has(k)) pts.set(k, { x, y, l: a.xl });
    }
    const P = Array.from(pts.values());
    const ok = [];
    for (const a of P) {
      if (ok.length >= n) break;
      if (a.x < box.left + 60 || a.x > box.right - 60 || a.y < Math.max(box.top, 0) + 40 || a.y > Math.min(box.bottom, window.innerHeight) - 60) continue;
      if (P.some((b) => b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 10)) continue;
      if (ok.some((b) => Math.hypot(b.x - a.x, b.y - a.y) < 24)) continue;
      ok.push(a);
    }
    return ok;
  }, n);
}
const click = async (p, a) => { await p.mouse.move(a.x, a.y); await p.waitForTimeout(60); await p.mouse.click(a.x, a.y); await p.waitForTimeout(200); };
const st = (p) => p.evaluate(() => { const s = window.crysta.state; const d = s.docs[s.cur]; return { cur: s.cur, name: d && d.name, measure: s.measure, measures: d ? d.measures.map((m) => m.type + ' ' + m.labels.join('-')) : null, picks: d && d.picks.length, mplanes: d && d.mplanes.length, notice: s.notice, hint: document.getElementById('measHint').textContent, aplaneBtn: { disabled: document.getElementById('measAPlane').disabled, pressed: document.getElementById('measAPlane').getAttribute('aria-pressed') }, distPressed: document.getElementById('measDist').getAttribute('aria-pressed'), readout: document.getElementById('readout').innerText.slice(0, 200) }; });

(async () => {
  const b = await H.launch();
  if (part === 'all' || part === 'measure') {
    const { p, errs } = await H.open(b);
    p.setDefaultTimeout(240000);
    await H.load(p, [EX + 'quartz_SiO2.cif', EX + 'urea.cif'], 3000);
    await p.click('#tblCmp button[data-open="0"]');
    await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));
    // 1. a plane in quartz, Atom to plane on, then switch to urea
    await p.click('#mpAtoms');
    await p.waitForTimeout(400);
    const all = await freeAtoms(p, 60);
    const tri = (L) => { const a = L[0]; const b = L.find((q) => Math.abs(q.x - a.x) > 30 && Math.abs(q.y - a.y) > 10); const c = L.find((q) => q !== a && q !== b && Math.abs((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) > 800); return [a, b, c]; };
    const qa = tri(all);
    say('free atoms', qa.length);
    for (const a of qa.slice(0, 3)) await click(p, a);
    say('1 plane picks', await p.evaluate(() => window.crysta.state.planePick && window.crysta.state.planePick.atoms.map((a) => a.label)));
    try { await p.click('#mpDone', { timeout: 3000 }); } catch (e) { say('1 Done not enabled'); }
    await p.waitForTimeout(500);
    await p.click('#measAPlane');
    await p.waitForTimeout(400);
    say('1 quartz with plane, Atom to plane on:', await st(p));
    await p.click('#tblCmp button[data-open="1"]');
    await p.waitForTimeout(1500);
    say('1 switched to urea:', await st(p));
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(300);
    const ua = await freeAtoms(p, 46);
    for (const a of ua.slice(0, 3)) await click(p, a);
    say('1 urea after clicking 3 atoms:', await st(p));
    // 2. the 20-measure limit: Distance, then 21 distances
    await p.click('#measDist');
    await p.waitForTimeout(300);
    const pairs = [];
    for (let k = 0; k + 1 < ua.length && pairs.length < 21; k += 2) pairs.push([ua[k], ua[k + 1]]);
    let first = null;
    for (let k = 0; k < pairs.length; k++) {
      await click(p, pairs[k][0]); await click(p, pairs[k][1]);
      if (k === 0) first = (await st(p)).measures[0];
    }
    const s2 = await st(p);
    say('2 after', pairs.length, 'distances: kept', s2.measures.length, 'first was', first, 'first now', s2.measures[0], 'notice', s2.notice);
    // 3. the minor-parts box clears the measures
    await H.load(p, [EX + 'FCA3_2PbBr4_294K.cif'], 3000);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(300);
    const fa = await freeAtoms(p, 6);
    await click(p, fa[0]); await click(p, fa[1]); await click(p, fa[2]); await click(p, fa[3]);
    const s3a = await st(p);
    await p.check('#chkMinor');
    await p.waitForTimeout(1500);
    const s3b = await st(p);
    say('3 minor box: measures before', s3a.measures, 'after', s3b.measures, 'notice', s3b.notice);
    say('errors', errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)));
    await p.close();
  }
  if (part === 'all' || part === 'windows') {
    if (process.argv[3] === 'skip45') { var SKIP45 = true; }
    // 4. PXRD window as a popup, opened and closed 12 times
    const { p, errs } = await H.open(b);
    p.setDefaultTimeout(240000);
    await H.load(p, [EX + 'quartz_SiO2.cif', EX + 'urea.cif'], 3000);
    let opened = 0;
    for (let k = 0; k < 12; k++) {
      const pop = p.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
      await p.click('#btnPxrd');
      const pg = await pop;
      if (pg) { await pg.waitForTimeout(700); opened += (await pg.$$('#pxSims .px-item')).length ? 1 : 0; await pg.close(); await p.waitForTimeout(300); }
    }
    say('4 popup opened with its list', opened, 'of 12 times; isOpen now', await p.evaluate(() => window.crysta.pxrd.isOpen()));
    // 5. the floating PXRD window (popup blocked): 12 open and close, and Escape
    const f = await H.open(b);
    await f.p.evaluate(() => { window.open = () => null; });
    await H.load(f.p, [EX + 'quartz_SiO2.cif'], 2500);
    for (let k = 0; k < 12; k++) { await f.p.click('#btnPxrd'); await f.p.waitForTimeout(500); await f.p.click('#pxClose'); await f.p.waitForTimeout(200); }
    await f.p.click('#btnPxrd'); await f.p.waitForTimeout(800);
    const nf = await f.p.evaluate(() => document.querySelectorAll('.pxfloat').length);
    await f.p.focus('#pxTmin');
    await f.p.keyboard.press('Escape');
    await f.p.waitForTimeout(300);
    const afterEsc = await f.p.evaluate(() => document.querySelectorAll('.pxfloat').length);
    say('5 floating PXRD: windows after 12 cycles + open', nf, '; after Escape inside it', afterEsc, '; note', await f.p.evaluate(() => document.getElementById('pxNote').textContent.slice(0, 120)));
    await f.p.screenshot({ path: path.join(H.W, 'shots', 'pxrd_float.png') });
    // the floating PXRD window and the page: a click on the page while it is open
    await f.p.click('#pxClose');
    // 6. Databases window: 15 quick toggles, then Escape
    for (let k = 0; k < 15; k++) await f.p.evaluate(() => document.getElementById('btnDbs').click());
    await f.p.evaluate(() => document.getElementById('dbText') && document.getElementById('dbText').focus());
    const nd = await f.p.evaluate(() => document.querySelectorAll('.dbfloat').length);
    await f.p.keyboard.press('Escape');
    await f.p.waitForTimeout(200);
    const nd2 = await f.p.evaluate(() => document.querySelectorAll('.dbfloat').length);
    say('6 Databases: after 15 toggles', nd, 'windows (expect 1); after Escape', nd2, '; focus now on', await f.p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    say('errors popup page', errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)), 'floating page', f.errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)));
    // 7. Escape with a pick mode on: does it cancel?
    await f.p.evaluate(() => document.querySelectorAll('#rail .card.shut > button.fold').forEach((x) => x.click()));
    await f.p.click('#mpAtoms');
    await f.p.keyboard.press('Escape');
    await f.p.waitForTimeout(300);
    say('7 plane pick after Escape: planePick still on?', await f.p.evaluate(() => !!window.crysta.state.planePick));
    await f.p.click('#btnDefine');
    await f.p.keyboard.press('Escape');
    await f.p.waitForTimeout(300);
    say('7 chromophore pick after Escape: still on?', await f.p.evaluate(() => !!window.crysta.state.picking));
    // keyboard: Tab to a framework row and press Enter, then Escape
    await f.p.evaluate(() => { const b = document.querySelector('#dlFw button.glowbtn'); b.focus(); });
    await f.p.keyboard.press('Enter');
    await f.p.waitForTimeout(400);
    const g1 = await f.p.evaluate(() => window.crysta.state.glow && window.crysta.state.glow.name);
    await f.p.keyboard.press('Escape');
    await f.p.waitForTimeout(400);
    say('7 keyboard: Enter on a row glows', g1, '; after Escape', await f.p.evaluate(() => window.crysta.state.glow && window.crysta.state.glow.name));
    await p.close(); await f.p.close();
  }
  if (part === 'all' || part === 'drop') {
    // 8. drag and drop on the picture
    const { p, errs } = await H.open(b);
    p.setDefaultTimeout(240000);
    const drop = async (sel, files) => {
      const items = files.map((f) => ({ name: path.basename(f), b64: fs.readFileSync(f).toString('base64') }));
      await p.evaluate(({ sel, items }) => {
        const dt = new DataTransfer();
        for (const it of items) { const bin = atob(it.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); dt.items.add(new File([u], it.name)); }
        const el = document.querySelector(sel);
        el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
        el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      }, { sel, items });
    };
    await drop('#stage', [EX + 'quartz_SiO2.cif', H.F('zip_broken_member.zip'), H.F('few_points.xy'), H.F('descending.xy')]);
    await p.waitForTimeout(4000);
    say('8 drop on stage:', await p.evaluate(() => ({ docs: window.crysta.state.docs.map((d) => d.name), notice: window.crysta.state.notice, px: window.crysta.pxrd.isOpen(), data: window.crysta.pxrd.state.data.map((d) => d.name + ' ' + d.x.length), dragClass: document.getElementById('stage').classList.contains('drag') })));
    // drop on stage while a structure is shown: the drag class goes away
    // 9. the Structures table as text, with a formula in a field
    fs.writeFileSync(H.F('formula_in_sg.cif'), "data_f\n_symmetry_space_group_name_H-M '=HYPERLINK(\"http://example.invalid\",\"click\")'\n_cell_length_a 5.9\n_cell_length_b 5.9\n_cell_length_c 5.9\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_\n_symmetry_equiv_pos_as_xyz\n'x,y,z'\nloop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nPb1 Pb 0 0 0\nBr1 Br 0.5 0 0\n");
    fs.writeFileSync(H.F('=SUM(1,2).cif'), fs.readFileSync(H.F('formula_in_sg.cif'), 'utf8').replace(/_symmetry_space_group_name_H-M.*\n/, ''));
    await H.load(p, [H.F('formula_in_sg.cif'), H.F('=SUM(1,2).cif')], 2500);
    await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
    await p.click('#btnCopy');
    await p.waitForTimeout(300);
    const tsv = await p.evaluate(() => document.getElementById('tsvBox').value);
    say('9 TSV cells that start with "=":', tsv.split('\n').flatMap((r) => r.split('\t')).filter((c) => /^[=+\-@]/.test(c)));
    say('errors', errs.filter((e) => !/ERR_TUNNEL|net::/.test(e)));
    await p.close();
  }
  fs.writeFileSync(path.join(H.W, 'out', 't9_' + part + '.log'), log.join('\n'));
  await b.close();
})();
