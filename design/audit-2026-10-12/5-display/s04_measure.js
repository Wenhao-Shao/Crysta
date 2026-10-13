// The Measure card with real clicks on atoms: distance, angle, torsion, planes, atom/bond to plane,
// angle in plane, plane to plane, nearest (hkl); then removal with x and with the right-click menu.
const L = require('./lib.js');
const K = require('./pick.js');
const fs = require('fs');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => Math.sqrt(dot(a, a));
const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (nrm(u) * nrm(v))))) * 180 / Math.PI;
// torsion from the definition: looking from B to C, the angle by which A-B is turned clockwise onto C-D is positive
function torsionRef(a, b, c, d) {
  const e = sub(c, b); const eu = e.map((x) => x / nrm(e));
  const pa = sub(a, b), pd = sub(d, c);
  const ua = sub(pa, eu.map((x) => x * dot(pa, eu))), ud = sub(pd, eu.map((x) => x * dot(pd, eu)));
  const t = ang(ua, ud);
  // the sign: counterclockwise seen from b looking to c is a positive rotation about +e (right hand) seen from the tail...
  // looking along +e (from b to c), a clockwise turn of ua onto ud is a rotation about +e with the right hand rule
  const s = dot(crs(ua, ud), eu);
  return s >= 0 ? t : -t;
}
const F0 = { Pb1: [0.2449, 0.2396, -0.0115], Pb2: [0.7449, 0.2546, -0.0116], Br1: [-0.001, 0.188, 0.0015], Br3: [0.182, 0.2094, -0.1839], Br4: [0.1872, 0.4916, -0.001], Br5: [0.3126, -0.0078, 0.0011], Br6: [0.4989, 0.3126, 0.0015] };
const trans = (a) => { const f0 = F0[a.label]; if (!f0) return null; const t = a.f.map((x, k) => x - f0[k]); return t.every((x) => Math.abs(x - Math.round(x)) < 0.002) ? t.map(Math.round) : null; };
(async () => {
  const log = {};
  const { b, p, errs } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  await p.click('h2:text-is("Packing")');
  await p.fill('#rng20', '-0.1'); await p.press('#rng20', 'Tab'); await p.waitForTimeout(1500);
  await p.fill('#rng21', '1.1'); await p.press('#rng21', 'Tab'); await p.waitForTimeout(2000);
  await p.click('h2:text-is("Packing")');
  await p.click('h2:text-is("Directions and planes")');
  const uvw = (process.argv[2] || '2,1,6').split(',');
  await p.fill('#ixH', uvw[0]); await p.fill('#ixK', uvw[1]); await p.fill('#ixL', uvw[2]);
  await p.click('#btnViewUVW'); await p.waitForTimeout(1500);
  await p.click('h2:text-is("Directions and planes")');
  await p.click('h2:text-is("Measure")');
  await p.waitForTimeout(800);
  await K.installRecorder(p);
  const { list, scale } = await K.screenAtoms(p);
  log.scale = scale;
  // a Pb1 at the identity position whose chain atoms are all clickable
  const ok = (a) => a && a.front && a.onStage;
  const near = (a, lab, dd) => list.filter((x) => x.label === lab && Math.abs(nrm(sub(x.xyz, a.xyz)) - dd) < 0.002);
  let pick = null;
  for (const pb of list.filter((a) => a.label === 'Pb1' && trans(a))) {
    const T = trans(pb);
    const same = (x, extra) => { const t = trans(x); return t && t.every((v, k) => v === T[k] + (extra ? extra[k] : 0)); };
    const br3 = near(pb, 'Br3', 2.8786).find((x) => same(x));
    const br1 = near(pb, 'Br1', 2.9957).find((x) => same(x));
    const br4 = near(pb, 'Br4', 2.9927).find((x) => same(x));
    const br5 = near(pb, 'Br5', 3.0095)[0];
    const br6 = near(pb, 'Br6', 3.0081)[0];
    const pb2 = br1 ? near(br1, 'Pb2', 3.0082).find((x) => same(x, [-1, 0, 0])) : null;
    const all = [pb, br3, br1, br4, br5, br6, pb2];
    if (all.every(ok)) { pick = { pb, br3, br1, br4, br5, br6, pb2 }; break; }
  }
  if (!pick) { console.log('no clickable chain in this view'); await b.close(); return; }
  log.pick = Object.fromEntries(Object.entries(pick).map(([k, a]) => [k, { label: a.label, f: a.f, sx: a.sx, sy: a.sy }]));
  const D = () => p.evaluate(() => { const d = window.crysta.state.docs[window.crysta.state.cur]; return { measures: JSON.parse(JSON.stringify(d.measures)), picks: d.picks.map((x) => x.label), mplanes: JSON.parse(JSON.stringify(d.mplanes)), sel: d.mplaneSel }; });
  const texts = () => p.evaluate(() => ({ meas: Array.from(document.querySelectorAll('#measList .mrow')).map((r) => r.innerText), planes: Array.from(document.querySelectorAll('#mpList .mrow')).map((r) => r.innerText + (r.querySelector('span[title]') ? ' {' + r.querySelector('span[title]').title + '}' : '')), readout: document.getElementById('readout').innerText, hint: document.getElementById('measHint').innerText, note: document.getElementById('mpNote').innerText, notice: window.crysta.state.notice }));
  const scene = () => p.evaluate(() => window.__rec);
  const shot = async (name) => { await p.waitForTimeout(400); await p.screenshot({ path: L.W + '/shots/meas_' + name + '.png' }); };
  const res = [];
  const check = async (name, refFn) => {
    const d = await D();
    const m = d.measures[d.measures.length - 1];
    const t = await texts();
    const sc = await scene();
    const r = { name, type: m.type, labels: m.labels, value: m.value, text: t.meas[t.meas.length - 1], readout: t.readout };
    const ref = refFn(m);
    r.ref = ref;
    r.diff = Math.abs(m.value - ref);
    // drawn: highlight spheres, dashed lines and the value label
    const n = { dist: 2, angle: 3, tors: 4, aplane: 1, bplane: 2, pangle: 3 }[m.type];
    const own = m.pts.slice(0, n);
    const hs = sc.filter((x) => x.fn === 'addSphere' && x.o.radius === 0.55);
    r.highlightAtOwn = own.every((q) => hs.some((s) => nrm(sub([s.o.center.x, s.o.center.y, s.o.center.z], q)) < 1e-9));
    const dashed = sc.filter((x) => x.fn === 'addCylinder' && x.o.dashed && x.o.radius === 0.028).map((x) => [[x.o.start.x, x.o.start.y, x.o.start.z], [x.o.end.x, x.o.end.y, x.o.end.z]]);
    const segs = []; for (let k = 0; k + 1 < m.pts.length; k++) segs.push([m.pts[k], m.pts[k + 1]]);
    if (m.proj) segs.push([m.pts[0], m.proj]);
    r.dashedOk = segs.every((sg) => dashed.some((ds) => nrm(sub(ds[0], sg[0])) < 1e-9 && nrm(sub(ds[1], sg[1])) < 1e-9));
    const lab = sc.filter((x) => x.fn === 'addLabel' && x.o.fontSize === 13 && x.text && /[°Å]$/.test(x.text));
    r.labels3d = lab.map((x) => x.text);
    r.res = { m, sc: sc.length };
    res.push(r);
    console.log(name, JSON.stringify({ labels: r.labels, value: r.value, ref: r.ref, diff: r.diff, text: r.text, highlightAtOwn: r.highlightAtOwn, dashedOk: r.dashedOk, labels3d: r.labels3d }));
    return { m, sc };
  };
  // 1. distance Pb1-Br3
  await K.clickAtom(p, pick.pb); await K.clickAtom(p, pick.br3);
  await check('distance Pb1-Br3 (CIF 2.8786(8))', (m) => nrm(sub(m.pts[0], m.pts[1])));
  await shot('01_distance');
  // 2. angle Br3-Pb1-Br1
  await p.click('#measAngle'); await p.waitForTimeout(500);
  for (const a of [pick.br3, pick.pb, pick.br1]) await K.clickAtom(p, a);
  await check('angle Br3-Pb1-Br1 (CIF 96.54(2))', (m) => ang(sub(m.pts[0], m.pts[1]), sub(m.pts[2], m.pts[1])));
  await shot('02_angle');
  // 3. torsion Br3-Pb1-Br1-Pb2(1_455)
  await p.click('#measTors'); await p.waitForTimeout(500);
  for (const a of [pick.br3, pick.pb, pick.br1, pick.pb2]) await K.clickAtom(p, a);
  const tor = await check('torsion Br3-Pb1-Br1-Pb2_1_455 (CIF -71.22(6))', (m) => torsionRef(...m.pts));
  await shot('03_torsion');
  // the same four atoms in reverse order: the torsion keeps its sign
  for (const a of [pick.pb2, pick.br1, pick.pb, pick.br3]) await K.clickAtom(p, a);
  await check('torsion reversed Pb2-Br1-Pb1-Br3', (m) => torsionRef(...m.pts));
  // 4. plane through the four equatorial Br of this Pb1
  await p.click('#mpAtoms'); await p.waitForTimeout(600);
  const eq = [pick.br1, pick.br4, pick.br6, pick.br5];
  for (const a of eq) await K.clickAtom(p, a);
  log.pickbar = (await texts()).readout;
  await p.click('#mpDone'); await p.waitForTimeout(1200);
  let d = await D();
  const PA = d.mplanes[0];
  // reference: least-squares plane by the smallest eigenvector of the scatter matrix (power iteration on the inverse is overkill: use the closed form via cross products)
  const pts = PA.pts;
  const cen = [0, 1, 2].map((k) => pts.reduce((t, q) => t + q[k], 0) / pts.length);
  // brute force: the normal that minimizes the sum of squared distances, searched on a fine grid and refined
  let best = null;
  const cost = (n) => pts.reduce((t, q) => t + dot(sub(q, cen), n) ** 2, 0);
  for (let th = 0; th <= 180; th += 1) for (let ph = 0; ph < 360; ph += 1) { const T = th * Math.PI / 180, P = ph * Math.PI / 180; const n = [Math.sin(T) * Math.cos(P), Math.sin(T) * Math.sin(P), Math.cos(T)]; const c = cost(n); if (!best || c < best.c) best = { c, T, P }; }
  for (let step = 0.5; step > 1e-7; step /= 2) { let moved = true; while (moved) { moved = false; for (const [dt, dp] of [[step, 0], [-step, 0], [0, step], [0, -step]]) { const T = best.T + dt * Math.PI / 180, P = best.P + dp * Math.PI / 180; const n = [Math.sin(T) * Math.cos(P), Math.sin(T) * Math.sin(P), Math.cos(T)]; const c = cost(n); if (c < best.c - 1e-15) { best = { c, T, P }; moved = true; } } } }
  const nRef = [Math.sin(best.T) * Math.cos(best.P), Math.sin(best.T) * Math.sin(best.P), Math.cos(best.T)];
  const rmsRef = Math.sqrt(best.c / pts.length);
  log.planeA = { n: PA.plane.n, nRef, angleBetween: Math.min(ang(PA.plane.n, nRef), 180 - ang(PA.plane.n, nRef)), c: PA.plane.c, cen, rms: PA.plane.rms, rmsRef, near: PA.near };
  // sign of the normal against the order of the clicks
  let ref = [0, 0, 0]; for (let k = 0; k < pts.length; k++) ref = ref.map((x, i) => x + crs(sub(pts[k], cen), sub(pts[(k + 1) % pts.length], cen))[i]);
  log.planeA.normalFollowsClicks = dot(ref, PA.plane.n) > 0;
  // nearest (hkl): own enumeration with the cell from the page
  const cell = await p.evaluate(() => { const c = window.crysta.state.docs[0].uc.cell; return { A: c.A, B: c.B, C: c.C }; });
  const V = dot(cell.A, crs(cell.B, cell.C));
  const as = crs(cell.B, cell.C).map((x) => x / V), bs = crs(cell.C, cell.A).map((x) => x / V), cs = crs(cell.A, cell.B).map((x) => x / V);
  const gcd = (x, y) => (y ? gcd(y, x % y) : Math.abs(x));
  let byMax = {};
  for (let h = -6; h <= 6; h++) for (let k = -6; k <= 6; k++) for (let l = -6; l <= 6; l++) {
    if (!h && !k && !l) continue; if (gcd(gcd(h, k), l) !== 1) continue;
    const G = [0, 1, 2].map((i) => h * as[i] + k * bs[i] + l * cs[i]);
    const a = Math.min(ang(G, PA.plane.n), 180 - ang(G, PA.plane.n));
    const mx = Math.max(Math.abs(h), Math.abs(k), Math.abs(l));
    if (!byMax[mx] || a < byMax[mx].a) byMax[mx] = { hkl: [h, k, l], a };
  }
  log.planeA.nearRef = byMax;
  log.planeA.texts = await texts();
  // the drawn plane: disc, normal stub, letter
  const sc = await scene();
  { const rad = {}; for (const x of sc) if (x.fn === 'addCylinder') rad[x.o.radius] = (rad[x.o.radius] || 0) + 1; console.log('radii after plane A', JSON.stringify(rad), sc.length); }
  const stub = sc.filter((x) => x.fn === 'addCylinder' && x.o.radius === 0.04);
  log.planeA.stub = stub.map((x) => ({ start: x.o.start, end: x.o.end, color: x.o.color }));
  log.planeA.letter = sc.filter((x) => x.fn === 'addLabel' && x.text === 'A').map((x) => x.o);
  await shot('04_planeA');
  // 5. (hkl) plane (0 0 1) through Pb1
  log.hklBoxes = await p.evaluate(() => ['mpH', 'mpK', 'mpL'].map((id) => document.getElementById(id).value));
  await p.click('#mpHkl'); await p.waitForTimeout(600);
  await K.clickAtom(p, pick.pb);
  d = await D();
  const PB = d.mplanes[1];
  log.planeB = { hkl: PB.hkl, n: PB.plane.n, c: PB.plane.c, atomOnPlane: nrm(sub(PB.plane.c, pick.pb.xyz)), angleToCstar: Math.min(ang(PB.plane.n, cs), 180 - ang(PB.plane.n, cs)), sel: d.sel, texts: await texts() };
  await shot('05_planeB');
  // 6. atom to plane: Br3 against A, then against B
  await p.click('input[name="mpSel"][value="A"]'); await p.waitForTimeout(800);
  await p.click('#measAPlane'); await p.waitForTimeout(500);
  await K.clickAtom(p, pick.br3);
  const ap = await check('atom Br3 to plane A', (m) => dot(sub(m.pts[0], PA.plane.c), PA.plane.n));
  log.aplaneA = { foot: ap.m.pts[1], footOnPlane: dot(sub(ap.m.pts[1], PA.plane.c), PA.plane.n), lineAlongNormal: ang(sub(ap.m.pts[1], ap.m.pts[0]), PA.plane.n), stubSide: stub.length ? dot(sub([stub[0].o.end.x, stub[0].o.end.y, stub[0].o.end.z], PA.plane.c), PA.plane.n) : null };
  await shot('06_atom_plane');
  await p.click('input[name="mpSel"][value="B"]'); await p.waitForTimeout(800);
  await K.clickAtom(p, pick.br3);
  await check('atom Br3 to plane B (001 through Pb1)', (m) => dot(sub(m.pts[0], PB.plane.c), PB.plane.n));
  // 7. bond to plane: Pb1-Br3 against B (axial tilt of the Pb1-Br3 bond is 90 - this)
  await p.click('#measBPlane'); await p.waitForTimeout(500);
  await K.clickAtom(p, pick.pb); await K.clickAtom(p, pick.br3);
  const bp = await check('bond Pb1-Br3 to plane B', (m) => Math.asin(Math.abs(dot(sub(m.pts[1], m.pts[0]), PB.plane.n)) / nrm(sub(m.pts[1], m.pts[0]))) * 180 / Math.PI);
  log.bplane = { proj: bp.m.proj, projInPlane: bp.m.proj ? dot(sub(bp.m.proj, bp.m.pts[0]), PB.plane.n) : null };
  await shot('07_bond_plane');
  // 8. angle in plane: Pb1-Br1-Pb2 projected on B: this is theta in of the bridge row
  await p.click('#measPAngle'); await p.waitForTimeout(500);
  for (const a of [pick.pb, pick.br1, pick.pb2]) await K.clickAtom(p, a);
  const pa = await check('angle in plane Pb1-Br1-Pb2 on (001) (row theta_in 151.96, theta 150.77)', (m) => { const n = PB.plane.n; const fl = (w) => sub(w, n.map((x) => x * dot(w, n))); return ang(fl(sub(m.pts[0], m.pts[1])), fl(sub(m.pts[2], m.pts[1]))); });
  const arms = pa.sc.filter((x) => x.fn === 'addCylinder' && x.o.radius === 0.045);
  const arcs = pa.sc.filter((x) => x.fn === 'addCylinder' && x.o.radius === 0.035 && x.o.color === PB.color);
  log.pangle = { full: pa.m.full, fullRef: ang(sub(pa.m.pts[0], pa.m.pts[1]), sub(pa.m.pts[2], pa.m.pts[1])), arms: arms.map((x) => ({ s: x.o.start, e: x.o.end, color: x.o.color })), nArc: arcs.length,
    armsInPlane: arms.map((x) => dot(sub([x.o.end.x, x.o.end.y, x.o.end.z], [x.o.start.x, x.o.start.y, x.o.start.z]), PB.plane.n)),
    armAngle: arms.length === 2 ? ang(sub([arms[0].o.end.x, arms[0].o.end.y, arms[0].o.end.z], [arms[0].o.start.x, arms[0].o.start.y, arms[0].o.start.z]), sub([arms[1].o.end.x, arms[1].o.end.y, arms[1].o.end.z], [arms[1].o.start.x, arms[1].o.start.y, arms[1].o.start.z])) : null,
    arcRadius: arcs.length ? nrm(sub([arcs[0].o.start.x, arcs[0].o.start.y, arcs[0].o.start.z], pa.m.pts[1])) : null,
    arcEndsAngle: arcs.length ? ang(sub([arcs[0].o.start.x, arcs[0].o.start.y, arcs[0].o.start.z], pa.m.pts[1]), sub([arcs[arcs.length - 1].o.end.x, arcs[arcs.length - 1].o.end.y, arcs[arcs.length - 1].o.end.z], pa.m.pts[1])) : null };
  await shot('08_angle_in_plane');
  log.textsAll = await texts();
  // plane to plane, own value
  log.planeToPlaneRef = Math.min(ang(PA.plane.n, PB.plane.n), 180 - ang(PA.plane.n, PB.plane.n));
  // 9. the right-click menu on the distance line
  d = await D();
  const m0 = d.measures[0];
  const mid = [0, 1, 2].map((k) => (m0.pts[0][k] * 0.3 + m0.pts[1][k] * 0.7));
  const s = await L.toScreen(p, mid);
  await p.mouse.click(s[0], s[1], { button: 'right' }); await p.waitForTimeout(500);
  log.ctx = await p.evaluate(() => { const m = document.getElementById('ctxMenu'); return { hidden: m.hidden, items: Array.from(m.querySelectorAll('button')).map((x) => x.dataset.mrm + ': ' + x.innerText) }; });
  log.ctxPoint = s;
  console.log('ctx', JSON.stringify(log.ctx), s);
  await shot('09_context_menu');
  if (!log.ctx.hidden) { await p.click('#ctxMenu button'); await p.waitForTimeout(900); }
  d = await D();
  log.afterCtx = d.measures.map((m) => m.type + ' ' + m.labels.join('-'));
  // 10. remove one measurement with its x, then plane A with its x (its measurement goes with it)
  const n0 = d.measures.length;
  await p.click('#measList .mrow:nth-child(1) .xbtn'); await p.waitForTimeout(900);
  d = await D();
  log.afterX = { before: n0, after: d.measures.length, left: d.measures.map((m) => m.type + ' ' + m.labels.join('-') + (m.plane ? ' @' + m.plane : '')) };
  await p.click('#mpList button[data-mprm="A"]'); await p.waitForTimeout(900);
  d = await D();
  log.afterPlaneX = { planes: d.mplanes.map((q) => q.id), left: d.measures.map((m) => m.type + ' ' + m.labels.join('-') + (m.plane ? ' @' + m.plane : '')), sel: d.sel, texts: await texts() };
  const sc2 = await scene();
  log.afterPlaneX.dashed = sc2.filter((x) => x.fn === 'addCylinder' && x.o.dashed && x.o.radius === 0.028).length;
  log.afterPlaneX.discs = sc2.filter((x) => x.fn === 'addCylinder' && x.o.radius === 0.04).length;
  await shot('10_after_removal');
  // remove everything left
  while ((await D()).measures.length) { await p.click('#measList .mrow:nth-child(1) .xbtn'); await p.waitForTimeout(700); }
  await p.click('#mpList button[data-mprm="B"]'); await p.waitForTimeout(900);
  d = await D();
  log.end = { measures: d.measures.length, planes: d.mplanes.length, measureMode: await p.evaluate(() => window.crysta.state.measure), buttons: await p.evaluate(() => ['measAPlane', 'measBPlane', 'measPAngle'].map((id) => document.getElementById(id).disabled)) };
  const sc3 = await scene();
  log.end.leftShapes = sc3.filter((x) => (x.fn === 'addSphere' && x.o.radius === 0.55) || (x.fn === 'addCylinder' && (x.o.radius === 0.028 || x.o.radius === 0.04 || x.o.radius === 0.045))).length;
  log.res = res.map((r) => ({ name: r.name, labels: r.labels, value: r.value, ref: r.ref, diff: r.diff, text: r.text, highlightAtOwn: r.highlightAtOwn, dashedOk: r.dashedOk, labels3d: r.labels3d }));
  log.errs = errs;
  fs.writeFileSync(L.W + '/s04_measure.json', JSON.stringify(log, null, 1));
  console.log(JSON.stringify(Object.assign({}, log, { res: undefined }), null, 1));
  await b.close();
})();
