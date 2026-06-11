'use strict';

/**
 * Maze generation for SMaze (2D and 3D).
 *
 * Produces "perfect" mazes (exactly one path between any two cells) on an
 * odd-sized grid. Room cells sit at every (odd, odd[, odd]) coordinate and are
 * joined by carving the single wall cell between two adjacent rooms. The same
 * three strategies work in both dimensions because they operate on an abstract
 * room-cell lattice (4-connected in 2D, 6-connected in 3D):
 *   - kruskal      : Kruskal's algorithm via union-find (balanced)
 *   - backtracker  : iterative randomized DFS (long winding paths)
 *   - prim         : randomized Prim's (bushy, many short branches)
 *
 * The carved maze is stored in a flat-typed-array {@link Grid}, so generation
 * scales to the memory budget. Kruskal materializes every candidate edge
 * (O(dims · rooms) memory); above {@link MazeGenerator.KRUSKAL_ROOM_LIMIT} it
 * transparently falls back to the backtracker, which needs only a visited mask
 * and a stack.
 *
 * Generation is driven by a seeded RNG so mazes are reproducible and shareable.
 */

/* global Grid, UnionFind, validateMazeSize, randomSeed, mulberry32, shuffleArray */

const MAZE_ALGORITHMS = ['kruskal', 'backtracker', 'prim'];

class MazeGenerator {
  /**
   * @param {number} size - Maze size (coerced to odd within the memory budget).
   * @param {Object} [options]
   * @param {2|3} [options.dims=2] - Spatial dimensions.
   * @param {string} [options.algorithm='kruskal'] - One of MAZE_ALGORITHMS.
   * @param {number} [options.seed] - RNG seed; random if omitted.
   */
  constructor(size, options = {}) {
    this.dims = options.dims === 3 ? 3 : 2;
    this.size = validateMazeSize(size, { dims: this.dims });
    this.algorithm = MAZE_ALGORITHMS.includes(options.algorithm)
      ? options.algorithm
      : 'kruskal';
    this.seed = Number.isInteger(options.seed) ? options.seed >>> 0 : randomSeed();
    this.grid = null;
    this.start = null;
    this.goal = null;
    this.startIndex = 0;
    this.goalIndex = 0;
  }

  /** Room cells per side: (size - 1) / 2. */
  get cols() {
    return (this.size - 1) / 2;
  }

  /** Total room cells across all dimensions. */
  get roomCount() {
    return this.dims === 3 ? this.cols ** 3 : this.cols ** 2;
  }

