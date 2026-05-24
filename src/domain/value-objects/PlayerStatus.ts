/**
 * Status of a player within a single round.
 * - `active`   : can still draw or stay
 * - `stayed`   : voluntarily stopped, will score
 * - `busted`   : drew a duplicate number without Second Chance, scores 0
 * - `frozen`   : hit by a Freeze card, scores 0
 * - `flip7`    : reached 7 unique number cards, ends the round and gets +15
 */
export type PlayerStatus = 'active' | 'stayed' | 'busted' | 'frozen' | 'flip7'

export function isOutOfRound(status: PlayerStatus): boolean {
  return status === 'busted' || status === 'frozen'
}

export function canDraw(status: PlayerStatus): boolean {
  return status === 'active'
}
