import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  dollarsToMilli,
  entryNetUnits,
  formatMoney,
  milliToDollars,
  roundIsBalanced,
  roundIsComplete,
} from '@/lib/settle'
import type { Player, Round } from '@/lib/types'

interface Props {
  round: Round
  index: number
  players: Player[]
  onUpdateUnitValue: (milli: number) => void
  onUpdateEntry: (playerId: string, patch: { buyIn?: number | null; finalStack?: number | null }) => void
  onDelete: () => void
}

function parseUnits(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : null
}

export function RoundCard({ round, index, players, onUpdateUnitValue, onUpdateEntry, onDelete }: Props) {
  const complete = roundIsComplete(round)
  const balanced = roundIsBalanced(round)
  const playerName = new Map(players.map((p) => [p.id, p.name]))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Game {index + 1}</CardTitle>
          <div className="flex items-center gap-2">
            {complete && !balanced && <Badge variant="destructive">Chips don't add up</Badge>}
            {!complete && <Badge variant="secondary">In progress</Badge>}
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete game">
              ✕
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor={`unit-${round.id}`} className="text-muted-foreground whitespace-nowrap">
            1 unit =
          </Label>
          <span className="text-muted-foreground">$</span>
          <Input
            id={`unit-${round.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.001}
            className="w-24 font-mono text-sm"
            value={milliToDollars(round.unitValueMilli)}
            onChange={(e) => {
              const dollars = Number(e.target.value)
              if (Number.isFinite(dollars) && dollars >= 0) onUpdateUnitValue(dollarsToMilli(dollars))
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Buy-in</TableHead>
              <TableHead className="text-center">Final</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {round.entries.map((entry) => {
              const net = entryNetUnits(entry)
              return (
                <TableRow key={entry.playerId}>
                  <TableCell className="max-w-24 truncate font-medium">
                    {playerName.get(entry.playerId) ?? '?'}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="mx-auto w-16 text-right font-mono text-sm"
                      value={entry.buyIn ?? ''}
                      onChange={(e) => onUpdateEntry(entry.playerId, { buyIn: parseUnits(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="mx-auto w-16 text-right font-mono text-sm"
                      value={entry.finalStack ?? ''}
                      onChange={(e) =>
                        onUpdateEntry(entry.playerId, { finalStack: parseUnits(e.target.value) })
                      }
                    />
                  </TableCell>
                  <TableCell
                    className={
                      'text-right font-mono tabular-nums ' +
                      (net === null || net === 0
                        ? 'text-muted-foreground'
                        : net > 0
                          ? 'text-positive'
                          : 'text-destructive')
                    }
                  >
                    {net === null ? '—' : formatMoney(net * round.unitValueMilli)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
