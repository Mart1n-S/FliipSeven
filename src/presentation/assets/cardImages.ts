import type { Card } from '@/domain/entities/Card'
import type { ActionKind } from '@/domain/value-objects/ActionKind'

/**
 * Vite glob: bundles every PNG under ./cards/** into hashed URLs at
 * build time, exposed as a path -> url map.
 */
const cardImages = import.meta.glob<string>('./cards/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

/**
 * Mapping from domain action names (semantic) to asset filenames.
 * The asset names use the French / playful labels chosen by the
 * designer; the domain uses neutral, English-ish identifiers.
 */
const ACTION_FILENAME: Record<ActionKind, string> = {
  freeze: 'stop',
  'flip-three': 'trois-a-la-suite',
  'second-chance': 'second-chance',
}

function cardKey(card: Card): string {
  switch (card.kind) {
    case 'number':
      return `./cards/numbers/${card.value}.png`
    case 'modifier':
      return `./cards/modifiers/${card.modifier}.png`
    case 'action':
      return `./cards/actions/${ACTION_FILENAME[card.action]}.png`
  }
}

/** Return the hashed asset URL for a card, or `null` if missing. */
export function getCardImageUrl(card: Card): string | null {
  return cardImages[cardKey(card)] ?? null
}

/** Human-readable label for accessibility (alt text, aria-label). */
export function getCardLabel(card: Card): string {
  switch (card.kind) {
    case 'number':
      return `Carte ${card.value}`
    case 'modifier':
      return card.modifier === 'fois-2'
        ? 'Modificateur ×2'
        : `Modificateur +${card.modifier.replace('plus-', '')}`
    case 'action':
      switch (card.action) {
        case 'freeze':
          return 'Carte Gel'
        case 'flip-three':
          return 'Carte Trois à la Suite'
        case 'second-chance':
          return 'Carte Seconde Chance'
      }
  }
}
