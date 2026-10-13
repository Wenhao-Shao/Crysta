// A1-07: deuterium is read as H: formula and density of a deuterated structure (HybriD3 data set 197, FHI-aims file)
// Reference: the same cell contents with the D atoms given the mass of 2H (2.014), by hand.
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const f = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus/hybrid3/structures/197_1.in';
const text = fs.readFileSync(f, 'utf8');
const nD = (text.match(/^\s*atom\S*\s+\S+\s+\S+\s+\S+\s+D\s*$/mg) || []).length;
const s = C.readStructure(text, '197_1.in');
const uc = C.buildCell(s, {}); const info = C.analyse(uc);
console.log('D atoms in the file', nD, '| Crysta elements', JSON.stringify(uc.counts), '| formula', info.formula.map((e) => e.el + e.n).join(' '), 'Z', info.Z, 'mass', info.formulaMass.toFixed(3), 'density', info.density.toFixed(4));
const massD = info.formulaMass + (nD / info.Z) * (2.01410 - 1.00794);
console.log('with D masses: formula mass', massD.toFixed(3), 'density', (info.density * massD / info.formulaMass).toFixed(4), 'g/cm3');
