import { onBeforeUnmount, watch } from 'vue'
import { useGameStore } from '@/presentation/stores/gameStore'

/** Default tempo between two auto-dealt cards (ms). */
const DEFAULT_DEAL_DELAY_MS = 600

/**
 * Drive the initial-deal phase from the UI.
 *
 * The store stays passive: it exposes `dealQueue` but never schedules
 * draws by itself. Whenever a view mounts {@link useAutoDeal}, this
 * composable watches the game state and automatically triggers
 * `draw()` after a short delay while the deal phase is in progress
 * and nothing is blocking (no pending action, still inside `in-round`).
 *
 * Forced draws that surface during the deal (typically a Flip Three
 * pulled as the very first card a player gets) are also auto-drawn:
 * the deal phase has no Hit/Stay buttons, so the user has no manual
 * way to resolve the sequence - the deal must drive it.
 *
 * Keeping the timing out of the store has two benefits:
 *  - tests of the store stay synchronous and deterministic
 *  - the delay can be tuned per view (eg. faster on a "skip intro" mode)
 */
export function useAutoDeal(delayMs: number = DEFAULT_DEAL_DELAY_MS) {
  const store = useGameStore()

  let timer: ReturnType<typeof setTimeout> | null = null

  function cancelPending(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function shouldAutoDeal(): boolean {
    const game = store.game
    if (game === null) return false
    if (game.phase !== 'in-round') return false
    if (game.pendingAction !== null) return false
    // Forced draws are auto-driven only while the initial deal is
    // still in progress. Once `dealQueue` is null (deal phase over),
    // forced draws become user-driven via the action bar.
    return game.dealQueue !== null && game.dealQueue.length > 0
  }

  function scheduleNext(): void {
    cancelPending()
    if (!shouldAutoDeal()) return
    timer = setTimeout(() => {
      timer = null
      if (shouldAutoDeal()) {
        store.draw()
      }
    }, delayMs)
  }

  watch(
    () => [
      store.game?.dealQueue,
      store.game?.pendingAction,
      store.game?.forcedDraws,
      store.game?.phase,
    ],
    () => scheduleNext(),
    { immediate: true, deep: false },
  )

  onBeforeUnmount(cancelPending)
}
