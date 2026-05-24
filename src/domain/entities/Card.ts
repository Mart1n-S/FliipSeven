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
 * Narrowed types for each action card variant.
 * They allow APIs to require a specific action (eg. only a Freeze
 * card can be passed to applyFreeze) and to be checked at compile time.
 */
export type FreezeCard = ActionCard & { readonly action: 'freeze' }
export type FlipThreeCard = ActionCard & { readonly action: 'flip-three' }
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

export function isFreezeCard(card: Card): card is FreezeCard {
  return card.kind === 'action' && card.action === 'freeze'
}

export function isFlipThreeCard(card: Card): card is FlipThreeCard {
  return card.kind === 'action' && card.action === 'flip-three'
}

export function isSecondChanceCard(card: Card): card is SecondChanceCard {
  return card.kind === 'action' && card.action === 'second-chance'
}
