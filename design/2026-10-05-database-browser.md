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
- `data/hybrid3-demo.json`: 81 of the 642 materials. 80 are the newest entries of the API. They were read through a web-reading tool and were not checked line by line.
- `data/hybrid3/2008-geometry.in`: the structure of data set 2008, the one entry of the demo that opens in Crysta.
- `build.py` puts the demo copy into the page, so the offline file works too.

## The full version

### Job

- A script calls `/materials/systems/` and `/materials/datasets/` page by page. It keeps the data sets whose property is "atomic structure".
- For each such data set it stores the data set number, the material number, the space group and the temperature. It also stores the origin (experiment or calculation), the sample type, the reference with its DOI, and the structure as `geometry.in` text.
- A GitHub Action runs the script once a week and commits the result. A run that fails changes nothing.
- The script stops if the number of materials falls by more than 10 % against the last copy. This protects the copy from a broken answer of the server.

### Files

- `docs/data/hybrid3/index.json`: the entry list. The page loads it when the user opens the window.
- `docs/data/hybrid3/<data set>.in`: one structure each. The page loads one when the user presses Open.
- The offline file loads the same files from the published address. Without a connection the window says so and shows the links only.

### Window

- Search by words in the name, formula, other names, organic part and inorganic part. Filter by dimensionality. These are in the demo.
- To add: filter by metal and halide, sort by date, and more than one structure for a material (temperature, experiment and calculation).
- The foot of the window gives the database, the licence and the date of the copy.

### Limits to tell the user

- A HybriD3 structure has no symmetry in its file. Crysta shows the space group that HybriD3 gives, marked "as given by HybriD3". Sites that are the same by symmetry show as separate sites. The PXRD table lists reflections that are the same by symmetry as separate rows.
- The file has no displacement parameters. The PXRD simulation uses *B* = 1 Å² for each atom.

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
