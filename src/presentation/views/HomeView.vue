<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue'
import HomeBackdrop from '@/presentation/components/HomeBackdrop.vue'
import ThemeToggle from '@/presentation/components/ThemeToggle.vue'
import { useGame } from '@/presentation/composables/useGame'

const router = useRouter()
const { game, isFinished, reset } = useGame()

const canResume = computed(() => game.value !== null && !isFinished.value)

const showOverwriteConfirm = ref(false)

function resume() {
  router.push({ name: 'game' })
}

function startNew() {
  if (canResume.value) {
    showOverwriteConfirm.value = true
  } else {
    goToSetup()
  }
}

function confirmOverwrite() {
  reset()
  showOverwriteConfirm.value = false
  goToSetup()
}

function goToSetup() {
  router.push({ name: 'setup' })
}
</script>

<template>
  <main
    class="relative flex min-h-full flex-col items-center justify-center gap-10 overflow-hidden p-6"
  >
    <HomeBackdrop />

    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    <header class="relative z-10 text-center">
      <p class="text-[11px] font-semibold tracking-widest text-status-active-text uppercase">
        Jeu de cartes
      </p>
      <h1 class="mt-2 text-7xl font-bold tracking-tight text-text-primary">
        Flip <span class="text-status-flip7-text">7</span>
      </h1>
      <p class="mt-3 text-sm text-text-secondary">
        Version web · jusqu'à 18 joueurs sur un téléphone
      </p>
    </header>

    <div class="relative z-10 flex w-full max-w-xs flex-col gap-3">
      <button
        v-if="canResume"
        type="button"
        class="rounded-xl bg-status-active px-6 py-4 text-lg font-semibold text-text-inverse shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98]"
        @click="resume"
      >
        Reprendre la partie
      </button>

      <button
        type="button"
        class="rounded-xl px-6 py-4 text-lg font-semibold transition active:scale-[0.98]"
        :class="
          canResume
            ? 'bg-surface-raised text-text-primary ring-1 ring-surface-border hover:ring-slate-500'
            : 'bg-status-active text-text-inverse shadow-lg shadow-status-active/20 hover:brightness-110'
        "
        @click="startNew"
      >
        Nouvelle partie
      </button>
    </div>

    <p v-if="canResume" class="relative z-10 max-w-xs text-center text-xs text-text-tertiary">
      Démarrer une nouvelle partie effacera la partie en cours.
    </p>

    <Transition name="dialog">
      <ConfirmDialog
        v-if="showOverwriteConfirm"
        title="Écraser la partie en cours ?"
        message="Tu vas perdre ta partie sauvegardée. Continuer ?"
        confirm-label="Nouvelle partie"
        cancel-label="Annuler"
        destructive
        @confirm="confirmOverwrite"
        @cancel="showOverwriteConfirm = false"
      />
    </Transition>
  </main>
</template>
