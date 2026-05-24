export type NumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export const NUMBER_VALUES: readonly NumberValue[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const

export function isNumberValue(value: number): value is NumberValue {
  return Number.isInteger(value) && value >= 0 && value <= 12
}
