import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import type { GameRepository } from '@/application/ports/GameRepository'
import { drawCard } from '@/application/use-cases/drawCard'
import { endRound } from '@/application/use-cases/endRound'
import { resolveAction } from '@/application/use-cases/resolveAction'
import { startGame } from '@/application/use-cases/startGame'
import { stayPlayer } from '@/application/use-cases/stayPlayer'
import {
  isNumberCard,
  isSecondChanceCard,
  type NumberCard,
  type SecondChanceCard,
} from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { shouldEndRound } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { startRound } from '@/domain/rules/round'
import { calculateRoundScore } from '@/domain/rules/score'
import type { CardId } from '@/domain/value-objects/CardId'
import { LocalStorageGameRepository } from '@/infrastructure/persistence/LocalStorageGameRepository'
import { CryptoRandomProvider } from '@/infrastructure/random/CryptoRandomProvider'

interface StoreDeps {
  random: RandomProvider
  repository: GameRepository
}

/**
 * Default dependencies used by every store instance. Tests can call
 * {@link setGameStoreDeps} **before** creating the store to swap them
 * for fakes (eg. an in-memory repository, a seeded RandomProvider).
 */
let activeDeps: StoreDeps = {
  random: new CryptoRandomProvider(),
  repository: new LocalStorageGameRepository(),
}

export function setGameStoreDeps(deps: Partial<StoreDeps>): void {
  activeDeps = { ...activeDeps, ...deps }
}

/**
 * Transient UI event surfaced by the store after a transition.
 * Cleared as soon as the next action happens, so the UI naturally
 * stops showing the banner without any timer.
 */
export type GameEvent =
  | { kind: 'bust'; playerIndex: number; playerPseudo: string }
  | { kind: 'flip7'; playerIndex: number; playerPseudo: string }
  | { kind: 'frozen'; playerIndex: number; playerPseudo: string }
  | {
      kind: 'second-chance-save'
      playerIndex: number
      playerPseudo: string
      /** The duplicate number card that the SC neutralised. */
      duplicateCard: NumberCard
      /** The Second Chance card that was consumed. */
      secondChanceCard: SecondChanceCard
    }
  | { kind: 'round-ended'; roundNumber: number }
  | { kind: 'game-finished' }

/**
 * Single source of truth for the current game.
 *
 * The store is a thin orchestration layer:
 *  - state    : `game: GameState | null`, plus a couple of ephemeral
 *               UI hints (lastDrawnCardId, lastEvent).
 *  - actions  : call the application use-cases, persist after each
 *               successful transition, auto-end the round when
 *               `shouldEndRound` becomes true, and surface state
 *               transitions for the UI banner.
 *  - getters  : a few computed helpers the UI will pick up via
 *               `storeToRefs` (or the `useGame` composable).
 */
