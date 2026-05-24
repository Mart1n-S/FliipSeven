import { describe, expect, it } from 'vitest'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import {
  hasActivePlayers,
  nextActivePlayerIndex,
  shouldEndRound,
  type RoundState,
} from '@/domain/entities/RoundState'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeRound(statuses: readonly PlayerStatus[]): RoundState {
  const playerStates: PlayerRoundState[] = statuses.map((status, index) => ({
    ...createPlayerRoundState(createPlayerId(`p${index + 1}`)),
    status,
  }))
  return { playerStates, activePlayerIndex: 0 }
}

describe('hasActivePlayers', () => {
  it('is true while at least one player is active', () => {
    expect(hasActivePlayers(makeRound(['active', 'busted', 'frozen']))).toBe(true)
  })

  it('is false once everyone is out of the round', () => {
    expect(hasActivePlayers(makeRound(['busted', 'stayed', 'frozen', 'flip7']))).toBe(false)
  })
})

describe('shouldEndRound', () => {
  it('is true as soon as a player reached Flip 7', () => {
    expect(shouldEndRound(makeRound(['active', 'flip7', 'active']))).toBe(true)
  })

  it('is true when no player is active anymore', () => {
    expect(shouldEndRound(makeRound(['stayed', 'busted', 'frozen']))).toBe(true)
  })

  it('is false while at least one player is still active and nobody hit Flip 7', () => {
    expect(shouldEndRound(makeRound(['active', 'stayed', 'busted']))).toBe(false)
  })
})

describe('nextActivePlayerIndex', () => {
  it('returns the next active seat to the right', () => {
    const round = makeRound(['active', 'active', 'active'])
    expect(nextActivePlayerIndex(round, 0)).toBe(1)
  })

  it('wraps around past the last seat', () => {
    const round = makeRound(['active', 'active', 'active'])
    expect(nextActivePlayerIndex(round, 2)).toBe(0)
  })

  it('skips non-active seats', () => {
    const round = makeRound(['active', 'busted', 'frozen', 'active'])
    expect(nextActivePlayerIndex(round, 0)).toBe(3)
  })

  it('skips past `fromIndex` itself even when active', () => {
    const round = makeRound(['active', 'active'])
    expect(nextActivePlayerIndex(round, 0)).toBe(1)
  })

  it('returns fromIndex when they are the only active player left (keep going)', () => {
    const round = makeRound(['active', 'busted', 'frozen'])
    expect(nextActivePlayerIndex(round, 0)).toBe(0)
  })

  it('returns null when no player at all is active', () => {
    const round = makeRound(['stayed', 'busted', 'frozen'])
    expect(nextActivePlayerIndex(round, 0)).toBeNull()
  })

  it('returns null on an empty round', () => {
    const round: RoundState = { playerStates: [], activePlayerIndex: 0 }
    expect(nextActivePlayerIndex(round, 0)).toBeNull()
  })
})
