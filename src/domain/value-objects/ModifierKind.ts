export type ModifierKind = 'plus-2' | 'plus-4' | 'plus-6' | 'plus-8' | 'plus-10' | 'fois-2'

export const MODIFIER_KINDS: readonly ModifierKind[] = [
  'plus-2',
  'plus-4',
  'plus-6',
  'plus-8',
  'plus-10',
  'fois-2',
] as const

/**
 * Effect of a modifier card on the score.
 *  - `add`      → added after the multiply step (per the rules,
 *                 x2 does NOT double bonus modifiers).
 *  - `multiply` → applied to the number cards sum only.
 */
export type ModifierEffect =
  | { readonly kind: 'add'; readonly amount: number }
  | { readonly kind: 'multiply'; readonly factor: number }

export function getModifierEffect(modifier: ModifierKind): ModifierEffect {
  switch (modifier) {
    case 'plus-2':
      return { kind: 'add', amount: 2 }
    case 'plus-4':
      return { kind: 'add', amount: 4 }
    case 'plus-6':
      return { kind: 'add', amount: 6 }
    case 'plus-8':
      return { kind: 'add', amount: 8 }
    case 'plus-10':
      return { kind: 'add', amount: 10 }
    case 'fois-2':
      return { kind: 'multiply', factor: 2 }
  }
}
