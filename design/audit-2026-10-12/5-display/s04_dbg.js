const L = require('./lib.js'); const K = require('./pick.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  await p.click('h2:text-is("Packing")');
  await p.fill('#rng20', '-0.1'); await p.press('#rng20', 'Tab'); await p.waitForTimeout(1500);
  await p.fill('#rng21', '1.1'); await p.press('#rng21', 'Tab'); await p.waitForTimeout(2000);
  await p.click('h2:text-is("Packing")');
  await p.click('h2:text-is("Directions and planes")');
  const uvw = (process.argv[2] || '2,1,6').split(',');
  await p.fill('#ixH', uvw[0]); await p.fill('#ixK', uvw[1]); await p.fill('#ixL', uvw[2]);
  await p.click('#btnViewUVW'); await p.waitForTimeout(1500);
  const { list, scale } = await K.screenAtoms(p);
  const by = {};
  for (const a of list) if (/^(Pb|Br)/.test(a.label)) { const k = a.label; by[k] = by[k] || [0, 0, 0]; by[k][0]++; if (a.front) by[k][1]++; if (a.onStage) by[k][2]++; }
  console.log(scale, JSON.stringify(by));
  console.log(list.filter(a=>a.label==='Pb1').map(a=>a.f.map(x=>x.toFixed(3)).join(',')+' '+a.front+' '+a.onStage+' '+a.sx.toFixed(0)+','+a.sy.toFixed(0)).join('\n'));
  await p.screenshot({ path: L.W + '/shots/dbg_view.png' });
  await b.close();
})();
