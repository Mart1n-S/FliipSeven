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
    classes: 'bg-status-active/15 text-status-active-text ring-1 ring-status-active/30',
  },
  stayed: {
    label: 'Stop',
    classes: 'bg-surface-overlay text-text-secondary ring-1 ring-surface-border',
  },
  busted: {
    label: 'Bust',
    classes: 'bg-status-busted/15 text-status-busted-text ring-1 ring-status-busted/30',
  },
  frozen: {
    label: 'Gel',
    classes: 'bg-status-frozen/15 text-status-frozen-text ring-1 ring-status-frozen/30',
  },
  flip7: {
    label: 'Flip 7',
    classes: 'bg-status-flip7/15 text-status-flip7-text ring-1 ring-status-flip7/30',
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
