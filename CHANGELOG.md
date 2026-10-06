# Changelog

Any change to how a number is defined gets a new version and a line here.

## v0.5.0

- **Planes in the Measure card.** Make a plane, then measure against it.
  - A plane goes through three or more atoms that you click (the least-squares plane, with its rms distance). Or it is a lattice plane (*hkl*) through one atom that you click. For a layered structure, "Layer plane" gives the plane of the layers through an atom.
  - **Atom to plane:** click one atom for its distance from the plane. The sign is + on the side of the short line that the plane shows in the picture.
  - **Bond to plane:** click two atoms for the angle between their line and the plane, 0° to 90°.
  - Crysta gives the angle between each two planes, 0° to 90°.
  - A structure can have 6 planes. The picture and the SVG drawing show the planes and the measurements.
- **Each row of the framework card has its definition and its picture.** Press a row of the Inorganic framework card. The strip under the picture gives the definition of that number. Press the row again, press Close, or press Escape to close it.
  - For most rows, the picture shows what the definition uses, and it glows in and out:
    - a bond length: the two atoms and the bond
    - a mean bond length, Δ*d* or *σ*²: the metal and its bonds
    - cis X–M–X: the two bonds of the smallest angle and the two bonds of the largest angle, each with the mark of its angle (an arc)
    - an M–X–M bridge: the two bonds, the three atoms and the mark of the angle
    - the axial M–X angle: the axial bonds, the layer normal and the layer plane at each metal, and the mark of each angle
    - the slab: the two planes of terminal halides of a layer, and the distance between them
    - the organic gallery: the two halide planes that face each other, and the distance between them
    - the N penetration: the N, the halide plane that it is measured from, and the line between them
    - the stacking offset: the two metals, the normal, the shift and the two in-plane M···M vectors
  - Connectivity, layer thickness and layer spacing have the definition only.
  - While a row glows, each polyhedron is drawn as its edges only: its faces hide the bonds inside.
  - A saved PNG shows the glow at one fixed strength. If the system asks for less motion, the glow does not move.
  - If the packing box cuts a bridge, the part inside the box glows.
- **The lattice plane nearest to a plane through atoms.** For each plane through atoms, the Planes list gives the nearest (*hkl*) and the angle between the two planes. "Set h k l" puts these indexes in the boxes.
- **Powder XRD:** an arrow at the top right of the reflection table minimizes or maximizes it, as on the side panels. With the table minimized, the plot has the height.

New definitions (see the README): plane through atoms, lattice plane through an atom, nearest lattice plane, atom to plane, bond to plane, plane to plane. No other definition changed: every other number is identical to v0.4.0.

## v0.4.0

- **Databases window.** The "Databases" button in the page header opens a window with three tabs.
  - **HybriD3 (Duke):** the entry list of HybriD3, all 642 materials, read on 2026-10-06. Search by words and filter by dimensionality. Each entry shows its compound name, its common names (short forms such as pF1PEA2PbI4 first) and its IUPAC name. The Formula column gives the formula unit from the stoichiometry of HybriD3, with C and H first.
  - Each structure data set of an entry has a Download link, with its space group, its temperature and the kind of its files. 410 materials have structure files at HybriD3: 435 CIFs and 222 FHI-aims geometry files. The link gets the files from HybriD3 as a zip file.
  - **2D perovskite database (NMSE)** and **COD:** a link, the steps and the citation. Download the CIF there and drop it on Crysta.
- **Crysta holds no structure file of a database.** The page has the entry list only (HybriD3 gives it under CC BY 4.0). The structure files come from HybriD3 to your computer when you press Download.
- **Zip files.** Drop a zip file on Crysta and each structure file in it opens. The download of a HybriD3 data set is such a file:
  - Crysta opens its CIFs, or its geometry file if it has no CIF. A data set with several CIFs (a temperature series) opens as one structure for each file.
  - The structure shows its source, licence and reference under the title and in the Crystal data card. Crysta reads the data set number from the `info.txt` of the download.
- Crysta reads FHI-aims `geometry.in` files. Some HybriD3 data sets have their structure only in this format. It has no symmetry: Crysta then shows the space group "as given by HybriD3".
- `tools/hybrid3_copy.py` makes the entry list. A browser page cannot read HybriD3: the server sends no `Access-Control-Allow-Origin` header for the API and for the downloads. So a GitHub job runs the script. Start the job by hand. The job opens each download to find the kind of its files, but it keeps no file.
- The design notes are in `design/2026-10-05-database-browser.md`. A demo that holds a copy of the structure files is on the branch `database-browser-demo`. It is not released: the licence of the CIFs is an open point.