export const useGameStore = defineStore('game', () => {
  const game: Ref<GameState | null> = ref(null)
  const lastDrawnCardId: Ref<CardId | null> = ref(null)
  const lastEvent: Ref<GameEvent | null> = ref(null)
  /** Per-player score earned in the round that just ended. Aligned on `game.players`. */
  const lastRoundScores: Ref<readonly number[] | null> = ref(null)

  function persist(): void {
    if (game.value !== null) activeDeps.repository.save(game.value)
  }

  function endRoundIfReady(): void {
    const current = game.value
    if (current === null || current.round === null) return
    if (!shouldEndRound(current.round)) return

    // Snapshot per-player round scores BEFORE they get folded into totals
    // so the RoundEndView can show the delta for each player.
    lastRoundScores.value = current.round.playerStates.map(
      (state) => calculateRoundScore(state).total,
    )
    const next = endRound(current)
    game.value = next
    lastEvent.value =
      next.phase === 'finished'
        ? { kind: 'game-finished' }
        : { kind: 'round-ended', roundNumber: current.roundNumber }
  }

  function requireGame(): GameState {
    if (game.value === null) {
      throw new Error('gameStore: no game in progress.')
    }
    return game.value
  }

  /** Diff active player statuses to detect the most significant transition. */
  function detectEventAfterDraw(before: GameState, after: GameState): GameEvent | null {
    if (!before.round || !after.round) return null

    // Priority 1: Second Chance save (player would have busted otherwise).
    // Detected by a SC slot transitioning from filled to empty during a draw.
    for (let i = 0; i < after.round.playerStates.length; i += 1) {
      const prevSC = before.round.playerStates[i]?.secondChance ?? null
      const currSC = after.round.playerStates[i]?.secondChance ?? null
      if (prevSC !== null && currSC === null) {
        const newDiscards = after.discard.slice(before.discard.length)
        const duplicate = newDiscards.find(isNumberCard)
        const sc = newDiscards.find(isSecondChanceCard)
        if (duplicate && sc) {
          return {
            kind: 'second-chance-save',
            playerIndex: i,
            playerPseudo: after.players[i]?.pseudo ?? '',
            duplicateCard: duplicate,
            secondChanceCard: sc,
          }
        }
      }
    }

    // Priority 2: bust / flip7 status transitions.
    for (let i = 0; i < after.round.playerStates.length; i += 1) {
      const prev = before.round.playerStates[i]?.status
      const curr = after.round.playerStates[i]?.status
      if (prev === 'active' && curr === 'busted') {
        return {
          kind: 'bust',
          playerIndex: i,
          playerPseudo: after.players[i]?.pseudo ?? '',
        }
      }
      if (prev === 'active' && curr === 'flip7') {
        return {
          kind: 'flip7',
          playerIndex: i,
          playerPseudo: after.players[i]?.pseudo ?? '',
        }
      }
    }
    return null
  }

  // ----- actions ---------------------------------------------------

  /** Hydrate from the persistence layer. Returns whether a game was found. */
  function loadFromStorage(): boolean {
    const saved = activeDeps.repository.load()
    if (saved === null) return false
    game.value = saved
    return true
  }

  function newGame(pseudos: readonly string[]): void {
    game.value = startGame({ random: activeDeps.random }, { pseudos })
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
    persist()
  }

  function draw(): void {
    const before = requireGame()
    // Snapshot the top card BEFORE drawing so the UI can highlight it.
    // Edge case: when the deck is empty a reshuffle happens inside the
    // use-case and we cannot pre-determine which card will come out; we
    // accept the highlight being skipped for that single draw.
    const topCard = before.deck[0] ?? null
    game.value = drawCard({ random: activeDeps.random }, before)
    lastDrawnCardId.value = topCard?.id ?? null
    lastEvent.value = detectEventAfterDraw(before, game.value)
    endRoundIfReady()
    persist()
  }

  function stay(): void {
    requireGame()
    game.value = stayPlayer(game.value as GameState)
    lastDrawnCardId.value = null
    lastEvent.value = null
    endRoundIfReady()
    persist()
  }

  function resolve(targetIndex: number | null): void {
    requireGame()
    game.value = resolveAction(game.value as GameState, targetIndex)
    lastDrawnCardId.value = null
    lastEvent.value = null
    endRoundIfReady()
    persist()
  }

  function startNextRound(): void {
    requireGame()
    game.value = startRound(game.value as GameState)
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
    persist()
  }

  function reset(): void {
    activeDeps.repository.clear()
    game.value = null
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
  }

  function dismissEvent(): void {
    lastEvent.value = null
  }

  // ----- getters ---------------------------------------------------

  const phase = computed(() => game.value?.phase ?? null)
  const isInRound = computed(() => game.value?.phase === 'in-round')
  const isBetweenRounds = computed(() => game.value?.phase === 'between-rounds')
  const isFinished = computed(() => game.value?.phase === 'finished')
  const pendingAction = computed(() => game.value?.pendingAction ?? null)

  return {
    game,
    lastDrawnCardId,
    lastEvent,
    lastRoundScores,
    phase,
    isInRound,
    isBetweenRounds,
    isFinished,
    pendingAction,
    loadFromStorage,
    newGame,
    draw,
    stay,
    resolve,
    startNextRound,
    reset,
    dismissEvent,
  }
})
