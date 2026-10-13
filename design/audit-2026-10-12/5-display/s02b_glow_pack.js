const L = require('./lib.js');
const glowCheck = require('./glowcheck.js');
const fs = require('fs');
(async () => {
  const out = {};
  for (const f of ['PEA2PbBr4']) {
    const { b, p, errs } = await L.open({ ctx: { reducedMotion: 'reduce' } });
    await L.load(p, [L.EX + '/' + f + '.cif']); await p.click('h2:text-is("Packing")'); await p.fill('#rng20', '-0.1'); await p.press('#rng20', 'Tab'); await p.waitForTimeout(1500); await p.fill('#rng21', '1.1'); await p.press('#rng21', 'Tab'); await p.waitForTimeout(2500); console.log(await p.evaluate(() => JSON.stringify([window.crysta.state.docs[0].lo, window.crysta.state.docs[0].hi])));
    // open the two cards as a user does
    for (const id of ['fwTitle', 'hbTitle']) await p.click('#' + id);
    await p.waitForTimeout(300);
    const stage0 = await p.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.width, r.height]; });
    const n = await p.evaluate(() => window.crysta.state.glowItems.length);
    const reps = [];
    for (let i = 0; i < n; i++) {
      const quiet = await p.evaluate((i) => !!window.crysta.state.glowItems[i].quiet, i);
      const btn = p.locator('[data-glow="' + i + '"] .glowbtn').first();
      await btn.click();
      await p.waitForTimeout(quiet ? 300 : 1200);
      const shown = await p.evaluate((i) => {
        const dd = document.querySelector('dd[data-glow="' + i + '"]');
        if (dd) return dd.textContent;
        const tr = document.querySelector('tr[data-glow="' + i + '"]');
        return Array.from(tr.children).map((c) => c.textContent).join(' | ');
      }, i);
      const state = await p.evaluate(() => { const st = window.crysta.state; const n = document.getElementById('defNote'); const r = document.getElementById('stage').getBoundingClientRect(); const nr = n.getBoundingClientRect();
        return { glow: st.glow && st.glow.i, def: n.innerText, noteHidden: n.hidden, stage: [r.width, r.height], note: [nr.left - r.left, nr.top - r.top, nr.width, nr.height], pressed: Array.from(document.querySelectorAll('.glowbtn[aria-pressed="true"]')).length }; });
      let rep = { name: await p.evaluate((i) => window.crysta.state.glowItems[i].name, i), quiet };
      if (!quiet) rep = await p.evaluate(`(${glowCheck.toString()})(${JSON.stringify({ i, shown })})`);
      rep.shown = shown; rep.state = state;
      if (state.glow !== i) rep.problems = (rep.problems || []).concat(['glow index ' + state.glow]);
      if (state.stage[1] !== stage0[1]) (rep.problems = rep.problems || []).push('stage height changed ' + stage0[1] + ' -> ' + state.stage[1]);
      const shot = L.W + '/shots/glowpack_' + f + '_' + String(i).padStart(2, '0') + '.png';
      await p.locator('#stage').screenshot({ path: shot });
      rep.shot = shot;
      reps.push(rep);
    }
    out[f] = { stage0, reps, errs };
    await b.close();
  }
  fs.writeFileSync(L.W + '/s02b_glow_pack.json', JSON.stringify(out, null, 1));
  for (const f of Object.keys(out)) for (const r of out[f].reps) console.log(f, '|', r.name, '|', r.type || 'quiet', '|', r.shown, '|', JSON.stringify(r.values || {}), '|', (r.problems || []).join('; ') || 'ok', '| count', JSON.stringify(r.count || null));
})();
