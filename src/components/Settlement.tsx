import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  computeTransfers,
  formatMoney,
  roundIsBalanced,
  roundNetsToCents,
  sessionNetsMilli,
} from '@/lib/settle'
import type { Session } from '@/lib/types'

export function Settlement({ session }: { session: Session }) {
  if (session.rounds.length === 0) return null

  const pending = session.rounds.filter((r) => !roundIsBalanced(r)).length
  if (pending > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Waiting for {pending} {pending === 1 ? 'game' : 'games'} to be filled in and balanced.
        </CardContent>
      </Card>
    )
  }

  const nets = roundNetsToCents(sessionNetsMilli(session))
  const transfers = computeTransfers(nets)
  const playerName = new Map(session.players.map((p) => [p.id, p.name]))
  const sorted = [...session.players].sort(
    (a, b) => (nets.get(b.id) ?? 0) - (nets.get(a.id) ?? 0),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {sorted.map((p) => {
            const net = nets.get(p.id) ?? 0
            return (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span
                  className={
                    'font-mono text-sm tabular-nums ' +
                    (net === 0 ? 'text-muted-foreground' : net > 0 ? 'text-positive' : 'text-destructive')
                  }
                >
                  {net > 0 ? '+' : ''}
                  {formatMoney(net)}
                </span>
              </div>
            )
          })}
        </div>
        <Separator />
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">Everyone is even — nothing to pay.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{playerName.get(t.fromId) ?? '?'}</span>
                  <span className="text-muted-foreground"> pays </span>
                  <span className="font-medium">{playerName.get(t.toId) ?? '?'}</span>
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">{formatMoney(t.milli)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
