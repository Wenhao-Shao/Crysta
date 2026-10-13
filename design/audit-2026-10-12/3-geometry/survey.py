import gemmi, glob, os, json, sys, collections
A='/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit'
files=sorted(glob.glob(A+'/corpus/hybrid3/structures/*.cif'))
out=[]
for f in files:
    try:
        doc=gemmi.cif.read(f)
    except Exception as e:
        out.append({'file':os.path.basename(f),'err':str(e)[:80]}); continue
    for b in doc:
        if b.find_value('_cell_length_a') is None: continue
        r={'file':os.path.basename(f),'block':b.name}
        r['nbond']=len(b.find_values('_geom_bond_atom_site_label_1'))
        r['nang']=len(b.find_values('_geom_angle_atom_site_label_1'))
        r['ntor']=len(b.find_values('_geom_torsion_atom_site_label_1'))
        r['hasbsym']=len(b.find_values('_geom_bond_site_symmetry_2'))>0
        r['nsite']=len(b.find_values('_atom_site_label'))
        els=set()
        for t in b.find_values('_atom_site_type_symbol'):
            els.add(gemmi.cif.as_string(t))
        r['els']=sorted(els)
        r['nsym']=len(b.find_values('_symmetry_equiv_pos_as_xyz'))+len(b.find_values('_space_group_symop_operation_xyz'))
        r['nblocks']=len(doc)
        out.append(r)
json.dump(out,open('survey.json','w'),indent=0)
c=collections.Counter()
for r in out:
    if 'err' in r: c['err']+=1; continue
    c['blocks']+=1
    if r['nbond']: c['bond']+=1
    if r['nang']: c['ang']+=1
    if r['ntor']: c['tor']+=1
    if r['hasbsym']: c['bsym']+=1
print(c)
