/* Crystal core: CIF parsing, symmetry expansion, molecule assembly, geometry.
   Pure functions, no DOM. Works in the browser (window.XtalCore) and in Node. */
(function (root) {
  'use strict';

  // Covalent radii (Cordero et al., Dalton Trans. 2008), in angstrom, H to Cm
  const RC = {
    H: 0.31, D: 0.31, He: 0.28, Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Ne: 0.58,
    Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Ar: 1.06, K: 2.03, Ca: 1.76,
    Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39, Fe: 1.32, Co: 1.26, Ni: 1.24, Cu: 1.32,
    Zn: 1.22, Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20, Br: 1.20, Kr: 1.16, Rb: 2.20, Sr: 1.95, Y: 1.90,
    Zr: 1.75, Nb: 1.64, Mo: 1.54, Tc: 1.47, Ru: 1.46, Rh: 1.42, Pd: 1.39, Ag: 1.45, Cd: 1.44, In: 1.42,
    Sn: 1.39, Sb: 1.39, Te: 1.38, I: 1.39, Xe: 1.40, Cs: 2.44, Ba: 2.15, La: 2.07, Ce: 2.04, Pr: 2.03,
    Nd: 2.01, Pm: 1.99, Sm: 1.98, Eu: 1.98, Gd: 1.96, Tb: 1.94, Dy: 1.92, Ho: 1.92, Er: 1.89, Tm: 1.90,
    Yb: 1.87, Lu: 1.87, Hf: 1.75, Ta: 1.70, W: 1.62, Re: 1.51, Os: 1.44, Ir: 1.41, Pt: 1.36, Au: 1.36,
    Hg: 1.32, Tl: 1.45, Pb: 1.46, Bi: 1.48, Po: 1.40, At: 1.50, Rn: 1.50, Fr: 2.60, Ra: 2.21, Ac: 2.15,
    Th: 2.06, Pa: 2.00, U: 1.96, Np: 1.90, Pu: 1.87, Am: 1.80, Cm: 1.69
  };
  // Standard atomic weights (IUPAC abridged); mass number of the longest-lived isotope where there is none
  const MASS = {
    H: 1.008, D: 2.014, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
    F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45,
    Ar: 39.95, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
    Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971,
    Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Tc: 97,
    Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76,
    Te: 127.60, I: 126.90, Xe: 131.29, Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91,
    Nd: 144.24, Pm: 145, Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.50, Ho: 164.93,
    Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49, Ta: 180.95, W: 183.84, Re: 186.21,
    Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98,
    Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Th: 232.04, Pa: 231.04, U: 238.03, Np: 237,
    Pu: 244, Am: 243, Cm: 247
  };
  // Bondi van der Waals radii, used for hydrogen-bond cutoffs
  const VDW = { H: 1.20, N: 1.55, O: 1.52, F: 1.47, S: 1.80, Cl: 1.75, Br: 1.85, I: 1.98 };
  const NONMETAL = new Set(['H', 'D', 'He', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Si', 'P', 'S', 'Cl', 'Ar', 'As', 'Se', 'Br', 'Kr', 'Te', 'I', 'Xe', 'At', 'Rn']);
  const HALIDE = new Set(['F', 'Cl', 'Br', 'I']);
  // the elements in the order of their atomic numbers (an XYZ file can give the number instead of the symbol)
  const ELEMENTS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh ' +
    'Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th ' +
    'Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr').split(' ');
  const ALKALI = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr']);
  const NOBLE = new Set(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn']);
  const isMetal = (el) => !NONMETAL.has(el);
  /* metals that sit at the centre of a coordination polyhedron by default. Alkali ions are treated as
     free (A-site) ions unless they are the only metals with anions around them (NaCl, KBr). */
  const isCenter = (el) => isMetal(el) && !ALKALI.has(el);
  /* atoms a metal centre can bond to: any non-metal except H and the noble gases */
  const isDonor = (el) => NONMETAL.has(el) && el !== 'H' && el !== 'D' && !NOBLE.has(el);
  /* extra length allowed on top of the covalent radii */
  const TOL_COVALENT = 0.45, TOL_HALIDE = 0.75, TOL_DONOR = 0.5;
  /* non-metal centres that get a polyhedron when four or more atoms of the listed kinds, and nothing else,
     are bonded to them: SiO4 in quartz, PO4, SO4, BF4, PF6, TeCl6 */
  const NET_CENTER = new Set(['B', 'Si', 'P', 'As', 'S', 'Se', 'Te']);
  const NET_VERTEX = new Set(['O', 'N', 'F', 'S', 'Se', 'Cl', 'Br', 'I']);
  /* largest coordination number drawn as a polyhedron; larger shells (A-site cuboctahedra) only clutter */
  const MAX_POLY_CN = 8;

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
    // the change of basis V: an origin shift in twelfths, (0 0 1), or an operator, (z,x,y) or (x-y,x+y,z).
    // Each operator S of the group becomes V S V^-1.
    let cob = null;
    const sm = s.match(/\(\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*\)/);
    const cm = s.match(/\(([^()]*,[^()]*,[^()]*)\)/);
    if (sm) { shift = [+sm[1] / 12, +sm[2] / 12, +sm[3] / 12]; s = s.replace(sm[0], '').trim(); }
    else if (cm) {
      const V = parseSymop(cm[1]);
      if (!V) return null;
      const det = V.R[0][0] * (V.R[1][1] * V.R[2][2] - V.R[1][2] * V.R[2][1]) - V.R[0][1] * (V.R[1][0] * V.R[2][2] - V.R[1][2] * V.R[2][0]) + V.R[0][2] * (V.R[1][0] * V.R[2][1] - V.R[1][1] * V.R[2][0]);
      if (Math.abs(det) < 1e-9) return null;
      const Ri = inv3(V.R).map((r) => r.map((x) => Math.round(x * 1e6) / 1e6));
      const Ti = [0, 1, 2].map((i) => -(Ri[i][0] * V.T[0] + Ri[i][1] * V.T[1] + Ri[i][2] * V.T[2]));
      cob = { V: { R: V.R, T: V.T }, Vi: { R: Ri, T: Ti } };
      s = s.replace(cm[0], '').trim();
    }
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
    // origin shift: op' = (I, v) op (I, -v); a change of basis: op' = V op V^-1. A rotation part that is not whole
    // numbers (a basis that the operator does not map onto itself) has no meaning: no operators.
    const comp = (p, q) => ({ R: [0, 1, 2].map((i) => [0, 1, 2].map((j) => p.R[i][0] * q.R[0][j] + p.R[i][1] * q.R[1][j] + p.R[i][2] * q.R[2][j])),
      T: [0, 1, 2].map((i) => p.R[i][0] * q.T[0] + p.R[i][1] * q.T[1] + p.R[i][2] * q.T[2] + p.T[i]) });
    let moved = gens.map((g) => ({
      R: g.R,
      T: [0, 1, 2].map((i) => mod1(g.T[i] + shift[i] - (g.R[i][0] * shift[0] + g.R[i][1] * shift[1] + g.R[i][2] * shift[2])))
    }));
    if (cob) {
      moved = moved.map((g) => { const o = comp(cob.V, comp(g, cob.Vi)); return { R: o.R.map((r) => r.map((x) => Math.round(x * 1e6) / 1e6)), T: o.T.map(mod1) }; });
      if (moved.some((g) => g.R.some((r) => r.some((x) => Math.abs(x - Math.round(x)) > 1e-6)))) return null;
      // a centring of the new basis: the lattice translations of the old cell, seen in the new basis
      for (const t of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const u = [0, 1, 2].map((i) => mod1(cob.V.R[i][0] * t[0] + cob.V.R[i][1] * t[1] + cob.V.R[i][2] * t[2]));
        if (u.some((x) => Math.abs(x) > 1e-9 && Math.abs(x - 1) > 1e-9)) moved.push({ R: I3, T: u });
      }
    }
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
  /* the current ITA symbols with the glide plane e, and the older symbol that the table knows */
  const E_GLIDE = { Ae2a: 'Ac2a', Ae2m: 'Ac2m', Aea2: 'Aba2', Aeaa: 'Abaa', Aeam: 'Acam', Aem2: 'Abm2', Aema: 'Abma', Aemm: 'Abmm',
    B2eb: 'B2cb', B2em: 'B2cm', Bbe2: 'Bba2', Bbeb: 'Bbcb', Bbem: 'Bbcm', Bme2: 'Bma2', Bmeb: 'Bmab', Bmem: 'Bmcm',
    C2ce: 'C2cb', C2me: 'C2mb', Cc2e: 'Cc2a', Ccce: 'Ccca', Ccme: 'Ccmb', Cm2e: 'Cm2a', Cmce: 'Cmca', Cmme: 'Cmma' };
  const R_NUMBERS = new Set([146, 148, 155, 160, 161, 166, 167]);
  /* pairs of non-H atoms closer than 0.6 times the sum of their covalent radii, after the operators: few for the
     right origin choice, many when the atoms land on the wrong special positions */
  function clashCount(cell, ops, sites) {
    const pts = [];
    let copies = 0;
    for (const s of sites) {
      if (s.el === 'H') continue;
      const mine = [];
      for (const op of ops) {
        const f = [0, 1, 2].map((r) => op.R[r][0] * s.f[0] + op.R[r][1] * s.f[1] + op.R[r][2] * s.f[2] + op.T[r]);
        if (mine.some((g) => norm(cell.toCart(minImage(sub(g, f)))) < SAME_POS)) continue;
        mine.push(f);
        pts.push({ f, r: RC[s.el] || 0.75 });
      }
    }
    // pairs closer than 0.6 x the sum of the covalent radii, from a binned neighbour search
    let n = 0;
    const nb = neighbours(cell, pts.map((p) => p.f), 1.2 * Math.max(0.75, ...pts.map((p) => p.r)));
    nb.forEach((list, i) => { for (const { j, d } of list) if (j > i && d < 0.6 * (pts[i].r + pts[j].r)) n++; });
    return [n, pts.length];
  }
  /* operators for a Hermann-Mauguin symbol or an IT number, through the symbol table. The symbol may have spaces,
     an origin or axes choice (":1", ":2", ":H", ":R"), an ICSD suffix (" Z" = origin 2, " S" = origin 1, " H",
     " R"), the glide e of the current tables (Cmce = Cmca) or the old cubic form without the bar (Fm3m = Fm-3m).
     For an R group without a choice, the cell decides. For a group with two origins and no choice, the atom
     positions decide when the sites are given (fewer impossible contacts, then fewer atoms); with no difference,
     origin choice 2.
     Returns { hall, ops, via, note } or null. */
  function symbolOps(hm, number, cell, sites) {
    const tryKey = (k) => (SG_TABLE[k] ? { hall: SG_TABLE[k], ops: hallOps(SG_TABLE[k]) } : null);
    // rhombohedral axes: a = b = c and alpha = beta = gamma (also near 90 deg, as in BaTiO3 R3m); hexagonal axes have gamma = 120
    const rhombo = cell && Math.abs(cell.a - cell.b) < 1e-3 * cell.a && Math.abs(cell.b - cell.c) < 1e-3 * cell.a && Math.abs(cell.al - cell.be) < 0.05 &&
      Math.abs(cell.be - cell.ga) < 0.05 && Math.abs(cell.ga - 120) > 0.05;
    const pickOrigin = (base, via) => {
      const o1 = tryKey(base + ':1'), o2 = tryKey(base + ':2');
      if (!o1 || !o2 || !o1.ops || !o2.ops) return null;
      let choice = '2', why = 'origin choice 2 (no choice in the file)';
      if (sites && sites.length && cell) {
        // fewer impossible contacts, then fewer atoms (the right origin puts atoms on its special positions)
        const [k1, n1] = clashCount(cell, o1.ops, sites), [k2, n2] = clashCount(cell, o2.ops, sites);
        if (k1 < k2 || (k1 === k2 && n1 < n2)) { choice = '1'; why = 'origin choice 1, chosen from the atom positions'; }
        else if (k2 < k1 || n2 < n1) why = 'origin choice 2, chosen from the atom positions';
      }
      const r = choice === '1' ? o1 : o2;
      r.via = via; r.note = why;
      return r;
    };
    if (hm) {
      let s = String(hm).trim();
      let ext = '';
      const icsd = s.match(/^(.*\S)\s+([ZSHR])$/i);
      if (icsd && !/:/.test(s)) { s = icsd[1]; ext = { Z: ':2', S: ':1', H: ':H', R: ':R' }[icsd[2].toUpperCase()]; }
      let k = s.replace(/[\s_]/g, '');
      const c = k.indexOf(':');
      if (c >= 0) { ext = k.slice(c).toUpperCase(); k = k.slice(0, c); }
      k = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
      if (E_GLIDE[k]) k = E_GLIDE[k];
      if (!SG_TABLE[k] && !SG_TABLE[k + ':1'] && !SG_TABLE[k + ':H'] && /^[PFI][mnad]3/i.test(k) && !/-3/.test(k)) k = k.replace(/^([PFI][mnad])3/i, '$1-3');
      if (!ext && k[0] === 'R' && cell) ext = rhombo ? ':R' : ':H';
      if (!ext && SG_TABLE[k + ':1'] && SG_TABLE[k + ':2']) { const r = pickOrigin(k, 'hm'); if (r) return r; }
      const r = tryKey(k + ext) || tryKey(k);
      if (r && r.ops) { r.via = 'hm'; return r; }
    }
    if (number) {
      const n = parseInt(number, 10);
      const hall = SG_TABLE['#' + n];
      if (hall) {
        // the symbol of this number in the table, for the R axes and the origin choices
        const names = Object.keys(SG_TABLE).filter((k) => k[0] !== '#' && SG_TABLE[k] === hall);
        const withExt = names.find((k) => /:(1|2|H)$/.test(k));
        if (withExt && R_NUMBERS.has(n) && rhombo) { const r = tryKey(withExt.replace(/:H$/, ':R')); if (r && r.ops) { r.via = 'number'; return r; } }
        if (withExt && /:[12]$/.test(withExt)) { const r = pickOrigin(withExt.replace(/:[12]$/, ''), 'number'); if (r) return r; }
        const r = tryKey('#' + n);
        if (r && r.ops) { r.via = 'number'; return r; }
      }
    }
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
        toks.push({ v: buf.join('\n').trim(), q: true, line: i });
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
          toks.push({ v: line.slice(p + 1, e), q: true, line: i });
          p = e + 1;
          continue;
        }
        let e = p;
        while (e < n && line[e] !== ' ' && line[e] !== '\t') e++;
        toks.push({ v: line.slice(p, e), q: false, line: i });
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
        // a number of values that is not a multiple of the number of tags: a value is missing or the file is cut
        const broken = tags.length && vals.length % tags.length !== 0 ? vals.length : 0;
        cur.loops.push({ tags, rows, broken });
        continue;
      }
      if (isTag(k)) {
        const nx = t[i + 1];
        if (nx && !isTag(nx) && !isKw(nx)) {
          // a value with spaces and no quotes (not valid CIF, but written by some programs: P 21/c): the bare words
          // that follow on the same line belong to it
          let v = nx.v, j = i + 2;
          if (!nx.q) while (j < t.length && !t[j].q && t[j].line === nx.line && !isTag(t[j]) && !isKw(t[j])) { v += ' ' + t[j].v; j++; }
          cur.items[k.v.toLowerCase()] = v; i = j;
        } else i++;
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

  /* 'D' when the type symbol or the label names deuterium (D, D1, D12A), else null. elementOf gives H for it. */
  function isotopeOf(typeSymbol, label) {
    if (typeSymbol && typeSymbol !== '?' && typeSymbol !== '.') return /^D(?![a-z])/.test(typeSymbol) && !/^D[BSY]/i.test(typeSymbol) ? 'D' : null;
    return /^D(\d|$)/.test(label || '') ? 'D' : null;
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
      // Pb1, PB1 and pb1 are lead; C1A is carbon. An upper-case pair is the two-letter element when there is one
      // (CL1 chlorine, SN1 tin), except HO, which is the name of an H on an O far more often than holmium.
      const two = norm(raw);
      const secondLower = raw[1] === raw[1].toLowerCase();
      const upperPair = raw === raw.toUpperCase();
      if (RC[two] !== undefined && (secondLower || RC[raw[0].toUpperCase()] === undefined || (upperPair && two !== 'Ho'))) return two;
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
    // a, b, c above zero, angles between 0 and 180 degrees, and a volume above zero (each angle smaller than the
    // sum of the other two, and the sum of all three below 360 degrees)
    const vol2 = 1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg;
    if (!(a > 0 && b > 0 && c > 0 && al > 0 && al < 180 && be > 0 && be < 180 && ga > 0 && ga < 180) || !(vol2 > 1e-8)) {
      throw new Error('The cell parameters (a ' + a + ', b ' + b + ', c ' + c + ', α ' + al + ', β ' + be + ', γ ' + ga + ') describe no cell: its volume is not above zero.');
    }
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

  /* B = 8 pi^2 U: the two ways to write an isotropic displacement parameter */
  const B_PER_U = 8 * Math.PI * Math.PI;
  /* equivalent isotropic U of an anisotropic tensor [U11, U22, U33, U23, U13, U12]:
     one third of the sum of Uij a*i a*j (ai . aj) */
  function uEquiv(cell, U) {
    const dir = [cell.A, cell.B, cell.C];
    const rl = cell.recip.map(norm);
    const M = [[U[0], U[5], U[4]], [U[5], U[1], U[3]], [U[4], U[3], U[2]]];
    let s = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += M[i][j] * rl[i] * rl[j] * dot(dir[i], dir[j]);
    return s / 3;
  }

  /* ---------- blocks -> structure ---------- */
  /* the atom-site loop of a data block, or null when the block holds no atoms */
  const siteLoopOf = (b) => {
    const lp = b.loops.find((l) => l.tags.includes('_atom_site_fract_x'));
    return lp && lp.rows.length ? lp : null;
  };
  const NO_SITES = 'No atom sites with fractional coordinates were found in this file.';
  /* the first data block that holds atoms */
  function readCif(text) {
    const chosen = parseBlocks(text).find(siteLoopOf);
    if (!chosen) throw new Error(NO_SITES);
    return cifStructure(chosen);
  }
  /* Every data block that holds atoms, each as a structure of its own. A CIF from a paper or a deposition often
     holds several. Returns { structures, errors }: a block that cannot be read is in errors as { block, message },
     and does not stop the others. */
  function readCifAll(text) {
    const blocks = parseBlocks(text).filter(siteLoopOf);
    if (!blocks.length) throw new Error(NO_SITES);
    const structures = [], errors = [];
    for (const b of blocks) {
      try { structures.push(cifStructure(b)); } catch (err) { errors.push({ block: b.name, message: err.message }); }
    }
    if (!structures.length) throw new Error(errors[0].message);
    return { structures, errors };
  }
  function cifStructure(chosen) {
    const siteLoop = siteLoopOf(chosen);
    if (siteLoop && siteLoop.broken) throw new Error('The atom-site loop has ' + siteLoop.broken + ' values, which is not a whole number of rows of ' + siteLoop.tags.length + ': a value is missing, or the file is cut. Crysta reads no atoms from it.');
    const it = chosen.items;
    const pick = (...tags) => { for (const t of tags) if (it[t] !== undefined && it[t] !== '?' && it[t] !== '.') return it[t]; return null; };
    const cellRaw = ['_cell_length_a', '_cell_length_b', '_cell_length_c', '_cell_angle_alpha', '_cell_angle_beta', '_cell_angle_gamma'].map((t) => it[t]);
    const cellNum = cellRaw.map((s) => parseFloat(s));
    if (cellNum.some((x) => !isFinite(x))) throw new Error('The unit cell parameters are missing or unreadable.');
    const cell = makeCell(...cellNum);

    let ops = [];
    for (const l of chosen.loops) {
      const idx = l.tags.findIndex((t) => t === '_symmetry_equiv_pos_as_xyz' || t === '_space_group_symop_operation_xyz' || t === '_space_group_symop.operation_xyz');
      if (idx >= 0) {
        if (l.broken) throw new Error('The loop of symmetry operators has a value too many or too few: the file is damaged.');
        ops = l.rows.map((r) => parseSymop(r[idx])).filter(Boolean); break;
      }
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
    let symNote = null;

    const col = (t) => siteLoop.tags.indexOf(t);
    const cL = col('_atom_site_label'), cT = col('_atom_site_type_symbol');
    const cX = col('_atom_site_fract_x'), cY = col('_atom_site_fract_y'), cZ = col('_atom_site_fract_z');
    const cO = col('_atom_site_occupancy'), cD = col('_atom_site_disorder_group'), cA = col('_atom_site_disorder_assembly');
    const cU = col('_atom_site_u_iso_or_equiv'), cB = col('_atom_site_b_iso_or_equiv');
    const cM = col('_atom_site_symmetry_multiplicity');
    // anisotropic displacement parameters, for sites that list no isotropic or equivalent value
    const aniso = new Map();
    for (const l of chosen.loops) {
      const cl = l.tags.indexOf('_atom_site_aniso_label');
      if (cl < 0) continue;
      for (const kind of ['u', 'b']) {
        const idx = ['11', '22', '33', '23', '13', '12'].map((t) => l.tags.indexOf('_atom_site_aniso_' + kind + '_' + t));
        if (idx.some((k) => k < 0)) continue;
        for (const r of l.rows) {
          const v = idx.map((k) => parseFloat(r[k]));
          if (v.every(isFinite)) aniso.set(r[cl], uEquiv(cell, v) / (kind === 'b' ? B_PER_U : 1));
        }
      }
    }
    const sites = [];
    const skipped = [];
    const cF = col('_atom_site_calc_flag');
    // a coordinate: a number with or without its s.u. (0.1234(5)), or a fraction (1/3)
    const coord = (v) => { const m = /^([-+]?\d+)\/(\d+)$/.exec(v || ''); return m ? parseInt(m[1], 10) / parseInt(m[2], 10) : parseFloat(v); };
    for (const r of siteLoop.rows) {
      const f = [coord(r[cX]), coord(r[cY]), coord(r[cZ])];
      const label = cL >= 0 ? r[cL] : (cT >= 0 ? r[cT] : '?');
      // a dummy site (a ring centroid Cg1, calc_flag dum) is not an atom
      if (cF >= 0 && /^dum$/i.test(r[cF])) { skipped.push({ label, why: 'a dummy site' }); continue; }
      if (f.some((x) => !isFinite(x))) { skipped.push({ label, why: 'no coordinates' }); continue; }
      const el = elementOf(cT >= 0 ? r[cT] : null, label);
      if (!el) { skipped.push({ label, why: 'element not recognised' }); continue; }
      const occ = cO >= 0 && isFinite(parseFloat(r[cO])) ? parseFloat(r[cO]) : 1;
      let dg = cD >= 0 ? r[cD] : '.';
      if (dg === '?' || dg === '0' || dg === '') dg = '.';
      let asm = cA >= 0 ? r[cA] : '.';
      if (asm === '?' || asm === '') asm = '.';
      // mean-square displacement U in square angstrom, or null when the file gives none
      let u = cU >= 0 ? parseFloat(r[cU]) : NaN;
      if (!isFinite(u) && cB >= 0) u = parseFloat(r[cB]) / B_PER_U;
      if (!isFinite(u) && aniso.has(label)) u = aniso.get(label);
      const mult = cM >= 0 ? parseInt(r[cM], 10) : NaN;
      sites.push({ label, el, f, occ, dg, asm, u: isFinite(u) ? u : null, minor: false, symdis: dg !== '.' && /^-/.test(dg), mult: mult > 0 ? mult : 0, iso: isotopeOf(cT >= 0 ? r[cT] : null, label) });
    }
    // within each disorder assembly, the group with the highest mean occupancy is the major part (on a tie, a
    // positive group, then the first listed). Negative groups (disorder over a symmetry element) take part only
    // in a named assembly: the file then says which groups are alternatives. With no assembly they are always
    // kept, and buildCell keeps one orientation of them.
    const groups = new Map();
    for (const st of sites) {
      if (st.dg === '.' || (st.symdis && st.asm === '.')) continue;
      const k = st.asm + '|' + st.dg;
      const g = groups.get(k) || { asm: st.asm, dg: st.dg, sum: 0, n: 0, neg: st.symdis };
      g.sum += st.occ; g.n++;
      groups.set(k, g);
    }
    const best = new Map();
    for (const g of groups.values()) {
      const mean = g.sum / g.n;
      const b = best.get(g.asm);
      if (!b || mean > b.mean + 1e-6 || (Math.abs(mean - b.mean) <= 1e-6 && b.neg && !g.neg)) best.set(g.asm, { dg: g.dg, mean, neg: g.neg });
    }
    for (const st of sites) if (st.dg !== '.' && !(st.symdis && st.asm === '.') && best.get(st.asm).dg !== st.dg) st.minor = true;
    if (!sites.length) throw new Error('No usable atom sites were found in this file.');
    // a symbol or number with two origin choices: let the atom positions choose
    if (symSource === 'hm' || symSource === 'number') {
      const r = symbolOps(pick('_symmetry_space_group_name_h-m', '_space_group_name_h-m_alt', '_space_group_name_h-m'), pick('_symmetry_int_tables_number', '_space_group_it_number'), cell, sites);
      if (r) { ops = r.ops; symNote = r.note || null; }
    }

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
      symNote,
      cellRaw,
      skipped,
      format: 'CIF'
    };
    return { cell, ops, sites, meta };
  }

  /* ---------- other formats: each returns the same structure record as readCif ---------- */
  const cellFromVectors = (A, B, C) => {
    const ang = (u, v) => angleDeg(u, v);
    return [norm(A), norm(B), norm(C), ang(B, C), ang(A, C), ang(A, B)];
  };
  const inv3 = (m) => {
    const [a, b, c] = m;
    const det = dot(a, cross(b, c));
    const r = [cross(b, c), cross(c, a), cross(a, b)].map((v) => v.map((x) => x / det));
    return [[r[0][0], r[1][0], r[2][0]], [r[0][1], r[1][1], r[2][1]], [r[0][2], r[1][2], r[2][2]]];
  };
  const plainMeta = (block, cellNum, format, extra) => Object.assign({
    block, spaceGroup: null, sgNumber: null, crystalSystem: null, temperature: null, R1: null, Z: null, ccdc: null,
    symSource: 'p1', cellRaw: cellNum.map((x, i) => (i < 3 ? x.toFixed(4) : x.toFixed(3))), skipped: [], format
  }, extra || {});
  /* A left-handed set of lattice vectors (a . (b x c) < 0) gives the mirror image when the cell is rebuilt from
     its lengths and angles. -a, -b, -c is the same lattice, right-handed, with the same lengths and angles; the
     fractional coordinates in it are -x, -y, -z. Returns true when the sites were changed. */
  const rightHanded = (vec, sites) => {
    if (dot(vec[0], cross(vec[1], vec[2])) >= 0) return false;
    for (const s of sites) s.f = s.f.map((x) => -x);
    return true;
  };
  const plainSite = (label, el, f, occ) => ({ label, el, f, occ: occ === undefined ? 1 : occ, dg: '.', asm: '.', u: null, minor: false, symdis: false });

  /* VASP POSCAR / CONTCAR (version 5: with a line of element symbols) */
  function readPoscar(text) {
    const L = text.split(/\r?\n/);
    const nums = (line) => line.trim().split(/\s+/).map(parseFloat);
    // one scaling factor (a negative one is the volume), or three: one for each Cartesian component
    const sc = nums(L[1]).filter(isFinite);
    let scale = sc[0];
    let vec = [nums(L[2]), nums(L[3]), nums(L[4])].map((v) => v.slice(0, 3));
    if (!isFinite(scale) || vec.some((v) => v.length < 3 || v.some((x) => !isFinite(x)))) throw new Error('The lattice vectors of this POSCAR file are unreadable.');
    const s3 = sc.length >= 3 ? sc.slice(0, 3) : null;
    if (s3 && s3.some((x) => !(x > 0))) throw new Error('The three scaling factors of this POSCAR file have to be above zero.');
    if (!s3 && scale < 0) scale = Math.cbrt(-scale / Math.abs(dot(vec[0], cross(vec[1], vec[2]))));
    const scaleV = (v) => (s3 ? v.map((x, k) => x * s3[k]) : v.map((x) => x * scale));
    vec = vec.map(scaleV);
    const names = L[5].trim().split(/\s+/);
    if (names.every((t) => /^\d+$/.test(t))) throw new Error('This POSCAR file has no line of element symbols (VASP 4 format). Add the symbols above the atom counts.');
    const counts = L[6].trim().split(/\s+/).map((t) => parseInt(t, 10));
    let row = 7;
    if (/^s/i.test(L[row].trim())) row++;
    const cart = /^[ck]/i.test(L[row].trim());
    row++;
    const cellNum = cellFromVectors(vec[0], vec[1], vec[2]);
    const cell = makeCell(...cellNum);
    const iv = inv3(vec);
    const sites = [];
    const skipped = [];
    names.forEach((nm0, k) => {
      // the species name without the POTCAR suffix (Pb_d, Sn_sv_GW, H/...)
      const nm = nm0.replace(/[_/].*$/, '');
      const el = elementOf(nm, null);
      for (let n = 0; n < (counts[k] || 0); n++, row++) {
        const v = nums(L[row] || '').slice(0, 3);
        const label = nm + (n + 1);
        if (v.length < 3 || v.some((x) => !isFinite(x))) { skipped.push({ label, why: 'no coordinates' }); continue; }
        if (!el) { skipped.push({ label, why: 'element not recognised' }); continue; }
        const c = cart ? scaleV(v) : null;
        const f = cart ? [0, 1, 2].map((j) => c[0] * iv[0][j] + c[1] * iv[1][j] + c[2] * iv[2][j]) : v;
        const st = plainSite(label, el, f);
        st.iso = isotopeOf(nm, null);
        sites.push(st);
      }
    });
    if (!sites.length) throw new Error('No atoms were found in this POSCAR file.');
    const meta = plainMeta(L[0].trim() || 'POSCAR', cellNum, 'POSCAR');
    meta.skipped = skipped;
    meta.leftHanded = rightHanded(vec, sites);
    return { cell, ops: [parseSymop('x,y,z')], sites, meta };
  }

  /* XYZ. With a Lattice="..." entry on the comment line (extended XYZ) the cell is used; without one the
     molecule is put in a box of its own, 12 A larger than the molecule, and flagged as having no lattice. */
  function readXyz(text) {
    const L = text.split(/\r?\n/);
    const n = parseInt(L[0], 10);
    if (!(n > 0)) throw new Error('The first line of an XYZ file has to be the number of atoms.');
    const raw = [];
    const skipped = [];
    // extended XYZ: Properties=species:S:1:pos:R:3:... gives the columns of the species and of the positions
    let cS = 0, cP = 1;
    const pm = (L[1] || '').match(/properties\s*=\s*"?([^"\s]+)/i);
    if (pm) {
      const f = pm[1].split(':');
      let col = 0;
      for (let q = 0; q + 2 < f.length; q += 3) {
        const nm = f[q].toLowerCase(), w = parseInt(f[q + 2], 10) || 1;
        if (nm === 'species' || nm === 'element' || nm === 'symbols') cS = col;
        if (nm === 'pos' || nm === 'positions') cP = col;
        col += w;
      }
    }
    for (let k = 0; k < n; k++) {
      const t = (L[2 + k] || '').trim().split(/\s+/);
      const xyz = t.slice(cP, cP + 3).map(parseFloat);
      // the species as a symbol, or as an atomic number
      const sp = /^\d+$/.test(t[cS] || '') ? (ELEMENTS[parseInt(t[cS], 10) - 1] || t[cS]) : t[cS];
      const el = elementOf(sp, null);
      if (xyz.length < 3 || xyz.some((x) => !isFinite(x))) { skipped.push({ label: sp || '?', why: 'no coordinates' }); continue; }
      if (!el) { skipped.push({ label: sp, why: 'element not recognised' }); continue; }
      raw.push({ el, xyz, iso: isotopeOf(sp, null) });
    }
    if (!raw.length) throw new Error('No atoms were found in this XYZ file.');
    const lm = (L[1] || '').match(/lattice\s*=\s*"([^"]+)"/i);
    let vec = null;
    if (lm) {
      const v = lm[1].trim().split(/\s+/).map(parseFloat);
      if (v.length === 9 && v.every(isFinite)) vec = [v.slice(0, 3), v.slice(3, 6), v.slice(6, 9)];
    }
    let origin = [0, 0, 0];
    const molecular = !vec;
    if (!vec) {
      const lo = [0, 1, 2].map((k) => Math.min(...raw.map((a) => a.xyz[k])));
      const hi = [0, 1, 2].map((k) => Math.max(...raw.map((a) => a.xyz[k])));
      const side = hi.map((x, k) => x - lo[k] + 12);
      vec = [[side[0], 0, 0], [0, side[1], 0], [0, 0, side[2]]];
      origin = lo.map((x) => x - 6);
    }
    const cellNum = cellFromVectors(vec[0], vec[1], vec[2]);
    const cell = makeCell(...cellNum);
    const iv = inv3(vec);
    const count = {};
    const sites = raw.map((a) => {
      const c = sub(a.xyz, origin);
      const nm = a.iso || a.el;
      count[nm] = (count[nm] || 0) + 1;
      const st = plainSite(nm + count[nm], a.el, [0, 1, 2].map((j) => c[0] * iv[0][j] + c[1] * iv[1][j] + c[2] * iv[2][j]));
      st.iso = a.iso;
      return st;
    });
    const meta = plainMeta('xyz', cellNum, 'XYZ', { molecular });
    meta.skipped = skipped;
    meta.leftHanded = rightHanded(vec, sites);
    return { cell, ops: [parseSymop('x,y,z')], sites, meta };
  }

  /* SHELX .res / .ins: CELL, LATT, SYMM, SFAC, FVAR, PART and the atom lines */
  const SHELX_WORDS = new Set(('ABIN ACTA AFIX ANIS ANSC ANSR BASF BIND BLOC BOND BUMP CELL CGLS CHIV CONF CONN DAMP DANG DEFS DELU DFIX DISP EADP END EQIV EXTI EXYZ FEND FLAT FMAP FRAG FREE FVAR GRID HFIX HKLF HTAB ISOR LATT LAUE LIST L.S. MERG MORE MOVE MPLA NCSY NEUT OMIT PART PLAN PRIG REM RESI RIGU RTAB SADI SAME SFAC SHEL SIMU SIZE SPEC STIR SUMP SWAT SYMM TEMP TITL TWIN TWST UNIT WGHT WIGL WPDB XNPD ZERR').split(' '));
  function readShelx(text) {
    // join continuation lines (a trailing "=")
    const L = [];
    let carry = '';
    for (const ln of text.split(/\r?\n/)) {
      const t = carry + ln;
      if (/=\s*$/.test(t)) { carry = t.replace(/=\s*$/, ' '); continue; }
      carry = '';
      L.push(t);
    }
    let cellNum = null, latt = 1, title = 'shelx', part = 0, partOcc = null, zerr = null;
    const symm = [];
    let sfac = [];
    let fvar = [];
    const sites = [];
    const skipped = [];
    for (const ln of L) {
      if (!ln.trim() || ln[0] === ' ' || ln[0] === '!') continue;
      const t = ln.trim().split(/\s+/);
      const key = t[0].toUpperCase();
      const word = key.slice(0, 4);
      if (word === 'TITL') { title = ln.trim().slice(4).trim() || title; continue; }
      if (word === 'CELL') { cellNum = t.slice(2, 8).map(parseFloat); continue; }
      if (word === 'ZERR') { zerr = t[1]; continue; }
      if (word === 'LATT') { latt = parseInt(t[1], 10) || 1; continue; }
      if (word === 'SYMM') { const o = parseSymop(ln.trim().slice(4)); if (o) symm.push(o); continue; }
      if (word === 'SFAC') {
        // short form lists the elements; long form is one element followed by its scattering factors
        if (t.length > 2 && isFinite(parseFloat(t[2]))) sfac.push(t[1]); else sfac = sfac.concat(t.slice(1));
        continue;
      }
      if (word === 'FVAR') { fvar = fvar.concat(t.slice(1).map(parseFloat)); continue; }
      if (word === 'PART') { part = parseInt(t[1], 10) || 0; partOcc = t[2] !== undefined ? parseFloat(t[2]) : null; continue; }
      if (word === 'HKLF' || key === 'END') break;
      if (SHELX_WORDS.has(word) || SHELX_WORDS.has(key) || /^REM/.test(key)) continue;
      // atom line: name sfac x y z sof ... A name Q and a number is a peak of the difference map, not an atom
      if (/^Q\d+$/i.test(t[0])) continue;
      const k = parseInt(t[1], 10);
      const f = t.slice(2, 5).map(parseFloat);
      if (!(k >= 1) || f.length < 3) continue;
      // SHELX fixes a parameter by adding 10: remove that from the coordinates
      const xyz = f.map((x) => (Math.abs(x) > 5 ? x - 10 * Math.sign(x) : x));
      const el = elementOf(sfac[k - 1] || null, t[0]);
      if (xyz.some((x) => !isFinite(x))) { skipped.push({ label: t[0], why: 'no coordinates' }); continue; }
      if (!el) { skipped.push({ label: t[0], why: 'element not recognised' }); continue; }
      let sof = t[5] !== undefined ? parseFloat(t[5]) : 11;
      if (partOcc !== null && isFinite(partOcc)) sof = partOcc;
      let occ = 1, fv = 0;
      if (isFinite(sof)) {
        const m = Math.round(Math.abs(sof) / 10);
        const rest = Math.abs(sof) - 10 * m;
        if (m <= 1) occ = rest;                                  // fixed (10 + occ) or free (occ)
        else if (fvar[m - 1] !== undefined) { occ = sof > 0 ? rest * fvar[m - 1] : rest * (1 - fvar[m - 1]); fv = m; }
        else occ = rest;
      }
      const st = plainSite(t[0], el, xyz, occ);
      st.fv = fv;
      st.iso = isotopeOf(sfac[k - 1] || null, t[0]);
      st.siteOcc = true;                                         // SHELX occupancies include the site multiplicity
      // displacement: one value is Uiso (negative: that many times the U of the atom it rides on), six are Uij
      const uv = t.slice(6, 12).map(parseFloat).filter(isFinite).map((x) => (Math.abs(x) > 5 ? x - 10 * Math.sign(x) : x));
      if (uv.length >= 6) st.uij = uv.slice(0, 6);
      else if (uv.length >= 1) st.uRaw = uv[0];
      if (part !== 0) { st.dg = String(part); st.symdis = part < 0; }
      sites.push(st);
    }
    if (!cellNum || cellNum.length < 6 || cellNum.some((x) => !isFinite(x))) throw new Error('No CELL line was found in this SHELX file.');
    if (!sites.length) throw new Error('No atoms were found in this SHELX file.');
    const cell = makeCell(...cellNum);
    let lastU = null;
    for (const st of sites) {
      if (st.uij) st.u = uEquiv(cell, st.uij);
      else if (st.uRaw !== undefined) st.u = st.uRaw >= 0 ? st.uRaw : (lastU === null ? null : -st.uRaw * lastU);
      if (st.el !== 'H' && st.u !== null) lastU = st.u;
      delete st.uij;
      delete st.uRaw;
    }
    // symmetry: the listed operators, the identity, an inversion centre when LATT > 0, and the lattice centring
    let ops = [parseSymop('x,y,z')].concat(symm);
    if (latt > 0) ops = ops.concat(ops.map((o) => ({ R: o.R.map((r) => r.map((x) => -x)), T: o.T.map((x) => -x) })));
    const centring = { 1: 'P', 2: 'I', 3: 'R', 4: 'F', 5: 'A', 6: 'B', 7: 'C' }[Math.abs(latt)] || 'P';
    const full = [];
    for (const tr of HALL_LATT[centring]) for (const o of ops) full.push({ R: o.R, T: o.T.map((x, i) => x + tr[i]) });
    // occupancy: SHELX stores occupancy x (site multiplicity / general multiplicity); undo that from the number of copies
    const tmp = { cell, ops: full, sites };
    for (const st of sites) {
      let copies = 0;
      const seen = [];
      for (const op of full) {
        const g = [0, 1, 2].map((r) => mod1(op.R[r][0] * st.f[0] + op.R[r][1] * st.f[1] + op.R[r][2] * st.f[2] + op.T[r]));
        if (!seen.some((h) => norm(cell.toCart([0, 1, 2].map((i) => { const d = h[i] - g[i]; return d - Math.round(d); }))) < SAME_POS)) { seen.push(g); copies++; }
      }
      st.occ = Math.min(1, st.occ * full.length / copies);
      delete st.siteOcc;
    }
    // major part of each disordered region. The atoms of a positive PART that refine their occupancy with free
    // variable m (sof 21, -21 for m = 2) are region m; the atoms of positive PARTs with a fixed occupancy are one
    // region. Two PARTs with different numbers whose non-H atoms come closer than 1.6 A (also through symmetry) are
    // alternatives of one place: their regions are one region (SUMP, one free variable for each PART). In each
    // region the PART with the highest mean occupancy is the major part. Negative PARTs (disorder over a symmetry
    // element) are never a minor part: one orientation of them is kept elsewhere.
    const stat = new Map();
    const keyOf = (st) => (st.fv ? 'fv' + st.fv : 'fixed') + '|' + parseInt(st.dg, 10);
    for (const st of sites) {
      const p = parseInt(st.dg, 10);
      if (!(p > 0)) continue;
      const k = keyOf(st);
      const g = stat.get(k) || { k, base: st.fv ? 'fv' + st.fv : 'fixed', p, sum: 0, n: 0, atoms: [] };
      g.sum += st.occ; g.n++;
      if (st.el !== 'H') g.atoms.push(st.f);
      stat.set(k, g);
    }
    const root = new Map();
    const find = (k) => { while (root.get(k) !== k) k = root.get(k); return k; };
    const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) root.set(rb, ra); };
    for (const g of stat.values()) root.set(g.k, g.k);
    const byBase = new Map();
    for (const g of stat.values()) { if (byBase.has(g.base)) join(byBase.get(g.base), g.k); else byBase.set(g.base, g.k); }
    const groupsL = Array.from(stat.values());
    const close = (P, Q) => {
      for (const f of P) for (const q of Q) for (const op of full) {
        const g = [0, 1, 2].map((r) => op.R[r][0] * q[0] + op.R[r][1] * q[1] + op.R[r][2] * q[2] + op.T[r]);
        if (norm(cell.toCart([0, 1, 2].map((i) => { const d = g[i] - f[i]; return d - Math.round(d); }))) < 1.6) return true;
      }
      return false;
    };
    for (let i = 0; i < groupsL.length; i++) for (let j = i + 1; j < groupsL.length; j++) {
      const A = groupsL[i], B = groupsL[j];
      if (A.p === B.p || find(A.k) === find(B.k)) continue;
      if (A.atoms.length * B.atoms.length * full.length <= 2e6 && close(A.atoms, B.atoms)) join(A.k, B.k);
    }
    const bestOf = new Map();
    for (const g of groupsL.slice().sort((a, b) => a.p - b.p)) {
      const r = find(g.k), mean = g.sum / g.n, b = bestOf.get(r);
      if (!b || mean > b.mean + 1e-6) bestOf.set(r, { p: g.p, mean });
    }
    for (const st of sites) {
      const p = parseInt(st.dg, 10);
      if (p > 0 && bestOf.get(find(keyOf(st))).p !== p) st.minor = true;
      delete st.fv;
    }
    const meta = plainMeta(title.split(/\s+/)[0] || 'shelx', cellNum, 'SHELX', { symSource: 'listed' });
    if (zerr && parseFloat(zerr) > 0) meta.Z = zerr;
    meta.cellRaw = cellNum.map(String);
    meta.skipped = skipped;
    return { cell: tmp.cell, ops: full, sites, meta };
  }

  /* FHI-aims geometry.in, the format of the structure files of the HybriD3 database: three lattice_vector lines
     and one line for each atom, "atom x y z El" in angstrom or "atom_frac u v w El" in cell fractions. The file
     lists every atom of the cell, so it has no symmetry, no occupancy and no displacement parameters.
     Without lattice vectors the file is a molecule, which gets a box of its own as an XYZ file does. */
  function readAims(text) {
    const vec = [];
    const raw = [];
    const skipped = [];
    for (const ln of text.split(/\r?\n/)) {
      const t = ln.replace(/#.*$/, '').trim().split(/\s+/);
      const key = t[0];
      if (key === 'lattice_vector') { vec.push(t.slice(1, 4).map(parseFloat)); continue; }
      if (key !== 'atom' && key !== 'atom_frac') continue;       // initial_moment, constrain_relaxation and the like
      const v = t.slice(1, 4).map(parseFloat);
      const el = elementOf(t[4] || null, null);
      if (v.length < 3 || v.some((x) => !isFinite(x))) { skipped.push({ label: t[4] || '?', why: 'no coordinates' }); continue; }
      if (!el) { skipped.push({ label: t[4] || '?', why: 'element not recognised' }); continue; }
      raw.push({ el, v, frac: key === 'atom_frac', iso: isotopeOf(t[4] || null, null) });
    }
    if (!raw.length) throw new Error('No atoms were found in this geometry.in file.');
    if (vec.length && (vec.length !== 3 || vec.some((u) => u.length < 3 || u.some((x) => !isFinite(x))))) throw new Error('This geometry.in file does not have three readable lattice_vector lines.');
    const molecular = !vec.length;
    let cellVec = vec;
    let origin = [0, 0, 0];
    if (molecular) {
      if (raw.some((a) => a.frac)) throw new Error('This geometry.in file has atom_frac lines but no lattice_vector lines.');
      const lo = [0, 1, 2].map((k) => Math.min(...raw.map((a) => a.v[k])));
      const hi = [0, 1, 2].map((k) => Math.max(...raw.map((a) => a.v[k])));
      const side = hi.map((x, k) => x - lo[k] + 12);
      cellVec = [[side[0], 0, 0], [0, side[1], 0], [0, 0, side[2]]];
      origin = lo.map((x) => x - 6);
    }
    const cellNum = cellFromVectors(cellVec[0], cellVec[1], cellVec[2]);
    const cell = makeCell(...cellNum);
    const iv = inv3(cellVec);
    const count = {};
    const sites = raw.map((a) => {
      const nm = a.iso || a.el;
      count[nm] = (count[nm] || 0) + 1;
      const c = sub(a.v, origin);
      const f = a.frac ? a.v : [0, 1, 2].map((j) => c[0] * iv[0][j] + c[1] * iv[1][j] + c[2] * iv[2][j]);
      const st = plainSite(nm + count[nm], a.el, f);
      st.iso = a.iso;
      return st;
    });
    const meta = plainMeta('geometry.in', cellNum, 'FHI-aims', { molecular });
    meta.skipped = skipped;
    meta.leftHanded = rightHanded(cellVec, sites);
    return { cell, ops: [parseSymop('x,y,z')], sites, meta };
  }

  /* pick the reader from the file name, falling back on the content */
  function readStructure(text, name) {
    const ext = (String(name || '').match(/\.([A-Za-z0-9]+)$/) || [])[1];
    const e = ext ? ext.toLowerCase() : '';
    const base = String(name || '').replace(/^.*[\\/]/, '').toUpperCase();
    if (e === 'res' || e === 'ins') return readShelx(text);
    if (e === 'xyz' || e === 'extxyz') return readXyz(text);
    if (base === 'CONTROL.IN') throw new Error('control.in is the control file of an FHI-aims run, not a structure. Open geometry.in.');
    if (e === 'vasp' || e === 'poscar' || /^(POSCAR|CONTCAR)/.test(base)) return readPoscar(text);
    // a geometry.in file is known by its lines, not by its name: some databases give a CIF under that name. A line
    // is "lattice_vector x y z" or "atom x y z El" ("atom_frac" for fractional coordinates).
    if (/^\s*(lattice_vector\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+|atom(_frac)?\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+[A-Za-z])/m.test(text) && !/_atom_site_fract_x/.test(text)) return readAims(text);
    if (/^\s*(#|data_)/m.test(text) && /_atom_site_fract_x/.test(text)) return readCif(text);
    if (/^\s*CELL\s+[\d.]+/m.test(text) && /^\s*SFAC\s/m.test(text)) return readShelx(text);
    const first = text.split(/\r?\n/);
    if (/^\s*\d+\s*$/.test(first[0] || '') && /^\s*[A-Za-z]{1,2}\s+-?[\d.]/.test(first[2] || '')) return readXyz(text);
    if (isFinite(parseFloat(first[1])) && (first[2] || '').trim().split(/\s+/).length === 3 && (first[5] || '').trim().length) {
      try { return readPoscar(text); } catch (err) { /* not a POSCAR after all */ }
    }
    return readCif(text);
  }

  /* Every structure of a file: { structures, errors }. Only a CIF can hold more than one. */
  function readStructures(text, name) {
    const isCif = /\.cif$/i.test(String(name || '')) || (/^\s*data_/m.test(text) && /_atom_site_fract_x/.test(text));
    if (isCif && /_atom_site_fract_x/.test(text)) return readCifAll(text);
    const one = readStructure(text, name);
    // a file with no known ending that the CIF reader took after all
    return one.meta.format === 'CIF' ? readCifAll(text) : { structures: [one], errors: [] };
  }

  /* ---------- zip archives, and the download of a HybriD3 data set ---------- */
  /* The files of a zip archive, read from its list of files (the central directory). `bytes` is a Uint8Array.
     Each entry: { name, method, start, packed, size, encrypted }. method 0 is "stored", 8 is "deflate".
     The data of an entry are bytes.subarray(start, start + packed). This function does not unpack them. */
  function zipEntries(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = bytes.length;
    // the end record has the signature PK 05 06. It is in the last 22 bytes, or before a comment of up to 65535 bytes.
    let end = -1;
    for (let i = n - 22; i >= Math.max(0, n - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error('This file is not a zip archive.');
    const count = dv.getUint16(end + 10, true);
    let p = dv.getUint32(end + 16, true);
    const decode = (part) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(part); } catch (err) { return Array.from(part, (ch) => String.fromCharCode(ch)).join(''); } };
    const out = [];
    for (let k = 0; k < count; k++) {
      if (p + 46 > n || dv.getUint32(p, true) !== 0x02014b50) throw new Error('The list of files in this zip archive is damaged.');
      const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true);
      const packed = dv.getUint32(p + 20, true), size = dv.getUint32(p + 24, true);
      const nName = dv.getUint16(p + 28, true), nExtra = dv.getUint16(p + 30, true), nComment = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = decode(bytes.subarray(p + 46, p + 46 + nName));
      p += 46 + nName + nExtra + nComment;
      if (/\/$/.test(name)) continue;                       // a folder
      if (local + 30 > n || dv.getUint32(local, true) !== 0x04034b50) throw new Error('The file ' + name + ' in this zip archive is damaged.');
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      if (start + packed > n) throw new Error('The file ' + name + ' in this zip archive is damaged.');
      out.push({ name, method, start, packed, size, encrypted: (flags & 1) === 1 });
    }
    return out;
  }
  /* a file name that Crysta reads as a structure */
  const STRUCTURE_NAME = /\.(cif|res|ins|vasp|poscar|xyz|extxyz|in)$|(^|\/)(POSCAR|CONTCAR)[^\/]*$/i;
  /* The structure files to open from a list of file names of a zip archive.
     hybrid = true for the download of a HybriD3 data set: the CIFs are used, and the geometry files (.in) only
     if there is no CIF. A file in a folder such as "additional" is used only when the top folder has no file
     of that kind. For other archives: each file with a known ending. */
  function zipStructureNames(names, hybrid) {
    const all = names.filter((x) => STRUCTURE_NAME.test(x) && !/(^|\/)(\.|__MACOSX\/)/.test(x) && !/(^|\/)control\.in$/i.test(x));
    if (!hybrid) return all;
    const group = (re) => {
      const mine = all.filter((x) => re.test(x));
      const top = mine.filter((x) => x.split('/').length <= 2);
      return top.length ? top : mine;
    };
    const cifs = group(/\.cif$/i);
    return cifs.length ? cifs : group(/\.in$/i);
  }
  /* What the info.txt of a HybriD3 download states: the data set number, the reference, the temperature (K) and
     the origin. null when the text is not such a file. */
  function hybridInfo(text) {
    const m = /hybrid3\.duke\.edu\/materials\/dataset\/(\d+)/.exec(String(text || ''));
    if (!m) return null;
    const ref = /^Reference:\s*(.+)$/m.exec(text);
    const temp = /temperature\s*=\s*([-\d.]+)\s*K/.exec(text);
    const origin = /^Origin:\s*(\S+)/m.exec(text);
    return { dataset: +m[1], reference: ref ? ref[1].trim().replace(/\s{2,}/g, ' ') : '', temperature: temp ? String(+temp[1]) : '', experimental: origin ? /^exp/i.test(origin[1]) : null };
  }

  /* ---------- structure -> unit cell contents, molecules, framework ---------- */
  const compatible = (a, b) => a.dg === '.' || b.dg === '.' || a.dg === b.dg;
  const wrap1 = (x) => { let y = x - Math.floor(x); if (y > 1 - 1e-6) y = 0; return y; };
  const minImage = (d) => [d[0] - Math.round(d[0]), d[1] - Math.round(d[1]), d[2] - Math.round(d[2])];

  /* Every pair of points closer than rmax (angstrom), also through the cell faces: for each point i, the list of
     { j, s, d } with point j moved by the lattice translation s (each component -1, 0 or 1) at distance d from i.
     j === i only with s not zero. F holds fractional coordinates; a point outside [0, 1) is first put inside, and s
     then refers to the coordinates as given. The search uses bins of about rmax, so the time grows with the number
     of points, not with its square. */
  function neighbours(cell, F, rmax) {
    const N = F.length;
    const out = F.map(() => []);
    if (!N) return out;
    const nb = cell.recip.map((r) => Math.max(1, Math.floor(1 / (norm(r) * rmax))));
    const reach = cell.recip.map((r, k) => Math.max(1, Math.ceil(rmax * norm(r) * nb[k])));
    const W = F.map((f) => f.map((x) => x - Math.floor(x)));
    const base = F.map((f, i) => f.map((x, k) => x - W[i][k]));      // F = W + base
    const binOf = (w) => w.map((x, k) => Math.min(nb[k] - 1, Math.floor(x * nb[k])));
    const bins = new Map();
    const B = W.map(binOf);
    B.forEach((b, i) => { const key = b[0] + ',' + b[1] + ',' + b[2]; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(i); });
    const r2 = rmax * rmax;
    const A = cell.A, Bv = cell.B, Cv = cell.C;
    for (let i = 0; i < N; i++) {
      const [bx, by, bz] = B[i];
      for (let dx = -reach[0]; dx <= reach[0]; dx++) for (let dy = -reach[1]; dy <= reach[1]; dy++) for (let dz = -reach[2]; dz <= reach[2]; dz++) {
        const cx = bx + dx, cy = by + dy, cz = bz + dz;
        const sx = Math.floor(cx / nb[0]), sy = Math.floor(cy / nb[1]), sz = Math.floor(cz / nb[2]);
        if (Math.abs(sx) > 1 || Math.abs(sy) > 1 || Math.abs(sz) > 1) continue;
        const list = bins.get((cx - sx * nb[0]) + ',' + (cy - sy * nb[1]) + ',' + (cz - sz * nb[2]));
        if (!list) continue;
        for (const j of list) {
          if (j === i && !sx && !sy && !sz) continue;
          const u = W[j][0] + sx - W[i][0], v = W[j][1] + sy - W[i][1], w = W[j][2] + sz - W[i][2];
          const x = u * A[0] + v * Bv[0] + w * Cv[0], y = u * A[1] + v * Bv[1] + w * Cv[1], z = u * A[2] + v * Bv[2] + w * Cv[2];
          const q = x * x + y * y + z * z;
          if (q >= r2) continue;
          // the translation for the coordinates as given
          const s = [sx + base[i][0] - base[j][0], sy + base[i][1] - base[j][1], sz + base[i][2] - base[j][2]];
          out[i].push({ j, s, d: Math.sqrt(q) });
        }
      }
    }
    return out;
  }

  /* A Cartesian grid of points (no lattice): near(p, r) gives the indexes of the points within r of p. */
  function cartGrid(P, cellSize) {
    const h = Math.max(0.5, cellSize);
    const map = new Map();
    const key = (a, b, c) => a + ',' + b + ',' + c;
    P.forEach((p, i) => { const k = key(Math.floor(p[0] / h), Math.floor(p[1] / h), Math.floor(p[2] / h)); if (!map.has(k)) map.set(k, []); map.get(k).push(i); });
    return {
      near(p, r) {
        const out = [];
        const m = Math.ceil(r / h);
        const bx = Math.floor(p[0] / h), by = Math.floor(p[1] / h), bz = Math.floor(p[2] / h);
        for (let a = -m; a <= m; a++) for (let b = -m; b <= m; b++) for (let c = -m; c <= m; c++) {
          const list = map.get(key(bx + a, by + b, bz + c));
          if (!list) continue;
          for (const i of list) { const q = P[i]; const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2]; if (dx * dx + dy * dy + dz * dz < r * r) out.push(i); }
        }
        return out;
      }
    };
  }

  /* Copies of one site closer than SAME_POS (angstrom) are one position: the site is on a special position,
     also when the file gives its coordinates with few decimals. Below SAME_EXACT they are one position whatever
     the file says. */
  const SAME_POS = 0.05, SAME_EXACT = 0.01;
  /* The largest distance at which two non-H atoms of one element that the file does not flag are alternatives of
     one site: 0.9 A; for a non-metal with a covalent radius of 1.0 A or more, 1.8 times that radius (Cl 1.84 A,
     Br 2.16 A, I 2.50 A, S 1.89 A), below its shortest bond to itself (Cl2 1.99 A, I2 2.67 A, S-S 2.05 A). Metals can
     have a short multiple bond (Mo-Mo 2.09 A, Re-Re 2.24 A, Cr-Cr 1.83 A): for them the limit is 1.2 times the
     radius, below any such bond. splitRadius is the largest limit. */
  const splitRadius = (el) => ((RC[el] || 0) >= 1.0 ? 1.8 * RC[el] : 0.9);
  /* a single bond between two atoms: not shorter than the sum of their covalent radii - 0.1 A (C-N 1.37 A, C-O
     1.32 A). A C=O (1.22 A), C#N (1.14 A) or the C-N of an amidinium (1.32 A) is shorter. */
  const singleBond = (e1, e2, d) => d >= (RC[e1] || 0.75) + (RC[e2] || 0.75) - 0.1;
  /* an N with one heavy neighbour X that can be an ammonium N (R-NH3+): X-N not shorter than 1.31 A (a C#N is
     1.14 A), and X bonded to no other N or O (the C of an amidinium, a guanidinium, an amide or a urea is). A C-N
     refined short (1.34 A) still counts. xOthers: the elements of the other neighbours of X. */
  const amineN = (d, xOthers) => d >= 1.31 && !xOthers.some((e) => e === 'N' || e === 'O');
  const splitLimit = (a) => {
    const r = RC[a.el] || 0;
    if (r < 1.0) return 0.9;
    return isMetal(a.el) ? Math.max(0.9, 1.2 * r) : 1.8 * r;
  };

  /* Every copy of every site, made by every operator and put in the cell, and the share w of each copy in the
     cell contents. The formula, the density and the powder pattern use these shares.
     1. Copies of one site: one copy when closer than SAME_POS (not when the file's _atom_site_symmetry_multiplicity
        is the number of operators: a general position; then only below SAME_EXACT). Copies 0.05 to 0.15 A apart
        are one copy too when their occupancies add up to 1.5 or more (a special position, rounded coordinates).
     2. Alternatives at one position: copies of one element closer than 0.15 A in one disorder group, or closer
        than splitRadius for non-H atoms that the file does not flag. A group is a set of copies that are all that close
        to each other (closest pairs first), so two bonded atoms are never one position. When the occupancies of
        a group of two or more add up to more than 1, they are scaled to 1: one position holds one atom. */
  function siteCopies(struct) {
    const { cell, ops } = struct;
    const dist = (p, q) => norm(cell.toCart(minImage(sub(p, q))));
    const copies = [];
    struct.sites.forEach((s, si) => {
      const general = s.mult > 0 && s.mult === ops.length;
      const mine = [];
      ops.forEach((op, oi) => {
        const f = [0, 1, 2].map((r) => wrap1(op.R[r][0] * s.f[0] + op.R[r][1] * s.f[1] + op.R[r][2] * s.f[2] + op.T[r]));
        if (mine.some((g) => dist(g.f, f) < (general ? SAME_EXACT : SAME_POS))) return;
        mine.push({ f, oi });
      });
      // copies 0.05 to 0.15 A apart whose occupancies add up to 1.5 or more: one copy (a special position)
      let keep = mine;
      if (!general && mine.length > 1 && s.occ > 0) {
        // clusters of copies around one point (closer than 0.15 A): one copy when the cluster holds 1.5 atoms or more
        keep = [];
        const done = new Set();
        mine.forEach((g, a) => {
          if (done.has(a)) return;
          const cl = [a];
          done.add(a);
          for (let q = 0; q < cl.length; q++) mine.forEach((h, b) => { if (!done.has(b) && dist(mine[cl[q]].f, h.f) < 0.15) { done.add(b); cl.push(b); } });
          if (cl.length > 1 && s.occ * cl.length >= 1.5) keep.push(mine[cl[0]]);
          else for (const k of cl) keep.push(mine[k]);
        });
      }
      for (const g of keep) copies.push({ el: s.el, iso: s.iso || null, label: s.label, f: g.f, occ: s.occ, dg: s.dg, site: si, op: g.oi, symdis: s.symdis, minor: s.minor });
    });
    // alternatives at one position: complete-linkage groups, closest pairs first
    const pairs = [];
    const rmax = Math.max(0.15, ...copies.map((c) => (c.el === 'H' ? 0.15 : splitRadius(c.el))));
    const near = neighbours(cell, copies.map((c) => c.f), rmax);
    copies.forEach((a, p) => {
      const best = new Map();
      for (const { j, d } of near[p]) if (j > p && copies[j].el === a.el && (!best.has(j) || d < best.get(j))) best.set(j, d);
      for (const [q, d] of best) {
        const b = copies[q];
        const same = a.dg === b.dg;
        const split = a.el !== 'H' && a.dg === '.' && b.dg === '.';
        if ((same && d < 0.15) || (split && d < splitLimit(a))) pairs.push([d, p, q]);
      }
    });
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    const close = new Set(pairs.map(([, i, j]) => i + ':' + j));
    const isClose = (i, j) => close.has(Math.min(i, j) + ':' + Math.max(i, j));
    const group = copies.map((_, i) => [i]);
    for (const [, i, j] of pairs) {
      const gi = group[i], gj = group[j];
      if (gi === gj) continue;
      if (!gi.every((x) => gj.every((y) => isClose(x, y)))) continue;
      for (const y of gj) { gi.push(y); group[y] = gi; }
    }
    const w = copies.map((c, i) => {
      const g = group[i];
      const t = g.reduce((s, k) => s + Math.max(0, copies[k].occ), 0);
      return Math.max(0, c.occ) * (g.length > 1 && t > 1 + 1e-3 ? 1 / t : 1);
    });
    return { copies, w };
  }

  /* Disorder over a symmetry element (negative groups with no metal, and no halide unless with C): the operators
     make copies of the group that overlap. A copy is the atoms of one group made by one operator. In the order of
     the mean occupancy of the group, then the operator, a copy is kept when none of its non-H atoms is closer than
     the sum of the covalent radii + 0.2 A to a non-H atom of a kept copy (the copies are alternatives: they do not
     bond to each other). Returns true for each copy of copies that
     belongs to a hidden orientation. Metals and halides keep every copy (the card notes a polyhedron that mixes two
     orientations). */
  function symAlternates(struct, copies) {
    const { cell } = struct;
    const out = copies.map(() => false);
    const gk = (a) => struct.sites[a.site].asm + '|' + a.dg;
    const inorg = new Set(), hasC = new Set(), hasX = new Set();
    const occ = new Map();
    copies.forEach((a) => {
      if (!a.symdis || a.minor) return;
      if (isMetal(a.el)) inorg.add(gk(a));
      if (HALIDE.has(a.el)) hasX.add(gk(a));
      if (a.el === 'C') hasC.add(gk(a));
      const o = occ.get(gk(a)) || [0, 0];
      o[0] += a.occ; o[1]++;
      occ.set(gk(a), o);
    });
    // a halide in a group with C is part of a molecule (C-F); a halide in a group without C is an anion
    for (const g of hasX) if (!hasC.has(g)) inorg.add(g);
    const idx = [];
    copies.forEach((a, i) => { if (a.symdis && !a.minor && !inorg.has(gk(a))) idx.push(i); });
    if (!idx.length) return out;
    const cid = (i) => gk(copies[i]) + '#' + copies[i].op;
    const order = [];
    const seen = new Set();
    for (const i of idx) if (!seen.has(cid(i))) { seen.add(cid(i)); order.push({ id: cid(i), g: gk(copies[i]), op: copies[i].op, first: order.length }); }
    const mean = (g) => { const o = occ.get(g); return o[0] / o[1]; };
    order.sort((p, q) => mean(q.g) - mean(p.g) || p.op - q.op || p.first - q.first);
    const heavy = idx.filter((i) => copies[i].el !== 'H');
    const r = (i) => RC[copies[i].el] || 0.75;
    const nb = neighbours(cell, heavy.map((i) => copies[i].f), 2 * Math.max(0.5, ...heavy.map(r)) + 0.2);
    const clash = new Map();
    heavy.forEach((i, p) => {
      for (const { j: q, d } of nb[p]) {
        const j = heavy[q];
        // two copies of one atom on the symmetry element (closer than 0.15 A) are one atom, not a clash
        if (cid(i) === cid(j) || d < 0.15 || d >= r(i) + r(j) + 0.2) continue;
        if (!clash.has(cid(i))) clash.set(cid(i), new Set());
        clash.get(cid(i)).add(cid(j));
      }
    });
    const kept = new Set();
    const gone = new Set();
    for (const c of order) {
      const cl = clash.get(c.id);
      if (cl && Array.from(cl).some((x) => kept.has(x))) gone.add(c.id); else kept.add(c.id);
    }
    idx.forEach((i) => { if (gone.has(cid(i))) out[i] = true; });
    return out;
  }

  function buildCell(struct, opts) {
    const showMinor = !!(opts && opts.minor);
    const { cell } = struct;
    const mi = minImage;

    // 1. every copy of every site in the cell; for the picture, copies of one element closer than 0.15 A in one
    //    disorder group are drawn once (the first)
    const sc = siteCopies(struct);
    const alt = symAlternates(struct, sc.copies);
    let atoms = [];
    {
      const near = neighbours(cell, sc.copies.map((c) => c.f), 0.15);
      const kept = new Array(sc.copies.length).fill(false);
      // copies of the kept orientations first, so that a copy of a hidden orientation never stands for them
      const twin = (c, q) => near[q].some(({ j }) => kept[j] && sc.copies[j].el === c.el && sc.copies[j].dg === c.dg && (alt[j] === alt[q] ? j < q : !alt[j]));
      sc.copies.forEach((c, q) => { if (!alt[q] && !twin(c, q)) kept[q] = true; });
      sc.copies.forEach((c, q) => { if (alt[q] && !twin(c, q)) kept[q] = true; });
      sc.copies.forEach((c, q) => { if (kept[q]) atoms.push(Object.assign({}, c, alt[q] ? { symAlt: true } : {})); });
    }

    // 1b. alternatives that the file does not flag, for the picture and the geometry (the formula keeps them all):
    //   - two non-H atoms of one element closer than splitLimit (0.9 A; 1.8 times the covalent radius for heavy
    //     non-metals; 1.2 times for metals): they cannot both be there (two I 1.5 A apart);
    //   - partly occupied metals or halides of two elements on one site (closer than 0.3 A, occupancies adding up
    //     to 1.05 or less): the one with the higher occupancy is drawn.
    //   Of each split pair, the one with an occupancy 0.2 or more above the other is drawn; else the first listed.
    const dropSites = new Set();
    const dropAtoms = new Set();
    const autoSplit = [];
    const mixed = [];
    const partial = (a) => a.occ < 0.99;
    // mixed sites of metals or halides (Ag/Bi, Cl/Br). C/N of a cation in two orientations (CH3NH3) keep both.
    const mixable = (el) => isMetal(el) || HALIDE.has(el);
    const hide = (i, j, list) => {
      const a = atoms[i], b = atoms[j];
      if (a.site === b.site) { dropAtoms.add(j); return; }
      // a mixed site: the element with the higher occupancy. A split site: the alternate with the clearly higher
      // occupancy (0.2 or more above the other, as 0.9/0.1); else the first listed, so that the atoms of one
      // orientation, listed together, stay together when free refinement gives them 0.52 and 0.48
      const gap = list === mixed ? 1e-6 : 0.2 - 1e-9;
      const keepFirst = Math.abs(a.occ - b.occ) >= gap ? a.occ > b.occ : a.site < b.site;
      const later = keepFirst ? b.site : a.site, first = keepFirst ? a.site : b.site;
      if (!dropSites.has(later) && !dropSites.has(first)) { dropSites.add(later); list.push(struct.sites[first].label + '/' + struct.sites[later].label); }
    };
    {
      const near = neighbours(cell, atoms.map((a) => a.f), Math.max(0.9, ...atoms.map((a) => (a.el === 'H' ? 0 : splitRadius(a.el)))));
      for (let i = 0; i < atoms.length; i++) {
        const a = atoms[i];
        if (a.el === 'H' || a.dg !== '.') continue;
        const best = new Map();
        for (const { j, d } of near[i]) if (j > i && (!best.has(j) || d < best.get(j))) best.set(j, d);
        for (const j of Array.from(best.keys()).sort((x, y) => x - y)) {
          const b = atoms[j], d = best.get(j);
          if (b.dg !== '.' || b.el === 'H') continue;
          if (b.el === a.el) {
            if (d < splitLimit(a)) hide(i, j, autoSplit);
          } else if (d < 0.3 && partial(a) && partial(b) && a.occ + b.occ <= 1.05 && mixable(a.el) && mixable(b.el)) hide(i, j, mixed);
        }
      }
    }
    let symAlt = 0;
    atoms.forEach((a, i) => { if (a.symAlt) { dropAtoms.add(i); symAlt++; } });
    const hasMinor = struct.sites.some((s) => s.minor) || dropSites.size > 0 || dropAtoms.size > 0;
    // cell contents for the formula: every copy of every part, by its share (siteCopies)
    const counts = {};
    // deuterium is H in the picture and in every bond rule, and D in the formula and the mass
    sc.copies.forEach((c, i) => { const k = c.iso || c.el; if (sc.w[i] > 0) counts[k] = (counts[k] || 0) + sc.w[i]; });
    const hiddenMinor = atoms.filter((a, i) => a.minor || dropSites.has(a.site) || dropAtoms.has(i)).length;
    if (!showMinor) atoms = atoms.filter((a, i) => !a.minor && !dropSites.has(a.site) && !dropAtoms.has(i));
    const N = atoms.length;

    // 2. coordination: metal centre to donor atoms (any non-metal but H), over neighbouring cells
    const ligs = atoms.map(() => []);      // centre index -> [{j, off, d, s}]
    const metalsOf = atoms.map(() => []);  // donor index -> [{i, off}]  (off = donor - metal, fractional)
    const maxRC = Math.max(0.5, ...atoms.map((a) => RC[a.el] || 0));
    const nearC = neighbours(cell, atoms.map((a) => a.f), 2 * maxRC + TOL_HALIDE);
    const sIndex = (s) => (s[0] + 1) * 9 + (s[1] + 1) * 3 + (s[2] + 1);
    const coordinate = (pick) => {
      let found = 0;
      for (let i = 0; i < N; i++) {
        if (!pick(atoms[i].el)) continue;
        // in the order of the atoms, then of the translations (as a search over all atoms would give them)
        const cand = nearC[i].filter(({ j }) => isDonor(atoms[j].el) && compatible(atoms[i], atoms[j]))
          .sort((p, q) => p.j - q.j || sIndex(p.s) - sIndex(q.s));
        for (const { j, s, d } of cand) {
          const ej = atoms[j].el;
          const cut = RC[atoms[i].el] + RC[ej] + (HALIDE.has(ej) ? TOL_HALIDE : TOL_DONOR);
          if (d < cut && d > 0.5) {
            const off = add(sub(atoms[j].f, atoms[i].f), s);
            ligs[i].push({ j, off, d, s });
            metalsOf[j].push({ i, off });
            found++;
          }
        }
      }
      return found;
    };
    const center = atoms.map((a) => isCenter(a.el));
    // no ordinary metal has anions around it: the alkali ions take that role (NaCl, KBr)
    if (!coordinate(isCenter) && coordinate((el) => ALKALI.has(el))) atoms.forEach((a, i) => { if (ALKALI.has(a.el)) center[i] = true; });

    // 3. covalent bonds between non-metals. The minimum image is enough unless the cell is so thin
    //    that an atom can bond to two images of the same neighbour (graphite, diamond).
    const adj = atoms.map(() => []);
    // a halide next to a metal can still be covalently bound to a non-metal centre (Cl of TeCl6 beside Cs)
    const noCovalent = (i) => isMetal(atoms[i].el);
    // halides that may bond to a halide (a polyhalide anion, I3-): whole (occupancy 1), bound to no metal but an
    // alkali or alkaline-earth ion (CsI3), and not bound to C or another non-metal (C-I...I- is a halogen bond)
    const AE = new Set(['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra']);
    const polyOk = atoms.map((a, i) => {
      if (!HALIDE.has(a.el) || a.occ < 0.99) return false;
      if (metalsOf[i].some((m) => !ALKALI.has(atoms[m.i].el) && !AE.has(atoms[m.i].el))) return false;
      return !nearC[i].some(({ j, d }) => { const e = atoms[j].el; return !HALIDE.has(e) && e !== 'H' && !isMetal(e) && d > 0.4 && d < RC[a.el] + RC[e] + TOL_COVALENT; });
    });
    for (let i = 0; i < N; i++) {
      const a = atoms[i];
      if (noCovalent(i)) continue;
      // every image within reach, in the order of the atoms and then of the translations
      const cand = nearC[i].filter(({ j, s }) => j > i || (j === i && (s[0] || s[1] || s[2]))).sort((p, q) => p.j - q.j || sIndex(p.s) - sIndex(q.s));
      for (const { j, s, d: dist } of cand) {
        const b = atoms[j];
        if (noCovalent(j)) continue;
        if (a.el === 'H' && b.el === 'H') continue;
        if (HALIDE.has(a.el) && b.el === 'H') continue;
        // two halides bond only as a polyhalide anion (polyOk)
        if (HALIDE.has(a.el) && HALIDE.has(b.el) && (!polyOk[i] || !polyOk[j])) continue;
        if (HALIDE.has(b.el) && a.el === 'H') continue;
        if (!compatible(a, b)) continue;
        if (a.symdis && b.symdis && a.op !== b.op) continue;
        const cut = RC[a.el] + RC[b.el] + TOL_COVALENT;
        if (dist > 0.4 && dist < cut) {
          const d = add(sub(b.f, a.f), s);
          adj[i].push({ j, d });
          if (i !== j) adj[j].push({ j: i, d: [-d[0], -d[1], -d[2]] });
        }
      }
    }

    // an atom that already has four or more covalent bonds has no lone pair left to give: it is not a
    // ligand, however close a large cation sits (Te of TeCl6 next to Cs, N of an ammonium, sp3 C)
    for (let j = 0; j < N; j++) {
      if (!metalsOf[j].length || adj[j].length < 4) continue;
      for (const m of metalsOf[j]) ligs[m.i] = ligs[m.i].filter((l) => l.j !== j);
      metalsOf[j] = [];
    }
    const covCentre = (i) => NET_CENTER.has(atoms[i].el) && adj[i].length >= 4 && adj[i].length <= MAX_POLY_CN && adj[i].every((nb) => NET_VERTEX.has(atoms[nb.j].el));

    // 4. connected components of the whole bond graph (coordination and covalent), each with the
    //    lattice translations that join it to itself: none for a molecule, 1 to 3 for a chain, layer or framework
    const edges = atoms.map(() => []);
    for (let i = 0; i < N; i++) {
      for (const l of ligs[i]) {
        edges[i].push({ to: l.j, s: l.s });
        edges[l.j].push({ to: i, s: [-l.s[0], -l.s[1], -l.s[2]] });
      }
      for (const nb of adj[i]) edges[i].push({ to: nb.j, s: [0, 1, 2].map((k) => Math.round(nb.d[k] - (atoms[nb.j].f[k] - atoms[i].f[k]))) });
    }
    const comp = new Array(N).fill(-1);
    const offs = new Array(N);
    const comps = [];
    const grow = (vecs, c) => {
      if (vecs.length >= 3 || c.every((x) => x === 0)) return;
      const trial = vecs.map((v) => v.slice()).concat([c.slice()]);
      if (rankOf(trial) > vecs.length) vecs.push(c.slice());
    };
    for (let s0 = 0; s0 < N; s0++) {
      if (comp[s0] >= 0) continue;
      const id = comps.length;
      const rec = { atoms: [s0], vecs: [], dim: 0, complex: false };
      comp[s0] = id;
      offs[s0] = [0, 0, 0];
      for (let q = 0; q < rec.atoms.length; q++) {
        const n = rec.atoms[q];
        for (const e of edges[n]) {
          const target = add(offs[n], e.s);
          if (comp[e.to] < 0) { comp[e.to] = id; offs[e.to] = target; rec.atoms.push(e.to); } else grow(rec.vecs, sub(target, offs[e.to]));
        }
      }
      rec.dim = rec.vecs.length;
      // a finite unit that holds a metal with its ligands is a molecular complex or cluster, drawn whole
      rec.complex = rec.dim === 0 && rec.atoms.some((i) => center[i] && ligs[i].length > 0);
      comps.push(rec);
    }
    const inComplex = (i) => comps[comp[i]].complex;
    const same = (u, v) => u[0] === v[0] && u[1] === v[1] && u[2] === v[2];

    // 5. covalent units: whole molecules (walk the bond graph, unwrapping across cell faces) and
    //    covalent networks that never close (diamond, quartz, graphite), which are drawn atom by atom
    const molecules = [];
    const networks = [];
    const polyAt = new Set();
    const seen = new Array(N).fill(false);
    for (let s = 0; s < N; s++) {
      if (seen[s] || center[s] || inComplex(s) || (metalsOf[s].length && !adj[s].length)) continue;
      const pos = new Map();
      pos.set(s, atoms[s].f.slice());
      seen[s] = true;
      const order = [s];
      const loops = [];
      for (let q = 0; q < order.length; q++) {
        const i = order[q];
        for (const nb of adj[i]) {
          if (seen[nb.j]) {
            if (pos.has(nb.j)) grow(loops, sub(add(pos.get(i), nb.d), pos.get(nb.j)).map(Math.round));
            continue;
          }
          seen[nb.j] = true;
          pos.set(nb.j, add(pos.get(i), nb.d));
          order.push(nb.j);
        }
      }
      if (loops.length) {
        networks.push({ atoms: order, dim: loops.length, vecs: loops });
        for (const i of order) {
          if (covCentre(i)) polyAt.add(i);
        }
        continue;
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
      // polyhedra inside a molecule or molecular ion: PF6, SO4, TeCl6
      const mp = [];
      for (const i of order) if (covCentre(i) && adj[i].every((nb) => local.has(nb.j))) mp.push({ center: local.get(i), verts: adj[i].map((nb) => local.get(nb.j)) });
      if (mp.length) mol.polys = mp;
      mol.cen = cen.map((x, k) => x / order.length + shift[k]);
      // a molecule disordered over a symmetry element: keep one orientation
      if (mol.symdis && !showMinor && molecules.some((m) => m.symdis && norm(cell.toCart(mi(sub(m.cen, mol.cen)))) < 1.0)) continue;
      molecules.push(mol);
    }

    // 6. molecular complexes and clusters: metal, ligands and coordinated molecules as one unit
    for (const rec of comps) {
      if (!rec.complex) continue;
      const order = rec.atoms;
      const local = new Map(order.map((i, k) => [i, k]));
      const pos = (i) => add(atoms[i].f, offs[i]);
      let cen = [0, 0, 0];
      for (const i of order) cen = add(cen, pos(i));
      const shift = cen.map((x) => -Math.floor(x / order.length + 1e-9));
      const bonds = [];
      const polys = [];
      for (const i of order) {
        for (const nb of adj[i]) {
          if (nb.j <= i) continue;
          const sft = [0, 1, 2].map((k) => Math.round(nb.d[k] - (atoms[nb.j].f[k] - atoms[i].f[k])));
          if (same(add(offs[i], sft), offs[nb.j])) bonds.push([local.get(i), local.get(nb.j)]);
        }
        if (covCentre(i) && adj[i].every((nb) => local.has(nb.j))) polys.push({ center: local.get(i), verts: adj[i].map((nb) => local.get(nb.j)) });
        if (!center[i]) continue;
        const verts = [];
        for (const l of ligs[i]) {
          if (!same(add(offs[i], l.s), offs[l.j])) continue;
          bonds.push([local.get(i), local.get(l.j)]);
          verts.push(local.get(l.j));
        }
        if (verts.length >= 4 && verts.length <= MAX_POLY_CN) polys.push({ center: local.get(i), verts });
      }
      molecules.push({
        atoms: order.map((i) => ({ idx: i, f: add(pos(i), shift) })),
        bonds, polys, ion: false, complex: true, symdis: false,
        cen: cen.map((x, k) => x / order.length + shift[k])
      });
    }

    const metals = [];
    const fwMetals = [];
    for (let i = 0; i < N; i++) if (center[i]) { metals.push(i); if (!inComplex(i)) fwMetals.push(i); }

    return {
      cell, atoms, ligs, metalsOf, adj, molecules, networks, polyAt, metals, fwMetals, center, comp, offs, comps,
      hasMinor, autoSplit, mixed, symAlt, counts, hiddenMinor, meta: struct.meta, ops: struct.ops
    };
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
      const top = [], bot = [], topX = [], botX = [];
      for (const o of ms) for (const l of ligs[o.m]) {
        if (metalsOf[l.j].length !== 1 || !HALIDE.has(atoms[l.j].el)) continue;
        const fx = add(o.f, l.off);
        const hx = height(fx);
        if (hx > ph[ph.length - 1] + 1.0) { top.push(hx); topX.push({ f: fx, j: l.j }); } else if (hx < ph[0] - 1.0) { bot.push(hx); botX.push({ f: fx, j: l.j }); }
      }
      slabs.push({ metals: ms, planes: ph, centre: mean(ph), top: top.length ? mean(top) : null, bot: bot.length ? mean(bot) : null, topX, botX });
    }
    const ns = slabs.map((sl) => sl.planes.length);
    res.n = Math.max(...ns);
    res.nUniform = ns.every((x) => x === ns[0]);
    // how the polyhedra of the layer meet: the largest number of halides that two metals share (1 corner, 2 edge,
    // 3 face). n counts perovskite layers, so it is given for corner-sharing layers only. Two shared halides closer
    // than 2.5 A, one of them partly occupied, are two positions of one disordered corner (an edge of a chloride,
    // bromide or iodide octahedron is 3.4 A or more; of a fluoride, 2.5 A), and two metals closer than 0.75 x the sum
    // of their covalent radii are two positions of one disordered metal.
    let share = 0;
    for (const sl of slabs) for (const o of sl.metals) {
      const shared = new Map();
      for (const l of ligs[o.m]) for (const mm of metalsOf[l.j]) {
        const rel = sub(l.off, mm.off);
        const rc = cell.toCart(rel);
        if (norm(rc) < 0.75 * ((RC[atoms[o.m].el] || 1.5) + (RC[atoms[mm.i].el] || 1.5))) continue;
        const key = mm.i + ':' + rc.map((x) => Math.round(x * 10)).join(',');
        if (!shared.has(key)) shared.set(key, []);
        shared.get(key).push({ p: cell.toCart(l.off), occ: atoms[l.j].occ });
      }
      for (const xs of shared.values()) {
        const corners = [];
        for (const x of xs) if (!corners.some((c) => norm(sub(c.p, x.p)) < 2.5 && (c.occ < 0.99 || x.occ < 0.99))) corners.push(x);
        share = Math.max(share, corners.length);
      }
    }
    res.sharing = share >= 3 ? 'face' : share === 2 ? 'edge' : 'corner';
    if (res.sharing !== 'corner') { res.nPlanes = res.n; res.n = null; }
    // for the picture: the heights of the planes of each layer along the normal. A copy of a layer is k * dhkl higher.
    res.slabs = slabs.map((sl) => ({ top: sl.top, bot: sl.bot, centre: sl.centre, planes: sl.planes }));
    res.dhkl = fw.dhkl;
    res.spacing = fw.spacing;
    const s0 = slabs[0];
    // the next layer above a layer: the slab and lattice step with the smallest positive distance between centres
    const nextOf = (sa) => {
      let target = null;
      for (let c = 0; c < slabs.length; c++) for (let k = -2; k <= 2; k++) {
        const dz = slabs[c].centre + k * fw.dhkl - sa.centre;
        if (dz > 1.0 && (!target || dz < target.dz - 1e-6)) target = { c, k, dz };
      }
      return target;
    };
    const transTo = (k) => {
      const out = [];
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let q = -3; q <= 3; q++) {
        if (i * fw.hkl[0] + j * fw.hkl[1] + q * fw.hkl[2] === k) out.push([i, j, q]);
      }
      return out;
    };
    // pairs (a, b) between two lists of points ({ f } in fractional coordinates), with b moved by a lattice
    // translation t (hkl . t = k), closer than r. Few points: every translation is tried (r may be Infinity).
    // Many points: a neighbour search, which needs a finite r.
    const across = (As, Bs, k, r, rBig) => {
      const out = [];
      const trans = transTo(k);
      if (As.length * Bs.length * trans.length <= 2e5) {
        for (const a of As) for (const b of Bs) for (const tr of trans) {
          const fb = add(b.f, tr);
          const v = cell.toCart(sub(fb, a.f));
          const dd = norm(v);
          if (dd < r) out.push({ a, b, fb, v, d: dd });
        }
        return out;
      }
      const nA = As.length;
      const nbr = neighbours(cell, As.map((x) => x.f).concat(Bs.map((x) => x.f)), rBig);
      for (let i = 0; i < nA; i++) for (const { j, s, d } of nbr[i]) {
        if (j < nA || s[0] * fw.hkl[0] + s[1] * fw.hkl[1] + s[2] * fw.hkl[2] !== k) continue;
        const b = Bs[j - nA], fb = add(b.f, s);
        out.push({ a: As[i], b, fb, v: cell.toCart(sub(fb, As[i].f)), d });
      }
      return out;
    };
    // each layer: its slab thickness; layers whose thickness agrees within 0.01 A share one value
    // (the smallest value of each such group, so that the order of the atoms does not matter; rows by value)
    res.slabList = [];
    slabs.map((sl, si) => ({ si, value: sl.top !== null && sl.bot !== null ? sl.top - sl.bot : null }))
      .filter((q) => q.value !== null).sort((p, q) => p.value - q.value || p.si - q.si)
      .forEach((q) => { if (!res.slabList.some((r) => Math.abs(r.value - q.value) < 0.01)) res.slabList.push(q); });
    // each interface between a layer and the next: the distance between their centre planes, the gallery between
    // their faces (terminal-halide planes), and the shortest distance between a terminal halide of one face and
    // one of the other. The stacking offset of each interface is added below; interfaces that agree (0.01 A, and
    // 0.02 in the offset) then share one entry.
    const rawIfs = [];
    slabs.forEach((sa, si) => {
      const tg = nextOf(sa);
      if (!tg) return;
      const sb = slabs[tg.c];
      const it = { si, next: tg.c, k: tg.k, spacing: tg.dz, gallery: null, xx: null };
      if (sa.top !== null && sb.bot !== null) it.gallery = sb.bot + tg.k * fw.dhkl - sa.top;
      if (sa.topX.length && sb.botX.length) {
        const gap = it.gallery === null ? tg.dz : Math.max(0, it.gallery);
        for (const pr of across(sa.topX, sb.botX, tg.k, Infinity, gap + 8)) {
          if (it.xx === null || pr.d < it.xx - 1e-9) { it.xx = pr.d; it.xa = atoms[pr.a.j].label; it.xb = atoms[pr.b.j].label; }
        }
      }
      rawIfs.push(it);
    });
    // faces that reach into each other (corrugated layers): the gallery and the N penetration have no meaning
    res.corrugated = rawIfs.some((q) => q.gallery !== null && q.gallery < 0.5);
    if (s0.top !== null && s0.bot !== null) res.slabThickness = s0.top - s0.bot;

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
        // one row for each distinct bridge: by site, or, in a file without symmetry (every atom its own site), by value
        // (theta, theta in and theta out to 0.1 deg, M...M to 0.01 A)
        const p1 = !(uc.ops && uc.ops.length > 1);
        const key = (p1 ? atoms[j].el : atoms[j].site) + ':' + theta.toFixed(p1 ? 1 : 2) + ':' + (equatorial ? 'e' : 'a') +
          (p1 ? ':' + entry.mm.toFixed(2) + (entry.thetaIn !== undefined ? ':' + entry.thetaIn.toFixed(1) + ':' + entry.thetaOut.toFixed(1) : '') : '');
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
        if (!HALIDE.has(atoms[l.j].el)) continue;
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
        // RNH3+ and R2NH2+; with no H on the N (not located) or with H in two orientations, an N with one heavy
        // neighbour that can be an ammonium N (amineN: not the N of an amidinium, a guanidinium or a nitrile)
        const hv = nb[k].filter((j) => atoms[mol.atoms[j].idx].el !== 'H');
        const single = hv.length === 1 && amineN(norm(cell.toCart(sub(mol.atoms[hv[0]].f, a.f))),
          nb[hv[0]].filter((j) => j !== k).map((j) => atoms[mol.atoms[j].idx].el));
        const ammonium = hasH ? ((heavy + nH === 4 && nH >= 2) || (heavy === 1 && single && (nH === 0 || nH > 3))) : (heavy === 1 && single);
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
    res.penetration = res.corrugated ? [] : Array.from(pens.entries()).map(([label, v]) => ({ label, depth: mean(v) }));

    // in-plane offset between adjacent layers, in units of the in-plane M...M vectors. For each layer of the
    // cell and the layer just above it: the shortest in-plane shift from a metal of the top metal plane of the
    // layer to a metal of the bottom metal plane of the next layer, over all such pairs and lattice
    // translations. Shifts within 0.05 A of the shortest are ties, and so are M...M vectors within 0.05 A of each
    // other; of all these choices the one with the smallest offset (s1 + s2, then s1) is taken. The result does not depend on the order of the atoms in the file. Each
    // interface that is not alike gets its own entry.
    // the pairs of in-plane M...M vectors of a metal: the shortest vector and the shortest one not parallel to
    // it, with every choice that ties within 0.05 A
    const netVecs = (m) => {
      const ps = [];
      for (const l of ligs[m]) for (const mm of metalsOf[l.j]) {
        const d = sub(l.off, mm.off);
        if (norm(d) < 1e-6) continue;
        const v = cell.toCart(d);
        if (Math.abs(dot(v, nh)) / norm(v) < 0.5) ps.push(inPlane(v));
      }
      if (!ps.length) return null;
      ps.sort((u, v) => norm(u) - norm(v));
      const bases = [];
      for (const p1 of ps.filter((v) => norm(v) <= norm(ps[0]) + 0.05)) {
        const others = ps.filter((v) => norm(cross(p1, v)) > 0.3 * norm(p1) * norm(v));
        if (!others.length) continue;
        for (const p2 of others.filter((v) => norm(v) <= norm(others[0]) + 0.05)) bases.push([p1, p2]);
      }
      return bases.length ? bases : null;
    };
    const fold = (d, p1, p2) => {
      const e1 = p1.map((x) => x / norm(p1));
      const e2 = cross(nh, e1);
      const a11 = dot(p1, e1), a12 = dot(p2, e1), a21 = dot(p1, e2), a22 = dot(p2, e2);
      const det = a11 * a22 - a12 * a21;
      const b1 = dot(d, e1), b2 = dot(d, e2);
      let s1 = (b1 * a22 - a12 * b2) / det, s2 = (a11 * b2 - a21 * b1) / det;
      s1 = Math.abs(s1 - Math.round(s1));
      s2 = Math.abs(s2 - Math.round(s2));
      return [Math.max(s1, s2), Math.min(s1, s2)];
    };
    const offBy = new Map();
    slabs.forEach((sa, si) => {
      if (!sa.metals.length) return;
      const topH = sa.planes[sa.planes.length - 1];
      let target = null;
      for (let c = 0; c < slabs.length; c++) for (let k = -2; k <= 2; k++) {
        const dz = slabs[c].centre + k * fw.dhkl - sa.centre;
        if (dz > 1.0 && (!target || dz < target.dz - 1e-6)) target = { c, k, dz };
      }
      if (!target) return;
      const sb = slabs[target.c];
      const tops = sa.metals.filter((o) => Math.abs(o.h - topH) < 1.5);
      const bots = sb.metals.filter((o) => Math.abs(o.h - sb.planes[0]) < 1.5);
      // the net of the layer, for a metal with no in-plane neighbours of its own
      let layerNet = null;
      for (const A of tops.slice().sort((x, y) => (atoms[x.m].label < atoms[y.m].label ? -1 : 1))) { layerNet = netVecs(A.m); if (layerNet) break; }
      if (!layerNet) return;
      // every metal pair across the interface (the shortest shift, then its ties); a large cell uses a neighbour
      // search out to the distance between the layers plus twice the longest M...M vector
      const reachR = Math.sqrt(target.dz * target.dz + 4 * Math.pow(Math.max(...layerNet.map((b) => Math.max(norm(b[0]), norm(b[1])))), 2)) + 2;
      const prs = across(tops, bots, target.k, Infinity, reachR).map((pr) => ({ d: inPlane(pr.v), A: pr.a, B: pr.b, fB: pr.fb }));
      let minLen = Infinity;
      for (const c of prs) { c.len = norm(c.d); if (c.len < minLen) minLen = c.len; }
      if (!isFinite(minLen)) return;
      const cands = prs.filter((c) => c.len <= minLen + 0.05);
      let best = null;
      for (const c of cands) {
        for (const net of netVecs(c.A.m) || layerNet) {
          const [s1, s2] = fold(c.d, net[0], net[1]);
          const key = [s1 + s2, s1, s2];
          if (!best || key[0] < best.key[0] - 1e-4 || (Math.abs(key[0] - best.key[0]) <= 1e-4 && (key[1] < best.key[1] - 1e-4 ||
            (Math.abs(key[1] - best.key[1]) <= 1e-4 && c.len < best.c.len - 1e-6)))) best = { c, key, s1, s2, net };
        }
      }
      const { c, s1, s2, net } = best;
      const [p1, p2] = net;
      const tol = 0.15;
      const z = (x) => x < tol, hf = (x) => x > 0.5 - tol;
      let kind = 'intermediate';
      if (z(s1) && z(s2)) kind = 'near (0, 0), eclipsed';
      else if (hf(s1) && hf(s2)) kind = 'near (½, ½), staggered';
      else if ((hf(s1) && z(s2)) || (z(s1) && hf(s2))) kind = 'near (½, 0)';
      const o = { s1, s2, kind, p1: norm(p1), p2: norm(p2), v1: p1, v2: p2,
        m0: c.A.m, m1: c.B.m, df: sub(c.fB, c.A.f), shift: c.len, dh: height(c.fB) - height(c.A.f) };
      offBy.set(si, o);
    });
    // the interfaces with their offsets. Interfaces whose spacing, gallery and X...X agree within 0.01 A and whose
    // offsets agree within 0.02 are alike: one entry, with the smaller offset of the two. Order: gallery, spacing,
    // offset. res.offsets[k] is the offset of res.interfaces[k] (null for a layer with no metals).
    const same = (p, q) => (p === null && q === null) || (p !== null && q !== null && Math.abs(p - q) < 0.01);
    const sameOff = (p, q) => (!p && !q) || (p && q && Math.abs(p.s1 - q.s1) < 0.02 && Math.abs(p.s2 - q.s2) < 0.02);
    const smaller = (o, q) => o.s1 + o.s2 < q.s1 + q.s2 - 1e-4 || (Math.abs(o.s1 + o.s2 - q.s1 - q.s2) <= 1e-4 && o.s1 < q.s1 - 1e-4);
    // the smallest of alike values stands for them, so the raw list is sorted first (values rounded to 0.001)
    const r3 = (x) => (x === null ? 1e9 : Math.round(x * 1000));
    const ifKey = (q) => [r3(q.gallery), r3(q.spacing), q.offset ? Math.round((q.offset.s1 + q.offset.s2) * 1000) : 9e3, q.offset ? Math.round(q.offset.s1 * 1000) : 9e3, r3(q.xx)];
    const byKey = (p, q) => { const a = ifKey(p), b = ifKey(q); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
    for (const it of rawIfs) it.offset = offBy.get(it.si) || null;
    rawIfs.sort(byKey);
    res.interfaces = [];
    for (const it of rawIfs) {
      const twin = res.interfaces.find((q) => same(q.spacing, it.spacing) && same(q.gallery, it.gallery) && same(q.xx, it.xx) && sameOff(q.offset, it.offset));
      if (!twin) res.interfaces.push(it);
      else if (it.offset && twin.offset && smaller(it.offset, twin.offset)) twin.offset = it.offset;
    }
    res.interfaces.sort(byKey);
    res.offsets = res.interfaces.map((q) => q.offset);
    res.offset = res.offsets.find((o) => o) || null;
    const g0 = res.interfaces.find((q) => q.gallery !== null);
    if (g0 && !res.corrugated) res.gallery = g0.gallery;
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
    // Z of the file; a value within 0.02 of an integer (2.99988) is that integer
    let Z = parseFloat(uc.meta.Z);
    if (Z > 0 && Math.abs(Z - Math.round(Z)) < 0.02) Z = Math.round(Z);
    out.zFrom = Z > 0 ? 'file' : 'cell';
    if (!(Z > 0)) {
      // no Z in the file. When every atom is in a molecule, a complex or a free ion, the formula unit is the set of
      // these units in the smallest whole ratio (four C6H6 molecules: C6H6, Z = 4); units are of one kind when their
      // atoms other than H agree. Otherwise the greatest common divisor of the element counts of the cell.
      const ms = uc.molecules || [];
      const inUnits = ms.reduce((s, m) => s + m.atoms.length, 0);
      if (ms.length && inUnits === uc.atoms.length && !(uc.networks && uc.networks.length)) {
        const kinds = new Map();
        for (const m of ms) {
          const c = {};
          // a kind of unit by its atoms other than H: a water whose H the file does not give is still a water
          for (const a of m.atoms) { const el = atoms[a.idx].el; if (el !== 'H') c[el] = (c[el] || 0) + 1; }
          const key = Object.keys(c).sort().map((e) => e + c[e]).join('');
          kinds.set(key, (kinds.get(key) || 0) + 1);
        }
        Z = Array.from(kinds.values()).reduce((g, n) => gcd(g, n), 0);
        // with whole cell contents, the formula unit must be whole too (units of one kind with different H: the gcd)
        if (integral && !els.every((e) => Math.abs(counts[e] / Z - Math.round(counts[e] / Z)) < 0.02)) Z = 0;
      }
      if (!(Z > 0)) Z = integral ? els.reduce((g, e) => gcd(g, Math.round(counts[e])), 0) : 1;
    }
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

    // metal coordination, one entry per crystallographic site. In a file without symmetry (every atom its own
    // site), metals with the same element, ligands and distances (to 0.001 A) share one entry; alike counts them.
    const seenSite = new Set();
    const byValue = new Map();
    const p1 = !(uc.ops && uc.ops.length > 1);
    for (const i of metals) {
      const key = atoms[i].site;
      if (seenSite.has(key) || !ligs[i].length) continue;
      seenSite.add(key);
      const L = ligs[i].slice().sort((p, q) => p.d - q.d);
      if (p1) {
        const vk = atoms[i].el + '|' + L.map((l) => atoms[l.j].el + l.d.toFixed(3)).join(',');
        if (byValue.has(vk)) { byValue.get(vk).alike++; continue; }
      }
      const ds = L.map((l) => l.d);
      const mean = ds.reduce((s, x) => s + x, 0) / ds.length;
      const entry = {
        label: atoms[i].label, el: atoms[i].el, cn: L.length,
        bonds: L.map((l) => ({ label: atoms[l.j].label, el: atoms[l.j].el, d: l.d })),
        mean, min: ds[0], max: ds[ds.length - 1], alike: 1
      };
      if (p1) byValue.set(atoms[i].el + '|' + L.map((l) => atoms[l.j].el + l.d.toFixed(3)).join(','), entry);
      // two ligands that cannot both be there (closer than 0.75 x the sum of their covalent radii): the
      // polyhedron mixes two disorder orientations, and the octahedron values have no meaning
      for (let p = 0; p < L.length && !entry.overlap; p++) for (let q = p + 1; q < L.length; q++) {
        const ep = atoms[L[p].j].el, eq = atoms[L[q].j].el;
        if (norm(cell.toCart(sub(L[p].off, L[q].off))) < 0.75 * ((RC[ep] || 0.75) + (RC[eq] || 0.75))) { entry.overlap = true; break; }
      }
      if (L.length === 6 && !entry.overlap) {
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
        // an octahedron has three trans angles near 180; in a trigonal prism (MoS2) the widest are near 136
        entry.octahedral = angs[12] > 150;
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

    // the bonded network: its dimensionality is the number of independent lattice translations
    // that join a connected unit to itself
    const describe = (list, kind) => {
      const top = Math.max(...list.map((c) => c.dim));
      const main = list.filter((c) => c.dim === top);
      const vecs = [];
      for (const c of main) for (const v of c.vecs) vecs.push(v.slice());
      rankOf(vecs);
      const fw = { dim: top, components: main.length, kind, main };
      if (top === 2) {
        let h = cross(vecs[0], vecs[1]).map(Math.round);
        const g = gcd(gcd(h[0], h[1]), h[2]) || 1;
        h = h.map((x) => x / g);
        const first = h.find((x) => x !== 0);
        if (first < 0) h = h.map((x) => -x);
        h = h.map((x) => x + 0);
        const G = [0, 1, 2].map((k) => h[0] * cell.recip[0][k] + h[1] * cell.recip[1][k] + h[2] * cell.recip[2][k]);
        fw.hkl = h;
        fw.dhkl = 1 / norm(G);
        fw.spacing = fw.dhkl / main.length;
      } else if (top === 1) {
        let u = vecs[0].map(Math.round);
        const g = gcd(gcd(u[0], u[1]), u[2]) || 1;
        u = u.map((x) => x / g);
        const first = u.find((x) => x !== 0);
        if (first < 0) u = u.map((x) => -x);
        fw.uvw = u.map((x) => x + 0);
      }
      return fw;
    };
    const coord = uc.comps.filter((c) => c.atoms.some((i) => uc.center[i] && ligs[i].length > 0));
    if (coord.length) {
      const fw = describe(coord, 'coordination');
      const inMain = new Set();
      for (const c of fw.main) for (const i of c.atoms) inMain.add(i);
      // elements joined by the network, and whether every bridge between two metals is a halide
      const bridging = [];
      const ligEls = new Set();
      for (const i of inMain) {
        if (metalsOf[i].length) ligEls.add(atoms[i].el);
        if (metalsOf[i].length >= 2) bridging.push(atoms[i].el);
      }
      fw.ligands = Array.from(ligEls).sort();
      fw.halide = fw.ligands.length > 0 && fw.ligands.every((e) => HALIDE.has(e));
      fw.halideBridged = bridging.length > 0 && bridging.every((e) => HALIDE.has(e));
      if (fw.dim === 2 && fw.halideBridged) {
        // layered metal halide: the 2D perovskite descriptors apply
        const off = new Map();
        const compOf = new Map();
        fw.main.forEach((c, k) => { for (const i of c.atoms) if (uc.center[i]) { off.set(i, uc.offs[i]); compOf.set(i, k); } });
        // Two layers that a stretched bridge joins are one layer: a terminal halide of one layer that is up to 0.25 A
        // beyond the metal-halide cut-off from a metal of the other, with M-X-M above 150 degrees (the long axial
        // bridge of an n = 2 slab at some temperatures).
        const K = fw.main.length;
        const root = fw.main.map((_, k) => k);
        const shiftOf = fw.main.map(() => [0, 0, 0]);       // lattice shift of each layer relative to its root
        const findR = (k) => { while (root[k] !== k) k = root[k]; return k; };
        const posOf = (i) => add(atoms[i].f, off.get(i));
        const metalsByComp = fw.main.map((c) => c.atoms.filter((i) => uc.center[i]));
        let joined = 0;
        // the terminal halides, and the metals of the other layers near each (a neighbour search in large cells)
        const term = [];
        for (let k = 0; k < K; k++) for (const i of metalsByComp[k]) for (const l of ligs[i]) {
          if (HALIDE.has(atoms[l.j].el) && metalsOf[l.j].length === 1) term.push({ k, i, l, fx: add(posOf(i), l.off) });
        }
        const allM = [];
        metalsByComp.forEach((ms, k) => { for (const m of ms) allM.push({ k, m }); });
        const maxCut = 2 * Math.max(...allM.map((o) => RC[atoms[o.m].el] || 0), 1.4) + TOL_HALIDE + 0.25;
        const nearM = K > 1 && term.length * allM.length > 1e6
          ? neighbours(cell, term.map((x) => x.fx).concat(allM.map((o) => posOf(o.m))), maxCut).slice(0, term.length).map((list) => list.filter(({ j }) => j >= term.length).map(({ j }) => allM[j - term.length]))
          : term.map(() => allM);
        // A join that reaches a lattice copy of a layer of the same group closes on itself: every layer is then
        // joined to the next (a 3D network with long bonds), and no join is made.
        let closed = false;
        for (let q0 = 0; !closed && q0 < term.length; q0++) {
          const { k, l, fx } = term[q0];
          const X = atoms[l.j];
          for (const { k: k2, m } of nearM[q0]) {
            const dfr = sub(fx, posOf(m));
            const s = dfr.map(Math.round);
            const v = cell.toCart(sub(dfr, s));
            const d = norm(v);
            const cut = RC[atoms[m].el] + RC[X.el] + TOL_HALIDE;
            if (d < cut || d > cut + 0.25) continue;
            const a1 = cell.toCart(l.off).map((x) => -x);
            if (angleDeg(a1, v.map((x) => -x)) < 150) continue;
            const t = sub(add(shiftOf[k], s), shiftOf[k2]);
            if (findR(k2) === findR(k)) {
              // already one group: the bridge must agree with the shifts that the group has
              // a shift in the layer plane (hkl . t = 0) is the same layer; a shift across the layers closes the join
              if (Math.abs(t[0] * fw.hkl[0] + t[1] * fw.hkl[1] + t[2] * fw.hkl[2]) > 1e-9) { closed = true; break; }
              continue;
            }
            // move layer k2 (and its group) by t so that metal m sits next to X
            const r1 = findR(k), r2 = findR(k2);
            for (let q = 0; q < K; q++) if (findR(q) === r2) shiftOf[q] = add(shiftOf[q], t);
            root[r2] = r1;
            joined++;
          }
        }
        if (closed) joined = 0;
        if (joined) {
          const roots = Array.from(new Set(fw.main.map((_, k) => findR(k))));
          fw.main.forEach((c, k) => { for (const i of metalsByComp[k]) { off.set(i, add(off.get(i), shiftOf[k])); compOf.set(i, roots.indexOf(findR(k))); } });
          fw.components = roots.length;
          fw.spacing = fw.dhkl / roots.length;
          fw.stretched = true;
        }
        try { out.layer = layerAnalysis(uc, fw, off, compOf); } catch (err) { out.layer = null; }
      }
      delete fw.main;
      out.framework = fw;
    } else if (uc.networks.length) {
      const fw = describe(uc.networks, 'covalent');
      delete fw.main;
      fw.halide = false;
      fw.halideBridged = false;
      fw.ligands = [];
      out.framework = fw;
    }
    out.molecular = !out.framework && uc.molecules.some((m) => m.atoms.length > 1);
    return out;
  }

  /* ---------- user-defined polyhedra ----------
     A rule is { center: 'Pb', corners: ['Br', 'I'] or null for any element, max: 3.4 (angstrom) }.
     Any element can be a centre and any element a corner; this is a drawing aid and changes no reported number. */
  const shiftsWithin = (cell, dist) => {
    const n = cell.recip.map((r) => Math.max(1, Math.ceil(dist * norm(r))));
    const out = [];
    for (let i = -n[0]; i <= n[0]; i++) for (let j = -n[1]; j <= n[1]; j++) for (let k = -n[2]; k <= n[2]; k++) out.push([i, j, k]);
    return out;
  };
  const cornerOk = (rule, el) => !rule.corners || rule.corners.includes(el);
  /* centre atom of the cell -> its corners [{ j, off, d }], off = corner - centre in fractional coordinates */
  function polyhedraFor(uc, rules) {
    const { cell, atoms } = uc;
    const map = new Map();
    for (const rule of rules || []) {
      if (!rule || rule.on === false || !(rule.max > 0)) continue;
      const shifts = shiftsWithin(cell, rule.max);
      atoms.forEach((a, i) => {
        if (a.el !== rule.center) return;
        const list = map.get(i) || [];
        atoms.forEach((b, j) => {
          if (!cornerOk(rule, b.el) || !compatible(a, b)) return;
          const base = sub(b.f, a.f);
          for (const sft of shifts) {
            if (i === j && !sft[0] && !sft[1] && !sft[2]) continue;
            const off = add(base, sft);
            const d = norm(cell.toCart(off));
            if (d > rule.max || d < 0.4) continue;
            if (!list.some((v) => v.j === j && norm(sub(v.off, off)) < 1e-6)) list.push({ j, off, d });
          }
        });
        map.set(i, list);
      });
    }
    return map;
  }
  /* what one rule gives in this structure: how many centres, and the smallest and largest number of corners */
  function polyhedraStats(uc, rule) {
    const map = polyhedraFor(uc, [Object.assign({}, rule, { on: true })]);
    const cn = [];
    let outside = 0;
    for (const list of map.values()) {
      cn.push(list.length);
      if (list.length < 4) continue;
      // corners relative to the centre: the centre is outside when it lies beyond one of the faces
      const pts = list.map((v) => uc.cell.toCart(v.off));
      if (hullFaces(pts).some((f) => -dot(f.n, pts[f.v[0]]) > 0.05)) outside++;
    }
    return { centres: cn.length, cnMin: cn.length ? Math.min(...cn) : 0, cnMax: cn.length ? Math.max(...cn) : 0, outside };
  }
  /* a distance limit that takes the first shell of corners around the centre. For each centre the shell
     ends at the widest relative gap among its first 12 sorted distances; the limit sits just outside the
     widest shell (times 1.08), but inside the next shell of every centre where that is possible. It never
     reaches for a further shell to make up the numbers: those corners belong to a neighbouring unit. */
  function suggestPolyMax(uc, center, corners) {
    const reach = 8;
    const map = polyhedraFor(uc, [{ center, corners, max: reach }]);
    let end = null, next = null;
    for (const list of map.values()) {
      const d = list.map((v) => v.d).sort((p, q) => p - q);
      if (!d.length) continue;
      let k = d.length - 1, best = 1.12;                       // a gap has to be at least 12 % to end a shell
      for (let i = 0; i + 1 < d.length && i < 12; i++) if (d[i + 1] / d[i] > best) { best = d[i + 1] / d[i]; k = i; }
      if (end === null || d[k] > end) end = d[k];
      if (k + 1 < d.length && (next === null || d[k + 1] < next)) next = d[k + 1];
    }
    if (end === null) return null;
    let lim = end * 1.08;
    if (next !== null && next > end) lim = Math.min(lim, (end + next) / 2);
    return Math.ceil(lim * 20) / 20;
  }

  /* ---------- unit cell -> displayed block of n1 x n2 x n3 cells ---------- */
  function assemble(uc, lo, hi, rules) {
    const { cell, atoms, ligs, molecules, adj } = uc;
    const out = [];
    const polyhedra = [];
    const mols = [];
    const push = (i, f, kind, group) => {
      out.push({ el: atoms[i].el, label: atoms[i].label, dg: atoms[i].dg, f, xyz: cell.toCart(f), kind, group, bonds: [], src: i, site: atoms[i].site });
      return out.length - 1;
    };
    const link = (p, q) => {
      if (p === q || out[p].bonds.includes(q)) return;
      out[p].bonds.push(q); out[q].bonds.push(p);
    };
    const eps = 1e-4;
    const t0 = lo.map((x) => Math.floor(x) - 1);
    const t1 = hi.map((x) => Math.ceil(x));
    const inside = (f) => !f.some((x, d) => x < lo[d] - eps || x > hi[d] + eps);
    // every drawn atom, by cell atom and lattice translation, so that shared atoms are drawn once
    const placed = new Map();
    const keyOf = (i, f) => i + ':' + Math.round(f[0] - atoms[i].f[0]) + ',' + Math.round(f[1] - atoms[i].f[1]) + ',' + Math.round(f[2] - atoms[i].f[2]);

    // molecules, complexes and free ions whose centroid lies inside the block
    let group = 0;
    for (let i = t0[0]; i <= t1[0]; i++) for (let j = t0[1]; j <= t1[1]; j++) for (let k = t0[2]; k <= t1[2]; k++) {
      for (let mi = 0; mi < molecules.length; mi++) {
        const mol = molecules[mi];
        const c = add(mol.cen, [i, j, k]);
        if (c.some((x, d) => x < lo[d] - eps || x >= hi[d] - eps)) continue;
        const idx = mol.atoms.map((a) => {
          const f = add(a.f, [i, j, k]);
          const ix = push(a.idx, f, mol.ion ? 'ion' : (uc.center[a.idx] ? 'metal' : 'molecule'), group);
          placed.set(keyOf(a.idx, f), ix);
          return ix;
        });
        for (const [p, q] of mol.bonds) link(idx[p], idx[q]);
        if (mol.polys) for (const pl of mol.polys) polyhedra.push({ center: idx[pl.center], verts: pl.verts.map((v) => idx[v]) });
        mols.push({ mi, t: [i, j, k], group });
        group++;
      }
    }

    // covalent networks: every atom inside the block (faces included), bonded to its drawn neighbours
    const netAtoms = [];
    for (const net of uc.networks) for (const a of net.atoms) {
      for (let i = t0[0]; i <= t1[0]; i++) for (let j = t0[1]; j <= t1[1]; j++) for (let k = t0[2]; k <= t1[2]; k++) {
        const f = add(atoms[a].f, [i, j, k]);
        if (!inside(f)) continue;
        const ix = push(a, f, 'network', -1);
        placed.set(keyOf(a, f), ix);
        netAtoms.push(ix);
      }
    }
    for (const ix of netAtoms) {
      for (const nb of adj[out[ix].src]) {
        const jx = placed.get(keyOf(nb.j, add(out[ix].f, nb.d)));
        if (jx !== undefined) link(ix, jx);
      }
    }
    // network formers (SiO4, BO4, PO4) get their whole first shell, so the polyhedron is complete at the faces
    for (const ix of netAtoms) {
      if (!uc.polyAt.has(out[ix].src)) continue;
      const verts = [];
      for (const nb of adj[out[ix].src]) {
        const f = add(out[ix].f, nb.d);
        const key = keyOf(nb.j, f);
        let jx = placed.get(key);
        if (jx === undefined) { jx = push(nb.j, f, 'network', -1); placed.set(key, jx); }
        link(ix, jx);
        verts.push(jx);
      }
      polyhedra.push({ center: ix, verts });
    }

    // framework metals inside the block (faces included), each with its full coordination shell
    for (const m of uc.fwMetals) {
      const f0 = atoms[m].f;
      for (let i = t0[0]; i <= t1[0]; i++) for (let j = t0[1]; j <= t1[1]; j++) for (let k = t0[2]; k <= t1[2]; k++) {
        const fm = add(f0, [i, j, k]);
        if (!inside(fm)) continue;
        const im = push(m, fm, 'metal', -1);
        const verts = [];
        for (const l of ligs[m]) {
          const fx = add(fm, l.off);
          const key = keyOf(l.j, fx);
          let ix = placed.get(key);
          if (ix === undefined) { ix = push(l.j, fx, 'ligand', -1); placed.set(key, ix); }
          link(im, ix);
          verts.push(ix);
        }
        if (verts.length >= 4 && verts.length <= MAX_POLY_CN) polyhedra.push({ center: im, verts });
      }
    }

    // user-defined polyhedra: each rule is a set of its own, drawn next to the automatic ones and to the
    // other rules (two rules may share a centre element). A corner that is not drawn yet is added as a lone
    // atom, without a bond, so every polyhedron has all its corners.
    if (rules && rules.length) {
      const before = out.length;
      rules.forEach((rule, k) => {
        if (!rule || rule.on === false) return;
        const map = polyhedraFor(uc, [rule]);
        for (let ix = 0; ix < before; ix++) {
          const a = out[ix];
          const list = map.get(a.src);
          if (!list || list.length < 3 || !(a.group >= 0 || inside(a.f))) continue;
          const verts = list.map((v) => {
            const f = add(a.f, v.off);
            const key = keyOf(v.j, f);
            let jx = placed.get(key);
            if (jx === undefined) { jx = push(v.j, f, 'ligand', -1); placed.set(key, jx); }
            return jx;
          });
          polyhedra.push({ center: ix, verts, custom: true, rule: k });
        }
      });
    }

    // hydrogen bonds: N-H...A / O-H...A. Acceptors are O and N of another molecule, and the anions
    // of a framework, of a metal complex (the halides of [BiI6]3-, [CuCl4]2-), of a polyhalide (I3-) or free ions
    // (halide, O, N, S)
    const hbonds = [];
    const hasH = out.some((a) => a.el === 'H');
    const acceptors = [];
    // the halides of a polyhalide anion (I3-, Br3-: a molecule of halides only) are anions too
    const polyX = new Set();
    for (const m of uc.molecules) if (m.atoms.length > 1 && m.atoms.every((x) => HALIDE.has(uc.atoms[x.idx].el))) for (const x of m.atoms) polyX.add(x.idx);
    out.forEach((a, i) => {
      const anion = a.kind === 'ligand' || a.kind === 'ion' || a.kind === 'network' || polyX.has(a.src) || (uc.metalsOf[a.src] && uc.metalsOf[a.src].length > 0);
      if ((anion && (HALIDE.has(a.el) || a.el === 'O' || a.el === 'N' || a.el === 'S')) || (a.kind === 'molecule' && (a.el === 'O' || a.el === 'N'))) acceptors.push(i);
    });
    const d3 = (p, q) => norm(sub(out[p].xyz, out[q].xyz));
    // the acceptors near a point, from a grid (the largest H...A and D...A limits are below 4 A)
    const accGrid = cartGrid(acceptors.map((i) => out[i].xyz), 4.0);
    const accNear = (p, r) => accGrid.near(p, r).map((k) => acceptors[k]).sort((x, y) => x - y);
    if (hasH) {
      out.forEach((h, ih) => {
        if (h.el !== 'H' || h.bonds.length !== 1) return;
        const id = h.bonds[0];
        const D = out[id];
        if (D.el !== 'N' && D.el !== 'O') return;
        for (const ia of accNear(h.xyz, 3.6)) {
          const A = out[ia];
          if (ia === id || (A.group === h.group && A.group >= 0)) continue;
          if (A.el === 'N' && A.bonds.length >= 4) continue;
          const lim = VDW.H + VDW[A.el] - 0.15;
          const dHA = d3(ih, ia);
          if (dHA > lim) continue;
          const ang = angleDeg(sub(D.xyz, h.xyz), sub(A.xyz, h.xyz));
          if (ang < 120) continue;
          hbonds.push({ d: id, h: ih, a: ia, dHA, dDA: d3(id, ia), angle: ang });
        }
      });
      // an N or O whose H the file does not give (an ammonium N, amineN, or a hydroxyl O with one heavy neighbour by
      // a single bond, and no H; not a C=O or a C#N): the contact rule of files without H, D...A below the van der
      // Waals sum + 0.15 A, for halide acceptors
      out.forEach((D, id) => {
        if (D.kind !== 'molecule' || (D.el !== 'N' && D.el !== 'O')) return;
        if (D.bonds.some((j) => out[j].el === 'H') || D.bonds.length !== 1) return;
        const x = D.bonds[0];
        if (D.el === 'O' ? !singleBond('O', out[x].el, d3(id, x)) : !amineN(d3(id, x), out[x].bonds.filter((j) => j !== id).map((j) => out[j].el))) return;
        for (const ia of accNear(D.xyz, 4.0)) {
          const A = out[ia];
          if (!HALIDE.has(A.el) || (A.group === D.group && A.group >= 0)) continue;
          const dDA = d3(id, ia);
          if (dDA < VDW[D.el] + VDW[A.el] + 0.15) hbonds.push({ d: id, h: -1, a: ia, dHA: null, dDA, angle: null });
        }
      });
    } else {
      out.forEach((D, id) => {
        if (D.kind !== 'molecule' || (D.el !== 'N' && D.el !== 'O')) return;
        for (const ia of accNear(D.xyz, 4.0)) {
          const A = out[ia];
          if (!HALIDE.has(A.el)) continue;
          const dDA = d3(id, ia);
          if (dDA < VDW[D.el] + VDW[A.el] + 0.15) hbonds.push({ d: id, h: -1, a: ia, dHA: null, dDA, angle: null });
        }
      });
    }
    return { atoms: out, polyhedra, hbonds, hasH, mols };
  }

  /* The hydrogen bonds of a cell, one row for each distinct contact: { key, D, H, A, dHA, dDA, angle }, sorted by
     D...A. The search block holds every molecule whose centroid is in the cell, and every atom within the
     largest molecule radius + 4 A of the cell, so that each contact is found once with its donor molecule in
     the cell, also across the faces of the cell. */
  function hbondList(uc) {
    const { cell, molecules } = uc;
    let R = 0;
    for (const mol of molecules) for (const a of mol.atoms) R = Math.max(R, norm(cell.toCart(sub(a.f, mol.cen))));
    const m = cell.recip.map((r) => Math.min(1, (R + 4) * norm(r)));
    const big = assemble(uc, m.map((x) => -x), m.map((x) => 1 + x));
    const seen = new Map();
    const A = big.atoms;
    for (const h of big.hbonds) {
      const key = A[h.d].label + '|' + (h.h >= 0 ? A[h.h].label : '') + '|' + A[h.a].label + '|' + h.dDA.toFixed(2);
      if (!seen.has(key)) seen.set(key, { key, D: A[h.d].label, H: h.h >= 0 ? A[h.h].label : null, A: A[h.a].label, dHA: h.dHA, dDA: h.dDA, angle: h.angle });
    }
    return { rows: Array.from(seen.values()).sort((p, q) => p.dDA - q.dDA), hasH: big.hasH, big };
  }

  /* ---------- measurements ---------- */
  const distance = (p, q) => norm(sub(p, q));
  /* angle p-q-r at q, in degrees */
  const bondAngle = (p, q, r) => angleDeg(sub(p, q), sub(r, q));
  /* torsion p-q-r-s about q-r, in degrees, -180 to 180; positive is clockwise looking from q to r (IUPAC) */
  /* the torsion p-q-r-s in degrees, or NaN when p, q, r or q, r, s are within 2 degrees of a line (the torsion
     then has no value) */
  function torsion(p, q, r, s) {
    const b1 = sub(q, p), b2 = sub(r, q), b3 = sub(s, r);
    const n1 = cross(b1, b2), n2 = cross(b2, b3);
    const lim = Math.sin(2 * Math.PI / 180);
    if (norm(n1) < lim * norm(b1) * norm(b2) || norm(n2) < lim * norm(b2) * norm(b3)) return NaN;
    const y = norm(b2) * dot(b1, n2);
    const x = dot(n1, n2);
    return Math.atan2(y, x) * 180 / Math.PI;
  }

  /* ---------- planes for measurements ---------- */
  /* A plane is { n, c, rms }: unit normal, a point of the plane, and the root-mean-square distance of the atoms
     that set it (0 for a lattice plane). */
  /* The least-squares plane through three or more points. null when the points do not set a plane
     (fewer than three, or all on one line). */
  function planeOfPoints(P) {
    if (!P || P.length < 3) return null;
    const r = planeNormal(P);
    // the points must spread in two directions: the largest distance from the line through the first point
    // and the farthest point must be clear of zero
    let far = 0, fk = 0;
    for (let k = 1; k < P.length; k++) { const dd = norm(sub(P[k], P[0])); if (dd > far) { far = dd; fk = k; } }
    if (far < 1e-6) return null;
    const u = sub(P[fk], P[0]).map((x) => x / far);
    const off = Math.max(...P.map((q) => { const w = sub(q, P[0]); return norm(sub(w, u.map((x) => x * dot(w, u)))); }));
    if (off < 1e-3 || !r.n.every(isFinite)) return null;
    return { n: r.n, c: r.cen, rms: r.rms };
  }
  /* The lattice plane (hkl) through the point p (Cartesian). null for (0 0 0). */
  function planeOfHkl(cell, hkl, p) {
    const G = [0, 1, 2].map((k) => hkl[0] * cell.recip[0][k] + hkl[1] * cell.recip[1][k] + hkl[2] * cell.recip[2][k]);
    const gl = norm(G);
    if (!(gl > 1e-12)) return null;
    return { n: G.map((x) => x / gl), c: p.slice(), rms: 0 };
  }
  /* The lattice plane (hkl) that is nearest to a plane with the unit normal n: { hkl, angle }. angle is the angle
     between the two planes, in degrees. Small indexes come first: the result is the plane with the smallest
     largest index that is within tol degrees (default 1). If no plane is that near, the result is the nearest
     plane with indexes up to maxIndex (default 6). The sign of hkl is such that its normal points as n does. */
  function nearestHkl(cell, n, maxIndex, tol) {
    const M = maxIndex || 6, T = tol === undefined ? 1 : tol;
    const byIndex = [];
    let best = null;
    for (let h = -M; h <= M; h++) for (let k = -M; k <= M; k++) for (let l = -M; l <= M; l++) {
      if (!h && !k && !l) continue;
      if (gcd(gcd(h, k), l) !== 1) continue;
      const G = [0, 1, 2].map((i) => h * cell.recip[0][i] + k * cell.recip[1][i] + l * cell.recip[2][i]);
      const c = dot(G, n) / norm(G);
      if (c <= 0) continue;                                 // (-h -k -l) is the same plane: keep the one that points as n
      const entry = { hkl: [h, k, l], angle: Math.acos(Math.min(1, c)) * 180 / Math.PI };
      const m = Math.max(Math.abs(h), Math.abs(k), Math.abs(l));
      if (!byIndex[m] || entry.angle < byIndex[m].angle - 1e-9) byIndex[m] = entry;
      if (!best || entry.angle < best.angle - 1e-9) best = entry;
    }
    for (let m = 1; m <= M; m++) if (byIndex[m] && byIndex[m].angle <= T) return byIndex[m];
    return best;
  }
  /* the distance of a point from a plane, in Å: positive on the side that the normal points to */
  const planeDistance = (plane, p) => dot(sub(p, plane.c), plane.n);
  /* the point of the plane that is nearest to p */
  const planeFoot = (plane, p) => { const k = planeDistance(plane, p); return sub(p, plane.n.map((x) => x * k)); };
  /* the angle between the line p-q and a plane, 0 to 90 degrees: 0 = the line lies in the plane */
  function linePlaneAngle(plane, p, q) {
    const v = sub(q, p);
    const L = norm(v);
    if (!(L > 1e-9)) return NaN;
    return Math.asin(Math.min(1, Math.abs(dot(v, plane.n)) / L)) * 180 / Math.PI;
  }
  /* The angle p-q-r at q after both bonds are projected onto a plane: the angle seen along the plane normal.
     { angle, full, u, v }: angle is the projected angle and full the angle in space (degrees, 0 to 180). u and v
     are the projected bonds q->p and q->r (vectors in the plane). angle is NaN when a bond is within 2 degrees
     of the normal: its projection then has almost no length, and the angle has no meaning. */
  function projectedAngle(plane, p, q, r) {
    const n = plane.n;
    const flat = (w) => { const k = dot(w, n); return sub(w, n.map((x) => x * k)); };
    const a = sub(p, q), b = sub(r, q);
    const u = flat(a), v = flat(b);
    const full = angleDeg(a, b);
    const short = (w, f) => !(norm(f) > Math.sin(2 * Math.PI / 180) * norm(w));
    return { angle: short(a, u) || short(b, v) ? NaN : angleDeg(u, v), full, u, v };
  }
  /* the angle between two planes, 0 to 90 degrees */
  const planePlaneAngle = (a, b) => Math.acos(Math.min(1, Math.abs(dot(a.n, b.n)))) * 180 / Math.PI;

  /* A disc of a plane for the picture: { c, r, pts }. The centre is the plane point, the disc covers the points
     that set the plane with `pad` Å to spare, and pts are `sides` points on its edge. */
  function planeDisc(plane, pts, pad, sides) {
    const n = plane.n;
    let e1 = cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
    e1 = e1.map((x) => x / norm(e1));
    const e2 = cross(n, e1);
    const r = Math.max(0, ...(pts || []).map((q) => norm(sub(planeFoot(plane, q), plane.c)))) + pad;
    const m = sides || 36;
    const edge = [];
    for (let k = 0; k < m; k++) {
      const th = 2 * Math.PI * k / m;
      edge.push([0, 1, 2].map((i) => plane.c[i] + r * (Math.cos(th) * e1[i] + Math.sin(th) * e2[i])));
    }
    return { c: plane.c.slice(), r, pts: edge };
  }
  /* The mark of an angle: points on the arc with the radius r around the vertex c, from the direction of p to the
     direction of q, the short way. steps + 1 points. [] when the two directions are the same or opposite. */
  function arcPoints(c, p, q, r, steps) {
    const u0 = sub(p, c), v0 = sub(q, c);
    const lu = norm(u0), lv = norm(v0);
    if (!(lu > 1e-9) || !(lv > 1e-9)) return [];
    const u = u0.map((x) => x / lu), v = v0.map((x) => x / lv);
    const om = Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
    const so = Math.sin(om);
    if (so < 1e-6) return [];
    const n = Math.max(1, steps || 12);
    const out = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const a = Math.sin((1 - t) * om) / so, b = Math.sin(t * om) / so;
      out.push([0, 1, 2].map((i) => c[i] + r * (a * u[i] + b * v[i])));
    }
    return out;
  }
  /* Triangle meshes of spheres, for the glow around chosen atoms: balls = [{ c, r }]. Each mesh is
     { vertexArr, normalArr, faceArr } and holds at most maxVerts points. */
  function ballMesh(balls, seg, maxVerts) {
    const n = seg || 12, m = Math.max(3, Math.round(n / 2)), cap = maxVerts || 60000;
    const out = [];
    let cur = null;
    for (const b of balls) {
      if (!cur || cur.vertexArr.length + (m + 1) * n > cap) { cur = { vertexArr: [], normalArr: [], faceArr: [] }; out.push(cur); }
      const base = cur.vertexArr.length;
      for (let i = 0; i <= m; i++) {
        const th = Math.PI * i / m;
        for (let j = 0; j < n; j++) {
          const ph = 2 * Math.PI * j / n;
          const u = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
          cur.vertexArr.push([b.c[0] + b.r * u[0], b.c[1] + b.r * u[1], b.c[2] + b.r * u[2]]);
          cur.normalArr.push(u);
        }
      }
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
        const a = base + i * n + j, b2 = base + i * n + (j + 1) % n, c = a + n, d = b2 + n;
        cur.faceArr.push(a, c, b2, b2, c, d);
      }
    }
    return out;
  }

  /* ---------- what the picture shows for a row of the framework card ---------- */
  /* blk = assemble(...), uc = buildCell(...), info = analyse(uc). item is one of:
       { type: 'bond', m, x, d }            the M-X bonds between the sites m and x with the length d (Å)
       { type: 'site', m }                  the metal site m with all its bonds
       { type: 'cis', m }                   the two bonds of the smallest and of the largest cis X-M-X angle of the site m
       { type: 'bridge', m1, x, m2, theta } the M-X-M bridges with this angle (degrees)
       { type: 'axial' }                    the M-X bonds along the layer normal, with the normal and the layer plane at each metal
       { type: 'slab' }                     the planes of terminal halides on the two faces of each layer, and the distance between them
       { type: 'gallery' }                  the terminal-halide planes that face each other across the organic part
       { type: 'penetration', label }       the N atoms with this label, each with the terminal-halide plane it is measured from
       { type: 'offset' }                   a metal, the nearest metal of the next layer, the normal, the shift and the M...M vectors
       { type: 'hbond', D, H, A, dDA }      the hydrogen bonds D-H...A between these sites with this D...A distance (Å):
                                            D, H and A, the D-H bond, the H...A line and the angle at H. H is null for a
                                            file without H atoms: then D, A and the D...A line.
       { type: 'terminal' } { type: 'label', label } { type: 'metals' } { type: 'framework' } { type: 'organic' }
     Returns { atoms: [i], bonds: [[i, j]], planes: [{ c, n, r }], lines: [[p, q]], arcs: [{ c, p, q, r }] }.
     atoms and bonds are indexes into blk.atoms. planes are discs (centre, unit normal, radius), lines are
     point pairs, and arcs are the marks of angles (vertex c, from the direction of p to the direction of q,
     radius r), in Å: the page draws them with the atoms. */
  function highlightSet(blk, uc, info, item) {
    const A = blk.atoms;
    const atoms = new Set(), bonds = [], seen = new Set(), planes = [], lines = [], arcs = [];
    const arc = (c, p, q, r) => arcs.push({ c: c.slice(), p: p.slice(), q: q.slice(), r });
    const bond = (i, j) => {
      const key = i < j ? i + ':' + j : j + ':' + i;
      atoms.add(i); atoms.add(j);
      if (!seen.has(key)) { seen.add(key); bonds.push([i, j]); }
    };
    const isM = (a) => !!uc.center[a.src];
    const L = info && info.layer ? info.layer : null;
    const nh = L ? L.normal : null;
    const hOf = (p) => dot(p, nh);
    const lift = (p, H) => { const k = H - hOf(p); return [p[0] + k * nh[0], p[1] + k * nh[1], p[2] + k * nh[2]]; };   // p moved along the normal to the height H
    const isTerminal = (a) => HALIDE.has(a.el) && uc.metalsOf[a.src].length === 1;
    /* the height of the nearest copy of a face plane (top or bottom of a layer) to the height h */
    const faceNear = (h) => {
      let best = null;
      (L && L.slabs ? L.slabs : []).forEach((sl, si) => {
        for (const face of ['top', 'bot']) {
          if (sl[face] === null) continue;
          const k = Math.round((h - sl[face]) / L.dhkl);
          const H = sl[face] + k * L.dhkl;
          if (!best || Math.abs(h - H) < Math.abs(h - best.H)) best = { key: si + ':' + face + ':' + k, si, face, k, H };
        }
      });
      return best;
    };
    /* the planes of terminal halides that have atoms in the picture: [{ si, face, k, H, atoms, c, r }] */
    const facePlanes = () => {
      const found = new Map();
      if (!L) return [];
      A.forEach((a, i) => {
        if (!isTerminal(a)) return;
        const f = faceNear(hOf(a.xyz));
        if (!f || Math.abs(hOf(a.xyz) - f.H) > 1.5) return;
        if (!found.has(f.key)) found.set(f.key, Object.assign({ atoms: [] }, f));
        found.get(f.key).atoms.push(i);
      });
      return Array.from(found.values()).map((pl) => {
        let c = [0, 0, 0];
        for (const i of pl.atoms) c = add(c, A[i].xyz);
        c = lift(c.map((x) => x / pl.atoms.length), pl.H);
        const r = Math.max(...pl.atoms.map((i) => norm(sub(lift(A[i].xyz, pl.H), c)))) + 1.5;
        return Object.assign(pl, { c, r });
      });
    };
    const disc = (c, r) => planes.push({ c, n: nh.slice(), r });

    A.forEach((a, i) => {
      if (item.type === 'bond') {
        if (!isM(a) || a.label !== item.m) return;
        for (const j of a.bonds) if (A[j].label === item.x && Math.abs(distance(a.xyz, A[j].xyz) - item.d) < 0.0015) bond(i, j);
      } else if (item.type === 'site') {
        if (!isM(a) || a.label !== item.m) return;
        atoms.add(i);
        for (const j of a.bonds) bond(i, j);
      } else if (item.type === 'cis') {
        if (!isM(a) || a.label !== item.m || a.bonds.length !== 6) return;
        const pairs = [];
        for (let p = 0; p < 6; p++) for (let q = p + 1; q < 6; q++) pairs.push({ p: a.bonds[p], q: a.bonds[q], t: bondAngle(A[a.bonds[p]].xyz, a.xyz, A[a.bonds[q]].xyz) });
        pairs.sort((u, v) => u.t - v.t);
        // the 12 smallest of the 15 angles are the cis angles: the first and the last of them
        for (const pr of [pairs[0], pairs[11]]) { bond(i, pr.p); bond(i, pr.q); arc(a.xyz, A[pr.p].xyz, A[pr.q].xyz, 1.45); }
      } else if (item.type === 'bridge') {
        if (a.label !== item.x) return;
        const ms = a.bonds.filter((j) => isM(A[j]));
        for (let p = 0; p < ms.length; p++) for (let q = p + 1; q < ms.length; q++) {
          const la = A[ms[p]].label, lb = A[ms[q]].label;
          if (!((la === item.m1 && lb === item.m2) || (la === item.m2 && lb === item.m1))) continue;
          if (Math.abs(bondAngle(A[ms[p]].xyz, a.xyz, A[ms[q]].xyz) - item.theta) < 0.02) { bond(ms[p], i); bond(i, ms[q]); arc(a.xyz, A[ms[p]].xyz, A[ms[q]].xyz, 1.35); }
        }
      } else if (item.type === 'axial') {
        if (!isM(a) || !nh) return;
        let any = false;
        for (const j of a.bonds) {
          if (!HALIDE.has(A[j].el)) continue;
          const v = sub(A[j].xyz, a.xyz);
          if (Math.abs(dot(v, nh)) / norm(v) > 0.7) {
            bond(i, j); any = true;
            // the angle between the bond and the normal, on the side of the bond
            const side = dot(v, nh) > 0 ? 1 : -1;
            arc(a.xyz, a.xyz.map((x, k) => x + side * nh[k]), A[j].xyz, 2.2);
          }
        }
        // the layer normal through the metal, and the layer plane there
        if (any) { lines.push([a.xyz.map((x, k) => x - 3.4 * nh[k]), a.xyz.map((x, k) => x + 3.4 * nh[k])]); disc(a.xyz.slice(), 2.4); }
      } else if (item.type === 'terminal') {
        if (isTerminal(a)) atoms.add(i);
      } else if (item.type === 'label') {
        if (a.label === item.label) atoms.add(i);
      } else if (item.type === 'penetration') {
        if (a.label !== item.label || !nh) return;
        const f = faceNear(hOf(a.xyz));
        if (!f || Math.abs(hOf(a.xyz) - f.H) > 3) return;
        const foot = lift(a.xyz, f.H);
        atoms.add(i);
        lines.push([a.xyz.slice(), foot]);
        disc(foot, 3.2);
        // the terminal halides of that plane around the N
        A.forEach((x, j) => { if (isTerminal(x) && Math.abs(hOf(x.xyz) - f.H) < 1.5 && distance(lift(x.xyz, f.H), foot) < 4.8) atoms.add(j); });
      } else if (item.type === 'metals') {
        if (isM(a)) atoms.add(i);
      } else if (item.type === 'framework') {
        if (a.kind !== 'molecule') atoms.add(i);
      } else if (item.type === 'organic') {
        if (a.kind === 'molecule') atoms.add(i);
      }
    });
    if (item.type === 'framework') {
      for (const i of atoms) for (const j of A[i].bonds) if (atoms.has(j) && j > i) bond(i, j);
    }
    if (item.type === 'hbond') {
      for (const h of blk.hbonds || []) {
        if (A[h.d].label !== item.D || A[h.a].label !== item.A || Math.abs(h.dDA - item.dDA) > 0.006) continue;
        if ((h.h >= 0 ? A[h.h].label : null) !== (item.H || null)) continue;
        atoms.add(h.d); atoms.add(h.a);
        if (h.h >= 0) {
          bond(h.d, h.h);
          lines.push([A[h.h].xyz.slice(), A[h.a].xyz.slice()]);
          arc(A[h.h].xyz, A[h.d].xyz, A[h.a].xyz, 0.5);
        } else lines.push([A[h.d].xyz.slice(), A[h.a].xyz.slice()]);
      }
    }
    // A layer that the packing box cuts has bridges with one metal outside the box. Then the X atoms of the
    // bridge are shown with the metal that is there.
    if (item.type === 'bridge' && !atoms.size) {
      A.forEach((a, i) => {
        if (a.label !== item.x) return;
        for (const j of a.bonds) if (isM(A[j]) && (A[j].label === item.m1 || A[j].label === item.m2)) bond(i, j);
      });
    }
    if ((item.type === 'slab' || item.type === 'gallery') && L) {
      const faces = facePlanes();
      const use = new Set();
      const iface = item.type === 'gallery' && L.interfaces ? (L.interfaces[item.k || 0] || null) : null;
      const sv = item.type === 'slab' && L.slabList ? L.slabList.find((s) => s.si === item.si) || null : null;
      for (const T of faces) {
        if (T.face !== 'top') continue;
        // slab: the bottom face of the same layer (a layer of the same kind). gallery: the bottom face of the
        // next layer across this interface.
        let B = null;
        if (item.type === 'slab') {
          B = faces.find((f) => f.face === 'bot' && f.si === T.si && f.k === T.k);
          // the layers of this row: those whose slab is nearest to the value of this row (rows are 0.01 A apart or more)
          if (B && sv) {
            const v = T.H - B.H;
            const nearest = L.slabList.reduce((p, q) => (Math.abs(q.value - v) < Math.abs(p.value - v) ? q : p));
            if (nearest !== sv || Math.abs(v - sv.value) > 0.02) B = null;
          }
        } else if (iface && T.si === iface.si && iface.gallery !== null) {
          B = faces.find((f) => f.face === 'bot' && f.si === iface.next && Math.abs(f.H - T.H - iface.gallery) < 0.05);
        }
        if (!B) continue;
        use.add(T); use.add(B);
        lines.push([T.c, lift(T.c, B.H)]);
      }
      for (const f of use) { disc(f.c, f.r); for (const i of f.atoms) atoms.add(i); }
    }
    if (item.type === 'xx' && L && L.interfaces) {
      // the two terminal halides of the row: the shortest such pair across this interface in the picture
      const q = L.interfaces[item.k || 0];
      if (q && q.xx !== null) {
        const T = A.map((a, i) => i).filter((i) => isTerminal(A[i]));
        let best = null;
        for (const i of T) for (const j of T) {
          if (j === i || A[i].label !== q.xa || A[j].label !== q.xb) continue;
          if (best) break;
          const d = distance(A[i].xyz, A[j].xyz);
          if (Math.abs(d - q.xx) < 0.002 && hOf(A[j].xyz) > hOf(A[i].xyz)) best = [i, j];
        }
        if (best) { atoms.add(best[0]); atoms.add(best[1]); lines.push([A[best[0]].xyz.slice(), A[best[1]].xyz.slice()]); }
      }
    }
    if (item.type === 'offset' && L && L.offsets && L.offsets[item.k || 0]) {
      // the two metals of the row: the pair that the analysis used, or a pair at the same distance
      const o = L.offsets[item.k || 0];
      const ms = A.map((a, i) => i).filter((i) => isM(A[i]));
      let mid = [0, 0, 0];
      for (const i of ms) mid = add(mid, A[i].xyz);
      mid = mid.map((x) => x / Math.max(1, ms.length));
      const order = ms.slice().sort((u, v) => distance(A[u].xyz, mid) - distance(A[v].xyz, mid));
      const sameShift = (i, j) => { const d = sub(A[j].f, A[i].f); return o.df && d.every((x, k) => Math.abs(x - o.df[k]) < 1e-3); };
      // any pair of metals one layer apart whose shift gives the same two numbers
      const sameOffset = (i, j) => {
        const v = sub(A[j].xyz, A[i].xyz);
        const dh = dot(v, nh);
        if (Math.abs(dh - o.dh) > 0.3) return false;
        const d = sub(v, nh.map((x) => x * dh));
        if (norm(d) > o.shift + 0.06) return false;
        const p1 = o.v1, p2 = o.v2;
        const e1 = p1.map((x) => x / norm(p1));
        const e2 = cross(nh, e1);
        const a11 = dot(p1, e1), a12 = dot(p2, e1), a21 = dot(p1, e2), a22 = dot(p2, e2);
        const det = a11 * a22 - a12 * a21;
        const b1 = dot(d, e1), b2 = dot(d, e2);
        let s1 = (b1 * a22 - a12 * b2) / det, s2 = (a11 * b2 - a21 * b1) / det;
        s1 = Math.abs(s1 - Math.round(s1)); s2 = Math.abs(s2 - Math.round(s2));
        return Math.abs(Math.max(s1, s2) - o.s1) < 0.006 && Math.abs(Math.min(s1, s2) - o.s2) < 0.006;
      };
      const tests = [(i, j) => A[i].src === o.m0 && A[j].src === o.m1 && sameShift(i, j), sameShift, sameOffset];
      for (const ok of tests) {
        if (atoms.size) break;
        for (const i of order) {
          const j = ms.find((jj) => jj !== i && ok(i, jj));
          if (j === undefined) continue;
          const F = lift(A[i].xyz, hOf(A[j].xyz));
          atoms.add(i); atoms.add(j);
          lines.push([A[i].xyz.slice(), F], [F, A[j].xyz.slice()]);
          if (o.v1) lines.push([F, add(F, o.v1)], [F, add(F, o.v2)]);
          break;
        }
      }
    }
    return { atoms: Array.from(atoms).sort((x, y) => x - y), bonds, planes, lines: lines.filter((ln) => distance(ln[0], ln[1]) > 1e-3), arcs };
  }

  /* ---------- export: Tripos mol2 of a drawn block ----------
     Atom types are SYBYL types guessed from the element and the number of bonded neighbours.
     Bond orders are not assigned: every bond is written as a single bond. */
  function sybylType(el, n) {
    if (el === 'C') return n >= 4 ? 'C.3' : n === 3 ? 'C.2' : n === 2 ? 'C.1' : 'C.3';
    if (el === 'N') return n >= 4 ? 'N.4' : n === 3 ? 'N.3' : n === 2 ? 'N.2' : n === 1 ? 'N.1' : 'N.3';
    if (el === 'O') return n === 1 ? 'O.2' : 'O.3';
    if (el === 'S') return n === 1 ? 'S.2' : 'S.3';
    if (el === 'P') return 'P.3';
    return el;
  }
  function toMol2(blockAtoms, cell, name, keep) {
    const id = new Map();
    const rows = [];
    blockAtoms.forEach((a, i) => { if (!keep || keep(a)) { id.set(i, rows.length + 1); rows.push(i); } });
    const bonds = [];
    for (const i of rows) for (const j of blockAtoms[i].bonds) if (j > i && id.has(j)) bonds.push([id.get(i), id.get(j)]);
    // one substructure per molecule; everything that is not a molecule goes into the first one
    const sub1 = new Map();
    let nsub = 1;
    const subOf = (a) => {
      if (a.group < 0) return 1;
      if (!sub1.has(a.group)) sub1.set(a.group, ++nsub);
      return sub1.get(a.group);
    };
    const pad = (v, w) => String(v).padStart(w);
    const atomLines = rows.map((i) => {
      const a = blockAtoms[i];
      const k = subOf(a);
      const nm = String(a.label).replace(/\s+/g, '_').slice(0, 8);
      return pad(id.get(i), 7) + ' ' + nm.padEnd(8) + ' ' + a.xyz.map((x) => pad(x.toFixed(4), 10)).join(' ') + ' ' +
        sybylType(a.el, a.bonds.length).padEnd(5) + ' ' + pad(k, 4) + ' ' + (k === 1 ? 'FRAME' : 'MOL' + (k - 1)).padEnd(8) + '  0.0000';
    });
    const clean = String(name || 'structure').replace(/[\r\n]+/g, ' ');
    return ['@<TRIPOS>MOLECULE', clean, pad(rows.length, 5) + pad(bonds.length, 6) + pad(nsub, 6) + '     0     0', 'SMALL', 'NO_CHARGES', '',
      '@<TRIPOS>ATOM'].concat(atomLines, ['@<TRIPOS>BOND'],
      bonds.map((b, k) => pad(k + 1, 6) + pad(b[0], 6) + pad(b[1], 6) + ' 1'),
      ['@<TRIPOS>CRYSIN', [cell.a, cell.b, cell.c].map((x) => pad(x.toFixed(4), 10)).join('') + [cell.al, cell.be, cell.ga].map((x) => pad(x.toFixed(3), 10)).join('') + '     1     1', '']).join('\n');
  }

  /* ---------- export: vector drawing (SVG) ----------
     A list of 3D items is projected with the same orthographic view as the screen and written back
     to front (painter's algorithm), so every atom, bond and face stays a separate editable object.
     Objects that pass through each other are approximated: a vector file has no depth buffer.

     scene = { width, height, M: [[3],[3]], b: [2], background, shaded, font, items }
       M, b: screen = M p + b, in pixels, y down. The scale (pixels per angstrom) is |M[0]|.
     items:
       { t: 'atom', p, r, color, el, opacity }           sphere of radius r (angstrom)
       { t: 'bond', p, q, r, color, color2 }             one half of a stick, radius r (angstrom); fades to color2 at q
       { t: 'face', pts, color, opacity, cls, edge, edgeColor }   flat polygon; edge = outline width in pixels
       { t: 'line', p, q, w, color, dash, cls, opacity } line of width w (pixels)
       { t: 'arrow', p, q, r, color }                    arrow from p to q, shaft radius r (angstrom)
       { t: 'text', p, text, size, color, bg, cls }      label, always drawn on top                */
  const hexRgb = (h) => { const v = parseInt(String(h).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const rgbHex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const shade = (h, k) => { const c = hexRgb(h); return rgbHex(k >= 0 ? c.map((x) => x + (255 - x) * k) : c.map((x) => x * (1 + k))); };
  const xml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* coplanar triangles of a convex hull joined into one polygon per face, corners in order */
  function hullPolygons(points) {
    const groups = [];
    for (const f of hullFaces(points)) {
      const d = dot(f.n, points[f.v[0]]);
      let g = groups.find((x) => dot(x.n, f.n) > 0.999 && Math.abs(x.d - d) < 0.05);
      if (!g) { g = { n: f.n, d, idx: new Set() }; groups.push(g); }
      for (const k of f.v) g.idx.add(k);
    }
    // a flat set gives the same polygon twice, once for each side: keep one
    if (groups.length === 2 && dot(groups[0].n, groups[1].n) < -0.999) groups.pop();
    return groups.map((g) => {
      const idx = Array.from(g.idx);
      let cen = [0, 0, 0];
      for (const k of idx) cen = add(cen, points[k]);
      cen = cen.map((x) => x / idx.length);
      let e1 = sub(points[idx[0]], cen);
      e1 = e1.map((x) => x / norm(e1));
      const e2 = cross(g.n, e1);
      idx.sort((p, q) => Math.atan2(dot(sub(points[p], cen), e2), dot(sub(points[p], cen), e1)) - Math.atan2(dot(sub(points[q], cen), e2), dot(sub(points[q], cen), e1)));
      return idx;
    });
  }
  /* ---- convex polygons in the plane of the drawing, used to cut see-through faces where a nearer one covers them ---- */
  const area2d = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  /* the part of a convex polygon on one side of the line a -> b: side +1 is the left, -1 the right */
  function cutPolygon(poly, a, b, side) {
    const out = [];
    const dist = (p) => side * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const dp = dist(p), dq = dist(q);
      if (dp >= 0) out.push(p);
      if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
  /* both polygons counter-clockwise (positive area2d) */
  function intersectConvex(f, g) {
    let r = f;
    for (let i = 0; i < g.length && r.length >= 3; i++) r = cutPolygon(r, g[i], g[(i + 1) % g.length], 1);
    return r.length >= 3 ? r : [];
  }
  /* f without g, as convex pieces */
  function subtractConvex(f, g, minArea) {
    const out = [];
    let r = f;
    for (let i = 0; i < g.length && r.length >= 3; i++) {
      const a = g[i], b = g[(i + 1) % g.length];
      const outside = cutPolygon(r, a, b, -1);
      if (outside.length >= 3 && Math.abs(area2d(outside)) > minArea) out.push(outside);
      r = cutPolygon(r, a, b, 1);
    }
    return out;
  }
  /* For see-through faces of which only the nearest is seen (as a 3D viewer with one see-through layer shows them):
     the parts of each face that no nearer face covers. faces: [{ pts: [[x, y, depth], ...] }], convex, depth growing
     towards the eye. Returns, per face, null when the whole face is seen, or its visible convex pieces (maybe none). */
  function visibleParts(faces, minArea) {
    const eps = minArea === undefined ? 0.05 : minArea;
    const shapes = faces.map((f) => {
      let q = f.pts.map((p) => [p[0], p[1]]);
      const A = area2d(q);
      if (A < 0) q = q.slice().reverse();
      // depth as a plane over the drawing, from the three vertices that span the largest triangle with the first edge
      const p0 = f.pts[0];
      let best = null, bd = 0;
      for (let i = 1; i + 1 < f.pts.length; i++) {
        const u = f.pts[i], v = f.pts[i + 1];
        const det = (u[0] - p0[0]) * (v[1] - p0[1]) - (v[0] - p0[0]) * (u[1] - p0[1]);
        if (Math.abs(det) > Math.abs(bd)) { bd = det; best = [u, v]; }
      }
      let plane = null;
      if (best && Math.abs(bd) > 1e-9) {
        const [u, v] = best;
        const ax = ((u[2] - p0[2]) * (v[1] - p0[1]) - (v[2] - p0[2]) * (u[1] - p0[1])) / bd;
        const ay = ((u[0] - p0[0]) * (v[2] - p0[2]) - (v[0] - p0[0]) * (u[2] - p0[2])) / bd;
        plane = (x, y) => p0[2] + ax * (x - p0[0]) + ay * (y - p0[1]);
      }
      const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      return { q, area: Math.abs(A), plane, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    });
    return shapes.map((F, i) => {
      if (!F.plane || F.area <= eps) return null;
      let pieces = null;
      for (let j = 0; j < shapes.length; j++) {
        const G = shapes[j];
        if (j === i || !G.plane || G.area <= eps || G.x1 <= F.x0 || G.x0 >= F.x1 || G.y1 <= F.y0 || G.y0 >= F.y1) continue;
        const I = intersectConvex(F.q, G.q);
        if (I.length < 3 || Math.abs(area2d(I)) <= eps) continue;
        let cx = 0, cy = 0;
        for (const p of I) { cx += p[0] / I.length; cy += p[1] / I.length; }
        const dz = G.plane(cx, cy) - F.plane(cx, cy);
        // the nearer face covers; of two faces at the same depth the earlier one is kept
        if (!(dz > 1e-7 || (Math.abs(dz) <= 1e-7 && j < i))) continue;
        pieces = (pieces || [F.q]).flatMap((pc) => subtractConvex(pc, G.q, eps));
        if (!pieces.length) break;
      }
      return pieces;
    });
  }

  function toSvg(scene) {
    const { M, b, width, height } = scene;
    const scale = norm(M[0]);
    // the viewing direction, pointing at the viewer: screen right x screen up
    let zdir = cross(M[0], M[1].map((x) => -x));
    zdir = zdir.map((x) => x / norm(zdir));
    const P = (p) => [dot(M[0], p) + b[0], dot(M[1], p) + b[1]];
    const depth = (p) => dot(zdir, p);
    const n2 = (x) => (Math.round(x * 100) / 100).toString();
    const pt = (p) => { const s = P(p); return n2(s[0]) + ',' + n2(s[1]); };
    const midp = (p, q, k) => [0, 1, 2].map((i) => p[i] + (q[i] - p[i]) * k);
    const font = scene.font || 'Helvetica, Arial, sans-serif';
    const grads = new Map();
    const bondGrads = [];
    const body = [];
    const top = [];
    // see-through faces of which only the nearest is seen: what is left of each after the nearer ones are cut away
    const nearest = scene.items.filter((it) => it.t === 'face' && it.nearest);
    const parts = new Map();
    visibleParts(nearest.map((it) => ({ pts: it.pts.map((p) => { const s = P(p); return [s[0], s[1], depth(p)]; }) }))).forEach((v, i) => parts.set(nearest[i], v));
    for (const it of scene.items) {
      if (it.t === 'atom') {
        const s = P(it.p);
        let fill = it.color;
        if (scene.shaded) {
          const id = 'g' + String(it.color).replace('#', '');
          if (!grads.has(id)) grads.set(id, it.color);
          fill = 'url(#' + id + ')';
        }
        body.push({ z: depth(it.p), s: '<circle class="atom' + (it.el ? ' ' + xml(it.el) : '') + '" cx="' + n2(s[0]) + '" cy="' + n2(s[1]) + '" r="' + n2(it.r * scale) +
          '" fill="' + fill + '" stroke="' + shade(it.color, -0.55) + '" stroke-width="' + n2(Math.max(0.4, 0.02 * scale)) + '"' +
          (it.opacity !== undefined && it.opacity < 1 ? ' fill-opacity="' + n2(it.opacity) + '" stroke-opacity="' + n2(it.opacity) + '"' : '') + '/>' });
      } else if (it.t === 'bond') {
        const s = P(it.p), e = P(it.q);
        const w = 2 * it.r * scale;
        const xy = 'x1="' + n2(s[0]) + '" y1="' + n2(s[1]) + '" x2="' + n2(e[0]) + '" y2="' + n2(e[1]) + '"';
        // with a second colour the stick fades from one to the other along its length
        let paint = it.color;
        if (it.color2 && it.color2 !== it.color) {
          const id = 'b' + (bondGrads.length + 1);
          bondGrads.push('<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + n2(s[0]) + '" y1="' + n2(s[1]) + '" x2="' + n2(e[0]) + '" y2="' + n2(e[1]) +
            '"><stop offset="0" stop-color="' + it.color + '"/><stop offset="1" stop-color="' + it.color2 + '"/></linearGradient>');
          paint = 'url(#' + id + ')';
        }
        // a dark line under a slightly thinner coloured one gives the stick its outline
        body.push({ z: depth(midp(it.p, it.q, 0.5)), s: '<g class="bond"' + (it.opacity !== undefined && it.opacity < 1 ? ' opacity="' + n2(it.opacity) + '"' : '') + '><line ' + xy + ' stroke="' + shade(it.color, -0.55) + '" stroke-width="' + n2(w + Math.max(0.6, 0.03 * scale)) + '"/>' +
          '<line ' + xy + ' stroke="' + paint + '" stroke-width="' + n2(w) + '"/></g>' });
      } else if (it.t === 'face') {
        let z = 0;
        for (const p of it.pts) z += depth(p);
        z /= it.pts.length;
        const cls = xml(it.cls || 'face');
        const paint = 'fill="' + it.color + '" fill-opacity="' + (it.opacity === undefined ? 0.45 : it.opacity) + '"';
        if (it.nearest) {
          // no outline; cut where a nearer face covers it. The pieces go into one path, so no seams show between them.
          const pieces = parts.get(it);
          if (!pieces) body.push({ z, s: '<polygon class="' + cls + '" points="' + it.pts.map(pt).join(' ') + '" ' + paint + ' stroke="none"/>' });
          else if (pieces.length) body.push({ z, s: '<path class="' + cls + '" d="' + pieces.map((pc) => 'M' + pc.map((q) => n2(q[0]) + ',' + n2(q[1])).join('L') + 'Z').join('') + '" ' + paint + ' stroke="none"/>' });
          // edges are solid lines on the screen and are seen through nearer faces, so the whole outline is drawn
          if (it.edge) body.push({ z, s: '<polygon class="' + cls + '-edge" points="' + it.pts.map(pt).join(' ') + '" fill="none" stroke="' + (it.edgeColor || shade(it.color, -0.35)) + '" stroke-width="' + n2(it.edge) + '" stroke-linejoin="round"/>' });
        } else {
          body.push({ z, s: '<polygon class="' + cls + '" points="' + it.pts.map(pt).join(' ') + '" ' + paint +
            ' stroke="' + (it.edgeColor || shade(it.color, -0.35)) + '" stroke-opacity="' + (it.edge ? 1 : 0.7) + '" stroke-width="' + n2(it.edge || Math.max(0.4, 0.015 * scale)) + '" stroke-linejoin="round"/>' });
        }
      } else if (it.t === 'line') {
        const s = P(it.p), e = P(it.q);
        body.push({ z: depth(midp(it.p, it.q, 0.5)), s: '<line class="' + xml(it.cls || 'line') + '" x1="' + n2(s[0]) + '" y1="' + n2(s[1]) + '" x2="' + n2(e[0]) + '" y2="' + n2(e[1]) + '" stroke="' + it.color +
          '" stroke-width="' + n2(it.w) + '" stroke-linecap="round"' + (it.dash ? ' stroke-dasharray="' + it.dash.map(n2).join(' ') + '"' : '') +
          (it.opacity !== undefined && it.opacity < 1 ? ' stroke-opacity="' + n2(it.opacity) + '"' : '') + '/>' });
      } else if (it.t === 'arrow') {
        const s = P(it.p), e = P(it.q);
        const len = Math.hypot(e[0] - s[0], e[1] - s[1]);
        const w = 2 * it.r * scale;
        if (len < 1e-6) continue;   // seen end-on: nothing to draw
        const ux = (e[0] - s[0]) / len, uy = (e[1] - s[1]) / len;
        const head = Math.min(len, 3 * w);
        const nx = e[0] - ux * head, ny = e[1] - uy * head;
        body.push({ z: depth(midp(it.p, it.q, 0.5)), s: '<g class="arrow"><line x1="' + n2(s[0]) + '" y1="' + n2(s[1]) + '" x2="' + n2(nx) + '" y2="' + n2(ny) + '" stroke="' + it.color + '" stroke-width="' + n2(w) + '"/>' +
          '<polygon points="' + n2(e[0]) + ',' + n2(e[1]) + ' ' + n2(nx - uy * w * 1.1) + ',' + n2(ny + ux * w * 1.1) + ' ' + n2(nx + uy * w * 1.1) + ',' + n2(ny - ux * w * 1.1) + '" fill="' + it.color + '"/></g>' });
      } else if (it.t === 'text') {
        const s = P(it.p);
        const size = it.size || 12;
        const txt = '<text x="' + n2(s[0]) + '" y="' + n2(s[1]) + '" font-size="' + n2(size) + '" fill="' + it.color + '" text-anchor="middle" dominant-baseline="central">' + xml(it.text) + '</text>';
        if (it.bg) {
          const w = String(it.text).length * size * 0.62 + size * 0.6, h = size * 1.35;
          top.push('<g class="' + xml(it.cls || 'label') + '"><rect x="' + n2(s[0] - w / 2) + '" y="' + n2(s[1] - h / 2) + '" width="' + n2(w) + '" height="' + n2(h) + '" rx="' + n2(size * 0.2) + '" fill="' + it.bg + '" fill-opacity="' + (it.bgOpacity === undefined ? 0.85 : it.bgOpacity) + '"/>' + txt + '</g>');
        } else top.push('<g class="' + xml(it.cls || 'label') + '">' + txt + '</g>');
      }
    }
    // far objects first; equal depths keep the order they were given in
    body.forEach((o, i) => { o.i = i; });
    body.sort((p, q) => (p.z - q.z) || (p.i - q.i));
    const defs = Array.from(grads.entries()).map(([id, c]) =>
      '<radialGradient id="' + id + '" cx="0.36" cy="0.32" r="0.72"><stop offset="0" stop-color="' + shade(c, 0.62) + '"/><stop offset="0.45" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -0.38) + '"/></radialGradient>');
    return ['<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + n2(width) + '" height="' + n2(height) + '" viewBox="0 0 ' + n2(width) + ' ' + n2(height) + '" font-family="' + xml(font) + '">',
      scene.title ? '<title>' + xml(scene.title) + '</title>' : '',
      defs.length || bondGrads.length ? '<defs>' + defs.join('') + bondGrads.join('') + '</defs>' : '',
      scene.background ? '<rect class="background" width="100%" height="100%" fill="' + scene.background + '"/>' : '',
      '<g class="structure" stroke-linecap="butt">'].concat(body.map((o) => o.s), ['</g>', '<g class="labels">'], top, ['</g>', '</svg>', '']).filter((l) => l !== '').join('\n') + '\n';
  }

  /* one tube per bond as a mesh with a colour at each end, so the graphics card blends them along the bond.
     bonds: [{ p, q, rp, rq, cp: [r, g, b], cq: [r, g, b] }] with colours 0 to 1. Returns vertex, normal,
     colour and face arrays in chunks that stay below the vertex limit of one mesh. */
  function bondTubes(bonds, sides, maxVerts) {
    const n = sides || 10;
    const cap = maxVerts || 60000;
    const out = [];
    let cur = null;
    for (const bd of bonds) {
      let u = sub(bd.q, bd.p);
      const len = norm(u);
      if (len < 1e-6) continue;
      u = u.map((x) => x / len);
      let e1 = cross(u, Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
      e1 = e1.map((x) => x / norm(e1));
      const e2 = cross(u, e1);
      if (!cur || cur.vertexArr.length + 2 * n > cap) { cur = { vertexArr: [], normalArr: [], colorArr: [], faceArr: [] }; out.push(cur); }
      const base = cur.vertexArr.length;
      for (let k = 0; k < n; k++) {
        const th = 2 * Math.PI * k / n;
        const r = [0, 1, 2].map((i) => Math.cos(th) * e1[i] + Math.sin(th) * e2[i]);
        cur.vertexArr.push([0, 1, 2].map((i) => bd.p[i] + bd.rp * r[i]), [0, 1, 2].map((i) => bd.q[i] + bd.rq * r[i]));
        cur.normalArr.push(r, r);
        cur.colorArr.push(bd.cp, bd.cq);
        const a0 = base + 2 * k, b0 = a0 + 1, a1 = base + 2 * ((k + 1) % n), b1 = a1 + 1;
        cur.faceArr.push(a0, a1, b0, a1, b1, b0);
      }
    }
    return out;
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
      if (!pos && !neg) {
        // every point lies in this plane (a triangle, a square): the face is seen from both sides
        faces.push({ v: [i, j, k], n: nrm }, { v: [i, k, j], n: nrm.map((x) => -x) });
        continue;
      }
      const outward = dot(nrm, sub(points[i], cen)) >= 0;
      faces.push(outward ? { v: [i, j, k], n: nrm } : { v: [i, k, j], n: nrm.map((x) => -x) });
    }
    return faces;
  }

  /* ---------- powder X-ray diffraction ----------
     A simulated pattern from a structure: every reflection in a 2-theta range with its d spacing, structure
     factor, multiplicity and intensity, and a profile on a 2-theta grid. The definitions are in the README. */

  /* X-ray scattering factors of the neutral atoms: f0(s) = sum of a_i exp(-b_i s^2) + c with s = sin(theta)/lambda,
     listed as [a1, b1, a2, b2, a3, b3, a4, b4, c]. International Tables for Crystallography vol. C (1992),
     table 6.1.1.4; H is the bonded atom of Stewart, Davidson and Simpson. Values as tabulated in gemmi 0.7. */
  const XRAY_F0 = { H: [0.493, 10.5109, 0.3229, 26.1257, 0.1402, 3.1424, 0.0408, 57.7997, 0.003], He: [0.8734, 9.1037, 0.6309, 3.3568, 0.3112, 22.9276, 0.178, 0.9821, 0.0064], Li: [1.1282, 3.9546, 0.7508, 1.0524, 0.6175, 85.3905, 0.4653, 168.261, 0.0377], Be: [1.5919, 43.6427, 1.1278, 1.8623, 0.5391, 103.483, 0.7029, 0.542, 0.0385], B: [2.0545, 23.2185, 1.3326, 1.021, 1.0979, 60.3498, 0.7068, 0.1403, -0.1932], C: [2.31, 20.8439, 1.02, 10.2075, 1.5886, 0.5687, 0.865, 51.6512, 0.2156], N: [12.2126, 0.0057, 3.1322, 9.8933, 2.0125, 28.9975, 1.1663, 0.5826, -11.529], O: [3.0485, 13.2771, 2.2868, 5.7011, 1.5463, 0.3239, 0.867, 32.9089, 0.2508], F: [3.5392, 10.2825, 2.6412, 4.2944, 1.517, 0.2615, 1.0243, 26.1476, 0.2776], Ne: [3.9553, 8.4042, 3.1125, 3.4262, 1.4546, 0.2306, 1.1251, 21.7184, 0.3515], Na: [4.7626, 3.285, 3.1736, 8.8422, 1.2674, 0.3136, 1.1128, 129.424, 0.676], Mg: [5.4204, 2.8275, 2.1735, 79.2611, 1.2269, 0.3808, 2.3073, 7.1937, 0.8584], Al: [6.4202, 3.0387, 1.9002, 0.7426, 1.5936, 31.5472, 1.9646, 85.0886, 1.1151], Si: [6.2915, 2.4386, 3.0353, 32.3337, 1.9891, 0.6785, 1.541, 81.6937, 1.1407], P: [6.4345, 1.9067, 4.1791, 27.157, 1.78, 0.526, 1.4908, 68.1645, 1.1149], S: [6.9053, 1.4679, 5.2034, 22.2151, 1.4379, 0.2536, 1.5863, 56.172, 0.8669], Cl: [11.4604, 0.0104, 7.1964, 1.1662, 6.2556, 18.5194, 1.6455, 47.7784, -9.5574], Ar: [7.4845, 0.9072, 6.7723, 14.8407, 0.6539, 43.8983, 1.6442, 33.3929, 1.4445], K: [8.2186, 12.7949, 7.4398, 0.7748, 1.0519, 213.187, 0.8659, 41.6841, 1.4228], Ca: [8.6266, 10.4421, 7.3873, 0.6599, 1.5899, 85.7484, 1.0211, 178.437, 1.3751], Sc: [9.189, 9.0213, 7.3679, 0.5729, 1.6409, 136.108, 1.468, 51.3531, 1.3329], Ti: [9.7595, 7.8508, 7.3558, 0.5, 1.6991, 35.6338, 1.9021, 116.105, 1.2807], V: [10.2971, 6.8657, 7.3511, 0.4385, 2.0703, 26.8938, 2.0571, 102.478, 1.2199], Cr: [10.6406, 6.1038, 7.3537, 0.392, 3.324, 20.2626, 1.4922, 98.7399, 1.1832], Mn: [11.2819, 5.3409, 7.3573, 0.3432, 3.0193, 17.8674, 2.2441, 83.7543, 1.0896], Fe: [11.7695, 4.7611, 7.3573, 0.3072, 3.5222, 15.3535, 2.3045, 76.8805, 1.0369], Co: [12.2841, 4.2791, 7.3409, 0.2784, 4.0034, 13.5359, 2.3488, 71.1692, 1.0118], Ni: [12.8376, 3.8785, 7.292, 0.2565, 4.4438, 12.1763, 2.38, 66.3421, 1.0341], Cu: [13.338, 3.5828, 7.1676, 0.247, 5.6158, 11.3966, 1.6735, 64.8126, 1.191], Zn: [14.0743, 3.2655, 7.0318, 0.2333, 5.1652, 10.3163, 2.41, 58.7097, 1.3041], Ga: [15.2354, 3.0669, 6.7006, 0.2412, 4.3591, 10.7805, 2.9623, 61.4135, 1.7189], Ge: [16.0816, 2.8509, 6.3747, 0.2516, 3.7068, 11.4468, 3.683, 54.7625, 2.1313], As: [16.6723, 2.6345, 6.0701, 0.2647, 3.4313, 12.9479, 4.2779, 47.7972, 2.531], Se: [17.0006, 2.4098, 5.8196, 0.2726, 3.9731, 15.2372, 4.3543, 43.8163, 2.8409], Br: [17.1789, 2.1723, 5.2358, 16.5796, 5.6377, 0.2609, 3.9851, 41.4328, 2.9557], Kr: [17.3555, 1.9384, 6.7286, 16.5623, 5.5493, 0.2261, 3.5375, 39.3972, 2.825], Rb: [17.1784, 1.7888, 9.6435, 17.3151, 5.1399, 0.2748, 1.5292, 164.934, 3.4873], Sr: [17.5663, 1.5564, 9.8184, 14.0988, 5.422, 0.1664, 2.6694, 132.376, 2.5064], Y: [17.776, 1.4029, 10.2946, 12.8006, 5.7263, 0.1256, 3.2659, 104.354, 1.9121], Zr: [17.8765, 1.2762, 10.948, 11.916, 5.4173, 0.1176, 3.6572, 87.6627, 2.0693], Nb: [17.6142, 1.1887, 12.0144, 11.766, 4.0418, 0.2048, 3.5335, 69.7957, 3.7559], Mo: [3.7025, 0.2772, 17.2356, 1.0958, 12.8876, 11.004, 3.7429, 61.6584, 4.3875], Tc: [19.1301, 0.8641, 11.0948, 8.1449, 4.649, 21.5707, 2.7126, 86.8472, 5.4043], Ru: [19.2674, 0.8085, 12.9182, 8.4347, 4.8634, 24.7997, 1.5676, 94.2928, 5.3787], Rh: [19.2957, 0.7515, 14.3501, 8.2176, 4.7343, 25.8749, 1.2892, 98.6062, 5.328], Pd: [19.3319, 0.6987, 15.5017, 7.9893, 5.2954, 25.2052, 0.6058, 76.8986, 5.2659], Ag: [19.2808, 0.6446, 16.6885, 7.4726, 4.8045, 24.6605, 1.0463, 99.8156, 5.179], Cd: [19.2214, 0.5946, 17.6444, 6.9089, 4.461, 24.7008, 1.6029, 87.4825, 5.0694], In: [19.1624, 0.5476, 18.5596, 6.3776, 4.2948, 25.8499, 2.0396, 92.8029, 4.9391], Sn: [19.1889, 5.8303, 19.1005, 0.5031, 4.4585, 26.8909, 2.4663, 83.9571, 4.7821], Sb: [19.6418, 5.3034, 19.0455, 0.4607, 5.0371, 27.9074, 2.6827, 75.2825, 4.5909], Te: [19.9644, 4.8174, 19.0138, 0.4209, 6.1449, 28.5284, 2.5239, 70.8403, 4.352], I: [20.1472, 4.347, 18.9949, 0.3814, 7.5138, 27.766, 2.2735, 66.8776, 4.0712], Xe: [20.2933, 3.9282, 19.0298, 0.344, 8.9767, 26.4659, 1.99, 64.2658, 3.7118], Cs: [20.3892, 3.569, 19.1062, 0.3107, 10.662, 24.3879, 1.4953, 213.904, 3.3352], Ba: [20.3361, 3.216, 19.297, 0.2756, 10.888, 20.2073, 2.6959, 167.202, 2.7731], La: [20.578, 2.9482, 19.599, 0.2445, 11.3727, 18.7726, 3.2872, 133.124, 2.1468], Ce: [21.1671, 2.8122, 19.7695, 0.2268, 11.8513, 17.6083, 3.3305, 127.113, 1.8626], Pr: [22.044, 2.7739, 19.6697, 0.2221, 12.3856, 16.7669, 2.8243, 143.644, 2.0583], Nd: [22.6845, 2.6625, 19.6847, 0.2106, 12.774, 15.885, 2.8514, 137.903, 1.9849], Pm: [23.3405, 2.5627, 19.6095, 0.2021, 13.1235, 15.1009, 2.8752, 132.721, 2.0288], Sm: [24.0042, 2.4727, 19.4258, 0.1965, 13.4396, 14.3996, 2.896, 128.007, 2.2096], Eu: [24.6274, 2.3879, 19.0886, 0.1942, 13.7603, 13.7546, 2.9227, 123.174, 2.5745], Gd: [25.0709, 2.2534, 19.0798, 0.182, 13.8518, 12.9331, 3.5454, 101.398, 2.4196], Tb: [25.8976, 2.2426, 18.2185, 0.1961, 14.3167, 12.6648, 2.9535, 115.362, 3.5832], Dy: [26.507, 2.1802, 17.6383, 0.2022, 14.5596, 12.1899, 2.9658, 111.874, 4.2973], Ho: [26.9049, 2.0705, 17.294, 0.1979, 14.5583, 11.4407, 3.6384, 92.6566, 4.568], Er: [27.6563, 2.0736, 16.4285, 0.2235, 14.9779, 11.3604, 2.9823, 105.703, 5.9205], Tm: [28.1819, 2.0286, 15.8851, 0.2388, 15.1542, 10.9975, 2.9871, 102.961, 6.7562], Yb: [28.6641, 1.9889, 15.4345, 0.2571, 15.3087, 10.6647, 2.9896, 100.417, 7.5667], Lu: [28.9476, 1.9018, 15.2208, 9.9852, 15.1, 0.261, 3.716, 84.3298, 7.9763], Hf: [29.144, 1.8326, 15.1726, 9.5999, 14.7586, 0.2751, 4.3001, 72.029, 8.5815], Ta: [29.2024, 1.7733, 15.2293, 9.3705, 14.5135, 0.296, 4.7649, 63.3644, 9.2435], W: [29.0818, 1.7203, 15.43, 9.2259, 14.4327, 0.3217, 5.1198, 57.056, 9.8875], Re: [28.7621, 1.6719, 15.7189, 9.0923, 14.5564, 0.3505, 5.4417, 52.0861, 10.472], Os: [28.1894, 1.629, 16.155, 8.9795, 14.9305, 0.3827, 5.6759, 48.1647, 11.0005], Ir: [27.3049, 1.5928, 16.7296, 8.8655, 15.6115, 0.4179, 5.8338, 45.0011, 11.4722], Pt: [27.0059, 1.5129, 17.7639, 8.8117, 15.7131, 0.4246, 5.7837, 38.6103, 11.6883], Au: [16.8819, 0.4611, 18.5913, 8.6216, 25.5582, 1.4826, 5.86, 36.3956, 12.0658], Hg: [20.6809, 0.545, 19.0417, 8.4484, 21.6575, 1.5729, 5.9676, 38.3246, 12.6089], Tl: [27.5446, 0.6551, 19.1584, 8.7075, 15.538, 1.9635, 5.5259, 45.8149, 13.1746], Pb: [31.0617, 0.6902, 13.0637, 2.3576, 18.442, 8.618, 5.9696, 47.2579, 13.4118], Bi: [33.3689, 0.704, 12.951, 2.9238, 16.5877, 8.7937, 6.4692, 48.0093, 13.5782], Po: [34.6726, 0.701, 15.4733, 3.5508, 13.1138, 9.5564, 7.0259, 47.0045, 13.677], At: [35.3163, 0.6859, 19.0211, 3.9746, 9.4989, 11.3824, 7.4252, 45.4715, 13.7108], Rn: [35.5631, 0.6631, 21.2816, 4.0691, 8.0037, 14.0422, 7.4433, 44.2473, 13.6905], Fr: [35.9299, 0.6465, 23.0547, 4.1762, 12.1439, 23.1052, 2.1125, 150.645, 13.7247], Ra: [35.763, 0.6163, 22.9064, 3.8714, 12.4739, 19.9887, 3.211, 142.325, 13.6211], Ac: [35.6597, 0.5891, 23.1032, 3.6516, 12.5977, 18.599, 4.0866, 117.02, 13.5266], Th: [35.5645, 0.5634, 23.4219, 3.462, 12.7473, 17.8309, 4.807, 99.1722, 13.4314], Pa: [35.8847, 0.5478, 23.2948, 3.4152, 14.1891, 16.9235, 4.1729, 105.251, 13.4287], U: [36.0228, 0.5293, 23.4128, 3.3253, 14.9491, 16.0927, 4.188, 100.613, 13.3966], Np: [36.1874, 0.5119, 23.5964, 3.254, 15.6402, 15.3622, 4.1855, 97.4908, 13.3573], Pu: [36.5254, 0.4994, 23.8083, 3.2637, 16.7707, 14.9455, 3.4795, 105.98, 13.3812], Am: [36.6706, 0.4836, 24.0992, 3.2065, 17.3415, 14.3136, 3.4933, 102.273, 13.3592], Cm: [36.6488, 0.4652, 24.4096, 3.09, 17.399, 13.4346, 4.2167, 88.4834, 13.2887] };
  const XRAY_DISP = {
    Cu: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.001, 0.0], Be: [0.003, 0.001], B: [0.009, 0.004], C: [0.018, 0.009], N: [0.031, 0.018], O: [0.049, 0.032], F: [0.073, 0.053], Ne: [0.101, 0.083], Na: [0.136, 0.124], Mg: [0.173, 0.177], Al: [0.213, 0.246], Si: [0.255, 0.33], P: [0.296, 0.433], S: [0.333, 0.557], Cl: [0.364, 0.702], Ar: [0.379, 0.872], K: [0.388, 1.066], Ca: [0.365, 1.285], Sc: [0.313, 1.533], Ti: [0.22, 1.807], V: [0.07, 2.11], Cr: [-0.162, 2.444], Mn: [-0.529, 2.805], Fe: [-1.131, 3.197], Co: [-2.362, 3.614], Ni: [-3.0, 0.509], Cu: [-1.962, 0.589], Zn: [-1.546, 0.678], Ga: [-1.28, 0.776], Ge: [-1.084, 0.886], As: [-0.925, 1.005], Se: [-0.788, 1.137], Br: [-0.67, 1.28], Kr: [-0.559, 1.438], Rb: [-0.46, 1.608], Sr: [-0.344, 1.82], Y: [-0.257, 2.024], Zr: [-0.176, 2.244], Nb: [-0.101, 2.482], Mo: [-0.036, 2.734], Tc: [0.02, 3.004], Ru: [0.07, 3.295], Rh: [0.109, 3.603], Pd: [0.139, 3.932], Ag: [0.15, 4.281], Cd: [0.14, 4.652], In: [0.103, 5.044], Sn: [0.048, 5.458], Sb: [-0.034, 5.893], Te: [-0.152, 6.351], I: [-0.298, 6.834], Xe: [-0.489, 7.347], Cs: [-0.713, 7.902], Ba: [-1.011, 8.459], La: [-1.377, 9.034], Ce: [-2.085, 9.653], Pr: [-2.363, 10.281], Nd: [-3.05, 10.931], Pm: [-3.958, 11.611], Sm: [-5.256, 12.309], Eu: [-8.931, 11.271], Gd: [-8.809, 11.987], Tb: [-9.174, 9.232], Dy: [-9.727, 9.853], Ho: [-14.922, 3.703], Er: [-9.37, 3.936], Tm: [-7.97, 4.18], Yb: [-7.138, 4.431], Lu: [-6.541, 4.691], Hf: [-6.099, 4.975], Ta: [-5.711, 5.269], W: [-5.386, 5.575], Re: [-5.117, 5.889], Os: [-4.885, 6.218], Ir: [-4.671, 6.562], Pt: [-4.487, 6.922], Au: [-4.308, 7.293], Hg: [-4.175, 7.682], Tl: [-4.039, 8.085], Pb: [-3.948, 8.501], Bi: [-3.125, 8.926], Po: [-3.834, 9.378], At: [-3.815, 9.839], Rn: [-3.802, 10.313], Fr: [-3.816, 10.798], Ra: [-3.848, 11.291], Ac: [-3.911, 11.793], Th: [-3.976, 12.323], Pa: [-4.067, 12.862], U: [-4.175, 13.402], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] },
    Mo: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.0, 0.0], Be: [0.0, 0.0], B: [0.002, 0.001], C: [0.003, 0.002], N: [0.006, 0.003], O: [0.011, 0.006], F: [0.018, 0.01], Ne: [0.026, 0.016], Na: [0.037, 0.025], Mg: [0.049, 0.036], Al: [0.064, 0.051], Si: [0.082, 0.07], P: [0.102, 0.094], S: [0.125, 0.123], Cl: [0.149, 0.158], Ar: [0.175, 0.2], K: [0.202, 0.249], Ca: [0.227, 0.306], Sc: [0.253, 0.372], Ti: [0.279, 0.446], V: [0.302, 0.529], Cr: [0.323, 0.624], Mn: [0.338, 0.728], Fe: [0.349, 0.844], Co: [0.352, 0.972], Ni: [0.342, 1.112], Cu: [0.323, 1.265], Zn: [0.287, 1.43], Ga: [0.235, 1.608], Ge: [0.159, 1.8], As: [0.055, 2.006], Se: [-0.087, 2.226], Br: [-0.284, 2.46], Kr: [-0.55, 2.708], Rb: [-0.931, 2.968], Sr: [-1.522, 3.25], Y: [-2.787, 3.567], Zr: [-2.956, 0.558], Nb: [-2.06, 0.619], Mo: [-1.671, 0.686], Tc: [-1.424, 0.757], Ru: [-1.242, 0.834], Rh: [-1.099, 0.917], Pd: [-0.979, 1.005], Ag: [-0.875, 1.1], Cd: [-0.783, 1.201], In: [-0.704, 1.309], Sn: [-0.63, 1.424], Sb: [-0.563, 1.545], Te: [-0.506, 1.674], I: [-0.446, 1.81], Xe: [-0.393, 1.956], Cs: [-0.338, 2.117], Ba: [-0.289, 2.279], La: [-0.252, 2.449], Ce: [-0.13, 2.628], Pr: [-0.178, 2.817], Nd: [-0.151, 3.013], Pm: [-0.13, 3.22], Sm: [-0.115, 3.437], Eu: [-0.105, 3.663], Gd: [-0.108, 3.899], Tb: [-0.111, 4.149], Dy: [-0.126, 4.405], Ho: [-0.155, 4.674], Er: [-0.192, 4.953], Tm: [-0.243, 5.243], Yb: [-0.313, 5.543], Lu: [-0.395, 5.851], Hf: [-0.502, 6.178], Ta: [-0.619, 6.515], W: [-0.758, 6.865], Re: [-0.922, 7.224], Os: [-1.115, 7.596], Ir: [-1.337, 7.983], Pt: [-1.601, 8.382], Au: [-1.896, 8.792], Hg: [-2.268, 9.217], Tl: [-2.708, 9.656], Pb: [-3.257, 10.105], Bi: [-3.966, 10.566], Po: [-4.983, 11.042], At: [-7.761, 9.967], Rn: [-7.927, 10.439], Fr: [-7.072, 7.759], Ra: [-6.606, 8.119], Ac: [-6.668, 8.493], Th: [-7.048, 8.88], Pa: [-7.86, 9.275], U: [-9.496, 9.658], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] },
    Co: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.002, 0.0], Be: [0.005, 0.002], B: [0.012, 0.005], C: [0.024, 0.013], N: [0.04, 0.025], O: [0.063, 0.044], F: [0.092, 0.072], Ne: [0.127, 0.113], Na: [0.167, 0.167], Mg: [0.21, 0.237], Al: [0.255, 0.328], Si: [0.298, 0.438], P: [0.339, 0.573], S: [0.371, 0.733], Cl: [0.39, 0.92], Ar: [0.374, 1.139], K: [0.354, 1.386], Ca: [0.279, 1.665], Sc: [0.148, 1.977], Ti: [-0.061, 2.321], V: [-0.396, 2.699], Cr: [-0.95, 3.113], Mn: [-2.077, 3.554], Fe: [-3.33, 0.49], Co: [-2.021, 0.573], Ni: [-1.564, 0.666], Cu: [-1.276, 0.77], Zn: [-1.081, 0.886], Ga: [-0.916, 1.014], Ge: [-0.774, 1.156], As: [-0.647, 1.311], Se: [-0.533, 1.482], Br: [-0.43, 1.667], Kr: [-0.332, 1.871], Rb: [-0.245, 2.089], Sr: [-0.136, 2.361], Y: [-0.062, 2.624], Zr: [0.004, 2.906], Nb: [0.062, 3.21], Mo: [0.103, 3.532], Tc: [0.131, 3.876], Ru: [0.149, 4.248], Rh: [0.149, 4.64], Pd: [0.13, 5.058], Ag: [0.08, 5.5], Cd: [-0.006, 5.969], In: [-0.131, 6.462], Sn: [-0.29, 6.983], Sb: [-0.496, 7.529], Te: [-0.765, 8.103], I: [-1.097, 8.708], Xe: [-1.52, 9.351], Cs: [-2.034, 10.042], Ba: [-2.703, 10.734], La: [-3.574, 11.447], Ce: [-5.162, 12.216], Pr: [-6.734, 12.977], Nd: [-8.136, 12.002], Pm: [-10.104, 9.272], Sm: [-10.19, 9.945], Eu: [-13.502, 3.652], Gd: [-9.332, 3.898], Tb: [-7.96, 4.164], Dy: [-7.093, 4.427], Ho: [-6.472, 4.708], Er: [-6.002, 5.001], Tm: [-5.628, 5.309], Yb: [-5.32, 5.624], Lu: [-5.061, 5.95], Hf: [-4.872, 6.306], Ta: [-4.659, 6.675], W: [-4.468, 7.058], Re: [-4.311, 7.451], Os: [-4.174, 7.862], Ir: [-4.043, 8.294], Pt: [-3.935, 8.745], Au: [-3.828, 9.21], Hg: [-3.775, 9.695], Tl: [-3.714, 10.199], Pb: [-3.704, 10.716], Bi: [-3.65, 11.243], Po: [-3.754, 11.804], At: [-3.826, 12.376], Rn: [-3.91, 12.965], Fr: [-4.03, 13.565], Ra: [-4.168, 14.173], Ac: [-4.352, 14.793], Th: [-4.559, 15.448], Pa: [-4.784, 16.114], U: [-5.052, 16.779], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] },
    Fe: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.002, 0.001], Be: [0.006, 0.002], B: [0.014, 0.007], C: [0.027, 0.015], N: [0.046, 0.029], O: [0.072, 0.052], F: [0.104, 0.085], Ne: [0.142, 0.132], Na: [0.186, 0.195], Mg: [0.232, 0.277], Al: [0.277, 0.381], Si: [0.321, 0.508], P: [0.359, 0.663], S: [0.385, 0.846], Cl: [0.393, 1.06], Ar: [0.339, 1.309], K: [0.308, 1.589], Ca: [0.188, 1.903], Sc: [-0.011, 2.256], Ti: [-0.331, 2.642], V: [-0.863, 3.064], Cr: [-1.919, 3.525], Mn: [-3.572, 0.48], Fe: [-2.053, 0.565], Co: [-1.572, 0.66], Ni: [-1.286, 0.767], Cu: [-1.067, 0.886], Zn: [-0.91, 1.019], Ga: [-0.766, 1.166], Ge: [-0.637, 1.329], As: [-0.521, 1.507], Se: [-0.412, 1.703], Br: [-0.318, 1.914], Kr: [-0.223, 2.147], Rb: [-0.143, 2.396], Sr: [-0.04, 2.706], Y: [0.024, 3.006], Zr: [0.077, 3.326], Nb: [0.119, 3.673], Mo: [0.143, 4.039], Tc: [0.147, 4.429], Ru: [0.137, 4.851], Rh: [0.103, 5.295], Pd: [0.044, 5.768], Ag: [-0.058, 6.265], Cd: [-0.2, 6.794], In: [-0.398, 7.351], Sn: [-0.647, 7.938], Sb: [-0.96, 8.552], Te: [-1.367, 9.198], I: [-1.87, 9.877], Xe: [-2.526, 10.597], Cs: [-3.353, 11.369], Ba: [-4.502, 12.143], La: [-6.317, 12.931], Ce: [-8.602, 11.978], Pr: [-10.993, 9.296], Nd: [-10.463, 9.982], Pm: [-13.161, 3.624], Sm: [-9.3, 3.88], Eu: [-7.938, 4.145], Gd: [-7.117, 4.423], Tb: [-6.503, 4.723], Dy: [-6.0, 5.02], Ho: [-5.6, 5.337], Er: [-5.278, 5.669], Tm: [-5.015, 6.015], Yb: [-4.793, 6.37], Lu: [-4.599, 6.736], Hf: [-4.473, 7.138], Ta: [-4.309, 7.554], W: [-4.16, 7.985], Re: [-4.044, 8.427], Os: [-3.946, 8.889], Ir: [-3.851, 9.375], Pt: [-3.784, 9.883], Au: [-3.719, 10.404], Hg: [-3.714, 10.948], Tl: [-3.694, 11.512], Pb: [-3.729, 12.091], Bi: [-3.746, 12.682], Po: [-3.898, 13.31], At: [-4.035, 13.95], Rn: [-4.182, 14.609], Fr: [-4.378, 15.28], Ra: [-4.607, 15.958], Ac: [-4.897, 16.649], Th: [-5.21, 17.378], Pa: [-5.55, 18.12], U: [-5.945, 18.858], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] },
    Cr: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.003, 0.001], Be: [0.008, 0.003], B: [0.019, 0.009], C: [0.036, 0.021], N: [0.061, 0.042], O: [0.093, 0.073], F: [0.133, 0.119], Ne: [0.179, 0.184], Na: [0.23, 0.27], Mg: [0.279, 0.381], Al: [0.326, 0.521], Si: [0.365, 0.692], P: [0.39, 0.898], S: [0.39, 1.141], Cl: [0.351, 1.422], Ar: [0.296, 1.746], K: [0.092, 2.109], Ca: [-0.198, 2.514], Sc: [-0.693, 2.965], Ti: [-1.638, 3.454], V: [-4.482, 0.458], Cr: [-2.129, 0.547], Mn: [-1.597, 0.648], Fe: [-1.291, 0.762], Co: [-1.071, 0.89], Ni: [-0.898, 1.033], Cu: [-0.731, 1.193], Zn: [-0.613, 1.371], Ga: [-0.495, 1.567], Ge: [-0.381, 1.784], As: [-0.282, 2.019], Se: [-0.186, 2.278], Br: [-0.103, 2.558], Kr: [-0.024, 2.867], Rb: [0.033, 3.196], Sr: [0.113, 3.603], Y: [0.136, 3.997], Zr: [0.147, 4.417], Nb: [0.138, 4.871], Mo: [0.092, 5.348], Tc: [0.012, 5.855], Ru: [-0.1, 6.401], Rh: [-0.252, 6.974], Pd: [-0.45, 7.583], Ag: [-0.721, 8.224], Cd: [-1.084, 8.905], In: [-1.565, 9.618], Sn: [-2.167, 10.368], Sb: [-2.949, 11.148], Te: [-4.008, 11.963], I: [-5.541, 12.82], Xe: [-8.244, 11.899], Cs: [-10.404, 12.935], Ba: [-10.993, 10.088], La: [-12.775, 3.558], Ce: [-10.186, 3.837], Pr: [-7.937, 4.124], Nd: [-7.104, 4.42], Pm: [-6.49, 4.734], Sm: [-6.009, 5.065], Eu: [-5.61, 5.407], Gd: [-5.322, 5.764], Tb: [-5.04, 6.154], Dy: [-4.762, 6.538], Ho: [-4.531, 6.945], Er: [-4.348, 7.372], Tm: [-4.202, 7.817], Yb: [-4.078, 8.274], Lu: [-3.982, 8.741], Hf: [-3.969, 9.259], Ta: [-3.894, 9.793], W: [-3.827, 10.346], Re: [-3.796, 10.911], Os: [-3.805, 11.5], Ir: [-3.808, 12.118], Pt: [-3.837, 12.764], Au: [-3.885, 13.427], Hg: [-3.99, 14.116], Tl: [-4.103, 14.833], Pb: [-4.284, 15.568], Bi: [-4.483, 16.315], Po: [-4.816, 17.109], At: [-5.181, 17.916], Rn: [-5.561, 18.746], Fr: [-6.037, 19.584], Ra: [-6.567, 20.431], Ac: [-7.244, 21.294], Th: [-8.038, 22.207], Pa: [-9.224, 23.136], U: [-9.774, 23.094], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] },
    Ag: { H: [0.0, 0.0], He: [0.0, 0.0], Li: [0.0, 0.0], Be: [-0.0, 0.0], B: [0.001, 0.0], C: [0.001, 0.001], N: [0.003, 0.002], O: [0.006, 0.004], F: [0.01, 0.006], Ne: [0.015, 0.01], Na: [0.022, 0.015], Mg: [0.031, 0.022], Al: [0.04, 0.031], Si: [0.053, 0.043], P: [0.067, 0.058], S: [0.083, 0.076], Cl: [0.1, 0.098], Ar: [0.12, 0.125], K: [0.141, 0.156], Ca: [0.162, 0.193], Sc: [0.184, 0.235], Ti: [0.207, 0.283], V: [0.229, 0.338], Cr: [0.251, 0.399], Mn: [0.272, 0.468], Fe: [0.291, 0.545], Co: [0.308, 0.63], Ni: [0.318, 0.723], Cu: [0.327, 0.826], Zn: [0.328, 0.938], Ga: [0.322, 1.059], Ge: [0.306, 1.19], As: [0.281, 1.332], Se: [0.243, 1.483], Br: [0.188, 1.645], Kr: [0.114, 1.819], Rb: [0.015, 2.003], Sr: [-0.108, 2.203], Y: [-0.278, 2.41], Zr: [-0.505, 2.628], Nb: [-0.811, 2.858], Mo: [-1.258, 3.098], Tc: [-2.016, 3.35], Ru: [-5.37, 3.65], Rh: [-2.511, 0.596], Pd: [-1.938, 0.654], Ag: [-1.628, 0.716], Cd: [-1.418, 0.782], In: [-1.262, 0.853], Sn: [-1.134, 0.929], Sb: [-1.028, 1.01], Te: [-0.943, 1.096], I: [-0.863, 1.187], Xe: [-0.789, 1.284], Cs: [-0.721, 1.391], Ba: [-0.66, 1.5], La: [-0.606, 1.614], Ce: [-0.656, 1.734], Pr: [-0.502, 1.861], Nd: [-0.458, 1.994], Pm: [-0.418, 2.133], Sm: [-0.381, 2.28], Eu: [-0.347, 2.433], Gd: [-0.32, 2.594], Tb: [-0.292, 2.763], Dy: [-0.269, 2.938], Ho: [-0.253, 3.122], Er: [-0.241, 3.314], Tm: [-0.237, 3.513], Yb: [-0.24, 3.721], Lu: [-0.25, 3.936], Hf: [-0.272, 4.162], Ta: [-0.298, 4.397], W: [-0.331, 4.641], Re: [-0.375, 4.892], Os: [-0.43, 5.154], Ir: [-0.495, 5.425], Pt: [-0.573, 5.706], Au: [-0.651, 5.996], Hg: [-0.763, 6.297], Tl: [-0.888, 6.607], Pb: [-1.039, 6.927], Bi: [-1.218, 7.255], Po: [-1.421, 7.597], At: [-1.667, 7.948], Rn: [-1.937, 8.306], Fr: [-2.265, 8.674], Ra: [-2.652, 9.048], Ac: [-3.11, 9.433], Th: [-3.673, 9.828], Pa: [-4.414, 10.234], U: [-5.545, 10.638], Np: [0.0, 0.0], Pu: [0.0, 0.0], Am: [0.0, 0.0], Cm: [0.0, 0.0] }
  };
  /* K-alpha lines of the common tube anodes, in angstrom (Hoelzer et al., Phys. Rev. A 56, 4554, 1997) */
  const ANODES = [
    { key: 'Cu', l1: 1.54059, l2: 1.54443 }, { key: 'Mo', l1: 0.70932, l2: 0.71361 }, { key: 'Co', l1: 1.78900, l2: 1.79284 },
    { key: 'Fe', l1: 1.93604, l2: 1.93997 }, { key: 'Cr', l1: 2.28973, l2: 2.29365 }, { key: 'Ag', l1: 0.55942, l2: 0.56381 }
  ];
  /* the anode whose K-alpha lines hold this wavelength: from 0.4 % below K-alpha 1 to 0.4 % above K-alpha 2 (K-alpha 1,
     K-alpha 2 or their mean), or null. f' and f'' of that anode are for K-alpha 1. */
  const anodeOf = (lambda) => ANODES.find((a) => lambda >= a.l1 * 0.996 && lambda <= a.l2 * 1.004) || null;
  const scatF0 = (el, s2) => {
    const c = XRAY_F0[el];
    if (!c) return 0;
    return c[0] * Math.exp(-c[1] * s2) + c[2] * Math.exp(-c[3] * s2) + c[4] * Math.exp(-c[5] * s2) + c[6] * Math.exp(-c[7] * s2) + c[8];
  };
  const DEG = Math.PI / 180;
  /* Lorentz and polarisation factor of a flat powder sample in reflection, beam not polarised, no monochromator */
  const lorentzPol = (theta) => (1 + Math.cos(2 * theta) ** 2) / (Math.sin(theta) ** 2 * Math.cos(theta));

  /* Every atom of the cell for diffraction: every copy of every site and every disorder part, with its share
     of the cell contents as occupancy (siteCopies: the same cell contents as the formula). B in square angstrom. */
  function powderAtoms(struct, bDefault) {
    const bd = isFinite(bDefault) ? bDefault : 1;
    const out = [];
    let noU = 0;
    struct.sites.forEach((s) => { if (s.occ > 0 && !(s.u !== null && s.u !== undefined && isFinite(s.u))) noU++; });
    const sc = siteCopies(struct);
    sc.copies.forEach((c, i) => {
      if (!(sc.w[i] > 0)) return;
      const s = struct.sites[c.site];
      const hasU = s.u !== null && s.u !== undefined && isFinite(s.u);
      out.push({ el: c.el, f: c.f, occ: sc.w[i], B: hasU ? Math.max(0, s.u) * B_PER_U : bd });
    });
    return { atoms: out, noU };
  }

  /* reflections h k l that are the same by the symmetry of the structure: h' = h R for the rotation part R of
     every operator, and -h (Friedel). Returns the distinct rotation parts and their negatives as flat arrays. */
  function laueRotations(ops) {
    const seen = new Map();
    for (const op of ops) {
      const R = op.R.map((r) => r.map((x) => Math.round(x)));
      for (const sgn of [1, -1]) {
        const flat = [].concat(...R).map((x) => sgn * x);
        seen.set(flat.join(','), flat);
      }
    }
    return Array.from(seen.values());
  }

  /* opts: lambda (angstrom), tthMin and tthMax (degrees 2-theta), bDefault (B for atoms with none in the file),
     dispersion (false leaves out f' and f''), maxWork (limit on reflections times atoms).
     Returns { reflections, lambda, anode, nAtoms, noU, f000, tthMax, cut }. Each reflection is
     { h, k, l, d, tth, fre, fim, f, m, lp, I, rel }: one member of each set of equivalent reflections, with the
     multiplicity m of the set, the structure factor of that member, f = root of the mean |F|^2 of the set,
     I = m f^2 lp, and rel = I on a scale where the strongest reflection in the range is 100. */
  function powderPattern(struct, opts) {
    const o = opts || {};
    const lambda = o.lambda > 0 ? o.lambda : 1.54059;
    const tthMin = Math.max(0, isFinite(o.tthMin) ? o.tthMin : 3);
    let tthMax = Math.min(179, isFinite(o.tthMax) ? o.tthMax : 60);
    if (tthMax <= tthMin) tthMax = Math.min(179, tthMin + 1);
    const { cell } = struct;
    const pa = powderAtoms(struct, o.bDefault);
    const atoms = pa.atoms;
    const anode = o.dispersion === false ? null : anodeOf(lambda);
    const disp = anode ? XRAY_DISP[anode.key] : null;
    const missing = [], noDisp = [];
    // atoms that share an element and a B value share one scattering factor per reflection
    const kinds = [];
    const kindOf = new Map();
    const N = atoms.length;
    const ax = new Float64Array(N), ay = new Float64Array(N), az = new Float64Array(N), aocc = new Float64Array(N);
    const akind = new Int32Array(N);
    let f000 = 0;
    atoms.forEach((a, i) => {
      const key = a.el + '|' + a.B.toFixed(4);
      if (!kindOf.has(key)) {
        if (!XRAY_F0[a.el] && !missing.includes(a.el)) missing.push(a.el);
        const dp = (disp && disp[a.el]) || [0, 0];
        // no f' and f'' (Np, Pu, Am, Cm: the tables stop at U)
        if (disp && !dp[0] && !dp[1] && (XRAY_F0[a.el] && (ELEMENTS.indexOf(a.el) > 91 || !disp[a.el])) && !noDisp.includes(a.el)) noDisp.push(a.el);
        kindOf.set(key, kinds.length);
        kinds.push({ el: a.el, B: a.B, fp: dp[0], fpp: dp[1] });
      }
      ax[i] = a.f[0]; ay[i] = a.f[1]; az[i] = a.f[2]; aocc[i] = a.occ; akind[i] = kindOf.get(key);
      f000 += a.occ * scatF0(a.el, 0);
    });
    // the range is cut when the work (reflections times atoms) would freeze the page
    const maxWork = o.maxWork > 0 ? o.maxWork : 6e8;
    const rot = laueRotations(struct.ops);
    const margin = 1.5;                                   // degrees past each end, so that peak tails enter the profile
    let cut = false;
    let gMax = 2 * Math.sin(Math.min(179.5, tthMax + margin) / 2 * DEG) / lambda;
    const cost = (g) => (4 / 3) * Math.PI * g * g * g * cell.V / Math.max(2, rot.length) * 2 * Math.max(1, N);
    while (cost(gMax) > maxWork && tthMax > tthMin + 2) {
      tthMax = Math.max(tthMin + 2, tthMax - 2);
      gMax = 2 * Math.sin(Math.min(179.5, tthMax + margin) / 2 * DEG) / lambda;
      cut = true;
    }
    const gMin = 2 * Math.sin(Math.max(0, tthMin - margin) / 2 * DEG) / lambda;
    const [ra, rb, rc] = cell.recip;
    const H = Math.floor(gMax * cell.a + 1e-9), K = Math.floor(gMax * cell.b + 1e-9), L = Math.floor(gMax * cell.c + 1e-9);
    const nk = 2 * K + 1, nl = 2 * L + 1;
    const seen = new Uint8Array((2 * H + 1) * nk * nl);
    const at = (h, k, l) => ((h + H) * nk + (k + K)) * nl + (l + L);
    const kf = new Float64Array(kinds.length), kpp = new Float64Array(kinds.length);
    const TWO_PI = 2 * Math.PI;
    const refl = [];
    for (let h = H; h >= -H; h--) for (let k = K; k >= -K; k--) for (let l = L; l >= -L; l--) {
      if (seen[at(h, k, l)] || (!h && !k && !l)) continue;
      const gx = h * ra[0] + k * rb[0] + l * rc[0], gy = h * ra[1] + k * rb[1] + l * rc[1], gz = h * ra[2] + k * rb[2] + l * rc[2];
      const g = Math.sqrt(gx * gx + gy * gy + gz * gz);
      if (g > gMax) continue;
      // the set of equivalent reflections; the member with the fewest negative indices, then the largest h, k, l, names it
      let m = 0;
      let best = null;
      for (const R of rot) {
        const p = h * R[0] + k * R[3] + l * R[6], q = h * R[1] + k * R[4] + l * R[7], r = h * R[2] + k * R[5] + l * R[8];
        if (Math.abs(p) > H || Math.abs(q) > K || Math.abs(r) > L) continue;
        const idx = at(p, q, r);
        if (seen[idx]) continue;
        seen[idx] = 1;
        m++;
        const neg = (p < 0) + (q < 0) + (r < 0);
        if (!best || neg < best[3] || (neg === best[3] && (p > best[0] || (p === best[0] && (q > best[1] || (q === best[1] && r > best[2])))))) best = [p, q, r, neg];
      }
      if (g < gMin || g * lambda / 2 >= 1) continue;
      const s2 = g * g / 4;
      for (let t = 0; t < kinds.length; t++) {
        const dw = Math.exp(-kinds[t].B * s2);
        kf[t] = (scatF0(kinds[t].el, s2) + kinds[t].fp) * dw;
        kpp[t] = kinds[t].fpp * dw;
      }
      // F(h) = sum of (a + i b) exp(i phi); with A, B the sums over a and C, D the sums over b,
      // F(h) = (A - D) + i (B + C) and F(-h) = (A + D) + i (C - B)
      const [bh, bk, bl] = best;
      let A = 0, B = 0, C = 0, D = 0;
      for (let i = 0; i < N; i++) {
        const ph = TWO_PI * (bh * ax[i] + bk * ay[i] + bl * az[i]);
        const c = Math.cos(ph), s = Math.sin(ph), t = akind[i], w = aocc[i];
        A += w * kf[t] * c; B += w * kf[t] * s; C += w * kpp[t] * c; D += w * kpp[t] * s;
      }
      const fre = A - D, fim = B + C;
      const f2 = (fre * fre + fim * fim + (A + D) * (A + D) + (C - B) * (C - B)) / 2;
      if (f2 < 1e-8 * Math.max(1, f000 * f000)) continue;     // absent by symmetry
      const theta = Math.asin(g * lambda / 2);
      const lp = lorentzPol(theta);
      refl.push({ h: bh, k: bk, l: bl, d: 1 / g, tth: 2 * theta / DEG, fre, fim, f: Math.sqrt(f2), m, lp, I: m * f2 * lp, rel: 0 });
    }
    refl.sort((p, q) => p.tth - q.tth || q.h - p.h || q.k - p.k || q.l - p.l);
    let top = 0;
    for (const r of refl) if (r.tth >= tthMin && r.tth <= tthMax && r.I > top) top = r.I;
    for (const r of refl) r.rel = top > 0 ? 100 * r.I / top : 0;
    return { reflections: refl, lambda, anode: anode ? anode.key : null, nAtoms: N, noU: pa.noU, missing, noDisp, f000, tthMin, tthMax, cut };
  }

  /* The pattern on a 2-theta grid. Every reflection is a pseudo-Voigt peak of one width with the area of its
     intensity: eta of a Lorentzian plus (1 - eta) of a Gaussian of the same full width at half maximum.
     opts: tthMin, tthMax, step, fwhm (degrees), eta (0 to 1), lambda (of the reflection list), and waves: more
     lines [{ lambda, weight }] that repeat every reflection at their own angle (K-alpha 2).
     Returns { x0, step, y } with y a Float64Array on the scale where its highest point is 100, and max the
     highest point before that scaling. */
  function powderProfile(reflections, opts) {
    const o = opts || {};
    const x0 = isFinite(o.tthMin) ? o.tthMin : 3;
    const x1 = isFinite(o.tthMax) && o.tthMax > x0 ? o.tthMax : x0 + 57;
    const step = o.step > 0 ? o.step : 0.01;
    const fwhm = o.fwhm > 0 ? o.fwhm : 0.1;
    const eta = Math.max(0, Math.min(1, isFinite(o.eta) ? o.eta : 0.5));
    const n = Math.max(2, Math.round((x1 - x0) / step) + 1);
    const y = new Float64Array(n);
    const gN = (2 / fwhm) * Math.sqrt(Math.LN2 / Math.PI), lN = 2 / (Math.PI * fwhm);
    const g4 = 4 * Math.LN2 / (fwhm * fwhm), l4 = 4 / (fwhm * fwhm);
    // A Lorentzian tail is long. Each peak is drawn out to where its tail is a millionth of the strongest peak,
    // so that no step shows where a tail stops, also on the square-root scale.
    let strongest = 0;
    for (const r of reflections) if (r.I > strongest) strongest = r.I;
    const put = (pos, area) => {
      const reach = fwhm * (eta > 0 ? Math.max(10, Math.sqrt(area / (4e-6 * (strongest || 1)))) : 4);
      const i0 = Math.max(0, Math.ceil((pos - reach - x0) / step)), i1 = Math.min(n - 1, Math.floor((pos + reach - x0) / step));
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + i * step - pos, d2 = dx * dx;
        y[i] += area * (eta * lN / (1 + l4 * d2) + (1 - eta) * gN * Math.exp(-g4 * d2));
      }
    };
    const waves = (o.waves || []).filter((w) => w && w.lambda > 0 && w.weight > 0);
    for (const r of reflections) {
      put(r.tth, r.I);
      for (const w of waves) {
        const sn = w.lambda / (2 * r.d);
        if (sn >= 1) continue;
        const th = Math.asin(sn);
        put(2 * th / DEG, r.I * w.weight * lorentzPol(th) / r.lp);
      }
    }
    let max = 0;
    for (let i = 0; i < n; i++) if (y[i] > max) max = y[i];
    if (max > 0) for (let i = 0; i < n; i++) y[i] *= 100 / max;
    return { x0, step, y, max };
  }

  /* Measured powder data from a text file with two columns, 2-theta and intensity (.xy, .xye, .csv, .txt, .dat,
     .asc, Rigaku .ras). Columns are split by spaces, tabs, commas or semicolons; a third column is ignored.
     Lines that do not start with two numbers are taken as header or comment lines.
     Returns { x, y, header, anode }: points sorted by 2-theta, the header text, and the anode named in it. */
  function readXY(text) {
    const x = [], y = [];
    const head = [];
    const lines = String(text).replace(/^﻿/, '').split(/\r\n?|\n/).map((s) => s.trim()).filter(Boolean);
    // decimal commas (10,02;120,5 or 10,02<tab>120,5): rows whose first two numbers have a decimal comma and a
    // semicolon, a tab or spaces between them. They are decimal-comma data when they are at least 3 and at least
    // as many as the rows with decimal points (a header such as "2θ (deg.);Intensity" or one row written with a
    // point does not change that). Rows of numbers with commas only (10,02,120,5) cannot be read without doubt.
    const data = lines.filter((s) => /^[-+]?[\d.,]/.test(s));
    const decRow = /^[-+]?\d+,\d+([eE][-+]?\d+)?[;\t ]+[-+]?\d+(,\d+)?([eE][-+]?\d+)?([;\t ].*)?$/;
    const ptRow = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?[\s,;]+[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/;
    const nDec = data.filter((s) => decRow.test(s)).length;
    const nPt = data.filter((s) => /\d\.\d/.test(s) && ptRow.test(s)).length;
    const commaDec = nDec >= 3 && nDec >= nPt;
    if (!commaDec && !nPt && data.filter((s) => /^[-+]?\d+(,\d+){2,}$/.test(s)).length >= 3) {
      throw new Error('This file has decimal commas and commas between the columns, so the numbers cannot be read without doubt. Save it with points as decimal marks, or with a semicolon or a tab between the columns.');
    }
    for (const line0 of lines) {
      const line = commaDec && decRow.test(line0) ? line0.replace(/,/g, '.') : line0;
      const t = line.split(/[\s,;]+/);
      const a = t.length >= 2 && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t[0]) ? Number(t[0]) : NaN;
      const b = t.length >= 2 && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t[1]) ? Number(t[1]) : NaN;
      if (isFinite(a) && isFinite(b)) { x.push(a); y.push(b); } else if (head.length < 40) head.push(line);
    }
    if (x.length < 3) throw new Error('No rows with two numbers (2-theta and intensity) were found in this file.');
    let sorted = true;
    for (let i = 1; i < x.length; i++) if (x[i] < x[i - 1]) { sorted = false; break; }
    let X = x, Y = y;
    if (!sorted) {
      const order = x.map((v, i) => i).sort((p, q) => x[p] - x[q]);
      X = order.map((i) => x[i]);
      Y = order.map((i) => y[i]);
    }
    const header = head.join('\n');
    const am = header.match(/\banode\b\W{0,4}\b(Cu|Mo|Co|Fe|Cr|Ag)\b/i) || header.match(/\b(Cu|Mo|Co|Fe|Cr|Ag)[\s_-]?K[\s_-]?(?:a|alpha|α)/i);
    return { x: X, y: Y, header, anode: am ? am[1].charAt(0).toUpperCase() + am[1].slice(1).toLowerCase() : null };
  }

  /* a pattern as the text of an .xy file: one "2-theta intensity" row for each point */
  function toXY(x0, step, y, comment) {
    const rows = comment ? ['# ' + comment] : [];
    const dec = Math.max(2, Math.min(5, Math.ceil(-Math.log10(step) - 1e-9) + 1));
    for (let i = 0; i < y.length; i++) rows.push((x0 + i * step).toFixed(dec) + ' ' + y[i].toFixed(4));
    return rows.join('\n') + '\n';
  }

  /* Several patterns as the text of a CSV file: one 2-theta column on one grid (x0, step, n points), then one
     intensity column for each pattern. columns is [{ name, X, Y }] with X in rising order. A pattern on a
     different grid is put on this grid by linear interpolation between its two nearest points. A cell stays
     empty where the pattern has no points. */
  function patternsCsv(x0, step, n, columns) {
    const dec = Math.max(2, Math.min(5, Math.ceil(-Math.log10(step) - 1e-9) + 1));
    // a name that starts like a formula gets a space in front, so that a spreadsheet does not run it
    const cell = (s) => {
      let t = String(s);
      if (/^[=+\-@]/.test(t)) t = ' ' + t;
      return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const rows = [['2theta (deg)'].concat(columns.map((c) => cell(c.name))).join(',')];
    const at = columns.map(() => 0);
    const tol = step * 1e-6;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      const cells = [x.toFixed(dec)];
      columns.forEach((c, k) => {
        const X = c.X, Y = c.Y, m = X.length;
        if (!m || x < X[0] - tol || x > X[m - 1] + tol) { cells.push(''); return; }
        let j = at[k];
        while (j < m - 1 && X[j + 1] <= x + tol) j++;
        at[k] = j;
        if (j >= m - 1 || Math.abs(X[j] - x) <= tol || x < X[j]) { cells.push(Y[j].toFixed(4)); return; }
        cells.push((Y[j] + (x - X[j]) / (X[j + 1] - X[j]) * (Y[j + 1] - Y[j])).toFixed(4));
      });
      rows.push(cells.join(','));
    }
    return rows.join('\n') + '\n';
  }

  root.XtalCore = { neighbours, readStructure, readStructures, readCif, readCifAll, readPoscar, readXyz, readShelx, readAims, zipEntries, zipStructureNames, hybridInfo, STRUCTURE_NAME, buildCell, analyse, assemble, hbondList, hullFaces, planePolys, tetrazineDefs, chromoInstances, stateDir, orientReport, hallOps, symbolOps, setSgTable, isMetal, isCenter, isDonor, HALIDE, RC, MASS, parseSymop, MAX_POLY_CN, planeOfPoints, planeOfHkl, planeDistance, planeFoot, linePlaneAngle, planePlaneAngle, projectedAngle, nearestHkl, planeDisc, arcPoints, ballMesh, highlightSet, distance, bondAngle, torsion, toMol2, toSvg, visibleParts, hullPolygons, bondTubes, polyhedraFor, polyhedraStats, suggestPolyMax,
    powderAtoms, powderPattern, powderProfile, readXY, toXY, patternsCsv, ANODES, anodeOf, XRAY_F0, uEquiv };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.XtalCore;
})(typeof window !== 'undefined' ? window : globalThis);
