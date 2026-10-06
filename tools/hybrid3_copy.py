#!/usr/bin/env python3
"""Copy the entry list and the structures of the HybriD3 materials database.

HybriD3 (https://materials.hybrid3.duke.edu/) gives its data under CC BY 4.0. A browser page cannot read its API
or its download links (the server allows no requests from other sites), so this script makes the copy that the
Databases window of Crysta uses. Run it where the network is open, for example in a GitHub Action:

    python3 tools/hybrid3_copy.py data/hybrid3                the list of materials
    python3 tools/hybrid3_copy.py data/hybrid3 --structures   also every "atomic structure" data set

It writes into the given folder:
    systems.json          every material: number, names, formula, stoichiometry, organic and inorganic part
    structures.json       every structure data set: number, material, space group, temperature, origin, reference
    structures/<n>.in     the structure of data set n: the FHI-aims geometry file from the download of HybriD3
    copy-info.json        the date of the copy and the counts
    copy-log.txt          what the script did, for a run whose console cannot be read

The server is slow at times: a request can need a minute, or get no answer. So each request has several tries,
one data set that fails does not stop the copy, and a second run reads only what is new or was not read.
"""
import datetime
import io
import json
import math
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

SITE = "https://materials.hybrid3.duke.edu"
BASE = SITE + "/materials/"
AGENT = "Crysta database copy (https://github.com/Wenhao-Shao/Crysta)"
PAGE = 5              # structure data sets for each request of the list: they are large
BUDGET = 75 * 60      # seconds: stop in good order before the job is cut off
LOG = []
START = time.time()


def say(*parts):
    line = " ".join(str(x) for x in parts)
    LOG.append(line)
    print(line, flush=True)


def fetch(url, timeout=60, tries=4):
    """The bytes of one address, or None when the server gives no good answer in several tries."""
    url = url.replace("http://", "https://")
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None
            say("  try", attempt + 1, "HTTP", err.code, url)
        except Exception as err:                      # time-out, broken connection
            say("  try", attempt + 1, type(err).__name__, url)
        time.sleep(4 * (attempt + 1))
    return None


def fetch_json(url, **kw):
    raw = fetch(url, **kw)
    if raw is None:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except ValueError:
        return None


def all_systems():
    out, url = [], BASE + "systems/?page=1&page_size=100"
    count = None
    while url:
        page = fetch_json(url, timeout=180)
        if page is None:
            raise RuntimeError("The list of materials did not come: " + url)
        count = page.get("count", count)
        out.extend(page.get("results", []))
        say("  materials", len(out), "of", count)
        url = page.get("next")
        time.sleep(0.5)
    if not out or (count and len(out) != count):
        raise RuntimeError("The list of materials is not complete: %d of %s" % (len(out), count))
    out.sort(key=lambda s: s.get("pk") or 0)
    return out


def small(d):
    """What the entry list needs from one structure data set of the API."""
    system = d.get("system")
    ref = d.get("reference") if isinstance(d.get("reference"), dict) else {}
    subsets = [s for s in (d.get("subsets") or []) if isinstance(s, dict)]
    fixed = []
    for s in subsets:
        for fv in s.get("fixed_values") or []:
            if not isinstance(fv, dict):
                continue
            prop, unit = fv.get("physical_property"), fv.get("unit")
            value = next((fv[k] for k in ("formatted", "value", "value_type") if k in fv), None)
            fixed.append({"name": prop.get("name") if isinstance(prop, dict) else prop,
                          "unit": unit.get("label") if isinstance(unit, dict) else unit, "value": value})
    return {
        "pk": d.get("pk"), "system": system.get("id") if isinstance(system, dict) else system,
        "caption": d.get("caption") or "", "space_group": d.get("space_group") or "",
        "crystal_system": (subsets[0].get("crystal_system") if subsets else "") or "",
        "is_experimental": d.get("is_experimental"), "sample_type": d.get("sample_type") or "",
        "representative": d.get("representative"), "updated": d.get("updated") or "", "fixed": fixed,
        "reference": {k: ref.get(k) for k in ("title", "journal", "vol", "pages_start", "pages_end", "year", "doi_isbn") if ref.get(k)},
        "linked_to": [x.get("id") for x in (d.get("linked_to") or []) if isinstance(x, dict)],
    }


def structure_list():
    """Every "atomic structure" data set of the API, in small pages. A page that fails is read one entry at a time."""
    q = "datasets/?primary_property__name=" + urllib.parse.quote_plus("atomic structure")
    first = fetch_json(BASE + q + "&page=1&page_size=1", timeout=120)
    if first is None:
        raise RuntimeError("The list of structure data sets did not come.")
    count = first.get("count") or 0
    out, missed = {}, 0
    for page in range(1, math.ceil(count / PAGE) + 1):
        if time.time() - START > BUDGET:
            say("  time is up in the list, at page", page)
            return out, count, False
        got = fetch_json(BASE + q + "&page=%d&page_size=%d" % (page, PAGE), timeout=90, tries=2)
        results = got.get("results", []) if got else None
        if results is None:
            results = []
            for one in range((page - 1) * PAGE + 1, min(count, page * PAGE) + 1):
                single = fetch_json(BASE + q + "&page=%d&page_size=1" % one, timeout=90, tries=2)
                if single and single.get("results"):
                    results.extend(single["results"])
                else:
                    missed += 1
                    say("  entry", one, "of the list did not come")
        for d in results:
            try:
                e = small(d)
                out[e["pk"]] = e
            except Exception as err:                  # the form of one entry was not as expected
                missed += 1
                say("  data set not read:", d.get("pk") if isinstance(d, dict) else "?", repr(err))
        if page % 10 == 0:
            say("  list:", len(out), "of", count, "| %d s" % (time.time() - START))
        time.sleep(0.3)
    return out, count, missed == 0


