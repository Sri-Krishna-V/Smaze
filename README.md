# SMaze — Interactive Maze Generator & Pathfinding Visualizer

A fast, accessible maze generator and pathfinding visualizer built with
**vanilla JavaScript** — no framework, no build step. Open `index.html` and go.
Generate mazes with three different algorithms, watch BFS / DFS / Dijkstra / A\*
explore them on a live heatmap, compare their performance, and play manually on
desktop or mobile.

## ✨ Features

### Maze generation

- **Three algorithms**, each with a distinct texture:
  - **Kruskal's** (union-find) — balanced, many corridors
  - **Recursive Backtracker** — long, winding passages
  - **Prim's** — bushy, many short branches
- **Reproducible seeds** — every maze has a seed you can share or re-enter.
- **Sizes** from 11×11 to 99×99, generated instantly via union-find.

### Pathfinding visualization

- **BFS, DFS, Dijkstra's, and A\***, animated step-by-step.
- **Exploration heatmap** — visited cells are colored on a cool→warm gradient by
  search order, so each algorithm's strategy is visible at a glance.
- **Animated solution reveal** with a glow trail.
- **Adjustable animation speed** (smooth, `requestAnimationFrame`-driven).
- **Compare mode** — run all four algorithms on the current maze and see a table
  of path length, nodes explored, and run time.

### Live stats

Time, nodes explored, frontier size, path length, % of maze explored, and your
manual move count — all updated in real time.

### Play it yourself

- **WASD / arrow keys**, **swipe**, or an **on-screen D-pad** on touch devices.
- Win overlay with your time and move count.

### Quality

- **High-DPI canvas** — crisp on retina/4K displays.
- **Responsive** layout that stacks cleanly on phones.
- **Accessible** — keyboard operable, `aria-live` stats/toasts, visible focus,
  and `prefers-reduced-motion` support.
- **Shareable URL** — size, generator, seed, and algorithm are encoded in the
  URL hash, so any maze can be bookmarked or sent to a friend.

## 🚀 Quick start

No build step required — just open `index.html` in a browser. For live reload
during development:

```bash
npm install      # dev tooling only (eslint, prettier, live-server)
npm run dev       # start a dev server with live reload
# or
npm run serve     # serve the static files
```

## ⌨️ Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` / arrows / swipe / D-pad |
| Solve / Stop | `Space` |
| New maze | `N` |
| Reset | `R` |
| Compare all | `C` |
| Stop / close overlay | `Esc` |

## 🏗️ Project structure

```text
smaze/
├── index.html                  # Markup + script load order
├── src/
│   ├── css/
│   │   └── styles.css          # Full stylesheet (dark theme)
│   └── js/
│       ├── utils.js            # Helpers + seeded RNG (mulberry32) + toasts
│       ├── data-structures.js  # BinaryHeap, UnionFind
│       ├── maze-generator.js   # Kruskal / Backtracker / Prim strategies
│       ├── pathfinding-algorithms.js  # BFS / DFS / Dijkstra / A*
│       ├── game.js             # Canvas rendering, rAF solve loop, stats
│       └── app.js              # UI wiring, keyboard/touch, URL state
├── package.json
└── README.md
```

Scripts load in dependency order:
`utils.js → data-structures.js → maze-generator.js →
pathfinding-algorithms.js → game.js → app.js`.

## 📊 Algorithm notes

| Algorithm | Shortest path? | Strategy | Visual pattern |
| --- | --- | --- | --- |
| **BFS** | ✅ | Explore by distance | Expands as a wavefront |
| **DFS** | ❌ | Dive deep, then backtrack | Long tendrils |
| **Dijkstra's** | ✅ | Uniform-cost via min-heap | Even wavefront |
| **A\*** | ✅ | Heuristic-guided (Manhattan) | Steers toward the goal |

On a unit-weight maze, BFS, Dijkstra's, and A\* all return a shortest path;
A\* typically explores the fewest nodes. Use **Compare all** to see it.

## 🛠️ Development

```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint with autofix
npm run format      # Prettier
```

## 📄 License

MIT — see [LICENSE](LICENSE).

---

**SMaze** — making pathfinding algorithms visual and interactive. 🎯
