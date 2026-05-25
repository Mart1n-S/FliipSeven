<script setup lang="ts">
import { computed } from 'vue'
import type { ActionCard } from '@/domain/entities/Card'
import CardView from '@/presentation/components/CardView.vue'
import type { TargetChoice } from '@/presentation/composables/useActionResolution'

const props = defineProps<{
  card: ActionCard
  originPseudo: string
  choices: readonly TargetChoice[]
}>()

defineEmits<{
  select: [index: number]
}>()

const promptByAction = computed(() => {
  const action = props.card.action
  switch (action) {
    case 'freeze':
      return {
        title: 'Choisir une cible - Gel',
        subtitle: `${props.originPseudo} doit choisir le joueur à geler.`,
      }
    case 'flip-three':
      return {
        title: 'Choisir une cible - Trois à la Suite',
        subtitle: `${props.originPseudo} doit choisir le joueur qui pioche 3 cartes.`,
      }
    case 'second-chance':
      return {
        title: 'Donner la Seconde Chance',
        subtitle: `${props.originPseudo} doit donner sa Seconde Chance à un autre joueur actif.`,
      }
    default: {
      // Exhaustive: TS will error here if a new ActionKind is added.
      const _exhaustive: never = action
      return { title: String(_exhaustive), subtitle: '' }
    }
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
    role="dialog"
    aria-modal="true"
    :aria-label="promptByAction.title"
  >
    <div class="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <header class="flex items-start gap-3">
        <CardView :card="card" size="md" />
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-slate-100">
            {{ promptByAction.title }}
          </h2>
          <p class="mt-1 text-sm text-slate-400">{{ promptByAction.subtitle }}</p>
        </div>
      </header>

      <ul class="mt-4 flex flex-col gap-2">
        <li v-for="choice in choices" :key="choice.index">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left text-slate-100 transition hover:border-indigo-400 hover:bg-slate-800/80 active:scale-[0.98]"
            @click="$emit('select', choice.index)"
          >
            <span class="font-medium">{{ choice.pseudo }}</span>
            <span class="text-xs text-slate-400">Choisir</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
