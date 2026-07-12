# Pokerheads

Minimal settlement calculator for low-stakes home poker. No money moves during play — chips are IOUs. At the end of the night the app tells everyone exactly who pays whom.

## How it works

1. Add your players once.
2. For each game, set the unit value (e.g. `0.5¢` = half a cent per chip) and enter each player's buy-in and final stack in chips. Different games can have different unit values.
3. The settlement section shows each player's total net in dollars and a minimal list of transfers ("Ben pays Me $2.00").

A game only counts once its chips balance (total final stacks = total buy-ins); unbalanced games are flagged. Everything is stored in the browser (localStorage) — no accounts, no backend.

## Development

```sh
npm install
npm run dev      # dev server
npm test         # settlement math tests (vitest)
npm run build    # typecheck + production build
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui. Money math is done in integer milli-dollars (`5` = $0.005) so half-cent stakes settle exactly — see [src/lib/settle.ts](src/lib/settle.ts).
