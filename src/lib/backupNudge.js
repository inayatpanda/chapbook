// Backup reminder — the pure decision behind "your drafts only live in this browser".
//
// WHY: drafts, partner sessions, snapshots and the idea inbox live ONLY in this browser's
// IndexedDB (seams/storage.js). Published posts are safe in GitHub; unpublished work is one
// Safari ITP eviction, cleared-storage click or lost laptop away from gone for good.
// Settings already explains this and offers Export drafts — but only to someone who has
// gone looking. The person who most needs the warning is the one who never opens Settings,
// so this decides when to say it unprompted.
//
// Deliberately NOT a nag: it stays quiet until there is real work at stake, goes quiet again
// the moment you export, and a dismissal snoozes it rather than firing on every boot.
//
// PORTABILITY: Chapbook-only (public product). Helm's owner tool has no buyer to warn.

// Below this, the user has a note or two and a banner is noise, not care.
export const NUDGE_AFTER_ITEMS = 3;
// A fortnight of writing is enough to hurt to lose.
export const REEXPORT_AFTER_DAYS = 14;
// "Not now" should mean a week, not forever.
export const SNOOZE_DAYS = 7;

const DAY_MS = 86400000;

// Parse an ISO timestamp defensively. localStorage is user-writable and survives across
// versions, so anything in it may be absent, corrupt, or hand-edited. Returns null for
// everything that is not a real finite date — callers treat null as "no such event".
function parseAt(value) {
  if (typeof value !== 'string' || !value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

// Decide whether to show the backup reminder.
//
//   itemCount    total records across every local store (drafts, sessions, snapshots, ideas…)
//   lastExportAt ISO string of the last successful Settings → Export drafts, if any
//   snoozedAt    ISO string of the last dismissal, if any
//   now          epoch ms (injectable for tests)
//
// Returns { show, reason, message } where reason is 'never' | 'stale' | null.
export function shouldNudgeBackup({ itemCount, lastExportAt, snoozedAt, now = Date.now() } = {}) {
  const quiet = (reason = null) => ({ show: false, reason, message: '' });

  // Nothing to lose — never warn about an empty browser.
  const count = Number(itemCount);
  if (!Number.isFinite(count) || count < NUDGE_AFTER_ITEMS) return quiet();

  const exported = parseAt(lastExportAt);
  const snoozed = parseAt(snoozedAt);

  // A recent export means the work IS backed up; say nothing regardless of dismissals.
  // A future timestamp counts as recent — clock skew should not manufacture a warning.
  const backedUpRecently = exported !== null && now - exported < REEXPORT_AFTER_DAYS * DAY_MS;
  if (backedUpRecently) return quiet();

  // Respect a dismissal for a week. A snooze in the FUTURE is nonsense (skew or a hand-edit)
  // and must not silence the warning for a year, so only a past snooze counts.
  if (snoozed !== null && snoozed <= now && now - snoozed < SNOOZE_DAYS * DAY_MS) return quiet();

  const reason = exported === null ? 'never' : 'stale';
  const items = `${count} item${count === 1 ? '' : 's'}`;
  const message = reason === 'never'
    ? `You have ${items} saved only in this browser. If this browser clears its storage, they are gone — export a backup from Settings.`
    : `Your last backup was over ${REEXPORT_AFTER_DAYS} days ago and you have ${items} in this browser. Export a fresh copy from Settings.`;

  return { show: true, reason, message };
}
