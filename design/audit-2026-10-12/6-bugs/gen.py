# Make the broken, hostile and odd files of auditor 6. Run with: python3 -I gen.py
import os, sys, zipfile, io, random, struct, zlib, math
W = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(W, 'files')
os.makedirs(F, exist_ok=True)
CORP = '/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit/corpus'
PEA = open(os.path.join(CORP, 'examples/PEA2PbBr4.cif')).read()
rnd = random.Random(6)

def w(name, text, mode='w'):
    p = os.path.join(F, name)
    with open(p, mode) as f:
        f.write(text)
    return p

def cif(block, cell, atoms, extra='', ops=None, hm=None, num=None, label_tag=True):
    a, b, c, al, be, ga = cell
    s = 'data_%s\n' % block
    if hm is not None:
        s += "_symmetry_space_group_name_H-M '%s'\n" % hm
    if num is not None:
        s += '_symmetry_Int_Tables_number %s\n' % num
    s += '_cell_length_a %s\n_cell_length_b %s\n_cell_length_c %s\n_cell_angle_alpha %s\n_cell_angle_beta %s\n_cell_angle_gamma %s\n' % (a, b, c, al, be, ga)
    s += extra
    if ops:
        s += 'loop_\n_symmetry_equiv_pos_as_xyz\n' + ''.join("'%s'\n" % o for o in ops)
    s += 'loop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n'
    for at in atoms:
        s += ' '.join(str(x) for x in at) + '\n'
    return s

# ---------- 1. broken files ----------
w('empty.cif', '')
w('blank_lines.cif', '\n\n   \n\t\n')
with open(os.path.join(F, 'binary.cif'), 'wb') as f:
    f.write(bytes(rnd.getrandbits(8) for _ in range(4096)))
with open(os.path.join(F, 'binary_noext'), 'wb') as f:
    f.write(bytes(rnd.getrandbits(8) for _ in range(4096)))
