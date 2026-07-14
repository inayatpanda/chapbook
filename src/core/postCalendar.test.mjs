import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isScheduled, classifyPost, toISODate, postDateFor, bucketPostsByDay,
  buildMonthGrid, stepMonth, prevMonth, nextMonth, monthLabel, monthOf,
  agendaForMonth, WEEKDAYS, MONTHS_SHORT, dayLabel,
  postsForDay, setMonthYear, clampYear, MIN_YEAR, MAX_YEAR,
} from './postCalendar.js';

// ── classification mirrors the Posts list (renderPosts/makePostRow) ──────────

test('a published (non-draft) post is "live"', () => {
  assert.equal(classifyPost({ draft: false, date: '2026-06-10' }), 'live');
  assert.equal(isScheduled({ draft: false, publishAt: '2026-07-01T09:00:00Z' }), false);
});

test('a draft carrying publishAt is "scheduled"', () => {
  const p = { draft: true, publishAt: '2026-07-01T09:00:00Z' };
  assert.equal(isScheduled(p), true);
  assert.equal(classifyPost(p), 'scheduled');
});

test('a draft with no publishAt is a plain "draft"', () => {
  assert.equal(classifyPost({ draft: true, publishAt: '' }), 'draft');
  assert.equal(classifyPost({ draft: true }), 'draft');
});

test('scheduled is checked before the draft fallback', () => {
  // a scheduled post IS a draft underneath — must not be mislabelled "draft"
  assert.equal(classifyPost({ draft: true, publishAt: '2099-01-01T00:00:00Z' }), 'scheduled');
});

// ── date handling ────────────────────────────────────────────────────────────

test('toISODate formats a local Y-M-D and rejects bad input', () => {
  assert.equal(toISODate(new Date(2026, 5, 9)), '2026-06-09'); // month is 0-based → June
  assert.equal(toISODate(new Date('nope')), '');
  assert.equal(toISODate(null), '');
});

test('postDateFor uses date for live/draft and publishAt for scheduled', () => {
  assert.equal(postDateFor({ draft: false, date: '2026-06-10' }), '2026-06-10');
  assert.equal(postDateFor({ draft: true, date: '2026-06-10' }), '2026-06-10'); // unscheduled draft
  // scheduled → its publishAt day. Use local-midday to dodge TZ edge flips in CI.
  const iso = '2026-07-01T12:00:00';
  const day = toISODate(new Date(iso));
  assert.equal(postDateFor({ draft: true, publishAt: iso }), day);
});

test('postDateFor tolerates a long ISO date string and missing dates', () => {
  assert.equal(postDateFor({ draft: false, date: '2026-06-10T00:00:00Z' }), '2026-06-10');
  assert.equal(postDateFor({ draft: false, date: '' }), '');
  assert.equal(postDateFor(null), '');
});

// ── bucketing ────────────────────────────────────────────────────────────────

test('bucketPostsByDay groups posts onto their day and drops undated ones', () => {
  const posts = [
    { slug: 'a', title: 'A', draft: false, date: '2026-06-10' },
    { slug: 'b', title: 'B', draft: false, date: '2026-06-10' },
    { slug: 'c', title: 'C', draft: true, publishAt: '2026-06-20T12:00:00' },
    { slug: 'd', title: 'D', draft: true, date: '' }, // undated → dropped
  ];
  const byDay = bucketPostsByDay(posts);
  assert.deepEqual(byDay.get('2026-06-10').map((p) => p.slug), ['a', 'b']);
  assert.equal(byDay.get(toISODate(new Date('2026-06-20T12:00:00'))).length, 1);
  // 'd' has no day key anywhere
  assert.equal([...byDay.values()].flat().some((p) => p.slug === 'd'), false);
});

test('within a day, posts order live → scheduled → draft, then by title', () => {
  const posts = [
    { slug: 'z', title: 'Zed draft', draft: true, date: '2026-06-10' },
    { slug: 's', title: 'Sched', draft: true, publishAt: '2026-06-10T12:00:00' },
    { slug: 'l2', title: 'Beta live', draft: false, date: '2026-06-10' },
    { slug: 'l1', title: 'Alpha live', draft: false, date: '2026-06-10' },
  ];
  const day = bucketPostsByDay(posts).get('2026-06-10').map((p) => p.slug);
  assert.deepEqual(day, ['l1', 'l2', 's', 'z']);
});

