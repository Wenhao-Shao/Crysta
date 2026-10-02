/* Crystal core: CIF parsing, symmetry expansion, molecule assembly, geometry.
   Pure functions, no DOM. Works in the browser (window.XtalCore) and in Node. */
(function (root) {
  'use strict';

  // Covalent radii (Cordero et al., Dalton Trans. 2008), in angstrom
  const RC = {
    H: 0.31, D: 0.31, He: 0.28, Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57,
    Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, K: 2.03, Ca: 1.76,
    Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39, Fe: 1.32, Co: 1.26, Ni: 1.24, Cu: 1.32,
    Zn: 1.22, Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20, Br: 1.20, Rb: 2.20, Sr: 1.95, Y: 1.90,
    Zr: 1.75, Nb: 1.64, Mo: 1.54, Ru: 1.46, Rh: 1.42, Pd: 1.39, Ag: 1.45, Cd: 1.44, In: 1.42,
    Sn: 1.39, Sb: 1.39, Te: 1.38, I: 1.39, Cs: 2.44, Ba: 2.15, La: 2.07, Ce: 2.04, Eu: 1.98,
    Gd: 1.96, Tb: 1.94, Yb: 1.87, Hf: 1.75, Ta: 1.70, W: 1.62, Re: 1.51, Os: 1.44, Ir: 1.41,
    Pt: 1.36, Au: 1.36, Hg: 1.32, Tl: 1.45, Pb: 1.46, Bi: 1.48
  };
  const MASS = {
    H: 1.008, D: 2.014, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
    F: 18.998, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45,
    K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
    Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971,
    Br: 79.904, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Ru: 101.07,
    Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60,
    I: 126.90, Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Eu: 151.96, Gd: 157.25, Tb: 158.93,
    Yb: 173.05, Hf: 178.49, Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08,
    Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98
  };
  // Bondi van der Waals radii, used for hydrogen-bond cutoffs
  const VDW = { H: 1.20, N: 1.55, O: 1.52, F: 1.47, S: 1.80, Cl: 1.75, Br: 1.85, I: 1.98 };
  const NONMETAL = new Set(['H', 'D', 'He', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'As', 'Se', 'Br', 'Te', 'I']);
  const HALIDE = new Set(['F', 'Cl', 'Br', 'I']);
  const ALKALI = new Set(['Li', 'Na', 'K', 'Rb', 'Cs']);
  const isMetal = (el) => !NONMETAL.has(el);
  /* metals that sit at the centre of a halide polyhedron; alkali ions are treated as A-site ions */
  const isCenter = (el) => isMetal(el) && !ALKALI.has(el);

  /* ---------- space-group operators from a Hall symbol ---------- */
  let SG_TABLE = {};
  const setSgTable = (t) => { SG_TABLE = t || {}; };
  const HALL_ROT = {
    z: { 1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 2: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], 3: [[0, -1, 0], [1, -1, 0], [0, 0, 1]], 4: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], 6: [[1, -1, 0], [1, 0, 0], [0, 0, 1]] },
    x: { 1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 2: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], 3: [[1, 0, 0], [0, 0, -1], [0, 1, -1]], 4: [[1, 0, 0], [0, 0, -1], [0, 1, 0]], 6: [[1, 0, 0], [0, 1, -1], [0, 1, 0]] },
    y: { 1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 2: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], 3: [[-1, 0, 1], [0, 1, 0], [-1, 0, 0]], 4: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], 6: [[0, 0, 1], [0, 1, 0], [-1, 0, 1]] }
  };
  const HALL_DIAG = {
    "'": { z: [[0, -1, 0], [-1, 0, 0], [0, 0, -1]], x: [[-1, 0, 0], [0, 0, -1], [0, -1, 0]], y: [[0, 0, -1], [0, -1, 0], [-1, 0, 0]] },
    '"': { z: [[0, 1, 0], [1, 0, 0], [0, 0, -1]], x: [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], y: [[0, 0, 1], [0, -1, 0], [1, 0, 0]] }
  };
  const HALL_LATT = {
    P: [[0, 0, 0]], A: [[0, 0, 0], [0, 0.5, 0.5]], B: [[0, 0, 0], [0.5, 0, 0.5]], C: [[0, 0, 0], [0.5, 0.5, 0]], I: [[0, 0, 0], [0.5, 0.5, 0.5]],
    R: [[0, 0, 0], [2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 2 / 3]], S: [[0, 0, 0], [1 / 3, 1 / 3, 2 / 3], [2 / 3, 2 / 3, 1 / 3]],
    T: [[0, 0, 0], [1 / 3, 2 / 3, 1 / 3], [2 / 3, 1 / 3, 2 / 3]], F: [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]
  };
  const HALL_TR = { a: [0.5, 0, 0], b: [0, 0.5, 0], c: [0, 0, 0.5], n: [0.5, 0.5, 0.5], u: [0.25, 0, 0], v: [0, 0.25, 0], w: [0, 0, 0.25], d: [0.25, 0.25, 0.25] };
  const mod1 = (x) => { let y = x - Math.floor(x); if (y > 1 - 1e-7) y = 0; return y; };
  function opMul(p, q) {
    const R = [0, 1, 2].map((i) => [0, 1, 2].map((j) => p.R[i][0] * q.R[0][j] + p.R[i][1] * q.R[1][j] + p.R[i][2] * q.R[2][j]));
    const T = [0, 1, 2].map((i) => mod1(p.R[i][0] * q.T[0] + p.R[i][1] * q.T[1] + p.R[i][2] * q.T[2] + p.T[i]));
    return { R, T };
  }
  const opKey = (o) => o.R.map((r) => r.join(',')).join(';') + '|' + o.T.map((t) => Math.round(mod1(t) * 144) % 144).join(',');
  function hallOps(symbol) {
    let s = String(symbol).trim().replace(/_/g, ' ');
    let shift = [0, 0, 0];
    const sm = s.match(/\(\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*\)/);
    if (sm) { shift = [+sm[1] / 12, +sm[2] / 12, +sm[3] / 12]; s = s.replace(sm[0], '').trim(); }
    const parts = s.split(/\s+/);
    let L = parts.shift();
    if (!L) return null;
    let centro = false;
    if (L[0] === '-') { centro = true; L = L.slice(1); }
    const latt = HALL_LATT[L.toUpperCase()];
    if (!latt) return null;
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const gens = latt.slice(1).map((t) => ({ R: I3, T: t }));
    if (centro) gens.push({ R: [[-1, 0, 0], [0, -1, 0], [0, 0, -1]], T: [0, 0, 0] });
    let prevN = 0, prevAxis = 'z';
    for (let i = 0; i < parts.length; i++) {
      let p = parts[i];
      let improper = false;
      if (p[0] === '-') { improper = true; p = p.slice(1); }
      const N = +p[0];
      if (![1, 2, 3, 4, 6].includes(N)) return null;
      let rest = p.slice(1);
      let axis = null;
      if (/^[xyz'"*]/.test(rest)) { axis = rest[0]; rest = rest.slice(1); }
      if (!axis) {
        if (i === 0) axis = 'z';
        else if (i === 1) axis = N === 2 ? ((prevN === 2 || prevN === 4) ? 'x' : "'") : (N === 3 ? '*' : 'z');
        else axis = N === 3 ? '*' : 'z';
      }
      let R;
      if (axis === '*') R = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];
      else if (axis === "'" || axis === '"') R = HALL_DIAG[axis][prevAxis];
      else R = HALL_ROT[axis][N];
      if (!R) return null;
      const T = [0, 0, 0];
      for (const ch of rest) {
        if (/[1-5]/.test(ch)) {
          const k = 'xyz'.indexOf(axis);
          if (k < 0) return null;
          T[k] += (+ch) / N;
        } else if (HALL_TR[ch]) {
          for (let k = 0; k < 3; k++) T[k] += HALL_TR[ch][k];
        } else return null;
      }
      gens.push({ R: improper ? R.map((r) => r.map((x) => -x)) : R, T: T.map(mod1) });
      prevN = N;
      if ('xyz'.includes(axis)) prevAxis = axis;
    }
    // origin shift: op' = (I, v) op (I, -v)
    const moved = gens.map((g) => ({
      R: g.R,
      T: [0, 1, 2].map((i) => mod1(g.T[i] + shift[i] - (g.R[i][0] * shift[0] + g.R[i][1] * shift[1] + g.R[i][2] * shift[2])))
    }));
    const group = [{ R: I3, T: [0, 0, 0] }];
    const seen = new Set([opKey(group[0])]);
    for (let q = 0; q < group.length; q++) {
      for (const g of moved) {
        const n = opMul(g, group[q]);
        const k = opKey(n);
        if (!seen.has(k)) { seen.add(k); group.push(n); if (group.length > 200) return null; }
      }
    }
    return group;
  }
  /* operators for a Hermann-Mauguin symbol or an IT number, through the symbol table */
  function symbolOps(hm, number, cell) {
    const tryKey = (k) => (SG_TABLE[k] ? { hall: SG_TABLE[k], ops: hallOps(SG_TABLE[k]) } : null);
    if (hm) {
      let k = String(hm).replace(/[\s_]/g, '');
      let ext = '';
      const c = k.indexOf(':');
      if (c >= 0) { ext = k.slice(c).toUpperCase(); k = k.slice(0, c); }
      k = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
      if (!ext && k[0] === 'R' && cell) ext = Math.abs(cell.ga - 120) < 0.5 && Math.abs(cell.al - 90) < 0.5 ? ':H' : ':R';
      const r = tryKey(k + ext) || tryKey(k);
      if (r && r.ops) { r.via = 'hm'; return r; }
    }
    if (number) { const r = tryKey('#' + parseInt(number, 10)); if (r && r.ops) { r.via = 'number'; return r; } }
    return null;
  }

  /* ---------- CIF text -> blocks ---------- */
  function tokenize(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const toks = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line[0] === ';') {
        const buf = [line.slice(1)];
        i++;
        while (i < lines.length && lines[i][0] !== ';') { buf.push(lines[i]); i++; }
        toks.push({ v: buf.join('\n').trim(), q: true });
        line = i < lines.length ? lines[i].slice(1) : '';
      }
      let p = 0;
      const n = line.length;
      while (p < n) {
        const ch = line[p];
        if (ch === ' ' || ch === '\t') { p++; continue; }
        if (ch === '#') break;
        if (ch === "'" || ch === '"') {
          let e = p + 1;
          while (e < n && !(line[e] === ch && (e + 1 === n || line[e + 1] === ' ' || line[e + 1] === '\t'))) e++;
          toks.push({ v: line.slice(p + 1, e), q: true });
          p = e + 1;
          continue;
        }
        let e = p;
        while (e < n && line[e] !== ' ' && line[e] !== '\t') e++;
        toks.push({ v: line.slice(p, e), q: false });
        p = e;
      }
    }
    return toks;
  }

  function parseBlocks(text) {
    const t = tokenize(text);
    const blocks = [];
    let cur = null;
    let i = 0;
    const isTag = (k) => !k.q && k.v[0] === '_';
    const isKw = (k) => !k.q && /^(data_|loop_$|save_|global_$|stop_$)/i.test(k.v);
    while (i < t.length) {
      const k = t[i];
      if (!k.q && /^data_/i.test(k.v)) {
        cur = { name: k.v.slice(5), items: {}, loops: [] };
        blocks.push(cur);
        i++;
        continue;
      }
      if (!cur) { i++; continue; }
      if (!k.q && /^loop_$/i.test(k.v)) {
        i++;
        const tags = [];
        while (i < t.length && isTag(t[i])) { tags.push(t[i].v.toLowerCase()); i++; }
        const vals = [];
        while (i < t.length && !isTag(t[i]) && !isKw(t[i])) { vals.push(t[i].v); i++; }
        const rows = [];
        if (tags.length) for (let r = 0; r + tags.length <= vals.length; r += tags.length) rows.push(vals.slice(r, r + tags.length));
        cur.loops.push({ tags, rows });
        continue;
      }
      if (isTag(k)) {
        const nx = t[i + 1];
        if (nx && !isTag(nx) && !isKw(nx)) { cur.items[k.v.toLowerCase()] = nx.v; i += 2; } else i++;
        continue;
      }
      i++;
    }
    return blocks;
  }

  function parseSymop(s) {
    const parts = s.replace(/\s+/g, '').toLowerCase().split(',');
    if (parts.length !== 3) return null;
    const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const T = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      const terms = parts[r].match(/[+-]?[^+-]+/g);
      if (!terms) return null;
      for (const term of terms) {
        let sign = 1;
        let body = term;
        if (body[0] === '+') body = body.slice(1);
        else if (body[0] === '-') { sign = -1; body = body.slice(1); }
        const m = body.match(/^(?:(\d*\.?\d+)(?:\/(\d+))?\*?)?([xyz])?$/);
        if (!m || (m[1] === undefined && m[3] === undefined)) return null;
        const val = m[1] === undefined ? 1 : parseFloat(m[1]) / (m[2] ? parseFloat(m[2]) : 1);
        if (m[3]) R[r]['xyz'.indexOf(m[3])] += sign * val;
        else T[r] += sign * val;
      }
    }
    return { R, T, text: s.trim() };
  }

  function elementOf(typeSymbol, label) {
    const norm = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (typeSymbol && typeSymbol !== '?' && typeSymbol !== '.') {
      const m = typeSymbol.match(/^[A-Za-z]{1,2}/);
      if (m) {
        const two = norm(m[0]);
        if (RC[two] !== undefined) return two === 'D' ? 'H' : two;
        const one = two.charAt(0);
        if (RC[one] !== undefined) return one === 'D' ? 'H' : one;
      }
    }
    const m = (label || '').match(/^[A-Za-z]{1,2}/);
    if (!m) return null;
    const raw = m[0];
    if (raw.length === 2) {
      const two = norm(raw);
      const secondLower = raw[1] === raw[1].toLowerCase();
      if (RC[two] !== undefined && (secondLower || RC[raw[0].toUpperCase()] === undefined)) return two;
    }
    const one = raw[0].toUpperCase();
    if (RC[one] !== undefined) return one === 'D' ? 'H' : one;
    return null;
  }

  /* ---------- small vector helpers ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => Math.sqrt(dot(a, a));
  const angleDeg = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (norm(u) * norm(v))))) * 180 / Math.PI;
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };

  function makeCell(a, b, c, al, be, ga) {
    const rad = Math.PI / 180;
    const ca = Math.cos(al * rad), cb = Math.cos(be * rad), cg = Math.cos(ga * rad), sg = Math.sin(ga * rad);
    const A = [a, 0, 0];
    const B = [b * cg, b * sg, 0];
    const cx = c * cb;
    const cy = c * (ca - cb * cg) / sg;
    const C = [cx, cy, Math.sqrt(Math.max(0, c * c - cx * cx - cy * cy))];
    const V = dot(A, cross(B, C));
    const recip = [cross(B, C), cross(C, A), cross(A, B)].map((v) => v.map((x) => x / V));
    const toCart = (f) => [
      f[0] * A[0] + f[1] * B[0] + f[2] * C[0],
      f[0] * A[1] + f[1] * B[1] + f[2] * C[1],
      f[0] * A[2] + f[1] * B[2] + f[2] * C[2]
    ];
    return { a, b, c, al, be, ga, A, B, C, V, recip, toCart };
  }

  /* ---------- blocks -> structure ---------- */
  function readStructure(text) {
    const blocks = parseBlocks(text);
    let chosen = null;
    let siteLoop = null;
    for (const b of blocks) {
      const lp = b.loops.find((l) => l.tags.includes('_atom_site_fract_x'));
      if (lp && lp.rows.length) { chosen = b; siteLoop = lp; break; }
    }
    if (!chosen) throw new Error('No atom sites with fractional coordinates were found in this file.');
    const it = chosen.items;
    const pick = (...tags) => { for (const t of tags) if (it[t] !== undefined && it[t] !== '?' && it[t] !== '.') return it[t]; return null; };
    const cellRaw = ['_cell_length_a', '_cell_length_b', '_cell_length_c', '_cell_angle_alpha', '_cell_angle_beta', '_cell_angle_gamma'].map((t) => it[t]);
    const cellNum = cellRaw.map((s) => parseFloat(s));
    if (cellNum.some((x) => !isFinite(x))) throw new Error('The unit cell parameters are missing or unreadable.');
    const cell = makeCell(...cellNum);

    let ops = [];
    for (const l of chosen.loops) {
      const idx = l.tags.findIndex((t) => t === '_symmetry_equiv_pos_as_xyz' || t === '_space_group_symop_operation_xyz' || t === '_space_group_symop.operation_xyz');
      if (idx >= 0) { ops = l.rows.map((r) => parseSymop(r[idx])).filter(Boolean); break; }
    }
    const single = pick('_symmetry_equiv_pos_as_xyz', '_space_group_symop_operation_xyz');
    if (!ops.length && single) { const o = parseSymop(single); if (o) ops = [o]; }
    let symSource = ops.length ? 'listed' : 'none';
    if (!ops.length) {
      const hall = pick('_space_group_name_hall', '_symmetry_space_group_name_hall');
      const hm = pick('_symmetry_space_group_name_h-m', '_space_group_name_h-m_alt', '_space_group_name_h-m');
      const num = pick('_symmetry_int_tables_number', '_space_group_it_number');
      const fromHall = hall ? hallOps(hall) : null;
      if (fromHall) { ops = fromHall; symSource = 'hall'; } else {
        const r = symbolOps(hm, num, cell);
        if (r) { ops = r.ops; symSource = r.via; }
      }
    }
    if (!ops.length) ops = [parseSymop('x,y,z')];

    const col = (t) => siteLoop.tags.indexOf(t);
    const cL = col('_atom_site_label'), cT = col('_atom_site_type_symbol');
    const cX = col('_atom_site_fract_x'), cY = col('_atom_site_fract_y'), cZ = col('_atom_site_fract_z');
    const cO = col('_atom_site_occupancy'), cD = col('_atom_site_disorder_group'), cA = col('_atom_site_disorder_assembly');
    const sites = [];
    for (const r of siteLoop.rows) {
      const f = [parseFloat(r[cX]), parseFloat(r[cY]), parseFloat(r[cZ])];
      if (f.some((x) => !isFinite(x))) continue;
      const label = cL >= 0 ? r[cL] : (cT >= 0 ? r[cT] : '?');
      const el = elementOf(cT >= 0 ? r[cT] : null, label);
      if (!el) continue;
      const occ = cO >= 0 && isFinite(parseFloat(r[cO])) ? parseFloat(r[cO]) : 1;
      let dg = cD >= 0 ? r[cD] : '.';
      if (dg === '?' || dg === '0' || dg === '') dg = '.';
      let asm = cA >= 0 ? r[cA] : '.';
      if (asm === '?' || asm === '') asm = '.';
      sites.push({ label, el, f, occ, dg, asm, minor: false, symdis: dg !== '.' && /^-/.test(dg) });
    }
    // within each disorder assembly, the group with the highest mean occupancy is the major part
    const groups = new Map();
    for (const st of sites) {
      if (st.dg === '.') continue;
      const k = st.asm + '|' + st.dg;
      const g = groups.get(k) || { asm: st.asm, dg: st.dg, sum: 0, n: 0 };
      g.sum += st.occ; g.n++;
      groups.set(k, g);
    }
    const best = new Map();
    for (const g of groups.values()) {
      const mean = g.sum / g.n;
      const b = best.get(g.asm);
      if (!b || mean > b.mean + 1e-6) best.set(g.asm, { dg: g.dg, mean });
    }
    for (const st of sites) if (st.dg !== '.' && best.get(st.asm).dg !== st.dg) st.minor = true;
    if (!sites.length) throw new Error('No usable atom sites were found in this file.');

    const meta = {
      block: chosen.name,
      spaceGroup: pick('_symmetry_space_group_name_h-m', '_space_group_name_h-m_alt', '_space_group_name_h-m'),
      sgNumber: pick('_symmetry_int_tables_number', '_space_group_it_number'),
      crystalSystem: pick('_symmetry_cell_setting', '_space_group_crystal_system'),
      temperature: pick('_diffrn_ambient_temperature', '_cell_measurement_temperature'),
      R1: pick('_refine_ls_r_factor_gt'),
      Z: pick('_cell_formula_units_z'),
      ccdc: pick('_database_code_depnum_ccdc_archive'),
      symSource,
      cellRaw
    };
    return { cell, ops, sites, meta };
  }

  /* ---------- structure -> unit cell contents, molecules, framework ---------- */
  const compatible = (a, b) => a.dg === '.' || b.dg === '.' || a.dg === b.dg;

  function buildCell(struct, opts) {
    const showMinor = !!(opts && opts.minor);
    const { cell, ops } = struct;
    const wrap = (x) => { let y = x - Math.floor(x); if (y > 1 - 1e-6) y = 0; return y; };
    const mi = (d) => [d[0] - Math.round(d[0]), d[1] - Math.round(d[1]), d[2] - Math.round(d[2])];

    // 1. apply every operator, wrap into the cell, drop coincident copies
    let atoms = [];
    struct.sites.forEach((s, si) => {
      ops.forEach((op, oi) => {
        const f = [0, 1, 2].map((r) => wrap(op.R[r][0] * s.f[0] + op.R[r][1] * s.f[1] + op.R[r][2] * s.f[2] + op.T[r]));
        for (const a of atoms) {
          if (a.el !== s.el || a.dg !== s.dg) continue;
          if (norm(cell.toCart(mi(sub(a.f, f)))) < 0.15) return;
        }
        atoms.push({ el: s.el, label: s.label, f, occ: s.occ, dg: s.dg, site: si, op: oi, symdis: s.symdis, minor: s.minor });
      });
    });

    // 1b. split positions that the file does not flag: two non-H atoms of one element closer than 0.9 A
    const dropSites = new Set();
    const dropAtoms = new Set();
    const autoSplit = [];
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      if (a.el === 'H' || a.dg !== '.') continue;
      for (let j = i + 1; j < atoms.length; j++) {
        const b = atoms[j];
        if (b.el !== a.el || b.dg !== '.') continue;
        if (norm(cell.toCart(mi(sub(a.f, b.f)))) >= 0.9) continue;
        if (a.site === b.site) dropAtoms.add(j);
        else {
          const later = Math.max(a.site, b.site);
          if (!dropSites.has(later)) { dropSites.add(later); autoSplit.push(struct.sites[Math.min(a.site, b.site)].label + '/' + struct.sites[later].label); }
        }
      }
    }
    const hasMinor = struct.sites.some((s) => s.minor) || dropSites.size > 0 || dropAtoms.size > 0;
    // cell contents for the formula: every part, weighted by occupancy; unflagged split copies counted once
    const counts = {};
    atoms.forEach((a, i) => { if (!dropSites.has(a.site) && !dropAtoms.has(i)) counts[a.el] = (counts[a.el] || 0) + a.occ; });
    const hiddenMinor = atoms.filter((a, i) => a.minor || dropSites.has(a.site) || dropAtoms.has(i)).length;
    if (!showMinor) atoms = atoms.filter((a, i) => !a.minor && !dropSites.has(a.site) && !dropAtoms.has(i));
    const N = atoms.length;

    // 2. metal-halide coordination, over neighbouring cells
    const ligs = atoms.map(() => []);      // metal index -> [{j, off}]
    const metalsOf = atoms.map(() => []);  // halide index -> [{i, off}]  (off = halide - metal, fractional)
    const shifts = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) shifts.push([i, j, k]);
    for (let i = 0; i < N; i++) {
      if (!isCenter(atoms[i].el)) continue;
      for (let j = 0; j < N; j++) {
        if (!HALIDE.has(atoms[j].el) || !compatible(atoms[i], atoms[j])) continue;
        const cut = RC[atoms[i].el] + RC[atoms[j].el] + 0.75;
        const base = sub(atoms[j].f, atoms[i].f);
        for (const s of shifts) {
          const off = add(base, s);
          const d = norm(cell.toCart(off));
          if (d < cut && d > 0.5) {
            ligs[i].push({ j, off, d, s });
            metalsOf[j].push({ i, off });
          }
        }
      }
    }

    // 3. covalent bonds between non-metals (minimum image)
    const adj = atoms.map(() => []);
    for (let i = 0; i < N; i++) {
      const a = atoms[i];
      if (isMetal(a.el) || metalsOf[i].length) continue;
      for (let j = i + 1; j < N; j++) {
        const b = atoms[j];
        if (isMetal(b.el) || metalsOf[j].length) continue;
        if (a.el === 'H' && b.el === 'H') continue;
        if (HALIDE.has(a.el) && (HALIDE.has(b.el) || b.el === 'H')) continue;
        if (HALIDE.has(b.el) && a.el === 'H') continue;
        if (!compatible(a, b)) continue;
        if (a.symdis && b.symdis && a.op !== b.op) continue;
        const d = mi(sub(b.f, a.f));
        const dist = norm(cell.toCart(d));
        if (dist > 0.4 && dist < RC[a.el] + RC[b.el] + 0.45) {
          adj[i].push({ j, d });
          adj[j].push({ j: i, d: [-d[0], -d[1], -d[2]] });
        }
      }
    }

    // 4. whole molecules: walk the bond graph, unwrapping across cell faces
    const molecules = [];
    const seen = new Array(N).fill(false);
    for (let s = 0; s < N; s++) {
      if (seen[s] || isCenter(atoms[s].el) || metalsOf[s].length) continue;
      const pos = new Map();
      pos.set(s, atoms[s].f.slice());
      seen[s] = true;
      const order = [s];
      for (let q = 0; q < order.length; q++) {
        const i = order[q];
        for (const nb of adj[i]) {
          if (seen[nb.j]) continue;
          seen[nb.j] = true;
          pos.set(nb.j, add(pos.get(i), nb.d));
          order.push(nb.j);
        }
      }
      let cen = [0, 0, 0];
      for (const i of order) cen = add(cen, pos.get(i));
      const shift = cen.map((x) => -Math.floor(x / order.length + 1e-9));
      const local = new Map(order.map((i, k) => [i, k]));
      const bonds = [];
      for (const i of order) for (const nb of adj[i]) {
        if (nb.j <= i || !local.has(nb.j)) continue;
        const real = sub(pos.get(nb.j), pos.get(i));
        if (norm(sub(real, nb.d)) < 1e-6) bonds.push([local.get(i), local.get(nb.j)]);
      }
      const mol = {
        atoms: order.map((i) => ({ idx: i, f: add(pos.get(i), shift) })),
        bonds,
        ion: order.length === 1 && (HALIDE.has(atoms[s].el) || isMetal(atoms[s].el)),
        symdis: order.some((i) => atoms[i].symdis)
      };
      mol.cen = cen.map((x, k) => x / order.length + shift[k]);
      // a molecule disordered over a symmetry element: keep one orientation
      if (mol.symdis && !showMinor && molecules.some((m) => m.symdis && norm(cell.toCart(mi(sub(m.cen, mol.cen)))) < 1.0)) continue;
      molecules.push(mol);
    }

    const metals = [];
    for (let i = 0; i < N; i++) if (isCenter(atoms[i].el)) metals.push(i);

    return { cell, atoms, ligs, metalsOf, molecules, metals, hasMinor, autoSplit, counts, hiddenMinor, meta: struct.meta, ops: struct.ops };
  }

  /* ---------- geometry report ---------- */
  function rankOf(vectors) {
    const m = vectors.map((v) => v.slice());
    let rank = 0;
    const basis = [];
    for (let c = 0; c < 3 && rank < m.length; c++) {
      let p = -1;
      for (let r = rank; r < m.length; r++) if (Math.abs(m[r][c]) > 1e-9) { p = r; break; }
      if (p < 0) continue;
      [m[rank], m[p]] = [m[p], m[rank]];
      [vectors[rank], vectors[p]] = [vectors[p], vectors[rank]];
      for (let r = rank + 1; r < m.length; r++) {
        const k = m[r][c] / m[rank][c];
        for (let cc = c; cc < 3; cc++) m[r][cc] -= k * m[rank][cc];
      }
      basis.push(rank);
      rank++;
    }
    return rank;
  }

  /* unit normal of the best plane through a set of points (smallest principal axis) */
  function planeNormal(P) {
    let cen = [0, 0, 0];
    for (const q of P) cen = add(cen, q);
    cen = cen.map((v) => v / P.length);
    const a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const q of P) { const d = sub(q, cen); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] += d[i] * d[j]; }
    const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let sweep = 0; sweep < 30; sweep++) {
      let offd = 0;
      for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) {
        offd += Math.abs(a[p][q]);
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
        const c = Math.cos(th), sn = Math.sin(th);
        for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - sn * y; a[k][q] = sn * x + c * y; }
        for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - sn * y; a[q][k] = sn * x + c * y; }
        for (let k = 0; k < 3; k++) { const x = v[k][p], y = v[k][q]; v[k][p] = c * x - sn * y; v[k][q] = sn * x + c * y; }
      }
      if (offd < 1e-12) break;
    }
    let m = 0;
    for (let k = 1; k < 3; k++) if (a[k][k] < a[m][m]) m = k;
    let n = [v[0][m], v[1][m], v[2][m]];
    // a reproducible sign: follow the order in which the atoms were given
    let ref = [0, 0, 0];
    for (let k = 0; k < P.length; k++) ref = add(ref, cross(sub(P[k], cen), sub(P[(k + 1) % P.length], cen)));
    if (Math.abs(dot(ref, n)) < 1e-3) {
      ref = [0, 0, 0];
      for (let k = 1; k < P.length && Math.abs(dot(ref, n)) < 1e-3; k++) ref = cross(sub(P[0], cen), sub(P[k], cen));
    }
    if (dot(ref, n) < 0) n = n.map((x) => -x);
    const rms = Math.sqrt(P.reduce((t, q) => t + Math.pow(dot(sub(q, cen), n), 2), 0) / P.length);
    return { n, cen, rms };
  }

  /* 1,2,4,5-tetrazine rings, returned as chromophore definitions (plane and axis by site index) */
  function tetrazineDefs(uc) {
    const { atoms, molecules } = uc;
    const defs = [];
    const seenDef = new Set();
    for (const mol of molecules) {
      const el = mol.atoms.map((a) => atoms[a.idx].el);
      const site = mol.atoms.map((a) => atoms[a.idx].site);
      const nb = mol.atoms.map(() => []);
      for (const [p, q] of mol.bonds) { nb[p].push(q); nb[q].push(p); }
      for (let c1 = 0; c1 < el.length; c1++) {
        if (el[c1] !== 'C') continue;
        const ns = nb[c1].filter((j) => el[j] === 'N');
        for (let x = 0; x < ns.length; x++) for (let y = x + 1; y < ns.length; y++) {
          const n1 = ns[x], n4 = ns[y];
          for (const n2 of nb[n1]) {
            if (el[n2] !== 'N' || n2 === n4) continue;
            for (const n3 of nb[n4]) {
              if (el[n3] !== 'N' || n3 === n1 || n3 === n2) continue;
              for (const c2 of nb[n2]) {
                if (el[c2] !== 'C' || c2 === c1 || !nb[n3].includes(c2)) continue;
                const ring = [c1, n1, n2, c2, n3, n4];
                const key = ring.map((k) => site[k]).sort((a, b) => a - b).join(',');
                if (seenDef.has(key)) continue;
                seenDef.add(key);
                const s1 = nb[c1].find((j) => !ring.includes(j));
                const s2 = nb[c2].find((j) => !ring.includes(j));
                const ends = (s1 !== undefined && s2 !== undefined) ? [s1, s2] : [c1, c2];
                defs.push({ plane: ring.map((k) => site[k]), axis: ends.map((k) => site[k]) });
              }
            }
          }
        }
      }
    }
    return defs;
  }

  /* every copy of a chromophore in the cell: centre (fractional, molecule coordinates),
     n = plane normal, e = in-plane reference axis, p = n x e */
  function chromoInstances(uc, def) {
    const { atoms, molecules, cell } = uc;
    const out = [];
    molecules.forEach((mol, mi) => {
      const bySite = new Map();
      mol.atoms.forEach((a, k) => {
        const sidx = atoms[a.idx].site;
        if (!bySite.has(sidx)) bySite.set(sidx, []);
        bySite.get(sidx).push(k);
      });
      const first = bySite.get(def.plane[0]);
      if (!first) return;
      for (const k0 of first) {
        const origin = cell.toCart(mol.atoms[k0].f);
        const nearest = (sidx) => {
          const c = bySite.get(sidx);
          if (!c) return -1;
          let best = c[0], bd = Infinity;
          for (const k of c) { const d = norm(sub(cell.toCart(mol.atoms[k].f), origin)); if (d < bd) { bd = d; best = k; } }
          return best;
        };
        const pl = def.plane.map((sidx, i) => (i === 0 ? k0 : nearest(sidx)));
        if (pl.some((k) => k < 0)) continue;
        const P = pl.map((k) => cell.toCart(mol.atoms[k].f));
        const fit = planeNormal(P);
        let e;
        if (def.axis && def.axis.length === 2) {
          const ax = def.axis.map(nearest);
          if (ax.some((k) => k < 0)) continue;
          e = sub(cell.toCart(mol.atoms[ax[1]].f), cell.toCart(mol.atoms[ax[0]].f));
        } else {
          let far = 1, fd = 0;
          for (let k = 1; k < P.length; k++) { const d = norm(sub(P[k], P[0])); if (d > fd) { fd = d; far = k; } }
          e = sub(P[far], P[0]);
        }
        const kk = dot(e, fit.n);
        e = sub(e, fit.n.map((x) => x * kk));
        if (norm(e) < 1e-6) continue;
        e = e.map((x) => x / norm(e));
        let fc = [0, 0, 0];
        for (const k of pl) fc = add(fc, mol.atoms[k].f);
        out.push({ mi, f: fc.map((x) => x / pl.length), n: fit.n, e, p: cross(fit.n, e), rms: fit.rms });
      }
    });
    return out;
  }
  /* direction of one state on one chromophore copy */
  function stateDir(inst, state) {
    if (state.mode === 'normal') return inst.n;
    if (state.mode === 'along') return inst.e;
    if (state.mode === 'perp') return inst.p;
    const a = (state.phi || 0) * Math.PI / 180;
    return [0, 1, 2].map((k) => Math.cos(a) * inst.e[k] + Math.sin(a) * inst.p[k]);
  }
  /* orientation summary of a set of axes (sign-free) */
  function orientReport(uc, info, vectors) {
    if (!vectors.length) return null;
    let normal = null;
    const fw = info.framework;
    if (fw && fw.dim === 2) {
      const h = fw.hkl;
      normal = [0, 1, 2].map((k) => h[0] * uc.cell.recip[0][k] + h[1] * uc.cell.recip[1][k] + h[2] * uc.cell.recip[2][k]);
    }
    const acute = (u, v) => { const a = angleDeg(u, v); return a > 90 ? 180 - a : a; };
    const uniq = [];
    for (const r of vectors) if (!uniq.some((u) => acute(u, r) < 0.05)) uniq.push(r);
    const res = { orientations: uniq.length };
    if (normal) {
      const t = uniq.map((u) => acute(u, normal));
      res.toNormalMin = Math.min(...t);
      res.toNormalMax = Math.max(...t);
    }
    if (uniq.length === 2) res.between = acute(uniq[0], uniq[1]);
    return res;
  }

  /* lattice planes (hkl), offset by a fraction of d, cut to the block lo..hi (fractional) */
  function planePolys(cell, hkl, offset, lo, hi, maxPlanes) {
    const G = [0, 1, 2].map((k) => hkl[0] * cell.recip[0][k] + hkl[1] * cell.recip[1][k] + hkl[2] * cell.recip[2][k]);
    const gl = norm(G);
    if (gl < 1e-12) return { polys: [], d: null, total: 0 };
    const nrm = G.map((x) => x / gl);
    const corners = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) corners.push([i ? hi[0] : lo[0], j ? hi[1] : lo[1], k ? hi[2] : lo[2]]);
    const edges = [];
    for (let p = 0; p < 8; p++) for (let q = p + 1; q < 8; q++) {
      const diff = (p ^ q);
      if (diff === 1 || diff === 2 || diff === 4) edges.push([p, q]);
    }
    const sv = corners.map((f) => dot(hkl, f));
    const smin = Math.min(...sv), smax = Math.max(...sv);
    const tol = 1e-7;
    const all = [];
    for (let m = Math.ceil(smin - offset - tol); m <= Math.floor(smax - offset + tol); m++) all.push(m);
    const total = all.length;
    const pick = all.length > maxPlanes ? all.slice(0, maxPlanes) : all;
    // in-plane basis for ordering the corners of each polygon
    let e1 = cross(nrm, Math.abs(nrm[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
    e1 = e1.map((x) => x / norm(e1));
    const e2 = cross(nrm, e1);
    const polys = [];
    for (const m of pick) {
      const t = m + offset;
      const pts = [];
      const addPt = (f) => {
        const c = cell.toCart(f);
        if (!pts.some((q) => norm(sub(q, c)) < 1e-6)) pts.push(c);
      };
      for (const [p, q] of edges) {
        const a = sv[p] - t, b = sv[q] - t;
        if (Math.abs(a) < tol) addPt(corners[p]);
        if (Math.abs(b) < tol) addPt(corners[q]);
        if (Math.abs(a) >= tol && Math.abs(b) >= tol && a * b < 0) {
          const w = a / (a - b);
          addPt([0, 1, 2].map((k) => corners[p][k] + w * (corners[q][k] - corners[p][k])));
        }
      }
      if (pts.length < 3) continue;
      let cen = [0, 0, 0];
      for (const q of pts) cen = add(cen, q);
      cen = cen.map((x) => x / pts.length);
      pts.sort((u, v) => Math.atan2(dot(sub(u, cen), e2), dot(sub(u, cen), e1)) - Math.atan2(dot(sub(v, cen), e2), dot(sub(v, cen), e1)));
      polys.push({ pts, cen, m });
    }
    return { polys, d: 1 / gl, normal: nrm, total };
  }

  /* descriptors of a layered (2D) metal-halide framework */
  function layerAnalysis(uc, fw, off, compOf) {
    const { cell, atoms, ligs, metalsOf, metals, molecules } = uc;
    const G = [0, 1, 2].map((k) => fw.hkl[0] * cell.recip[0][k] + fw.hkl[1] * cell.recip[1][k] + fw.hkl[2] * cell.recip[2][k]);
    const nh = G.map((x) => x / norm(G));
    const height = (f) => dot(cell.toCart(f), nh);
    const mean = (a) => a.reduce((t, x) => t + x, 0) / a.length;
    const inPlane = (v) => { const k = dot(v, nh); return sub(v, nh.map((x) => x * k)); };
    const res = { normal: nh };

    // slabs: metal planes and the planes of terminal halides on each face
    const slabs = [];
    for (let c = 0; c < fw.components; c++) {
      const ms = metals.filter((m) => compOf.get(m) === c).map((m) => ({ m, f: add(atoms[m].f, off.get(m)) }));
      for (const o of ms) o.h = height(o.f);
      const hs = ms.map((o) => o.h).sort((a, b) => a - b);
      const planes = [];
      for (const x of hs) {
        const last = planes[planes.length - 1];
        if (last && x - last.max < 1.5) { last.sum += x; last.n++; last.max = x; } else planes.push({ sum: x, n: 1, max: x });
      }
      const ph = planes.map((p) => p.sum / p.n);
      const top = [], bot = [];
      for (const o of ms) for (const l of ligs[o.m]) {
        if (metalsOf[l.j].length !== 1) continue;
        const hx = height(add(o.f, l.off));
        if (hx > ph[ph.length - 1] + 1.0) top.push(hx); else if (hx < ph[0] - 1.0) bot.push(hx);
      }
      slabs.push({ metals: ms, planes: ph, centre: mean(ph), top: top.length ? mean(top) : null, bot: bot.length ? mean(bot) : null });
    }
    const ns = slabs.map((sl) => sl.planes.length);
    res.n = Math.max(...ns);
    res.nUniform = ns.every((x) => x === ns[0]);
    const s0 = slabs[0];
    if (s0.top !== null && s0.bot !== null) {
      res.slabThickness = s0.top - s0.bot;
      res.gallery = fw.spacing - res.slabThickness;
    }

    // M-X-M bridges, split into in-plane and out-of-plane components
    res.bridges = [];
    const seenB = new Set();
    for (let j = 0; j < atoms.length; j++) {
      const ms = metalsOf[j];
      for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) {
        const a = cell.toCart(ms[p].off).map((x) => -x);
        const b = cell.toCart(ms[q].off).map((x) => -x);
        const mm = sub(b, a);
        const theta = angleDeg(a, b);
        const equatorial = Math.abs(dot(mm, nh)) / norm(mm) < 0.5;
        const entry = { x: atoms[j].label, m1: atoms[ms[p].i].label, m2: atoms[ms[q].i].label, theta, equatorial, mm: norm(mm) };
        if (equatorial) {
          entry.thetaIn = angleDeg(inPlane(a), inPlane(b));
          let u = inPlane(mm);
          u = u.map((x) => x / norm(u));
          const w = cross(nh, u);
          const strip = (v) => { const k = dot(v, w); return sub(v, w.map((x) => x * k)); };
          entry.thetaOut = angleDeg(strip(a), strip(b));
        }
        const key = atoms[j].site + ':' + theta.toFixed(2) + ':' + (equatorial ? 'e' : 'a');
        if (seenB.has(key)) continue;
        seenB.add(key);
        res.bridges.push(entry);
      }
    }

    // tilt of the axial M-X bonds away from the layer normal
    const ax = [];
    const seenSite = new Set();
    for (const m of metals) {
      if (seenSite.has(atoms[m].site)) continue;
      seenSite.add(atoms[m].site);
      for (const l of ligs[m]) {
        const v = cell.toCart(l.off);
        const c = Math.abs(dot(v, nh)) / norm(v);
        if (c > 0.7) ax.push(Math.acos(Math.min(1, c)) * 180 / Math.PI);
      }
    }
    if (ax.length) res.axialTilt = { min: Math.min(...ax), max: Math.max(...ax), mean: mean(ax) };

    // depth of each ammonium N below the plane of terminal halides (positive = inside the layer)
    const hasH = atoms.some((a) => a.el === 'H');
    const pens = new Map();
    for (const mol of molecules) {
      const nb = mol.atoms.map(() => []);
      for (const [p, q] of mol.bonds) { nb[p].push(q); nb[q].push(p); }
      mol.atoms.forEach((a, k) => {
        if (atoms[a.idx].el !== 'N') return;
        const nH = nb[k].filter((j) => atoms[mol.atoms[j].idx].el === 'H').length;
        const heavy = nb[k].length - nH;
        const ammonium = hasH ? (nb[k].length === 4 && nH >= 2) : heavy === 1;
        if (!ammonium) return;
        const hN = height(a.f);
        let best = null;
        for (const sl of slabs) for (let k2 = -2; k2 <= 2; k2++) {
          const h = hN + k2 * fw.dhkl;
          if (sl.top !== null) { const d = sl.top - h; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
          if (sl.bot !== null) { const d = h - sl.bot; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
        }
        if (best === null || Math.abs(best) > 3.0) return;
        const lab = atoms[a.idx].label;
        if (!pens.has(lab)) pens.set(lab, []);
        pens.get(lab).push(best);
      });
    }
    res.penetration = Array.from(pens.entries()).map(([label, v]) => ({ label, depth: mean(v) }));

    // in-plane offset between adjacent layers, in units of the in-plane M...M vectors
    res.offset = null;
    if (slabs.length && s0.metals.length) {
      const topH = s0.planes[s0.planes.length - 1];
      const M0 = s0.metals.find((o) => Math.abs(o.h - topH) < 1.5);
      const ps = [];
      for (const l of ligs[M0.m]) for (const mm of metalsOf[l.j]) {
        const d = sub(l.off, mm.off);
        if (norm(d) < 1e-6) continue;
        const v = cell.toCart(d);
        if (Math.abs(dot(v, nh)) / norm(v) < 0.5) ps.push(inPlane(v));
      }
      ps.sort((u, v) => norm(u) - norm(v));
      const p1 = ps[0];
      const p2 = p1 ? ps.find((v) => norm(cross(p1, v)) > 0.3 * norm(p1) * norm(v)) : null;
      let target = null;
      for (let c = 0; c < slabs.length && !target; c++) for (let k = -2; k <= 2 && !target; k++) {
        if (Math.abs(slabs[c].centre + k * fw.dhkl - s0.centre - fw.spacing) < 0.25 * fw.spacing) target = { c, k };
      }
      if (p1 && p2 && target) {
        let t = null;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
          if (i * fw.hkl[0] + j * fw.hkl[1] + k * fw.hkl[2] !== target.k) continue;
          if (!t || norm(cell.toCart([i, j, k])) < norm(cell.toCart(t))) t = [i, j, k];
        }
        const sb = slabs[target.c];
        const M1 = sb.metals.find((o) => Math.abs(o.h - sb.planes[0]) < 1.5);
        if (t && M1) {
          const d = inPlane(sub(cell.toCart(add(M1.f, t)), cell.toCart(M0.f)));
          const e1 = p1.map((x) => x / norm(p1));
          const e2 = cross(nh, e1);
          const a11 = dot(p1, e1), a12 = dot(p2, e1), a21 = dot(p1, e2), a22 = dot(p2, e2);
          const det = a11 * a22 - a12 * a21;
          const b1 = dot(d, e1), b2 = dot(d, e2);
          let s1 = (b1 * a22 - a12 * b2) / det, s2 = (a11 * b2 - a21 * b1) / det;
          s1 = Math.abs(s1 - Math.round(s1));
          s2 = Math.abs(s2 - Math.round(s2));
          const tol = 0.15;
          const z = (x) => x < tol, hf = (x) => x > 0.5 - tol;
          let kind = 'intermediate';
          if (z(s1) && z(s2)) kind = 'near (0, 0), eclipsed';
          else if (hf(s1) && hf(s2)) kind = 'near (½, ½), staggered';
          else if ((hf(s1) && z(s2)) || (z(s1) && hf(s2))) kind = 'near (½, 0)';
          res.offset = { s1: Math.max(s1, s2), s2: Math.min(s1, s2), kind, p1: norm(p1), p2: norm(p2) };
        }
      }
    }
    return res;
  }

  function analyse(uc) {
    const { cell, atoms, ligs, metalsOf, metals } = uc;
    const out = { metalSites: [], bridges: [], framework: null, layer: null };

    // formula and density from cell contents
    const counts = uc.counts;
    let mass = 0;
    let massKnown = true;
    for (const e of Object.keys(counts)) {
      if (MASS[e] === undefined) massKnown = false; else mass += MASS[e] * counts[e];
    }
    const els = Object.keys(counts);
    const hill = els.includes('C')
      ? ['C'].concat(els.includes('H') ? ['H'] : [], els.filter((e) => e !== 'C' && e !== 'H').sort())
      : els.slice().sort();
    const integral = els.every((e) => Math.abs(counts[e] - Math.round(counts[e])) < 0.02);
    let Z = parseInt(uc.meta.Z, 10);
    if (!(Z > 0)) Z = integral ? els.reduce((g, e) => gcd(g, Math.round(counts[e])), 0) : 1;
    out.Z = Z;
    out.formula = hill.map((e) => {
      const n = counts[e] / Z;
      const r = Math.round(n * 100) / 100;
      return { el: e, n: r };
    });
    out.formulaMass = massKnown ? mass / Z : null;
    out.density = massKnown ? mass / (0.602214076 * cell.V) : null;
    out.nAtoms = atoms.length;
    out.hasH = atoms.some((a) => a.el === 'H');

    // metal coordination, one entry per crystallographic site
    const seenSite = new Set();
    for (const i of metals) {
      const key = atoms[i].site;
      if (seenSite.has(key) || !ligs[i].length) continue;
      seenSite.add(key);
      const L = ligs[i].slice().sort((p, q) => p.d - q.d);
      const ds = L.map((l) => l.d);
      const mean = ds.reduce((s, x) => s + x, 0) / ds.length;
      const entry = {
        label: atoms[i].label, el: atoms[i].el, cn: L.length,
        bonds: L.map((l) => ({ label: atoms[l.j].label, el: atoms[l.j].el, d: l.d })),
        mean, min: ds[0], max: ds[ds.length - 1]
      };
      if (L.length === 6) {
        const vs = L.map((l) => cell.toCart(l.off));
        const angs = [];
        for (let p = 0; p < 6; p++) for (let q = p + 1; q < 6; q++) angs.push(angleDeg(vs[p], vs[q]));
        angs.sort((x, y) => x - y);
        const cis = angs.slice(0, 12);
        entry.sigma2 = cis.reduce((s, t) => s + (t - 90) * (t - 90), 0) / 11;
        entry.deltaD = ds.reduce((s, d) => s + Math.pow((d - mean) / mean, 2), 0) / 6;
        entry.cisMin = cis[0];
        entry.cisMax = cis[11];
        entry.transMin = angs[12];
      }
      out.metalSites.push(entry);
    }

    // bridging angles M-X-M
    const seenBridge = new Set();
    for (let j = 0; j < atoms.length; j++) {
      const ms = metalsOf[j];
      for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) {
        const u = cell.toCart(ms[p].off).map((x) => -x);
        const v = cell.toCart(ms[q].off).map((x) => -x);
        const ang = angleDeg(u, v);
        const key = atoms[j].site + ':' + ang.toFixed(2);
        if (seenBridge.has(key)) continue;
        seenBridge.add(key);
        out.bridges.push({
          x: atoms[j].label, m1: atoms[ms[p].i].label, m2: atoms[ms[q].i].label, angle: ang,
          mm: norm(sub(u, v))
        });
      }
    }

    // periodicity of the metal-halide network
    if (metals.some((i) => ligs[i].length)) {
      const off = new Map();
      const compOf = new Map();
      const cycles = [];
      let comps = 0;
      for (const m0 of metals) {
        if (off.has(m0) || !ligs[m0].length) continue;
        comps++;
        off.set(m0, [0, 0, 0]);
        compOf.set(m0, comps - 1);
        const queue = [m0];
        for (let q = 0; q < queue.length; q++) {
          const n = queue[q];
          const edges = isMetal(atoms[n].el)
            ? ligs[n].map((l) => ({ to: l.j, s: l.s }))
            : metalsOf[n].map((mm) => {
              const s = sub(mm.off, sub(atoms[n].f, atoms[mm.i].f)).map(Math.round);
              return { to: mm.i, s: s.map((x) => -x) };
            });
          for (const e of edges) {
            const target = add(off.get(n), e.s);
            if (!off.has(e.to)) { off.set(e.to, target); compOf.set(e.to, comps - 1); queue.push(e.to); } else {
              const c = sub(target, off.get(e.to));
              if (c.some((x) => x !== 0)) cycles.push(c);
            }
          }
        }
      }
      const vecs = cycles.map((c) => c.slice());
      const dim = rankOf(vecs);
      const fw = { dim, components: comps };
      if (dim === 2) {
        let h = cross(vecs[0], vecs[1]).map(Math.round);
        const g = gcd(gcd(h[0], h[1]), h[2]) || 1;
        h = h.map((x) => x / g);
        const first = h.find((x) => x !== 0);
        if (first < 0) h = h.map((x) => -x);
        h = h.map((x) => x + 0);
        const G = [0, 1, 2].map((k) => h[0] * cell.recip[0][k] + h[1] * cell.recip[1][k] + h[2] * cell.recip[2][k]);
        fw.hkl = h;
        fw.dhkl = 1 / norm(G);
        fw.spacing = fw.dhkl / comps;
        try { out.layer = layerAnalysis(uc, fw, off, compOf); } catch (err) { out.layer = null; }
      } else if (dim === 1) {
        let u = vecs[0].map(Math.round);
        const g = gcd(gcd(u[0], u[1]), u[2]) || 1;
        u = u.map((x) => x / g);
        const first = u.find((x) => x !== 0);
        if (first < 0) u = u.map((x) => -x);
        fw.uvw = u.map((x) => x + 0);
      }
      out.framework = fw;
    }
    return out;
  }

  /* ---------- unit cell -> displayed block of n1 x n2 x n3 cells ---------- */
  function assemble(uc, lo, hi) {
    const { cell, atoms, ligs, molecules, metals } = uc;
    const out = [];
    const polyhedra = [];
    const mols = [];
    const push = (i, f, kind, group) => {
      out.push({ el: atoms[i].el, label: atoms[i].label, dg: atoms[i].dg, f, xyz: cell.toCart(f), kind, group, bonds: [], src: i, site: atoms[i].site });
      return out.length - 1;
    };
    const link = (p, q) => { out[p].bonds.push(q); out[q].bonds.push(p); };
    const eps = 1e-4;
    const t0 = lo.map((x) => Math.floor(x) - 1);
    const t1 = hi.map((x) => Math.ceil(x));

    // metals inside the block (faces included), each with its full coordination shell
    const ligKey = new Map();
    for (const m of metals) {
      const f0 = atoms[m].f;
      for (let i = t0[0]; i <= t1[0]; i++) for (let j = t0[1]; j <= t1[1]; j++) for (let k = t0[2]; k <= t1[2]; k++) {
        const fm = add(f0, [i, j, k]);
        if (fm.some((x, d) => x < lo[d] - eps || x > hi[d] + eps)) continue;
        const im = push(m, fm, 'metal', -1);
        const verts = [];
        for (const l of ligs[m]) {
          const fx = add(fm, l.off);
          const key = l.j + ':' + fx.map((x) => Math.round(x * 2000)).join(',');
          let ix = ligKey.get(key);
          if (ix === undefined) { ix = push(l.j, fx, 'ligand', -1); ligKey.set(key, ix); }
          link(im, ix);
          verts.push(ix);
        }
        if (verts.length >= 4) polyhedra.push({ center: im, verts });
      }
    }

    // molecules and free ions whose centroid lies inside the block
    let group = 0;
    for (let i = t0[0]; i <= t1[0]; i++) for (let j = t0[1]; j <= t1[1]; j++) for (let k = t0[2]; k <= t1[2]; k++) {
      for (const mol of molecules) {
        const c = add(mol.cen, [i, j, k]);
        if (c.some((x, d) => x < lo[d] - eps || x >= hi[d] - eps)) continue;
        const idx = mol.atoms.map((a) => push(a.idx, add(a.f, [i, j, k]), mol.ion ? 'ion' : 'organic', group));
        for (const [p, q] of mol.bonds) link(idx[p], idx[q]);
        mols.push({ mi: molecules.indexOf(mol), t: [i, j, k], group });
        group++;
      }
    }

    // hydrogen bonds: N-H...X / O-H...X (X = halide, O, N of another molecule)
    const hbonds = [];
    const hasH = out.some((a) => a.el === 'H');
    const acceptors = [];
    out.forEach((a, i) => {
      if (((a.kind === 'ligand' || a.kind === 'ion') && HALIDE.has(a.el)) || (a.kind === 'organic' && (a.el === 'O' || a.el === 'N'))) acceptors.push(i);
    });
    const d3 = (p, q) => norm(sub(out[p].xyz, out[q].xyz));
    if (hasH) {
      out.forEach((h, ih) => {
        if (h.el !== 'H' || h.bonds.length !== 1) return;
        const id = h.bonds[0];
        const D = out[id];
        if (D.el !== 'N' && D.el !== 'O') return;
        for (const ia of acceptors) {
          const A = out[ia];
          if (A.group === h.group && A.group >= 0) continue;
          if (A.el === 'N' && A.bonds.length >= 4) continue;
          const lim = VDW.H + VDW[A.el] - 0.15;
          const dHA = d3(ih, ia);
          if (dHA > lim) continue;
          const ang = angleDeg(sub(D.xyz, h.xyz), sub(A.xyz, h.xyz));
          if (ang < 120) continue;
          hbonds.push({ d: id, h: ih, a: ia, dHA, dDA: d3(id, ia), angle: ang });
        }
      });
    } else {
      out.forEach((D, id) => {
        if (D.kind !== 'organic' || (D.el !== 'N' && D.el !== 'O')) return;
        for (const ia of acceptors) {
          const A = out[ia];
          if (!HALIDE.has(A.el)) continue;
          const dDA = d3(id, ia);
          if (dDA < VDW[D.el] + VDW[A.el] + 0.15) hbonds.push({ d: id, h: -1, a: ia, dHA: null, dDA, angle: null });
        }
      });
    }
    return { atoms: out, polyhedra, hbonds, hasH, mols };
  }

  /* triangles of the convex hull of a small point set (coordination polyhedron) */
  function hullFaces(points) {
    const n = points.length;
    let cen = [0, 0, 0];
    for (const p of points) cen = add(cen, p);
    cen = cen.map((x) => x / n);
    const faces = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      let nrm = cross(sub(points[j], points[i]), sub(points[k], points[i]));
      const len = norm(nrm);
      if (len < 1e-6) continue;
      nrm = nrm.map((x) => x / len);
      let pos = 0, neg = 0;
      for (let m = 0; m < n; m++) {
        if (m === i || m === j || m === k) continue;
        const s = dot(nrm, sub(points[m], points[i]));
        if (s > 0.05) pos++; else if (s < -0.05) neg++;
      }
      if (pos && neg) continue;
      const outward = dot(nrm, sub(points[i], cen)) >= 0;
      faces.push(outward ? { v: [i, j, k], n: nrm } : { v: [i, k, j], n: nrm.map((x) => -x) });
    }
    return faces;
  }

  root.XtalCore = { readStructure, buildCell, analyse, assemble, hullFaces, planePolys, tetrazineDefs, chromoInstances, stateDir, orientReport, hallOps, symbolOps, setSgTable, isMetal, isCenter, HALIDE, RC, parseSymop };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.XtalCore;
})(typeof window !== 'undefined' ? window : globalThis);
