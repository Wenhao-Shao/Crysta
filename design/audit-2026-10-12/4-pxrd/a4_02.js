// A4-02: a powder data file with decimal commas is read without an error, as wrong numbers
const C = require('/home/claude/crysta/src/core.js');
const text = '2Theta;Intensity\n10,00;100,0\n10,02;120,5\n10,04;140,0\n10,06;160,0\n';
const r = C.readXY(text);
console.log('file rows: (10.00, 100.0) (10.02, 120.5) (10.04, 140.0) (10.06, 160.0)');
console.log('readXY x =', JSON.stringify(r.x), ' y =', JSON.stringify(r.y));
