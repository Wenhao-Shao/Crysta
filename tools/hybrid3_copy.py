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
    structures/<n>_<i>.cif   structure file i of data set n, from the download of HybriD3: a CIF (.cif) or an
    structures/<n>_<i>.in    FHI-aims geometry file (.in). The CIFs are used when a data set has the two kinds.
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
            say("  try", attempt + 1, type(err).__name__, str(getattr(err, "reason", err))[:80], url)
        time.sleep(10 * (attempt + 1))                # the server stops for a time now and then: wait longer each time
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


LARGE_TEXT = 3000      # characters: a CIF text field above this size is reflection data or a refinement file
LARGE_FILE = 1500000   # characters: a structure file above this size is not put in the copy


def text_of(raw):
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def kind_of(text):
    """"cif" or "in" (FHI-aims geometry), from the lines of the file. HybriD3 has CIFs with the name geometry.in."""
    if re.search(r"^\s*data_", text, re.M) and "_cell_length_a" in text:
        return "cif"
    return "in"


def has_atoms(text, kind):
    if kind == "cif":
        return "_atom_site_fract_x" in text
    return len(re.findall(r"^\s*lattice_vector\s", text, re.M)) >= 3 and bool(re.search(r"^\s*atom(_frac)?\s", text, re.M))


def slim_cif(text):
    """A CIF without its reflection data: the large text fields (the hkl and res files that SHELX puts in a CIF)
    and the _refln_ loops. The cell, the symmetry, the atoms and the other items stay as they are."""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith(";"):                        # a text field goes to the next line that starts with ";"
            j = i + 1
            while j < len(lines) and not lines[j].startswith(";"):
                j += 1
            field = lines[i:j + 1]
            k = len(out) - 1
            while k >= 0 and not out[k].strip():
                k -= 1
            if sum(len(x) + 1 for x in field) > LARGE_TEXT and k >= 0 and re.fullmatch(r"_\S+", out[k].strip()):
                del out[k:]                           # the item name goes with its text
            else:
                out.extend(field)
            i = j + 1
            continue
        if ln.strip().lower() == "loop_":
            j, tags = i + 1, []
            while j < len(lines) and lines[j].strip().startswith("_"):
                tags.append(lines[j].split()[0].lower())
                j += 1
            if tags and all(t.startswith(("_refln_", "_diffrn_refln_")) for t in tags):
                while j < len(lines) and not re.match(r"\s*(_|loop_|data_|save_)", lines[j], re.I):
                    j += 1
                i = j
                continue
        out.append(ln.rstrip())
        i += 1
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"


def chosen(names):
    """The structure files of one download, in two groups: the CIFs and the geometry files. A file in the folder
    "additional" is used only when the top folder has no file of that kind."""
    def group(ext):
        mine = [n for n in names if n.lower().endswith(ext)]
        top = [n for n in mine if n.count("/") <= 1]
        return top or mine
    return group(".cif"), group(".in")


def download(pk):
    """The structure files and the info text of one data set, from its download. None when the download did not come.
    The CIFs are used when they hold atoms. If there is no such CIF, the geometry files are used."""
    raw = fetch(BASE + "datasets/%d/files/" % pk, timeout=60)
    if raw is None:
        return None
    try:
        z = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        return None
    names = [i.filename for i in z.infolist() if not i.is_dir()]
    parts = []
    for group in chosen(names):
        for n in group:
            text = text_of(z.read(n))
            kind = kind_of(text)
            if kind == "cif":
                text = slim_cif(text)
            if not has_atoms(text, kind):
                say("  data set", pk, "file without atoms:", n)
            elif len(text) > LARGE_FILE:
                say("  data set", pk, "file too large:", n, len(text))
            elif not any(p["text"] == text for p in parts):
                parts.append({"name": n.split("/")[-1], "kind": kind, "text": text})
        if parts:
            break
    info = next((n for n in names if n.lower().endswith("info.txt")), None)
    return {"names": names, "parts": parts, "info": text_of(z.read(info)) if info else ""}


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
        try:
            systems = all_systems()
            (out / "systems.json").write_text(json.dumps(systems, ensure_ascii=False, indent=0) + "\n")
            info["systems"] = len(systems)
            say("materials written:", len(systems))
        except RuntimeError as err:
            # the list of the last copy stays in use; the structures are read all the same
            if not (out / "systems.json").exists():
                raise
            info["systems"] = len(json.loads((out / "systems.json").read_text()))
            info["systems_from_last_copy"] = True
            say("the list of materials did not come; the last copy stays:", repr(err))

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
            folder = out / "structures"
            got = kept = none = lost = 0
            for n, (pk, e) in enumerate(sorted(listed.items())):
                before = old.get(pk)
                # a data set that did not change, and whose download was read, is not read again
                if (before and before.get("read") and before.get("updated") == e["updated"]
                        and all((folder / p["file"]).exists() for p in before.get("parts", []))):
                    e.update({k: before[k] for k in ("read", "has_file", "parts", "citation", "temperature", "files") if k in before})
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
                if d is None:
                    lost += 1
                    say("  the download of data set", pk, "did not come")
                    if before and before.get("read"):
                        index[pk] = before            # the earlier copy of this data set stays
                        continue
                    e.update(read=False, has_file=False, parts=[], files=[])
                else:
                    for f in list(folder.glob("%d.in" % pk)) + list(folder.glob("%d_*.*" % pk)):
                        f.unlink()                    # the files of an earlier copy of this data set
                    parts = []
                    for i, p in enumerate(d["parts"], 1):
                        name = "%d_%d.%s" % (pk, i, p["kind"])
                        (folder / name).write_text(p["text"])
                        parts.append({"file": name, "name": p["name"], "kind": p["kind"]})
                    citation, temp = from_info(d["info"])
                    e.update(read=True, has_file=bool(parts), parts=parts, citation=citation, temperature=temp, files=d["names"])
                    if parts:
                        got += 1
                    else:
                        none += 1
                        say("  no structure file for data set", pk, d["names"])
                index[pk] = e
                if (got + none + lost) % 50 == 0:
                    say("  downloads:", got, "read,", none, "without structure file,", lost, "not read,", kept, "kept | %d s" % (time.time() - START))
                    index_file.write_text(json.dumps([index[k] for k in sorted(index)], ensure_ascii=False, indent=0) + "\n")
                time.sleep(0.3)
            index_file.write_text(json.dumps([index[k] for k in sorted(index)], ensure_ascii=False, indent=0) + "\n")
            # a file of a data set that HybriD3 no longer lists goes away, but only when the list is whole
            if whole:
                used = {p["file"] for e in index.values() for p in e.get("parts", [])}
                for f in folder.iterdir():
                    if f.is_file() and f.name not in used:
                        f.unlink()
            every = [p for e in index.values() for p in e.get("parts", [])]
            info.update(structures_stated=stated, structures=len(index), structures_with_file=sum(1 for e in index.values() if e.get("has_file")),
                        structure_files=len(every), cif_files=sum(1 for p in every if p["kind"] == "cif"),
                        geometry_files=sum(1 for p in every if p["kind"] == "in"),
                        structures_whole=whole and lost == 0, read_now=got, kept=kept, without_file=none, not_read=lost)
            say("structures:", json.dumps({k: info[k] for k in ("structures", "structures_with_file", "structure_files", "cif_files", "geometry_files",
                                                                "structures_whole", "read_now", "kept", "without_file", "not_read")}))
        else:
            # a run without the structures keeps what the last run with them wrote
            for k in ("structures_stated", "structures", "structures_with_file", "structure_files", "cif_files", "geometry_files", "structures_whole"):
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
