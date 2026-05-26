<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

const props = withDefaults(
  defineProps<{
    pseudo: string
    /** Player status, used to tint the ring and dim the avatar. */
    status?: PlayerStatus | null
    /** Highlight the avatar as the seat to watch (active player). */
    active?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { status: null, active: false, size: 'md' },
)

/**
 * First two letters of the pseudo, uppercased. Falls back to '?' on
 * empty pseudos so the avatar always renders something readable.
 */
const initials = computed(() => {
  const trimmed = props.pseudo.trim()
  if (trimmed.length === 0) return '?'
  return trimmed.slice(0, 2).toUpperCase()
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-9 text-xs'
    case 'lg':
      return 'size-14 text-base'
    case 'md':
    default:
      return 'size-11 text-sm'
  }
})

/**
 * Visual treatment by status. The active prop wins over status:
 * a player can be "active and not yet started", and we want the
 * cyan ring to dominate.
 */
const stateClass = computed(() => {
  if (props.active) return 'ring-2 ring-status-active'
  switch (props.status) {
    case 'busted':
      return 'opacity-50 ring-1 ring-status-busted/40'
    case 'frozen':
      return 'opacity-70 ring-1 ring-status-frozen/40'
    case 'stayed':
      return 'ring-1 ring-surface-border'
    case 'flip7':
      return 'ring-2 ring-status-flip7'
    default:
      return 'ring-1 ring-surface-border'
  }
})
</script>

<template>
  <div
    :class="[sizeClass, stateClass]"
    class="flex shrink-0 items-center justify-center rounded-full bg-surface-raised font-mono font-medium tracking-wider text-slate-200 select-none"
    aria-hidden="true"
  >
    {{ initials }}
  </div>
</template>
