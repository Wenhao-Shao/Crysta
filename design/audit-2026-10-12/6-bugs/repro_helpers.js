async function freeAtoms(p, n) {
  return p.evaluate((n) => {
    const v = window.crysta.viewer(); const m = v.getModel(); const box = document.getElementById('gl').getBoundingClientRect();
    const pts = new Map();
    for (const a of m.selectedAtoms({})) { const s = v.modelToScreen({ x: a.x, y: a.y, z: a.z }); const x = s.x - scrollX, y = s.y - scrollY; const k = Math.round(x) + ',' + Math.round(y); if (!pts.has(k)) pts.set(k, { x, y }); }
    const P = Array.from(pts.values()); const ok = [];
    for (const a of P) {
      if (ok.length >= n) break;
      if (a.x < box.left + 60 || a.x > box.right - 60 || a.y < Math.max(box.top, 0) + 40 || a.y > Math.min(box.bottom, innerHeight) - 60) continue;
      if (P.some((b) => b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 10) || ok.some((b) => Math.hypot(b.x - a.x, b.y - a.y) < 24)) continue;
      ok.push(a);
    }
    return ok;
  }, n);
}
const click = async (p, a) => { await p.mouse.move(a.x, a.y); await p.waitForTimeout(60); await p.mouse.click(a.x, a.y); await p.waitForTimeout(250); };
module.exports = { freeAtoms, click };
