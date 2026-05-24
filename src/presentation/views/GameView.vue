<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGame } from '@/presentation/composables/useGame'

const router = useRouter()
const { game, reset } = useGame()

function quit() {
  reset()
  router.replace({ name: 'home' })
}
</script>

<template>
  <main class="flex min-h-full flex-col gap-6 p-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Partie en cours</h1>
      <button
        type="button"
        class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-500 hover:text-rose-400"
        @click="quit"
      >
        Quitter
      </button>
    </header>

    <section v-if="game" class="space-y-4">
      <p class="text-slate-400">
        Manche {{ game.roundNumber }} - phase
        <span class="font-mono text-slate-300">{{ game.phase }}</span>
      </p>

      <ul class="space-y-2">
        <li
          v-for="player in game.players"
          :key="player.id"
          class="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
        >
          <span class="font-medium">{{ player.pseudo }}</span>
          <span class="font-mono text-indigo-300">{{ player.totalScore }} pts</span>
        </li>
      </ul>

      <p class="text-sm text-slate-500">UI complète à venir à l'étape 10.</p>
    </section>

    <section v-else>
      <p class="text-slate-400">Aucune partie en cours.</p>
    </section>
  </main>
</template>
