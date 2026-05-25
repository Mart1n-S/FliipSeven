<script setup lang="ts">
import type { Player } from '@/domain/entities/Player'

defineProps<{
  roundNumber: number
  dealer: Player | null
  deckSize: number
  discardSize: number
}>()
</script>

<template>
  <header
    class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur"
  >
    <div>
      <h2 class="text-base font-semibold text-slate-100">Manche {{ roundNumber }}</h2>
      <p v-if="dealer" class="text-xs text-slate-400">
        Donneur :
        <span class="font-medium text-slate-200">{{ dealer.pseudo }}</span>
      </p>
    </div>

    <div class="flex gap-3 text-right font-mono text-xs text-slate-400 tabular-nums">
      <div>
        <p class="text-slate-500 uppercase">Pioche</p>
        <p class="text-sm text-slate-200">{{ deckSize }}</p>
      </div>
      <div>
        <p class="text-slate-500 uppercase">Défausse</p>
        <p class="text-sm text-slate-200">{{ discardSize }}</p>
      </div>
    </div>
  </header>
</template>