# a PNG header in a .cif
with open(os.path.join(F, 'png_as.cif'), 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n' + bytes(rnd.getrandbits(8) for _ in range(2000)))
# truncated in the middle of the atom-site loop
i = PEA.index('_atom_site_fract_x')
w('truncated.cif', PEA[:i + 600])
# truncated in the middle of a quoted value / semicolon text
j = PEA.index('_publ_section_title')
w('truncated_semicolon.cif', PEA[:j + 40])
w('cell_noatoms.cif', 'data_cellonly\n_cell_length_a 5\n_cell_length_b 5\n_cell_length_c 5\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\n')
w('atoms_nocell.cif', 'data_nocell\nloop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nPb1 Pb 0 0 0\nBr1 Br 0.5 0 0\n')
cub = [('Pb1', 'Pb', 0, 0, 0), ('Br1', 'Br', 0.5, 0, 0), ('Br2', 'Br', 0, 0.5, 0), ('Br3', 'Br', 0, 0, 0.5), ('Cs1', 'Cs', 0.5, 0.5, 0.5)]
w('cell_zero.cif', cif('zero_a', (0, 5.9, 5.9, 90, 90, 90), cub))
w('cell_negative.cif', cif('neg_a', (-5.9, 5.9, 5.9, 90, 90, 90), cub))
w('cell_angles_impossible.cif', cif('bad_angles', (5.9, 5.9, 5.9, 30, 30, 120), cub))  # no real cell: al+be < ga
w('cell_gamma0.cif', cif('gamma0', (5.9, 5.9, 5.9, 90, 90, 0), cub))
w('cell_angle180.cif', cif('angle180', (5.9, 5.9, 5.9, 90, 180, 90), cub))
w('cell_tiny.cif', cif('tiny', (0.01, 0.01, 0.01, 90, 90, 90), [('C1', 'C', 0, 0, 0)]))
w('cell_huge.cif', cif('huge', (1e6, 1e6, 1e6, 90, 90, 90), [('C1', 'C', 0, 0, 0), ('C2', 'C', 1.5e-6, 0, 0)]))
w('coords_nan.cif', cif('nancoords', (5.9, 5.9, 5.9, 90, 90, 90), [('Pb1', 'Pb', 'NaN', 0, 0), ('Br1', 'Br', 'nan', 0, 0), ('Br2', 'Br', 'Infinity', 0.5, 0), ('Br3', 'Br', '?', 0, 0.5), ('Cs1', 'Cs', 0.5, 0.5, 0.5)]))
w('coords_huge.cif', cif('hugecoords', (5.9, 5.9, 5.9, 90, 90, 90), [('Pb1', 'Pb', '1e300', 0, 0), ('Br1', 'Br', '123456789.5', 0, 0), ('Br2', 'Br', 0, '-1e17', 0), ('Br3', 'Br', 0, 0, '1.7976931348623157e308'), ('Cs1', 'Cs', 0.5, 0.5, 0.5)]))
w('coords_all_nan.cif', cif('allnan', (5.9, 5.9, 5.9, 90, 90, 90), [('Pb1', 'Pb', 'NaN', 'NaN', 'NaN')]))
w('cell_nan.cif', cif('cellnan', ('NaN', 5.9, 5.9, 90, 90, 90), cub))
# very long lines: a 5 MB comment line, a 200 kB label, and 100 000 atoms worth of junk on one line
w('long_comment_line.cif', '# ' + 'x' * 5_000_000 + '\n' + cif('longcomment', (5.9, 5.9, 5.9, 90, 90, 90), cub))
w('long_label.cif', cif('longlabel', (5.9, 5.9, 5.9, 90, 90, 90), [('Pb' + 'A' * 200_000, 'Pb', 0, 0, 0)] + cub[1:]))
w('long_blockname.cif', cif('B' * 100_000, (5.9, 5.9, 5.9, 90, 90, 90), cub))
w('long_line_values.cif', cif('longvals', (5.9, 5.9, 5.9, 90, 90, 90), []) .rstrip('\n') + '\n' + ' '.join('Br%d Br %.4f %.4f %.4f' % (k, rnd.random(), rnd.random(), rnd.random()) for k in range(3000)) + '\n')
# Unicode labels and block names
uni = [('Pb₁', 'Pb', 0, 0, 0), ('Br•α', 'Br', 0.5, 0, 0), ('溴2', 'Br', 0, 0.5, 0), ('Br🙂3', 'Br', 0, 0, 0.5), ('Cs‮RTL', 'Cs', 0.5, 0.5, 0.5)]
w('unicode_labels.cif', cif('结构_ünï', (5.9, 5.9, 5.9, 90, 90, 90), uni))
# Windows line ends and a BOM
w('bom_crlf.cif', '﻿' + cif('bomcrlf', (5.9, 5.9, 5.9, 90, 90, 90), cub).replace('\n', '\r\n'))
# UTF-16 file
with open(os.path.join(F, 'utf16.cif'), 'wb') as f:
    f.write(cif('utf16', (5.9, 5.9, 5.9, 90, 90, 90), cub).encode('utf-16'))

# ---------- 2. HTML and script text in every field that reaches the page ----------
X = '<img src=x onerror=alert(%d)>'
XS = '<img/src=x/onerror=alert(%d)>'  # no spaces: survives the CIF tokenizer as one bare token
hx = ''
hx += "data_%s\n" % (XS % 1)
hx += "_symmetry_space_group_name_H-M '%s'\n" % (X % 2)
hx += "_symmetry_Int_Tables_number '%s'\n" % (X % 3)
hx += "_diffrn_ambient_temperature '%s'\n" % (X % 4)
hx += "_refine_ls_R_factor_gt '%s'\n" % (X % 5)
hx += "_database_code_depnum_ccdc_archive '%s'\n" % (X % 6)
hx += "_cell_length_a '5.9%s'\n_cell_length_b 5.9\n_cell_length_c 5.9\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\n" % (X % 7)
hx += "loop_\n_symmetry_equiv_pos_as_xyz\n'x,y,z'\n"
hx += "loop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n"
hx += "'Pb%s' 'Pb%s' 0 0 0\n" % (X % 8, X % 9)
hx += "'Br%s' Br 0.5 0 0\n" % (X % 10)
hx += "'Br%s' Br 0 0.5 0\n" % (X % 11)
hx += "'Br\"><svg/onload=alert(12)>' Br 0 0 0.5\n"
hx += "'Cs%s' Cs 0.5 0.5 0.5\n" % (X % 13)
hx += "'%s' Qq 0.25 0.25 0.25\n" % (X % 14)          # element not recognised: goes to 'Not read'
hx += "'N%s' N 0.5 0.5 '?'\n" % (X % 15)               # no coordinates: goes to 'Not read'
w('xss_fields.cif', hx)
# the file name itself
w((X % 16) + '.cif', cif('fname', (5.9, 5.9, 5.9, 90, 90, 90), cub))
# split sites (autoSplit list) and disorder with HTML labels, and an H-bond with HTML labels
w('xss_split.cif', cif('split', (5.9, 5.9, 5.9, 90, 90, 90), cub + [("'Pb%s'" % (X % 17), 'Pb', 0.02, 0, 0)]))
hb = cif('hb', (10, 10, 10, 90, 90, 90), [
    ("'N%s'" % (X % 18), 'N', 0.0, 0.0, 0.0), ("'H%s'" % (X % 19), 'H', 0.1, 0.0, 0.0),
    ("'C%s'" % (X % 20), 'C', -0.148, 0.0, 0.0),
    ("'Br%s'" % (X % 21), 'Br', 0.33, 0.0, 0.0)])
w('xss_hbond.cif', hb)
# POSCAR: title line and element names
w('xss.POSCAR', (X % 22) + '\n1.0\n5.9 0 0\n0 5.9 0\n0 0 5.9\nPb' + (XS % 23) + ' Br\n1 3\nDirect\n0 0 0\n0.5 0 0\n0 0.5 0\n0 0 0.5\n')
# SHELX: title and atom names
w('xss.res', 'TITL ' + (XS % 24) + ' x\nCELL 0.71073 5.9 5.9 5.9 90 90 90\nLATT -1\nSFAC Pb Br\nFVAR 1.0\n' + ('Pb' + XS % 25) + ' 1 0 0 0 11.0 0.02\nBr1 2 0.5 0 0 11.0 0.03\nBr2 2 0 0.5 0 11.0 0.03\nBr3 2 0 0 0.5 11.0 0.03\nHKLF 4\nEND\n')
# XYZ with an element name that carries HTML after the symbol
w('xss.xyz', '2\n' + (X % 26) + '\nC' + (XS % 27) + ' 0 0 0\nO 1.2 0 0\n')
# geometry.in
w('xss_geometry.in', 'lattice_vector 5.9 0 0\nlattice_vector 0 5.9 0\nlattice_vector 0 0 5.9\natom 0 0 0 Pb' + (XS % 28) + '\natom 2.95 0 0 Br\n')

# ---------- 3. zip files ----------
def zbytes(entries, method=zipfile.ZIP_DEFLATED):
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, 'w', method) as z:
        for n, t in entries:
            z.writestr(n, t)
    return bio.getvalue()
