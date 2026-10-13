# Crysta

Crysta is a crystal workbench that runs in a browser: a single-page tool for crystal structures. Drop in one or more structure files and it expands
the symmetry, works out the bonding, sorts the atoms into frameworks, networks and whole molecules,
draws the structure in 3D, and lets you measure, label, compare and export. It simulates the powder
XRD pattern of each structure and compares it with your measured data. Layered metal halides
also get the layer descriptors that 2D perovskite papers use. Nothing is installed and no structure data
leaves the browser. The online page counts visits with Google Analytics; the offline file does not.

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
| CIF | yes | symmetry from the listed operators, or from the Hall symbol, H-M symbol or IT number. A file with several data blocks opens as several structures. |
| SHELX `.res`, `.ins` | yes | CELL, LATT, SYMM, SFAC, FVAR, PART; occupancies corrected for site multiplicity |
| FHI-aims `geometry.in` | yes | `lattice_vector`, `atom` and `atom_frac` lines. The format has no symmetry. HybriD3 gives some of its structures in this format. |
| Zip file of the formats above | yes | Each structure file in it opens. From the download of a HybriD3 data set, Crysta opens the CIFs, or the geometry file if there is no CIF. It shows the source and the reference. |
| VASP `POSCAR`, `CONTCAR`, `.vasp` | yes | version 5 (with the line of element symbols); no symmetry in this format |
| XYZ, extended XYZ | yes | with `Lattice="..."` the cell is used; without it the file is shown as a single molecule with no lattice |
| Powder data `.xy`, `.xye`, `.csv`, `.txt`, `.dat` | yes | Two columns of text: 2θ in degrees, then intensity. Crysta ignores header lines. The PXRD window shows the data. |
| Powder pattern `.xy` | write | the simulated pattern on its 2θ grid |
| Powder patterns `.csv` | write | One 2θ column, then one intensity column for each pattern that the plot shows. |
| Tripos mol2 | write | the shown block, with the cell |
| PNG | write | 1×, 2× or 4× the screen size, optional transparent background |
| SVG | write | vector drawing of the view; every atom, bond and face is a separate editable object |

## What it does

- **Viewer:** ball and stick, space-filling or sticks; atom size and bond width sliders; five element colour schemes; two-tone or gradient bonds; coordination polyhedra; hydrogen bonds; molecule
  and framework toggles; atom labels; packing limits in cell fractions; views down a cell axis, a [uvw]
  direction or an (hkl) normal; lattice planes with an offset.
- **Measure:** click atoms for a distance (two), an angle (three, at the second) or a torsion (four). The picture marks the measured atoms. Remove a measurement with its × in the Measure card or by a right-click on it in the picture.
- **Planes:** make a plane through three or more atoms, or a lattice plane (*hkl*) through one atom. Then click one atom for its distance from the plane, two atoms for the angle between their line and the plane, or three atoms for their angle projected onto the plane (Angle in plane). Crysta gives the angle between each two planes, and the lattice plane (*hkl*) that is nearest to a plane through atoms.
- **Polyhedra:** automatic around metal centres, and your own: choose a centre element, the corner elements and a distance in the Polyhedra card, or click a centre and a corner in the picture. Press a row to set colour, opacity and edges.
- **Element appearance:** press an element in the legend to set its colour, size and opacity.
- **Structure types:** metal-anion frameworks (oxides, sulfides, halides), frameworks joined through
  molecular linkers, covalent networks, molecular crystals, molecular complexes and salts.
- **2D perovskite module:** layer thickness n, spacing, slab and gallery height, in-plane and out-of-plane
  M-X-M angles, axial tilt, ammonium N penetration, stacking offset. Shown when a layered,
  halide-bridged framework is found. Press a row of the framework card: its definition shows under the picture, and the atoms and planes of the definition glow in the picture.
- **Chromophores:** pick three or more atoms on one molecule for a plane and two for an in-plane axis.
  The definition is copied to every symmetry-equivalent molecule. Each chromophore holds any number of
  transition-dipole states, drawn as double-headed arrows. 1,2,4,5-tetrazine rings are found
  automatically.
- **Comparison:** every loaded structure is a row in one table, which copies to the clipboard as
  tab-separated text for a spreadsheet.
