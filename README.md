# Crysta

Crysta is a crystal workbench that runs in a browser: a single-page tool for crystal structures. Drop in one or more structure files and it expands
the symmetry, works out the bonding, sorts the atoms into frameworks, networks and whole molecules,
draws the structure in 3D, and lets you measure, label, compare and export. Layered metal halides
also get the layer descriptors that 2D perovskite papers use. Nothing is installed and no data leaves
the browser.

Crysta grew out of the 2D Perovskite Workbench (this repository was called `perovskite-workbench` until v0.2.0).
What is planned next is in [ROADMAP.md](ROADMAP.md).

## Use it

- **Online:** https://wenhao-shao.github.io/Crysta/ (`docs/index.html`, which loads 3Dmol.js from a CDN).
- **Offline:** open `dist/Crysta.html` in any browser. The 3D library is embedded.

Press "Load the sample structures" to load the four built-in samples: (PEA)2PbBr4, (FCA3)2PbBr4 at 294 K
(CCDC 2485416), α-quartz and urea. Or drop your own files on the viewer.

## File formats

| Format | Read | Notes |
|---|---|---|
| CIF | yes | symmetry from the listed operators, or from the Hall symbol, H-M symbol or IT number |
| SHELX `.res`, `.ins` | yes | CELL, LATT, SYMM, SFAC, FVAR, PART; occupancies corrected for site multiplicity |
| VASP `POSCAR`, `CONTCAR`, `.vasp` | yes | version 5 (with the line of element symbols); no symmetry in this format |
| XYZ, extended XYZ | yes | with `Lattice="..."` the cell is used; without it the file is shown as a single molecule with no lattice |
| Tripos mol2 | write | the shown block, with the cell |
| PNG | write | 1×, 2× or 4× the screen size, optional transparent background |
| SVG | write | vector drawing of the view; every atom, bond and face is a separate editable object |

## What it does

- **Viewer:** ball and stick, space-filling or sticks; two-tone or gradient bonds; coordination polyhedra; hydrogen bonds; molecule
  and framework toggles; atom labels; packing limits in cell fractions; views down a cell axis, a [uvw]
  direction or an (hkl) normal; lattice planes with an offset.
- **Measure:** click atoms for a distance (two), an angle (three, at the second) or a torsion (four). Remove one from the list in the Measure card or by a right-click on it in the picture; Clear removes all.
- **Polyhedra:** automatic around metal centres, and your own: choose a centre element, the corner elements and a distance in the Polyhedra card, or click a centre and a corner in the picture. Press a row to set colour, opacity and edges.
- **Element appearance:** press an element in the legend to set its colour, size and opacity.
- **Structure types:** metal-anion frameworks (oxides, sulfides, halides), frameworks joined through
  molecular linkers, covalent networks, molecular crystals, molecular complexes and salts.
- **2D perovskite module:** layer thickness n, spacing, slab and gallery height, in-plane and out-of-plane
  M-X-M angles, axial tilt, ammonium N penetration, stacking offset. Shown when a layered,
  halide-bridged framework is found.
- **Chromophores:** pick three or more atoms on one molecule for a plane and two for an in-plane axis.
  The definition is copied to every symmetry-equivalent molecule. Each chromophore holds any number of
  transition-dipole states, drawn as double-headed arrows. 1,2,4,5-tetrazine rings are found
  automatically.
- **Comparison:** every loaded structure is a row in one table, which copies to the clipboard as
  tab-separated text for a spreadsheet.
- **Export:** a PNG image of the view, an SVG vector drawing of it, or a mol2 file of the shown atoms.

## Feedback

Press "Send feedback" in the page header to report a bug or suggest an improvement. The box offers two routes:

