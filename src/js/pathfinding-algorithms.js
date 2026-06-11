'use strict';

/**
 * Pathfinding algorithms for maze solving: BFS, DFS, Dijkstra's, and A*.
 *
 * Each algorithm advances one node per `step()` call and returns a uniform
 * result object, so the Game can drive animation from a single
 * requestAnimationFrame loop (pumping N steps per frame for the speed control)
 * and also run searches headlessly to completion for compare mode.
 *
 * Depends on utils.js (create2DArray, isValidCoordinate, manhattanDistance,
 * getDirections) and data-structures.js (BinaryHeap). Load those first.
 */

/* global create2DArray, isValidCoordinate, manhattanDistance, getDirections,
   BinaryHeap */

if (typeof create2DArray === 'undefined' ||
    typeof isValidCoordinate === 'undefined' ||
    typeof manhattanDistance === 'undefined' ||
    typeof getDirections === 'undefined' ||
    typeof BinaryHeap === 'undefined') {
  throw new Error(
    'Pathfinding dependencies missing. Load utils.js and data-structures.js first.'
  );
}

/**
 * Base class. Subclasses seed their frontier in the constructor and implement
 * `step()`, which must call `_finish()` when the search ends.
 *
 * `step()` returns { done, found, current, path }:
 *   - current : the cell expanded this step (for visualization), or null for a
 *               no-op step (e.g. a stale heap entry that was already visited).
 *   - done    : true once the search has terminated.
 *   - found   : true if the goal was reached.
 *   - path    : the solution path (array of {x,y}) when found, else null.
 */
class PathfindingAlgorithm {
  constructor(maze, start, goal) {
    this.maze = maze;
    this.start = start;
    this.goal = goal;
    this.mazeSize = maze.length;
    this.visited = create2DArray(this.mazeSize, this.mazeSize, false);
    this.cameFrom = create2DArray(this.mazeSize, this.mazeSize, null);

    this.nodesExplored = 0;
    this.frontierSize = 0;
    this.finished = false;
    this.found = false;
    this.path = null;
  }

  /**
   * @returns {boolean} True if (x, y) is the goal.
   */
  isGoal(x, y) {
    return x === this.goal.x && y === this.goal.y;
  }

  /**
   * @returns {boolean} True if (x, y) is in bounds, passable, and unvisited.
   */
  isValidMove(x, y) {
    return (
      isValidCoordinate(x, y, this.mazeSize) &&
      this.maze[y][x] === 0 &&
      !this.visited[y][x]
    );
  }

  /**
   * Valid, unvisited orthogonal neighbors of (x, y).
   * @returns {Array<{x: number, y: number}>}
   */
  getValidNeighbors(x, y) {
    return getDirections(x, y).filter(({ x: nx, y: ny }) => this.isValidMove(nx, ny));
  }

  /**
   * Rebuild the path from goal back to start via the cameFrom chain.
   * @returns {Array<{x: number, y: number}>}
   */
  reconstructPath() {
    const path = [];
    let current = { x: this.goal.x, y: this.goal.y };
    while (current) {
      path.push({ x: current.x, y: current.y });
      current = this.cameFrom[current.y][current.x];
    }
    return path.reverse();
  }

  /**
   * Mark the search complete, reconstructing the path if the goal was found.
   * @protected
   * @param {boolean} found
   */
  _finish(found) {
    this.finished = true;
    this.found = found;
    this.path = found ? this.reconstructPath() : null;
  }

  /**
   * The standard terminal result object for a finished search.
   * @protected
   */
  _doneResult() {
    return { done: true, found: this.found, current: null, path: this.path };
  }

  /**
   * Run the search to completion with no animation. Used by compare mode.
   * @returns {{found: boolean, path: Array|null, nodesExplored: number}}
   */
  runToCompletion() {
    while (!this.finished) {
      this.step();
    }
    return {
      found: this.found,
      path: this.path,
      nodesExplored: this.nodesExplored
    };
  }
}

/**
 * Breadth-First Search — explores by distance, guaranteeing a shortest path.
 */
class BFSAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.queue = [{ x: start.x, y: start.y }];
    this.head = 0; // Index cursor avoids O(n) Array.shift on every step.
    this.visited[start.y][start.x] = true;
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

    if (this.isGoal(current.x, current.y)) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    for (const neighbor of this.getValidNeighbors(current.x, current.y)) {
      this.visited[neighbor.y][neighbor.x] = true;
      this.cameFrom[neighbor.y][neighbor.x] = current;
      this.queue.push(neighbor);
    }

    this.frontierSize = this.queue.length - this.head;
    return { done: false, found: false, current, path: null };
  }
}

/**
 * Depth-First Search — dives deep along each branch; not shortest-path.
 */
class DFSAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.stack = [{ x: start.x, y: start.y }];
    this.visited[start.y][start.x] = true;
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

    if (this.isGoal(current.x, current.y)) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    for (const neighbor of this.getValidNeighbors(current.x, current.y)) {
      this.visited[neighbor.y][neighbor.x] = true;
      this.cameFrom[neighbor.y][neighbor.x] = current;
      this.stack.push(neighbor);
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
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.distances = create2DArray(this.mazeSize, this.mazeSize, Infinity);
    this.heap = new BinaryHeap((a, b) => a.distance - b.distance);
    this.distances[start.y][start.x] = 0;
    this.heap.push({ x: start.x, y: start.y, distance: 0 });
    this.frontierSize = 1;
  }

  step() {
    if (this.finished) return this._doneResult();
    if (this.heap.isEmpty()) {
      this._finish(false);
      return this._doneResult();
    }

    const current = this.heap.pop();
    this.frontierSize = this.heap.size();

    if (this.visited[current.y][current.x]) {
      return { done: false, found: false, current: null, path: null };
    }
    this.visited[current.y][current.x] = true;
    this.nodesExplored++;

    if (this.isGoal(current.x, current.y)) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    for (const neighbor of this._passableNeighbors(current.x, current.y)) {
      const alt = this.distances[current.y][current.x] + 1;
      if (alt < this.distances[neighbor.y][neighbor.x]) {
        this.distances[neighbor.y][neighbor.x] = alt;
        this.cameFrom[neighbor.y][neighbor.x] = current;
        this.heap.push({ x: neighbor.x, y: neighbor.y, distance: alt });
      }
    }

    this.frontierSize = this.heap.size();
    return { done: false, found: false, current, path: null };
  }

  /**
   * Passable, unvisited neighbors (distances may still need relaxing).
   * @protected
   */
  _passableNeighbors(x, y) {
    return getDirections(x, y).filter(
      ({ x: nx, y: ny }) =>
        isValidCoordinate(nx, ny, this.mazeSize) &&
        this.maze[ny][nx] === 0 &&
        !this.visited[ny][nx]
    );
  }
}

/**
 * A* — Dijkstra guided toward the goal by a Manhattan-distance heuristic.
 */
class AStarAlgorithm extends DijkstraAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.gScore = this.distances; // Reuse the distance grid as g-scores.
    this.heap = new BinaryHeap((a, b) => a.f - b.f);
    this.heap.push({ x: start.x, y: start.y, f: this._heuristic(start.x, start.y) });
    this.frontierSize = 1;
  }

  /**
   * @protected
   * @returns {number} Manhattan distance to the goal.
   */
  _heuristic(x, y) {
    return manhattanDistance(x, y, this.goal.x, this.goal.y);
  }

  step() {
    if (this.finished) return this._doneResult();
    if (this.heap.isEmpty()) {
      this._finish(false);
      return this._doneResult();
    }

    const current = this.heap.pop();
    this.frontierSize = this.heap.size();

    if (this.visited[current.y][current.x]) {
      return { done: false, found: false, current: null, path: null };
    }
    this.visited[current.y][current.x] = true;
    this.nodesExplored++;

    if (this.isGoal(current.x, current.y)) {
      this._finish(true);
      return { done: true, found: true, current, path: this.path };
    }

    for (const neighbor of this._passableNeighbors(current.x, current.y)) {
      const tentativeG = this.gScore[current.y][current.x] + 1;
      if (tentativeG < this.gScore[neighbor.y][neighbor.x]) {
        this.gScore[neighbor.y][neighbor.x] = tentativeG;
        this.cameFrom[neighbor.y][neighbor.x] = current;
        this.heap.push({
          x: neighbor.x,
          y: neighbor.y,
          f: tentativeG + this._heuristic(neighbor.x, neighbor.y)
        });
      }
    }

    this.frontierSize = this.heap.size();
    return { done: false, found: false, current, path: null };
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
 * @param {Array} maze - 2D maze array.
 * @param {{x: number, y: number}} start
 * @param {{x: number, y: number}} goal
 * @returns {PathfindingAlgorithm}
 */
function createAlgorithm(algorithmType, maze, start, goal) {
  if (!Array.isArray(maze) || maze.length === 0 || !Array.isArray(maze[0])) {
    throw new Error('Invalid maze format');
  }
  if (!start || !goal ||
      typeof start.x !== 'number' || typeof start.y !== 'number' ||
      typeof goal.x !== 'number' || typeof goal.y !== 'number') {
    throw new Error('Invalid start or goal positions');
  }

  switch ((algorithmType || '').toLowerCase()) {
    case 'bfs':
      return new BFSAlgorithm(maze, start, goal);
    case 'dfs':
      return new DFSAlgorithm(maze, start, goal);
    case 'dijkstra':
      return new DijkstraAlgorithm(maze, start, goal);
    case 'astar':
      return new AStarAlgorithm(maze, start, goal);
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
