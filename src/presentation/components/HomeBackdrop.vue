<script setup lang="ts">
/**
 * Purely decorative backdrop for the home screen: soft color glows,
 * scattered geometric "confetti" and a few stylised Flip 7 cards in the
 * corners. Theme-aware (uses the status/accent palette), lightweight
 * (inline SVG, no extra asset) and inert (pointer-events-none, aria-hidden).
 */

type ConfettiType = 'plus' | 'ring' | 'x' | 'sparkle' | 'dots'

interface Confetti {
  readonly type: ConfettiType
  /** Position in % of the container. */
  readonly top: number
  readonly left: number
  readonly size: number
  /** Tailwind text-color class (drives `currentColor`). */
  readonly color: string
  readonly rotate?: number
}

// The `*-text` variants are theme-aware: dark & saturated on the light
// theme (so the decor doesn't wash out), bright on the dark theme.
const LIME = 'text-status-flip7-text'
const PURPLE = 'text-accent-info-text'
const TEAL = 'text-status-active-text'

// Scattered around the edges, leaving the centre clear for the title.
const confetti: readonly Confetti[] = [
  // top band
  { type: 'plus', top: 9, left: 26, size: 16, color: LIME },
  { type: 'ring', top: 15, left: 36, size: 14, color: PURPLE },
  { type: 'x', top: 7, left: 52, size: 13, color: TEAL, rotate: 12 },
  { type: 'plus', top: 13, left: 64, size: 14, color: PURPLE },
  { type: 'sparkle', top: 20, left: 74, size: 16, color: TEAL },
  { type: 'dots', top: 30, left: 12, size: 26, color: PURPLE },
  // left / right columns
  { type: 'sparkle', top: 44, left: 6, size: 15, color: LIME },
  { type: 'ring', top: 60, left: 9, size: 13, color: TEAL },
  { type: 'x', top: 50, left: 92, size: 14, color: LIME, rotate: 20 },
  { type: 'plus', top: 38, left: 94, size: 14, color: TEAL },
  { type: 'sparkle', top: 66, left: 90, size: 17, color: PURPLE },
  // bottom band
  { type: 'dots', top: 70, left: 80, size: 26, color: LIME },
  { type: 'plus', top: 86, left: 30, size: 15, color: TEAL },
  { type: 'ring', top: 90, left: 44, size: 13, color: LIME },
  { type: 'x', top: 84, left: 56, size: 13, color: PURPLE, rotate: 15 },
  { type: 'sparkle', top: 91, left: 68, size: 15, color: TEAL },
  { type: 'dots', top: 82, left: 14, size: 24, color: LIME },
]

// Stylised cards in the four corners, partly off-screen and tilted.
const cards: readonly string[] = [
  'left-[-1.75rem] top-[-1.5rem] rotate-[-12deg]',
  'right-[-1.5rem] top-[-1rem] rotate-[11deg]',
  'left-[-1.25rem] bottom-[-1.75rem] rotate-[9deg]',
  'right-[-1.75rem] bottom-[-1.5rem] rotate-[-10deg]',
]

// 3x3 dot grid coordinates (viewBox 0 0 24 24).
const dotGrid = [4, 12, 20].flatMap((y) => [4, 12, 20].map((x) => ({ x, y })))

/** A subtle, type-appropriate ambient animation for each confetti. */
function animClass(type: ConfettiType): string {
  switch (type) {
    case 'plus':
      return 'anim-spin'
    case 'x':
      return 'anim-spin-rev'
    case 'ring':
      return 'anim-pulse'
    case 'dots':
      return 'anim-float'
    case 'sparkle':
      return 'anim-twinkle'
    default:
      return ''
  }
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <!-- Soft color glows for depth. -->
    <div class="absolute -top-24 -left-20 size-72 rounded-full bg-status-flip7/10 blur-3xl" />
    <div class="absolute -right-24 -bottom-24 size-80 rounded-full bg-accent-info/10 blur-3xl" />
    <div
      class="absolute top-1/3 left-2/3 size-56 -translate-x-1/2 rounded-full bg-status-active/10 blur-3xl"
    />

    <!-- Corner cards. -->
    <div
      v-for="(pos, i) in cards"
      :key="`card-${i}`"
      class="absolute w-24 text-status-flip7-text opacity-25"
      :class="pos"
    >
      <svg viewBox="0 0 80 112" fill="none" class="h-auto w-full">
        <path
          d="M12 2 H68 L78 12 V100 L68 110 H12 L2 100 V12 Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <rect
          x="9"
          y="9"
          width="62"
          height="94"
          rx="3"
          stroke="currentColor"
          stroke-width="1"
          opacity="0.6"
        />
        <text
          x="40"
          y="42"
          text-anchor="middle"
          font-size="11"
          letter-spacing="2.5"
          fill="currentColor"
          font-family="sans-serif"
        >
          FLIP
        </text>
        <text
          x="40"
          y="86"
          text-anchor="middle"
          font-size="44"
          font-weight="800"
          fill="currentColor"
          font-family="sans-serif"
        >
          7
        </text>
      </svg>
    </div>

    <!-- Geometric confetti. -->
    <span
      v-for="(c, i) in confetti"
      :key="`c-${i}`"
      class="absolute opacity-70"
      :class="c.color"
      :style="{
        top: `${c.top}%`,
        left: `${c.left}%`,
        transform: `translate(-50%, -50%) rotate(${c.rotate ?? 0}deg)`,
      }"
    >
      <svg
        :width="c.size"
        :height="c.size"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        class="block"
        :class="animClass(c.type)"
        :style="{ animationDelay: `${(i % 6) * 0.45}s` }"
      >
        <template v-if="c.type === 'plus'">
          <path d="M12 4v16M4 12h16" />
        </template>
        <template v-else-if="c.type === 'ring'">
          <circle cx="12" cy="12" r="7" />
        </template>
        <template v-else-if="c.type === 'x'">
          <path d="M6 6l12 12M18 6L6 18" />
        </template>
        <template v-else-if="c.type === 'sparkle'">
          <path
            d="M12 1.5 L13.9 10.1 L22.5 12 L13.9 13.9 L12 22.5 L10.1 13.9 L1.5 12 L10.1 10.1 Z"
            fill="currentColor"
            stroke="none"
          />
        </template>
        <template v-else>
          <circle
            v-for="(d, j) in dotGrid"
            :key="j"
            :cx="d.x"
            :cy="d.y"
            r="1.6"
            fill="currentColor"
            stroke="none"
          />
        </template>
      </svg>
    </span>
  </div>
</template>
