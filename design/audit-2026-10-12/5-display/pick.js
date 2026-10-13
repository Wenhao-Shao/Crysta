// Find the drawn atoms on the screen, and click one as a user does.
// screenAtoms(p): every atom of the 3Dmol model with page x, y, depth (larger = nearer the eye), frontmost flag.
async function installRecorder(p) {
  await p.evaluate(() => {
    if (window.__recOn) return;
    window.__recOn = true;
    window.__rec = [];
    const v = window.crysta.viewer();
    for (const fn of ['addCylinder', 'addSphere', 'addLabel', 'addCustom', 'addArrow']) {
      const o = v[fn].bind(v);
      v[fn] = function (...args) {
        try {
          const a = args[0];
          if (fn === 'addLabel') window.__rec.push({ fn, text: a, o: { position: args[1].position, fontColor: args[1].fontColor, backgroundColor: args[1].backgroundColor, fontSize: args[1].fontSize } });
          else if (fn === 'addCustom') window.__rec.push({ fn, n: a.faceArr.length, color: a.color, opacity: a.opacity, v: a.vertexArr.length < 400 ? a.vertexArr : null });
          else window.__rec.push({ fn, o: { start: a.start, end: a.end, center: a.center, radius: a.radius, color: a.color, opacity: a.opacity, dashed: a.dashed } });
        } catch (e) { /* ignore */ }
        return o(...args);
      };
    }
    // keep the scene of the last full render: render() starts with removeAllShapes
    const rs = v.removeAllShapes.bind(v);
    v.removeAllShapes = function () { window.__last = window.__rec; window.__rec = []; return rs(); };
  });
}
async function screenAtoms(p) {
  return p.evaluate(() => {
    const v = window.crysta.viewer();
    const m = v.getModel(0);
    const atoms = m.selectedAtoms({});
    const S = (q) => { const s = v.modelToScreen({ x: q[0], y: q[1], z: q[2] }); return [s.x, s.y]; };
    const o = S([0, 0, 0]), ex = S([1, 0, 0]), ey = S([0, 1, 0]), ez = S([0, 0, 1]);
    const M = [[ex[0] - o[0], ey[0] - o[0], ez[0] - o[0]], [ex[1] - o[1], ey[1] - o[1], ez[1] - o[1]]];
    const scale = Math.hypot(M[0][0], M[0][1], M[0][2]);
    const z = [M[0][1] * -M[1][2] - M[0][2] * -M[1][1], M[0][2] * -M[1][0] - M[0][0] * -M[1][2], M[0][0] * -M[1][1] - M[0][1] * -M[1][0]];
    const zl = Math.hypot(z[0], z[1], z[2]);
    const rOf = (el) => (/^(Pb|Sn|Cd|Mn|Cu|Ca|Zn|Fe|Co|Ni|Bi|Ge|Ag)$/.test(el) ? 0.275 : /^(F|Cl|Br|I)$/.test(el) ? 0.21 : el === 'H' ? 0.08 : 0.15);
    const list = atoms.map((a, i) => { const s = S([a.x, a.y, a.z]); return { i, el: a.elem, label: a.xl, f: a.xf, xyz: [a.x, a.y, a.z], sx: s[0], sy: s[1], depth: (a.x * z[0] + a.y * z[1] + a.z * z[2]) / zl, r: rOf(a.elem) * scale }; });
    const box = document.getElementById('gl').getBoundingClientRect();
    for (const a of list) {
      a.front = !list.some((b) => b !== a && b.depth > a.depth && Math.hypot(b.sx - a.sx, b.sy - a.sy) < b.r + Math.min(4, a.r * 0.6));
      a.onStage = a.sx - window.scrollX > box.left + 8 && a.sx - window.scrollX < box.right - 8 && a.sy - window.scrollY > box.top + 60 && a.sy - window.scrollY < box.bottom - 50;
    }
    return { list, scale };
  });
}
async function clickAtom(p, a) {
  const sc = await p.evaluate(() => [window.scrollX, window.scrollY]);
  await p.mouse.click(a.sx - sc[0], a.sy - sc[1]);
  await p.waitForTimeout(900);
}
module.exports = { installRecorder, screenAtoms, clickAtom };
