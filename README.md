# Diogenes: Barrel Rolling

A small web-based game where you play **Diogenes of Sinope**, rolling around Athens in his barrel, barking at hypocrites, sunbathing, and lightly jostling passersby – with a simple backend to store high scores.

## Stack

- **Backend**: Node.js + Express, serves the game and exposes a small JSON score API.
- **Frontend**: HTML5 canvas, modern glassmorphism UI with vanilla JavaScript.

## Getting started

From the project root:

```bash
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

## Controls & Mechanics

- **Move**: `←` / `→` or `A` / `D`
- **Bark**: `Space`
  - Sends out a circular bark wave that **scares away nearby NPCs** for points.
- **Sunbathe**: `S`
  - Diogenes lies down to enjoy the sun; **time slows briefly**, making it easier to maneuver.
- **Jostle**: `W`
  - A quick barrel jostle; bumping into NPCs while jostling yields **bonus points and combo**.

Your **score** increases by:

- Scaring NPCs away with bark.
- Jostling into them at the right time.
- Staying alive and chaining actions (combos increase value).

Clumsy collisions when you are not jostling or barking will **reduce your score** and reset your combo.

The game lasts for **60 seconds**. When time is up:

1. A modal appears where you can enter a short name.
2. Your score is POSTed to the backend and stored in a JSON file under `data/scores.json`.
3. The **leaderboard** shows the top scores (highest first).

## API

The backend exposes two simple endpoints:

- **GET** `/api/scores`
  - Returns an array of up to 10 top scores:
  - Each item: `{ name, score, mode, createdAt }`
- **POST** `/api/scores`
  - Body: `{ "name": string, "score": number, "mode": string }`
  - Persists the score and echoes the stored entry.

Data is stored in `data/scores.json` (created automatically if missing).

## Notes

- This is intentionally lightweight: no database, just a simple JSON file for scores.
- You can safely delete `data/scores.json` to clear the leaderboard; it will be recreated.

