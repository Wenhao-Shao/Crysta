# Changelog

Any change to how a number is defined gets a new version and a line here.

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
