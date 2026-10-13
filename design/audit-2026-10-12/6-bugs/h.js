// Shared Playwright harness for auditor 6 (bugs and robustness).
// run scripts with: NODE_PATH=/opt/npm-tools/node_modules node script.js
const { chromium } = require('playwright');
const path = require('path');
const W = __dirname;
const PAGE = 'file:///home/claude/crysta/dist/Crysta.html';

async function launch() {
  return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}
async function open(b, opts) {
  const p = await b.newPage({ viewport: (opts && opts.viewport) || { width: 1400, height: 900 } });
  const errs = [];
  const dialogs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.dismiss(); });
  // an alert() from injected HTML would show as a dialog; also record any call
  await p.addInitScript(() => {
    window.__xss = [];
    const orig = window.alert;
    window.alert = function (m) { window.__xss.push(String(m)); };
  });
  await p.goto(PAGE);
  await p.waitForTimeout(300);
  return { p, errs, dialogs };
}
/* state as the user sees it: readout text, docs, notices, current doc */
async function snap(p) {
  return p.evaluate(() => {
    const s = window.crysta.state;
    const d = s.docs[s.cur];
    const txt = (id) => { const e = document.getElementById(id); return e ? e.innerText.trim() : null; };
    const v = window.crysta.viewer();
    let shapes = null, models = null, labels = null;
    try { shapes = v ? v.shapes ? v.shapes.length : (v.getShapes ? v.getShapes().length : null) : null; } catch (e) { shapes = 'err ' + e.message; }
    try { models = v ? (v.getModelList ? v.getModelList().length : null) : null; } catch (e) { models = 'err'; }
    try { labels = v ? (v.labels ? v.labels.length : null) : null; } catch (e) { labels = 'err'; }
    return {
      ndocs: s.docs.length, cur: s.cur, notice: s.notice, shown: s.shown,
      name: d ? d.name : null, nUc: d ? d.uc.atoms.length : null,
      readout: txt('readout'), title: txt('title'), eyebrow: txt('eyebrow'), sub: txt('sub'),
      stageMsgHidden: document.getElementById('stageMsg').hidden,
      xss: window.__xss.slice(), injectedImgs: document.querySelectorAll('img[src="x"], img[onerror]').length,
      shapes, models, labels
    };
  });
}
async function load(p, files, wait) {
  const t0 = Date.now();
  await p.setInputFiles('#fileIn', files);
  await p.waitForTimeout(wait === undefined ? 1500 : wait);
  return Date.now() - t0;
}
module.exports = { launch, open, snap, load, W, F: (n) => path.join(W, 'files', n), PAGE };
