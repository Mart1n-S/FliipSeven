import { describe, expect, it } from 'vitest'
import { drawCard } from '@/application/use-cases/drawCard'
import { endRound } from '@/application/use-cases/endRound'
import { resolveAction } from '@/application/use-cases/resolveAction'
import { startGame } from '@/application/use-cases/startGame'
import { stayPlayer } from '@/application/use-cases/stayPlayer'
import type { GameState } from '@/domain/entities/GameState'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { shouldEndRound } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { getValidActionTargets } from '@/domain/rules/actions/targets'
import { MAX_PLAYERS } from '@/domain/rules/game'
import { startRound } from '@/domain/rules/round'

/**
 * End-to-end "full game" simulations. These play complete games through
 * the real use-cases (the exact same transitions the Pinia store drives
 * from the UI) and assert two safety properties that are hard to verify
 * by hand because the draw is random:
 *
 *  1. **Card conservation** - the 94-card deck is never gained from nor
 *     lost to. At every step `deck + discard + rows + pendingAction +
 *     actionQueue === 94`. This is the regression guard for action cards
 *     vanishing when a round ends mid-resolution.
 *  2. **Deck sufficiency** - `drawCard` throws if both the deck and the
 *     discard pile are empty. A simulation that never throws across many
 *     seeds and aggressive strategies proves a single deck is enough,
 *     even at the maximum of 18 players.
 */

const DECK_SIZE = 94

/** Deterministic, seedable PRNG (xorshift32) so failures are reproducible. */
class SeededRandom implements RandomProvider {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9
  }

  nextInt(maxExclusive: number): number {
    let x = this.state
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.state = x >>> 0
    if (maxExclusive <= 0) return 0
    return this.state % maxExclusive
  }
}

/** Count every card in the game, wherever it currently lives. */
function countCards(game: GameState): number {
  let n = game.deck.length + game.discard.length
  if (game.pendingAction !== null) n += 1
  n += game.actionQueue.length
  if (game.round !== null) {
    for (const s of game.round.playerStates) {
      n += s.numberCards.length + s.modifiers.length + (s.secondChance !== null ? 1 : 0)
    }
  }
  return n
}

type Decision = 'draw' | 'stay'
type Strategy = (state: PlayerRoundState, rng: RandomProvider) => Decision

/** Draw until the row holds `n` number cards, then stay. */
function drawUntil(n: number): Strategy {
  return (state) => (state.numberCards.length >= n ? 'stay' : 'draw')
}

/** Always draw (rounds only ever end on bust / Flip 7 / freeze). */
const greedy: Strategy = () => 'draw'

interface PlayResult {
  readonly finished: boolean
  readonly rounds: number
  readonly steps: number
  /** Smallest `deck + discard` observed while a draw was still possible. */
  readonly minAvailable: number
}

interface PlayOptions {
  readonly maxSteps?: number
  /** Stop at a round boundary once this many rounds have been played. */
  readonly stopAfterRounds?: number
}

/** End the round if the domain says it is over - mirrors the store. */
function settle(game: GameState): GameState {
  if (game.round !== null && shouldEndRound(game.round)) return endRound(game)
  return game
}

/** Pick a valid target for the pending action (or null to discard). */
function pickTarget(game: GameState, rng: RandomProvider): number | null {
  const pending = game.pendingAction
  if (pending === null || game.round === null) return null
  const targets = getValidActionTargets(pending.card, game.round.playerStates, pending.originIndex)
  if (targets.length === 0) return null
  return targets[rng.nextInt(targets.length)] ?? null
}

/**
 * Drive a complete game. Each iteration performs exactly one transition
 * then settles the round, exactly like the store does after every action.
 */
