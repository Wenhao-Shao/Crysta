const L = require('./lib.js');
(async () => {
  const { b, p, errs } = await L.open({ ctx: { reducedMotion: 'reduce' } });
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  await p.click('#fwTitle');
  const geo = () => p.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(); const n = document.getElementById('defNote'); const r = n.getBoundingClientRect(); const gl = document.getElementById('gl').getBoundingClientRect();
    return { hidden: n.hidden, note: [Math.round(r.left - s.left), Math.round(r.top - s.top), Math.round(r.width), Math.round(r.height)], stage: [Math.round(s.width), Math.round(s.height)], gl: [Math.round(gl.width), Math.round(gl.height)], inside: r.left >= s.left - 0.5 && r.top >= s.top - 0.5 && r.right <= s.right + 0.5 && r.bottom <= s.bottom + 0.5, glow: window.crysta.state.glow ? window.crysta.state.glow.i : null, defPos: window.crysta.state.defPos }; });
  const out = {};
  out.before = await geo();
  await p.click('[data-glow="3"] .glowbtn'); await p.waitForTimeout(1200);
  out.open = await geo();
  // drag the note by its body
  const n = await p.locator('#defNote').boundingBox();
  await p.mouse.move(n.x + 60, n.y + 50); await p.mouse.down(); await p.mouse.move(n.x - 200, n.y + 150, { steps: 8 }); await p.mouse.move(n.x - 400, n.y + 300, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(800);
  out.dragged = await geo();
  out.viewAfterDrag = await p.evaluate(() => window.crysta.viewer().getView().map((x) => +x.toFixed(4)));
  await p.screenshot({ path: L.W + '/shots/defnote_dragged.png' });
  // drag it far out of the stage: it must stay inside
  const n2 = await p.locator('#defNote').boundingBox();
  await p.mouse.move(n2.x + 60, n2.y + 20); await p.mouse.down(); await p.mouse.move(n2.x + 2000, n2.y + 2000, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(500);
  out.draggedOut = await geo();
  // another row keeps the place
  await p.click('[data-glow="12"] .glowbtn'); await p.waitForTimeout(1200);
  out.otherRow = await geo();
  // a narrower window
  await p.setViewportSize({ width: 1024, height: 700 }); await p.waitForTimeout(1500);
  out.resized = await geo();
  await p.screenshot({ path: L.W + '/shots/defnote_resized.png' });
  // close with x, then open and close with Escape
  await p.click('#glowStop'); await p.waitForTimeout(800);
  out.closedX = await geo();
  await p.click('[data-glow="4"] .glowbtn'); await p.waitForTimeout(1000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  out.closedEsc = await geo();
  // press the same row twice
  await p.click('[data-glow="4"] .glowbtn'); await p.waitForTimeout(800);
  await p.click('[data-glow="4"] .glowbtn'); await p.waitForTimeout(800);
  out.toggled = await geo();
  // a long note on a short stage: phone height
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1500);
  await p.click('[data-glow="30"] .glowbtn'); await p.waitForTimeout(1200);
  out.phone = await geo();
  out.phoneNoteScroll = await p.evaluate(() => { const n = document.getElementById('defNote'); return [n.scrollHeight, n.clientHeight]; });
  await p.locator('#stage').screenshot({ path: L.W + '/shots/defnote_phone.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
