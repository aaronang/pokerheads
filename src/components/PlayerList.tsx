import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Player } from '@/lib/types'

interface Props {
  players: Player[]
  onAdd: (name: string) => void
  onRename: (playerId: string, name: string) => void
  onRemove: (playerId: string) => void
  canRemove: (playerId: string) => boolean
}

export function PlayerList({ players, onAdd, onRename, onRemove, canRemove }: Props) {
  const [newName, setNewName] = useState('')

  function add() {
    const name = newName.trim()
    if (!name) return
    onAdd(name)
    setNewName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Input
              value={p.name}
              onChange={(e) => onRename(p.id, e.target.value)}
              aria-label="Player name"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(p.id)}
              disabled={!canRemove(p.id)}
              title={canRemove(p.id) ? 'Remove player' : 'Player has chips in a game'}
            >
              ✕
            </Button>
          </div>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Input
            placeholder="Add player…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!newName.trim()}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
