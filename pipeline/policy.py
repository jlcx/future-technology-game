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
# wouldn't surface — typically because their wp_count is below the threshold,
# or because Wikidata classifies them under "energy" / "biology" / etc. rather
# than "technology". Each entry must include name, wp_count, and a
# hand-curated emoji + blurb (since the bulk-describe pipeline runs once and
# these arrive later).
MANUAL_CORPUS_ADDS = [
    {"qid": "Q185410",    "name": "Reversible computing",          "wp_count": 12,
     "emoji": "🔄", "blurb": "Computation engineered to preserve all inputs, enabling reversal and theoretically near-zero-energy operation.",
     "tags": []},

    # ── Tier-A 2026 emerging-tech additions ───────────────────────────────
    {"qid": "Q127993",    "name": "Geothermal energy",             "wp_count": 83,
     "emoji": "🌋", "blurb": "Generates electricity and heat from naturally occurring underground thermal reservoirs.",
     "tags": []},
    {"qid": "Q213901",    "name": "Gene therapy",                  "wp_count": 52,
     "emoji": "🧬", "blurb": "Treats disease by inserting, modifying, or replacing genes inside a patient's cells.",
     "tags": ["emerging"]},
    {"qid": "Q160047",    "name": "Maglev",                        "wp_count": 71,
     "emoji": "🚄", "blurb": "Levitates and propels trains using magnetic fields, eliminating wheel-rail friction.",
     "tags": []},
    {"qid": "Q1142726",   "name": "Intelligent agent",             "wp_count": 37,
     "emoji": "🤖", "blurb": "Software that perceives its environment and takes autonomous actions to achieve goals.",
     "tags": []},
    {"qid": "Q7543123",   "name": "Small modular reactor",         "wp_count": 29,
     "emoji": "⚛️", "blurb": "Compact factory-built nuclear reactor that ships in modules and scales output by count.",
     "tags": ["emerging"]},
    {"qid": "Q391088",    "name": "Sodium-ion battery",            "wp_count": 24,
     "emoji": "🧂", "blurb": "Battery storing energy in sodium ions, abundant and cheaper than lithium alternatives.",
     "tags": ["emerging"]},
    {"qid": "Q901551",    "name": "Lithium iron phosphate battery", "wp_count": 24,
     "emoji": "🔋", "blurb": "Lithium-ion variant with iron-phosphate cathodes for thermal stability and long cycle life.",
     "tags": []},
    {"qid": "Q1638492",   "name": "Continuous glucose monitor",    "wp_count": 16,
     "emoji": "📈", "blurb": "Skin-worn sensor reporting blood glucose levels in real time without finger pricks.",
     "tags": []},
    {"qid": "Q60761394",  "name": "Direct air capture",            "wp_count": 10,
     "emoji": "🌬️", "blurb": "Filters carbon dioxide directly from atmospheric air for sequestration or industrial reuse.",
     "tags": ["emerging"]},
    {"qid": "Q112702082", "name": "Foundation model",              "wp_count": 17,
     "emoji": "🏗️", "blurb": "Very large neural network pretrained on broad data, then fine-tuned for many downstream tasks.",
     "tags": ["emerging"]},
    {"qid": "Q529909",    "name": "Multi-agent system",            "wp_count": 24,
     "emoji": "🤝", "blurb": "Network of autonomous software agents that interact to solve problems no single agent can.",
     "tags": []},
    {"qid": "Q30688561",  "name": "Mixture of experts",            "wp_count": 10,
     "emoji": "🎭", "blurb": "Neural architecture routing each input through a small subset of specialized expert sub-networks.",
     "tags": ["emerging"]},
    {"qid": "Q137425629", "name": "Neuromorphic computing",        "wp_count": 6,
     "emoji": "🧠", "blurb": "Hardware mimicking neural firing patterns for ultra-low-power sensory and learning workloads.",
     "tags": ["emerging"]},
    {"qid": "Q523846",    "name": "Photonic integrated circuit",   "wp_count": 14,
     "emoji": "💡", "blurb": "Chip processing information with photons instead of electrons for high-bandwidth data movement.",
     "tags": ["emerging"]},
    {"qid": "Q18387741",  "name": "Perovskite solar cell",         "wp_count": 15,
     "emoji": "☀️", "blurb": "Solar cell using perovskite-structured crystals to capture light cheaply at high efficiency.",
     "tags": ["emerging"]},
    {"qid": "Q22349364",  "name": "Liquid biopsy",                 "wp_count": 13,
     "emoji": "🩸", "blurb": "Detects cancer DNA fragments circulating in blood, often replacing surgical tissue biopsies.",
     "tags": ["emerging"]},
    {"qid": "Q967145",    "name": "Satellite constellation",       "wp_count": 26,
     "emoji": "🛰️", "blurb": "Coordinated swarm of small satellites providing global coverage that single craft cannot.",
     "tags": []},
    {"qid": "Q4845080",   "name": "Wearable technology",           "wp_count": 23,
     "emoji": "⌚", "blurb": "Body-worn computers and sensors that track physiology and surface ambient computing.",
     "tags": []},
]