- **Send to Wenhao Shao:** the note is delivered privately through [Formspree](https://formspree.io), a form
  service. No account is needed. An optional email address allows a reply.
- **Continue on GitHub:** the note opens as a pre-filled issue on this repository's
  [Issues](https://github.com/Wenhao-Shao/Crysta/issues) page, where you review and submit it
  with a GitHub account. The issue is public and the email field is left out.

Either way, only the note, the Crysta version and the browser are sent. No structure data is sent.

## Definitions

These choices decide the numbers, so they are stated here. Changing any of them needs a version bump.

| Quantity | Definition |
|---|---|
| Covalent bond | two non-metals closer than the sum of Cordero covalent radii plus 0.45 Å |
| Metal-halide bond | distance below the sum of covalent radii plus 0.75 Å |
| Metal-donor bond | metal to any other non-metal except H and the noble gases, below the sum of covalent radii plus 0.5 Å; an atom with four or more covalent bonds is not a donor |
| Polyhedron centre | any metal except Li, Na, K, Rb, Cs, Fr, which are free ions unless they are the only metals with anions around them |
| Polyhedron | drawn for 4 to 8 bonded neighbours |
| Polyhedron you define | centre element, corner elements and a largest centre-to-corner distance; drawn for 3 or more corners (3 is a triangle); drawn next to the automatic polyhedra and to other sets, also with the same centre element; changes the picture only |
| Polyhedron centre in the picture | the centre atom and its bonds are drawn faded inside a polyhedron: 25 % by default, set per row from 0 % (left out) to 100 % (solid); it stays in the mol2 file and in every number |
| Suggested distance | for each centre the nearest shell ends at the widest relative gap (at least 12 %) among its first 12 sorted distances; the suggestion is the widest shell times 1.08, but at most halfway to the nearest next shell |
| Covalent network | a set of covalently bonded atoms that a lattice translation joins to itself (diamond, quartz, graphite) |
| Non-metal polyhedron | B, Si, P, As, S, Se or Te with 4 to 8 bonded neighbours, all of them O, N, F, S, Se, Cl, Br or I; in networks, molecules and molecular ions |
| Molecular complex | a finite bonded unit that holds a metal and its ligands; drawn whole |
| Framework dimensionality | number of independent lattice translations that join the bonded network holding the metal centres to itself |
| Layer spacing | d(hkl) of the layer plane divided by the number of layers per repeat |
| Layer descriptors | reported for a 2D framework whose bridges between metals are all halides |
| Layer thickness n | number of distinct metal planes in one slab |
| Slab thickness | distance between the two planes of terminal halides of one slab |
| Organic gallery | layer spacing minus slab thickness |
| Δd | (1/6) Σ ((d − d̄)/d̄)² over the six M–X bonds of an octahedron |
| σ² | (1/11) Σ (θ − 90°)² over the twelve cis X–M–X angles of an octahedron |
| Octahedron | six neighbours with three trans angles above 150° |
| θ in | M–X–M angle after projecting onto the layer plane |
| θ out | M–X–M angle after projecting onto the plane holding M···M and the layer normal |
| Axial tilt | acute angle between an axial M–X bond and the layer normal |
| N penetration | depth of an ammonium N below the plane of terminal halides; positive is inside the layer |
| Stacking offset | in-plane shift between adjacent layers in units of the two in-plane M···M vectors; (½, ½) is ideal Ruddlesden–Popper, (0, 0) ideal Dion–Jacobson |
| Hydrogen bond | N–H or O–H donor; H···A at least 0.15 Å inside the Bondi van der Waals sum and D–H···A above 120°; acceptors are O and N of another molecule and halide, O, N or S anions |
| Torsion | −180° to 180°, positive when the far bond is clockwise from the near bond looking down the central bond |
| mol2 atom types | SYBYL types guessed from the element and the number of bonded neighbours; every bond written as single |
| SVG drawing | the screen view without perspective; objects written back to front by the depth of their centre; of each polyhedron only the faces turned to the viewer |

## Disorder

- Flagged parts: within each disorder assembly the group with the highest mean occupancy is shown.
- Unflagged split sites: two non-H atoms of one element closer than 0.9 Å are treated as alternates
  and the first listed is shown.
- Negative part numbers (disorder over a symmetry element): one orientation is kept.
- All geometry is computed on the shown component. The formula and density use every part, weighted
  by occupancy.
- A file that holds a single component and no flags is treated as ordered.

## Known limits

- Bonds between two metals are not drawn, so elements and alloys appear as separate atoms.
- H is never taken as a ligand of a metal, so hydrides show no M–H bonds.
- A-site ions other than the alkali metals (Ba, Sr, La in oxide perovskites) are treated as bonded
  centres; with more than 8 neighbours they get bonds but no polyhedron.
- The non-perovskite structure classes are tested on constructed files with literature cell and
  coordinates, not yet on a set of deposited structures.
- SHELX, POSCAR and XYZ reading is tested on one small file each.
- Quasi-2D (n > 1) and symbol-only paths are tested on constructed files only.
- There is no way yet to choose a disorder component other than the major one.
- A chromophore follows crystallographic sites, so a structure with two independent cations needs one
  definition per cation.
- The stacking-offset and tilt descriptors assume corner-sharing layers.
- Polyhedra you define use one distance for all their corner elements, and are not kept after the page is closed.
- Appearance is set per element, not per atom or per site, and is not kept after the page is closed.
- An element drawn see-through keeps solid bonds.
- The mol2 file carries no bond orders or charges.
- The SVG drawing sorts whole objects by depth, so objects that pass through each other (a bond through a polyhedron face, crossing lattice planes) can overlap in the wrong order. It has no perspective and no lighting beyond the shaded atom fill.

## Develop

```
python3 build.py      # writes docs/index.html and dist/Crysta.html
node tests/run.js     # regression tests for src/core.js
```

- `src/core.js`: file reading, symmetry, bonding, geometry, mol2 and SVG writers. Pure functions, no DOM, runs in Node.
- `src/workbench.template.html`: the page and its interface code.
- `src/sg-table.json`: Hermann–Mauguin symbol to Hall symbol, for CIFs that list no operators.
- `examples/`: the CIFs embedded as built-in samples. The reflection list was removed from the
  (FCA3)2PbBr4 file (CCDC 2485416) to keep the page small, and its CCDC number was added as a data item.
  The quartz and urea files were written for Crysta from literature values.
- `tests/`: regression tests, including operator lists for every tabulated Hall symbol, one small
  structure per crystal class in `tests/cifs/`, and one file per extra format in `tests/files/`.
- `vendor/`: 3Dmol.js 2.5.5 (BSD-3-Clause) for the offline build.

The name and version live in `package.json` (`displayName`, `version`) and are printed in the page.

## Licence

MIT. See `LICENSE`. 3Dmol.js is distributed under its own BSD-3-Clause licence, see `vendor/`.
