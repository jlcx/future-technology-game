// app.jsx — main React app for the Future Tech game.
//
// Architecture:
//   <App>
//     ├ <Canvas>    pannable/zoomable graph surface
//     │   ├ <Edges>   curved SVG edges between parents → children
//     │   └ <Node/>   draggable, droppable tech cards
//     ├ <Combiner>  the central "fusion" station + active selections
//     ├ <HUD>       era badge, count, palette, hint
//     ├ <Toast>     slides in when a new tech appears
//     └ <TweaksPanel>  theme + reset

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Persistence ----------------------------------------------------------------
const STORAGE_KEY = 'futuretech_v2';

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.nodes || !Array.isArray(data.nodes)) return null;
    return data;
  } catch (_) { return null; }
}
function saveGame(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

// Initial seeds.
function freshGame() {
  return {
    nodes: window.SEED_TECHS.map((s) => ({ ...s })),
    edges: [],
    log: [],
  };
}

// ─── Edges (SVG) ────────────────────────────────────────────────────────────
function Edges({ edges, positions, activeId }) {
  const NW = window.NODE_W, NH = window.NODE_H;
  const paths = edges.map(([p, c], i) => {
    const a = positions[p]; const b = positions[c];
    if (!a || !b) return null;
    const x1 = a.x + NW;
    const y1 = a.y + NH / 2;
    const x2 = b.x;
    const y2 = b.y + NH / 2;
    const cx = (x1 + x2) / 2;
    const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    const isActive = p === activeId || c === activeId;
    return (
      <path key={i} d={d}
            stroke={isActive ? 'var(--edge-active)' : 'var(--edge)'}
            strokeWidth={isActive ? 1.4 : 0.9}
            fill="none" />
    );
  });
  // size: union of all positions
  let w = 1000, h = 1000;
  Object.values(positions).forEach((p) => {
    w = Math.max(w, p.x + NW + 200);
    h = Math.max(h, p.y + NH + 200);
  });
  return (
    <svg className="edges" width={w} height={h} style={{ overflow: 'visible' }}>
      {paths}
    </svg>
  );
}

// ─── Node ───────────────────────────────────────────────────────────────────
function Node({ node, pos, isSelected, isHover, isPulsing, onSelect, onHover, onUnhover, onDragStart }) {
  const tier = node.tier || 'common';
  return (
    <div className={`node tier-${tier}${isSelected ? ' selected' : ''}${isPulsing ? ' pulse' : ''}`}
         style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
         onMouseEnter={() => onHover(node.id)}
         onMouseLeave={onUnhover}
         onPointerDown={(e) => onDragStart(e, node)}
         onClick={(e) => { e.stopPropagation(); onSelect(node); }}
         data-screen-label={node.name}>
      <div className="node-emoji">{node.emoji}</div>
      <div className="node-body">
        <div className="node-name">{node.name}</div>
        {tier !== 'common' && (
          <div className="node-tier">{tier === 'breakthrough' ? 'breakthrough' : 'paradigm shift'}</div>
        )}
      </div>
    </div>
  );
}

// ─── Combiner (the central fusion UI) ──────────────────────────────────────
function Combiner({ slotA, slotB, busy, error, onClear, onCombine, onClickSlot }) {
  const ready = slotA && slotB && !busy;
  return (
    <div className="combiner">
      <div className={`slot ${slotA ? 'filled' : ''}`} onClick={() => onClickSlot('a')}>
        {slotA ? (
          <>
            <span className="slot-emoji">{slotA.emoji}</span>
            <span className="slot-name">{slotA.name}</span>
          </>
        ) : (
          <span className="slot-empty">drop tech</span>
        )}
      </div>
      <div className="combine-op">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.2" />
          <line x1="11" y1="3" x2="11" y2="19" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>
      <div className={`slot ${slotB ? 'filled' : ''}`} onClick={() => onClickSlot('b')}>
        {slotB ? (
          <>
            <span className="slot-emoji">{slotB.emoji}</span>
            <span className="slot-name">{slotB.name}</span>
          </>
        ) : (
          <span className="slot-empty">drop tech</span>
        )}
      </div>
      <button className={`fuse-btn ${ready ? '' : 'disabled'} ${busy ? 'busy' : ''}`}
              disabled={!ready}
              onClick={onCombine}>
        {busy ? <span className="dots"><i/><i/><i/></span> : 'Synthesize →'}
      </button>
      <button className="clear-btn" onClick={onClear} title="Clear slots" aria-label="Clear slots">×</button>
      {error && <div className="combine-err">{error}</div>}
    </div>
  );
}

// ─── HUD ───────────────────────────────────────────────────────────────────
function HUD({ totalDiscovered, era, breakthroughCount, paradigmCount }) {
  return (
    <div className="hud">
      <div className="hud-title">
        <div className="hud-eyebrow">Future Tech · Speculative DAG</div>
        <div className="hud-h1">The Possibility Engine</div>
      </div>
      <div className="hud-stats">
        <div className="stat">
          <div className="stat-num">{totalDiscovered}</div>
          <div className="stat-lbl">technologies</div>
        </div>
        <div className="stat">
          <div className="stat-num">{breakthroughCount}</div>
          <div className="stat-lbl">breakthroughs</div>
        </div>
        <div className="stat">
          <div className="stat-num">{paradigmCount}</div>
          <div className="stat-lbl">paradigm shifts</div>
        </div>
        <div className="stat era">
          <div className="stat-num era-name">{era}</div>
          <div className="stat-lbl">current era</div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ tech }) {
  if (!tech) return null;
  return (
    <div className="toast" key={tech.id}>
      <div className="toast-eyebrow">
        {tech.tier === 'paradigm' ? 'Paradigm shift discovered' :
         tech.tier === 'breakthrough' ? 'Breakthrough unlocked' :
         'New technology'}
      </div>
      <div className="toast-row">
        <span className="toast-emoji">{tech.emoji}</span>
        <span className="toast-name">{tech.name}</span>
      </div>
      <div className="toast-blurb">{tech.blurb}</div>
    </div>
  );
}

// ─── Details panel ─────────────────────────────────────────────────────────
// Opens when a node is clicked. Stays open until dismissed (✕, click canvas,
// click same node again, or Esc).
function Details({ tech, parents, era, onClose, onUseInCombiner }) {
  if (!tech) return null;
  const tierLabel =
    tech.tier === 'paradigm' ? 'Paradigm shift' :
    tech.tier === 'breakthrough' ? 'Breakthrough' :
    'Common';
  return (
    <div className="details" key={tech.id} onClick={(e) => e.stopPropagation()}>
      <button className="details-x" aria-label="Close details" onClick={onClose}>✕</button>
      <div className="details-eyebrow">{tierLabel} · {era}</div>
      <div className="details-row">
        <span className="details-emoji">{tech.emoji}</span>
        <span className="details-name">{tech.name}</span>
      </div>
      <div className="details-blurb">{tech.blurb || <em style={{opacity:.6}}>No description.</em>}</div>
      {parents.length > 0 && (
        <div className="details-section">
          <div className="details-key">Synthesized from</div>
          <div className="details-parents">
            {parents.map((p) => (
              <span className="details-parent" key={p.id}>
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {parents.length === 0 && (
        <div className="details-section">
          <div className="details-key">Origin</div>
          <div className="details-meta">{tech.userAdded ? 'Added by you' : 'Seed technology'}</div>
        </div>
      )}
      <button className="details-use" onClick={onUseInCombiner}>Use in combiner →</button>
    </div>
  );
}

// ─── Tech tray (left edge, collapsible) ───────────────────────────────────
// Browseable list of every corpus entry. Core entries (anything that appears
// as a non-syn parent in the static combinations table) are surfaced at top
// since combinations involving them are guaranteed to exist.
function TechTray({ corpus, coreQids, treeIds, onPickTech }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const q = search.trim().toLowerCase();
  const sortFn = (a, b) =>
    (b.wp_count || 0) - (a.wp_count || 0) || a.name.localeCompare(b.name);
  const core = [];
  const rest = [];
  for (const e of corpus) {
    if (q && !e.name.toLowerCase().includes(q)) continue;
    (coreQids.has(e.qid) ? core : rest).push(e);
  }
  core.sort(sortFn);
  rest.sort(sortFn);

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (search) setSearch('');
    else setOpen(false);
  };

  return (
    <div className={`tray ${open ? 'open' : ''}`}>
      <button className="tray-tab" onClick={() => setOpen((o) => !o)}
              title={open ? 'Close library' : 'Open tech library'}>
        <span className="tray-tab-icon" aria-hidden="true">{open ? '◀' : '▶'}</span>
        <span className="tray-tab-lbl">Library</span>
      </button>
      {open && (
        <div className="tray-panel" onKeyDown={onKey}>
          <div className="tray-header">
            <span className="tray-eyebrow">Tech library</span>
            <span className="tray-count">{corpus.length} known</span>
          </div>
          <input ref={inputRef} className="tray-search" type="text"
                 placeholder="Search…" value={search}
                 onChange={(e) => setSearch(e.target.value)} />
          <div className="tray-body">
            {core.length > 0 && (
              <>
                <div className="tray-section">★ Core ({core.length})</div>
                {core.map((e) => (
                  <TrayRow key={e.qid} tech={e}
                           inTree={treeIds.has(e.qid)}
                           onPick={() => onPickTech(e)} />
                ))}
              </>
            )}
            {rest.length > 0 && (
              <>
                <div className="tray-section">All other ({rest.length})</div>
                {rest.map((e) => (
                  <TrayRow key={e.qid} tech={e}
                           inTree={treeIds.has(e.qid)}
                           onPick={() => onPickTech(e)} />
                ))}
              </>
            )}
            {core.length === 0 && rest.length === 0 && (
              <div className="tray-empty">No matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrayRow({ tech, inTree, onPick }) {
  return (
    <button className={`tray-row${inTree ? ' in-tree' : ''}`} onClick={onPick}
            title={tech.blurb || tech.name}>
      <span className="tray-row-emoji">{tech.emoji || '✦'}</span>
      <span className="tray-row-name">{tech.name}</span>
      {inTree && <span className="tray-row-mark" aria-label="already in tree">✓</span>}
    </button>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "archive",
  "showGrid": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => {
    // If a previously-saved theme has been removed, fall back to archive
    // so the dropdown doesn't end up showing a phantom selection.
    if (!window.THEMES[tweaks.theme]) setTweak('theme', 'archive');
    else window.applyTheme(tweaks.theme);
  }, [tweaks.theme]);

  const [game, setGame] = useState(() => loadGame() || freshGame());
  useEffect(() => { saveGame(game); }, [game]);

  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [toast, setToast] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [pulseId, setPulseId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState(null);
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotMsg, setAutopilotMsg] = useState(null);
  const busyRef = useRef(false);
  const autopilotRef = useRef(false);
  autopilotRef.current = autopilot;

  // Layout
  const { positions, bounds } = useMemo(
    () => window.layoutDag(game.nodes, game.edges),
    [game.nodes, game.edges]
  );

  // Pan/zoom
  const canvasRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view); viewRef.current = view;

  // Auto-fit on first load: scale and center so the entire current tree fits
  // within the canvas viewport (with margins for HUD top + combiner bottom).
  useEffect(() => {
    if (game.nodes.length > 0 && canvasRef.current) {
      const r = canvasRef.current.getBoundingClientRect();
      const ps = Object.values(positions);
      if (ps.length === 0) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      ps.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x + window.NODE_W);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y + window.NODE_H);
      });
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const MARGIN_TOP = 180;     // clear the HUD
      const MARGIN_BOTTOM = 140;  // clear the combiner
      const MARGIN_X = 60;
      const availW = Math.max(200, r.width - MARGIN_X * 2);
      const availH = Math.max(200, r.height - MARGIN_TOP - MARGIN_BOTTOM);
      const k = Math.min(1, availW / contentW, availH / contentH);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const tx = r.width / 2 - cx * k;
      const ty = MARGIN_TOP + availH / 2 - cy * k;
      setView({ x: tx, y: ty, k });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open details for newly-discovered tech (in addition to the toast).
  useEffect(() => {
    if (toast) setDetailsId(toast.id);
  }, [toast]);

  // Esc closes details.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDetailsId(null);
        setAddOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-pan to newly added node so it's visible. Skip the very first mount —
  // the auto-fit effect handles the initial view. After that, only run when
  // a *new* node id appears (a real combine result), not when seeds first load.
  const lastNodeId = game.nodes.length ? game.nodes[game.nodes.length - 1].id : null;
  const didInitialMountRef = useRef(false);
  useEffect(() => {
    if (!didInitialMountRef.current) {
      didInitialMountRef.current = true;
      return;
    }
    if (!lastNodeId || !canvasRef.current) return;
    const p = positions[lastNodeId];
    if (!p) return;
    const r = canvasRef.current.getBoundingClientRect();
    const k = viewRef.current.k;
    const tx = r.width * 0.65 - p.x * k;
    const ty = r.height * 0.5 - (p.y + window.NODE_H / 2) * k;
    setView((v) => ({ ...v, x: tx, y: ty }));
  }, [lastNodeId]); // eslint-disable-line

  // Pan
  const panRef = useRef(null);
  const onCanvasPointerDown = (e) => {
    if (e.target.closest('.node') || e.target.closest('.combiner') ||
        e.target.closest('.hud') || e.target.closest('.twk-panel') ||
        e.target.closest('.toast') || e.target.closest('.details') ||
        e.target.closest('.add-btn') || e.target.closest('.add-panel') ||
        e.target.closest('.tray')) return;
    // Clicking empty canvas dismisses the details panel.
    setDetailsId(null);
    panRef.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
    document.body.style.cursor = 'grabbing';
    const move = (ev) => {
      if (!panRef.current) return;
      setView((v) => ({ ...v,
        x: panRef.current.vx + (ev.clientX - panRef.current.x),
        y: panRef.current.vy + (ev.clientY - panRef.current.y),
      }));
    };
    const up = () => {
      panRef.current = null;
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Wheel zoom (with mouse position as anchor).
  const onWheel = (e) => {
    e.preventDefault();
    const r = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setView((v) => {
      const dk = Math.exp(-e.deltaY * 0.0015);
      const nk = Math.min(2.4, Math.max(0.4, v.k * dk));
      // anchor zoom: keep (mx, my) fixed in graph space.
      const gx = (mx - v.x) / v.k;
      const gy = (my - v.y) / v.k;
      return { x: mx - gx * nk, y: my - gy * nk, k: nk };
    });
  };

  // Drag a node into a slot. We track an overlay clone that follows the cursor;
  // on release, if it's over slot a/b/combiner area, fill the slot.
  const dragStateRef = useRef(null);
  const [dragGhost, setDragGhost] = useState(null);

  const onNodeDragStart = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    dragStateRef.current = { node, moved: false, x: startX, y: startY };
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragStateRef.current.moved && Math.hypot(dx, dy) > 4) {
        dragStateRef.current.moved = true;
        setDragGhost({ node, x: ev.clientX, y: ev.clientY });
      } else if (dragStateRef.current.moved) {
        setDragGhost({ node, x: ev.clientX, y: ev.clientY });
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const wasDragging = dragStateRef.current?.moved;
      setDragGhost(null);
      dragStateRef.current = null;
      if (!wasDragging) {
        // treat as click → fill next empty slot
        fillNextSlot(node);
        return;
      }
      // Determine drop target.
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const slotEl = el?.closest('.slot');
      const combinerEl = el?.closest('.combiner');
      if (slotEl) {
        const slots = Array.from(combinerEl.querySelectorAll('.slot'));
        const idx = slots.indexOf(slotEl);
        if (idx === 0) setSlotA(node);
        else if (idx === 1) setSlotB(node);
      } else if (combinerEl) {
        fillNextSlot(node);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Fill the next empty slot. If the node is already in a slot, remove it
  // (toggle). When both slots are full, do nothing — the user must clear
  // a slot first. This prevents a third click from clobbering slot A.
  const fillNextSlot = (node) => {
    if (slotA?.id === node.id) { setSlotA(null); return; }
    if (slotB?.id === node.id) { setSlotB(null); return; }
    if (!slotA) { setSlotA(node); return; }
    if (!slotB) { setSlotB(node); return; }
    // both full — ignore
  };

  const onClickSlot = (which) => {
    if (which === 'a') setSlotA(null);
    else setSlotB(null);
  };

  const onSelect = (node) => {
    // Click toggles details. Clicking a different node opens its details.
    setDetailsId((id) => id === node.id ? null : node.id);
  };

  // Send the currently-detailed node into the next combiner slot.
  const useDetailedInCombiner = () => {
    const node = game.nodes.find((n) => n.id === detailsId);
    if (node) fillNextSlot(node);
  };

  // Tray click: drop a corpus entry into the tree (if not already there) and
  // fill the next combiner slot with it.
  const pickCorpusTech = (entry) => {
    const existing = game.nodes.find((n) => n.id === entry.qid);
    if (existing) {
      fillNextSlot(existing);
      setPulseId(existing.id);
      setTimeout(() => setPulseId(null), 1200);
      return;
    }
    const newNode = {
      id: entry.qid,
      qid: entry.qid,
      name: entry.name,
      emoji: entry.emoji || '✦',
      blurb: entry.blurb || '',
      tier: 'common',
      depth: 0,
      userAdded: true,
    };
    setGame((g) => ({ ...g, nodes: [...g.nodes, newNode] }));
    fillNextSlot(newNode);
    setPulseId(newNode.id);
    setTimeout(() => setPulseId(null), 1500);
  };

  // Derive the set of "core" QIDs from the static combinations table: any
  // non-syn id that appears as a parent. This stays correct when the core
  // expands without any code change.
  const coreQids = useMemo(() => {
    const s = new Set();
    for (const c of (window.COMBINATIONS || [])) {
      for (const p of c.parents) {
        if (!p.startsWith('syn_')) s.add(p);
      }
    }
    return s;
  }, []);

  const treeIds = useMemo(
    () => new Set(game.nodes.map((n) => n.id)),
    [game.nodes]
  );

  // Combine. If a/b are passed, use them (autopilot); otherwise read from slots.
  const onCombine = async (a, b) => {
    const A = a || slotA;
    const B = b || slotB;
    if (!A || !B || busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const existing = game.nodes.map((n) => n.name);
    const result = await window.combineWithClaude(A, B, existing);
    busyRef.current = false;
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    // Convergent synthesis: when this combination produces an already-
    // discovered tech (matched by stable id from the engine, or by name as
    // a fallback for legacy/random ids), add the new parent edges to the
    // existing node instead of creating a duplicate.
    const norm = (s) => s.toLowerCase().trim();
    const existingHit = game.nodes.find((n) =>
      (result.id && n.id === result.id) || norm(n.name) === norm(result.name)
    );
    if (existingHit) {
      const haveEdge = new Set(game.edges.map(([p, c]) => `${p}|${c}`));
      const newEdges = [];
      for (const parent of [A, B]) {
        const k = `${parent.id}|${existingHit.id}`;
        if (!haveEdge.has(k)) newEdges.push([parent.id, existingHit.id]);
      }
      if (newEdges.length === 0) {
        setError(`Already discovered: ${existingHit.name}`);
      }
      setPulseId(existingHit.id);
      setTimeout(() => setPulseId(null), 1200);
      if (newEdges.length === 0) return null;
      setGame((g) => ({
        ...g,
        edges: [...g.edges, ...newEdges],
        log: [...(g.log || []), { a: A.id, b: B.id, out: existingHit.id, t: Date.now() }],
      }));
      setSlotA(null); setSlotB(null);
      return existingHit;
    }
    const parentDepth = Math.max(A.depth || 0, B.depth || 0);
    const tier = window.rollTier(parentDepth);
    const newNode = {
      id: result.id || ('n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      name: result.name,
      emoji: result.emoji,
      blurb: result.blurb,
      tier,
      depth: parentDepth + 1,
    };
    setGame((g) => ({
      nodes: [...g.nodes, newNode],
      edges: [...g.edges, [A.id, newNode.id], [B.id, newNode.id]],
      log: [...(g.log || []), { a: A.id, b: B.id, out: newNode.id, t: Date.now() }],
    }));
    setToast(newNode);
    setTimeout(() => setToast((t) => t?.id === newNode.id ? null : t), 4500);
    setPulseId(newNode.id);
    setTimeout(() => setPulseId(null), 1500);
    // Clear slots on success.
    setSlotA(null);
    setSlotB(null);
    return newNode;
  };

  const onReset = () => {
    if (!confirm('Reset all discovered technologies? This cannot be undone.')) return;
    const fresh = freshGame();
    setGame(fresh);
    setSlotA(null); setSlotB(null); setError(null); setToast(null);
    setAutopilot(false);
    setDetailsId(null);
  };

  // Autopilot loop: while enabled, pick the most-interesting next combo and
  // synthesize it on a roughly 5-second cadence. We use refs to read latest
  // game/busy state inside the timer without re-creating the loop on every tick.
  const gameRef = useRef(game); gameRef.current = game;
  useEffect(() => {
    if (!autopilot) return;
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      if (cancelled || !autopilotRef.current) return;
      if (busyRef.current) { timer = setTimeout(tick, 600); return; }
      const g = gameRef.current;
      if (g.nodes.length < 2) {
        setAutopilotMsg('Need at least two technologies.');
        return;
      }
      setAutopilotMsg('Choosing the next synthesis…');
      const pick = await window.pickNextComboWithClaude(g.nodes, g.log || []);
      if (cancelled || !autopilotRef.current) return;
      if (pick.error) {
        setAutopilotMsg('Couldn\u2019t pick. Retrying…');
        timer = setTimeout(tick, 2500); return;
      }
      const A = g.nodes.find((n) => n.id === pick.idA);
      const B = g.nodes.find((n) => n.id === pick.idB);
      if (!A || !B) { timer = setTimeout(tick, 2500); return; }
      setSlotA(A); setSlotB(B);
      setAutopilotMsg(pick.why || 'Synthesizing…');
      const newNode = await onCombine(A, B);
      if (cancelled || !autopilotRef.current) return;
      if (!newNode) { timer = setTimeout(tick, 2500); return; }
      setAutopilotMsg('Next synthesis in 5s…');
      timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setAutopilotMsg(null);
    };
  }, [autopilot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add an existing real-world technology as a new root node. Looks up
  // the typed name in the static corpus; uses the canonical corpus name
  // and QID so combinations involving this node will hit COMBO_MAP.
  const onAddTech = async () => {
    const name = addName.trim();
    if (!name || addBusy) return;
    const norm = (s) => s.toLowerCase().trim();
    const hit = game.nodes.find((n) => norm(n.name) === norm(name));
    if (hit) {
      setAddError(`Already in tree: ${hit.name}`);
      setPulseId(hit.id);
      setTimeout(() => setPulseId(null), 1200);
      return;
    }
    setAddBusy(true);
    setAddError(null);
    const result = await window.describeWithClaude(name);
    setAddBusy(false);
    if (result.error) { setAddError(result.error); return; }
    // Re-check by canonical id (user may have typed an alias).
    const dupByQid = result.qid && game.nodes.find((n) => n.id === result.qid);
    if (dupByQid) {
      setAddError(`Already in tree: ${dupByQid.name}`);
      setPulseId(dupByQid.id);
      setTimeout(() => setPulseId(null), 1200);
      return;
    }
    const newNode = {
      id: result.qid || ('n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      qid: result.qid,
      name: result.name || name,
      emoji: result.emoji,
      blurb: result.blurb,
      tier: 'common',
      depth: 0,
      userAdded: true,
    };
    setGame((g) => ({
      ...g,
      nodes: [...g.nodes, newNode],
    }));
    setAddName('');
    setAddOpen(false);
    setPulseId(newNode.id);
    setTimeout(() => setPulseId(null), 1500);
  };

  // Stats
  const breakthroughCount = game.nodes.filter((n) => n.tier === 'breakthrough').length;
  const paradigmCount = game.nodes.filter((n) => n.tier === 'paradigm').length;
  const maxDepth = game.nodes.reduce((m, n) => Math.max(m, n.depth || 0), 0);
  const era = window.eraForDepth(maxDepth);

  return (
    <div className={`app theme-${tweaks.theme}${tweaks.showGrid ? '' : ' no-grid'}`}>
      <div className="bg-grid" />

      <HUD
        totalDiscovered={game.nodes.length}
        era={era}
        breakthroughCount={breakthroughCount}
        paradigmCount={paradigmCount}
      />

      <TechTray corpus={window.CORPUS || []}
                coreQids={coreQids}
                treeIds={treeIds}
                onPickTech={pickCorpusTech} />

      <div ref={canvasRef} className="canvas"
           onPointerDown={onCanvasPointerDown}
           onWheel={onWheel}>
        <div className="canvas-inner"
             style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          <Edges edges={game.edges} positions={positions} activeId={hoverId || detailsId} />
          {game.nodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            return (
              <Node key={n.id} node={n} pos={p}
                    isSelected={detailsId === n.id || slotA?.id === n.id || slotB?.id === n.id}
                    isHover={hoverId === n.id}
                    isPulsing={pulseId === n.id}
                    onSelect={onSelect}
                    onHover={setHoverId}
                    onUnhover={() => setHoverId(null)}
                    onDragStart={onNodeDragStart} />
            );
          })}
        </div>
        <div className="hint">
          <kbd>scroll</kbd> zoom · <kbd>drag</kbd> pan · <kbd>click or drag</kbd> a tech into a slot
        </div>
      </div>

      <Combiner slotA={slotA} slotB={slotB}
                busy={busy} error={error}
                onClear={() => { setSlotA(null); setSlotB(null); setError(null); }}
                onCombine={() => onCombine()}
                onClickSlot={onClickSlot} />

      <button className={`autopilot-btn ${autopilot ? 'on' : ''}`}
              onClick={() => setAutopilot((v) => !v)}
              title={autopilot ? 'Stop autopilot' : 'Let Claude pick the next synthesis every ~5s'}>
        <span className="autopilot-dot" aria-hidden="true" />
        <span className="autopilot-lbl">
          {autopilot ? 'Autopilot on' : 'Autopilot'}
        </span>
      </button>

      {autopilot && autopilotMsg && (
        <div className="autopilot-msg">{autopilotMsg}</div>
      )}

      <button className={`add-btn ${addOpen ? 'open' : ''}`}
              onClick={() => { setAddOpen((o) => !o); setAddError(null); }}
              title="Add an existing technology">
        <span className="add-plus">+</span>
        <span className="add-lbl">Add technology</span>
      </button>

      {addOpen && (
        <div className="add-panel" onClick={(e) => e.stopPropagation()}>
          <div className="add-eyebrow">Add an existing technology</div>
          <div className="add-row">
            <input
              className="add-input"
              type="text"
              placeholder="e.g. Cryptocurrency, Holography, Dyson sphere…"
              value={addName}
              autoFocus
              onChange={(e) => { setAddName(e.target.value); setAddError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddTech();
                if (e.key === 'Escape') setAddOpen(false);
              }}
              disabled={addBusy}
            />
            <button className={`add-go ${addBusy ? 'busy' : ''}`}
                    disabled={!addName.trim() || addBusy}
                    onClick={onAddTech}>
              {addBusy ? <span className="dots"><i/><i/><i/></span> : 'Add'}
            </button>
          </div>
          <div className="add-hint">
            Lands as a new root node — combine it with anything else in your tree.
          </div>
          {addError && <div className="add-err">{addError}</div>}
        </div>
      )}
      <Toast tech={toast} />

      {detailsId && (() => {
        const tech = game.nodes.find((n) => n.id === detailsId);
        if (!tech) return null;
        const parentIds = game.edges.filter(([_, c]) => c === tech.id).map(([p]) => p);
        const parents = parentIds.map((id) => game.nodes.find((n) => n.id === id)).filter(Boolean);
        return (
          <Details tech={tech} parents={parents}
                   era={window.eraForDepth(tech.depth || 0)}
                   onClose={() => setDetailsId(null)}
                   onUseInCombiner={useDetailedInCombiner} />
        );
      })()}

      {dragGhost && (
        <div className="drag-ghost" style={{ left: dragGhost.x, top: dragGhost.y }}>
          <span className="node-emoji">{dragGhost.node.emoji}</span>
          <span className="node-name">{dragGhost.node.name}</span>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic" />
        <TweakSelect label="Theme" value={tweaks.theme}
                     options={[
                       { value: 'archive',  label: 'Editorial Archive' },
                       { value: 'terminal', label: 'Sci-fi Terminal' },
                     ]}
                     onChange={(v) => setTweak('theme', v)} />
        <TweakToggle label="Background grid" value={tweaks.showGrid}
                     onChange={(v) => setTweak('showGrid', v)} />
        <TweakSection label="Game" />
        <TweakButton label="Reset tree" onClick={onReset} secondary />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
