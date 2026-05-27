<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/domain/entities/Card'
import { getCardImageUrl, getCardLabel } from '@/presentation/assets/cardImages'

const props = withDefaults(
  defineProps<{
    card: Card
    size?: 'sm' | 'md' | 'lg'
    /** Trigger the freshly-drawn flash animation. */
    highlight?: boolean
  }>(),
  { size: 'md', highlight: false },
)

const url = computed(() => getCardImageUrl(props.card))
const label = computed(() => getCardLabel(props.card))

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-10 h-[60px]'
    case 'lg':
      return 'w-24 h-36'
    case 'md':
    default:
      return 'w-14 h-[84px]'
  }
})
</script>

<template>
  <img
    v-if="url"
    :src="url"
    :alt="label"
    :class="[sizeClass, highlight ? 'card-flash-in' : '']"
    class="rounded-md object-cover shadow-md ring-1 ring-surface-border/60 select-none"
    draggable="false"
  />
  <!-- Fallback if the image asset is missing -->
  <span
    v-else
    :class="[sizeClass, highlight ? 'card-flash-in' : '']"
    class="flex items-center justify-center rounded-md bg-surface-overlay text-xs text-text-secondary ring-1 ring-surface-border select-none"
    :aria-label="label"
  >
    ?
  </span>
</template>
