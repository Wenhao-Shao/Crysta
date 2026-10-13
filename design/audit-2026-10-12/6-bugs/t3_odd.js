// Odd cells in the page: atoms per cell against gemmi, the header, the Symmetry row, errors.
const H = require('./h.js');
const fs = require('fs');
const path = require('path');
const ref = JSON.parse(fs.readFileSync(path.join(H.W, 'out', 'odd_ref.json'), 'utf8'));
(async () => {
  const b = await H.launch();
  const out = {};
  for (const n of Object.keys(ref)) {
    const { p, errs } = await H.open(b);
    const t = await H.load(p, [H.F(n)], 1200);
    const s = await H.snap(p);
    const extra = await p.evaluate(() => {
      const st = window.crysta.state; const d = st.docs[st.cur];
      if (!d) return null;
      const dl = document.getElementById('dlCrystal').innerText.split('\n');
      const row = (k) => { const i = dl.indexOf(k); return i >= 0 ? dl[i + 1] : null; };
      return { nAtoms: d.info.nAtoms, uc: d.uc.atoms.length, V: d.struct.cell.V, Z: d.info.Z, sym: row('Symmetry'), fw: document.getElementById('dlFw').innerText.replace(/\n/g, ' | ').slice(0, 200), hb: document.getElementById('cardHB').hidden };
    });
    await p.screenshot({ path: path.join(H.W, 'shots', 'odd_' + n.replace(/[^A-Za-z0-9._-]/g, '_') + '.png') });
    const e = errs.filter((x) => !/ERR_TUNNEL|net::/.test(x));
    out[n] = { ms: t, ref: ref[n], crysta: extra, sub: s.sub, readout: s.readout, errs: e };
    const g = ref[n].gemmi_atoms;
    console.log((extra && g !== undefined && extra.uc !== g ? 'DIFF ' : '     ') + n, 'gemmi', g, ref[n].sg || '', '| crysta', extra && extra.uc, 'V', extra && extra.V.toFixed(2), '|', (s.sub || '').replace(/\n/g, ' / '), '|', extra && extra.sym, '| errs', e.length ? JSON.stringify(e) : 0);
    if (!extra) console.log('     readout:', s.readout);
    await p.close();
  }
  fs.writeFileSync(path.join(H.W, 'out', 't3_odd.json'), JSON.stringify(out, null, 1));
  await b.close();
})();
