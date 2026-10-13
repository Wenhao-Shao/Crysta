const L = require('./lib.js'); const K = require('./pick.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/urea.cif']);
  await p.click('h2:text-is("Measure")');
  await K.installRecorder(p);
  const { list } = await K.screenAtoms(p);
  const fr = list.filter((a) => a.front && a.onStage && a.el !== 'H').slice(0, 3);
  await p.click('#mpAtoms'); await p.waitForTimeout(500);
  for (const a of fr) await K.clickAtom(p, a);
  await p.click('#mpDone'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const rad = {}; for (const x of window.__rec) if (x.fn === 'addCylinder') rad[x.o.radius] = (rad[x.o.radius] || 0) + 1; return { rad, n: window.__rec.length, planes: window.crysta.state.docs[0].mplanes.length, labels: window.__rec.filter((x) => x.fn === 'addLabel').map((x) => x.text) }; });
  console.log(JSON.stringify(r));
  await b.close();
})();