- **Powder XRD:** the "Powder XRD" button opens a separate window. Each open structure is a reference: select it
  to show its simulated pattern. The reflection table gives *h k l*, *d*, *F*, 2θ, *I* and the multiplicity.
  Add measured data to compare them with the references, as an overlay or as a stack. Cu Kα1 is the default
  radiation. Other anodes, a typed wavelength and Kα2 are options. The top axis of the plot gives *d* in Å.
  The plot saves as PNG or SVG, the shown patterns as one CSV table, the reflection table as text and the
  simulated pattern as an .xy file. The arrow at the top right of the reflection table minimizes it, and the plot then has the height.
- **Background:** the Background menu in the page header sets the whole page to the browser default, to white
  or to black. The 3D picture, the saved pictures and the PXRD window follow.
- **Panels:** the arrow at the top right of each card in the rail minimizes or maximizes the card.
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
| Covalent bond | two non-metals closer than the sum of Cordero covalent radii plus 0.45 Å. Two H, and H with a halide, never bond. Two halides bond only in a polyhalide anion: both with occupancy 1 and neither bound to a metal (I3⁻). |
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
| Layer spacing | the distance between the middle planes of a layer and the next layer, along the layer normal. Interfaces that are not alike each get a value. Their mean is d(hkl) of the layer plane divided by the number of layers per repeat. |
| Layer descriptors | reported for a 2D framework whose bridges between metals are all halides |
| Layer thickness n | number of distinct metal planes in one slab. Metal heights within 1.5 Å are one plane. Crysta gives n for corner-sharing layers only. When two metals of a layer share an edge or a face, n is "not defined". |
| Slab thickness | distance along the layer normal from the mean plane of the terminal halides on the top face of a layer to the mean plane of those on its bottom face. It is not a distance between two atoms. Layers that are not alike each get a value. A terminal halide has a bond to one metal and lies more than 1.0 Å beyond the outer metal plane. |
| Organic gallery | for each interface, the distance from the terminal-halide plane on the top face of one layer to that on the bottom face of the next layer. The faces of corrugated layers can reach into each other. When the gallery is below 0.5 Å, the gallery and the N penetration are "not defined". |
| Shortest X···X across the gallery | for each interface, the shortest distance from a terminal halide on the top face of one layer to one on the bottom face of the next layer. Papers often give this as the interlayer distance. |
| Δd | (1/6) Σ ((d − d̄)/d̄)² over the six M–X bonds of an octahedron |
| σ² | (1/11) Σ (θ − 90°)² over the twelve cis X–M–X angles of an octahedron |
| Octahedron | six neighbours with three trans angles above 150° |
| θ in | M–X–M angle after projecting onto the layer plane |
| θ out | M–X–M angle after projecting onto the plane holding M···M and the layer normal |
| Axial tilt | acute angle between an axial M–X bond and the layer normal |
| N penetration | depth of an ammonium N below the plane of terminal halides. Positive is inside the layer. Only N within 3 Å of a face. An ammonium N has four neighbours with at least two H. It can also have one heavy neighbour and no H (the file does not give the H) or more than three H (two orientations). In a file without H, it has one heavy neighbour. |
| Stacking offset | The shortest in-plane shift from a metal of the top metal plane of one layer to a metal of the bottom metal plane of the next layer. Crysta takes the shortest over all metal pairs and lattice translations. It gives the shift in units of the two shortest in-plane M···M vectors, each from 0 to ½. Shifts and M···M vectors within 0.05 Å of each other are ties, and Crysta gives the smallest offset of the tied choices. Interfaces whose offsets agree within 0.02 share one row, with the smaller value. (½, ½) is ideal Ruddlesden–Popper, (0, 0) ideal Dion–Jacobson. Interfaces that are not alike each get a value. |
| Hydrogen bond, no H given | N/O···halide contacts shorter than the van der Waals sum plus 0.15 Å. Crysta uses this rule in a file without H atoms, and for an N or O whose H the file does not give. An N with four bonds is never an acceptor. |
| Hydrogen bond | N–H or O–H donor. H···A at least 0.15 Å inside the Bondi van der Waals sum, and D–H···A above 120°. Acceptors are O and N of another molecule, and halide, O, N or S anions. Anions bonded to a metal also count (a framework, or a complex such as [BiI6]³⁻), and so do the halides of a polyhalide (I3⁻). The search finds every contact of the molecules of one cell, also across the cell faces. |
| Left-handed lattice vectors | Some geometry.in, POSCAR or extended XYZ files have **a** · (**b** × **c**) < 0. Crysta then uses the basis −**a**, −**b**, −**c**: the same lattice, lengths, angles and atoms, with fractional coordinates −*x*, −*y*, −*z*. The Crystal card tells you. |
| Z | the file's `_cell_formula_units_Z` (or the SHELX ZERR line). A value within 0.02 of an integer is that integer. With no Z, and every atom in a molecule, a complex or a free ion: the smallest whole ratio of these units (four C6H6 molecules: C6H6, Z = 4). Else the greatest common divisor of the element counts. |
| Element from a label | with no type symbol: Pb1, PB1 and pb1 are lead. An upper-case pair is the two-letter element when there is one (CL1, SN1). HO is an exception: it is H. |
| Deuterium | D is H for the picture and every bond rule, and D (2.014 g/mol) in the formula and the density. |
| Space-group symbol | Crysta reads spaces, the choices ":1", ":2", ":H", ":R" and the ICSD suffixes " Z" (origin 2), " S" (origin 1), " H", " R". It also reads the glide e (Cmce = Cmca, Aem2 = Abm2) and the old cubic form (Fm3m = Fm-3m). An R group with no choice gets its axes from the cell, also for a number alone. A group with two origin choices and no choice gets the origin with fewer impossible contacts (closer than 0.6 × the sum of covalent radii). Next, Crysta prefers fewer atoms, else origin 2. The Crystal card tells you which. |
| Torsion | −180° to 180°, positive when the far bond is clockwise from the near bond looking down the central bond |
| Plane through atoms | The least-squares plane through the clicked atoms: it goes through their centroid, and its normal is the direction of least spread. The rms is the root-mean-square distance of these atoms from the plane. |
| Lattice plane through an atom | The plane through the clicked atom with its normal along the reciprocal vector *h* **a**\* + *k* **b**\* + *l* **c**\*. For a layered structure, the *h*, *k*, *l* boxes start at the (*hkl*) of the layers. |
| Atom to plane | The distance of the atom from the plane along the normal, in Å. It is + on the side that the normal points to. For a plane through atoms, the normal follows the order of the clicks. |
| Bond to plane | The angle between the line through the two atoms and the plane, 0° to 90°. 0° is a line in the plane. 90° minus this value is the angle to the normal. |
| Plane to plane | The angle between the two normals, 0° to 90° |
| Angle in plane | The angle A–B–C after both bonds are projected onto the plane: the angle between (A − B) − [(A − B)·**n**]**n** and (C − B) − [(C − B)·**n**]**n**, with **n** the unit normal of the plane. 0° to 180°. No value when a bond is within 2° of **n**. With the layer plane this is θ in. |
| Nearest lattice plane | For a plane through atoms: the (*hkl*) with the smallest largest index that is within 1° of the plane. If no plane is that near, the nearest plane with indexes up to 6. Crysta gives the angle between the two planes. |
| Powder pattern: atoms | The same cell contents as the formula (see Disorder): every copy of every site and every disorder part, each with its share. |
| Scattering factor | Neutral atoms. *f*0(*s*) = Σ *a*i exp(−*b*i *s*²) + *c* with *s* = sin θ / λ. The coefficients are from International Tables C, table 6.1.1.4. Charges in the file are not used. |
| Dispersion | *f*′ and *f*″ (Cromer–Liberman, as computed by gemmi) for the Kα lines of Cu, Mo, Co, Fe, Cr and Ag. They are zero at any other wavelength. |
| Displacement | Isotropic: exp(−*B* *s*²) with *B* = 8π²*U*. The file gives *U*iso, *B*iso or *U*eq. Anisotropic values enter as *U*eq. An atom with no value gets *B* = 1 Å², and you can change that value. |
| Structure factor | *F*(*hkl*) = Σ occupancy × (*f*0 + *f*′ + i*f*″) × exp(−*B* *s*²) × exp(2πi(*hx* + *ky* + *lz*)), summed over the atoms of the cell. |
| Reflection set, *M* | The rotation parts of the space-group operators and Friedel's law make reflections equivalent. *M* is the number of reflections in the set. Sets with the same *d* that are not equivalent are separate rows. |
| Powder intensity | *I* = *M* × (mean \|*F*\|² of the set) × (1 + cos² 2θ) / (sin² θ cos θ). This factor is for a flat sample in reflection, a beam that is not polarised, and no monochromator. The strongest reflection in the 2θ range is 100. |
| \|*F*\| in the table | The root of the mean \|*F*\|² of the set. *F* (real) and *F* (imaginary) are for the reflection that the row names. |
| Peak shape | Pseudo-Voigt with one width at every angle. The defaults are FWHM 0.1° and Lorentzian part 0.5. The area of a peak is its *I*. The highest point of the pattern is 100. |
| Second wavelength | Every reflection occurs again at the angle of λ2. Its intensity is *I* × the intensity ratio × the ratio of the two Lorentz-polarisation factors. |
| Measured data | Columns separated by spaces, tabs, commas or semicolons. Crysta reads decimal commas when a semicolon, a tab or a space separates the columns. Crysta refuses a file with commas for both. Crysta scales each data set so that its highest point in the 2θ range is 100. It subtracts nothing. It adds the 2θ shift to every point. |
| *d* axis of the PXRD plot | *d* = λ1 / (2 sin θ), for the first wavelength only. |
| CSV of the PXRD plot | The 2θ column is the grid of the Pattern settings, for the full range. The values are as plotted. Crysta puts measured data on the grid by linear interpolation between the two nearest points. |
| mol2 atom types | SYBYL types guessed from the element and the number of bonded neighbours; every bond written as single |
| SVG drawing | the screen view without perspective; objects written back to front by the depth of their centre; of each polyhedron only the faces turned to the viewer |

