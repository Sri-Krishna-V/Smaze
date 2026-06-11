'use strict';

/**
 * Maze generation for SMaze.
 *
 * Produces "perfect" mazes (exactly one path between any two cells) on an
 * odd-sized grid where (odd, odd) coordinates are room cells joined by carving
 * the wall cell between them. Three generation strategies are supported, each
 * with a distinct visual texture:
 *   - kruskal      : Kruskal's algorithm via union-find (balanced, many corridors)
 *   - backtracker  : recursive backtracker / randomized DFS (long winding paths)
 *   - prim         : randomized Prim's (bushy, many short branches)
 *
 * Generation is driven by a seeded RNG so mazes are reproducible and shareable.
 */

/* global validateMazeSize, randomSeed, mulberry32, create2DArray, shuffleArray,
   UnionFind, isValidCoordinate */

const MAZE_ALGORITHMS = ['kruskal', 'backtracker', 'prim'];

class MazeGenerator {
  /**
   * @param {number} size - Maze size (coerced to an odd value in [11, 99]).
   * @param {Object} [options]
   * @param {string} [options.algorithm='kruskal'] - One of MAZE_ALGORITHMS.
   * @param {number} [options.seed] - RNG seed; random if omitted.
   */
  constructor(size, options = {}) {
    this.size = validateMazeSize(size);
    this.algorithm = MAZE_ALGORITHMS.includes(options.algorithm)
      ? options.algorithm
      : 'kruskal';
    this.seed = Number.isInteger(options.seed) ? options.seed >>> 0 : randomSeed();
    this.maze = null;
  }

  /**
   * Generate a new maze. The algorithm and seed default to the current
   * configuration but can be overridden per call.
   * @param {Object} [options]
   * @param {string} [options.algorithm] - Override the generation algorithm.
   * @param {number} [options.seed] - Override the seed (random if explicitly null).
   * @returns {Array} 2D maze array (0 = path, 1 = wall).
   */
  generate(options = {}) {
    if (options.algorithm && MAZE_ALGORITHMS.includes(options.algorithm)) {
      this.algorithm = options.algorithm;
    }
    if (options.seed === null) {
      this.seed = randomSeed();
    } else if (Number.isInteger(options.seed)) {
      this.seed = options.seed >>> 0;
    }

    const rng = mulberry32(this.seed);
    this.maze = create2DArray(this.size, this.size, 1);
    this._carveRoomCells();

    switch (this.algorithm) {
      case 'backtracker':
        this._generateBacktracker(rng);
        break;
      case 'prim':
        this._generatePrim(rng);
        break;
      case 'kruskal':
      default:
        this._generateKruskal(rng);
        break;
    }

    this._createEntryAndExit();
    return this.maze;
  }

  /**
   * Number of room cells per side ((size - 1) / 2).
   * @private
   * @returns {number}
   */
  get _cols() {
    return (this.size - 1) / 2;
  }

  /**
   * Mark every (odd, odd) coordinate as a passable room cell.
   * @private
   */
  _carveRoomCells() {
    for (let cy = 0; cy < this._cols; cy++) {
      for (let cx = 0; cx < this._cols; cx++) {
        this.maze[2 * cy + 1][2 * cx + 1] = 0;
      }
    }
  }

  /**
   * Open the wall between two adjacent room cells.
   * @private
   */
  _connect(cx1, cy1, cx2, cy2) {
    const wallX = cx1 + cx2 + 1; // (2cx1+1 + 2cx2+1) / 2
    const wallY = cy1 + cy2 + 1;
    this.maze[wallY][wallX] = 0;
  }

  /**
   * Kruskal's algorithm: shuffle all candidate edges and join cells that are
   * not yet connected, using union-find for near-constant-time merges.
   * @private
   * @param {() => number} rng
   */
  _generateKruskal(rng) {
    const cols = this._cols;
    const uf = new UnionFind(cols * cols);
    const edges = [];

    for (let cy = 0; cy < cols; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (cx + 1 < cols) edges.push([cx, cy, cx + 1, cy]);
        if (cy + 1 < cols) edges.push([cx, cy, cx, cy + 1]);
      }
    }

    shuffleArray(edges, rng);

