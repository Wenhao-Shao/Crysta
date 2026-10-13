// Crysta's powderProfile on hand-made reflection lists: area, FWHM, peak position, K-alpha 2 position and weight.
const C = require('/home/claude/crysta/src/core.js');
const DEG = Math.PI / 180;
const lp = (t) => (1 + Math.cos(2 * t) ** 2) / (Math.sin(t) ** 2 * Math.cos(t));   // my own, from the definition
const lam1 = 1.54059, lam2 = 1.54443;
function refl(d, I) { const th = Math.asin(lam1 / (2 * d)); return { h: 1, k: 0, l: 0, d, tth: 2 * th / DEG, I, lp: lp(th), rel: 100 }; }
const out = {};
for (const [eta, fwhm, step] of [[0.5, 0.1, 0.01], [0, 0.1, 0.005], [1, 0.1, 0.005], [0.5, 0.3, 0.02], [0.5, 0.05, 0.05]]) {
  const r = refl(3.0, 1000);
  const p = C.powderProfile([r], { tthMin: 10, tthMax: 50, step, fwhm, eta });
  const y = Array.from(p.y).map((v) => v * p.max / 100);   // undo the scaling to 100
  let area = 0; for (const v of y) area += v * p.step;
  let imax = 0; for (let i = 0; i < y.length; i++) if (y[i] > y[imax]) imax = i;
  // FWHM by linear interpolation of the half-maximum crossings (exact peak height from the analytic function)
  const h = r.I * (eta * 2 / (Math.PI * fwhm) + (1 - eta) * (2 / fwhm) * Math.sqrt(Math.LN2 / Math.PI));
  let L = null, R = null;
  for (let i = 1; i < y.length; i++) {
    if (y[i - 1] < h / 2 && y[i] >= h / 2) L = p.x0 + (i - 1 + (h / 2 - y[i - 1]) / (y[i] - y[i - 1])) * p.step;
    if (y[i - 1] >= h / 2 && y[i] < h / 2) R = p.x0 + (i - 1 + (y[i - 1] - h / 2) / (y[i - 1] - y[i])) * p.step;
  }
  out['eta' + eta + '_fwhm' + fwhm + '_step' + step] = { area_over_I: area / r.I, peak_at: p.x0 + imax * p.step, tth: r.tth, fwhm_measured: R - L, height_ratio: Math.max(...y) / h };
}
// K-alpha 2: two widely separated reflections, eta 0 so that peaks do not overlap; find the second peak
for (const d of [3.0, 1.2, 0.9]) {
  const r = refl(d, 1000);
  const p = C.powderProfile([r], { tthMin: 10, tthMax: 175, step: 0.001, fwhm: 0.02, eta: 0, waves: [{ lambda: lam2, weight: 0.5 }] });
  const y = Array.from(p.y).map((v) => v * p.max / 100);
  const th2 = Math.asin(lam2 / (2 * d)), tth2 = 2 * th2 / DEG;
  // area in a window around each line
  const area = (c) => { let s = 0; for (let i = 0; i < y.length; i++) { const x = p.x0 + i * p.step; if (Math.abs(x - c) < 0.1) s += y[i] * p.step; } return s; };
  let im = 0; for (let i = 0; i < y.length; i++) { const x = p.x0 + i * p.step; if (Math.abs(x - tth2) < 0.1 && y[i] > y[im]) im = i; }
  out['ka2_d' + d] = { tth1: r.tth, tth2_expected: tth2, tth2_peak: p.x0 + im * p.step, area_ratio: area(tth2) / area(r.tth), expected_ratio: 0.5 * lp(th2) / lp(Math.asin(lam1 / (2 * d))), lambda3_ratio: 0.5 * lp(th2) / lp(Math.asin(lam1 / (2 * d))) * (lam2 / lam1) ** 3 };
}
console.log(JSON.stringify(out, null, 1));
