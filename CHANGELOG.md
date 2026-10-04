# Changelog

Any change to how a number is defined gets a new version and a line here.

## v0.2.3

- Two sliders in the Display card: **Atom size** and **Bond width**, each from 0.25× to 2×. They scale every sphere and every stick in the picture, the PNG and the SVG, on top of the size set per element in the legend. They hold for the session, across structures.
- The SVG drawing now looks like the picture. Polyhedron faces have no outline unless "Draw the edges" is on; each face is as bright as the viewer's light makes it and has the viewer's opacity; where see-through faces overlap, only the nearest is drawn, as on the screen. Faded centre atoms and their bonds use the colours of the screen. Before, the faces were outlined, paler and stacked, and faded centres were nearly invisible.

No definition changed: every number is identical to v0.2.2.

## v0.2.2

- Inside a polyhedron the centre atom and its bonds are drawn faded, so the polyhedron reads first. Each row of the Polyhedra card has a "Centre atoms" slider: 100 % draws them solid as before, 0 % leaves them out. The default is 25 %, for the automatic polyhedra and for the ones you add, so the picture of a structure with polyhedra looks different from v0.2.1 when it opens. The fading is used by the PNG and the SVG too. A centre set to 0 % stays in the mol2 file. An atom with no polyhedron drawn around it is never faded, and switching the polyhedra off draws everything solid.
- The strip under the picture is one row of fixed height, so the picture no longer jumps when the pointer passes over an atom. It shows the latest measurement; the Measure card lists them all.
- The Structures table starts at its header row, with a "Copy table" button next to "Structure".

No definition changed: every number is identical to v0.2.1.

## v0.2.1

- Measurements can be removed one at a time: each is listed in the Measure card with a Remove button, a Clear button removes them all, and a right-click on a measurement in the picture opens a menu to remove it. Up to 20 are kept.
- Element appearance: press an element in the legend to change its colour, size and opacity. The change applies to every atom of that element in every loaded structure, and is used by the PNG and SVG exports. A see-through element keeps solid bonds.
- Polyhedra you define yourself: a Polyhedra card where any element can be the centre and any elements the corners, within a distance you set. The card suggests the distance of the nearest shell, shows how many corners that gives before you add it, and can be filled by clicking a centre atom and one corner atom in the picture. Three corners are drawn as a triangle. The card warns when the centre lies outside its corners, which means the distance reaches into a neighbouring unit. The distance stays editable in the list. Each set you add is drawn next to the automatic ones and next to your other sets, so one element can be the centre of several sets (Co with O, Co with Li, Co with Se). Automatic sets can be removed with their cross and brought back with one button. Sets belong to one structure, and are used by the PNG and SVG exports. They change the picture only: coordination numbers, framework dimensionality and the layer descriptors are computed as before.
- In the Structures table the control that removes a structure is a cross at the left of its name.
- Each row of the Polyhedra card opens to set the colour, opacity and edges of those polyhedra, automatic or your own.
- Bond colour: a Two-tone / Gradient switch in the Display card. Two-tone gives each half of a bond the colour of its atom; Gradient fades from one atom's colour to the other's. PNG and SVG exports follow it.
- The Structures table is three rows high; with more structures it scrolls, with the header kept in view.

Definitions that changed:

- **Saturated atoms are not ligands.** An atom that already has four or more covalent bonds is no longer counted as bonded to a metal, however close it sits. Before, Te of TeCl6 next to Cs, or an sp3 carbon next to a large cation, could be counted in the coordination number.
- **Halides beside a metal keep their covalent bonds.** A halide bonded to a non-metal centre (Cl of TeCl6) stays part of that unit when a metal is also near. Before, any halide within reach of a metal was taken out of its molecule.
- **Automatic polyhedra around non-metal centres.** B, Si, P, As, S, Se and Te with 4 to 8 bonded neighbours, all of them O, N, F, S, Se, Cl, Br or I, get a polyhedron in molecules and molecular ions too (PF6, SO4, TeCl6), not only in covalent networks.

Checked: every number reported for the six layered halide structures is still identical to v0.1.5.

## v0.2.0

The workbench becomes a general crystal viewer and is renamed **Crysta**. The 2D perovskite analysis is unchanged and now runs as a module.

Definitions that changed:

