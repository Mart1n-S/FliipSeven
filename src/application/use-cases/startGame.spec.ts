import { describe, expect, it } from 'vitest'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { startGame } from '@/application/use-cases/startGame'

class ZeroRandom implements RandomProvider {
  nextInt(maxExclusive: number): number {
    return 0 % maxExclusive
  }
}

describe('startGame use case', () => {
  it('returns a game in `in-round` with a fresh round set up', () => {
    const game = startGame({ random: new ZeroRandom() }, { pseudos: ['Alice', 'Bob'] })

    expect(game.phase).toBe('in-round')
    expect(game.roundNumber).toBe(1)
    expect(game.round).not.toBeNull()
    expect(game.round?.playerStates).toHaveLength(2)
    expect(game.round?.playerStates.every((s) => s.status === 'active')).toBe(true)
  })

  it('shuffles the full 94-card deck before starting', () => {
    const game = startGame({ random: new ZeroRandom() }, { pseudos: ['Alice', 'Bob'] })

    expect(game.deck).toHaveLength(94)
    expect(game.discard).toEqual([])
  })

  it('rejects invalid pseudos (delegates to createGame validation)', () => {
    expect(() => startGame({ random: new ZeroRandom() }, { pseudos: ['solo'] })).toThrow(/between/)
    expect(() => startGame({ random: new ZeroRandom() }, { pseudos: ['Alice', 'alice'] })).toThrow(
      /Duplicate/,
    )
  })

  it('places the first turn at the seat left of the dealer (seat 1 by default)', () => {
    const game = startGame({ random: new ZeroRandom() }, { pseudos: ['Alice', 'Bob', 'Charlie'] })

    // Dealer defaults to index 0 -> first player to act is index 1.
    expect(game.round?.activePlayerIndex).toBe(1)
  })
})
