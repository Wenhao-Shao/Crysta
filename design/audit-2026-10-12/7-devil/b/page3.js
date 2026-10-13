// A6-16 (space-group text with &), A5-05 (SVG content), A5-08 (right-click menu on a shared line)
const { chromium } = require('playwright');
const fs = require('fs');
const W = process.env.W;
const EX = '/home/claude/crysta/examples/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = {};
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  const urea = fs.readFileSync(EX + 'urea.cif', 'utf8');
  const amp = urea.replace(/_symmetry_space_group_name_H-M\s+.*\n/, "_symmetry_space_group_name_H-M 'P 1 & <x>'\n").replace(/_space_group_name_H-M_alt\s+.*\n/, "_space_group_name_H-M_alt 'P 1 & <x>'\n");
  await p.evaluate((a) => window.crysta.addFiles([{ name: 'sg_amp.cif', text: a }]), amp);
  await p.waitForTimeout(2500);
  out.a616 = await p.evaluate(() => ({ subText: document.getElementById('sub').textContent, sgMeta: window.crysta.state.docs[window.crysta.state.cur].struct.meta.spaceGroup }));
  // A5-08 and A5-05 on PEA2PbBr4
  await p.setInputFiles('#fileIn', [EX + 'PEA2PbBr4.cif']); await p.waitForTimeout(3500);
  await p.click('#rail > .card h2:text-is("Measure")'); await p.waitForTimeout(300);
  const pos = async (labels) => p.evaluate((labels) => { const v = window.crysta.viewer(); const at = v.getModel().selectedAtoms({});
    // choose the Pb1 nearest the screen centre and its bonded Br3 and Br1
    const sc = (a) => v.modelToScreen({ x: a.x, y: a.y, z: a.z });
    const pb = at.filter((a) => a.xl === labels[0]).map((a) => ({ a, s: sc(a) })).sort((u, w) => Math.hypot(u.s.x - 700, u.s.y - 450) - Math.hypot(w.s.x - 700, w.s.y - 450))[0].a;
    const near = (l) => at.filter((a) => a.xl === l).sort((u, w) => Math.hypot(u.x - pb.x, u.y - pb.y, u.z - pb.z) - Math.hypot(w.x - pb.x, w.y - pb.y, w.z - pb.z))[0];
    return [pb, near(labels[1]), near(labels[2])].map((a) => { const s = sc(a); return [s.x, s.y]; }); }, labels);
  const [P, B3, B1] = await pos(['Pb1', 'Br3', 'Br1']);
  await p.mouse.click(...P); await p.waitForTimeout(400); await p.mouse.click(...B3); await p.waitForTimeout(600);
  await p.click('#measAngle'); await p.waitForTimeout(300);
  await p.mouse.click(...B3); await p.waitForTimeout(400); await p.mouse.click(...P); await p.waitForTimeout(400); await p.mouse.click(...B1); await p.waitForTimeout(600);
  out.measures = await p.evaluate(() => window.crysta.state.docs[window.crysta.state.cur].measures.map((m) => m.labels.join('-') + ' ' + m.value.toFixed(2)));
  // right-click at 70 % along Pb1->Br3
  const rx = P[0] + 0.7 * (B3[0] - P[0]), ry = P[1] + 0.7 * (B3[1] - P[1]);
  await p.mouse.click(rx, ry, { button: 'right' }); await p.waitForTimeout(600);
  out.a508 = await p.evaluate(() => { const m = document.getElementById('ctxMenu'); return { hidden: m.hidden, items: Array.from(m.querySelectorAll('button')).map((x) => x.textContent.trim()) }; });
  await p.keyboard.press('Escape');
  // angle in plane with an (hkl) plane, then SVG and PNG
  await p.click('#mpHkl'); await p.waitForTimeout(300); await p.mouse.click(...P); await p.waitForTimeout(800);
  if (await p.locator('#mpDone').isVisible().catch(() => false)) await p.click('#mpDone');
  await p.click('#measPAngle'); await p.waitForTimeout(300);
  await p.mouse.click(...B3); await p.waitForTimeout(400); await p.mouse.click(...P); await p.waitForTimeout(400); await p.mouse.click(...B1); await p.waitForTimeout(800);
  out.measures2 = await p.evaluate(() => window.crysta.state.docs[window.crysta.state.cur].measures.map((m) => m.type + ' ' + m.labels.join('-') + ' ' + m.value.toFixed(2)));
  await p.click('#rail > .card h2:text-is("Export")'); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnSvg')]);
  const svgPath = W + '/shots/pea_measure.svg'; await dl.saveAs(svgPath);
  const svg = fs.readFileSync(svgPath, 'utf8');
  const count = (re) => (svg.match(re) || []).length;
  out.a505 = { measureObjects: count(/class="measure"/g), measurePlane: count(/class="measure-plane"/g), glow: count(/glow/g), classes: Array.from(new Set((svg.match(/class="[^"]+"/g) || []))).slice(0, 30) };
  // the screen: shapes drawn for the measurements (3Dmol shapes) and highlight spheres
  await p.screenshot({ path: W + '/shots/pea_measure_screen.png' });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
