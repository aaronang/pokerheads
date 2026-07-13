import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { PlayerList } from '@/components/PlayerList'
import { RoundCard } from '@/components/RoundCard'
import { Settlement } from '@/components/Settlement'
import { useSession } from '@/hooks/useSession'
import { useTheme } from '@/hooks/useTheme'

export default function App() {
  const {
    session,
    addPlayer,
    renamePlayer,
    canRemovePlayer,
    removePlayer,
    addRound,
    updateRound,
    updateEntry,
    deleteRound,
    newSession,
  } = useSession()
  const { isDark, toggle: toggleTheme } = useTheme()

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Pokerheads</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={toggleTheme} title="Toggle theme">
            {isDark ? <Sun /> : <Moon />}
          </Button>
          <Dialog>
            <DialogTrigger render={<Button variant="secondary" />}>
              New session
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a new session?</DialogTitle>
                <DialogDescription>
                  This deletes all players, games and results. There is no undo.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <DialogClose render={<Button variant="destructive" onClick={newSession} />}>
                  Delete everything
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <PlayerList
        players={session.players}
        onAdd={addPlayer}
        onRename={renamePlayer}
        onRemove={removePlayer}
        canRemove={canRemovePlayer}
      />

      {session.rounds.map((round, i) => (
        <RoundCard
          key={round.id}
          round={round}
          index={i}
          players={session.players}
          onUpdateUnitValue={(milli) => updateRound(round.id, { unitValueMilli: milli })}
          onUpdateEntry={(playerId, patch) => updateEntry(round.id, playerId, patch)}
          onDelete={() => deleteRound(round.id)}
        />
      ))}

      {session.players.length >= 2 ? (
        <Button className="w-full" variant="secondary" onClick={addRound}>
          + Add game
        </Button>
      ) : (
        <p className="text-muted-foreground text-center text-sm">
          Add at least two players to start a game.
        </p>
      )}

      <Settlement session={session} />
    </div>
  )
}
