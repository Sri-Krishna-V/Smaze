'use strict';

/**
 * Headless verification harness for the maze core (no browser/Three.js needed).
 *
 * The browser build relies on cross-file globals (script-tag load order), so we
 * reproduce that here by hoisting each module's exports onto globalThis in
 * dependency order before requiring the next module. Then we generate mazes
 * across dimensions / sizes / algorithms and assert connectivity and path
 * correctness via the index-based solvers.
 *
 * Run: node tests/verify-node.js
 */

const path = require('path');
const SRC = path.join(__dirname, '..', 'src', 'js');

function hoist(mod) {
  Object.assign(globalThis, mod);
  return mod;
}

hoist(require(path.join(SRC, 'utils.js')));
globalThis.Grid = require(path.join(SRC, 'grid.js')).Grid;
hoist(require(path.join(SRC, 'data-structures.js')));
hoist(require(path.join(SRC, 'maze-generator.js')));
hoist(require(path.join(SRC, 'pathfinding-algorithms.js')));

const { MazeGenerator } = globalThis;
const { createAlgorithm } = globalThis;

let failures = 0;
function check(label, cond) {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
}

/** Assert the path is contiguous (each step is an orthogonal neighbor) and runs start→goal. */
function pathIsContiguous(grid, path, start, goal) {
  if (path[0] !== start || path[path.length - 1] !== goal) return false;
  const scratch = [];
  for (let i = 1; i < path.length; i++) {
    const ns = grid.neighbors(path[i - 1], scratch);
    if (!ns.includes(path[i])) return false;
    if (grid.cells[path[i]] !== 0) return false;
  }
  return true;
}

const configs = [
  { dims: 2, size: 25 },
  { dims: 2, size: 201 },
  { dims: 2, size: 999 },
  { dims: 3, size: 21 },
  { dims: 3, size: 41 }
];
const algos = ['kruskal', 'backtracker', 'prim'];
const solvers = ['bfs', 'dfs', 'dijkstra', 'astar'];

for (const cfg of configs) {
  for (const gen of algos) {
    const t0 = Date.now();
    const mg = new MazeGenerator(cfg.size, { dims: cfg.dims, algorithm: gen, seed: 12345 });
    const grid = mg.generate();
    const genMs = Date.now() - t0;
    const start = mg.getStartIndex();
    const goal = mg.getGoalIndex();
    const label = `${cfg.dims}D size=${cfg.size} gen=${gen}`;

    check(`${label}: start passable`, grid.cells[start] === 0);
    check(`${label}: goal passable`, grid.cells[goal] === 0);

    // BFS gives the reference shortest path / connectivity.
    const bfs = createAlgorithm('bfs', grid, start, goal);
    const bfsRes = bfs.runToCompletion();
    check(`${label}: BFS reaches goal (gen ${genMs}ms)`, bfsRes.found);
    check(`${label}: BFS path contiguous`, bfsRes.found && pathIsContiguous(grid, bfsRes.path, start, goal));

    // Every solver should find a path; shortest-path solvers must match BFS length.
    for (const s of solvers) {
      const res = createAlgorithm(s, grid, start, goal).runToCompletion();
      check(`${label}: ${s} finds path`, res.found);
      if (s === 'dijkstra' || s === 'astar') {
        check(`${label}: ${s} length == BFS (shortest)`, res.path.length === bfsRes.path.length);
      }
    }
  }
}

// Validate the memory-budget clamp.
const { validateMazeSize, maxMazeSide } = globalThis;
check(`2D clamp keeps odd & <= max`, validateMazeSize(10 ** 9, { dims: 2 }) === maxMazeSide(2));
check(`3D max side smaller than 2D`, maxMazeSide(3) < maxMazeSide(2));
check(`even size rounds to odd`, validateMazeSize(24, { dims: 2 }) === 25);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
