// Measure card in the page, with real mouse clicks on atoms of PEA2PbBr4: distance, angle, torsion, planes and measures against planes.
// The clicked atoms (label, fractional x) and the values and the text of the Measure card are saved for the numpy check.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const file = process.argv[2], outp = process.argv[3];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.setInputFiles('#fileIn', [file]);
  await p.waitForTimeout(2500);
  await p.click('#rail > .card h2:text-is("Measure")'); await p.waitForTimeout(500);
  // screen positions of the drawn atoms (front-most copy of each label first)
  const atomsOnScreen = async () => p.evaluate(() => {
    const v = window.crysta.viewer();
    const at = v.getModel().selectedAtoms({});
    const cv = document.querySelector('#gl canvas') || document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    return at.map((a, i) => { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return { i, label: a.xl, el: a.elem, x: a.x, y: a.y, z: a.z, f: a.xf, sx: s.x, sy: s.y, inside: s.x > r.left + 5 && s.x < r.right - 5 && s.y > r.top + 5 && s.y < r.bottom - 5 }; });
  });
  let A = await atomsOnScreen();
  // a click lands on the atom under the mouse: check which atom 3Dmol reports, by the readout after the click
  const lastPick = () => p.evaluate(() => { const s = window.crysta.state, d = s.docs[s.cur]; return { picks: d.picks.map((q) => ({ label: q.label, p: q.p })), measures: d.measures.map((m) => ({ type: m.type, labels: m.labels, value: m.value, full: m.full, pts: m.pts, plane: m.plane })), mplanes: d.mplanes.map((q) => ({ id: q.id, kind: q.kind, labels: q.labels, hkl: q.hkl, pts: q.pts, n: q.plane.n, c: q.plane.c, rms: q.plane.rms, near: q.near })) }; });
  // click an atom; if 3Dmol reports another atom under the mouse (one in front), undo that pick and report failure
  const pickState = () => p.evaluate(() => { const s = window.crysta.state, d = s.docs[s.cur]; return { picks: d.picks.length, nm: d.measures.length, np: d.mplanes.length, pp: s.planePick ? (s.planePick.atoms || []).length : -1, last: d.picks.length ? d.picks[d.picks.length - 1].p : (s.planePick && s.planePick.atoms && s.planePick.atoms.length ? s.planePick.atoms[s.planePick.atoms.length - 1].p : null) }; });
  const clickAtom = async (a) => { await p.mouse.click(a.sx, a.sy); await p.waitForTimeout(600); };
  const clickExact = async (a) => {
    const before = await pickState();
    await clickAtom(a);
    const after = await pickState();
    // completed a measurement or a plane: check the last point of it
    const pts = await p.evaluate(() => { const s = window.crysta.state, d = s.docs[s.cur]; const m = d.measures[d.measures.length - 1]; const q = d.mplanes[d.mplanes.length - 1]; return { m: m ? m.pts : null, q: q ? q.pts : null }; });
    let got = after.last;
    if (after.nm > before.nm) got = pts.m[Math.min(pts.m.length - 1, before.picks)];
    if (after.np > before.np && before.pp === -1) got = pts.q[0];
    const ok = got && Math.hypot(got[0] - a.x, got[1] - a.y, got[2] - a.z) < 0.01;
    return ok;
  };
  // choose atoms: visible, and not hidden behind another atom (no other atom within 12 px on screen that is nearer the viewer)
  const view = await p.evaluate(() => window.crysta.viewer().getView());
  const free = (a) => a.inside;
  const pick = (pred) => A.filter((a) => pred(a) && free(a));
  const res = { clicks: [] };
  const T0 = Date.now(); const log = (m) => console.log(((Date.now() - T0) / 1000).toFixed(1) + 's ' + m);
  async function measure(btn, atoms, tag) {
    log('measure ' + tag + ' ' + atoms.map((a) => a.label).join(' '));
    await p.click('#' + btn); await p.waitForTimeout(300);
    for (const a of atoms) await clickAtom(a);
    const st = await lastPick();
    const text = await p.evaluate(() => Array.from(document.querySelectorAll('#measList .mrow span')).map((s) => s.textContent));
    res.clicks.push({ tag, atoms: atoms.map((a) => ({ label: a.label, f: a.f, xyz: [a.x, a.y, a.z] })), measure: st.measures[st.measures.length - 1], text: text[text.length - 1] });
  }
  // a Pb with its bonded Br, chosen near the middle of the picture
  const pbs = pick((a) => a.el === 'Pb');
  const near = (a, el, r) => pick((o) => o.el === el && Math.hypot(o.x - a.x, o.y - a.y, o.z - a.z) < r && o !== a);
  let pb = pbs.find((x) => near(x, 'Br', 3.3).length >= 2) || pbs[0];
  const brs = near(pb, 'Br', 3.3);
  await measure('measDist', [pb, brs[0]], 'distance Pb-Br');
  await measure('measAngle', [brs[0], pb, brs[1]], 'angle Br-Pb-Br');
  // torsion along a C-C-C-N or C-C-C-C chain of one cation
  const cs = pick((a) => a.el === 'C' || a.el === 'N');
  let chain = null;
  const bonded = (u, v) => Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z) < 1.65;
  outer: for (const a1 of cs) for (const a2 of cs) { if (!bonded(a1, a2) || a1 === a2) continue; for (const a3 of cs) { if (a3 === a1 || !bonded(a2, a3)) continue; for (const a4 of cs) { if (a4 === a2 || a4 === a1 || !bonded(a3, a4)) continue; chain = [a1, a2, a3, a4]; break outer; } } }
  if (chain) await measure('measTors', chain, 'torsion');
  // a bridge Pb-Br-Pb for the angle in plane (layer plane) = theta_in
  let bridge = null;
  for (const x of pick((a) => a.el === 'Br')) { const m = near(x, 'Pb', 3.3); if (m.length >= 2) { bridge = [m[0], x, m[1]]; break; } }
  // plane through 4 atoms (the Br of one layer around pb, equatorial ones: nearly at pb's height)
  log('plane through atoms'); await p.click('#mpAtoms'); await p.waitForTimeout(300);
  const eqs = near(pb, 'Br', 3.4).slice(0, 4);
  const plAtoms = eqs.length >= 3 ? eqs : pick((a) => a.el === 'Br').slice(0, 4);
  for (const a of plAtoms) await clickAtom(a);
  await p.click('#mpDone'); await p.waitForTimeout(600);
  // the (hkl) plane: the boxes start at the layer plane; click a Pb
  log('hkl plane'); await p.click('#mpHkl'); await p.waitForTimeout(300);
  await clickAtom(pb);
  let st = await lastPick();
  res.planes = st.mplanes; res.planeAtoms = plAtoms.map((a) => ({ label: a.label, f: a.f, xyz: [a.x, a.y, a.z] })); res.pbForHkl = { label: pb.label, f: pb.f };
  res.mpText = await p.evaluate(() => Array.from(document.querySelectorAll('#mpList .mrow span')).map((s) => s.textContent + ' | ' + (s.title || '')));
  res.hklBoxes = await p.evaluate(() => ['mpH', 'mpK', 'mpL'].map((id) => document.getElementById(id).value));
  // measures against the selected plane (the last one: the (hkl) plane)
  const others = pick((a) => a.el === 'N' || a.el === 'C');
  await measure('measAPlane', [others[0]], 'atom to (hkl) plane');
  await measure('measBPlane', [pb, brs[0]], 'bond to (hkl) plane');
  if (bridge) await measure('measPAngle', bridge, 'angle in (hkl) plane, bridge');
  // choose plane A (through atoms) and measure against it
  log('select plane A'); await p.click('#mpList input[value="A"]', { timeout: 5000 }).catch((e) => log('no radio A: ' + e.message.slice(0, 80))); await p.waitForTimeout(300);
  await measure('measAPlane', [others[1]], 'atom to plane A');
  await measure('measBPlane', [brs[0], brs[1]], 'bond to plane A');
  res.cell = await p.evaluate(() => { const s = window.crysta.state, d = s.docs[s.cur]; return d.struct.meta.cellRaw; });
  res.errors = errs;
  res.atoms = A.map((a) => ({ label: a.label, el: a.el, xyz: [a.x, a.y, a.z], f: a.f }));
  res.allMeasures = (await lastPick()).measures;
  res.measText = await p.evaluate(() => Array.from(document.querySelectorAll('#measList .mrow span')).map((s) => s.textContent));
  fs.writeFileSync(outp, JSON.stringify(res, null, 1));
  await p.screenshot({ path: outp.replace(/\.json$/, '.png') });
  await b.close();
})();
