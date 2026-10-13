// patternsCsv: interpolation of a measured set onto the grid, against my own linear interpolation (numpy in python)
const fs = require('fs');
const C = require('/home/claude/crysta/src/core.js');
// measured: irregular steps, starts after x0 and ends before the end of the grid
const X = [], Y = [];
let x = 10.013;
for (let i = 0; i < 400; i++) { X.push(+x.toFixed(4)); Y.push(100 + 50 * Math.sin(i / 7) + i * 0.3); x += 0.017 + 0.009 * Math.sin(i); }
const sim = { name: 'sim, "a"', X: Array.from({ length: 1001 }, (_, i) => 5 + i * 0.01), Y: Array.from({ length: 1001 }, (_, i) => i % 97) };
const text = C.patternsCsv(5, 0.01, 1001, [sim, { name: '=cmd', X, Y }]);
fs.writeFileSync(__dirname + '/csv_test_out.csv', text);
fs.writeFileSync(__dirname + '/csv_test_in.json', JSON.stringify({ X, Y }));
console.log(text.split('\n').slice(0, 3).join('\n'));
