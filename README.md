# SMaze 
**The definitive interactive maze generation and pathfinding engine.**

Welcome to SMaze—a lightning-fast, zero-dependency engine that transforms complex search algorithms into a stunning, interactive visual experience. Whether you are an educator demonstrating graph theory, a developer benchmarking pathfinding performance, or a gamer looking to conquer massive 3D labyrinths, SMaze delivers unparalleled speed and precision.

Experience the beauty of algorithms seamlessly rendered in 2D and 3D. 

---

## Why SMaze?

### 🌌 Infinite Dimensions: 2D & 3D Spatial Rendering
Break free from the grid. SMaze generates classic planar mazes as well as immersive 3D volumetric spaces using Three.js. Scale your environments dynamically without dropping a single frame.

### ⚡ Engineered for Blistering Performance
Under the hood, SMaze runs on a shared flat-index `Uint8Array` architecture. By maintaining a memory footprint of just ~1 byte per cell, SMaze effortlessly powers massive labyrinths containing tens of thousands of nodes while avoiding browser memory constraints.

### 🏎️ The Algorithm Racing Engine
Visualize and evaluate logic in real-time. Watch algorithms crawl the grid step-by-step, emitting a cool-to-warm thermal heatmap that visualizes chronological search priority. 
- **Compare Mode**: Race Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's, and A* simultaneously.
- Validate performance through side-by-side matrices comparing path length, node evaluation limits, and execution speed.

### 📊 Live Telemetry & Analytics
Monitor your computational complexity on the fly. Active heads-up statistics provide real-time updates for:
- Execution Time & Nodes Explored
- Frontier Queuing Sizes
- Active Path Length & Overall Maze Completion
- Manual User Moves

### 🎮 Fully Playable & Accessible
SMaze isn't just an observation deck—it's a game. Challenge the algorithms by manually navigating the mazes on any device. 
- **Cross-Platform Input**: Seamlessly supports `WASD`, Arrow keys, touch-swipes, and on-screen D-Pads.
- **Accessibility First**: Full keyboard operability, ARIA-live regions for dynamic telemetry, visible focus states, and respect for `prefers-reduced-motion` settings.
- **Shareable States**: Bookmark and share your exact scenario. Generator strategy, dimensions, and randomization seeds are continuously synced to your URL hash.

---

## Generation Strategies
SMaze includes three distinct architectural generation algorithms, each yielding unique topographic flavors:
- **Kruskal's (Union-Find):** Highly balanced networks with interwoven routing.
- **Recursive Backtracker:** Deep, winding corridors with distinct dead-ends.
- **Prim's Algorithm:** Dense, bushy topologies loaded with intense branching.

All generations are powered by a **Mulberry32 PRNG**, making every maze 100% reproducible via its distinct seed.

---

## Get Started in Seconds
SMaze requires **zero build steps** and **no heavy frameworks**. Simply open `index.html` to launch the platform locally.

For development, hot-reloading, or extension:
```bash
# Install lightweight dev tooling (ESLint, Prettier, Live-Server)
npm install

# Boot the local hot-reload environment
npm run dev
```

## Extensibility & Tooling
Engineered with clean code practices in mind, SMaze includes built-in linting and formatting workflows, making it ready for integration into your next big project.

```bash
npm run lint       # Audit codebase
npm run lint:fix   # Auto-resolve lint errors
npm run format     # Prettier formatting
```

## Licensing
SMaze is proudly open-source and free to use under the **MIT License**. See [LICENSE](LICENSE) for details.

---
**SMaze** — Elevating the standard for algorithmic visualization.
