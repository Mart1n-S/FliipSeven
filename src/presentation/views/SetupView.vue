<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MAX_PLAYERS, MIN_PLAYERS } from '@/domain/rules/game'
import PlayerInput from '@/presentation/components/PlayerInput.vue'
import { useGame } from '@/presentation/composables/useGame'

const router = useRouter()
const { newGame } = useGame()

const pseudos = ref<string[]>(['', ''])

const trimmedPseudos = computed(() => pseudos.value.map((p) => p.trim()))

const hasEmpty = computed(() => trimmedPseudos.value.some((p) => p.length === 0))

const duplicates = computed<string[]>(() => {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const pseudo of trimmedPseudos.value) {
    if (pseudo.length === 0) continue
    const key = pseudo.toLocaleLowerCase()
    if (seen.has(key)) dups.add(key)
    else seen.add(key)
  }
  return [...dups]
})

const isValid = computed(
  () =>
    pseudos.value.length >= MIN_PLAYERS &&
    pseudos.value.length <= MAX_PLAYERS &&
    !hasEmpty.value &&
    duplicates.value.length === 0,
)

const errorMessage = computed<string | null>(() => {
  if (hasEmpty.value) return 'Chaque joueur doit avoir un pseudo.'
  if (duplicates.value.length > 0) return 'Deux joueurs ne peuvent pas avoir le même pseudo.'
  return null
})

function addPlayer() {
  if (pseudos.value.length < MAX_PLAYERS) pseudos.value.push('')
}

function removePlayer(index: number) {
  if (pseudos.value.length > MIN_PLAYERS) pseudos.value.splice(index, 1)
}

function start() {
  if (!isValid.value) return
  newGame(trimmedPseudos.value)
  router.replace({ name: 'game' })
}

function back() {
  router.replace({ name: 'home' })
}
</script>

<template>
  <main class="flex min-h-full flex-col p-6">
    <header class="mb-6 flex items-center gap-3">
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500"
        aria-label="Retour"
        @click="back"
      >
        &larr;
      </button>
      <h1 class="text-2xl font-bold">Nouvelle partie</h1>
    </header>

    <form class="flex flex-1 flex-col gap-4" @submit.prevent="start">
      <p class="text-sm text-slate-400">
        {{ pseudos.length }} / {{ MAX_PLAYERS }} joueurs
        <span class="text-slate-600">- minimum {{ MIN_PLAYERS }}</span>
      </p>

      <ul class="flex flex-col gap-2">
        <li v-for="(_, index) in pseudos" :key="index">
          <PlayerInput
            v-model="pseudos[index]!"
            :index="index"
            :can-remove="pseudos.length > MIN_PLAYERS"
            :autofocus="index === 0"
            @remove="removePlayer(index)"
          />
        </li>
      </ul>

      <button
        type="button"
        class="rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-indigo-400 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
        :disabled="pseudos.length >= MAX_PLAYERS"
        @click="addPlayer"
      >
        + Ajouter un joueur
      </button>

      <p v-if="errorMessage" class="text-sm text-rose-400" role="alert">
        {{ errorMessage }}
      </p>

      <div class="mt-auto pt-4">
        <button
          type="submit"
          class="w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-indigo-500"
          :disabled="!isValid"
        >
          Démarrer la partie
        </button>
      </div>
    </form>
  </main>
</template>
