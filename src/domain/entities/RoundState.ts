import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'

/**
 * State of an in-progress round. Always tied to a parent
 * {@link GameState} and aligned on its `players` array order.
 *
 * `roundNumber` is intentionally NOT on this type: it lives on the
 * parent {@link GameState} so it survives the round lifecycle.
 */
export interface RoundState {
  readonly playerStates: readonly PlayerRoundState[]
  /** Index inside `playerStates` whose turn it currently is. */
  readonly activePlayerIndex: number
}

export function hasActivePlayers(round: RoundState): boolean {
  return round.playerStates.some((s) => s.status === 'active')
}

/**
 * A round must end as soon as either:
 *  - someone has reached Flip 7 (immediate end), or
 *  - no player is `active` anymore (everyone stayed, busted or got frozen).
 */
export function shouldEndRound(round: RoundState): boolean {
  if (round.playerStates.some((s) => s.status === 'flip7')) return true
  return !hasActivePlayers(round)
}

/**
 * Find the next player whose status is `active`, walking the rotation
 * starting **after** `fromIndex`. Returns `null` when no other player
 * is still active (the round should then be ended).
 */
export function nextActivePlayerIndex(round: RoundState, fromIndex: number): number | null {
  const n = round.playerStates.length
  if (n === 0) return null

  for (let offset = 1; offset <= n; offset += 1) {
    const idx = (fromIndex + offset) % n
    const state = round.playerStates[idx] as PlayerRoundState
    if (state.status === 'active') return idx
  }
  return null
}