function playGame(
  pseudos: readonly string[],
  rng: RandomProvider,
  strategy: Strategy,
  options: PlayOptions = {},
): PlayResult {
  const maxSteps = options.maxSteps ?? 1_000_000
  const stopAfterRounds = options.stopAfterRounds ?? Number.POSITIVE_INFINITY

  let game = settle(startGame({ random: rng }, { pseudos }))
  let steps = 0
  let minAvailable = DECK_SIZE

  while (game.phase !== 'finished') {
    if (countCards(game) !== DECK_SIZE) {
      throw new Error(`card count drifted to ${countCards(game)} at step ${steps}`)
    }

    if (game.phase === 'between-rounds') {
      if (game.roundNumber >= stopAfterRounds) break
      game = startRound(game)
      continue
    }

    // Track deck pressure: how close did we get to running dry?
    if (game.round !== null) {
      minAvailable = Math.min(minAvailable, game.deck.length + game.discard.length)
    }

    if (game.pendingAction !== null) {
      game = settle(resolveAction(game, pickTarget(game, rng)))
    } else if (
      game.forcedDraws !== null ||
      (game.dealQueue !== null && game.dealQueue.length > 0)
    ) {
      game = settle(drawCard({ random: rng }, game))
    } else if (game.round !== null) {
      const active = game.round.playerStates[game.round.activePlayerIndex]
      const decision = active !== undefined ? strategy(active, rng) : 'stay'
      game = settle(decision === 'draw' ? drawCard({ random: rng }, game) : stayPlayer(game))
    }

    steps += 1
    if (steps > maxSteps) throw new Error(`game did not settle within ${maxSteps} steps`)
  }

  if (countCards(game) !== DECK_SIZE) {
    throw new Error(`card count drifted to ${countCards(game)} at the end`)
  }

  return { finished: game.phase === 'finished', rounds: game.roundNumber, steps, minAvailable }
}

function maxPlayers(): string[] {
  return Array.from({ length: MAX_PLAYERS }, (_, i) => `J${i + 1}`)
}

// ---------- full game, max players ----------

describe('full game simulation: 18 players', () => {
  it('plays a complete game to a winner without gaining or losing cards', () => {
    const result = playGame(maxPlayers(), new SeededRandom(1), drawUntil(4))

    expect(result.finished).toBe(true)
    expect(result.rounds).toBeGreaterThan(0)
  })

  it('never crashes when the deck runs dry across many seeds and strategies', () => {
    // A single 94-card deck can be fully laid out on 18 rows. When that
    // happens `drawCard` must NOT crash (it used to throw "deck and
    // discard are both empty"); instead the round settles gracefully.
    // "No throw" across these runs - plus the card-conservation check
    // inside playGame - is the proof. We mix strategies that stress the
    // deck in different ways:
    //  - drawUntil(6): hoarders keep cards on their rows as long as
    //    possible (maximises simultaneous off-deck cards).
    //  - greedy:       everyone always draws (maximises draw volume).
    const strategies: Strategy[] = [drawUntil(2), drawUntil(4), drawUntil(6), greedy]
    let timesDeckEmptied = 0

    for (let seed = 1; seed <= 40; seed += 1) {
      for (const strategy of strategies) {
        // Greedy games rarely cross 200 (most rows bust to 0), so cap
        // them by rounds; not crashing is what matters here.
        const stopAfterRounds = strategy === greedy ? 25 : undefined
        const result = playGame(maxPlayers(), new SeededRandom(seed * 31 + 7), strategy, {
          stopAfterRounds,
        })

        expect(result.rounds).toBeGreaterThan(0)
        if (result.minAvailable === 0) timesDeckEmptied += 1
      }
    }

    // Sanity check that the simulation really did push the deck to empty
    // at least once (otherwise it would not be testing the dry-deck path).
    expect(timesDeckEmptied).toBeGreaterThan(0)
  })

  it('keeps the table consistent during the 18-player initial deal', () => {
    // The deal hands one card to each of the 18 seats in turn; an action
    // card dealt mid-deal (freeze / flip three / second chance) must
    // resolve cleanly without breaking card conservation or the queue.
    // 30 fresh games exercise many different deal sequences.
    for (let seed = 1; seed <= 30; seed += 1) {
      const rng = new SeededRandom(seed * 101 + 3)
      let game = startGame({ random: rng }, { pseudos: maxPlayers() })

      // Run only until the deal phase is over (dealQueue drained to null).
      let guard = 0
      while (game.dealQueue !== null && game.phase === 'in-round') {
        expect(countCards(game)).toBe(DECK_SIZE)
        game = settle(
          game.pendingAction !== null
            ? resolveAction(game, pickTarget(game, rng))
            : drawCard({ random: rng }, game),
        )
        guard += 1
        if (guard > 5_000) throw new Error('deal phase did not complete')
      }

      expect(countCards(game)).toBe(DECK_SIZE)
    }
  })
})

// ---------- conservation across player counts ----------

describe('full game simulation: card conservation by player count', () => {
  it.each([2, 6, 12, 18])('conserves the 94-card deck with %i players', (count) => {
    const pseudos = Array.from({ length: count }, (_, i) => `P${i + 1}`)
    const result = playGame(pseudos, new SeededRandom(count * 17 + 1), drawUntil(4))

    expect(result.finished).toBe(true)
  })
})