No definition changed: every number is identical to v0.3.3.

## v0.3.3

- **A CIF with several structures.** Crysta now reads every data block of a CIF that holds atoms. Each block opens as a structure of its own, named after the file and the block, and is a row in the Structures table. Before, Crysta read only the first block and did not say that the file held more.
- A block that cannot be read does not stop the others. The strip under the picture names it.

No definition changed: every number is identical to v0.3.2.

## v0.3.2

- The online page counts visits with Google Analytics. The tag loads only on the published address; the offline file (`dist/Crysta.html`), a copy opened from disk and a fork send nothing. Structure files stay on your computer as before: only the page visit is counted. The page footer says so.

No definition changed: every number is identical to v0.3.1.

## v0.3.1

- **PXRD plot: *d* axis.** A second axis on top of the plot gives the *d* spacing in Å for the first wavelength. Its ticks are round *d* values.
- **PXRD plot: Save CSV.** The button saves every shown pattern in one table for the full 2θ range. The first column is 2θ. Each shown pattern has one intensity column. A pattern that is not shown has no column. The values are as plotted: the highest point of each pattern is 100, and measured data include their 2θ shift.
- The 2θ column is the grid of the Pattern settings (range and step). Crysta puts measured data on this grid by linear interpolation. A cell is empty where a pattern has no points.
- **Background menu.** The page header has a Background menu: Browser default, White or Black. White and Black give the page, the 3D picture, the saved PNG and SVG, and the PXRD window one flat background. White uses the light colours and Black the dark colours. Browser default follows the light or dark setting of the browser, as before. The browser keeps the choice for the next visit.

No definition changed: every number is identical to v0.3.0.

## v0.3.0

- **Powder XRD window.** The "Powder XRD" button in the page header opens a new browser window. The window shows the simulated powder pattern of each open structure. If the browser blocks the new window, the same content opens as a floating window in the page.
- The default radiation is Cu Kα1 at 1.54059 Å, as one wavelength. You can select Mo, Co, Fe, Cr or Ag, or type a different wavelength. You can add Kα2 with an intensity ratio.
- A reflection table lists *h*, *k*, *l*, *d*, *F* (real), *F* (imaginary), |*F*|, 2θ, *I* and the multiplicity *M* of one structure. Press a row to mark that reflection in the plot. You can copy the table or save it as tab-separated text.
- **Measured data.** "Add PXRD data" reads a text file with two columns: 2θ in degrees, then intensity (.xy, .xye, .csv, .txt, .dat). Crysta ignores header lines. You can also drop the file on the PXRD window or on the main page. Each data set has a 2θ shift for a zero-point error. The data stay in the browser.
- The plot shows the patterns as an overlay or as a stack. The intensity scale is linear or square root. Each reflection has a mark. Drag across the plot to zoom. The pointer shows 2θ, *d*, the value of each pattern and the nearest reflection.
- The plot saves as PNG or SVG. The simulated pattern saves as an .xy file.
- Structure files now give the displacement parameters: *U*iso, *B*iso or *U*eq from a CIF, and *U* from a SHELX file.
- **Side panels fold.** Each card in the rail on the right has an arrow at its top right. The arrow minimizes or maximizes the card. A press on the card title does the same. When the page opens, Display is open and the other cards are minimized.

No definition changed: every number is identical to v0.2.3. The definitions of the powder pattern are new. They are in the README: scattering factors, dispersion, displacement, multiplicity, intensity and peak shape.

Checked on eight structures: |*F*| agrees with the structure-factor calculator of gemmi 0.7.5 to better than 0.05 %. The ring intensities agree with a sum over every *h k l* in the sphere to better than 0.01 % of the strongest ring.

## v0.2.3

- New default look: atoms and bonds are drawn at half their earlier radius in the ball-and-stick and sticks styles, and bonds are gradient-coloured. Space-filling is unchanged.
- Two sliders in the Display card: **Atom size** and **Bond width**, each from 0.25× to 3×. They scale every sphere and every stick in the picture, the PNG and the SVG, on top of the size set per element in the legend. 2× gives the sizes of v0.2.2. They hold for the session, across structures.
- An **Element colours** menu in the Display card with five schemes: Crysta (as before), Jmol classic, Soft (pastel), Colour-blind safe (the eight Okabe-Ito hues, shared by element group) and Framework first (C, H and N in greys, metals and halides vivid). A colour set for one element in the legend stays when the scheme changes. The choice holds for the session.
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
