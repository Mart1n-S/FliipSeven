<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useGameStore } from '@/presentation/stores/gameStore'

// Synchronous hydration so any route that mounts immediately after
// already sees the persisted game (no flash of "no game").
const store = useGameStore()
store.loadFromStorage()
</script>

<template>
  <RouterView />
</template>