test('bucketPostsByDay handles empty/nullish input', () => {
  assert.equal(bucketPostsByDay([]).size, 0);
  assert.equal(bucketPostsByDay(null).size, 0);
});

// ── postsForDay selector (the click-a-date agenda + each grid cell read this) ──

test('postsForDay returns a multi-post day in the bucketed order', () => {
  const posts = [
    { slug: 'z', title: 'Zed draft', draft: true, date: '2026-06-10' },
    { slug: 's', title: 'Sched', draft: true, publishAt: '2026-06-10T12:00:00' },
    { slug: 'l', title: 'Alpha live', draft: false, date: '2026-06-10' },
  ];
  const byDay = bucketPostsByDay(posts);
  // same live → scheduled → draft ordering the bucket applied — no re-sorting here
  assert.deepEqual(postsForDay(byDay, '2026-06-10').map((p) => p.slug), ['l', 's', 'z']);
});

test('postsForDay returns [] for an empty day and never shares the bucket array', () => {
  const byDay = bucketPostsByDay([{ slug: 'a', draft: false, date: '2026-06-10' }]);
  assert.deepEqual(postsForDay(byDay, '2026-06-11'), []); // a bare day
  assert.equal(postsForDay(byDay, '2026-06-10').length, 1);
});

test('postsForDay is defensive about a bad map or missing key', () => {
  assert.deepEqual(postsForDay(null, '2026-06-10'), []);
  assert.deepEqual(postsForDay(new Map(), ''), []);
  assert.deepEqual(postsForDay({}, '2026-06-10'), []); // not a real Map (no .get)
});

// ── month grid ───────────────────────────────────────────────────────────────

test('buildMonthGrid is always 42 cells, Monday-first', () => {
  // June 2026: 1 June is a Monday → no lead-in blanks from May.
  const cells = buildMonthGrid(2026, 5, '2026-06-15');
  assert.equal(cells.length, 42);
  assert.equal(cells[0].iso, '2026-06-01');
  assert.equal(cells[0].inMonth, true);
  assert.equal(cells[0].day, 1);
  // last in-month day is 30 June; cell 30 (index 30) is 1 July (spill-over)
  const june30 = cells.find((c) => c.iso === '2026-06-30');
  assert.ok(june30 && june30.inMonth);
  const july1 = cells.find((c) => c.iso === '2026-07-01');
  assert.ok(july1 && !july1.inMonth);
});

test('buildMonthGrid pads lead-in days from the previous month', () => {
  // July 2026: 1 July is a Wednesday → Mon/Tue lead-in from June (29, 30).
  const cells = buildMonthGrid(2026, 6, '2026-07-01');
  assert.equal(cells[0].iso, '2026-06-29'); // Monday
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[2].iso, '2026-07-01'); // Wednesday
  assert.equal(cells[2].inMonth, true);
});

test('buildMonthGrid marks today correctly', () => {
  const cells = buildMonthGrid(2026, 5, '2026-06-15');
  const today = cells.find((c) => c.isToday);
  assert.ok(today);
  assert.equal(today.iso, '2026-06-15');
  assert.equal(cells.filter((c) => c.isToday).length, 1);
});

test('buildMonthGrid derives an arbitrary month (leap Feb 2028) correctly', () => {
  // Jumping straight to Feb 2028 via the picker: 1 Feb 2028 is a Tuesday, so one
  // Monday lead-in from January; the leap day (29 Feb) is present and in-month.
  const cells = buildMonthGrid(2028, 1, '2028-06-01');
  assert.equal(cells.length, 42);
  assert.equal(cells[0].iso, '2028-01-31'); // Monday lead-in
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[1].iso, '2028-02-01'); // Tuesday, first in-month day
  assert.equal(cells[1].inMonth, true);
  const feb29 = cells.find((c) => c.iso === '2028-02-29');
  assert.ok(feb29 && feb29.inMonth); // leap day
  const mar1 = cells.find((c) => c.iso === '2028-03-01');
  assert.ok(mar1 && !mar1.inMonth); // spill-over
  assert.equal(cells.filter((c) => c.inMonth).length, 29); // 29 days in the month
});

// ── nav + labels ─────────────────────────────────────────────────────────────

