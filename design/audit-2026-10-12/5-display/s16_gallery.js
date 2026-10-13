const L = require('./lib.js');
const glowCheck = require('./glowcheck.js');
const H3 = L.A + '/corpus/hybrid3/structures/';
(async () => {
  for (const f of (process.argv[2] || '1512_1.cif').split(',')) {
    const { b, p } = await L.open({ ctx: { reducedMotion: 'reduce' } });
    await L.load(p, [H3 + f]);
    await p.click('#fwTitle');
    const items = await p.evaluate(() => window.crysta.state.glowItems.map((g, i) => [i, g.type || 'quiet', g.name]));
    for (const [i, type, name] of items.filter((x) => /slab|gallery|offset|penetration/.test(x[1]))) {
      await p.click('[data-glow="' + i + '"] .glowbtn'); await p.waitForTimeout(1500);
      const shown = await p.evaluate((i) => document.querySelector('dd[data-glow="' + i + '"]').textContent, i);
      const rep = await p.evaluate(`(${glowCheck.toString()})(${JSON.stringify({ i, shown })})`);
      console.log(f, name, '|', shown, '|', JSON.stringify(rep.values), '|', rep.problems.join('; ') || 'ok', '| count', JSON.stringify(rep.count));
      await p.locator('#stage').screenshot({ path: L.W + '/shots/h3_' + f.replace(/\W/g, '_') + '_' + i + '.png' });
    }
    const fwText = await p.evaluate(() => document.getElementById('dlFw').innerText.split('\n').slice(0, 12).join(' | '));
    console.log(f, fwText);
    await b.close();
  }
})();
