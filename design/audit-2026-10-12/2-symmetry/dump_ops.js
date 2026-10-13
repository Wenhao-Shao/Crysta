// Dump Crysta's operators: (1) hallOps of each table entry, (2) symbolOps for a list of query names.
// usage: node dump_ops.js queries.json out.json
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
const T = JSON.parse(fs.readFileSync('/home/claude/crysta/src/sg-table.json', 'utf8'));
C.setSgTable(T);
const q = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pack = (ops) => (ops ? ops.map((o) => [o.R, o.T]) : null);
const out = { table: {}, queries: [] };
for (const k of Object.keys(T)) {
  let ops = null, err = null;
  try { ops = C.hallOps(T[k]); } catch (e) { err = String(e); }
  out.table[k] = { hall: T[k], ops: pack(ops), err };
}
const cells = { hex: { a: 5, b: 5, c: 12, al: 90, be: 90, ga: 120 }, rho: { a: 5, b: 5, c: 5, al: 80, be: 80, ga: 80 }, none: null };
for (const item of q) {
  let r = null, err = null;
  try { r = C.symbolOps(item.hm, item.number, item.cell ? cells[item.cell] : null); } catch (e) { err = String(e); }
  out.queries.push(Object.assign({}, item, { hall: r ? r.hall : null, via: r ? r.via : null, ops: r ? pack(r.ops) : null, err }));
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
