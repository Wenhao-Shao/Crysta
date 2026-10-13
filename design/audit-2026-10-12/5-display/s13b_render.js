const L = require('./lib.js');
(async () => {
  const { b, p } = await L.open();
  await p.setViewportSize({ width: 984, height: 621 });
  await p.goto('file://' + L.W + '/saved_view.svg'); await p.waitForTimeout(1500);
  await p.screenshot({ path: L.W + '/shots/svg_rendered.png' });
  await b.close();
})();
