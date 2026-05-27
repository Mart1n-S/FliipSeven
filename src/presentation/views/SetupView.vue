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
        class="flex size-10 items-center justify-center rounded-lg bg-surface-raised text-slate-300 ring-1 ring-surface-border transition hover:ring-slate-500"
        aria-label="Retour à l'accueil"
        @click="back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="size-5"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold tracking-widest text-status-active uppercase">
          Nouvelle partie
        </p>
        <h1 class="text-2xl font-bold text-slate-100">Qui joue ?</h1>
      </div>
    </header>

    <form class="flex flex-1 flex-col gap-4" @submit.prevent="start">
      <div class="flex items-center justify-between">
        <p class="font-mono text-xs text-slate-500 tabular-nums">
          <span class="text-slate-300">{{ pseudos.length }}</span>
          <span class="text-slate-600">/ {{ MAX_PLAYERS }} joueurs</span>
        </p>
        <p class="text-[10px] tracking-wider text-slate-600 uppercase">Min. {{ MIN_PLAYERS }}</p>
      </div>

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
        class="rounded-xl border border-dashed border-surface-border bg-transparent px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-status-active hover:text-status-active disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-surface-border disabled:hover:text-slate-400"
        :disabled="pseudos.length >= MAX_PLAYERS"
        @click="addPlayer"
      >
        + Ajouter un joueur
      </button>

      <p
        v-if="errorMessage"
        class="rounded-lg bg-status-busted/10 px-3 py-2 text-sm text-status-busted ring-1 ring-status-busted/30"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="mt-auto pt-4">
        <button
          type="submit"
          class="w-full rounded-xl bg-status-active px-6 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100"
          :disabled="!isValid"
        >
          Démarrer la partie
        </button>
      </div>
    </form>
  </main>
</template>
