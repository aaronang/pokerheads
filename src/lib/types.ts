export interface Player {
  id: string
  name: string
}

/** Chip counts in units for one player in one game. null = not entered yet. */
export interface RoundEntry {
  playerId: string
  buyIn: number | null
  finalStack: number | null
}

/** One full poker game with its own unit value. */
export interface Round {
  id: string
  /** Value of one unit in milli-dollars (integer). 5 = $0.005 (half a cent). */
  unitValueMilli: number
  entries: RoundEntry[]
}

export interface Session {
  players: Player[]
  rounds: Round[]
}
