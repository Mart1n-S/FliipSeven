import type { ActionCard, Card } from '@/domain/entities/Card'
import type { Player } from '@/domain/entities/Player'
import type { RoundState } from '@/domain/entities/RoundState'
import type { GamePhase } from '@/domain/value-objects/GamePhase'

/**
 * An action card has just been drawn and is waiting for its target
 * to be chosen by the player who pulled it.
 */
export interface PendingActionContext {
  readonly card: ActionCard
  /** Index of the player who drew the card (= the one choosing the target). */
  readonly originIndex: number
}

/**
 * A Flip Three sequence is in progress: the chosen target must keep
 * accepting cards until `remaining` falls to 0, the target busts, or
 * reaches Flip 7.
 */
export interface ForcedDrawsContext {
  /** Index of the player who must accept the remaining draws. */
  readonly targetIndex: number
  /** How many more cards still need to be drawn for that target. */
  readonly remaining: number
}

/**
 * Top-level immutable snapshot of a game.
 *
 * Every transition (start round, draw, stay, end round, ...) returns
 * a brand new GameState - the previous one is never mutated. This is
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
  /** 0 before any round, then 1, 2, ... (current or last finished round). */
  readonly roundNumber: number
  /** Action card waiting to be resolved (target choice). Null when idle. */
  readonly pendingAction: PendingActionContext | null
  /** Active Flip Three sequence. Null when idle. */
  readonly forcedDraws: ForcedDrawsContext | null
  /**
   * Action cards drawn during a Flip Three sequence, queued for
   * resolution once the sequence ends. Drained one at a time into
   * `pendingAction`.
   */
  readonly actionQueue: readonly ActionCard[]
  /**
   * Players still to receive their initial-deal card at round start.
   * The HEAD of the array is the current dealee (their draw / action
   * chain is in progress). `null` once the deal phase is over and the
   * normal play phase begins.
   */
  readonly dealQueue: readonly number[] | null
}
