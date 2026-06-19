 # CricLocal

A mobile-friendly cricket scoring app with a scorer controller, public live scoreboard, transparent stream overlay, and tournament dashboard.

## Setup

1. Free a little disk space if npm reports `ENOSPC`.
2. Install packages:

   ```bash
   npm install --cache /private/tmp/cricket-overlay-npm-cache
   ```

3. Copy `.env.local.example` to `.env.local` and paste the Firebase web app values.
4. Start the app:

   ```bash
   npm run dev
   ```

## Main Routes

- `/dashboard` creates and lists matches.
- `/match/demo/score` opens a local demo scorer.
- `/match/demo/live` opens a demo public scoreboard.
- `/match/demo/overlay` opens a transparent OBS/vMix overlay.
- `/match/[matchId]/score` scores a live Firebase-backed match.
- `/match/[matchId]/live` shows the spectator scoreboard.
- `/match/[matchId]/overlay` is the browser-source overlay.
