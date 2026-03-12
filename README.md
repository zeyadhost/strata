# Strata

A browser-based multiplayer mining game. Built with Phaser 3 + Socket.io for the Hack Club Ember game jam.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (client) and the Node server concurrently.

| Service | URL |
|---------|-----|
| Client  | http://localhost:5173 |
| Server  | http://localhost:3000 |

## Build

```bash
npm run build
```

Output goes to `client/dist/` — this is what gets uploaded to itch.io.

## Art Credits

Ores, tiles, gems, player, shop, and NPC art by [CoolGirlArts](https://coolgirlarts.wixsite.com/coolgirlarts-website).

Cursor art from [ASpecsGaming cursor hands](https://aspecsgaming.itch.io/cursor-hands).

Settings icons from [Crusenho Icons Essential Pack](https://crusenho.itch.io/icons-essential-pack-free-icons).

## Project Structure

```
strata/
├── client/         # Phaser 3 frontend (Vite + TypeScript)
│   └── src/
└── server/         # Socket.io backend (Node.js + TypeScript)
    └── src/
```
