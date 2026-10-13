import glob, numpy as np
A='/tmp/claude-0/-home-claude-crysta/91526d4c-a104-5cc3-9816-99087d3f4c17/scratchpad/audit'
neg=[]; n=0
for f in sorted(glob.glob(A+'/corpus/hybrid3/structures/*.in'))+[A+'/corpus/tests-files/hybrid3_2008_geometry.in']:
    V=[]
    for ln in open(f, errors='replace'):
        t=ln.split('#')[0].split()
        if t and t[0]=='lattice_vector': V.append([float(x) for x in t[1:4]])
    if len(V)==3:
        n+=1
        d=np.linalg.det(np.array(V))
        if d<0: neg.append((f.split('/')[-1], round(d,2)))
print(n, 'with lattice;', len(neg), 'left-handed', neg[:20])