- **Bonding to metals.** A metal centre now bonds to any non-metal except H and the noble gases, not only to halides. Halides keep the old cutoff (covalent radii plus 0.75 Å); every other donor uses covalent radii plus 0.5 Å. A metal with O, N, S or C neighbours inside that distance now counts them in its coordination number.
- **Framework dimensionality.** It is now taken from the whole bond graph, so a framework joined through molecular linkers (cyanide, carboxylate) is found. For a metal-halide framework the result is the same as before.
- **Layer descriptors.** They are reported only for a 2D framework whose bridges between metals are all halides. Slab thickness and axial tilt use halide ligands only.
- **Alkali ions.** They are polyhedron centres when no other metal has anions around it (NaCl); otherwise they stay free ions as before.
- **Polyhedra.** Drawn for 4 to 8 neighbours; larger shells get bonds only.
- **Octahedral distortion (Δd, σ²).** Reported only for six-coordinate sites that are octahedra (three trans angles above 150°), not for trigonal prisms.
- **Hydrogen bonds.** Acceptors now include O, N and S anions of a framework, next to halides and the O and N of molecules.
- **Elements.** Radii and masses cover H to Cm. Before, an atom of an element outside the table was dropped without a message, which gave a wrong formula and density.

Checked: every number reported for six layered halide structures (two samples, two constructed files, two further real structures) is identical to v0.1.5.

New:

- Covalent networks (diamond, graphite, quartz) are recognised and drawn atom by atom; SiO4, BO4 and PO4 units in a network get polyhedra.
- Molecular complexes and clusters are drawn as whole units.
- Atom sites that cannot be read are listed in a warning and in the Crystal data card.
- File formats: SHELX .res and .ins, VASP POSCAR and CONTCAR, XYZ and extended XYZ, next to CIF.
- Measure: distance, angle and torsion by clicking atoms.
- Atom labels.
- Export: PNG image at 1×, 2× or 4× with an optional transparent background; SVG vector drawing of the view, with shaded or flat atoms, in which every atom, bond and face is a separate editable object; Tripos mol2 file of the shown block.
- The comparison table leaves out columns that are empty for every loaded structure.
- Two more built-in samples: α-quartz and urea.
- Name: the tool is Crysta, set by `displayName` in `package.json`. The repository is renamed from `perovskite-workbench` to `Crysta`, the published address becomes https://wenhao-shao.github.io/Crysta/, and the offline file is `dist/Crysta.html`. The last column of the copied table is now headed "Crysta version".
- Drawing many labels no longer redraws the scene once per label.
- `ROADMAP.md` lists what is planned.

## v0.1.5

- The feedback box has two buttons: "Send to Wenhao Shao" delivers the note privately through Formspree with no account needed, and "Continue on GitHub" opens the pre-filled public issue as before. An optional email field allows a reply to a direct note.
- No change to any definition.

## v0.1.4

- A "Send feedback" button in the page header opens a box for bug reports and improvement notes. Submitting it opens a pre-filled issue at https://github.com/Wenhao-Shao/perovskite-workbench/issues.
- No change to any definition.

## v0.1.3

- The page header has a "W. Shao Lab" button that links back to the lab website, https://wenhao-shao.github.io/.
- No change to any definition.

## v0.1.2

- The (FCA3)2PbBr4 294 K sample is marked as CCDC 2485416 in the CIF, the page and the README.
- The Crystal data card shows a CIF's CCDC deposition number when it has one.
- No change to any definition.

## v0.1.1

- Built-in samples are now (PEA)2PbBr4 and (FCA3)2PbBr4 at 294 K; the earlier example structure was removed.
- Layered structures now open edge-on, with the layer normal pointing up.
- No change to any definition.

## v0.1.0

First version.

- CIF reading, symmetry expansion, whole-molecule assembly, metal-halide polyhedra.
- Symmetry operators from the file, or generated from a Hall symbol, H-M symbol or IT number.
- Layer descriptors: thickness n, spacing, slab and gallery height, M-X-M split into in-plane
  and out-of-plane angles, axial tilt, ammonium N penetration, stacking offset.
- Octahedral distortion (delta d, sigma squared), hydrogen bonds.
- User-defined chromophores with any number of transition-dipole states; tetrazine preset.
- Packing limits, views along [uvw] and (hkl) normals, lattice planes.
- Multi-structure comparison table, copied as tab-separated text.
- Disorder: major part shown by default; unflagged split sites detected by distance.
