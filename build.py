#!/usr/bin/env python3
"""Assemble the workbench from src/ into two single-file pages.

docs/index.html                     loads 3Dmol.js from a CDN (for GitHub Pages)
dist/2D-Perovskite-Workbench.html   embeds 3Dmol.js, works offline
"""
import json, pathlib

root = pathlib.Path(__file__).parent
version = json.loads((root / "package.json").read_text())["version"]
template = (root / "src/workbench.template.html").read_text()
core = (root / "src/core.js").read_text()
table = (root / "src/sg-table.json").read_text()
example = (root / "examples/tetrazine-PbCl4.cif").read_text()
lib = (root / "vendor/3Dmol-min.js").read_text()
for part in (core, table, example, lib):
    assert "</script" not in part.lower()

body = (template.replace("/*__CORE__*/", core).replace("__CIF__", example)
        .replace("__SGTABLE__", table).replace("__VERSION__", "v" + version))
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
(root / "docs/index.html").write_text(page(cdn))
(root / "dist/2D-Perovskite-Workbench.html").write_text(page(inline))
print("built v" + version)
