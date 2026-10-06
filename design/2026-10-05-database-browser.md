# Databases window: design

Status: demo on the branch `database-browser-demo`. Not released. This page records what was agreed and what is open.

## Goal

A Crysta user finds a published structure in an outside database and opens it in Crysta. Crysta gives credit to the database and to the paper.

## What we found

| | HybriD3 (Duke) | 2D perovskite database (NMSE) | COD |
|---|---|---|---|
| Address | https | http only | https |
| Licence | CC BY 4.0, stated for all data | none found | not stated on the pages that were read |
| Machine access | REST API, open, no login. 642 materials and 2,093 data sets on 2026-10-05 | none found, and robots.txt disallows automatic reading | REST API: search, and CIF by number |
| Read from a browser page | Blocked. The server sends no `Access-Control-Allow-Origin` header (tested from the Crysta page) | Not possible from an https page | not tested |
| Structure file | FHI-aims `geometry.in`: every atom of the cell, no symmetry, no occupancy, no displacement parameters | CIF | CIF |

## Decisions

1. **HybriD3: a copy with the page.** A job reads the HybriD3 API on a schedule. It writes an entry list and the structure files into the Crysta site. The Databases window searches the list and opens a structure with one press. CC BY 4.0 allows this with attribution.
2. **NMSE: a link.** The window gives the address, the steps and the citation. The user downloads the CIF there and drops it on Crysta. A copy needs the permission of the owners.
3. **COD: a link for now.** A search inside Crysta is possible later if COD allows requests from other sites.
4. **Credit goes with the structure.** A structure from a database shows the database, the data set, the licence and the reference with its DOI. Crysta shows them under the title and in the Crystal data card.
5. **Live access replaces the copy if Duke allows it.** If the HybriD3 server allows requests from other sites, the window reads the API directly. The window stays the same.

## The demo

The demo shows the window and the flow. It does not have the job and it does not have the full list.

- `src/dbs.js`: the Databases window. Tabs: HybriD3, NMSE, COD.
- `src/core.js`: `readAims` reads `geometry.in` (`lattice_vector`, `atom`, `atom_frac`).
- `tools/hybrid3_copy.py` and the job `.github/workflows/hybrid3-copy.yml`: read the list of materials from the API and commit it. The job runs on GitHub because this is where the network is open.
- `data/hybrid3/systems.json`: all 642 materials, exactly as the API gave them on 2026-10-06.
- `data/hybrid3/structures.json` and `data/hybrid3/structures/<data set>.in`: every "atomic structure" data set, and its geometry file from the download of HybriD3.
- `build.py` puts the entry list and the structure files into the page, so the offline file works too. The page reads the structure files only when the user opens the first structure.
- Each entry shows the compound name, the common names and the IUPAC name. The formula is the formula unit from the stoichiometry field, with C and H first.

### What the runs of the job showed

- The list of materials needs 7 requests and some seconds.
- The list of all data sets is slow. With 20 data sets for each page, page 12 did not answer in 180 s, three times.
- The list takes a filter: `?primary_property__name=atomic+structure` gives the 786 structure data sets. `?system=<material>` gives the data sets of one material.
- The download of a data set, `/materials/datasets/<n>/files/`, is a zip with `info.txt` and the structure files. The names are not fixed. Of the 786 structure data sets:
  - 393 have a CIF (`files/structure.cif`, a name of the authors, or `files/additional/<name>.cif`). 13 of them have 2 to 9 CIFs: a temperature series, or the R and S forms.
  - 241 have an FHI-aims geometry file. 18 of these also have the CIF.
  - 170 have no structure file. HybriD3 holds only the cell parameters for them.
  - One "geometry.in" is a CIF. The job finds the kind of a file from its lines, not from its name.
- The job takes the CIFs when they hold atoms, and the geometry files if they do not. The job takes a file from `additional/` only when the top folder has no file of that kind.
- Many CIFs hold the reflection data (the hkl text of SHELX, the `_twin_refln_` loops of Jana). One CIF had 4.6 MB. The job removes this data: the 435 CIFs then have 11 MB.
- Crysta reads and analyses all 750 structures of the 657 files (28 CIFs have more than one data block) in 11 s.
- The download sends no `Access-Control-Allow-Origin` header. A browser page can start the download, but it cannot read the file. So the job reads the downloads, and the page gets the copy.
- The server stops for a time now and then: a request that needs 0.2 s can need 20 s to 120 s. The script tries again, goes on after a failure, and a second run reads only what is missing.

## The full version

### Job

- The script calls `/materials/systems/` page by page. It then lists the "atomic structure" data sets in small pages and reads each structure from the download of its data set. Done in `tools/hybrid3_copy.py`.
- For each such data set it stores the data set number, the material number, the space group and the temperature. It also stores the origin (experiment or calculation), the sample type, the reference with its DOI, and the structure files (`structures/<data set>_<i>.cif` or `.in`).
- A GitHub Action runs the script and commits the result. To do: a weekly schedule, on the main branch.
- The script stops if the number of materials falls by more than 10 % against the last copy. This protects the copy from a broken answer of the server.

### Files

- The demo puts the entry list and every structure file into the page. This makes the page larger for each visitor: the 657 files add 2.9 MB (packed with gzip and written as base64). Without the packing they are 10 MB. The page unpacks them when the user opens the first structure (0.3 s).
- To decide for the full version: keep them in the page, or store them next to the page (`docs/data/hybrid3/`) and load one structure when the user presses Open. The second way keeps the page small, but the offline file then needs a connection.

### Window

- Search by words in the name, formula, other names, organic part and inorganic part. Filter by dimensionality. These are in the demo.
- To add: filter by metal and halide, sort by date, and more than one structure for a material (temperature, experiment and calculation).
- The foot of the window gives the database, the licence and the date of the copy.

### Limits to tell the user

- A geometry file from HybriD3 has no symmetry. Crysta shows the space group that HybriD3 gives, marked "as given by HybriD3". Sites that are the same by symmetry show as separate sites. The PXRD table lists reflections that are the same by symmetry as separate rows.
- A geometry file has no displacement parameters. The PXRD simulation uses *B* = 1 Å² for each atom.
- A CIF from HybriD3 has the two. The window shows the kind of file for each data set.
- The space group and the temperature in the window are those that HybriD3 states for the data set. A CIF can state other values, and a data set with several CIFs has one value in HybriD3. Crysta shows the values of the file after it opens.

### Tests

- `readAims`: done in `tests/run.js` (cell, atoms, layers, `atom_frac`, molecule, broken lattice).
- The job: a test with a saved API answer, so the test needs no network.
- The window: a browser test that searches, opens an entry and checks the credit.

## Open points

1. Write to the HybriD3 group at Duke. Tell them about the copy. Ask them to allow requests from other sites. Offer an "Open in Crysta" link from their pages.
2. Write to the NMSE group: ask for permission for a copy, or for https and requests from other sites.
3. Test COD for requests from other sites.
4. Read the `info.txt` of a HybriD3 download, so that a dropped file also gets its reference.
5. Decide where the copy lives: in the Crysta repository or in a repository of its own.
6. Ask the HybriD3 group about the CIFs. HybriD3 gives all its data under CC BY 4.0. But 87 of the 435 CIFs have a CCDC deposition number, and 58 have the access notice of the CCDC. Other CIFs come from the supporting information of a paper. Get the answer of the group before a release that holds the CIFs.
