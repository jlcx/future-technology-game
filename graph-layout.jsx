// graph-layout.jsx — topological layout for the future-tech DAG.
//
// Nodes are placed in columns by depth (longest path from any root).
// Within a column, nodes are ordered by (avg parent y) to minimize edge crossings.
// Returns positions in graph-space (px); the canvas applies pan/zoom on top.

const COL_W = 240;     // horizontal column spacing
const ROW_H = 96;      // vertical slot spacing
const NODE_W = 168;
const NODE_H = 56;
const PAD_X = 80;
const PAD_Y = 80;

function layoutDag(nodes, edges) {
  if (nodes.length === 0) return { positions: {}, bounds: { w: 800, h: 600 } };

  // Build adjacency.
  const childrenOf = {};
  const parentsOf = {};
  nodes.forEach((n) => { childrenOf[n.id] = []; parentsOf[n.id] = []; });
  edges.forEach(([p, c]) => {
    if (childrenOf[p]) childrenOf[p].push(c);
    if (parentsOf[c]) parentsOf[c].push(p);
  });

  // Depth = longest path from any root. Roots = no parents.
  const depth = {};
  const visit = (id, seen = new Set()) => {
    if (depth[id] != null) return depth[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parentsOf[id];
    if (ps.length === 0) { depth[id] = 0; return 0; }
    const d = 1 + Math.max(...ps.map((p) => visit(p, seen)));
    depth[id] = d;
    return d;
  };
  nodes.forEach((n) => visit(n.id));

  // Group by column.
  const columns = {};
  nodes.forEach((n) => {
    const d = depth[n.id] ?? 0;
    (columns[d] ||= []).push(n);
  });

  // Sort within columns by average parent y; iterate a couple of sweeps to settle.
  const positions = {};
  const colKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);

  // Initial: stable order by creation time (= array index in nodes).
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  colKeys.forEach((d) => columns[d].sort((a, b) => idx[a.id] - idx[b.id]));

  // Assign initial y by row index in column, centered.
  const placeColumn = (d) => {
    const col = columns[d];
    const totalH = col.length * ROW_H;
    col.forEach((n, i) => {
      positions[n.id] = {
        x: PAD_X + d * COL_W,
        y: PAD_Y + i * ROW_H + (ROW_H / 2) - totalH / 2 + 400, // roughly centered around y=400
      };
    });
  };
  colKeys.forEach(placeColumn);

  // Two sweeps: order columns 1..N by avg parent y, then re-place.
  for (let sweep = 0; sweep < 3; sweep++) {
    for (let i = 1; i < colKeys.length; i++) {
      const d = colKeys[i];
      const col = columns[d];
      col.sort((a, b) => {
        const py = (n) => {
          const ps = parentsOf[n.id];
          if (ps.length === 0) return positions[n.id].y;
          return ps.reduce((s, p) => s + (positions[p]?.y || 0), 0) / ps.length;
        };
        return py(a) - py(b);
      });
      const totalH = col.length * ROW_H;
      col.forEach((n, k) => {
        positions[n.id].y = PAD_Y + k * ROW_H + (ROW_H / 2) - totalH / 2 + 400;
      });
    }
  }

  // Compute bounds.
  let maxX = 0, minY = Infinity, maxY = -Infinity;
  Object.values(positions).forEach((p) => {
    maxX = Math.max(maxX, p.x + NODE_W);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + NODE_H);
  });
  // Normalize y so minY = PAD_Y
  const yShift = PAD_Y - minY;
  Object.values(positions).forEach((p) => { p.y += yShift; });

  const bounds = {
    w: maxX + PAD_X,
    h: (maxY - minY) + PAD_Y * 2,
  };
  return { positions, bounds, depth };
}

window.layoutDag = layoutDag;
window.NODE_W = NODE_W;
window.NODE_H = NODE_H;
