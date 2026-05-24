import type { ActionCard, Card, ModifierCard, NumberCard } from '@/domain/entities/Card'
import { ACTION_KINDS } from '@/domain/value-objects/ActionKind'
import { createCardId } from '@/domain/value-objects/CardId'
import { MODIFIER_KINDS } from '@/domain/value-objects/ModifierKind'
import { type NumberValue, NUMBER_VALUES } from '@/domain/value-objects/NumberValue'

const ACTION_COPIES = 3

function numberCardCopies(value: NumberValue): number {
  return value === 0 ? 1 : value
}

function buildNumberCards(): NumberCard[] {
  return NUMBER_VALUES.flatMap((value) =>
    Array.from(
      { length: numberCardCopies(value) },
      (_, index): NumberCard => ({
        id: createCardId(`number-${value}-${index}`),
        kind: 'number',
        value,
      }),
    ),
  )
}

function buildModifierCards(): ModifierCard[] {
  return MODIFIER_KINDS.map(
    (modifier): ModifierCard => ({
      id: createCardId(`modifier-${modifier}`),
      kind: 'modifier',
      modifier,
    }),
  )
}

function buildActionCards(): ActionCard[] {
  return ACTION_KINDS.flatMap((action) =>
    Array.from(
      { length: ACTION_COPIES },
      (_, index): ActionCard => ({
        id: createCardId(`action-${action}-${index}`),
        kind: 'action',
        action,
      }),
    ),
  )
}

/**
 * Builds a fresh, unshuffled Flip 7 deck of exactly 94 cards:
 *  - 79 number cards (0×1, 1×1, 2×2, ..., 12×12)
 *  - 6 modifier cards (one of each)
 *  - 9 action cards (3 of each)
 */
export function createDeck(): readonly Card[] {
  return [...buildNumberCards(), ...buildModifierCards(), ...buildActionCards()]
}
