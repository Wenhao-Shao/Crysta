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
| Show, hide or remove each set of polyhedra; several sets per centre element | done, v0.2.1 |
| Polyhedra defined by the user: any centre element, any corner elements, a distance limit, CN above 8 allowed; filled from the form or by clicking a centre and a corner | done, v0.2.1 |
| Colour, opacity and edges per polyhedron row | done, v0.2.1 |
| Centre atoms and their bonds faded inside polyhedra, set per row from left out to solid | done, v0.2.2 |
| Automatic polyhedra around non-metal centres in molecular ions (PF6, SO4, TeCl6) | done, v0.2.1 |
| User polyhedra: a separate distance per corner element; edge width; remembered between visits | later |
| Option for an edited distance to also change the reported coordination numbers and dimensionality | open |
| Editable bond cutoffs per element pair | next |

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
| Two-tone or gradient bond colour | done, v0.2.1 |
| Atom size and bond width for the whole picture | done, v0.2.3 |
| Element colour schemes: Crysta, Jmol classic, Soft, Colour-blind safe, Framework first | done, v0.2.3 |
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
| Simulated powder XRD pattern with a reflection table, in its own window | done, v0.3.0 |
| Measured PXRD data (two-column text) compared with the simulated patterns | done, v0.3.0 |
| PXRD: preferred orientation (March-Dollase), a peak width that changes with angle, background | later |
| PXRD: fit of the scale, the 2θ zero and the cell to measured data | later |
| PXRD: more data formats (.xrdml, .raw, .brml), f′ and f″ at any wavelength, ions, neutrons | later |
| PXRD: *d* axis on top of the plot, and the shown patterns saved as one CSV table | done, v0.3.1 |
| Background menu for the whole page: browser default, white or black | done, v0.3.1 |
| Rail cards that minimize and maximize | done, v0.3.0 |
| Minimized cards remembered between visits | later |
| Symmetry elements, voids, contacts shorter than van der Waals | later |
| Bond orders and aromatic rings in the mol2 file | later |

### SVG export: what was chosen

A true vector drawing: atoms as circles, bonds as strokes, polyhedron faces and lattice planes as
translucent polygons, cell edges, hydrogen bonds and measurements as lines, labels as real text,
written back to front. Atoms are shaded with a radial highlight or filled flat. Objects that cross
each other in depth are approximated, because a vector file has no depth buffer.

## 5. Databases

| Item | Status |
|---|---|
| Databases window: search of the HybriD3 entry list with a download link for each data set, and links to the NMSE 2D perovskite database and COD | done (v0.4.0) |
| Reader for FHI-aims `geometry.in`, and for a zip file such as the download of a HybriD3 data set | done (v0.4.0) |
| Structures of HybriD3 that open with one press, from a copy in the page | demo on the branch `database-browser-demo`. Open: the licence of the CIFs |
| Schedule for the job that reads the HybriD3 entry list | next |
| Contact with the HybriD3 group: requests from other sites, and an "Open in Crysta" link | open |
| Contact with the NMSE group: permission for a copy | open |
| Search of COD inside Crysta | later |

## 6. Name, release and promotion

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
