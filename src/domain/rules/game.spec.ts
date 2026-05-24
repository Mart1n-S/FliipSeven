import { describe, expect, it } from 'vitest'
import type { GameState } from '@/domain/entities/GameState'
import {
  createGame,
  getStandings,
  getWinner,
  isGameOver,
  MAX_PLAYERS,
  MIN_PLAYERS,
  WIN_THRESHOLD,
} from '@/domain/rules/game'

describe('createGame', () => {
  it('builds a fresh game in `setup` with the right defaults', () => {
    const game = createGame(['Alice', 'Bob'], [])

    expect(game.players).toHaveLength(2)
    expect(game.players.map((p) => p.pseudo)).toEqual(['Alice', 'Bob'])
    expect(game.players.every((p) => p.totalScore === 0)).toBe(true)
    expect(game.dealerIndex).toBe(0)
    expect(game.deck).toEqual([])
    expect(game.discard).toEqual([])
    expect(game.round).toBeNull()
    expect(game.phase).toBe('setup')
    expect(game.roundNumber).toBe(0)
  })

  it('trims pseudos', () => {
    const game = createGame(['  Alice  ', 'Bob '], [])
    expect(game.players.map((p) => p.pseudo)).toEqual(['Alice', 'Bob'])
  })

  it('rejects fewer than MIN_PLAYERS players', () => {
    expect(() => createGame(['solo'], [])).toThrow(/between/)
  })

  it('rejects more than MAX_PLAYERS players', () => {
    const tooMany = Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => `P${i}`)
    expect(() => createGame(tooMany, [])).toThrow(/between/)
  })

  it('rejects empty pseudos (after trim)', () => {
    expect(() => createGame(['Alice', '   '], [])).toThrow(/empty/)
  })

  it('rejects duplicate pseudos (case-insensitive)', () => {
    expect(() => createGame(['Alice', 'alice'], [])).toThrow(/Duplicate/)
  })

  it('accepts exactly MIN_PLAYERS and MAX_PLAYERS', () => {
    const min = Array.from({ length: MIN_PLAYERS }, (_, i) => `P${i}`)
    const max = Array.from({ length: MAX_PLAYERS }, (_, i) => `P${i}`)
    expect(() => createGame(min, [])).not.toThrow()
    expect(() => createGame(max, [])).not.toThrow()
  })

  it('assigns distinct ids p1, p2, ... to players', () => {
    const game = createGame(['a', 'b', 'c'], [])
    expect(game.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('isGameOver', () => {
  it('is true only when phase is `finished`', () => {
    const base = createGame(['Alice', 'Bob'], [])
    expect(isGameOver(base)).toBe(false)
    expect(isGameOver({ ...base, phase: 'in-round' })).toBe(false)
    expect(isGameOver({ ...base, phase: 'between-rounds' })).toBe(false)
    expect(isGameOver({ ...base, phase: 'finished' })).toBe(true)
  })
})

describe('getStandings', () => {
  it('sorts players by total score descending', () => {
    const base = createGame(['Alice', 'Bob', 'Charlie'], [])
    const game: GameState = {
      ...base,
      players: [
        { ...base.players[0]!, totalScore: 10 },
        { ...base.players[1]!, totalScore: 50 },
        { ...base.players[2]!, totalScore: 30 },
      ],
    }

    expect(getStandings(game).map((p) => p.pseudo)).toEqual(['Bob', 'Charlie', 'Alice'])
  })

  it('keeps the original (stable) order for ties', () => {
    const base = createGame(['Alice', 'Bob', 'Charlie'], [])
    const game: GameState = {
      ...base,
      players: base.players.map((p) => ({ ...p, totalScore: 50 })),
    }

    expect(getStandings(game).map((p) => p.pseudo)).toEqual(['Alice', 'Bob', 'Charlie'])
  })
})

describe('getWinner', () => {
  it('returns null while the game is not yet finished', () => {
    expect(getWinner(createGame(['Alice', 'Bob'], []))).toBeNull()
  })

  it('returns the highest-scoring player once finished', () => {
    const base = createGame(['Alice', 'Bob'], [])
    const game: GameState = {
      ...base,
      phase: 'finished',
      players: [
        { ...base.players[0]!, totalScore: WIN_THRESHOLD },
        { ...base.players[1]!, totalScore: WIN_THRESHOLD + 30 },
      ],
    }

    expect(getWinner(game)?.pseudo).toBe('Bob')
  })
})
