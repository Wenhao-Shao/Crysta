s = open('ref_fw.py').read()
s = s.replace("""    rng = [-2, -1, 0, 1, 2]
    T = np.array(list(itertools.product(rng, rng, rng)))
    for i in range(len(atoms)):""", """    rec = np.linalg.inv(M)
    nmax = [int(math.ceil(4.5 * np.linalg.norm(rec[k]))) for k in range(3)]
    T = np.array(list(itertools.product(*[range(-n, n + 1) for n in nmax])))
    for i in range(len(atoms)):
        if rule(i, None) is None: continue""")
s = s.replace("""    def cov_rule(i, j):
        a, b = els[i], els[j]
        if is_metal[i] or is_metal[j]: return None""", """    def cov_rule(i, j):
        if j is None: return None if is_metal[i] else 1
        a, b = els[i], els[j]
        if is_metal[i] or is_metal[j]: return None""")
s = s.replace("""    def ml_rule(i, j):
        if not centre[i]: return None""", """    def ml_rule(i, j):
        if not centre[i]: return None
        if j is None: return 1""")
s = s.replace("""    for path, block in lst:
        try:""", """    import time
    for path, block in lst:
        t0 = time.time()
        try:""")
s = s.replace("""        r['path'] = path; r['block'] = block
        out.append(r)""", """        r['path'] = path; r['block'] = block; r['time'] = time.time() - t0
        print(os.path.basename(path), block, round(r['time'], 1), flush=True)
        out.append(r)""")
open('ref_fw.py', 'w').write(s)
