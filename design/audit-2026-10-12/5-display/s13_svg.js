// The PNG and SVG that the page saves, against the screen: atoms, view, labels, measurements, planes, glow.
const L = require('./lib.js');
const K = require('./pick.js');
const fs = require('fs');
(async () => {
  const out = {};
  const { b, p, errs } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await L.load(p, [L.EX + '/FCA3_2PbBr4_294K.cif']);
  await p.selectOption('#selLabels', 'heavy'); await p.waitForTimeout(1500);
  await p.click('h2:text-is("Measure")');
  await K.installRecorder(p);
  let { list } = await K.screenAtoms(p);
  const fr = list.filter((a) => a.front && a.onStage && a.el !== 'H');
  // a distance between two Br far apart on the screen
  const brs = fr.filter((a) => a.el === 'Br');
  let pair = null;
  for (const a of brs) for (const c of brs) if (!pair && a !== c && Math.hypot(a.xyz[0] - c.xyz[0], a.xyz[1] - c.xyz[1], a.xyz[2] - c.xyz[2]) < 7 && Math.hypot(a.sx - c.sx, a.sy - c.sy) > 80) pair = [a, c];
  await K.clickAtom(p, pair[0]); await K.clickAtom(p, pair[1]);
  // a plane through three Pb and an atom-to-plane measurement, an angle in plane
  const pbs = fr.filter((a) => a.el === 'Pb' || a.el === 'Br').slice(0, 40);
  await p.click('#mpAtoms'); await p.waitForTimeout(500);
  const three = [];
  for (const a of pbs) { if (three.length < 3 && three.every((x) => Math.hypot(x.sx - a.sx, x.sy - a.sy) > 60)) three.push(a); }
  for (const a of three) await K.clickAtom(p, a);
  await p.click('#mpDone'); await p.waitForTimeout(1200);
  await p.click('#measAPlane'); await p.waitForTimeout(400);
  const other = fr.find((a) => !three.includes(a) && a.el === 'O');
  await K.clickAtom(p, other);
  await p.click('#measPAngle'); await p.waitForTimeout(400);
  const tri = fr.filter((a) => a.el === 'Br').slice(3, 6);
  for (const a of tri) await K.clickAtom(p, a);
  // a lattice plane (0 0 1)
  await p.click('h2:text-is("Directions and planes")');
  await p.fill('#ixH', '0'); await p.fill('#ixK', '0'); await p.fill('#ixL', '1');
  await p.click('#btnPlane'); await p.waitForTimeout(1500);
  // a glow row
  await p.click('#fwTitle');
  await p.click('[data-glow="19"] .glowbtn'); await p.waitForTimeout(1500);
  await p.mouse.move(3, 3); await p.waitForTimeout(600);
  out.measures = await p.evaluate(() => window.crysta.state.docs[0].measures.map((m) => m.type + ' ' + m.labels.join('-') + ' ' + m.value.toFixed(3)));
  out.glow = await p.evaluate(() => window.crysta.state.glow && window.crysta.state.glow.count);
  const sc = await p.evaluate(() => window.__rec);
  const screenLabels = sc.filter((x) => x.fn === 'addLabel').map((x) => x.text);
  const screenCyl = {}; for (const x of sc) if (x.fn === 'addCylinder') { const k = 'r' + x.o.radius + (x.o.dashed ? ' dashed' : ''); screenCyl[k] = (screenCyl[k] || 0) + 1; }
  const screenSph = {}; for (const x of sc) if (x.fn === 'addSphere') { const k = 'r' + x.o.radius; screenSph[k] = (screenSph[k] || 0) + 1; }
  const screenCustom = sc.filter((x) => x.fn === 'addCustom').map((x) => (x.opacity === undefined ? 'solid' : 'op' + x.opacity) + ' ' + x.color);
  out.screen = { labels: screenLabels.length, labelSet: screenLabels.filter((t) => !/^[A-Z][a-z]?\d/.test(t)), cyl: screenCyl, sph: screenSph, custom: screenCustom.length };
  // the screen picture and the model atoms on the screen
  await p.locator('#gl').screenshot({ path: L.W + '/shots/svg_screen.png' });
  ({ list } = await K.screenAtoms(p));
  const glBox = await p.evaluate(() => { const r = document.getElementById('gl').getBoundingClientRect(); return [r.left + window.scrollX, r.top + window.scrollY, r.width, r.height]; });
  // save the SVG and the PNG
  await p.click('h2:text-is("Export")');
  const dS = p.waitForEvent('download', { timeout: 60000 });
  await p.click('#btnSvg');
  const ds = await dS; const svgFile = L.W + '/saved_view.svg'; await ds.saveAs(svgFile);
  await p.selectOption('#pngScale', '1');
  const dP = p.waitForEvent('download', { timeout: 120000 });
  await p.click('#btnPng', { timeout: 120000 });
  const dp = await dP; const pngFile = L.W + '/saved_view_1x.png'; await dp.saveAs(pngFile);
  const svg = fs.readFileSync(svgFile, 'utf8');
  // atoms: circle positions against the screen positions of the model atoms
  const circles = [...svg.matchAll(/<circle class="atom( (\w+))?" cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((m) => ({ el: m[2], x: +m[3], y: +m[4], r: +m[5] }));
  const atomsScreen = list.map((a) => ({ el: a.el, x: a.sx - glBox[0], y: a.sy - glBox[1] }));
  let maxD = 0, unmatched = 0;
  for (const a of atomsScreen) { let best = 1e9; for (const c of circles) if (c.el === a.el) best = Math.min(best, Math.hypot(c.x - a.x, c.y - a.y)); if (best > 1) unmatched++; maxD = Math.max(maxD, best); }
  out.svg = { size: (svg.match(/<svg[^>]*width="([\d.]+)" height="([\d.]+)"/) || []).slice(1), gl: glBox.slice(2), circles: circles.length, screenAtoms: atomsScreen.length, maxPosDiffPx: +maxD.toFixed(3), unmatched,
    classes: Object.entries([...svg.matchAll(/class="([\w -]+)"/g)].reduce((t, m) => { t[m[1]] = (t[m[1]] || 0) + 1; return t; }, {})),
    labelTexts: [...svg.matchAll(/<g class="(\w[\w-]*)"><rect[^>]*\/><text[^>]*>([^<]*)<\/text><\/g>/g)].map((m) => m[1] + ':' + m[2]).filter((t) => !/^atom-label/.test(t)),
    atomLabels: [...svg.matchAll(/<g class="atom-label">/g)].length };
  out.files = { svgFile, pngFile };
  out.errs = errs;
  fs.writeFileSync(L.W + '/s13_svg.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
