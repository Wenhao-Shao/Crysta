const L = require('./lib.js'); const K = require('./pick.js');
(async () => {
  const { b, p, errs } = await L.open();
  await L.load(p, [L.EX + '/urea.cif']);
  await p.click('h2:text-is("Measure")');
  await K.installRecorder(p);
  const { list } = await K.screenAtoms(p);
  const fr = list.filter((a) => a.front && a.onStage);
  // two bonded heavy atoms
  let pair = null;
  for (const a of fr) for (const c of fr) if (a !== c && Math.hypot(a.xyz[0]-c.xyz[0], a.xyz[1]-c.xyz[1], a.xyz[2]-c.xyz[2]) < 3 && Math.hypot(a.sx-c.sx, a.sy-c.sy) > 30) { pair = [a, c]; break; }
  await K.clickAtom(p, pair[0]); await K.clickAtom(p, pair[1]);
  const m = await p.evaluate(() => window.crysta.state.docs[0].measures[0]);
  console.log('measure', m.labels, m.value);
  const mid = [0, 1, 2].map((k) => (m.pts[0][k] + m.pts[1][k]) / 2);
  const s = await L.toScreen(p, mid);
  const sc = await p.evaluate(() => [window.scrollX, window.scrollY, document.documentElement.scrollHeight, window.innerHeight]);
  console.log('mid screen', s, 'scroll', sc);
  const evs = await p.evaluate(() => { window.__ev = []; document.addEventListener('contextmenu', (e) => window.__ev.push(['doc', e.defaultPrevented, e.pageX, e.pageY]), false); return true; });
  await p.mouse.click(s[0] - sc[0], s[1] - sc[1], { button: 'right' }); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const m = document.getElementById('ctxMenu'); return { hidden: m.hidden, html: m.innerHTML, ev: window.__ev }; });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: L.W + '/shots/ctx_urea.png' });
  console.log(errs);
  await b.close();
})();
