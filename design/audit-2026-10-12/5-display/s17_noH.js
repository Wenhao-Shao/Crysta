const L = require('./lib.js');
const glowCheck = require('./glowcheck.js');
const H3 = L.A + '/corpus/hybrid3/structures/';
(async () => {
  const { b, p } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await L.load(p, [H3 + '1209_1.cif']);
  await p.click('#hbTitle');
  const head = await p.evaluate(() => [document.getElementById('hbTitle').innerText, document.querySelector('#tblHB thead').innerText, document.getElementById('hbNote').innerText, document.querySelectorAll('#tblHB tbody tr').length]);
  console.log(JSON.stringify(head));
  const items = await p.evaluate(() => window.crysta.state.glowItems.map((g, i) => [i, g.type || 'quiet', g.name]).filter((x) => x[1] === 'hbond'));
  for (const [i, , name] of items.slice(0, 4)) {
    await p.click('[data-glow="' + i + '"] .glowbtn'); await p.waitForTimeout(1200);
    const shown = await p.evaluate((i) => Array.from(document.querySelector('tr[data-glow="' + i + '"]').children).map((c) => c.textContent).join(' | '), i);
    const rep = await p.evaluate(`(${glowCheck.toString()})(${JSON.stringify({ i, shown })})`);
    // the no-H case: lines D...A; check their length against the shown distance
    const lens = await p.evaluate((i) => { const C = window.XtalCore, st = window.crysta.state, d = st.docs[0]; const blk = C.assemble(d.uc, d.lo, d.hi, d.polyRules); const set = C.highlightSet(blk, d.uc, d.info, st.glowItems[i]); return set.lines.map((ln) => Math.hypot(ln[0][0] - ln[1][0], ln[0][1] - ln[1][1], ln[0][2] - ln[1][2]).toFixed(4)); }, i);
    console.log(name, '|', shown, '| lines', JSON.stringify(Array.from(new Set(lens))), '| count', JSON.stringify(rep.count), '| def', await p.evaluate(() => document.getElementById('defNote').innerText.slice(0, 200)));
  }
  await p.locator('#stage').screenshot({ path: L.W + '/shots/noH_contact.png' });
  await b.close();
})();
