import type { ActionKind } from '@/domain/value-objects/ActionKind'
import type { CardId } from '@/domain/value-objects/CardId'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'

export interface NumberCard {
  readonly id: CardId
  readonly kind: 'number'
  readonly value: NumberValue
}

export interface ModifierCard {
  readonly id: CardId
  readonly kind: 'modifier'
  readonly modifier: ModifierKind
}

export interface ActionCard {
  readonly id: CardId
  readonly kind: 'action'
  readonly action: ActionKind
}

export type Card = NumberCard | ModifierCard | ActionCard

/**
 * Narrowed type for the Second Chance action card, useful when
 * storing it as a single slot on a player's row.
 */
export type SecondChanceCard = ActionCard & { readonly action: 'second-chance' }

export function isNumberCard(card: Card): card is NumberCard {
  return card.kind === 'number'
}

export function isModifierCard(card: Card): card is ModifierCard {
  return card.kind === 'modifier'
}

export function isActionCard(card: Card): card is ActionCard {
  return card.kind === 'action'
}

export function isSecondChanceCard(card: Card): card is SecondChanceCard {
  return card.kind === 'action' && card.action === 'second-chance'
}
