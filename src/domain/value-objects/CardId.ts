declare const cardIdBrand: unique symbol

export type CardId = string & { readonly [cardIdBrand]: true }

export function createCardId(value: string): CardId {
  return value as CardId
}
