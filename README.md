# Sudoku CSP Solver & Player

A full-featured Sudoku game built with **Next.js**, deployable to **Vercel** in minutes.

## Features

- 🎮 **Play mode** — click a cell, type 1–9; wrong entries shown in **red**, correct in blue
- ⏱ **Live timer** — starts on first keypress, stops on completion
- 🏆 **Best times** — stored in localStorage per puzzle, shown in header
- 💡 **Hint system** — reveals one correct cell (amber)
- ▶ **Auto-solve** — via AC-3 or Backtracking algorithm with timing
- ❌ **Mistake counter** — tracks every wrong digit entered
- 🎉 **Completion modal** — shows time, best, mistakes, and ⭐ new best celebration
- 📱 **Responsive** — works on mobile

## Algorithms

| Algorithm | Description |
|---|---|
| **AC-3** | Arc Consistency 3 — propagates constraints, falls back to MAC (Backtracking + AC-3) for hard puzzles |
| **Backtracking** | Pure recursive backtracking with forward checking |

## Puzzles

- **3 difficulty levels**: Easy, Medium, Hard
- **4 puzzles per level** (12 total)

---

## Deploy to Vercel (3 steps)

### Option A — GitHub + Vercel (recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel auto-detects Next.js — click **Deploy**

### Option B — Vercel CLI

```bash
npm install -g vercel
cd sudoku-vercel
vercel
```

---

## Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Project structure

```
sudoku-vercel/
├── pages/
│   ├── _app.js          # App wrapper
│   ├── _document.js     # HTML head
│   └── index.js         # Main game page (all UI + game logic)
├── lib/
│   └── solver.js        # AC-3 + Backtracking CSP algorithms
├── data/
│   └── puzzles.js       # All 12 puzzle grids
├── styles/
│   └── globals.css      # Base reset
├── public/              # Static assets
├── next.config.js
├── vercel.json
└── package.json
```
