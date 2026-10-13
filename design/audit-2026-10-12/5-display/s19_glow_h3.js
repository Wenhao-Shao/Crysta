const L = require('./lib.js');
const glowCheck = require('./glowcheck.js');
const fs = require('fs');
const H3 = L.A + '/corpus/hybrid3/structures/';
(async () => {
  const all = {};
  for (const f of process.argv[2].split(',')) {
    const { b, p } = await L.open({ ctx: { reducedMotion: 'reduce' } });
    await L.load(p, [H3 + f]);
    for (const id of ['fwTitle', 'hbTitle']) { const e = await p.$('#' + id); if (e && await e.isVisible()) await e.click(); }
    const n = await p.evaluate(() => window.crysta.state.glowItems.length);
    const reps = [];
    for (let i = 0; i < n; i++) {
      const it = await p.evaluate((i) => { const g = window.crysta.state.glowItems[i]; return { quiet: !!g.quiet, type: g.type, name: g.name }; }, i);
      if (it.quiet || it.type === 'hbond') continue;
      await p.locator('[data-glow="' + i + '"] .glowbtn').first().click();
      await p.waitForTimeout(900);
      const shown = await p.evaluate((i) => { const dd = document.querySelector('dd[data-glow="' + i + '"]'); if (dd) return dd.textContent; const tr = document.querySelector('tr[data-glow="' + i + '"]'); return Array.from(tr.children).map((c) => c.textContent).join(' | '); }, i);
      const rep = await p.evaluate(`(${glowCheck.toString()})(${JSON.stringify({ i, shown })})`);
      rep.shown = shown;
      reps.push(rep);
      if (rep.problems.length) console.log(f, '|', rep.name, '|', shown, '|', JSON.stringify(rep.values), '|', rep.problems.slice(0, 3).join('; '));
    }
    console.log(f, 'rows checked', reps.length, 'with problems', reps.filter((r) => r.problems.length).length);
    all[f] = reps;
    await b.close();
  }
  fs.writeFileSync(L.W + '/s19_glow_h3.json', JSON.stringify(all, null, 1));
})();