    for (const [cx1, cy1, cx2, cy2] of edges) {
      const a = cy1 * cols + cx1;
      const b = cy2 * cols + cx2;
      if (uf.union(a, b)) {
        this._connect(cx1, cy1, cx2, cy2);
      }
    }
  }

  /**
   * Randomized DFS (recursive backtracker), implemented iteratively to avoid
   * call-stack limits on large mazes.
   * @private
   * @param {() => number} rng
   */
  _generateBacktracker(rng) {
    const cols = this._cols;
    const visited = create2DArray(cols, cols, false);
    const stack = [[0, 0]];
    visited[0][0] = true;

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = this._cellNeighbors(cx, cy).filter(
        ([nx, ny]) => !visited[ny][nx]
      );

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const [nx, ny] = neighbors[Math.floor(rng() * neighbors.length)];
      visited[ny][nx] = true;
      this._connect(cx, cy, nx, ny);
      stack.push([nx, ny]);
    }
  }

  /**
   * Randomized Prim's algorithm: grow the maze from a random cell by repeatedly
   * carving a random frontier edge into an unvisited cell.
   * @private
   * @param {() => number} rng
   */
  _generatePrim(rng) {
    const cols = this._cols;
    const visited = create2DArray(cols, cols, false);
    const startX = Math.floor(rng() * cols);
    const startY = Math.floor(rng() * cols);
    visited[startY][startX] = true;

    /** @type {Array<[number, number, number, number]>} */
    const frontier = this._cellNeighbors(startX, startY).map(([nx, ny]) => [
      startX,
      startY,
      nx,
      ny
    ]);

    while (frontier.length > 0) {
      const index = Math.floor(rng() * frontier.length);
      const [cx, cy, nx, ny] = frontier[index];
      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();

      if (visited[ny][nx]) continue;

      visited[ny][nx] = true;
      this._connect(cx, cy, nx, ny);

      for (const [ax, ay] of this._cellNeighbors(nx, ny)) {
        if (!visited[ay][ax]) frontier.push([nx, ny, ax, ay]);
      }
    }
  }

  /**
   * Orthogonal room-cell neighbors within the cell grid.
   * @private
   * @returns {Array<[number, number]>}
   */
  _cellNeighbors(cx, cy) {
    const cols = this._cols;
    const result = [];
    if (cx + 1 < cols) result.push([cx + 1, cy]);
    if (cx - 1 >= 0) result.push([cx - 1, cy]);
    if (cy + 1 < cols) result.push([cx, cy + 1]);
    if (cy - 1 >= 0) result.push([cx, cy - 1]);
    return result;
  }

  /**
   * Carve the fixed entry (top-left) and exit (bottom-right) openings.
   * @private
   */
  _createEntryAndExit() {
    this.maze[1][0] = 0;
    this.maze[this.size - 2][this.size - 1] = 0;
  }

  /**
   * @returns {Array|null} Current maze, or null if not yet generated.
   */
  getMaze() {
    return this.maze;
  }

  /**
   * @returns {number} Maze size.
   */
  getSize() {
    return this.size;
  }

  /**
   * @returns {number} Seed used for the current maze.
   */
  getSeed() {
    return this.seed;
  }

  /**
   * @returns {string} Active generation algorithm.
   */
  getAlgorithm() {
    return this.algorithm;
  }

  /**
   * Update the maze size and regenerate with a fresh seed.
   * @param {number} newSize
   * @returns {Array} The new maze.
   */
  updateSize(newSize) {
    this.size = validateMazeSize(newSize);
    return this.generate({ seed: null });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean} True if the position is a wall or out of bounds.
   */
  isWall(x, y) {
    if (!this.maze || !isValidCoordinate(x, y, this.size)) {
      return true;
    }
    return this.maze[y][x] === 1;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean} True if the position is passable.
   */
  isPath(x, y) {
    return !this.isWall(x, y);
  }

  /**
   * @returns {{x: number, y: number}} Start position (top-left opening).
   */
  getStartPosition() {
    return { x: 0, y: 1 };
  }

  /**
   * @returns {{x: number, y: number}} Goal position (bottom-right opening).
   */
  getGoalPosition() {
    return { x: this.size - 1, y: this.size - 2 };
  }
}

if (typeof window !== 'undefined') {
  window.MazeGenerator = MazeGenerator;
  window.MAZE_ALGORITHMS = MAZE_ALGORITHMS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MazeGenerator, MAZE_ALGORITHMS };
}
