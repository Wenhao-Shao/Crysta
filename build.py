#!/usr/bin/env python3
"""Assemble the workbench from src/ into two single-file pages.

docs/index.html          loads 3Dmol.js from a CDN (for GitHub Pages)
dist/<Name>.html         embeds 3Dmol.js, works offline (dist/Crysta.html)

The name shown in the page comes from "displayName" in package.json.
The address in the canonical link and the link-preview tags comes from "homepage".
"""
import json, pathlib

root = pathlib.Path(__file__).parent
pkg = json.loads((root / "package.json").read_text())
version = pkg["version"]
name = pkg["displayName"]
tagline = pkg["tagline"]
template = (root / "src/workbench.template.html").read_text()
core = (root / "src/core.js").read_text()
pxrd = (root / "src/pxrd.js").read_text()
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
for part in (core, pxrd, table, lib, samples):
    assert "</script" not in part.lower() and "<!--" not in part

body = (template.replace("/*__CORE__*/", core).replace("/*__PXRD__*/", pxrd).replace("__SAMPLES__", samples)
        .replace("__SGTABLE__", table).replace("__VERSION__", "v" + version)
        .replace("__NAME__", name).replace("__TAGLINE__", tagline)
        .replace("__HOMEPAGE__", pkg["homepage"]))
cdn = '<script src="https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js"></script>'
inline = "<script>/* 3Dmol.js 2.5.5, BSD-3-Clause, https://3dmol.org */\n" + lib + "\n</script>"
cut = body.index('<div class="app">')
head, rest = body[:cut], body[cut:]

def page(lib_tag):
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<style>body{margin:0}img{max-width:100%}</style>\n' + head + '</head>\n<body>\n'
            + rest.replace("<!--LIB-->", lib_tag) + '\n</body>\n</html>\n')

(root / "docs").mkdir(exist_ok=True)
(root / "dist").mkdir(exist_ok=True)
for old in (root / "dist").glob("*.html"):
    old.unlink()
(root / "docs/index.html").write_text(page(cdn))
(root / "dist" / (name.replace(" ", "-") + ".html")).write_text(page(inline))
print("built v" + version + " as " + name)
