/* Family registry. Add a family by importing it and listing it here.
   NOTE (import cycle): family modules import shared helpers (esc) from ./index.js,
   and index.js imports this registry — a cycle. Building the id→family map EAGERLY
   at module-evaluation time threw "Cannot access '<family>' before initialization"
   whenever a family module was the import ENTRY point (the entry evaluates LAST, so
   its default binding was still in TDZ when this module's body ran). The bundled
   Studio always enters via index.js — family bodies evaluate BEFORE this module's —
   so the running app never hit it, but a direct import (tests, tooling, future
   refactors) did. The list + map are therefore built LAZILY inside getFamilies():
   by the time anyone can CALL it, every module in the cycle has finished evaluating,
   and the map is identical to the old eager one. */
import toggleAb from './toggle-ab.js';
import functionExplorer from './function-explorer.js';
import stepperTimeline from './stepper-timeline.js';
import scatterSim from './scatter-sim.js';
import tappableMeter from './tappable-meter.js';
import mixer from './mixer.js';
import stopwatch from './stopwatch.js';
import leverGeometry from './lever-geometry.js';
import sortablePriority from './sortable-priority.js';
import quizReveal from './quiz-reveal.js';
import chartData from './chart-data.js';
import beforeAfter from './before-after.js';
import hotspots from './hotspots.js';
import riskGrid from './risk-grid.js';
import gaugeDial from './gauge-dial.js';
import flipCards from './flip-cards.js';
import layerPeel from './layer-peel.js';
// general-topic widgets
import diceRoller from './dice-roller.js';
import reactionTimer from './reaction-timer.js';
import tipSplit from './tip-split.js';
import compoundGrowth from './compound-growth.js';
import countdown from './countdown.js';
import bpmTap from './bpm-tap.js';
import wordStats from './word-stats.js';
import wheelSpinner from './wheel-spinner.js';
import memoryMatch from './memory-match.js';
import starRating from './star-rating.js';
import emojiSlider from './emoji-slider.js';
import odometer from './odometer.js';
import wordScramble from './word-scramble.js';
// books / travel / paintings
import colourPalette from './colour-palette.js';
import worldClocks from './world-clocks.js';
import bookShelf from './book-shelf.js';
import mapRoute from './map-route.js';
// film / sport / food / science
import recipeScaler from './recipe-scaler.js';
import spectrumScale from './spectrum-scale.js';
import guessSlider from './guess-slider.js';
import bracket from './bracket.js';
// music / money / nature / language
import chordDiagram from './chord-diagram.js';
import budgetDonut from './budget-donut.js';
import moonPhase from './moon-phase.js';
import morseCode from './morse-code.js';
// history / geography / weather / relationships / productivity
import timelineScrubber from './timeline-scrubber.js';
import higherLower from './higher-lower.js';
import forecastStrip from './forecast-strip.js';
import quadrantPlot from './quadrant-plot.js';
import checklist from './checklist.js';
// filling out thin categories (ui, art, music, language, history, weather, comparison, reveal, diagram)
import toggleSwitches from './toggle-switches.js';
import tabsPanel from './tabs-panel.js';
import gradientMaker from './gradient-maker.js';
import colourHarmony from './colour-harmony.js';
import beatSequencer from './beat-sequencer.js';
import keyboardNotes from './keyboard-notes.js';
import caesarCipher from './caesar-cipher.js';
import natoPhonetic from './nato-phonetic.js';
import chronologyGame from './chronology-game.js';
import timeSince from './time-since.js';
import tempConverter from './temp-converter.js';
import weatherScene from './weather-scene.js';
import prosCons from './pros-cons.js';
import accordion from './accordion.js';
import decisionTree from './decision-tree.js';
// interactive HTML drops
import poll from './poll.js';
import scratchReveal from './scratch-reveal.js';
import swipeCarousel from './swipe-carousel.js';
// sampler starter-pack interactives (also used by the site's example posts)
import keyboardLayout from './keyboard-layout.js';
import doneness from './doneness.js';
import keyChange from './key-change.js';
import easingCurves from './easing-curves.js';
// WS4 purpose-built additions (interactives-upgrade)
import imageAnnotator from './image-annotator.js';
import stepExplainer from './step-explainer.js';
import scoredQuiz from './scored-quiz.js';
import sortableTable from './sortable-table.js';

const all = () => [
  toggleAb, functionExplorer, stepperTimeline, scatterSim,
  tappableMeter, mixer, stopwatch, leverGeometry,
  sortablePriority, quizReveal, chartData, beforeAfter, hotspots,
  riskGrid, gaugeDial, flipCards, layerPeel,
  diceRoller, reactionTimer, tipSplit, compoundGrowth, countdown, bpmTap,
  wordStats, wheelSpinner, memoryMatch, starRating, emojiSlider, odometer, wordScramble,
  colourPalette, worldClocks, bookShelf, mapRoute,
  recipeScaler, spectrumScale, guessSlider, bracket,
  chordDiagram, budgetDonut, moonPhase, morseCode,
  timelineScrubber, higherLower, forecastStrip, quadrantPlot, checklist,
  toggleSwitches, tabsPanel, gradientMaker, colourHarmony, beatSequencer, keyboardNotes,
  caesarCipher, natoPhonetic, chronologyGame, timeSince, tempConverter, weatherScene,
  prosCons, accordion, decisionTree,
  poll, scratchReveal, swipeCarousel,
  keyboardLayout, doneness, keyChange, easingCurves,
  imageAnnotator, stepExplainer, scoredQuiz, sortableTable,
];

let _families = null;
export function getFamilies() {
  if (!_families) _families = all().reduce((m, f) => { m[f.id] = f; return m; }, {});
  return _families;
}
