import type { ModifierCard, NumberCard, SecondChanceCard } from '@/domain/entities/Card'
import type { PlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

/**
 * Snapshot of one player's state inside a single round.
 * Treated as immutable: every mutation returns a new object.
 */
export interface PlayerRoundState {
  readonly playerId: PlayerId
  readonly numberCards: readonly NumberCard[]
  readonly modifiers: readonly ModifierCard[]
  readonly secondChance: SecondChanceCard | null
  readonly status: PlayerStatus
}

export function createPlayerRoundState(playerId: PlayerId): PlayerRoundState {
  return {
    playerId,
    numberCards: [],
    modifiers: [],
    secondChance: null,
    status: 'active',
  }
}

export function hasNumberValue(state: PlayerRoundState, value: number): boolean {
  return state.numberCards.some((card) => card.value === value)
}
