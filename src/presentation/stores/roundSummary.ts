import type { GameEvent, RoundEndSummary } from '@/presentation/stores/gameStore'

/**
 * Screen-only hints describing the round that just ended plus the last
 * transient banner event. They are NOT part of the GameState, so without
 * persisting them a reload (F5 / PWA relaunch) on the round-end screen
 * would drop the per-player "+pts", the final hands and the reason
 * banner. Saving them alongside the game keeps that screen fully intact.
 *
 * Stored under its own versioned key, mirroring the history journal.
 */
export interface RoundSummarySnapshot {
  readonly lastRoundScores: readonly number[] | null
  readonly lastRoundEnd: RoundEndSummary | null
  readonly lastEvent: GameEvent | null
}

export const ROUND_SUMMARY_STORAGE_KEY = 'flip7:round-summary-v1'

/** Read the snapshot from storage. Returns null on miss or corruption. */
export function loadRoundSummary(
  storage: Storage = window.localStorage,
): RoundSummarySnapshot | null {
  let raw: string | null
  try {
    raw = storage.getItem(ROUND_SUMMARY_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    return JSON.parse(raw) as RoundSummarySnapshot
  } catch {
    return null
  }
}

export function saveRoundSummary(
  snapshot: RoundSummarySnapshot,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(ROUND_SUMMARY_STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearRoundSummary(storage: Storage = window.localStorage): void {
  storage.removeItem(ROUND_SUMMARY_STORAGE_KEY)
}
