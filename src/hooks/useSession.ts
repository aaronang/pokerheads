import { useEffect, useState } from 'react'
import type { Player, Round, Session } from '@/lib/types'

const STORAGE_KEY = 'pokerheads-session-v1'
const DEFAULT_UNIT_MILLI = 10 // 1 cent

const emptySession: Session = { players: [], rounds: [] }

function load(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySession
    return JSON.parse(raw) as Session
  } catch {
    return emptySession
  }
}

export function useSession() {
  const [session, setSession] = useState<Session>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  function addPlayer(name: string) {
    const player: Player = { id: crypto.randomUUID(), name }
    setSession((s) => ({
      players: [...s.players, player],
      rounds: s.rounds.map((r) => ({
        ...r,
        entries: [...r.entries, { playerId: player.id, buyIn: null, finalStack: null }],
      })),
    }))
  }

  function renamePlayer(playerId: string, name: string) {
    setSession((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
    }))
  }

  /** A player can only be removed while they have no chip data in any game. */
  function canRemovePlayer(playerId: string): boolean {
    return session.rounds.every((r) =>
      r.entries.every(
        (e) => e.playerId !== playerId || (e.buyIn === null && e.finalStack === null),
      ),
    )
  }

  function removePlayer(playerId: string) {
    if (!canRemovePlayer(playerId)) return
    setSession((s) => ({
      players: s.players.filter((p) => p.id !== playerId),
      rounds: s.rounds.map((r) => ({
        ...r,
        entries: r.entries.filter((e) => e.playerId !== playerId),
      })),
    }))
  }

  function addRound() {
    setSession((s) => {
      const unitValueMilli = s.rounds.at(-1)?.unitValueMilli ?? DEFAULT_UNIT_MILLI
      const roundEntry: Round = {
        id: crypto.randomUUID(),
        unitValueMilli,
        entries: s.players.map((p) => ({ playerId: p.id, buyIn: null, finalStack: null })),
      }
      return { ...s, rounds: [...s.rounds, roundEntry] }
    })
  }

  function updateRound(roundId: string, patch: Partial<Omit<Round, 'id'>>) {
    setSession((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.id === roundId ? { ...r, ...patch } : r)),
    }))
  }

  function updateEntry(
    roundId: string,
    playerId: string,
    patch: Partial<{ buyIn: number | null; finalStack: number | null }>,
  ) {
    setSession((s) => ({
      ...s,
      rounds: s.rounds.map((r) =>
        r.id === roundId
          ? {
              ...r,
              entries: r.entries.map((e) => (e.playerId === playerId ? { ...e, ...patch } : e)),
            }
          : r,
      ),
    }))
  }

  function deleteRound(roundId: string) {
    setSession((s) => ({ ...s, rounds: s.rounds.filter((r) => r.id !== roundId) }))
  }

  function newSession() {
    setSession(emptySession)
  }

  return {
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
  }
}
