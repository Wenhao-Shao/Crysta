// Load each made-up file in a fresh page; record the message, the errors, the time, and whether a good file still opens after it.
const H = require('./h.js');
const fs = require('fs');
const path = require('path');
const QUARTZ = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/examples/quartz_SiO2.cif';
const only = process.argv.slice(2);
(async () => {
  const b = await H.launch();
  const files = fs.readdirSync(path.join(H.W, 'files')).filter((n) => !only.length || only.some((o) => n.includes(o))).filter((n) => !/^large_junk|bomb|1000/.test(n) || only.length);
  const out = {};
  for (const n of files) {
    const { p, errs, dialogs } = await H.open(b);
    let rec = { file: n };
    try {
      const t = await H.load(p, [H.F(n)], 1200);
      rec.ms = t;
      rec.after = await H.snap(p);
      rec.dlCrystal = await p.evaluate(() => document.getElementById('dlCrystal').innerText.replace(/\n/g, ' | ').slice(0, 600));
      rec.cmp = await p.evaluate(() => document.getElementById('tblCmp').innerText.replace(/\s+/g, ' ').slice(0, 300));
      await p.screenshot({ path: path.join(H.W, 'shots', 'f_' + n.replace(/[^A-Za-z0-9._-]/g, '_') + '.png') });
      await H.load(p, [QUARTZ], 1200);
      const s2 = await H.snap(p);
      rec.goodAfter = { ndocs: s2.ndocs, name: s2.name, nUc: s2.nUc, shown: s2.shown, readout: s2.readout.slice(0, 200) };
    } catch (e) { rec.harnessError = e.message; }
    rec.errs = errs.filter((e) => !/ERR_TUNNEL|net::/.test(e));
    rec.dialogs = dialogs;
    out[n] = rec;
    const a = rec.after || {};
    console.log('==', n, rec.ms + 'ms', 'docs', a.ndocs, 'uc', a.nUc, 'shown', a.shown, 'xss', JSON.stringify(a.xss), 'imgs', a.injectedImgs, 'dialogs', JSON.stringify(dialogs));
    console.log('   readout:', (a.readout || '').slice(0, 300).replace(/\n/g, ' / '));
    console.log('   title:', (a.title || '').slice(0, 80), '| eyebrow:', (a.eyebrow || '').slice(0, 80), '| sub:', (a.sub || '').replace(/\n/g, ' / ').slice(0, 150));
    console.log('   crystal:', (rec.dlCrystal || '').slice(0, 400));
    console.log('   errs:', JSON.stringify(rec.errs).slice(0, 500));
    console.log('   good after:', JSON.stringify(rec.goodAfter));
    await p.close();
  }
  fs.writeFileSync(path.join(H.W, 'out', 't1_files' + (only.length ? '_' + only.join('_').replace(/[^A-Za-z0-9]/g, '') : '') + '.json'), JSON.stringify(out, null, 1));
  await b.close();
})();
