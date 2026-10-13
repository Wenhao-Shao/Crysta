const L = require('./lib.js');
const fs = require('fs');
(async () => {
  for (const dpr of [1, 2]) {
    const { b, p } = await L.open({ ctx: { deviceScaleFactor: dpr } });
    await L.load(p, [L.EX + '/urea.cif']);
    const info = await p.evaluate(() => { const v = window.crysta.viewer(); const c = v.getCanvas(); const gl = document.getElementById('gl'); return { css: [gl.clientWidth, gl.clientHeight], canvas: [c.width, c.height], dpr: window.devicePixelRatio }; });
    await p.click('h2:text-is("Export")');
    const res = [];
    for (const k of ['1', '2', '4']) {
      await p.selectOption('#pngScale', k);
      const dP = p.waitForEvent('download', { timeout: 200000 }).catch(() => null);
      const t0 = Date.now(); await p.click('#btnPng', { timeout: 180000 }); console.log('k', k, 'click ms', Date.now() - t0);
      const d = await dP; if (!d) { res.push([k, null]); continue; }
      const f = L.W + '/pngsize_dpr' + dpr + '_' + k + '.png'; await d.saveAs(f);
      const buf = fs.readFileSync(f); res.push([k, buf.readUInt32BE(16), buf.readUInt32BE(20)]);
      await p.waitForTimeout(800);
    }
    const notice = await p.evaluate(() => window.crysta.state.notice);
    console.log('dpr', dpr, JSON.stringify(info), JSON.stringify(res), notice);
    await b.close();
  }
})();
