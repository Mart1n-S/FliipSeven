import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import type { Player } from '@/domain/entities/Player'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { useGameStore } from '@/presentation/stores/gameStore'

/**
 * Sugar layer above the Pinia store: exposes ready-to-bind refs and
 * derived state that the views need, plus the store's actions.
 *
 * Designed for `<script setup>` consumers:
 *
 *   const { game, activePlayer, draw, stay } = useGame()
 */
export function useGame() {
  const store = useGameStore()
  const {
    game,
    phase,
    isInRound,
    isBetweenRounds,
    isFinished,
    pendingAction,
    lastDrawnCardId,
    lastEvent,
    lastRoundScores,
    lastRoundEnd,
  } = storeToRefs(store)

  const activePlayer = computed<Player | null>(() => {
    const g = game.value
    if (g === null || g.round === null) return null
    return g.players[g.round.activePlayerIndex] ?? null
  })

  const activePlayerState = computed<PlayerRoundState | null>(() => {
    const g = game.value
    if (g === null || g.round === null) return null
    return g.round.playerStates[g.round.activePlayerIndex] ?? null
  })

  const dealer = computed<Player | null>(() => {
    const g = game.value
    if (g === null) return null
    return g.players[g.dealerIndex] ?? null
  })

  const isForcedDraw = computed(() => game.value?.forcedDraws !== null)

  const forcedDrawTarget = computed<Player | null>(() => {
    const g = game.value
    if (g === null || g.forcedDraws === null) return null
    return g.players[g.forcedDraws.targetIndex] ?? null
  })

  const isDealPhase = computed(() => {
    const queue = game.value?.dealQueue
    return queue !== null && queue !== undefined && queue.length > 0
  })

  /** Player currently being dealt to during the initial-deal phase. */
  const currentDealee = computed<Player | null>(() => {
    const g = game.value
    if (g === null || g.dealQueue === null || g.dealQueue.length === 0) return null
    const index = g.dealQueue[0]
    return index !== undefined ? (g.players[index] ?? null) : null
  })

  return {
    // refs
    game,
    phase,
    isInRound,
    isBetweenRounds,
    isFinished,
    pendingAction,
    lastDrawnCardId,
    lastEvent,
    lastRoundScores,
    lastRoundEnd,

    // computed
    activePlayer,
    activePlayerState,
    dealer,
    isForcedDraw,
    forcedDrawTarget,
    isDealPhase,
    currentDealee,

    // actions
    loadFromStorage: store.loadFromStorage,
    newGame: store.newGame,
    draw: store.draw,
    stay: store.stay,
    resolve: store.resolve,
    startNextRound: store.startNextRound,
    reset: store.reset,
    dismissEvent: store.dismissEvent,
  }
}