### Thresholds of the layer descriptors

| Choice | Value |
|---|---|
| Metal–halide bond | below the sum of covalent radii plus 0.75 Å. Two layers that one stretched M–X–M bridge joins (up to 0.25 Å beyond this cut-off, angle above 150°) count as one layer. Mn, Fe and Co use the low-spin Cordero radii. |
| Axial bond | within 45.6° of the layer normal (\|cos\| > 0.7) |
| Equatorial bridge | M···M within 60° of the layer plane (\|cos\| < 0.5). Crysta gives θin and θout for these. |
| Metal plane | metal heights within 1.5 Å |
| Terminal halide of a face | bonded to one metal, more than 1.0 Å beyond the outer metal plane |
| Stacking offset label | (0, 0), (½, 0), (½, ½) when each number is within 0.15 of it |
| Octahedron values | none when two ligands of a metal are closer than 0.75 × the sum of their covalent radii. The polyhedron then mixes two disorder orientations. |

## Disorder

- Flagged parts (CIF): Crysta shows the group with the highest mean occupancy in each disorder assembly.
  The rule trusts the assemblies of the file. If a file puts unrelated groups in one assembly, Crysta
  shows only one of them.
- SHELX: the PARTs that refine their occupancy with one free variable are one region. Crysta shows
  the PART with the highest mean occupancy in each region. PARTs with a fixed occupancy are one region.
