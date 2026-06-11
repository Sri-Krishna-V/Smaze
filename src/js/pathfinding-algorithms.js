'use strict';

/**
 * Pathfinding algorithms for maze solving: BFS, DFS, Dijkstra's, and A*.
 *
 * Every algorithm is keyed by integer cell index over a {@link Grid} and backed
 * by flat typed arrays (visited: Uint8Array, cameFrom/distances: Int32Array)
 * instead of per-cell `{x, y}` objects. That makes them dimension-agnostic — the
 * same code solves 2D and 3D mazes because neighbor topology comes from
 * `grid.neighbors(i)` — and keeps the working set near one byte (visited) plus a
 * few ints per cell, so they scale to the memory budget.
 *
 * Each algorithm advances one node per `step()` call and returns a uniform
 * result, so the Game can drive animation from a single requestAnimationFrame
 * loop (pumping N steps per frame for the speed control) and also run searches
 * headlessly to completion for compare mode.
 *
 * `step()` returns { done, found, current, path }:
 *   - current : index of the cell expanded this step (for visualization), or -1
 *               for a no-op step (e.g. a stale heap entry already visited).
 *   - done    : true once the search has terminated.
 *   - found   : true if the goal was reached.
 *   - path    : the solution path (array of indices) when found, else null.
 *
 * Depends on data-structures.js (BinaryHeap) and utils.js (manhattanIndex).
 */

/* global BinaryHeap, manhattanIndex */

if (typeof BinaryHeap === 'undefined' || typeof manhattanIndex === 'undefined') {
  throw new Error(
    'Pathfinding dependencies missing. Load utils.js and data-structures.js first.'
  );
}

const NO_PARENT = -1;
const INF = 0x7fffffff;

/**
 * Base class. Subclasses seed their frontier in the constructor and implement
 * `step()`, which must call `_finish()` when the search ends.
 */
class PathfindingAlgorithm {
  /**
   * @param {Grid} grid
   * @param {number} startIndex
   * @param {number} goalIndex
   */
  constructor(grid, startIndex, goalIndex) {
    this.grid = grid;
    this.start = startIndex;
    this.goal = goalIndex;

    this.visited = new Uint8Array(grid.cellCount);
    this.cameFrom = new Int32Array(grid.cellCount).fill(NO_PARENT);

    this.nodesExplored = 0;
    this.frontierSize = 0;
    this.finished = false;
    this.found = false;
    this.path = null;

    this._scratch = []; // Reused by grid.neighbors() to avoid per-step allocation.
  }

  /**
   * Passable, unvisited neighbor indices of `i`.
   * @returns {number[]} (the algorithm's reusable scratch array)
   */
  openNeighbors(i) {
    const all = this.grid.neighbors(i, this._scratch);
    let w = 0;
    for (let r = 0; r < all.length; r++) {
      const n = all[r];
      if (this.grid.cells[n] === 0 && !this.visited[n]) all[w++] = n;
    }
    all.length = w;
    return all;
  }

  /**
   * Rebuild the path of indices from goal back to start via the cameFrom chain.
   * @returns {number[]}
   */
  reconstructPath() {
    const path = [];
    let current = this.goal;
    while (current !== NO_PARENT) {
      path.push(current);
      if (current === this.start) break;
      current = this.cameFrom[current];
    }
    return path.reverse();
  }

  /**
   * Mark the search complete, reconstructing the path if the goal was found.
   * @protected
   */
  _finish(found) {
    this.finished = true;
    this.found = found;
    this.path = found ? this.reconstructPath() : null;
  }

  /** @protected */
  _doneResult() {
    return { done: true, found: this.found, current: -1, path: this.path };
  }

  /**
   * Run the search to completion with no animation. Used by compare mode.
   * @returns {{found: boolean, path: number[]|null, nodesExplored: number}}
   */
  runToCompletion() {
    while (!this.finished) this.step();
    return { found: this.found, path: this.path, nodesExplored: this.nodesExplored };
  }
}

/**
 * Breadth-First Search — explores by distance, guaranteeing a shortest path.
 */
class BFSAlgorithm extends PathfindingAlgorithm {
  constructor(grid, startIndex, goalIndex) {
    super(grid, startIndex, goalIndex);
    this.queue = [startIndex];
    this.head = 0; // Index cursor avoids O(n) Array.shift on every step.
    this.visited[startIndex] = 1;
    this.frontierSize = 1;
  }

  step() {
    if (this.finished) return this._doneResult();
    if (this.head >= this.queue.length) {
      this._finish(false);
      return this._doneResult();
    }

    const current = this.queue[this.head++];
    this.nodesExplored++;

    if (current === this.goal) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    const neighbors = this.openNeighbors(current);
    for (let k = 0; k < neighbors.length; k++) {
      const n = neighbors[k];
      this.visited[n] = 1;
      this.cameFrom[n] = current;
      this.queue.push(n);
    }

    this.frontierSize = this.queue.length - this.head;
    return { done: false, found: false, current, path: null };
  }
}

/**
 * Depth-First Search — dives deep along each branch; not shortest-path.
 */
class DFSAlgorithm extends PathfindingAlgorithm {
  constructor(grid, startIndex, goalIndex) {
    super(grid, startIndex, goalIndex);
    this.stack = [startIndex];
    this.visited[startIndex] = 1;
    this.frontierSize = 1;
  }

