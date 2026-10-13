// helpers for the display audit (auditor 5)
const { chromium } = require('playwright');
const A = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit';
const W = A + '/work/5-display';
const EX = A + '/corpus/examples';
async function open(opts = {}) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }, opts.ctx || {}));
  const p = await ctx.newPage();
  // no network here: refuse outside requests at once, so that the page does not wait for them
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  p.setDefaultTimeout(20000);
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file:///home/claude/crysta/dist/Crysta.html');
  await p.waitForTimeout(500);
  return { b, ctx, p, errs };
}
async function load(p, files, wait = 2500) {
  const n0 = await p.evaluate(() => window.crysta.state.docs.length);
  await p.setInputFiles('#fileIn', files);
  await p.waitForFunction((n) => window.crysta.state.docs.length > n, n0, { timeout: 60000 });
  await p.waitForTimeout(wait);
}
// screen position (page coordinates) of a model point
async function toScreen(p, xyz) {
  return p.evaluate((q) => { const v = window.crysta.viewer(); const s = v.modelToScreen({ x: q[0], y: q[1], z: q[2] }); return [s.x, s.y]; }, xyz);
}
module.exports = { open, load, toScreen, A, W, EX };
