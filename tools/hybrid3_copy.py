#!/usr/bin/env python3
"""Copy the entry list of the HybriD3 materials database from its public REST API.

HybriD3 (https://materials.hybrid3.duke.edu/) gives its data under CC BY 4.0. A browser page cannot read the API
(the server allows no requests from other sites), so this script makes the copy that the Databases window of
Crysta uses. Run it where the network is open, for example in a GitHub Action:

    python3 tools/hybrid3_copy.py data/hybrid3

It writes into the given folder:
    systems.json    every material: number, names, formula, stoichiometry, organic and inorganic part, dimensionality
    datasets.json   every data set, without its data points: number, material, property, space group, reference
    sample-structure-dataset.json   one full "atomic structure" data set, to show the form of the API answer
    copy-info.json  the date of the copy and the counts
"""
import datetime
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

BASE = "https://materials.hybrid3.duke.edu/materials/"
AGENT = "Crysta database copy (https://github.com/Wenhao-Shao/Crysta)"


def get(url):
    """One page of the API as a dict. Three tries, with a longer wait after each failure."""
    url = url.replace("http://", "https://")
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            print("  try", attempt + 1, "failed for", url, ":", err, flush=True)
            time.sleep(5 * (attempt + 1))
    raise SystemExit("The HybriD3 API did not answer: " + url)


def pages(endpoint, size):
    """Every result of an endpoint, page after page. Returns the results and the count that the API states."""
    url = BASE + endpoint + "/?page=1&page_size=" + str(size)
    out, count = [], None
    while url:
        page = get(url)
        count = page.get("count", count)
        out.extend(page.get("results", []))
        print(" ", endpoint, len(out), "of", count, flush=True)
        url = page.get("next")
        time.sleep(0.5)          # do not load the server
    return out, count


def small_dataset(d):
    """A data set without its data points: what the entry list needs."""
    prop = d.get("primary_property") or {}
    subsets = []
    for s in d.get("subsets") or []:
        if isinstance(s, dict):
            keep = {k: v for k, v in s.items() if k != "datapoints"}
            keep["n_datapoints"] = len(s.get("datapoints") or [])
            subsets.append(keep)
    return {
        "pk": d.get("pk"), "system": (d.get("system") or {}).get("id"), "property": prop.get("name"), "caption": d.get("caption"),
        "is_experimental": d.get("is_experimental"), "sample_type": d.get("sample_type"), "space_group": d.get("space_group"),
        "dimensionality": d.get("dimensionality"), "reference": d.get("reference"), "updated": d.get("updated"), "subsets": subsets,
    }


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "data/hybrid3")
    out.mkdir(parents=True, exist_ok=True)
    systems, n_systems = pages("systems", 100)
    if not systems or (n_systems and len(systems) != n_systems):
        raise SystemExit("The list of materials is not complete: %d of %s" % (len(systems), n_systems))
    systems.sort(key=lambda s: s.get("pk") or 0)
    (out / "systems.json").write_text(json.dumps(systems, ensure_ascii=False, indent=0) + "\n")

    datasets, n_datasets = pages("datasets", 50)
    small, sample = [], None
    for d in datasets:
        small.append(small_dataset(d))
        if sample is None and (d.get("primary_property") or {}).get("name") == "atomic structure":
            sample = d
    small.sort(key=lambda s: s.get("pk") or 0)
    (out / "datasets.json").write_text(json.dumps(small, ensure_ascii=False, indent=0) + "\n")
    if sample is not None:
        (out / "sample-structure-dataset.json").write_text(json.dumps(sample, ensure_ascii=False, indent=1) + "\n")
    info = {
        "source": BASE, "licence": "CC BY 4.0", "read": datetime.date.today().isoformat(),
        "systems": len(systems), "systems_stated": n_systems, "datasets": len(small), "datasets_stated": n_datasets,
        "structure_datasets": sum(1 for s in small if s["property"] == "atomic structure"),
    }
    (out / "copy-info.json").write_text(json.dumps(info, indent=1) + "\n")
    print(json.dumps(info), flush=True)


if __name__ == "__main__":
    main()