small = cif('small', (5.9, 5.9, 5.9, 90, 90, 90), cub)
open(os.path.join(F, 'zip_1000_cifs.zip'), 'wb').write(zbytes([('s%04d.cif' % k, small.replace('data_small', 'data_s%04d' % k)) for k in range(1000)]))
open(os.path.join(F, 'zip_1000_txt.zip'), 'wb').write(zbytes([('f%04d.txt' % k, 'hello %d\n' % k) for k in range(1000)] + [('one.cif', small)]))
inner = zbytes([('inner.cif', small)])
open(os.path.join(F, 'zip_in_zip.zip'), 'wb').write(zbytes([('inner.zip', inner)]))
good = zbytes([('a.cif', small), ('b.cif', small.replace('data_small', 'data_b'))])
open(os.path.join(F, 'zip_truncated.zip'), 'wb').write(good[:len(good) // 2])
# corrupt the deflate data of the first entry, keep the directory
bad = bytearray(good)
lh = bad.index(b'PK\x03\x04')
nlen = struct.unpack('<H', bad[lh + 26:lh + 28])[0]
start = lh + 30 + nlen + struct.unpack('<H', bad[lh + 28:lh + 30])[0]
for k in range(start, start + 40):
    bad[k] = rnd.getrandbits(8)
open(os.path.join(F, 'zip_corrupt_data.zip'), 'wb').write(bytes(bad))
# central directory damaged
bad2 = bytearray(good)
cd = bad2.rindex(b'PK\x01\x02')
bad2[cd:cd + 4] = b'XXXX'
open(os.path.join(F, 'zip_bad_directory.zip'), 'wb').write(bytes(bad2))
# encrypted flag set
bad3 = bytearray(good)
for sig in (b'PK\x03\x04', b'PK\x01\x02'):
    p = 0
    while True:
        p = bad3.find(sig, p)
        if p < 0: break
        off = 6 if sig == b'PK\x03\x04' else 8
        fl = struct.unpack('<H', bad3[p + off:p + off + 2])[0] | 1
        bad3[p + off:p + off + 2] = struct.pack('<H', fl)
        p += 4
open(os.path.join(F, 'zip_encrypted_flag.zip'), 'wb').write(bytes(bad3))
# a zip bomb: 200 MB of spaces in a .cif, with the header sizes telling the truth (> 5e7: refused) ...
bomb_text = b' ' * 200_000_000
co = zlib.compressobj(9, zlib.DEFLATED, -15)
raw = co.compress(bomb_text) + co.flush()
def rawzip(name, data_raw, usize, crc):
    nb = name.encode()
    lhdr = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, 8, 0, 0, crc, len(data_raw), usize, len(nb), 0) + nb
    cdh = struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, 8, 0, 0, crc, len(data_raw), usize, len(nb), 0, 0, 0, 0, 0, 0) + nb
    end = struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, 1, 1, len(cdh), len(lhdr) + len(data_raw), 0)
    return lhdr + data_raw + cdh + end
