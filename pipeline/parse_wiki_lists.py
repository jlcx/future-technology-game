#!/usr/bin/env python3
"""parse_wiki_lists.py — tag/augment data/corpus.js using the two Wikipedia
list HTMLs in the repo root.

For each `/wiki/Article_Title` link inside an <li> in the article body:
  - Look up the QID via wd_labels (lang='en').
  - If the QID is already in the corpus, add the appropriate tag.
  - Otherwise, fetch wp_count from wd_entities and add a new entry.
  - If the link doesn't resolve to any Wikidata entity, log it.

Idempotent: re-running just re-applies tags. Source HTMLs and tag names
are configured below.
"""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

import psycopg
from lxml import html as lxhtml

SOURCES = [
    ("List_of_emerging_technologies",    "emerging"),
    ("List_of_hypothetical_technologies", "hypothetical"),
]

# Pages that are listed as section headers / disambiguation pages / etc.
# but aren't really game-material technologies. Easy to extend.
SKIP_TITLES = {
    "Emerging technologies", "Hypothetical technology",
    "List of emerging technologies", "List of hypothetical technologies",
    "Research and development", "Technology", "Wikipedia",
}

LINK_RE = re.compile(r"^/wiki/([^#?]+)$")


def _link_title(a) -> str | None:
    """Return the article title from an <a> if it's a usable internal link."""
    if any(anc.tag == "sup" for anc in a.iterancestors()):
        return None  # citation superscript
    href = a.get("href") or ""
    m = LINK_RE.match(href)
    if not m:
        return None
    slug = m.group(1)
    if ":" in slug:  # namespace prefix
        return None
    return unquote(slug).replace("_", " ")


def extract_titles(html_path: Path) -> list[str]:
    """Return ordered, de-duplicated article titles linked from the article
    body. Reads two structures:
      - bullet lists: any <a> inside an <li>
      - wikitables: links inside the first <td> of each row (the tech name
        column on List of emerging technologies)
    Skips refs sections and citation superscripts."""
    doc = lxhtml.parse(str(html_path)).getroot()
    body = doc.find('.//{*}div[@id="mw-content-text"]')
    if body is None:
        body = doc

    seen: list[str] = []
    seen_set: set[str] = set()

    def add(title: str | None):
        if not title or title in SKIP_TITLES or title in seen_set:
            return
        seen_set.add(title)
        seen.append(title)

    # 1) bullet-list links
    for li in body.iter("li"):
        if any(
            (anc.get("class") or "").startswith(("references", "reflist"))
            for anc in li.iterancestors()
        ):
            continue
        for a in li.iter("a"):
            add(_link_title(a))

    # 2) wikitable rows — links in the first <td> of each row.
    for tbl in body.iter("table"):
        if "wikitable" not in (tbl.get("class") or ""):
            continue
        for tr in tbl.iter("tr"):
            tds = tr.findall("{*}td")
            if not tds:
                continue
            for a in tds[0].iter("a"):
                add(_link_title(a))

    return seen


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default="algae")
    ap.add_argument("--corpus", default="data/corpus.js")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    corpus_path = repo_root / args.corpus

    # Load existing corpus.
    src = corpus_path.read_text(encoding="utf-8")
    body = src.split("window.CORPUS = ", 1)[1].rstrip().rstrip(";").strip()
    corpus: list[dict] = json.loads(body)
    by_qid = {e["qid"]: e for e in corpus}

    # Collect titles from each list with their tag.
    titles_by_tag: dict[str, list[str]] = {}
    for stem, tag in SOURCES:
        path = repo_root / stem
        titles = extract_titles(path)
        titles_by_tag[tag] = titles
        print(f"{tag:>13}: {len(titles)} titles from {stem}", file=sys.stderr)

    all_titles = sorted({t for ts in titles_by_tag.values() for t in ts})

    # Resolve titles → QIDs in one bulk query.
    with psycopg.connect(f"dbname={args.db}") as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT label, qid FROM wd_labels WHERE lang='en' AND label = ANY(%s)",
            (all_titles,),
        )
        title_to_qid: dict[str, str] = {}
        for label, qid in cur.fetchall():
            # First QID wins on collisions — usually the canonical sense.
            title_to_qid.setdefault(label, qid)

        # Bulk wp_count for any new QIDs we'll insert.
        new_qids = [
            qid for t, qid in title_to_qid.items()
            if qid not in by_qid
        ]
        wp_counts: dict[str, int] = {}
        if new_qids:
            cur.execute(
                "SELECT qid, wp_count FROM wd_entities WHERE qid = ANY(%s)",
                (new_qids,),
            )
            wp_counts = {qid: wp for qid, wp in cur.fetchall()}

    added = 0
    tagged = 0
    misses: dict[str, list[str]] = {tag: [] for tag, _ in [(t, _) for _, t in SOURCES]}
    for tag, titles in titles_by_tag.items():
        for title in titles:
            qid = title_to_qid.get(title)
            if qid is None:
                misses[tag].append(title)
                continue
            entry = by_qid.get(qid)
            if entry is None:
                entry = {
                    "qid": qid,
                    "name": title,
                    "wp_count": wp_counts.get(qid, 0),
                    "emoji": None,
                    "blurb": None,
                    "tags": [],
                }
                by_qid[qid] = entry
                corpus.append(entry)
                added += 1
            if tag not in entry["tags"]:
                entry["tags"].append(tag)
                tagged += 1

    # Re-sort: tagged entries first by wp_count desc, then everything else
    # by wp_count desc — keeps the high-signal stuff at the top of the file.
    corpus.sort(key=lambda e: (-bool(e["tags"]), -(e["wp_count"] or 0), e["qid"]))

    n_emerging = sum(1 for e in corpus if "emerging" in e["tags"])
    n_hypothetical = sum(1 for e in corpus if "hypothetical" in e["tags"])
    header = (
        "// Auto-generated by pipeline/build_corpus.py + parse_wiki_lists.py.\n"
        f"// {len(corpus)} technologies total — "
        f"{n_emerging} tagged 'emerging', {n_hypothetical} tagged 'hypothetical'.\n"
    )
    out = json.dumps(corpus, ensure_ascii=False, indent=2)
    corpus_path.write_text(f"{header}window.CORPUS = {out};\n", encoding="utf-8")

    print(
        f"+{added} new entries, {tagged} tag applications. "
        f"Misses: emerging={len(misses['emerging'])}, "
        f"hypothetical={len(misses['hypothetical'])}",
        file=sys.stderr,
    )

    # Dump misses to disk for inspection.
    misses_path = repo_root / "data" / "wiki_list_misses.txt"
    with misses_path.open("w", encoding="utf-8") as f:
        for tag, ts in misses.items():
            f.write(f"# {tag}\n")
            for t in ts:
                f.write(f"{t}\n")
            f.write("\n")
    print(f"misses written → {misses_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
