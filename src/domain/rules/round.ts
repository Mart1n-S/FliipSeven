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
  const startSeat = (game.dealerIndex + 1) % n
  // Initial deal goes around the table starting from the seat left of
  // the dealer. The dealer is dealt to last (per the rule book).
  const dealQueue = Array.from({ length: n }, (_, i) => (startSeat + i) % n)

  const round: RoundState = { playerStates, activePlayerIndex: startSeat }

  return {
    ...game,
    round,
    phase: 'in-round',
    roundNumber: game.roundNumber + 1,
    pendingAction: null,
    forcedDraws: null,
    actionQueue: [],
    dealQueue,
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

  // Any action card still in flight when the round ends must also go to
  // the discard pile, otherwise it would vanish from the game and the
  // deck would shrink round after round. This happens when the round
  // ends mid-resolution, eg. the Flip Three target reaches Flip 7 on the
  // last forced draw while a Freeze drawn earlier is still queued, or no
  // active player remains to receive a pending action.
  if (game.pendingAction !== null) collected.push(game.pendingAction.card)
  for (const queued of game.actionQueue) collected.push(queued.card)

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
    dealQueue: null,
  }
}
