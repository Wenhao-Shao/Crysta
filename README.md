# 2D Perovskite Workbench

A single-page browser tool for layered metal-halide structures. Drop in one or more CIF files and it
expands the symmetry, separates the inorganic framework from whole organic molecules, draws the
structure in 3D, and reports the layer descriptors that 2D perovskite papers use. Nothing is installed
and no data leaves the browser.

## Use it

- **Offline:** open `dist/2D-Perovskite-Workbench.html` in any browser. The 3D library is embedded.
- **Online:** `docs/index.html` is the same page loading 3Dmol.js from a CDN. Turn on GitHub Pages for
  the `docs/` folder to give it a public address.

Press "Load the tetrazine example" to see a worked structure, or drop your own CIFs on the viewer.

## What it does

- **Viewer:** ball and stick, space-filling or sticks; coordination polyhedra; hydrogen bonds; organic
  and inorganic toggles; packing limits in cell fractions; views down a cell axis, a [uvw] direction
  or an (hkl) normal; lattice planes with an offset; click two atoms for a distance.
- **Chromophores:** pick three or more atoms on one molecule for a plane and two for an in-plane axis.
  The definition is copied to every symmetry-equivalent molecule. Each chromophore holds any number of
  transition-dipole states, drawn as double-headed arrows. 1,2,4,5-tetrazine rings are found
  automatically.
- **Comparison:** every loaded structure is a row in one table, which copies to the clipboard as
  tab-separated text for a spreadsheet.

## Definitions

These choices decide the numbers, so they are stated here. Changing any of them needs a version bump.

| Quantity | Definition |
|---|---|
| Covalent bond | distance below the sum of Cordero covalent radii plus 0.45 Å |
| Metal-halide bond | distance below the sum of covalent radii plus 0.75 Å |
| Polyhedron centre | any metal except Li, Na, K, Rb, Cs, which are treated as A-site ions |
| Framework dimensionality | rank of the lattice translations that connect the metal-halide network to itself |
| Layer spacing | d(hkl) of the layer plane divided by the number of layers per repeat |
| Layer thickness n | number of distinct metal planes in one slab |
| Slab thickness | distance between the two planes of terminal halides of one slab |
| Organic gallery | layer spacing minus slab thickness |
| Δd | (1/6) Σ ((d − d̄)/d̄)² over the six M–X bonds |
| σ² | (1/11) Σ (θ − 90°)² over the twelve cis X–M–X angles |
| θ in | M–X–M angle after projecting onto the layer plane |
| θ out | M–X–M angle after projecting onto the plane holding M···M and the layer normal |
| Axial tilt | acute angle between an axial M–X bond and the layer normal |
| N penetration | depth of an ammonium N below the plane of terminal halides; positive is inside the layer |
| Stacking offset | in-plane shift between adjacent layers in units of the two in-plane M···M vectors; (½, ½) is ideal Ruddlesden–Popper, (0, 0) ideal Dion–Jacobson |
| Hydrogen bond | H···A at least 0.15 Å inside the Bondi van der Waals sum and D–H···A above 120° |

## Disorder

- Flagged parts: within each disorder assembly the group with the highest mean occupancy is shown.
- Unflagged split sites: two non-H atoms of one element closer than 0.9 Å are treated as alternates
  and the first listed is shown.
- Negative part numbers (disorder over a symmetry element): one orientation is kept.
- All geometry is computed on the shown component. The formula and density use every part, weighted
  by occupancy.
- A CIF that holds a single component and no flags is treated as ordered.

## Known limits

- Quasi-2D (n > 1), symbol-only and flagged-disorder paths are tested on constructed files only.
- There is no way yet to choose a disorder component other than the major one.
- A chromophore follows crystallographic sites, so a structure with two independent cations needs one
  definition per cation.
- The stacking-offset and tilt descriptors assume corner-sharing layers.

## Develop

```
python3 build.py      # writes docs/index.html and dist/2D-Perovskite-Workbench.html
node tests/run.js     # regression tests for src/core.js
```

- `src/core.js`: CIF parsing, symmetry, geometry. Pure functions, no DOM, runs in Node.
- `src/workbench.template.html`: the page and its interface code.
- `src/sg-table.json`: Hermann–Mauguin symbol to Hall symbol, for CIFs that list no operators.
- `examples/`: the structure embedded as the built-in example.
- `tests/`: regression tests, including operator lists for every tabulated Hall symbol.
- `vendor/`: 3Dmol.js 2.5.5 (BSD-3-Clause) for the offline build.

The version lives in `package.json` and is printed in the page footer and in the copied table.

## Licence

MIT. See `LICENSE`. 3Dmol.js is distributed under its own BSD-3-Clause licence, see `vendor/`.
