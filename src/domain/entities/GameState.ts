import type { Card } from '@/domain/entities/Card'
import type { Player } from '@/domain/entities/Player'
import type { RoundState } from '@/domain/entities/RoundState'
import type { GamePhase } from '@/domain/value-objects/GamePhase'

/**
 * Top-level immutable snapshot of a game.
 *
 * Every transition (start round, draw, stay, end round, …) returns a
 * brand new GameState — the previous one is never mutated. This is
 * what makes the domain safe to feed into Pinia, easy to persist, and
 * trivial to time-travel for debugging.
 */
export interface GameState {
  readonly players: readonly Player[]
  /** Index of the current dealer inside `players`. Rotates left (+1) each round. */
  readonly dealerIndex: number
  /** Cards remaining to draw. The top of the deck is index 0. */
  readonly deck: readonly Card[]
  /** Cards already used. Reshuffled into the deck when it runs dry. */
  readonly discard: readonly Card[]
  /** State of the current round, or `null` when between rounds. */
  readonly round: RoundState | null
  readonly phase: GamePhase
  /** 0 before any round, then 1, 2, … (current or last finished round). */
  readonly roundNumber: number
}
