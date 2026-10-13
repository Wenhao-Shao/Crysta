const L = require('./lib.js');
(async () => {
  for (const f of ['PEA2PbBr4.cif', 'FCA3_2PbBr4_294K.cif']) {
    const { b, p, errs } = await L.open();
    await L.load(p, [L.EX + '/' + f]);
    const r = await p.evaluate(() => {
      const st = window.crysta.state;
      const rows = Array.from(document.querySelectorAll('#dlFw dt, #dlFw dd')).map((e) => e.tagName + ':' + e.textContent);
      const br = Array.from(document.querySelectorAll('#tblBr tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent).join(' | '));
      const hb = Array.from(document.querySelectorAll('#tblHB tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent).join(' | '));
      return { items: st.glowItems.map((g) => ({ name: g.name, type: g.type, quiet: g.quiet })), rows, br, hb, fwNote: document.getElementById('fwNote').textContent, hbNote: document.getElementById('hbNote').textContent, crystal: document.getElementById('dlCrystal').innerText, sub: document.getElementById('sub').innerText };
    });
    console.log('=== ' + f);
    console.log(JSON.stringify(r, null, 1));
    await p.screenshot({ path: L.W + '/shots/s01_' + f.replace('.cif', '') + '.png' });
    console.log('errs', errs);
    await b.close();
  }
})();
