// Torsion and angle in plane by real clicks, on small made-up structures.
// usage: node page_measure2.js out.json
const { chromium } = require('playwright');
const fs = require('fs');
const W = __dirname + '/synth/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = [];
  async function open(file) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    await p.goto('file:///home/claude/crysta/dist/Crysta.html');
    await p.setInputFiles('#fileIn', [file]);
    await p.waitForTimeout(2000);
    await p.click('#rail > .card h2:text-is("Measure")'); await p.waitForTimeout(300);
    return p;
  }
  const screen = (p) => p.evaluate(() => {
    const v = window.crysta.viewer(); const at = v.getModel().selectedAtoms({});
    return at.map((a) => { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); return { label: a.xl, el: a.elem, x: a.x, y: a.y, z: a.z, f: a.xf, sx: s.x, sy: s.y }; });
  });
  const measures = (p) => p.evaluate(() => { const s = window.crysta.state, d = s.docs[s.cur]; return { m: d.measures.map((m) => ({ type: m.type, labels: m.labels, value: m.value, full: m.full, plane: m.plane, pts: m.pts })), text: Array.from(document.querySelectorAll('#measList .mrow span')).map((x) => x.textContent), planes: Array.from(document.querySelectorAll('#mpList .mrow span')).map((x) => x.textContent) }; });
  // a chain of atoms: the copy nearest the middle of the canvas, atoms joined by distance
  const clickAll = async (p, atoms) => { for (const a of atoms) { await p.mouse.click(a.sx, a.sy); await p.waitForTimeout(500); } };
  // 1. torsion C1-C2-C3-C4 in the right- and the left-handed geometry.in
  for (const f of ['hand_right_geometry.in', 'hand_left_geometry.in', 'linear_geometry.in']) {
    const p = await open(W + f);
    const A = await screen(p);
    const cx = 21 + 984 / 2, cy = 141 + 621 / 2;
    const c2s = A.filter((a) => a.label === 'C2').sort((u, v) => Math.hypot(u.sx - cx, u.sy - cy) - Math.hypot(v.sx - cx, v.sy - cy));
    const c2 = c2s[0];
    const nearOf = (lab, ref) => A.filter((a) => a.label === lab).sort((u, v) => Math.hypot(u.x - ref.x, u.y - ref.y, u.z - ref.z) - Math.hypot(v.x - ref.x, v.y - ref.y, v.z - ref.z))[0];
    const c1 = nearOf('C1', c2), c3 = nearOf('C3', c2), c4 = nearOf('C4', c3);
    await p.click('#measTors'); await p.waitForTimeout(200);
    await clickAll(p, [c1, c2, c3, c4]);
    out.push(Object.assign({ file: f }, await measures(p)));
    await p.close();
  }
  // 2. angle in plane and torsion in rot10_DJ: the (0 0 1) plane through Pb1, then Pb-Br-Pb bridges
  {
    const f = 'rot10_DJ.cif';
    const p = await open(W + f);
    const A = await screen(p);
    const cx = 21 + 984 / 2, cy = 141 + 621 / 2;
    const pb = A.filter((a) => a.el === 'Pb').sort((u, v) => Math.hypot(u.sx - cx, u.sy - cy) - Math.hypot(v.sx - cx, v.sy - cy))[0];
    await p.click('#mpHkl'); await p.waitForTimeout(200);
    await p.mouse.click(pb.sx, pb.sy); await p.waitForTimeout(600);
    const d = (u, v) => Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z);
    const brs = A.filter((a) => a.el === 'Br' && Math.abs(d(a, pb) - 3.0) < 0.05 && Math.abs(a.z - pb.z) < 0.5);
    const br = brs[0];
    const pb2 = A.filter((a) => a.el === 'Pb' && a !== pb && Math.abs(d(a, br) - 3.0) < 0.05)[0];
    await p.click('#measPAngle'); await p.waitForTimeout(200);
    await clickAll(p, [pb, br, pb2]);
    await p.click('#measAngle'); await p.waitForTimeout(200);
    await clickAll(p, [pb, br, pb2]);
    out.push(Object.assign({ file: f, expect: 'angle in (001) plane = theta_in = 160.00, 3D angle 160.00' }, await measures(p)));
    await p.close();
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  await b.close();
})();
