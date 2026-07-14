// Pure post-calendar helpers — bucket the SAME posts the Posts list loads onto a
// month grid, classify each as published / scheduled / draft, and build the grid.
// No DOM, no network (unit-tested in postCalendar.test.mjs). The inline Studio UI
// (public/studio/index.html) consumes these via window.__studioCalendar; the list
// view's own status logic (renderPosts/makePostRow) is mirrored here EXACTLY so the
// two views always agree:
//   scheduled = a hidden draft carrying a future publishAt
//   live      = not a draft (already published)
//   draft     = a draft with no schedule (an unscheduled working draft)

// ── classification ───────────────────────────────────────────────────────────

// A post is "scheduled" iff it's a draft AND carries a publishAt (mirrors the list
// view: `scheduled = !!(p.draft && p.publishAt)`). NOTE: matches makePostRow, which
// treats ANY draft+publishAt as scheduled regardless of whether the date is past —
// a past-due schedule that hasn't flipped yet still shows as Scheduled.
export function isScheduled(p) {
  return !!(p && p.draft && p.publishAt);
}

// One of 'live' | 'scheduled' | 'draft'. Order matters: scheduled is checked before
// the plain-draft fallback (a scheduled post is a draft underneath).
export function classifyPost(p) {
  if (isScheduled(p)) return 'scheduled';
  if (p && p.draft) return 'draft';
  return 'live';
}

// ── date handling ─────────────────────────────────────────────────────────────

// Local YYYY-MM-DD for a Date (the calendar buckets by LOCAL calendar day, so a
// scheduled publishAt at 23:00 local lands on the day the owner sees, not UTC).
export function toISODate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The day a post sits on:
//   scheduled → its publishAt (a full ISO timestamp) as a LOCAL calendar day,
//   everything else (live / unscheduled draft) → its `date` (already YYYY-MM-DD).
// Returns a YYYY-MM-DD string, or '' if the post has no usable date.
export function postDateFor(p) {
  if (!p) return '';
  if (isScheduled(p)) {
    const d = new Date(p.publishAt);
    return isNaN(d) ? '' : toISODate(d);
  }
  // `date` is authored as YYYY-MM-DD; tolerate a longer ISO string by slicing.
  const raw = p.date || '';
  return raw ? String(raw).slice(0, 10) : '';
}

// ── bucketing ─────────────────────────────────────────────────────────────────

// Map every post that has a usable day → { 'YYYY-MM-DD': [post, …] }. Posts with no
// date (e.g. a brand-new unsaved draft) are dropped — there's nowhere to place them.
// Within a day, posts are ordered live → scheduled → draft, then by title, so a day
// cell reads consistently. Unfiltered: callers pass whatever set they want shown.
export function bucketPostsByDay(posts) {
  const byDay = new Map();
  for (const p of posts || []) {
    const key = postDateFor(p);
    if (!key) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(p);
  }
  const rank = { live: 0, scheduled: 1, draft: 2 };
  for (const arr of byDay.values()) {
    arr.sort((a, b) => {
      const r = rank[classifyPost(a)] - rank[classifyPost(b)];
      if (r) return r;
      return String(a.title || a.slug || '').localeCompare(String(b.title || b.slug || ''));
    });
  }
  return byDay;
}

// The posts sitting on one local day (a 'YYYY-MM-DD' key), read from a
// bucketPostsByDay() map. The selected-day agenda panel and every grid cell go
// through this one selector so a day never shows a different set in two places.
// Always returns an array — [] for a bare day, a missing key, or a bad map.
export function postsForDay(byDay, iso) {
  if (!byDay || typeof byDay.get !== 'function' || !iso) return [];
  return byDay.get(iso) || [];
}

// ── month grid ────────────────────────────────────────────────────────────────

// Build a Monday-first 6-row × 7-col grid (always 42 cells, so the grid never
// jumps height between months). Each cell: { iso, day, inMonth, isToday }.
//   year  — full year (e.g. 2026)
//   month — 0-based (0 = January), matching JS Date
//   todayISO — the local YYYY-MM-DD considered "today" (injectable for tests)
export function buildMonthGrid(year, month, todayISO = toISODate(new Date())) {
  const first = new Date(year, month, 1);
  // JS getDay(): 0=Sun…6=Sat. Shift so Monday=0 … Sunday=6 (UK week starts Monday).
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = toISODate(d);
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      isToday: iso === todayISO,
    });
  }
  return cells;
}

// ── nav + labels ──────────────────────────────────────────────────────────────

// Step a {year, month} (month 0-based) by ±1, rolling the year over correctly.
export function stepMonth({ year, month }, delta) {
  const m = month + delta;
  return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
}
export function prevMonth(ym) { return stepMonth(ym, -1); }
export function nextMonth(ym) { return stepMonth(ym, 1); }

// Bounds for the month/year picker's year stepper, so a mis-tap can't wander the
// view off to an absurd year. Wide enough to span a working lifetime of
// scheduling, but bounded so navigation stays predictable and the grid always
// derives cleanly.
export const MIN_YEAR = 1970;
export const MAX_YEAR = 2999;

// Clamp a year into [MIN_YEAR, MAX_YEAR]. Non-numeric/non-finite input (a stray
// NaN from a parsed field) falls back to MIN_YEAR rather than producing a bad grid.
export function clampYear(year) {
  const y = Math.trunc(Number(year));
  if (!Number.isFinite(y)) return MIN_YEAR;
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));
}

// Jump the view straight to an explicit {year, month} (month 0-based), clamping
// both defensively: month → 0–11 (it never rolls into an adjacent year, unlike
// stepMonth), year → [MIN_YEAR, MAX_YEAR]. Returns a fresh {year, month} the
// caller hands to buildMonthGrid to derive the grid. The month/year picker uses
// this instead of assigning the view object directly, so a stray value can't
// build an out-of-range grid.
export function setMonthYear(year, month) {
  const m = Math.trunc(Number(month));
  const cm = Number.isFinite(m) ? Math.min(11, Math.max(0, m)) : 0;
  return { year: clampYear(year), month: cm };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Short month names for the compact month/year picker grid (Jan, Feb, …).
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "June 2026" — the header label for a {year, month}.
export function monthLabel({ year, month }) {
  return `${MONTHS[((month % 12) + 12) % 12]} ${year}`;
}

// "Sat 21 Jun 2026" — the heading for the day-detail panel beneath the grid.
// Built from a YYYY-MM-DD string at local midnight so it never drifts a day.
export function dayLabel(iso) {
  const d = new Date(String(iso) + 'T00:00:00');
  if (isNaN(d)) return '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${wd} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// The {year, month} a given local date falls in — used by the "Today" button and to
// seed the initial view. Defaults to now.
export function monthOf(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Mon-first weekday headers (short).
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── agenda (mobile fallback) ──────────────────────────────────────────────────

// For a narrow-screen agenda view: the days IN this month that actually have posts,
// ordered chronologically, each as { iso, day, posts }. Built from the same bucket
// map so the agenda and the grid never disagree.
export function agendaForMonth(byDay, year, month) {
  const out = [];
  for (const [iso, posts] of byDay.entries()) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) continue;
    out.push({ iso, day: d.getDate(), posts });
  }
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
}
