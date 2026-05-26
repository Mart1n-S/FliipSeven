<script setup lang="ts">
import { computed } from 'vue'
import CardView from '@/presentation/components/CardView.vue'
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

const ACTION_LABEL = {
  freeze: 'Gel',
  'flip-three': 'Trois à la Suite',
  'second-chance': 'Seconde Chance',
} as const

const style = computed<EventStyle>(() => {
  const e = props.event
  switch (e.kind) {
    case 'bust':
      return {
        message: `${e.playerPseudo} a perdu sur un doublon de ${e.duplicateCard.value} !`,
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
    case 'second-chance-save':
      return {
        message: `Seconde Chance ! ${e.playerPseudo} a évité un doublon de ${e.duplicateCard.value}.`,
        classes: 'border-emerald-600 bg-emerald-900/40 text-emerald-100',
      }
    case 'action-drawn':
      return {
        message: `${e.playerPseudo} a pioché une carte ${ACTION_LABEL[e.card.action]}.`,
        classes: 'border-amber-600 bg-amber-900/40 text-amber-100',
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
  <div class="border-b px-4 py-2 text-sm" :class="style.classes" role="status" aria-live="polite">
    <div class="flex items-center justify-between gap-3">
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

    <!-- Show the saved duplicate alongside the consumed SC card. -->
    <div v-if="event.kind === 'second-chance-save'" class="mt-2 flex items-center gap-2">
      <CardView :card="event.duplicateCard" size="sm" />
      <span class="text-xs opacity-70">+</span>
      <CardView :card="event.secondChanceCard" size="sm" />
      <span class="ml-1 text-xs opacity-70">→ défausse</span>
    </div>

    <!-- Show the card that caused the bust. -->
    <div v-else-if="event.kind === 'bust'" class="mt-2 flex items-center gap-2">
      <CardView :card="event.duplicateCard" size="sm" />
      <span class="text-xs opacity-70">doublon déjà sur la rangée</span>
    </div>

    <!-- Show the action card that was just drawn (even if it auto-resolves). -->
    <div v-else-if="event.kind === 'action-drawn'" class="mt-2 flex items-center gap-2">
      <CardView :card="event.card" size="sm" />
    </div>
  </div>
</template>