  /**
   * Generate a new maze. Algorithm, seed, and dimensions default to the current
   * configuration but can be overridden per call.
   * @param {Object} [options]
   * @param {2|3} [options.dims] - Override dimensions.
   * @param {string} [options.algorithm] - Override the generation algorithm.
   * @param {number} [options.seed] - Override the seed (random if explicitly null).
   * @returns {Grid} The carved grid.
   */
  generate(options = {}) {
    if (options.dims === 2 || options.dims === 3) this.dims = options.dims;
    if (options.algorithm && MAZE_ALGORITHMS.includes(options.algorithm)) {
      this.algorithm = options.algorithm;
    }
    if (options.seed === null) {
      this.seed = randomSeed();
    } else if (Number.isInteger(options.seed)) {
      this.seed = options.seed >>> 0;
    }

    // Re-validate against the (possibly new) dimension's memory budget.
    this.size = validateMazeSize(this.size, { dims: this.dims });

    const rng = mulberry32(this.seed);
    this.grid = new Grid(this.size, this.dims);
    this._carveRoomCells();

    let algorithm = this.algorithm;
    if (algorithm === 'kruskal' && this.roomCount > MazeGenerator.KRUSKAL_ROOM_LIMIT) {
      algorithm = 'backtracker'; // Avoid an oversized edge list on huge mazes.
    }

    switch (algorithm) {
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

    this._setEndpoints();
    return this.grid;
  }

  /* ------------------------------------------------------------------ *
   * Room-cell lattice helpers (dimension-agnostic)
   * ------------------------------------------------------------------ */

  /** Linear room id from room coordinates. */
  _roomId(cx, cy, cz) {
    return this.dims === 3
      ? (cz * this.cols + cy) * this.cols + cx
      : cy * this.cols + cx;
  }

  /** Room coordinates from a linear room id. */
  _roomCoords(rid) {
    const c = this.cols;
    if (this.dims === 3) {
      return { cx: rid % c, cy: Math.floor(rid / c) % c, cz: Math.floor(rid / (c * c)) };
    }
    return { cx: rid % c, cy: Math.floor(rid / c), cz: 0 };
  }

  /** Mark every (odd, odd[, odd]) coordinate as a passable room cell. */
  _carveRoomCells() {
    const cols = this.cols;
    if (this.dims === 3) {
      for (let cz = 0; cz < cols; cz++) {
        for (let cy = 0; cy < cols; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            this.grid.carve(this.grid.index(2 * cx + 1, 2 * cy + 1, 2 * cz + 1));
          }
        }
      }
    } else {
      for (let cy = 0; cy < cols; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          this.grid.carve(this.grid.index(2 * cx + 1, 2 * cy + 1));
        }
      }
    }
  }

  /**
   * Carve the wall cell between two adjacent room cells. The wall coordinate on
   * each axis is c1 + c2 + 1 (the midpoint of 2c1+1 and 2c2+1); on unchanged
   * axes that resolves back to the shared room coordinate. (Grid.index ignores
   * z in 2D, so the uniform formula is correct in both dimensions.)
   */
  _connectRooms(rid1, rid2) {
    const a = this._roomCoords(rid1);
    const b = this._roomCoords(rid2);
    this.grid.carve(this.grid.index(a.cx + b.cx + 1, a.cy + b.cy + 1, a.cz + b.cz + 1));
  }

  /**
   * Unvisited room-cell neighbors of `rid` within the lattice.
   * @param {number} rid
   * @param {Uint8Array} visited - Per-room visited mask.
   * @param {number[]} out - Reusable output array (cleared on entry).
   * @returns {number[]} Neighbor room ids that are unvisited.
   */
  _roomNeighbors(rid, visited, out) {
    out.length = 0;
    const cols = this.cols;
    const { cx, cy, cz } = this._roomCoords(rid);
    const tryPush = (nx, ny, nz) => {
      const nrid = this._roomId(nx, ny, nz);
      if (!visited[nrid]) out.push(nrid);
    };
    if (cx + 1 < cols) tryPush(cx + 1, cy, cz);
    if (cx - 1 >= 0) tryPush(cx - 1, cy, cz);
    if (cy + 1 < cols) tryPush(cx, cy + 1, cz);
    if (cy - 1 >= 0) tryPush(cx, cy - 1, cz);
    if (this.dims === 3) {
      if (cz + 1 < cols) tryPush(cx, cy, cz + 1);
      if (cz - 1 >= 0) tryPush(cx, cy, cz - 1);
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Generation strategies
   * ------------------------------------------------------------------ */

  /**
   * Kruskal's algorithm: shuffle all candidate edges and join rooms that are not
   * yet connected, using union-find for near-constant-time merges.
   * @private
   */
  _generateKruskal(rng) {
    const cols = this.cols;
    const uf = new UnionFind(this.roomCount);
    const edges = [];

    // Positive-axis edges only, so each adjacency is listed once.
    const addEdge = (cx, cy, cz, nx, ny, nz) => {
      edges.push([this._roomId(cx, cy, cz), this._roomId(nx, ny, nz)]);
    };
    const dims = this.dims;
    for (let cz = 0; cz < (dims === 3 ? cols : 1); cz++) {
      for (let cy = 0; cy < cols; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          if (cx + 1 < cols) addEdge(cx, cy, cz, cx + 1, cy, cz);
          if (cy + 1 < cols) addEdge(cx, cy, cz, cx, cy + 1, cz);
          if (dims === 3 && cz + 1 < cols) addEdge(cx, cy, cz, cx, cy, cz + 1);
        }
      }
    }

    shuffleArray(edges, rng);

    for (const [a, b] of edges) {
      if (uf.union(a, b)) {
        this._connectRooms(a, b);
      }
    }
  }

  /**
   * Iterative randomized DFS (recursive backtracker). Memory-frugal — only a
   * visited mask plus a stack of room ids — so it is the scale fallback.
   * @private
   */
  _generateBacktracker(rng) {
    const visited = new Uint8Array(this.roomCount);
    const stack = [0];
    visited[0] = 1;
    const scratch = [];

    while (stack.length > 0) {
      const rid = stack[stack.length - 1];
      const neighbors = this._roomNeighbors(rid, visited, scratch);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const next = neighbors[Math.floor(rng() * neighbors.length)];
      visited[next] = 1;
      this._connectRooms(rid, next);
      stack.push(next);
    }
  }

  /**
   * Randomized Prim's algorithm: grow from a random room by repeatedly carving a
   * random frontier edge into an unvisited room.
   * @private
   */
  _generatePrim(rng) {
    const visited = new Uint8Array(this.roomCount);
    const startRid = Math.floor(rng() * this.roomCount);
    visited[startRid] = 1;

    const scratch = [];
    /** @type {Array<[number, number]>} edges as [fromRid, toRid] */
    const frontier = [];
    for (const n of this._roomNeighbors(startRid, visited, scratch)) {
      frontier.push([startRid, n]);
    }

    while (frontier.length > 0) {
      const index = Math.floor(rng() * frontier.length);
      const [from, to] = frontier[index];
      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();

      if (visited[to]) continue;

      visited[to] = 1;
      this._connectRooms(from, to);

      for (const n of this._roomNeighbors(to, visited, scratch)) {
        frontier.push([to, n]);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Endpoints
   * ------------------------------------------------------------------ */

  /**
   * Place start and goal. In 2D this carves the classic top-left entry and
   * bottom-right exit openings; in 3D the endpoints are interior corner rooms.
   * @private
   */
  _setEndpoints() {
    const s = this.size;
    if (this.dims === 2) {
      this.grid.carve(this.grid.index(0, 1));         // entry opening
      this.grid.carve(this.grid.index(s - 1, s - 2)); // exit opening
      this.start = { x: 0, y: 1, z: 0 };
      this.goal = { x: s - 1, y: s - 2, z: 0 };
    } else {
      this.start = { x: 1, y: 1, z: 1 };
      this.goal = { x: s - 2, y: s - 2, z: s - 2 };
    }
    this.startIndex = this.grid.index(this.start.x, this.start.y, this.start.z);
    this.goalIndex = this.grid.index(this.goal.x, this.goal.y, this.goal.z);
  }

  /* ------------------------------------------------------------------ *
   * Accessors
   * ------------------------------------------------------------------ */

  getGrid() { return this.grid; }
  getSize() { return this.size; }
  getDims() { return this.dims; }
  getSeed() { return this.seed; }
  getAlgorithm() { return this.algorithm; }
  getStartPosition() { return { ...this.start }; }
  getGoalPosition() { return { ...this.goal }; }
  getStartIndex() { return this.startIndex; }
  getGoalIndex() { return this.goalIndex; }

  /**
   * @returns {boolean} True if the coordinates are a wall or out of bounds.
   */
  isWall(x, y, z = 0) {
    if (!this.grid || !this.grid.inBounds(x, y, z)) return true;
    return this.grid.isWall(this.grid.index(x, y, z));
  }

  isPath(x, y, z = 0) {
    return !this.isWall(x, y, z);
  }
}

/**
 * Above this room count, Kruskal's per-edge array gets too large; generation
 * falls back to the backtracker. ~4M rooms ≈ up to ~12M edges in 3D.
 */
MazeGenerator.KRUSKAL_ROOM_LIMIT = 4_000_000;

if (typeof window !== 'undefined') {
  window.MazeGenerator = MazeGenerator;
  window.MAZE_ALGORITHMS = MAZE_ALGORITHMS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MazeGenerator, MAZE_ALGORITHMS };
}
