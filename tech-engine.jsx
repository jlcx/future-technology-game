// tech-engine.jsx — domain logic for the Future Tech game.
//
// Static-data engine: combinations are pre-computed and shipped as
// data/combinations.js (window.COMBINATIONS); known real-world techs
// are shipped as data/corpus.js (window.CORPUS). No live model calls.
//
// Function signatures (combineWithClaude, describeWithClaude,
// pickNextComboWithClaude) are preserved so app.jsx is mostly unchanged.

// Eight starter seeds. Each id is the Wikidata QID, which means every
// seed-pair combination exists in window.COMBINATIONS out of the box.
// Emoji + blurb are hand-curated since the corpus doesn't ship those.
const SEED_QIDS = [
  'Q11660',   // Artificial intelligence
  'Q11468',   // Nanotechnology
  'Q7108',    // Biotechnology
  'Q176555',  // Quantum computer
  'Q170978',  // Robotics
  'Q169917',  // Graphene
  'Q170519',  // Virtual reality
  'Q204043',  // Teleportation
];

const SEED_META = {
  Q11660:  { emoji: '🧠', blurb: 'Software systems that perform tasks normally requiring human intelligence.' },
  Q11468:  { emoji: '🔬', blurb: 'Manipulation of matter at the atomic and molecular scale.' },
  Q7108:   { emoji: '🧫', blurb: 'Engineering of biological systems for industrial and medical use.' },
  Q176555: { emoji: '⚛️', blurb: 'Computation using quantum-mechanical superposition and entanglement.' },
  Q170978: { emoji: '🤖', blurb: 'Design and operation of programmable physical machines.' },
  Q169917: { emoji: '🔷', blurb: 'Single-atom carbon lattice with extreme strength and conductivity.' },
  Q170519: { emoji: '🥽', blurb: 'Computer-generated immersive sensory environments.' },
  Q204043: { emoji: '✨', blurb: 'Hypothetical instantaneous transfer of matter or information across space.' },
};

// Build lookup tables from the loaded static data. If a data file is
// missing (e.g. user opened the HTML without the data scripts), these
// degrade to empty maps and the engine surfaces a clear error.
const CORPUS = window.CORPUS || [];
const CORPUS_BY_QID = Object.fromEntries(CORPUS.map((e) => [e.qid, e]));
const CORPUS_BY_NAME = Object.fromEntries(CORPUS.map((e) => [e.name.toLowerCase(), e]));

const COMBO_MAP = {};
for (const c of (window.COMBINATIONS || [])) {
  const [a, b] = c.parents.slice().sort();
  COMBO_MAP[`${a}|${b}`] = c;
}

const SEED_TECHS = SEED_QIDS.map((qid) => {
  const c = CORPUS_BY_QID[qid];
  const meta = SEED_META[qid] || { emoji: '✦', blurb: '' };
  return {
    id: qid,
    qid,
    name: c ? c.name : qid,
    emoji: meta.emoji,
    blurb: meta.blurb,
    tier: 'common',
    depth: 0,
  };
});

const ERAS = [
  { name: 'Information',   range: [0, 1] },
  { name: 'Convergence',   range: [2, 3] },
  { name: 'Synthesis',     range: [4, 5] },
  { name: 'Spacefaring',   range: [6, 7] },
  { name: 'Post-scarcity', range: [8, 9] },
  { name: 'Transcendence', range: [10, 99] },
];

function eraForDepth(d) {
  for (const e of ERAS) if (d >= e.range[0] && d <= e.range[1]) return e.name;
  return 'Transcendence';
}

// Rarity escalates with depth, with stochastic component.
function rollTier(parentDepth) {
  const r = Math.random();
  if (parentDepth >= 4 && r < 0.18) return 'paradigm';
  if (parentDepth >= 2 && r < 0.32) return 'breakthrough';
  if (parentDepth >= 5 && r < 0.55) return 'breakthrough';
  return 'common';
}

// Combine two techs. Both must have ids that match QIDs in the static
// combinations table (i.e. seed or corpus-derived nodes; not synthesized).
// Return shape matches the old live-API engine: {id, name, emoji, blurb}
// or {error}.
async function combineWithClaude(a, b /*, existingNames */) {
  const key = [a.id, b.id].sort().join('|');
  const hit = COMBO_MAP[key];
  if (!hit) {
    return { error: 'No synthesis recorded for this pair (yet).' };
  }
  return {
    id: hit.id,
    name: hit.name,
    emoji: hit.emoji,
    blurb: hit.blurb,
  };
}

// Resolve a user-typed name to a corpus entry (case-insensitive exact match).
async function describeWithClaude(name) {
  const hit = CORPUS_BY_NAME[name.trim().toLowerCase()];
  if (!hit) {
    return { error: `"${name}" isn't in the corpus.` };
  }
  return {
    qid: hit.qid,
    name: hit.name,
    emoji: hit.emoji || '✦',
    blurb: hit.blurb || '',
  };
}

// Autopilot: pick a random untried pair from the current tree where a
// pre-computed synthesis exists.
async function pickNextComboWithClaude(nodes, log) {
  const used = new Set((log || []).map((e) => [e.a, e.b].sort().join('|')));
  const candidates = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const key = [nodes[i].id, nodes[j].id].sort().join('|');
      if (used.has(key) || !COMBO_MAP[key]) continue;
      candidates.push({ idA: nodes[i].id, idB: nodes[j].id });
    }
  }
  if (candidates.length === 0) {
    return { error: 'No further pre-computed syntheses available.' };
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...pick, why: 'Untried pre-computed synthesis.' };
}

window.SEED_TECHS = SEED_TECHS;
window.ERAS = ERAS;
window.eraForDepth = eraForDepth;
window.rollTier = rollTier;
window.combineWithClaude = combineWithClaude;
window.describeWithClaude = describeWithClaude;
window.pickNextComboWithClaude = pickNextComboWithClaude;
