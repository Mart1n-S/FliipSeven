import type { PlayerId } from '@/domain/value-objects/PlayerId'

/**
 * Persistent state of a player across the whole game.
 * Round-specific data lives in {@link PlayerRoundState}.
 */
export interface Player {
  readonly id: PlayerId
  readonly pseudo: string
  readonly totalScore: number
}

export function createPlayer(id: PlayerId, pseudo: string): Player {
  return { id, pseudo, totalScore: 0 }
}
