# SMaze — Interactive Maze Generator & Pathfinding Visualizer

A lightning-fast, highly accessible 2D & 3D maze generator and pathfinding visualizer built on top of **vanilla JavaScript**—requiring no underlying framework or build steps. 

Whether generating a classic flat maze or a complex 3D volume, you can instantly observe how popular search algorithms navigate the topology. SMaze visualizes how algorithms "think" during the search and lets you compare their performance before attempting to conquer the maze yourself.

## ✨ Features

### High-Performance Multi-Dimensional Grid
- **2D & 3D Support**: Generate traditional planar mazes or spatial 3D volumes (rendered via Three.js), scaling seamlessly up to massive sizes.
- **Memory Efficient**: Using a shared flat index `Uint8Array` architecture limits overhead to roughly ~1 byte per cell—allowing you to generate mazes with tens of thousands of cells without encountering browser memory ceiling issues.

### Maze Generation Algorithms
Choose from three algorithmic strategies, each yielding unique topographic textures:
- **Kruskal's** (Union-Find) — Generates highly balanced mazes with many intertwining corridors.
- **Recursive Backtracker** — Creates lengthy, winding passages featuring deep dead-ends.
- **Prim's** — Produces a "bushy" maze with numerous, highly condensed short branches.
- **Reproducible Seeds** — Powered by a Mulberry32 PRNG, every generated maze can be reliably reproduced and shared via URL parameters.

### Pathfinding Visualization
- **Live Algorithm Races**: Watch Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's Algorithm, and A* Pathfinding crawl the grid step-by-step.
- **Exploration Heatmap**: Analyzed cells emit a cool→warm color gradient matching their chronological search order, clearly separating algorithmic strategies visually.
- **Animated Solution Path**: Winning paths are presented with an advancing glowing trail highlight.
- **Compare Mode**: Sequentially race all 4 algorithms on the active seed to generate a tabular comparison of path length, nodes evaluated, and execution time.

### Real-Time Instrumentation
Heads-up statistics accurately chart variables in real-time, matching standard computational complexity metrics: execution time, nodes explored, frontier queuing sizes, active path length, overall maze percentage explored, and manual moves. 

### Fully Playable
- **Input Flexibility**: Use `WASD` / Arrow keys on desktop, or swipe / on-screen D-Pad for mobile interactivity.
- Play against the clock and view an end-of-game overlay analyzing your completion time and efficiency.

### Accessibility & Quality of Life
- **Responsive Layout**: Adjusts UI naturally to accommodate desktop and mobile layouts.
- **A11y Compliant**: Full keyboard operability, explicit visual focus rings, `aria-live` region integrations for dynamic statistics, and respect for `prefers-reduced-motion` queries.
- **High-DPI Optimized**: Supports retina/4K display rendering flawlessly on `<canvas>`.
- **Bookmarkable States**: The current generator, solver, seed, dimension, and size configurations are automatically synced to the browser URL hash for frictionless sharing.

---

## 🚀 Quick Start

No build step is required! You can securely launch it by simply opening `index.html` in your web browser. 

For local development and live-reloads:

```bash
# Install development tooling (ESLint, Prettier, Live-Server)
npm install

# Start a local dev server with hot-reload via live-server
npm run dev

# Alternatively, serve statically
npm run serve
```

## ⌨️ Controls

| Action | Input / Keys |
| :--- | :--- |
| **Move (Play)** | `W` `A` `S` `D` / Arrows / Swipe / On-screen D-pad |
| **Solve / Stop** | `Space` |
| **Generate New Maze** | `N` |
| **Reset Maze** | `R` |
| **Compare Mode** | `C` |
| **Stop / Close Overlay** | `Esc` |

## 🏗️ Project Architecture

```text
smaze/
├── index.html                   # DOM scaffolding and script orchestration
├── src/
│   ├── css/
│   │   └── styles.css           # Responsive styling overrides (dark theme)
│   └── js/
│       ├── utils.js             # General helpers, Toasting, Mulberry32 PRNG
│       ├── grid.js              # High-performance 1D Uint8Array abstraction
│       ├── data-structures.js   # BinaryHeap, UnionFind standard libraries
│       ├── maze-generator.js    # Kruskal / Backtracker / Prim implementations
│       ├── pathfinding-algorithms.js # Search algorithm logic (BFS/DFS/Dijkstra/A*)
│       ├── renderer-2d.js       # HTML5 Canvas 2D render logic
│       ├── renderer-3d.js       # Three.js 3D spatial render logic
│       ├── game.js              # Core `requestAnimationFrame` loop + stats pipeline
│       └── app.js               # Event bindings, routing logic, config handling
├── package.json
└── README.md
```

*Note: Core runtime scripts operate with a strict implicit dependency hierarchy, establishing robust fundamentals before attaching renderer and application logics.*

## 📊 Standard Algorithm Matrix

| Algorithm | Guarantees Shortest Path? | Strategy | Visual Signature |
| :--- | :---: | :--- | :--- |
| **Breadth-First Search (BFS)** | ✅ | Uniform distance exploration | Radiating wavefront |
| **Depth-First Search (DFS)** | ❌ | Dive unconditionally, then backtrack | Long continuous tendrils |
| **Dijkstra's Algorithm** | ✅ | Uniform-cost bounding (via Min-Heap) | Even/Steady chronological spread |
| **A\*** | ✅ | Guided by specific heuristic (Manhattan) | Rapid steering toward the objective |

*Note: Given the unit-weight uniformity of maze graph distances, BFS, Dijkstra, and A\* consistently find the shortest mathematical path. A\* achieves this with substantially fewer node explorations.*

## 🛠️ Development Tools

SMaze includes linting and formatting tooling ensuring clear code quality during forks or extensions.

```bash
# Report ESLint issues
npm run lint

# Auto-fix linting issues 
npm run lint:fix

# Format codebase using Prettier
npm run format
```

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for detailed information.

---
**SMaze** — Making algorithms beautiful, visual, and brilliantly interactive. 🎯
