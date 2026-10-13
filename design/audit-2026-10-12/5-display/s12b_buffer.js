const L = require('./lib.js');
(async () => {
  const { b, p } = await L.open();
  await L.load(p, [L.EX + '/urea.cif']);
  const r = await p.evaluate(() => {
    const v = window.crysta.viewer(); const gl = document.getElementById('gl'); const cv = v.getCanvas();
    const ctx = (v.renderer && (v.renderer.context || (v.renderer.getContext && v.renderer.getContext()))) || cv.getContext('webgl2') || cv.getContext('webgl') || cv.getContext('experimental-webgl');
    const out = [];
    for (const k of [1, 2, 3, 4]) {
      const w = 984 * k, h = 621 * k;
      gl.style.inset = 'auto'; gl.style.left = '0'; gl.style.top = '0'; gl.style.width = w + 'px'; gl.style.height = h + 'px'; v.resize();
      out.push({ k, css: [w, h], canvas: [cv.width, cv.height], buffer: ctx ? [ctx.drawingBufferWidth, ctx.drawingBufferHeight] : null, maxViewport: ctx ? Array.from(ctx.getParameter(ctx.MAX_VIEWPORT_DIMS)) : null, maxRB: ctx ? ctx.getParameter(ctx.MAX_RENDERBUFFER_SIZE) : null });
    }
    gl.style.inset = ''; gl.style.left = ''; gl.style.top = ''; gl.style.width = ''; gl.style.height = ''; v.resize();
    return out;
  });
  console.log(JSON.stringify(r, null, 0));
  await b.close();
})();
