#!/usr/bin/env python3
"""Assemble the workbench from src/ into two single-file pages.

docs/index.html          loads 3Dmol.js from a CDN (for GitHub Pages)
dist/<Name>.html         embeds 3Dmol.js, works offline (dist/Crysta.html)

The online page counts visits with Google Analytics ("analytics" in package.json, only when it is
served from the host of "homepage"). The offline file carries no such code.

The name shown in the page comes from "displayName" in package.json.
The address in the canonical link and the link-preview tags comes from "homepage".
"""
import json, pathlib, urllib.parse

root = pathlib.Path(__file__).parent
pkg = json.loads((root / "package.json").read_text())
version = pkg["version"]
name = pkg["displayName"]
tagline = pkg["tagline"]
template = (root / "src/workbench.template.html").read_text()
core = (root / "src/core.js").read_text()
pxrd = (root / "src/pxrd.js").read_text()
dbs = (root / "src/dbs.js").read_text()
# Copy of a database entry list for the Databases window (demo: a part of HybriD3). The structure files that the
# list names are put into it as text, so the page needs no other file.
h3 = root / "data/hybrid3"
h3info = json.loads((h3 / "copy-info.json").read_text())
h3structures = json.loads((h3 / "demo-structures.json").read_text())["structures"]
# number of "atomic structure" data sets of each material, when the copy has the list of data sets
h3count = {}
if (h3 / "datasets.json").exists():
    for ds in json.loads((h3 / "datasets.json").read_text()):
        if ds.get("property") == "atomic structure":
            h3count[ds.get("system")] = h3count.get(ds.get("system"), 0) + 1
h3materials = []
for sy in json.loads((h3 / "systems.json").read_text()):
    mine = []
    for st in h3structures:
        if st["system"] == sy["pk"]:
            one = {k: v for k, v in st.items() if k not in ("file", "system")}
            one["text"] = (h3 / st["file"]).read_text()
            mine.append(one)
    h3materials.append({
        "pk": sy["pk"], "name": sy.get("compound_name") or "", "iupac": sy.get("iupac") or "", "aliases": sy.get("group") or "",
        "formula": sy.get("formula") or "", "stoich": sy.get("stoichiometry") or "",
        "organic": "" if (sy.get("organic") or "") == "None" else (sy.get("organic") or ""), "inorganic": sy.get("inorganic") or "",
        "dim": sy.get("dimensionality"), "n": sy.get("n") or "", "updated": sy.get("last_update") or "",
        "onSite": h3count.get(sy["pk"]) if h3count else None, "structures": mine})
databases = json.dumps({
    "id": "hybrid3", "name": "HybriD3 materials database", "home": "https://materials.hybrid3.duke.edu/", "licence": "CC BY 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by/4.0/", "read": h3info["read"], "total": len(h3materials), "demo": True,
    "materials": h3materials}, ensure_ascii=False)
table = (root / "src/sg-table.json").read_text()
# built-in samples: file in examples/, name shown in the page
SAMPLES = [
    ("PEA2PbBr4.cif", "PEA2PbBr4.cif"),
    ("FCA3_2PbBr4_294K.cif", "(FCA3)2PbBr4_294K, CCDC 2485416.cif"),
    ("quartz_SiO2.cif", "alpha-quartz SiO2.cif"),
    ("urea.cif", "urea.cif"),
]
samples = json.dumps([{"name": shown, "text": (root / "examples" / f).read_text()} for f, shown in SAMPLES])
lib = (root / "vendor/3Dmol-min.js").read_text()
for part in (core, pxrd, dbs, table, lib, samples, databases):
    assert "</script" not in part.lower() and "<!--" not in part

body = (template.replace("/*__CORE__*/", core).replace("/*__PXRD__*/", pxrd).replace("/*__DBS__*/", dbs).replace("__SAMPLES__", samples)
        .replace("__DATABASES__", databases)
        .replace("__SGTABLE__", table).replace("__VERSION__", "v" + version)
        .replace("__NAME__", name).replace("__TAGLINE__", tagline)
        .replace("__HOMEPAGE__", pkg["homepage"]))
cdn = '<script src="https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js"></script>'
inline = "<script>/* 3Dmol.js 2.5.5, BSD-3-Clause, https://3dmol.org */\n" + lib + "\n</script>"
# Visit counting, online page only. The tag loads only on the published host, so a copy opened from disk,
# a fork or a local test server sends nothing. Structure files are never part of what is sent.
ga = (pkg.get("analytics") or {}).get("id", "")
host = urllib.parse.urlparse(pkg["homepage"]).hostname
assert not ga or (ga.startswith("G-") and ga.replace("-", "").isalnum())
analytics = ("<script>\n/* Counts visits to the online page (Google Analytics). Not present in the offline file. */\n"
             "if (location.hostname === " + json.dumps(host) + ") {\n"
             "  var s = document.createElement('script'); s.async = true;\n"
             "  s.src = 'https://www.googletagmanager.com/gtag/js?id=" + ga + "'; document.head.appendChild(s);\n"
             "  window.dataLayer = window.dataLayer || [];\n"
             "  window.gtag = function () { dataLayer.push(arguments); };\n"
             "  gtag('js', new Date()); gtag('config', '" + ga + "');\n"
             "}\n</script>") if ga else ""
visits = " The online page counts visits with Google Analytics; the offline file does not." if ga else ""
cut = body.index('<div class="app">')
head, rest = body[:cut], body[cut:]

def page(lib_tag, online):
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<style>body{margin:0}img{max-width:100%}</style>\n' + head.replace("<!--ANALYTICS-->\n", analytics + "\n" if online and analytics else "") + '</head>\n<body>\n'
            + rest.replace("<!--LIB-->", lib_tag).replace("__VISITS__", visits if online else "") + '\n</body>\n</html>\n')

(root / "docs").mkdir(exist_ok=True)
(root / "dist").mkdir(exist_ok=True)
for old in (root / "dist").glob("*.html"):
    old.unlink()
(root / "docs/index.html").write_text(page(cdn, True))
(root / "dist" / (name.replace(" ", "-") + ".html")).write_text(page(inline, False))
print("built v" + version + " as " + name)
