// themes.jsx — three aesthetic directions for the Future Tech game.
// Each theme is a flat object of CSS custom-property values applied to :root.

const THEMES = {
  archive: {
    label: 'Editorial Archive',
    blurb: 'Museum / serif / archival',
    vars: {
      '--bg': '#f4f1ea',
      '--bg-deep': '#ebe7dd',
      '--ink': '#1a1814',
      '--ink-soft': 'rgba(26,24,20,.62)',
      '--ink-faint': 'rgba(26,24,20,.32)',
      '--rule': 'rgba(26,24,20,.14)',
      '--rule-strong': 'rgba(26,24,20,.32)',
      '--node-bg': '#fbfaf6',
      '--node-shadow': '0 1px 0 rgba(255,255,255,.9) inset, 0 8px 24px -10px rgba(26,24,20,.18)',
      '--node-shadow-hover': '0 1px 0 rgba(255,255,255,.9) inset, 0 14px 36px -10px rgba(26,24,20,.28)',
      '--accent': '#7a3b1f',
      '--accent-soft': 'rgba(122,59,31,.10)',
      '--breakthrough': '#7a3b1f',
      '--paradigm': '#1a1814',
      '--edge': 'rgba(26,24,20,.28)',
      '--edge-active': '#7a3b1f',
      '--font-display': '"Cormorant Garamond", "EB Garamond", Georgia, serif',
      '--font-body': '"Inter", ui-sans-serif, system-ui, sans-serif',
      '--font-mono': '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
      '--node-radius': '4px',
      '--era-tone': '#7a3b1f',
      '--bg-grid': 'radial-gradient(circle at 1px 1px, rgba(26,24,20,.07) 1px, transparent 0)',
      '--bg-grid-size': '24px 24px',
      '--combiner-bg': 'rgba(251,250,246,.92)',
      '--toast-bg': '#1a1814',
      '--toast-ink': '#f4f1ea',
    },
  },
  terminal: {
    label: 'Sci-fi Terminal',
    blurb: 'Dark / mono / phosphor',
    vars: {
      '--bg': '#06080a',
      '--bg-deep': '#03050a',
      '--ink': '#cfe9d8',
      '--ink-soft': 'rgba(207,233,216,.62)',
      '--ink-faint': 'rgba(207,233,216,.32)',
      '--rule': 'rgba(120,200,160,.18)',
      '--rule-strong': 'rgba(120,200,160,.40)',
      '--node-bg': 'rgba(10,18,16,.86)',
      '--node-shadow': '0 0 0 .5px rgba(120,200,160,.30) inset, 0 0 24px -8px rgba(80,220,150,.30)',
      '--node-shadow-hover': '0 0 0 .5px rgba(120,200,160,.55) inset, 0 0 36px -6px rgba(80,220,150,.55)',
      '--accent': '#7af0a8',
      '--accent-soft': 'rgba(122,240,168,.12)',
      '--breakthrough': '#f0d27a',
      '--paradigm': '#f07a9a',
      '--edge': 'rgba(122,240,168,.32)',
      '--edge-active': '#7af0a8',
      '--font-display': '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
      '--font-body': '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
      '--font-mono': '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
      '--node-radius': '2px',
      '--era-tone': '#7af0a8',
      '--bg-grid': 'linear-gradient(rgba(122,240,168,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(122,240,168,.05) 1px, transparent 1px)',
      '--bg-grid-size': '40px 40px, 40px 40px',
      '--combiner-bg': 'rgba(6,10,12,.92)',
      '--toast-bg': '#7af0a8',
      '--toast-ink': '#03050a',
    },
  },
};

function applyTheme(name) {
  const theme = THEMES[name] || THEMES.archive;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = name;
}

window.THEMES = THEMES;
window.applyTheme = applyTheme;
