<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

const props = defineProps<{
  status: PlayerStatus
}>()

interface BadgeStyle {
  readonly label: string
  readonly classes: string
}

/**
 * Maps player status to its uppercase chip label and color.
 * `null` means "no badge to show" (typically `active` at the start
 * of a round, before the player has played).
 */
const styleByStatus: Record<PlayerStatus, BadgeStyle | null> = {
  active: {
    label: 'À jouer',
    classes:
      'bg-[--color-status-active]/15 text-[--color-status-active] ring-1 ring-[--color-status-active]/30',
  },
  stayed: {
    label: 'Stop',
    classes: 'bg-[--color-surface-overlay] text-slate-300 ring-1 ring-[--color-surface-border]',
  },
  busted: {
    label: 'Bust',
    classes:
      'bg-[--color-status-busted]/15 text-[--color-status-busted] ring-1 ring-[--color-status-busted]/30',
  },
  frozen: {
    label: 'Gel',
    classes:
      'bg-[--color-status-frozen]/15 text-[--color-status-frozen] ring-1 ring-[--color-status-frozen]/30',
  },
  flip7: {
    label: 'Flip 7',
    classes:
      'bg-[--color-status-flip7]/15 text-[--color-status-flip7] ring-1 ring-[--color-status-flip7]/30',
  },
}

const badge = computed(() => styleByStatus[props.status])
</script>

<template>
  <span
    v-if="badge"
    class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
    :class="badge.classes"
    >{{ badge.label }}</span
  >
</template>
