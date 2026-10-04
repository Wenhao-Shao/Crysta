# Roadmap

The goal: a free crystal-structure viewer and analysis page that runs in a browser with nothing to
install, for crystals in general, with the 2D perovskite analysis kept as a built-in module.

Status marks: **done** (released), **next** (agreed, not started), **later** (agreed to wait),
**open** (needs a decision).

## 1. Correctness for any crystal

| Item | Status |
|---|---|
| Full periodic table for radii and masses, H to Cm | done, v0.2.0 |
| A visible warning for every atom site that cannot be read | done, v0.2.0 |
| Regression tests per crystal class (oxide, sulfide, alkali halide, element, covalent network, molecular crystal, complex, linker framework) | done, v0.2.0 |
| Tests on real deposited CIFs of each class, beyond the constructed files | next |
| Metal hydrides: H is never taken as a ligand | later |
| Metal-metal bonds (elements, alloys, clusters) are not drawn | later |

## 2. General bonding and frameworks

| Item | Status |
|---|---|
| Metals bond to any non-metal donor (O, S, N, C, halides, ...) | done, v0.2.0 |
| Polyhedra for any metal centre with 4 to 8 neighbours | done, v0.2.0 |
| Covalent networks (diamond, quartz, graphite) drawn atom by atom, with SiO4/BO4/PO4 polyhedra | done, v0.2.0 |
| Dimensionality from the whole bond graph, through molecular linkers (MOF-type frameworks) | done, v0.2.0 |
| Molecular complexes and clusters drawn as whole units | done, v0.2.0 |
| Alkali ions as polyhedron centres when they are the only metals (NaCl) | done, v0.2.0 |
| Switch polyhedra on or off per element | done, v0.2.1 |
| Polyhedra defined by the user: any centre element, any corner elements, a distance limit, CN above 8 allowed; filled from the form or by clicking a centre and a corner | done, v0.2.1 |
| User polyhedra: a separate distance per corner element; a colour per rule; remembered between visits | later |
| Option for an edited distance to also change the reported coordination numbers and dimensionality | open |
| Editable bond cutoffs per element pair | next |
| Polyhedra around P and S inside molecular oxyanions (PO4 in LiFePO4, SO4) | later |

## 3. Perovskite analysis as a module

| Item | Status |
|---|---|
| Layer descriptors run only when a 2D halide-bridged framework is found | done, v0.2.0 |
| All 2D perovskite numbers unchanged from v0.1.5 (checked on six structures) | done, v0.2.0 |
| Choose a disorder component other than the major one | next |
| Quasi-2D (n > 1) checked on real structures | next |

## 4. Viewer features

| Item | Status |
|---|---|
| Angle and torsion measurement | done, v0.2.0 |
| Remove single measurements (panel list, right-click menu, Clear) | done, v0.2.1 |
| Colour, size and opacity per element, from the legend | done, v0.2.1 |
| Appearance per atom or per crystallographic site; remembered between visits | later |
| Atom labels | done, v0.2.0 |
| PNG export, 1x to 4x, optional transparent background | done, v0.2.0 |
| mol2 export of the shown block | done, v0.2.0 |
| Input beyond CIF: SHELX .res/.ins, POSCAR/CONTCAR, XYZ | done, v0.2.0 |
| SVG export as a true vector drawing, shaded or flat atoms | done, v0.2.0 |
| SVG: split objects that pass through each other, so the depth order is exact | later |
| SVG: PNG-in-SVG variant that looks identical to the screen | later, if wanted |
| Structure export beyond mol2 (CIF, XYZ, POSCAR) | later |
| Thermal ellipsoids from the anisotropic displacement parameters | later |
| Simulated powder XRD pattern | later |
| Symmetry elements, voids, contacts shorter than van der Waals | later |
| Bond orders and aromatic rings in the mol2 file | later |

### SVG export: what was chosen

A true vector drawing: atoms as circles, bonds as strokes, polyhedron faces and lattice planes as
translucent polygons, cell edges, hydrogen bonds and measurements as lines, labels as real text,
written back to front. Atoms are shaded with a radial highlight or filled flat. Objects that cross
each other in depth are approximated, because a vector file has no depth buffer.

## 5. Name, release and promotion

| Item | Status |
|---|---|
| Name: Crysta, set in one place (`displayName` in `package.json`) | done, v0.2.0 |
| Repository renamed to `Crysta`; published address https://wenhao-shao.github.io/Crysta/ | done with v0.2.0 |
| Lab website tab reads "Crystal Workbench" and points to the new address | done with v0.2.0 |
| Citable release with a DOI (Zenodo) and a "how to cite" line in the page | next |
| Short user guide with screenshots | next |
| Comparison table against VESTA, Mercury and CrystalMaker, stating honestly what is and is not covered | next |

Positioning: VESTA and the basic Mercury are already free, so the claim is not "free". It is
"nothing to install, runs in the browser, the file never leaves the computer, with built-in analysis
of hybrid and layered structures".