def download(pk):
    """The geometry file and the info text of one data set, from its download. None when there is no geometry."""
    raw = fetch(BASE + "datasets/%d/files/" % pk, timeout=60)
    if raw is None:
        return None
    try:
        z = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        return None
    names = [i.filename for i in z.infolist() if not i.is_dir()]
    geo = [n for n in names if n.lower().endswith(".in")]
    geo.sort(key=lambda n: (0 if "geometry" in n.lower() else 1, n))
    info = next((n for n in names if n.lower().endswith("info.txt")), None)
    text = z.read(geo[0]).decode("utf-8", "replace") if geo else None
    return {"names": names, "geometry": text, "file": geo[0] if geo else None,
            "info": z.read(info).decode("utf-8", "replace") if info else ""}


def from_info(info):
    """The citation line and the temperature that the info text of a download gives."""
    ref = re.search(r"^Reference:\s*(.+)$", info, re.M)
    temp = re.search(r"temperature\s*=\s*([-\d.]+)\s*K", info)
    return (ref.group(1).strip() if ref else ""), (temp.group(1) if temp else "")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    with_structures = "--structures" in sys.argv
    out = pathlib.Path(args[0] if args else "data/hybrid3")
    (out / "structures").mkdir(parents=True, exist_ok=True)
    info = {"source": BASE, "licence": "CC BY 4.0", "read": datetime.date.today().isoformat()}
    old_info = {}
    if (out / "copy-info.json").exists():
        try:
            old_info = json.loads((out / "copy-info.json").read_text())
        except ValueError:
            old_info = {}
    failed = False
    try:
        systems = all_systems()
        (out / "systems.json").write_text(json.dumps(systems, ensure_ascii=False, indent=0) + "\n")
        info["systems"] = len(systems)
        say("materials written:", len(systems))

        if with_structures:
            index_file = out / "structures.json"
            old = {}
            if index_file.exists():
                try:
                    old = {e["pk"]: e for e in json.loads(index_file.read_text())}
                except (ValueError, KeyError, TypeError):
                    old = {}
            listed, stated, whole = structure_list()
            say("structure data sets in the list:", len(listed), "of", stated)
            # a list that is not whole keeps the entries of the last copy
            index = dict(old) if not whole else {}
            got = kept = none = 0
            for n, (pk, e) in enumerate(sorted(listed.items())):
                target = out / "structures" / ("%d.in" % pk)
                before = old.get(pk)
                if before and before.get("updated") == e["updated"] and before.get("has_file") and target.exists():
                    e.update({k: before[k] for k in ("has_file", "file", "citation", "temperature", "files") if k in before})
                    index[pk] = e
                    kept += 1
                    continue
                if time.time() - START > BUDGET:
                    say("  time is up in the downloads, at data set", pk)
                    whole = False
                    if before:
                        index[pk] = before
                    continue
                d = download(pk)
                if d is None or not d["geometry"]:
                    none += 1
                    e.update(has_file=False, files=(d or {}).get("names", []))
                    say("  no geometry file for data set", pk, (d or {}).get("names"))
                else:
                    target.write_text(d["geometry"])
                    citation, temp = from_info(d["info"])
                    e.update(has_file=True, file=d["file"], citation=citation, temperature=temp, files=d["names"])
                    got += 1
                index[pk] = e
                if (got + none) % 50 == 0:
                    say("  downloads:", got, "read,", none, "without geometry,", kept, "kept | %d s" % (time.time() - START))
                    index_file.write_text(json.dumps([index[k] for k in sorted(index)], ensure_ascii=False, indent=0) + "\n")
                time.sleep(0.3)
            index_file.write_text(json.dumps([index[k] for k in sorted(index)], ensure_ascii=False, indent=0) + "\n")
            # a file of a data set that HybriD3 no longer lists goes away, but only when the list is whole
            if whole:
                for f in (out / "structures").glob("*.in"):
                    if not (f.stem.isdigit() and int(f.stem) in index and index[int(f.stem)].get("has_file")):
                        f.unlink()
            info.update(structures_stated=stated, structures=len(index), structures_with_file=sum(1 for e in index.values() if e.get("has_file")),
                        structures_whole=whole, read_now=got, kept=kept, without_geometry=none)
            say("structures:", json.dumps({k: info[k] for k in ("structures", "structures_with_file", "structures_whole", "read_now", "kept", "without_geometry")}))
        else:
            # a run without the structures keeps what the last run with them wrote
            for k in ("structures_stated", "structures", "structures_with_file", "structures_whole"):
                if k in old_info:
                    info[k] = old_info[k]
    except Exception as err:
        failed = True
        say("FAILED:", repr(err))
    info["complete"] = not failed
    info["seconds"] = int(time.time() - START)
    (out / "copy-info.json").write_text(json.dumps(info, indent=1) + "\n")
    (out / "copy-log.txt").write_text("\n".join(LOG) + "\n")
    say(json.dumps(info))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
