import { describe, expect, it } from 'vitest'
import {
  computeTransfers,
  entryNetUnits,
  formatMoney,
  roundIsBalanced,
  roundNetsMilli,
  roundNetsToCents,
  sessionNetsMilli,
} from './settle'
import type { Round, Session } from './types'

function round(unitValueMilli: number, entries: [string, number, number][]): Round {
  return {
    id: crypto.randomUUID(),
    unitValueMilli,
    entries: entries.map(([playerId, buyIn, finalStack]) => ({ playerId, buyIn, finalStack })),
  }
}

describe('entryNetUnits', () => {
  it('computes final minus buy-in', () => {
    expect(entryNetUnits({ playerId: 'a', buyIn: 100, finalStack: 250 })).toBe(150)
  })
  it('returns null when incomplete', () => {
    expect(entryNetUnits({ playerId: 'a', buyIn: 100, finalStack: null })).toBeNull()
    expect(entryNetUnits({ playerId: 'a', buyIn: null, finalStack: 250 })).toBeNull()
  })
})

describe('roundIsBalanced', () => {
  it('accepts when stacks equal buy-ins', () => {
    expect(roundIsBalanced(round(5, [['a', 100, 0], ['b', 100, 200]]))).toBe(true)
  })
  it('rejects mismatched totals', () => {
    expect(roundIsBalanced(round(5, [['a', 100, 0], ['b', 100, 150]]))).toBe(false)
  })
  it('rejects incomplete rounds', () => {
    const r = round(5, [['a', 100, 0]])
    r.entries.push({ playerId: 'b', buyIn: 100, finalStack: null })
    expect(roundIsBalanced(r)).toBe(false)
  })
})

describe('roundNetsMilli', () => {
  it('converts unit nets to milli-dollars', () => {
    const nets = roundNetsMilli(round(5, [['a', 100, 0], ['b', 100, 200]]))
    expect(nets.get('a')).toBe(-500) // lost 100 units at half a cent = -$0.50
    expect(nets.get('b')).toBe(500)
  })
})

describe('computeTransfers', () => {
  it('settles exactly with at most n-1 transfers', () => {
    const nets = new Map([
      ['a', -500],
      ['b', 300],
      ['c', -100],
      ['d', 300],
    ])
    const transfers = computeTransfers(nets)
    expect(transfers.length).toBeLessThanOrEqual(3)
    // every player's balance is fully settled
    const paid = new Map<string, number>()
    for (const t of transfers) {
      paid.set(t.fromId, (paid.get(t.fromId) ?? 0) - t.milli)
      paid.set(t.toId, (paid.get(t.toId) ?? 0) + t.milli)
      expect(t.milli).toBeGreaterThan(0)
    }
    for (const [id, net] of nets) expect(paid.get(id) ?? 0).toBe(net)
  })

  it('returns nothing when everyone is even', () => {
    expect(computeTransfers(new Map([['a', 0], ['b', 0]]))).toEqual([])
  })

  it('finds exact subset matches greedy would miss', () => {
    // greedy (largest vs largest) needs 4 payments here; the true minimum is 3:
    // a pays c(2) and d(3), b pays e(3).
    const nets = new Map([
      ['a', -5],
      ['b', -3],
      ['c', 2],
      ['d', 3],
      ['e', 3],
    ])
    const transfers = computeTransfers(nets)
    expect(transfers.length).toBe(3)
    const paid = new Map<string, number>()
    for (const t of transfers) {
      paid.set(t.fromId, (paid.get(t.fromId) ?? 0) - t.milli)
      paid.set(t.toId, (paid.get(t.toId) ?? 0) + t.milli)
    }
    for (const [id, net] of nets) expect(paid.get(id) ?? 0).toBe(net)
  })
})

describe('user scenario: 6 players, 2 games at half a cent', () => {
  // Game 1: everyone buys in 200 units, one player wins it all.
  // Game 2: everyone buys in 200 units, a different player wins it all.
  const players = ['me', 'p2', 'p3', 'p4', 'p5', 'winner1']
  const session: Session = {
    players: players.map((id) => ({ id, name: id })),
    rounds: [
      round(5, [
        ['me', 200, 0], ['p2', 200, 0], ['p3', 200, 0],
        ['p4', 200, 0], ['p5', 200, 0], ['winner1', 200, 1200],
      ]),
      round(5, [
        ['me', 200, 1200], ['p2', 200, 0], ['p3', 200, 0],
        ['p4', 200, 0], ['p5', 200, 0], ['winner1', 200, 0],
      ]),
    ],
  }

  it('nets sum to zero', () => {
    const nets = sessionNetsMilli(session)
    let sum = 0
    for (const [, m] of nets) sum += m
    expect(sum).toBe(0)
    // won game: +1000 units = +5000 milli; lost game: -200 units = -1000 milli
    expect(nets.get('me')).toBe(5000 - 1000)
    expect(nets.get('winner1')).toBe(5000 - 1000)
    expect(nets.get('p2')).toBe(-2000) // lost 200 units twice = -$2.00
  })

  it('produces at most 5 transfers that settle everything', () => {
    const transfers = computeTransfers(sessionNetsMilli(session))
    expect(transfers.length).toBeLessThanOrEqual(5)
    const paid = new Map<string, number>()
    for (const t of transfers) {
      paid.set(t.fromId, (paid.get(t.fromId) ?? 0) - t.milli)
      paid.set(t.toId, (paid.get(t.toId) ?? 0) + t.milli)
    }
    for (const [id, net] of sessionNetsMilli(session)) {
      expect(paid.get(id) ?? 0).toBe(net)
    }
  })
})

describe('formatMoney', () => {
  it('uses 2 decimals for whole cents', () => {
    expect(formatMoney(1250)).toBe('$1.25')
    expect(formatMoney(0)).toBe('$0.00')
  })
  it('uses 3 decimals for half cents', () => {
    expect(formatMoney(5)).toBe('$0.005')
    expect(formatMoney(-2505)).toBe('-$2.505')
  })
})

describe('roundNetsToCents', () => {
  it('leaves already-whole-cent nets untouched', () => {
    const nets = new Map([
      ['a', 4000],
      ['b', -4000],
    ])
    expect(roundNetsToCents(nets)).toEqual(nets)
  })

  it('rounds half-cent nets to whole cents while summing to zero', () => {
    // 15, -5, -10 milli = $0.015, -$0.005, -$0.01 — none are whole cents.
    const nets = new Map([
      ['a', 15],
      ['b', -5],
      ['c', -10],
    ])
    const rounded = roundNetsToCents(nets)
    let sum = 0
    for (const [, milli] of rounded) {
      expect(Math.abs(milli % 10)).toBe(0) // whole cents only
      sum += milli
    }
    expect(sum).toBe(0)
  })

  it('never changes the total across many half-cent players', () => {
    const nets = new Map([
      ['a', 5],
      ['b', 5],
      ['c', 5],
      ['d', -15],
    ])
    const rounded = roundNetsToCents(nets)
    let sum = 0
    for (const [, milli] of rounded) {
      expect(Math.abs(milli % 10)).toBe(0)
      sum += milli
    }
    expect(sum).toBe(0)
  })
})
