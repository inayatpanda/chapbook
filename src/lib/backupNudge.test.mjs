import { test } from 'node:test';
import assert from 'node:assert';
import {
  shouldNudgeBackup, NUDGE_AFTER_ITEMS, REEXPORT_AFTER_DAYS, SNOOZE_DAYS,
} from './backupNudge.js';

const NOW = Date.parse('2026-08-01T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();
const ask = (o) => shouldNudgeBackup({ now: NOW, ...o });

test('says nothing when there is nothing to lose', () => {
  assert.equal(ask({ itemCount: 0 }).show, false);
});

test('does not nag over a single throwaway note', () => {
  assert.equal(ask({ itemCount: 1 }).show, false);
  assert.equal(ask({ itemCount: NUDGE_AFTER_ITEMS - 1 }).show, false);
});

test('nudges once enough unexported work has built up', () => {
  const r = ask({ itemCount: NUDGE_AFTER_ITEMS });
  assert.equal(r.show, true);
  assert.equal(r.reason, 'never');
});

test('stops nudging right after an export', () => {
  assert.equal(ask({ itemCount: 50, lastExportAt: daysAgo(0) }).show, false);
  assert.equal(ask({ itemCount: 50, lastExportAt: daysAgo(REEXPORT_AFTER_DAYS - 1) }).show, false);
});

test('nudges again once the last backup goes stale', () => {
  const r = ask({ itemCount: 50, lastExportAt: daysAgo(REEXPORT_AFTER_DAYS + 1) });
  assert.equal(r.show, true);
  assert.equal(r.reason, 'stale');
});

test('a dismissal snoozes the nudge rather than nagging on every boot', () => {
  assert.equal(ask({ itemCount: 50, snoozedAt: daysAgo(0) }).show, false);
  assert.equal(ask({ itemCount: 50, snoozedAt: daysAgo(SNOOZE_DAYS - 1) }).show, false);
});

test('the nudge returns after the snooze expires', () => {
  assert.equal(ask({ itemCount: 50, snoozedAt: daysAgo(SNOOZE_DAYS + 1) }).show, true);
});

// A dismissal must not be permanent: work keeps accumulating after it.
test('a snooze does not outrank a genuinely stale backup forever', () => {
  const r = ask({ itemCount: 50, lastExportAt: daysAgo(90), snoozedAt: daysAgo(SNOOZE_DAYS + 1) });
  assert.equal(r.show, true);
  assert.equal(r.reason, 'stale');
});

// Corrupt/hand-edited localStorage must never crash boot or wedge the nudge on/off.
test('garbage timestamps are treated as "never exported", not as a crash', () => {
  for (const bad of ['', 'not-a-date', null, undefined, 42, {}, 'NaN']) {
    const r = ask({ itemCount: 50, lastExportAt: bad });
    assert.equal(r.show, true, `lastExportAt=${JSON.stringify(bad)} should still nudge`);
  }
});

test('a garbage snooze does not suppress the nudge', () => {
  assert.equal(ask({ itemCount: 50, snoozedAt: 'not-a-date' }).show, true);
});

test('a future timestamp (clock skew) cannot suppress the nudge forever', () => {
  const r = ask({ itemCount: 50, lastExportAt: new Date(NOW + 365 * 86400000).toISOString() });
  assert.equal(r.show, false, 'a future export date is still "recent"');
  // ...but a future SNOOZE must not lock the nudge off for a year.
  assert.equal(ask({ itemCount: 50, snoozedAt: new Date(NOW + 365 * 86400000).toISOString() }).show, true);
});

test('a non-numeric item count is treated as nothing to back up', () => {
  for (const bad of [undefined, null, 'lots', NaN, -3]) {
    assert.equal(ask({ itemCount: bad }).show, false, `itemCount=${String(bad)}`);
  }
});

test('the caller gets a message it can show verbatim', () => {
  const r = ask({ itemCount: 7 });
  assert.equal(typeof r.message, 'string');
  assert.ok(r.message.includes('7'), 'the message should name how much is at stake');
});
