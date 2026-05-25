<script setup lang="ts">
import { computed } from 'vue'
import type { GameEvent } from '@/presentation/stores/gameStore'

const props = defineProps<{
  event: GameEvent
}>()

defineEmits<{
  dismiss: []
}>()

interface EventStyle {
  message: string
  classes: string
}

const style = computed<EventStyle>(() => {
  const e = props.event
  switch (e.kind) {
    case 'bust':
      return {
        message: `${e.playerPseudo} a perdu !`,
        classes: 'border-rose-700 bg-rose-900/40 text-rose-100',
      }
    case 'flip7':
      return {
        message: `${e.playerPseudo} fait Flip 7 ! +15 pts bonus.`,
        classes: 'border-amber-500 bg-amber-900/40 text-amber-100',
      }
    case 'frozen':
      return {
        message: `${e.playerPseudo} a été gelé.`,
        classes: 'border-sky-700 bg-sky-900/40 text-sky-100',
      }
    case 'second-chance':
      return {
        message: `${e.playerPseudo} a utilisé sa Seconde Chance.`,
        classes: 'border-emerald-700 bg-emerald-900/40 text-emerald-100',
      }
    case 'round-ended':
      return {
        message: `Manche ${e.roundNumber} terminée.`,
        classes: 'border-indigo-700 bg-indigo-900/40 text-indigo-100',
      }
    case 'game-finished':
      return {
        message: 'Partie terminée !',
        classes: 'border-amber-500 bg-amber-900/40 text-amber-100',
      }
    default: {
      // Exhaustive check: TS will error here if a new GameEvent kind
      // is introduced without a matching case above.
      const _exhaustive: never = e
      return { message: String(_exhaustive), classes: '' }
    }
  }
})
</script>

<template>
  <div
    class="flex items-center justify-between gap-3 border-b px-4 py-2 text-sm"
    :class="style.classes"
    role="status"
    aria-live="polite"
  >
    <span class="font-medium">{{ style.message }}</span>
    <button
      type="button"
      class="rounded p-1 text-current opacity-70 transition hover:opacity-100"
      aria-label="Fermer"
      @click="$emit('dismiss')"
    >
      &times;
    </button>
  </div>
</template>
