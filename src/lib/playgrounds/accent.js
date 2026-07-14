/* Accent engine — re-tint a built playground's CSS onto a chosen accent ramp.
   67/71 families hard-code the site palette hexes (#22d3ee cyan, #2dd4bf teal,
   #818cf8 violet) and their rgb() triplets; 8 use var(--cyan/--teal/--violet).
   applyAccent() substitutes BOTH forms in a SINGLE pass (so a colour introduced
   by the substitution is never re-substituted) and also sets the vars on #domId.
   accent 'default' (or unknown/invalid) is the identity transform. */

const SRC = {
  cyan:   { hex: '#22d3ee', rgb: [34, 211, 238] },
  teal:   { hex: '#2dd4bf', rgb: [45, 212, 191] },
  violet: { hex: '#818cf8', rgb: [129, 140, 248] },
};

// Each named ramp maps the three source roles to three shades of one hue.
const RAMPS = {
  teal:   { cyan: '#5eead4', teal: '#2dd4bf', violet: '#0d9488' },
  cyan:   { cyan: '#67e8f9', teal: '#22d3ee', violet: '#0891b2' },
  violet: { cyan: '#a5b4fc', teal: '#818cf8', violet: '#6366f1' },
  amber:  { cyan: '#fcd34d', teal: '#f59e0b', violet: '#b45309' },
  rose:   { cyan: '#fda4af', teal: '#fb7185', violet: '#e11d48' },
};

export const ACCENTS = ['default', 'teal', 'cyan', 'violet', 'amber', 'rose', 'custom'];

function hexToRgb(hex) {
  let h = String(hex || '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
// mix toward white (amt>0) or black (amt<0); amt in [-1,1]
function shade(rgb, amt) {
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return rgb.map((v) => v + (t - v) * p);
}

function resolveRamp(accent, customHex) {
  if (accent === 'custom') {
    const base = hexToRgb(customHex);
    if (!base) return null;
    return { cyan: rgbToHex(shade(base, 0.35)), teal: rgbToHex(base), violet: rgbToHex(shade(base, -0.3)) };
  }
  return RAMPS[accent] || null;
}

export function applyAccent(css, accent, customHex, domId) {
  css = String(css || '');
  if (!accent || accent === 'default') return css;      // identity — byte-identical
  const ramp = resolveRamp(accent, customHex);
  if (!ramp) return css;                                 // unknown / invalid custom → no-op
  const hexMap = {
    [SRC.cyan.hex.toLowerCase()]: ramp.cyan,
    [SRC.teal.hex.toLowerCase()]: ramp.teal,
    [SRC.violet.hex.toLowerCase()]: ramp.violet,
  };
  let out = css.replace(/#(?:22d3ee|2dd4bf|818cf8)/gi, (m) => hexMap[m.toLowerCase()] || m);
  const tripMap = {
    '34,211,238': hexToRgb(ramp.cyan),
    '45,212,191': hexToRgb(ramp.teal),
    '129,140,248': hexToRgb(ramp.violet),
  };
  out = out.replace(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g, (m, r, g, b) => {
    const t = tripMap[r + ',' + g + ',' + b];
    return t ? (t[0] + ', ' + t[1] + ', ' + t[2]) : m;
  });
  const vars = `#${domId}{--cyan:${ramp.cyan};--teal:${ramp.teal};--violet:${ramp.violet};--acc:${ramp.teal};--accent:${ramp.teal}}`;
  return vars + '\n' + out;
}