  step() {
    if (this.finished) return this._doneResult();
    if (this.stack.length === 0) {
      this._finish(false);
      return this._doneResult();
    }

    const current = this.stack.pop();
    this.nodesExplored++;

    if (current === this.goal) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    const neighbors = this.openNeighbors(current);
    for (let k = 0; k < neighbors.length; k++) {
      const n = neighbors[k];
      this.visited[n] = 1;
      this.cameFrom[n] = current;
      this.stack.push(n);
    }

    this.frontierSize = this.stack.length;
    return { done: false, found: false, current, path: null };
  }
}

/**
 * Dijkstra's algorithm — uniform-cost expansion via a binary min-heap.
 * On a unit-weight maze this matches BFS's shortest path.
 */
class DijkstraAlgorithm extends PathfindingAlgorithm {
  constructor(grid, startIndex, goalIndex) {
    super(grid, startIndex, goalIndex);
    this.distances = new Int32Array(grid.cellCount).fill(INF);
    this.heap = new BinaryHeap((a, b) => a.priority - b.priority);
    this.distances[startIndex] = 0;
    this.heap.push({ i: startIndex, priority: 0 });
    this.frontierSize = 1;
  }

  step() {
    if (this.finished) return this._doneResult();
    if (this.heap.isEmpty()) {
      this._finish(false);
      return this._doneResult();
    }

    const current = this.heap.pop().i;
    if (this.visited[current]) {
      this.frontierSize = this.heap.size();
      return { done: false, found: false, current: -1, path: null };
    }
    this.visited[current] = 1;
    this.nodesExplored++;

    if (current === this.goal) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    this._relax(current);
    this.frontierSize = this.heap.size();
    return { done: false, found: false, current, path: null };
  }

  /**
   * Relax edges out of `current`. Split out so A* can override the priority.
   * @protected
   */
  _relax(current) {
    const neighbors = this.openNeighbors(current);
    const base = this.distances[current] + 1;
    for (let k = 0; k < neighbors.length; k++) {
      const n = neighbors[k];
      if (base < this.distances[n]) {
        this.distances[n] = base;
        this.cameFrom[n] = current;
        this.heap.push({ i: n, priority: base });
      }
    }
  }
}

/**
 * A* — Dijkstra guided toward the goal by a Manhattan-distance heuristic
 * (admissible in both 2D and 3D since moves are unit-cost and orthogonal).
 */
class AStarAlgorithm extends DijkstraAlgorithm {
  constructor(grid, startIndex, goalIndex) {
    super(grid, startIndex, goalIndex);
    // Reset the frontier to order by f = g + h instead of g alone.
    this.heap = new BinaryHeap((a, b) => a.priority - b.priority);
    this.heap.push({ i: startIndex, priority: this._heuristic(startIndex) });
    this.frontierSize = 1;
  }

  /** @protected @returns {number} Manhattan distance to the goal. */
  _heuristic(i) {
    return manhattanIndex(this.grid, i, this.goal);
  }

  /** @protected */
  _relax(current) {
    const neighbors = this.openNeighbors(current);
    const tentativeG = this.distances[current] + 1;
    for (let k = 0; k < neighbors.length; k++) {
      const n = neighbors[k];
      if (tentativeG < this.distances[n]) {
        this.distances[n] = tentativeG;
        this.cameFrom[n] = current;
        this.heap.push({ i: n, priority: tentativeG + this._heuristic(n) });
      }
    }
  }
}

/** Display names for each algorithm key. */
const ALGORITHM_NAMES = {
  bfs: 'Breadth-First Search',
  dfs: 'Depth-First Search',
  dijkstra: 'Dijkstra\'s Algorithm',
  astar: 'A* Search'
};

/**
 * Create a pathfinding algorithm instance.
 * @param {string} algorithmType - 'bfs' | 'dfs' | 'dijkstra' | 'astar'.
 * @param {Grid} grid
 * @param {number} startIndex
 * @param {number} goalIndex
 * @returns {PathfindingAlgorithm}
 */
function createAlgorithm(algorithmType, grid, startIndex, goalIndex) {
  if (!grid || typeof grid.cellCount !== 'number' || !grid.cells) {
    throw new Error('Invalid grid');
  }
  if (!Number.isInteger(startIndex) || !Number.isInteger(goalIndex)) {
    throw new Error('Invalid start or goal index');
  }

  switch ((algorithmType || '').toLowerCase()) {
    case 'bfs':
      return new BFSAlgorithm(grid, startIndex, goalIndex);
    case 'dfs':
      return new DFSAlgorithm(grid, startIndex, goalIndex);
    case 'dijkstra':
      return new DijkstraAlgorithm(grid, startIndex, goalIndex);
    case 'astar':
      return new AStarAlgorithm(grid, startIndex, goalIndex);
    default:
      throw new Error(`Unknown algorithm type: ${algorithmType}`);
  }
}

if (typeof window !== 'undefined') {
  window.createAlgorithm = createAlgorithm;
  window.ALGORITHM_NAMES = ALGORITHM_NAMES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PathfindingAlgorithm,
    BFSAlgorithm,
    DFSAlgorithm,
    DijkstraAlgorithm,
    AStarAlgorithm,
    createAlgorithm,
    ALGORITHM_NAMES
  };
}
