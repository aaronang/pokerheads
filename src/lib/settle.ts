import type { Round, RoundEntry, Session } from './types'

export interface Transfer {
  fromId: string
  toId: string
  milli: number
}

/** Net chips won/lost in units, or null if the entry is incomplete. */
export function entryNetUnits(entry: RoundEntry): number | null {
  if (entry.buyIn === null || entry.finalStack === null) return null
  return entry.finalStack - entry.buyIn
}

export function roundIsComplete(round: Round): boolean {
  return round.entries.every((e) => e.buyIn !== null && e.finalStack !== null)
}

/** Chips out must equal chips in: total final stacks == total buy-ins. */
export function roundIsBalanced(round: Round): boolean {
  if (!roundIsComplete(round)) return false
  let diff = 0
  for (const e of round.entries) diff += e.finalStack! - e.buyIn!
  return diff === 0
}

/** Per-player net for one game in milli-dollars. Incomplete entries count as 0. */
export function roundNetsMilli(round: Round): Map<string, number> {
  const nets = new Map<string, number>()
  for (const e of round.entries) {
    const units = entryNetUnits(e)
    nets.set(e.playerId, units === null ? 0 : units * round.unitValueMilli)
  }
  return nets
}

/** Per-player net across all games in milli-dollars. */
export function sessionNetsMilli(session: Session): Map<string, number> {
  const totals = new Map<string, number>()
  for (const p of session.players) totals.set(p.id, 0)
  for (const round of session.rounds) {
    for (const [playerId, milli] of roundNetsMilli(round)) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + milli)
    }
  }
  return totals
}

/**
 * Rounds each player's net to the nearest whole cent (real payment
 * providers don't do half-cents), using the largest-remainder method so the
 * rounded amounts still sum to exactly zero — no cent is created or lost,
 * it just lands on whoever was closest to rounding up.
 */
export function roundNetsToCents(nets: Map<string, number>): Map<string, number> {
  const ids = [...nets.keys()]
  const raw = ids.map((id) => nets.get(id) ?? 0)
  const floorsMilli = raw.map((m) => Math.floor(m / 10) * 10)
  const remainders = raw.map((m, i) => m - floorsMilli[i]) // in [0, 10)
  const bumps = -floorsMilli.reduce((a, b) => a + b, 0) / 10

  const order = ids.map((_, i) => i).sort((a, b) => remainders[b] - remainders[a])
  const cents = [...floorsMilli]
  for (let k = 0; k < bumps; k++) cents[order[k]] += 10

  return new Map(ids.map((id, i) => [id, cents[i]]))
}

/**
 * Greedy settlement: repeatedly pay the largest creditor from the largest
 * debtor. Nets must sum to zero; produces at most n-1 transfers, but is not
 * always the true minimum (misses exact subset matches between debtors and
 * creditors).
 */
function computeTransfersGreedy(nets: Map<string, number>): Transfer[] {
  const creditors = [...nets]
    .filter(([, m]) => m > 0)
    .map(([id, m]) => ({ id, remaining: m }))
    .sort((a, b) => b.remaining - a.remaining)
  const debtors = [...nets]
    .filter(([, m]) => m < 0)
    .map(([id, m]) => ({ id, remaining: -m }))
    .sort((a, b) => b.remaining - a.remaining)

  const transfers: Transfer[] = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const amount = Math.min(c.remaining, d.remaining)
    transfers.push({ fromId: d.id, toId: c.id, milli: amount })
    c.remaining -= amount
    d.remaining -= amount
    if (c.remaining === 0) ci++
    if (d.remaining === 0) di++
  }
  return transfers
}

// Above this many non-zero balances, exact search is too slow — fall back
// to the greedy heuristic (still correct, occasionally one payment more).
const MAX_EXACT_SOLVE = 12

/**
 * Minimum-transaction settlement via backtracking with branch-and-bound.
 * At each step, pairs the first remaining non-zero balance against every
 * opposite-signed balance (not just the largest), so it finds exact subset
 * matches the greedy approach misses. Nets must sum to zero.
 */
export function computeTransfers(nets: Map<string, number>): Transfer[] {
  const entries = [...nets].filter(([, m]) => m !== 0)
  if (entries.length === 0) return []
  if (entries.length > MAX_EXACT_SOLVE) return computeTransfersGreedy(nets)

  const ids = entries.map(([id]) => id)
  const balances = entries.map(([, m]) => m)
  let best: Transfer[] | null = null

  function search(path: Transfer[]) {
    if (best && path.length >= best.length) return

    let i = 0
    while (i < balances.length && balances[i] === 0) i++
    if (i === balances.length) {
      best = [...path]
      return
    }

    const remainingNonzero = balances.slice(i).filter((b) => b !== 0).length
    if (best && path.length + (remainingNonzero - 1) >= best.length) return

    for (let j = i + 1; j < balances.length; j++) {
      if (balances[j] === 0 || (balances[i] > 0) === (balances[j] > 0)) continue

      const debtorIdx = balances[i] < 0 ? i : j
      const creditorIdx = debtorIdx === i ? j : i
      const amount = Math.min(-balances[debtorIdx], balances[creditorIdx])

      balances[debtorIdx] += amount
      balances[creditorIdx] -= amount
      path.push({ fromId: ids[debtorIdx], toId: ids[creditorIdx], milli: amount })

      search(path)

      path.pop()
      balances[debtorIdx] -= amount
      balances[creditorIdx] += amount
    }
  }

  search([])
  return best ?? []
}

/** $1.25, $0.005 — third decimal only when the amount needs it. */
export function formatMoney(milli: number): string {
  const sign = milli < 0 ? '-' : ''
  const abs = Math.abs(milli)
  const dollars = abs / 1000
  const decimals = abs % 10 === 0 ? 2 : 3
  return `${sign}$${dollars.toFixed(decimals)}`
}

/** Unit value input is in dollars (0.005 = half a cent) -> milli-dollars. */
export function dollarsToMilli(dollars: number): number {
  return Math.round(dollars * 1000)
}

export function milliToDollars(milli: number): number {
  return milli / 1000
}
