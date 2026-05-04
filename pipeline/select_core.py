#!/usr/bin/env python3
"""select_core.py — pick the ~40-tech "core" from data/corpus.js.

Produces pipeline/core_techs.json (the auditable selection) and
pipeline/pairs.json (the deterministic enumeration of all unordered pairs,
which gets sliced across batches by run_combos.py).

Selection rules (configurable at the top of this file):
  - 16 "present" entries: highest wp_count, untagged or both-tagged, with
    a small SKIP set for things that look more like products than techs.
  - 8 "emerging" entries: highest wp_count from those tagged 'emerging'.
  - 8 "hypothetical" entries: highest wp_count from those tagged 'hypothetical'.
  - 8 hand-picked staples (the kind of thing a player expects to see).
"""
import json
import sys
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from policy import CORPUS_BLOCKLIST_QIDS  # noqa: E402

# Entries that show up high on wp_count but read as products/services or
# meta-pages rather than technologies in the game-design sense. Combined with
# the broader CORPUS_BLOCKLIST_QIDS from policy.py, which also drops them from
# the corpus entirely.
SKIP_QIDS = {
    "Q9158",      # Email
    "Q872",       # Radio
    "Q11425",     # Animation
    "Q115564437", # ChatGPT
    "Q2918660",   # Duolingo
    "Q226730",    # Silent film
    "Q46904",     # GSM
    "Q337535",    # Steam (service)
    "Q33057",     # ISBN
    "Q484847",    # E-commerce
    "Q23373",     # Universal Product Code
    "Q484598",    # CAPTCHA
    "Q11424",     # Film
    "Q588750",    # Puppetry
    "Q251212",    # Internet of things — too generic
} | CORPUS_BLOCKLIST_QIDS

# Hand-picked staples to ensure the core is recognizable.
STAPLE_QIDS = [
    "Q11660",   # Artificial intelligence
    "Q11468",   # Nanotechnology
    "Q7108",    # Biotechnology
    "Q176555",  # Quantum computer
    "Q11012",   # Robotics
    "Q17310682",# CRISPR gene editing
    "Q169917",  # Graphene
    "Q584529",  # Humanoid robot
]

# Emerging/manual techs added to core after the initial 36-tech selection.
# Some scored below the wp_count cutoff for the emerging bucket but were
# judged high-signal; some don't surface from the ALGAE subclass query at all
# and are injected via policy.MANUAL_CORPUS_ADDS.
MANUAL_ADD_QIDS = [
    "Q177765",  # Biometrics
    "Q106667",  # Superfluidity
    "Q179965",  # Electroencephalography
    "Q254183",  # Augmented reality
    "Q104954",  # Radio-frequency identification
    "Q178026",  # Fullerene
    "Q381490",  # Aerogel
    "Q181802",  # Prosthesis
    "Q741490",  # Self-driving car
    "Q633581",  # Cryonics
    "Q185410",  # Reversible computing (injected via policy.MANUAL_CORPUS_ADDS)
    # ── Tier-A 2026 emerging extension (post-web-search audit) ────────────
    "Q127993",  # Geothermal energy
    "Q213901",  # Gene therapy
    "Q160047",  # Maglev
    "Q1142726", # Intelligent agent
    "Q7543123", # Small modular reactor
    "Q391088",  # Sodium-ion battery
    "Q901551",  # Lithium iron phosphate battery
    "Q1638492", # Continuous glucose monitor
    "Q60761394",# Direct air capture
    "Q112702082",# Foundation model
    "Q529909",  # Multi-agent system
    "Q30688561",# Mixture of experts
    "Q137425629",# Neuromorphic computing
    "Q523846",  # Photonic integrated circuit
    "Q18387741",# Perovskite solar cell
    "Q22349364",# Liquid biopsy
    "Q967145",  # Satellite constellation
    "Q4845080", # Wearable technology
    "Q58181",   # Vactrain (already in corpus from wiki list — promote to core)
]

PRESENT_N = 16
EMERGING_N = 8
HYPOTHETICAL_N = 8


def main():
    repo_root = Path(__file__).resolve().parent.parent
    src = (repo_root / "data" / "corpus.js").read_text(encoding="utf-8")
    corpus = json.loads(src.split("window.CORPUS = ", 1)[1].rstrip().rstrip(";").strip())
    by_qid = {e["qid"]: e for e in corpus}

    chosen: dict[str, dict] = {}

    def add(entry: dict, bucket: str):
        if entry["qid"] in chosen:
            chosen[entry["qid"]]["selected_via"].append(bucket)
            return
        chosen[entry["qid"]] = {**entry, "selected_via": [bucket]}

    for qid in STAPLE_QIDS:
        if qid in by_qid:
            add(by_qid[qid], "staple")
        else:
            print(f"warning: staple {qid} not in corpus", file=sys.stderr)

    for qid in MANUAL_ADD_QIDS:
        if qid in by_qid:
            add(by_qid[qid], "manual_add")
        else:
            print(f"warning: manual_add {qid} not in corpus", file=sys.stderr)

    untagged = sorted(
        (e for e in corpus if e["qid"] not in SKIP_QIDS and not e["tags"]),
        key=lambda e: -e["wp_count"],
    )
    for e in untagged:
        if sum(1 for v in chosen.values() if "present" in v["selected_via"]) >= PRESENT_N:
            break
        add(e, "present")

    emerging = sorted(
        (e for e in corpus if e["qid"] not in SKIP_QIDS and "emerging" in e["tags"]),
        key=lambda e: -e["wp_count"],
    )
    for e in emerging:
        if sum(1 for v in chosen.values() if "emerging" in v["selected_via"]) >= EMERGING_N:
            break
        add(e, "emerging")

    hypothetical = sorted(
        (e for e in corpus if e["qid"] not in SKIP_QIDS and "hypothetical" in e["tags"]),
        key=lambda e: -e["wp_count"],
    )
    for e in hypothetical:
        if sum(1 for v in chosen.values() if "hypothetical" in v["selected_via"]) >= HYPOTHETICAL_N:
            break
        add(e, "hypothetical")

    core = sorted(chosen.values(), key=lambda e: (-e["wp_count"], e["qid"]))

    # Write pipeline/core_techs.json
    out_core = repo_root / "pipeline" / "core_techs.json"
    out_core.write_text(json.dumps(core, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(core)} core techs → {out_core}", file=sys.stderr)

    # Enumerate all unordered pairs by sorted (qidA, qidB).
    qids = sorted(e["qid"] for e in core)
    pairs = [list(p) for p in combinations(qids, 2)]
    out_pairs = repo_root / "pipeline" / "pairs.json"
    out_pairs.write_text(json.dumps(pairs, indent=2), encoding="utf-8")
    print(f"wrote {len(pairs)} pairs → {out_pairs}", file=sys.stderr)


if __name__ == "__main__":
    main()
