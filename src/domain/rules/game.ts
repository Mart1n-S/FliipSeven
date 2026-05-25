import type { Card } from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayer, type Player } from '@/domain/entities/Player'
import { createPlayerId } from '@/domain/value-objects/PlayerId'

/** Points threshold that triggers end-of-game evaluation. */
export const WIN_THRESHOLD = 200

/** Minimum number of players supported by the V1 (one deck). */
export const MIN_PLAYERS = 2

/** Maximum number of players supported by the V1 (one deck). */
export const MAX_PLAYERS = 18

function normalizePseudo(pseudo: string): string {
  return pseudo.trim()
}

function validatePseudos(pseudos: readonly string[]): readonly string[] {
  if (pseudos.length < MIN_PLAYERS || pseudos.length > MAX_PLAYERS) {
    throw new Error(
      `Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS} (got ${pseudos.length}).`,
    )
  }

  const cleaned = pseudos.map(normalizePseudo)

  for (const pseudo of cleaned) {
    if (pseudo.length === 0) {
      throw new Error('Player pseudos cannot be empty.')
    }
  }

  const seen = new Set<string>()
  for (const pseudo of cleaned) {
    const key = pseudo.toLocaleLowerCase()
    if (seen.has(key)) {
      throw new Error(`Duplicate pseudo: "${pseudo}".`)
    }
    seen.add(key)
  }

  return cleaned
}

/**
 * Build a fresh GameState from a list of pseudos and a (typically
 * shuffled) deck. The first dealer is the first player; the phase
 * starts at `setup` - call {@link startRound} to actually start playing.
 */
export function createGame(pseudos: readonly string[], deck: readonly Card[]): GameState {
  const cleanedPseudos = validatePseudos(pseudos)

  const players: Player[] = cleanedPseudos.map((pseudo, index) =>
    createPlayer(createPlayerId(`p${index + 1}`), pseudo),
  )

  return {
    players,
    dealerIndex: 0,
    deck: [...deck],
    discard: [],
    round: null,
    phase: 'setup',
    roundNumber: 0,
    pendingAction: null,
    forcedDraws: null,
    actionQueue: [],
    dealQueue: null,
  }
}

export function isGameOver(game: GameState): boolean {
  return game.phase === 'finished'
}

/** Players sorted by total score descending. Ties keep insertion order (stable sort). */
export function getStandings(game: GameState): readonly Player[] {
  return [...game.players].sort((a, b) => b.totalScore - a.totalScore)
}

/**
 * Top player when the game is finished. Returns `null` if the game is
 * not yet over. In the unlikely case of a perfect tie the first player
 * in insertion order is returned (callers can read `getStandings` if
 * they need to surface ties).
 */
export function getWinner(game: GameState): Player | null {
  if (!isGameOver(game)) return null
  const standings = getStandings(game)
  return standings[0] ?? null
}