crc = zlib.crc32(bomb_text) & 0xffffffff
open(os.path.join(F, 'zip_bomb_honest.zip'), 'wb').write(rawzip('big.cif', raw, len(bomb_text), crc))
# ... and lying (the header says 1 kB)
open(os.path.join(F, 'zip_bomb_lying.zip'), 'wb').write(rawzip('big.cif', raw, 1000, crc))
# a zip with no structure file
open(os.path.join(F, 'zip_no_structures.zip'), 'wb').write(zbytes([('readme.txt', 'nothing here')]))
# empty zip archive (only the end record)
open(os.path.join(F, 'zip_empty.zip'), 'wb').write(zbytes([]))
# a HybriD3-like download with HTML in info.txt
info = ('Data set https://materials.hybrid3.duke.edu/materials/dataset/999999\nReference: ' + (X % 30) + '\nOrigin: experimental\ntemperature = 300 K\n')
open(os.path.join(F, 'zip_hybrid_xss.zip'), 'wb').write(zbytes([('info.txt', info), (XS % 31 + '.cif', small)]))
# a zip whose structure file is broken
open(os.path.join(F, 'zip_broken_member.zip'), 'wb').write(zbytes([('ok.cif', small), ('broken.cif', 'data_x\n_cell_length_a 5\n')]))

# ---------- 4. powder data ----------
lines = ['# junk header', 'Anode: Cu', 'Two theta, intensity', '']
for k in range(1_000_000):
    t = 5 + k * 0.0001
    if k % 997 == 0: lines.append('junk line %d ;;; ### <img src=x onerror=alert(40)>' % k)
    if k % 5003 == 0: lines.append('NaN NaN')
    if k % 7919 == 0: lines.append('')
    lines.append('%.4f %.3f' % (t, 100 + 50 * math.sin(t)))
w('large_junk.xy', '\n'.join(lines) + '\n')
w((X % 41) + '.xy', '\n'.join('%.2f %.1f' % (5 + 0.02 * k, 10 + k % 50) for k in range(500)) + '\n')
w('few_points.xy', '10 1\n20 2\n30 3\n')
w('descending.xy', '\n'.join('%.2f %.1f' % (80 - 0.02 * k, 10 + k % 50) for k in range(3000)) + '\n')
w('negative_tth.xy', '\n'.join('%.2f %.1f' % (-20 + 0.05 * k, 10 + k % 50) for k in range(3000)) + '\n')
print('done', len(os.listdir(F)))
