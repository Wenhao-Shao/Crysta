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
    copy-log.txt    what the script did, for a run whose console cannot be read

The list of materials is written first. If the data sets fail, the list of materials stays.
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
LOG = []


def say(*parts):
    line = " ".join(str(x) for x in parts)
    LOG.append(line)
    print(line, flush=True)


def get(url):
    """One page of the API as a dict. Three tries, with a longer wait after each failure."""
    url = url.replace("http://", "https://")
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            say("  try", attempt + 1, "failed for", url, ":", repr(err))
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("The HybriD3 API did not answer: " + url)


def pages(endpoint, size):
    """Every result of an endpoint, page after page. Returns the results and the count that the API states."""
    url = BASE + endpoint + "/?page=1&page_size=" + str(size)
    out, count = [], None
    while url:
        page = get(url)
        count = page.get("count", count)
        out.extend(page.get("results", []))
        say(" ", endpoint, len(out), "of", count)
        url = page.get("next")
        time.sleep(0.5)          # do not load the server
    return out, count


def small_dataset(d):
    """A data set without its data points: what the entry list needs."""
    prop = d.get("primary_property")
    prop = prop if isinstance(prop, dict) else {"name": prop}
    system = d.get("system")
    system = system.get("id") if isinstance(system, dict) else system
    subsets = []
    for s in d.get("subsets") or []:
        if isinstance(s, dict):
            keep = {k: v for k, v in s.items() if k != "datapoints"}
            points = s.get("datapoints")
            keep["n_datapoints"] = len(points) if isinstance(points, (list, dict)) else 0
            subsets.append(keep)
    return {
        "pk": d.get("pk"), "system": system, "property": prop.get("name"), "caption": d.get("caption"),
        "is_experimental": d.get("is_experimental"), "sample_type": d.get("sample_type"), "space_group": d.get("space_group"),
        "dimensionality": d.get("dimensionality"), "reference": d.get("reference"), "updated": d.get("updated"), "subsets": subsets,
    }


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "data/hybrid3")
    out.mkdir(parents=True, exist_ok=True)
    info = {"source": BASE, "licence": "CC BY 4.0", "read": datetime.date.today().isoformat()}
    failed = False
    try:
        systems, n_systems = pages("systems", 100)
        if not systems or (n_systems and len(systems) != n_systems):
            raise RuntimeError("The list of materials is not complete: %d of %s" % (len(systems), n_systems))
        systems.sort(key=lambda s: s.get("pk") or 0)
        (out / "systems.json").write_text(json.dumps(systems, ensure_ascii=False, indent=0) + "\n")
        info.update(systems=len(systems), systems_stated=n_systems)
        say("materials written:", len(systems))

        # the data sets are large, so a small page; one bad data set does not stop the copy
        datasets, n_datasets = pages("datasets", 20)
        small, sample, bad = [], None, 0
        for d in datasets:
            try:
                small.append(small_dataset(d))
                if sample is None and small[-1]["property"] == "atomic structure":
                    sample = d
            except Exception as err:                      # the form of one entry was not as expected
                bad += 1
                say("  data set not read:", d.get("pk") if isinstance(d, dict) else "?", repr(err))
        small.sort(key=lambda s: s.get("pk") or 0)
        (out / "datasets.json").write_text(json.dumps(small, ensure_ascii=False, indent=0) + "\n")
        if sample is not None:
            (out / "sample-structure-dataset.json").write_text(json.dumps(sample, ensure_ascii=False, indent=1) + "\n")
        info.update(datasets=len(small), datasets_stated=n_datasets, datasets_not_read=bad,
                    structure_datasets=sum(1 for s in small if s["property"] == "atomic structure"))
        say("data sets written:", len(small))
    except Exception as err:
        failed = True
        say("FAILED:", repr(err))
    info["complete"] = not failed
    (out / "copy-info.json").write_text(json.dumps(info, indent=1) + "\n")
    (out / "copy-log.txt").write_text("\n".join(LOG) + "\n")
    say(json.dumps(info))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
