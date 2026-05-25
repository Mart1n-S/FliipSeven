<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ActionBar from '@/presentation/components/ActionBar.vue'
import PlayerRow from '@/presentation/components/PlayerRow.vue'
import ScoreBoard from '@/presentation/components/ScoreBoard.vue'
import { useGame } from '@/presentation/composables/useGame'

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
  draw,
  stay,
  startNextRound,
  reset,
} = useGame()

// Player whose turn the action bar acts on:
//  - normal play: the active player
//  - Flip Three sequence: the forced target (they are the one receiving cards)
const currentTurnPlayer = computed(() => forcedDrawTarget.value ?? activePlayer.value)

const actionsDisabled = computed(() => pendingAction.value !== null)
const showActionBar = computed(() => isInRound.value && currentTurnPlayer.value !== null)

function quit() {
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
    />

    <!-- Pending action banner (full modal arrives at step 12) -->
    <div
      v-if="pendingAction"
      class="border-b border-amber-700 bg-amber-900/40 px-4 py-2 text-sm text-amber-200"
      role="alert"
    >
      Une carte Action vient d'être tirée - résolution à venir (étape 12).
    </div>

    <!-- Forced draws banner -->
    <div
      v-else-if="isForcedDraw && forcedDrawTarget && game.forcedDraws"
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
      />
    </section>

    <!-- Between rounds -->
    <section v-else-if="isBetweenRounds" class="flex flex-1 flex-col gap-4 px-4 py-6">
      <h2 class="text-xl font-bold">Manche {{ game.roundNumber }} terminée</h2>
      <ul class="flex flex-col gap-2">
        <li
          v-for="player in game.players"
          :key="player.id"
          class="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
        >
          <span class="font-medium">{{ player.pseudo }}</span>
          <span class="font-mono text-indigo-300 tabular-nums"> {{ player.totalScore }} pts </span>
        </li>
      </ul>
      <button
        type="button"
        class="mt-auto w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
        @click="startNextRound"
      >
        Manche suivante
      </button>
    </section>

    <!-- Finished -->
    <section v-else-if="isFinished" class="flex flex-1 flex-col gap-4 px-4 py-6">
      <h2 class="text-2xl font-bold text-amber-300">Partie terminée !</h2>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(player, idx) in [...game.players].sort((a, b) => b.totalScore - a.totalScore)"
          :key="player.id"
          class="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
          :class="idx === 0 ? 'ring-2 ring-amber-400' : ''"
        >
          <span class="font-medium">
            <span class="mr-2 text-slate-500">#{{ idx + 1 }}</span>
            {{ player.pseudo }}
          </span>
          <span class="font-mono text-indigo-300 tabular-nums"> {{ player.totalScore }} pts </span>
        </li>
      </ul>
      <button
        type="button"
        class="mt-auto w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
        @click="quit"
      >
        Rejouer
      </button>
    </section>

    <ActionBar
      v-if="showActionBar"
      :current-pseudo="currentTurnPlayer!.pseudo"
      :disabled="actionsDisabled"
      @draw="draw"
      @stay="stay"
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
