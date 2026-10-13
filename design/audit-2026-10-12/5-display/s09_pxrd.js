// The PXRD window: the plot against the table, the axes, the fold arrow, the hover readout, the saved files.
const L = require('./lib.js');
const fs = require('fs');
(async () => {
  const out = {};
  const { b, ctx, p, errs } = await L.open();
  await L.load(p, [L.EX + '/PEA2PbBr4.cif']);
  const popP = ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await p.click('#btnPxrd');
  const w = await popP;
  out.popup = !!w;
  const P = w || p;   // the window, or the page with the floating window
  await P.waitForTimeout(4000);
  await P.screenshot({ path: L.W + '/shots/pxrd_open.png' });
  const geo = () => p.evaluate(() => { const s = window.crysta.pxrd.state; const g = s.geo; return g ? { xl: g.xl, xr: g.xr, yt: g.yt, ya: g.ya, W: g.W, H: g.H, view: g.view, lambda: s.lambda, tmin: s.tmin, tmax: s.tmax, minRel: s.minRel, fwhm: s.fwhm } : null; });
  const g = await geo();
  out.geo = g;
  // the reflections of the shown pattern, as the state holds them
  const refl = await p.evaluate(() => { const d = window.crysta.state.docs[0]; return d.px.pat.reflections.map((r) => ({ h: r.h, k: r.k, l: r.l, tth: r.tth, d: r.d, rel: r.rel, m: r.m })); });
  out.nRefl = refl.length;
  // the plot: the paths, the marks, the tick labels
  const svg = await P.evaluate(() => { const s = document.querySelector('#pxPlot svg'); return s ? s.outerHTML : null; });
  fs.writeFileSync(L.W + '/pxrd_plot.svg', svg || '');
  const paths = [...svg.matchAll(/<path d="([^"]+)" stroke="([^"]+)" stroke-width="([^"]+)"/g)].map((m) => ({ d: m[1], color: m[2], w: m[3] }));
  out.paths = paths.map((x) => ({ color: x.color, w: x.w, len: x.d.length }));
  const sx = (v) => g.xl + (v - g.view[0]) / (g.view[1] - g.view[0]) * (g.xr - g.xl);
  const tthOf = (x) => g.view[0] + (x - g.xl) / (g.xr - g.xl) * (g.view[1] - g.view[0]);
  // the profile path: ML pairs
  const prof = paths.find((x) => x.w === '1.5');
  const pts = [...prof.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  // its lowest y value (the highest point) and its local maxima
  let top = pts[0];
  for (const q of pts) if (q[1] < top[1]) top = q;
  out.profileTop = { x: top[0], tth: tthOf(top[0]) };
  const strongest = refl.filter((r) => r.tth >= g.tmin && r.tth <= g.tmax).sort((a, c) => c.rel - a.rel)[0];
  out.strongest = strongest;
  out.topVsStrongest = Math.abs(out.profileTop.tth - strongest.tth);
  // each reflection above 10 % has a peak of the path within one pixel column
  const pxPerDeg = (g.xr - g.xl) / (g.view[1] - g.view[0]);
  const yAt = (x) => { let best = null; for (const q of pts) if (Math.abs(q[0] - x) < 0.6) { if (!best || q[1] < best) best = q[1]; } return best; };
  out.peakChecks = refl.filter((r) => r.rel >= 10 && r.tth > g.tmin && r.tth < g.tmax).map((r) => {
    const x = sx(r.tth);
    // highest point of the path within +-0.05 deg
    let best = null; for (const q of pts) if (Math.abs(q[0] - x) <= 0.05 * pxPerDeg + 0.6) { if (!best || q[1] < best[1]) best = q; }
    return { hkl: [r.h, r.k, r.l], tth: +r.tth.toFixed(3), rel: +r.rel.toFixed(1), peakAt: best ? +tthOf(best[0]).toFixed(3) : null };
  });
  // marks
  const markPath = paths.find((x) => x.w === '1.25');
  const marks = markPath ? [...markPath.d.matchAll(/M(-?[\d.]+) (-?[\d.]+)V/g)].map((m) => +m[1]) : [];
  const wantMarks = refl.filter((r) => r.rel >= g.minRel && r.tth >= g.view[0] && r.tth <= g.view[1]).map((r) => sx(r.tth));
  out.marks = { n: marks.length, want: wantMarks.length, maxDx: marks.length === wantMarks.length ? Math.max(...marks.map((x, i) => Math.abs(x - wantMarks[i]))) : null };
  // bottom ticks
  const texts = [...svg.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({ x: +m[1], y: +m[2], t: m[3] }));
  const bottom = texts.filter((t) => Math.abs(t.y - (g.ya + 18)) < 0.6);
  out.bottomTicks = bottom.map((t) => ({ t: t.t, dx: +(t.x - sx(+t.t)).toFixed(2) }));
  const topT = texts.filter((t) => Math.abs(t.y - (g.yt - 9)) < 0.6 && /^[\d.]+$/.test(t.t));
  out.dTicks = topT.map((t) => { const d = +t.t; const tth = 2 * Math.asin(g.lambda / (2 * d)) * 180 / Math.PI; return { d: t.t, dx: +(t.x - sx(tth)).toFixed(2) }; });
  out.axisTitles = texts.filter((t) => /Intensity|2θ|d<|Å/.test(t.t)).map((t) => t.t);
  out.allTexts = texts.map((t) => t.t);
  // the table
  out.tableHead = await P.evaluate(() => Array.from(document.querySelectorAll('#pxTbl th')).map((t) => t.innerText));
  out.tableFirst = await P.evaluate(() => Array.from(document.querySelectorAll('#pxTbl tbody tr')).slice(0, 3).map((tr) => Array.from(tr.children).map((c) => c.innerText).join(' | ')));
  out.tableNote = await P.evaluate(() => document.getElementById('pxTblNote').innerText);
  out.nRows = await P.evaluate(() => document.querySelectorAll('#pxTbl tbody tr').length);
  // table rows against the reflections: d and 2theta agree with lambda
  out.tableVsBragg = await P.evaluate((lam) => Array.from(document.querySelectorAll('#pxTbl tbody tr')).slice(0, 200).reduce((mx, tr) => { const c = Array.from(tr.children).map((x) => +x.innerText); const tth = 2 * Math.asin(lam / (2 * c[3])) * 180 / Math.PI; return Math.max(mx, Math.abs(tth - c[7])); }, 0), g.lambda);
  // hover over the strongest peak
  const plotBox = await P.locator('#pxPlot').boundingBox();
  await P.mouse.move(plotBox.x + sx(strongest.tth), plotBox.y + (g.yt + g.ya) / 2);
  await P.waitForTimeout(500);
  out.tip = await P.evaluate(() => { const t = document.getElementById('pxTip'); return t && !t.hidden ? t.innerText : null; });
  await P.screenshot({ path: L.W + '/shots/pxrd_hover.png' });
  // a click on a table row marks that reflection
  await P.click('#pxTbl tbody tr:nth-child(3)'); await P.waitForTimeout(500);
  const svg2 = await P.evaluate(() => document.querySelector('#pxPlot svg').outerHTML);
  const row3 = out.tableFirst[2].split(' | ');
  const markLine = [...svg2.matchAll(/<line x1="(-?[\d.]+)" x2="(-?[\d.]+)" y1="(-?[\d.]+)" y2="(-?[\d.]+)" stroke="([^"]+)" stroke-width="1"\/>/g)].filter((m) => m[1] === m[2] && Math.abs(+m[3] - g.yt) < 0.6 && Math.abs(+m[4] - g.ya) < 0.6).map((m) => +m[1]);
  const markLabel = [...svg2.matchAll(/<text[^>]*>(\([-\d ]+\))<\/text>/g)].map((m) => m[1]);
  out.rowMark = { row: row3, lineX: markLine, want: sx(+row3[7]), label: markLabel };
  // the fold arrow of the table
  const h0 = await P.evaluate(() => [document.getElementById('pxPlot').clientHeight, document.querySelector('.px-tablecard').getBoundingClientRect().height]);
  await P.click('button[data-a="foldtbl"]'); await P.waitForTimeout(800);
  const h1 = await P.evaluate(() => [document.getElementById('pxPlot').clientHeight, document.querySelector('.px-tablecard').getBoundingClientRect().height, document.getElementById('pxTblTitle').offsetParent !== null, document.querySelector('button[data-a="foldtbl"]').title]);
  await P.screenshot({ path: L.W + '/shots/pxrd_folded.png' });
  const g2 = await geo();
  await P.click('button[data-a="foldtbl"]'); await P.waitForTimeout(800);
  const h2 = await P.evaluate(() => [document.getElementById('pxPlot').clientHeight, document.querySelector('.px-tablecard').getBoundingClientRect().height]);
  out.fold = { before: h0, folded: h1, after: h2, geoFolded: g2 && [g2.W, g2.H] };
  // saved files
  const dl = async (sel) => { const dP = P.waitForEvent('download', { timeout: 15000 }).catch(() => null); await P.click(sel); const d = await dP; if (!d) return null; const f = L.W + '/dl_' + d.suggestedFilename(); await d.saveAs(f); return f; };
  out.files = { svg: await dl('button[data-a="svg"]'), png: await dl('button[data-a="png"]'), csv: await dl('button[data-a="csv"]'), xy: await dl('button[data-a="savexy"]'), tbl: await dl('button[data-a="savetbl"]') };
  out.svgSame = out.files.svg ? fs.readFileSync(out.files.svg, 'utf8').replace(/<rect class="ui"[^>]*\/>|<line class="ui"[^>]*\/>/g, '').length : null;
  // stacked and square root
  await P.click('button[data-a="stack"]'); await P.click('button[data-a="sqrt"]'); await P.waitForTimeout(600);
  await P.screenshot({ path: L.W + '/shots/pxrd_stack_sqrt.png' });
  out.stackTitle = await P.evaluate(() => Array.from(document.querySelectorAll('#pxPlot svg text')).map((t) => t.textContent).filter((t) => /Intensity/.test(t)));
  out.errs = errs;
  fs.writeFileSync(L.W + '/s09_pxrd.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
