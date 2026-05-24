<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '@/presentation/composables/useGame'

const router = useRouter()
const { game, isFinished } = useGame()

const canResume = computed(() => game.value !== null && !isFinished.value)

function resume() {
  router.push({ name: 'game' })
}

function startNew() {
  router.push({ name: 'setup' })
}
</script>

<template>
  <main class="flex min-h-full flex-col items-center justify-center gap-10 p-6">
    <header class="text-center">
      <h1 class="text-6xl font-bold tracking-tight">Flip 7</h1>
      <p class="mt-3 text-slate-400">Le jeu de cartes - version web</p>
    </header>

    <div class="flex w-full max-w-xs flex-col gap-3">
      <button
        v-if="canResume"
        type="button"
        class="rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
        @click="resume"
      >
        Reprendre la partie
      </button>

      <button
        type="button"
        class="rounded-xl px-6 py-4 text-lg font-semibold transition active:scale-95"
        :class="
          canResume
            ? 'border border-slate-700 text-slate-200 hover:border-slate-500'
            : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400'
        "
        @click="startNew"
      >
        Nouvelle partie
      </button>
    </div>

    <p v-if="canResume" class="text-xs text-slate-500">
      Démarrer une nouvelle partie effacera la partie en cours.
    </p>
  </main>
</template>
