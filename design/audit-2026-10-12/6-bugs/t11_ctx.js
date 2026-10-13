// Right-click removal: three distances, remove the middle one from the picture menu, then "Remove all".
const H = require('./h.js');
const EX = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/';
const R = require('./repro_helpers.js');
(async () => {
  const b = await H.launch();
  const { p, errs } = await H.open(b);
  p.setDefaultTimeout(120000);
  await H.load(p, [EX + 'urea.cif'], 2500);
  const u = await R.freeAtoms(p, 6);
  for (const q of u) await R.click(p, q);
  const before = await p.evaluate(() => window.crysta.state.docs[0].measures.map((m) => m.labels.join('-') + ' ' + m.value.toFixed(3)));
  const mid = await p.evaluate(() => { const v = window.crysta.viewer(); const m = window.crysta.state.docs[0].measures[1]; const s = m.pts.map((q) => v.modelToScreen({ x: q[0], y: q[1], z: q[2] })); return { x: (s[0].x + s[1].x) / 2 - scrollX, y: (s[0].y + s[1].y) / 2 - scrollY }; });
  await p.mouse.click(mid.x, mid.y, { button: 'right' });
  await p.waitForTimeout(400);
  const menu = await p.evaluate(() => Array.from(document.querySelectorAll('#ctxMenu button')).map((x) => x.textContent));
  await p.click('#ctxMenu button[data-mrm]:not([data-mrm="all"])');
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => window.crysta.state.docs[0].measures.map((m) => m.labels.join('-') + ' ' + m.value.toFixed(3)));
  const m0 = await p.evaluate(() => { const v = window.crysta.viewer(); const m = window.crysta.state.docs[0].measures[0]; const s = m.pts.map((q) => v.modelToScreen({ x: q[0], y: q[1], z: q[2] })); return { x: (s[0].x + s[1].x) / 2 - scrollX, y: (s[0].y + s[1].y) / 2 - scrollY }; });
  await p.mouse.click(m0.x, m0.y, { button: 'right' });
  await p.waitForTimeout(300);
  await p.click('#ctxMenu button[data-mrm="all"]');
  await p.waitForTimeout(500);
  console.log(JSON.stringify({ before, menu, after, afterAll: await p.evaluate(() => window.crysta.state.docs[0].measures.length), errs: errs.filter((e) => !/net::/.test(e)) }, null, 1));
  await b.close();
})();