- Unflagged split sites: two non-H atoms of one element closer than 0.9 Å are alternates. For heavy
  atoms with a covalent radius of 1.0 Å or more, the limit is 1.5 times that radius (I 2.09 Å).
  For two such metals that both have full occupancy, the limit is 1.2 times the radius. Thus a short
  metal–metal bond (Mo–Mo 2.09 Å) stays. Crysta shows the first atom in the list.
- Mixed sites: partly occupied atoms of two elements closer than 0.3 Å, with occupancies that add up
  to 1 or less, are alternates. Crysta shows the element with the higher occupancy.
- Negative part numbers (disorder over a symmetry element): in a named CIF assembly, a negative group is
  an alternative of the other groups of that assembly. On a tie of the mean occupancy, a positive group
  is shown. With no assembly, and in SHELX files, the major-group rule never hides a negative group.
- One orientation of a negative group: the operators make copies of the group that overlap. Crysta keeps
  the copies of the first operator. It also keeps each copy that has no non-H atom closer than 0.75 × the
  sum of the covalent radii to a kept copy. A halide of a group without C is not part of a molecule. Thus
  metals and halides in a negative group keep both orientations. When their polyhedron mixes the two, the
  card tells you and gives no octahedron values.
- All geometry is computed on the shown component.
- The formula, the density and the powder pattern use every part and every copy, weighted by occupancy:
  - Copies of one site closer than 0.05 Å are one position (a special position, also with rounded
    coordinates). Copies 0.05 to 0.15 Å apart are one position too when their occupancies add up to 1.5
    or more. When `_atom_site_symmetry_multiplicity` equals the number of operators (a general position),
    only copies closer than 0.01 Å are one position.
  - Atoms of one element at one position are alternatives: closer than 0.15 Å in one disorder group,
    or, for non-H atoms with no flag, closer than the limit of the split sites above. A group holds only atoms that are all this close
    to each other, so two bonded atoms are never one position. When the occupancies of a group add up to
    more than 1, Crysta scales them to 1. Thus a pair with occupancy 1 each (a geometry.in or POSCAR
    file with both parts of a split site) counts as one atom.
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
- The stacking-offset and tilt descriptors assume corner-sharing layers. Slab, gallery and N penetration assume flat layers: for corrugated layers whose faces reach into each other, Crysta gives no gallery and no penetration.
- Polyhedra you define use one distance for all their corner elements, and are not kept after the page is closed.
- Appearance is set per element, not per atom or per site, and is not kept after the page is closed.
- An element drawn see-through keeps solid bonds.
- The mol2 file carries no bond orders or charges.
- The powder pattern has no preferred orientation, no absorption, no background and no instrument function. The peak width is the same at every angle.
- Crysta has *f*′ and *f*″ for six anodes only. It treats ions as neutral atoms. It simulates X-rays only.
- A structure file without symmetry (POSCAR, XYZ with a lattice) lists reflections that are equivalent in the real symmetry as separate rows.
- For a large cell the simulated 2θ range is cut, and the PXRD window says where.
- Crysta reads measured data from text columns only. It does not read Bruker .raw or .brml files, or PANalytical .xrdml files. It does not fit the simulated pattern to the data.
- The PXRD window belongs to the Crysta page that opened it. It closes when that page closes. Patterns and data are not kept after that.
- The page does not remember the minimized cards after it closes. It does remember the Background choice.
- The CSV of the PXRD plot holds measured data after interpolation, not the measured points. Use a step that is not larger than the step of the measurement.
- The SVG drawing sorts whole objects by depth, so objects that pass through each other (a bond through a polyhedron face, crossing lattice planes) can overlap in the wrong order. It has no perspective and no lighting beyond the shaded atom fill.

