import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import type { GameRepository } from '@/application/ports/GameRepository'
import { drawCard } from '@/application/use-cases/drawCard'
import { endRound } from '@/application/use-cases/endRound'
import { resolveAction } from '@/application/use-cases/resolveAction'
import { startGame } from '@/application/use-cases/startGame'
import { stayPlayer } from '@/application/use-cases/stayPlayer'
import type { GameState } from '@/domain/entities/GameState'
import { shouldEndRound } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { startRound } from '@/domain/rules/round'
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
 * Single source of truth for the current game.
 *
 * The store is a thin orchestration layer:
 *  - state    : just `game: GameState | null`
 *  - actions  : call the application use-cases, persist after each
 *               successful transition, auto-end the round when
 *               `shouldEndRound` becomes true.
 *  - getters  : a few computed helpers the UI will pick up via
 *               `storeToRefs` (or the `useGame` composable).
 */
export const useGameStore = defineStore('game', () => {
  const game: Ref<GameState | null> = ref(null)

  function persist(): void {
    if (game.value !== null) activeDeps.repository.save(game.value)
  }

  function endRoundIfReady(): void {
    if (game.value?.round !== null && game.value?.round !== undefined) {
      if (shouldEndRound(game.value.round)) {
        game.value = endRound(game.value)
      }
    }
  }

  function requireGame(): GameState {
    if (game.value === null) {
      throw new Error('gameStore: no game in progress.')
    }
    return game.value
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
    persist()
  }

  function draw(): void {
    requireGame()
    game.value = drawCard({ random: activeDeps.random }, game.value as GameState)
    endRoundIfReady()
    persist()
  }

  function stay(): void {
    requireGame()
    game.value = stayPlayer(game.value as GameState)
    endRoundIfReady()
    persist()
  }

  function resolve(targetIndex: number | null): void {
    requireGame()
    game.value = resolveAction(game.value as GameState, targetIndex)
    endRoundIfReady()
    persist()
  }

  function startNextRound(): void {
    requireGame()
    game.value = startRound(game.value as GameState)
    persist()
  }

  function reset(): void {
    activeDeps.repository.clear()
    game.value = null
  }

  // ----- getters ---------------------------------------------------

  const phase = computed(() => game.value?.phase ?? null)
  const isInRound = computed(() => game.value?.phase === 'in-round')
  const isBetweenRounds = computed(() => game.value?.phase === 'between-rounds')
  const isFinished = computed(() => game.value?.phase === 'finished')
  const pendingAction = computed(() => game.value?.pendingAction ?? null)

  return {
    game,
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
  }
})
