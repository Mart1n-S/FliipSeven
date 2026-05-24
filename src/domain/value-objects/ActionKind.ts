export type ActionKind = 'freeze' | 'flip-three' | 'second-chance'

export const ACTION_KINDS: readonly ActionKind[] = [
  'freeze',
  'flip-three',
  'second-chance',
] as const
