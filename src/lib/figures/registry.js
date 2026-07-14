// Figure family registry.
// To add a family: import its module and append it to FAMILIES (one line).
// Every family module exports { meta, build } per the family contract.

import * as labelledDiagram from './labelled-diagram.js';
import * as stepFlow from './step-flow.js';
import * as crossSection from './cross-section.js';
import * as annotationArrows from './annotation-arrows.js';
import * as timeline from './timeline.js';
import * as cycle from './cycle.js';
import * as flowDecision from './flow-decision.js';
import * as beforeAfter from './before-after.js';
import * as comparisonMatrix from './comparison-matrix.js';
import * as vennOverlap from './venn-overlap.js';
import * as hierarchy from './hierarchy.js';
import * as barCompare from './bar-compare.js';
import * as partToWhole from './part-to-whole.js';
import * as rangeScale from './range-scale.js';
import * as smallMultiples from './small-multiples.js';
import * as pulse from './pulse.js';
import * as rotate from './rotate.js';
import * as oscillate from './oscillate.js';
import * as flow from './flow.js';
import * as wave from './wave.js';
import * as fill from './fill.js';
import * as morph from './morph.js';
import * as stages from './stages.js';

// The full set of registered families. Add new families here.
const FAMILIES = [
  labelledDiagram,
  stepFlow,
  crossSection,
  annotationArrows,
  timeline,
  cycle,
  flowDecision,
  beforeAfter,
  comparisonMatrix,
  vennOverlap,
  hierarchy,
  barCompare,
  partToWhole,
  rangeScale,
  smallMultiples,
  pulse,
  rotate,
  oscillate,
  flow,
  wave,
  fill,
  morph,
  stages,
];

// id -> family module map (built once from FAMILIES).
const byId = new Map(FAMILIES.map((mod) => [mod.meta.id, mod]));

// Array of each family's meta (for listing in the UI / API).
export function listFamilies() {
  return FAMILIES.map((mod) => mod.meta);
}

// Build a figure by family id. Throws on unknown id.
export function build(id, params, opts) {
  const mod = byId.get(id);
  if (!mod) throw new Error(`Unknown figure family: ${id}`);
  return mod.build(params, opts);
}
