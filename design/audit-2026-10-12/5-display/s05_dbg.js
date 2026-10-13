const L = require('./lib.js'); const K = require('./pick.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/urea.cif']);
  const { list, scale } = await K.screenAtoms(p);
  console.log(scale, list.length, list.filter(a=>a.front).length, list.filter(a=>a.onStage).length);
  console.log(list.slice(0,5).map(a=>JSON.stringify([a.label,a.sx,a.sy,a.depth,a.r])).join('\n'));
  const box = await p.evaluate(() => JSON.stringify(document.getElementById('gl').getBoundingClientRect()));
  console.log(box);
  await b.close();
})();
