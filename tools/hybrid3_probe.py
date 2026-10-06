#!/usr/bin/env python3
"""One-time look at how HybriD3 gives the files of a data set. Writes data/hybrid3/probe.txt.
Not part of the copy. Remove it when the questions are answered."""
import io, json, re, sys, time, urllib.request, urllib.error, zipfile

BASE = "https://materials.hybrid3.duke.edu"
OUT = []
def say(*p):
    OUT.append(" ".join(str(x) for x in p)); print(OUT[-1], flush=True)
def fetch(path, origin=None, timeout=120):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Crysta database copy (https://github.com/Wenhao-Shao/Crysta)"})
    if origin: req.add_header("Origin", origin)
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            return r.status, dict(r.headers), body, time.time() - t
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()[:300], time.time() - t
    except Exception as e:
        return None, {}, repr(e).encode(), time.time() - t

say("== robots.txt")
st, h, b, dt = fetch("/robots.txt")
say(st, b.decode("utf-8", "replace")[:600])

say("== download of data set 2008, asked as from the Crysta page")
st, h, b, dt = fetch("/materials/datasets/2008/files/", origin="https://wenhao-shao.github.io")
say("status", st, "| type", h.get("Content-Type"), "| disposition", h.get("Content-Disposition"), "| Access-Control-Allow-Origin:", h.get("Access-Control-Allow-Origin"), "| bytes", len(b), "| s %.1f" % dt)
try:
    z = zipfile.ZipFile(io.BytesIO(b))
    for i in z.infolist(): say("   zip:", i.filename, i.file_size)
    for i in z.infolist():
        if i.filename.endswith("info.txt"): say("   info.txt:", z.read(i).decode("utf-8", "replace")[:700].replace("\n", " / "))
except Exception as e:
    say("   not a zip:", repr(e), b[:120])

say("== one data set as JSON")
for path in ("/materials/datasets/2008/", "/materials/datasets/2008"):
    st, h, b, dt = fetch(path)
    say(path, "status", st, "| type", h.get("Content-Type"), "| bytes", len(b), "| s %.1f" % dt)
    if st == 200 and b[:1] == b"{":
        d = json.loads(b)
        say("   keys:", sorted(d.keys()))
        say("   system:", d.get("system"), "| space_group:", d.get("space_group"), "| property:", d.get("primary_property"), "| is_experimental:", d.get("is_experimental"))
        sub = (d.get("subsets") or [{}])[0]
        say("   subset keys:", sorted(sub.keys()) if isinstance(sub, dict) else type(sub))
        if isinstance(sub, dict):
            for k, v in sub.items():
                say("     ", k, ":", json.dumps(v)[:300])
        say("   other:", {k: json.dumps(d[k])[:200] for k in d if k not in ("subsets", "synthesis", "experimental", "computational")})
        break

say("== list of data sets: filters and speed")
for q in ("?page=1&page_size=1", "?page=1&page_size=1&system=80", "?page=1&page_size=1&system__pk=80", "?page=1&page_size=1&primary_property=7", "?page=1&page_size=1&primary_property__name=atomic+structure", "?page=1&page_size=5", "?page=45&page_size=5"):
    st, h, b, dt = fetch("/materials/datasets/" + q)
    info = ""
    if st == 200 and b[:1] == b"{":
        d = json.loads(b); info = "count %s | first pk %s | property %s" % (d.get("count"), [x.get("pk") for x in d.get("results", [])][:5], [(x.get("primary_property") or {}).get("name") for x in d.get("results", [])][:5])
    say(q, "status", st, "| bytes", len(b), "| s %.1f" % dt, "|", info)

say("== material page 80: links to its data sets")
st, h, b, dt = fetch("/materials/80")
text = b.decode("utf-8", "replace")
say("status", st, "| bytes", len(b), "| data set links:", sorted(set(re.findall(r"/materials/dataset/(\d+)", text)))[:20], "| file links:", sorted(set(re.findall(r"/materials/datasets/(\d+)/files", text)))[:20])

say("== other downloads: what is in the zip")
for pk in (1, 5, 50, 300, 1000, 1635, 2000, 2692, 2900, 2942):
    st, h, b, dt = fetch("/materials/datasets/%d/files/" % pk)
    names = ""
    try:
        z = zipfile.ZipFile(io.BytesIO(b)); names = ", ".join("%s (%d)" % (i.filename, i.file_size) for i in z.infolist())
        info = [i for i in z.infolist() if i.filename.endswith("info.txt")]
        if info:
            m = re.search(r"Physical property:\s*(.*)", z.read(info[0]).decode("utf-8", "replace")); names += " | property: " + (m.group(1).strip() if m else "?")
    except Exception as e:
        names = "no zip: " + repr(e)[:80]
    say(pk, "status", st, "| bytes", len(b), "| s %.1f" % dt, "|", names)
    time.sleep(0.5)

open(sys.argv[1] if len(sys.argv) > 1 else "data/hybrid3/probe.txt", "w").write("\n".join(OUT) + "\n")
