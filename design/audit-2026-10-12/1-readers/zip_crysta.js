const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const C = require('/home/claude/crysta/src/core.js');
const out = {};
for (const f of process.argv.slice(3)) {
  const name = f.split('/').pop();
  const bytes = new Uint8Array(fs.readFileSync(f));
  try {
    const es = C.zipEntries(bytes);
    out[name] = es.map((e) => {
      const part = Buffer.from(bytes.subarray(e.start, e.start + e.packed));
      let data = null;
      try { data = e.method === 0 ? part : zlib.inflateRawSync(part); } catch (err) { data = null; }
      return { name: e.name, method: e.method, start: e.start, packed: e.packed, size: e.size, encrypted: e.encrypted, sha: data ? crypto.createHash('sha1').update(data).digest('hex') : null };
    });
    out[name + ':names'] = C.zipStructureNames(es.map((e) => e.name), false);
  } catch (e) { out[name] = { error: e.message }; }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
