import { createDeck } from '@/domain/deck/createDeck'
import { shuffle } from '@/domain/deck/shuffle'
import type { GameState } from '@/domain/entities/GameState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { createGame } from '@/domain/rules/game'
import { startRound } from '@/domain/rules/round'

export interface StartGameDeps {
  readonly random: RandomProvider
}

export interface StartGameCommand {
  readonly pseudos: readonly string[]
}

/**
 * Build a fresh game from a set of pseudos and immediately start the
 * first round (so the UI can land directly on the play screen).
 *
 * - Builds the canonical 94-card deck
 * - Shuffles it using the injected `RandomProvider`
 * - Validates the pseudos (2..18 players, non-empty, no duplicates)
 * - Transitions through `setup` -> `in-round`
 */
export function startGame(deps: StartGameDeps, cmd: StartGameCommand): GameState {
  const shuffledDeck = shuffle(createDeck(), deps.random)
  const game = createGame(cmd.pseudos, shuffledDeck)
  return startRound(game)
}