## Develop

```
python3 build.py      # writes docs/index.html and dist/Crysta.html
node tests/run.js     # regression tests for src/core.js
```

- `src/core.js`: file reading, symmetry, bonding, geometry, powder diffraction, mol2 and SVG writers. Pure functions, no DOM, runs in Node.
- `src/workbench.template.html`: the page and its interface code.
- `src/pxrd.js`: the PXRD window (plot, reflection table, measured data). It gets its numbers from `core.js`.
- `src/dbs.js`: the Databases window. `design/` holds the design notes.
- `tools/hybrid3_copy.py`: copies the HybriD3 entry list and the list of its structure data sets into `data/hybrid3/`. It keeps no structure file. The job `.github/workflows/hybrid3-copy.yml` runs it by hand. `build.py` puts the lists into the page.
- `src/sg-table.json`: Hermann–Mauguin symbol to Hall symbol, for CIFs that list no operators.
- `examples/`: the CIFs embedded as built-in samples. The reflection list was removed from the
  (FCA3)2PbBr4 file (CCDC 2485416) to keep the page small, and its CCDC number was added as a data item.
  The quartz and urea files were written for Crysta from literature values.
- `tests/`: regression tests, including operator lists for every tabulated Hall symbol, one small
  structure per crystal class in `tests/cifs/`, and one file per extra format in `tests/files/`.
- `vendor/`: 3Dmol.js 2.5.5 (BSD-3-Clause) for the offline build.

The name and version live in `package.json` (`displayName`, `version`) and are printed in the page.

## How to cite

Crysta has no paper and no DOI yet. Cite it as software, with the version:

> W. Shao, Crysta: a crystal structure workbench in the browser, version 0.5.0 (2026). https://wenhao-shao.github.io/Crysta/

- The "How to cite" button in the page gives this citation for the version that you use, also as BibTeX.
- `CITATION.cff` has the same data for GitHub and for reference managers. `build.py` makes it from the "citation" part of `package.json`: change the authors, the title and the release date there.
- Cite also the source of each structure file, and 3Dmol.js for the pictures (N. Rego and D. Koes, *Bioinformatics* **31**, 1322–1324 (2015)).

## Licence

MIT. See `LICENSE`. 3Dmol.js is distributed under its own BSD-3-Clause licence, see `vendor/`.
