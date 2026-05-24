declare const playerIdBrand: unique symbol

export type PlayerId = string & { readonly [playerIdBrand]: true }

export function createPlayerId(value: string): PlayerId {
  return value as PlayerId
}
