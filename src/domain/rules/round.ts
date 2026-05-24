import type { Card } from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState } from '@/domain/entities/PlayerRoundState'
import type { RoundState } from '@/domain/entities/RoundState'
import { WIN_THRESHOLD } from '@/domain/rules/game'
import { calculateRoundScore } from '@/domain/rules/score'
import type { GamePhase } from '@/domain/value-objects/GamePhase'

/**
 * Start a new round.
 *
 * Pre-condition: the game must be in `setup` or `between-rounds`.
 * Initialises an empty PlayerRoundState for every player and sets the
 * active player to the seat immediately to the left of the dealer
 * (= dealer asks each player in turn, dealer plays last).
 */
export function startRound(game: GameState): GameState {
  if (game.phase !== 'setup' && game.phase !== 'between-rounds') {
    throw new Error(`Cannot start a new round from phase ${game.phase}.`)
  }

  const n = game.players.length
  const playerStates = game.players.map((player) => createPlayerRoundState(player.id))
  const activePlayerIndex = (game.dealerIndex + 1) % n

  const round: RoundState = { playerStates, activePlayerIndex }

  return {
    ...game,
    round,
    phase: 'in-round',
    roundNumber: game.roundNumber + 1,
    pendingAction: null,
    forcedDraws: null,
    actionQueue: [],
  }
}

/**
 * End the current round.
 *
 * - Adds every player's round score to their `totalScore`.
 * - Moves every card laid in front of every player (numbers, modifiers
 *   and any leftover Second Chance) to the discard pile.
 * - Rotates the dealer to the next seat (unless the game just ended).
 * - Sets phase to `between-rounds`, or `finished` if at least one
 *   player has now reached {@link WIN_THRESHOLD} (= 200).
 *
 * Pre-condition: the game must be in `in-round`.
 */
export function endRound(game: GameState): GameState {
  if (game.phase !== 'in-round' || game.round === null) {
    throw new Error(`Cannot end the round from phase ${game.phase}.`)
  }

  const breakdowns = game.round.playerStates.map(calculateRoundScore)

  const updatedPlayers = game.players.map((player, index) => {
    const breakdown = breakdowns[index]
    if (breakdown === undefined) return player
    return { ...player, totalScore: player.totalScore + breakdown.total }
  })

  const collected: Card[] = game.round.playerStates.flatMap((state) => {
    const cards: Card[] = [...state.numberCards, ...state.modifiers]
    if (state.secondChance !== null) cards.push(state.secondChance)
    return cards
  })

  const newDiscard: Card[] = [...game.discard, ...collected]

  const someoneWon = updatedPlayers.some((p) => p.totalScore >= WIN_THRESHOLD)
  const newPhase: GamePhase = someoneWon ? 'finished' : 'between-rounds'
  const newDealerIndex = someoneWon
    ? game.dealerIndex
    : (game.dealerIndex + 1) % game.players.length

  return {
    ...game,
    players: updatedPlayers,
    discard: newDiscard,
    round: null,
    phase: newPhase,
    dealerIndex: newDealerIndex,
    pendingAction: null,
    forcedDraws: null,
    actionQueue: [],
  }
}
