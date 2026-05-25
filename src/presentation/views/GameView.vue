<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionBar from '@/presentation/components/ActionBar.vue'
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue'
import EventBanner from '@/presentation/components/EventBanner.vue'
import PlayerRow from '@/presentation/components/PlayerRow.vue'
import ScoreBoard from '@/presentation/components/ScoreBoard.vue'
import TargetSelectorModal from '@/presentation/components/TargetSelectorModal.vue'
import { useActionResolution } from '@/presentation/composables/useActionResolution'
import { useGame } from '@/presentation/composables/useGame'
import GameEndView from '@/presentation/views/GameEndView.vue'
import RoundEndView from '@/presentation/views/RoundEndView.vue'

const router = useRouter()
const {
  game,
  isInRound,
  isBetweenRounds,
  isFinished,
  pendingAction,
  activePlayer,
  forcedDrawTarget,
  isForcedDraw,
  dealer,
  lastDrawnCardId,
  lastEvent,
  lastRoundScores,
  draw,
  stay,
  resolve,
  startNextRound,
  reset,
  dismissEvent,
} = useGame()

const { choices, requiresUserChoice } = useActionResolution()

// Player whose turn the action bar acts on:
//  - normal play: the active player
//  - Flip Three sequence: the forced target (they are the one receiving cards)
const currentTurnPlayer = computed(() => forcedDrawTarget.value ?? activePlayer.value)

const actionsDisabled = computed(() => pendingAction.value !== null)
const showActionBar = computed(() => isInRound.value && currentTurnPlayer.value !== null)

// Pseudo of the player who drew the currently pending action (used by the modal).
const pendingOriginPseudo = computed(() => {
  const pending = pendingAction.value
  if (pending === null || game.value === null) return ''
  return game.value.players[pending.originIndex]?.pseudo ?? ''
})

const showQuitConfirm = ref(false)

function requestQuit() {
  // Only ask if a round is still in progress; once between rounds or
  // finished, "Quitter" doesn't actually destroy in-progress play.
  if (isInRound.value) {
    showQuitConfirm.value = true
  } else {
    quit()
  }
}

function quit() {
  showQuitConfirm.value = false
  reset()
  router.replace({ name: 'home' })
}
</script>

<template>
  <main v-if="game" class="flex min-h-full flex-col">
    <ScoreBoard
      :round-number="game.roundNumber"
      :dealer="dealer"
      :deck-size="game.deck.length"
      :discard-size="game.discard.length"
      @quit="requestQuit"
    />

    <!-- Transient event banner (bust / flip7 / round-end / etc.) -->
    <EventBanner v-if="lastEvent" :event="lastEvent" @dismiss="dismissEvent" />

    <!-- Forced draws banner (only when no pending action is up) -->
    <div
      v-if="!pendingAction && isForcedDraw && forcedDrawTarget && game.forcedDraws"
      class="border-b border-indigo-700 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-200"
    >
      <span class="font-semibold">{{ forcedDrawTarget.pseudo }}</span> doit piocher encore
      {{ game.forcedDraws.remaining }}
      {{ game.forcedDraws.remaining > 1 ? 'cartes' : 'carte' }}.
    </div>

    <section v-if="game.round" class="flex flex-1 flex-col gap-3 px-4 py-4">
      <PlayerRow
        v-for="(playerState, index) in game.round.playerStates"
        :key="game.players[index]!.id"
        :player="game.players[index]!"
        :state="playerState"
        :is-active="game.round.activePlayerIndex === index"
        :is-dealer="game.dealerIndex === index"
        :highlighted-card-id="lastDrawnCardId"
      />
    </section>

    <!-- Between rounds -->
    <RoundEndView
      v-else-if="isBetweenRounds"
      :game="game"
      :round-scores="lastRoundScores"
      @next="startNextRound"
    />

    <!-- Finished -->
    <GameEndView v-else-if="isFinished" :game="game" @replay="quit" />

    <ActionBar
      v-if="showActionBar"
      :current-pseudo="currentTurnPlayer!.pseudo"
      :disabled="actionsDisabled"
      @draw="draw"
      @stay="stay"
    />

    <TargetSelectorModal
      v-if="requiresUserChoice && pendingAction"
      :card="pendingAction.card"
      :origin-pseudo="pendingOriginPseudo"
      :choices="choices"
      @select="resolve"
    />

    <ConfirmDialog
      v-if="showQuitConfirm"
      title="Quitter la partie ?"
      message="La partie en cours et tous les scores seront perdus."
      confirm-label="Quitter"
      cancel-label="Continuer à jouer"
      destructive
      @confirm="quit"
      @cancel="showQuitConfirm = false"
    />
  </main>

  <main v-else class="flex min-h-full flex-col items-center justify-center gap-4 p-6">
    <p class="text-slate-400">Aucune partie en cours.</p>
    <button
      type="button"
      class="rounded-xl bg-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
      @click="router.replace({ name: 'home' })"
    >
      Retour à l'accueil
    </button>
  </main>
</template>