test('stepMonth rolls the year over at both boundaries', () => {
  assert.deepEqual(nextMonth({ year: 2026, month: 11 }), { year: 2027, month: 0 });
  assert.deepEqual(prevMonth({ year: 2026, month: 0 }), { year: 2025, month: 11 });
  assert.deepEqual(stepMonth({ year: 2026, month: 5 }, 12), { year: 2027, month: 5 });
  assert.deepEqual(stepMonth({ year: 2026, month: 5 }, -6), { year: 2025, month: 11 });
});

// ── month/year quick-jump (the picker) + clamping ────────────────────────────

test('clampYear holds the year inside [MIN_YEAR, MAX_YEAR]', () => {
  assert.equal(clampYear(2026), 2026);
  assert.equal(clampYear(MIN_YEAR - 5), MIN_YEAR); // below → floor
  assert.equal(clampYear(MAX_YEAR + 5), MAX_YEAR); // above → ceiling
  assert.equal(clampYear(2026.9), 2026);           // truncates toward zero
  assert.equal(clampYear(NaN), MIN_YEAR);          // non-finite → floor, never NaN
  assert.equal(clampYear('2030'), 2030);           // numeric string coerces
});

test('setMonthYear jumps to an explicit month+year, clamping both', () => {
  assert.deepEqual(setMonthYear(2028, 1), { year: 2028, month: 1 }); // straight jump
  // month clamps to 0–11 (it never rolls the year, unlike stepMonth)
  assert.deepEqual(setMonthYear(2026, -3), { year: 2026, month: 0 });
  assert.deepEqual(setMonthYear(2026, 99), { year: 2026, month: 11 });
  // year clamps to the picker bounds
  assert.deepEqual(setMonthYear(MIN_YEAR - 100, 5), { year: MIN_YEAR, month: 5 });
  assert.deepEqual(setMonthYear(MAX_YEAR + 100, 5), { year: MAX_YEAR, month: 5 });
  // a clamped result still derives a valid 42-cell grid
  const { year, month } = setMonthYear(9999, 40);
  assert.equal(buildMonthGrid(year, month, '2000-01-01').length, 42);
});

test('monthLabel + monthOf + WEEKDAYS', () => {
  assert.equal(monthLabel({ year: 2026, month: 5 }), 'June 2026');
  assert.equal(monthLabel({ year: 2026, month: 0 }), 'January 2026');
  assert.deepEqual(monthOf(new Date(2026, 5, 21)), { year: 2026, month: 5 });
  assert.equal(WEEKDAYS[0], 'Mon');
  assert.equal(WEEKDAYS[6], 'Sun');
});

test('MONTHS_SHORT labels the month/year picker grid (Jan…Dec)', () => {
  assert.equal(MONTHS_SHORT.length, 12);
  assert.equal(MONTHS_SHORT[0], 'Jan');
  assert.equal(MONTHS_SHORT[5], 'Jun');
  assert.equal(MONTHS_SHORT[11], 'Dec');
});

test('dayLabel heads the day-detail panel as "Wd D Mon YYYY"', () => {
  // 21 June 2026 is a Sunday.
  assert.equal(dayLabel('2026-06-21'), 'Sun 21 Jun 2026');
  // 20 June 2026 is a Saturday (the example in the brief).
  assert.equal(dayLabel('2026-06-20'), 'Sat 20 Jun 2026');
  // tolerates a longer ISO string and rejects junk.
  assert.equal(dayLabel('2026-01-01T09:00:00Z'.slice(0, 10)), 'Thu 1 Jan 2026');
  assert.equal(dayLabel('nope'), '');
});

// ── agenda (mobile) ──────────────────────────────────────────────────────────

test('agendaForMonth lists only this-month days with posts, chronologically', () => {
  const posts = [
    { slug: 'a', title: 'A', draft: false, date: '2026-06-20' },
    { slug: 'b', title: 'B', draft: false, date: '2026-06-05' },
    { slug: 'c', title: 'C', draft: false, date: '2026-07-01' }, // other month → excluded
  ];
  const agenda = agendaForMonth(bucketPostsByDay(posts), 2026, 5);
  assert.deepEqual(agenda.map((d) => d.iso), ['2026-06-05', '2026-06-20']);
  assert.equal(agenda[0].posts[0].slug, 'b');
});
