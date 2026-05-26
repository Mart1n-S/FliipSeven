<script setup lang="ts">
import { computed } from 'vue'
import { isFlipThreeCard, isFreezeCard, isSecondChanceCard } from '@/domain/entities/Card'
import CardView from '@/presentation/components/CardView.vue'
import type { HistoryEntry } from '@/presentation/stores/history'

const props = defineProps<{
  entries: readonly HistoryEntry[]
}>()

defineEmits<{ close: [] }>()

const reversedEntries = computed(() => [...props.entries].reverse())

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function describe(entry: HistoryEntry): string {
  switch (entry.kind) {
    case 'round-start':
      return `Manche ${entry.roundNumber} - distribution par ${entry.dealerPseudo}`
    case 'deal':
      return `Distribution à ${entry.playerPseudo}`
    case 'draw':
      return entry.forced
        ? `${entry.playerPseudo} pioche (Trois à la Suite)`
        : `${entry.playerPseudo} pioche`
    case 'bust':
      return `${entry.playerPseudo} bust sur un doublon de ${entry.duplicateValue}`
    case 'flip7':
      return `${entry.playerPseudo} fait Flip 7 ! (+${entry.roundScore} pts)`
    case 'frozen':
      return `${entry.playerPseudo} a été gelé`
    case 'sc-save':
      return `Seconde Chance : ${entry.playerPseudo} évite le doublon de ${entry.duplicateValue}`
    case 'stay':
      return `${entry.playerPseudo} s'arrête (${entry.roundScore} pts)`
    case 'action-resolved':
      if (isFreezeCard(entry.card)) {
        return `Gel posé par ${entry.originPseudo} sur ${entry.targetPseudo ?? '-'}`
      }
      if (isFlipThreeCard(entry.card)) {
        return `Trois à la Suite déclenché par ${entry.originPseudo} sur ${entry.targetPseudo ?? '-'}`
      }
      if (isSecondChanceCard(entry.card)) {
        if (entry.targetPseudo === null) {
          return `Seconde Chance défaussée (pas de joueur valide) par ${entry.originPseudo}`
        }
        return entry.originPseudo === entry.targetPseudo
          ? `${entry.originPseudo} garde sa Seconde Chance`
          : `${entry.originPseudo} donne une Seconde Chance à ${entry.targetPseudo}`
      }
      return `Action résolue par ${entry.originPseudo}`
    case 'round-end':
      return `Fin de la manche ${entry.roundNumber}`
    case 'game-finished':
      return `Partie terminée - vainqueur : ${entry.winnerPseudo}`
    default: {
      const _exhaustive: never = entry
      return String(_exhaustive)
    }
  }
}

const KIND_COLOR: Record<HistoryEntry['kind'], string> = {
  'round-start': 'text-emerald-300',
  deal: 'text-slate-400',
  draw: 'text-slate-300',
  bust: 'text-rose-400',
  flip7: 'text-amber-300',
  frozen: 'text-sky-400',
  'sc-save': 'text-emerald-300',
  stay: 'text-sky-300',
  'action-resolved': 'text-amber-300',
  'round-end': 'text-indigo-300',
  'game-finished': 'text-amber-300',
}
</script>

<template>
  <div
    class="fixed inset-0 z-30 flex items-stretch justify-end bg-slate-950/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label="Historique de la partie"
    @click.self="$emit('close')"
  >
    <aside
      class="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 class="text-base font-semibold text-slate-100">Historique</h2>
          <p class="text-xs text-slate-400">{{ entries.length }} évènement(s)</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500"
          @click="$emit('close')"
        >
          Fermer
        </button>
      </header>

      <div
        v-if="entries.length === 0"
        class="flex flex-1 items-center justify-center px-4 text-sm text-slate-500"
      >
        Aucun évènement pour l'instant.
      </div>

      <ol v-else class="flex-1 divide-y divide-slate-800 overflow-y-auto">
        <li
          v-for="(entry, i) in reversedEntries"
          :key="`${entry.timestamp}-${i}`"
          class="px-4 py-2.5"
        >
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-sm font-medium" :class="KIND_COLOR[entry.kind]">
              {{ describe(entry) }}
            </p>
            <time class="font-mono text-xs whitespace-nowrap text-slate-500">
              {{ formatTime(entry.timestamp) }}
            </time>
          </div>

          <div
            v-if="entry.kind === 'deal' || entry.kind === 'draw'"
            class="mt-1.5 flex items-center gap-2"
          >
            <CardView :card="entry.card" size="sm" />
          </div>
          <div v-else-if="entry.kind === 'action-resolved'" class="mt-1.5 flex items-center gap-2">
            <CardView :card="entry.card" size="sm" />
          </div>

          <!-- Snapshot of the player's full row when they bust / stay /
               freeze / Flip 7 - useful for litige resolution. -->
          <div
            v-else-if="
              entry.kind === 'bust' ||
              entry.kind === 'stay' ||
              entry.kind === 'flip7' ||
              entry.kind === 'frozen'
            "
            class="mt-2 rounded-md border border-slate-800 bg-slate-950/40 p-2"
          >
            <p class="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              Jeu de {{ entry.playerPseudo }}
            </p>
            <div
              v-if="
                entry.hand.numberCards.length === 0 &&
                entry.hand.modifiers.length === 0 &&
                entry.hand.secondChance === null
              "
              class="text-xs text-slate-500 italic"
            >
              Aucune carte
            </div>
            <div v-else class="flex flex-wrap items-center gap-1.5">
              <CardView
                v-for="card in entry.hand.numberCards"
                :key="card.id"
                :card="card"
                size="sm"
              />
              <CardView
                v-for="card in entry.hand.modifiers"
                :key="card.id"
                :card="card"
                size="sm"
              />
              <CardView v-if="entry.hand.secondChance" :card="entry.hand.secondChance" size="sm" />
            </div>
          </div>

          <div
            v-else-if="entry.kind === 'round-end'"
            class="mt-1.5 grid grid-cols-1 gap-0.5 font-mono text-xs text-slate-400"
          >
            <span v-for="s in entry.scores" :key="s.pseudo" class="flex justify-between gap-3">
              <span>{{ s.pseudo }}</span>
              <span class="tabular-nums">+{{ s.delta }} → {{ s.total }}</span>
            </span>
          </div>
        </li>
      </ol>
    </aside>
  </div>
</template>
