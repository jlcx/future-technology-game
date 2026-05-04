"""policy.py — shared corpus/core policy lists.

These are the source of truth for "which QIDs the project should never include
in corpus.js" and "which extra QIDs should be added to corpus.js even though
the standard ALGAE query wouldn't surface them." Imported by:
  - build_corpus.py    (filters its query result)
  - parse_wiki_lists.py (skips wiki-list entries on the blocklist)
  - cleanup_corpus.py  (one-shot to apply the policy to existing corpus.js)
  - prune_combinations.py (drops combos whose parents are blocked)
  - select_core.py     (skips blocked QIDs when picking the core)
"""

# Entries that should never be in the corpus. Curated by hand based on player
# observations: too broad to combine meaningfully, brand/model SKUs, or just
# not technologies.
CORPUS_BLOCKLIST_QIDS = {
    # ── Too broad — were in core, now removed ─────────────────────────────
    "Q11661",   # Information technology
    "Q179310",  # Computing
    "Q131201",  # Sustainable development
    "Q237525",  # Technological singularity
    "Q743263",  # Brainwashing
    "Q159408",  # Hibernation
    "Q3510521", # Computer security
    "Q181787",  # Android (robot) — redundant with Humanoid robot

    # ── "List of *" meta articles (13) ────────────────────────────────────
    "Q1148272",   # List of inventors
    "Q2750576",   # List of fictional spacecraft
    "Q16041261",  # List of fictional cars
    "Q6619670",   # List of fictional gynoids
    "Q113456778", # List of existing technologies predicted in science fiction
    "Q16002201",  # List of fictional aircraft
    "Q17103176",  # List of fictional space stations
    "Q47086656",  # List of fictional vehicles
    "Q6619596",   # List of fictional artificial intelligences
    "Q6619646",   # List of fictional cyborgs
    "Q6619758",   # List of fictional robots and androids
    "Q6624141",   # List of fictional galactic communities
    "Q6633998",   # List of fictional doomsday devices

    # ── "History of *" articles (13) ──────────────────────────────────────
    "Q465352",  # History of technology
    "Q107478",  # History of film
    "Q193315",  # History of the Internet
    "Q471043",  # History of aviation
    "Q8180985", # History of architecture
    "Q2592244", # History of artificial intelligence
    "Q355472",  # History of photography
    "Q1517374", # History of radio
    "Q2328012", # History of the tank
    "Q467928",  # History of cryptography
    "Q477862",  # History of rail transport
    "Q1517385", # History of journalism
    "Q1189238", # History of computer science

    # ── Brand-name / specific-model SKUs (8) ──────────────────────────────
    "Q762551",     # Shenyang J-35
    "Q194455",     # Sukhoi Su-57
    "Q107594447",  # Sukhoi Su-75 Checkmate
    "Q108315287",  # Swedish Transport Administration electric road program
    "Q18206880",   # ET3 Global Alliance
    "Q15330",      # Waymo
    "Q28022144",   # Amazon Alexa
    "Q15991103",   # Chrysler TV-8

    # ── Not actually a technology ─────────────────────────────────────────
    "Q194294",    # Bioethics
    "Q304994",    # Diffusion of innovations
    "Q6566971",   # Pigeon racing
    "Q1272498",   # Greek passport
    "Q4773888",   # Anthropogeny
    "Q375560",    # Fur farming           (industry/practice)
    "Q50161740",  # Plogging              (activity)
    "Q796078",    # MIT Technology Review (publication)
}


# Extra QIDs to add to the corpus that the standard ALGAE subclass query
# wouldn't surface — typically because their wp_count is below the threshold.
# Each entry must include name, wp_count, and a hand-curated emoji + blurb
# (since the bulk-describe pipeline runs once and these arrive later).
MANUAL_CORPUS_ADDS = [
    {
        "qid": "Q185410",
        "name": "Reversible computing",
        "wp_count": 12,
        "emoji": "🔄",
        "blurb": "Computation engineered to preserve all inputs, enabling reversal and theoretically near-zero-energy operation.",
        "tags": [],
    },
]
