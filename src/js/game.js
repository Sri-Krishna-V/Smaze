'use strict';

/**
 * Game logic and canvas rendering for SMaze.
 *
 * Owns the maze, the player, and the single requestAnimationFrame loop that
 * drives auto-solving. Algorithms expose a synchronous `step()`; the Game pumps
 * a speed-controlled number of steps per frame, paints each newly explored cell
 * on a cool->warm heatmap, then reveals the solution path with a glow.
 *
 * Communicates with the UI layer through callbacks supplied at construction:
 *   onStats(stats)            - live metrics changed
 *   onSolveStateChange(bool)  - auto-solving started (true) or stopped (false)
 *   onWin({ timeSeconds, moves }) - player reached the goal manually
 */

/* global MazeGenerator, isValidCoordinate, createAlgorithm,
   showMessage, calculatePathLength, ALGORITHM_NAMES */

class Game {
  /**
   * @param {string} canvasId - Id of the target <canvas>.
   * @param {Object} [callbacks]
   */
  constructor(canvasId, callbacks = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.ctx = this.canvas.getContext('2d');
    this.callbacks = callbacks;
    this.mazeGenerator = new MazeGenerator(25);
    this.maze = null;

    this.player = null;
    this.cellSize = 0;
    this.cssSize = 0;
    this.passableCount = 0;

    this.solveAlgo = null;
    this.isAutoSolving = false;
    this.solveAlgorithmType = null;
    this.rafId = null;
    this.speed = 20; // Slider value in [1, 100].

    this.timerStart = null;
    this.timerInterval = null;
    this.moves = 0;
    this.status = 'idle';

    // Theme colors (kept in sync with the CSS custom properties).
    this.colors = {
      background: '#0d1117',
      wall: '#1c2330',
      wallEdge: '#2a3344',
      player: '#58a6ff',
      goal: '#3fb950',
      solution: '#7ee787'
    };

    this.init();
  }

  /**
   * Initialize canvas sizing and generate the first maze.
   */
  init() {
    this.setupCanvas();
    this.generateNewMaze();
  }

  /* ----------------------------------------------------------------- *
   * Canvas sizing (high-DPI aware)
   * ----------------------------------------------------------------- */

  /**
   * Size the canvas backing store to the device pixel ratio so rendering is
   * crisp on retina/high-DPI displays, while drawing in CSS-pixel units.
   */
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    // Fall back to the attribute width before the element has laid out.
    this.cssSize = Math.round(rect.width || this.canvas.width || 600);

    this.canvas.width = this.cssSize * dpr;
    this.canvas.height = this.cssSize * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    if (this.maze) {
      this.calculateCellSize();
      this.render();
    }
  }

  /**
   * Recompute the per-cell pixel size from the current CSS size and maze size.
   */
  calculateCellSize() {
    this.cellSize = this.cssSize / this.mazeGenerator.getSize();
  }

  /* ----------------------------------------------------------------- *
   * Maze lifecycle
   * ----------------------------------------------------------------- */

  /**
   * Generate a new maze, optionally overriding algorithm/seed.
   * @param {Object} [options] - Passed through to MazeGenerator.generate().
   */
  generateNewMaze(options = {}) {
    this.stopAutoSolving();
    this.maze = this.mazeGenerator.generate(options);
    this.passableCount = this._countPassable();
    this.calculateCellSize();
    this.resetPlayer();
    this.resetTimer();
    this.moves = 0;
    this.status = 'ready';
    this.render();
    this.emitStats();
  }

  /**
   * Count passable cells, used to normalize the exploration heatmap.
   * @private
   * @returns {number}
   */
  _countPassable() {
    let count = 0;
    for (const row of this.maze) {
      for (const cell of row) {
        if (cell === 0) count++;
      }
    }
    return count;
  }

  resetPlayer() {
    this.player = { ...this.mazeGenerator.getStartPosition() };
  }

  /**
   * Reset to a fresh, unsolved state on the current maze.
   */
  resetGame() {
    this.stopAutoSolving();
    this.resetPlayer();
    this.resetTimer();
    this.moves = 0;
    this.status = 'ready';
    this.render();
    this.emitStats();
  }

  /* ----------------------------------------------------------------- *
   * Manual play
   * ----------------------------------------------------------------- */

  /**
   * Move the player by an offset if the destination is open. Called by the
   * single keyboard/touch handler in app.js.
   * @param {number} dx
   * @param {number} dy
   */
  move(dx, dy) {
    if (this.isAutoSolving) return;

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    if (!this.isValidMove(newX, newY)) return;

    // Begin a fresh manual run whenever the player starts moving from any
    // non-playing state (ready, solved, won) — restarts the timer and counter.
    if (this.status !== 'playing') {
      this.status = 'playing';
      this.moves = 0;
      this.resetTimer();
      this.startTimer();
    }

    this.player.x = newX;
    this.player.y = newY;
    this.moves++;
    this.render();
    this.emitStats();
    this.checkWinCondition();
  }

  /**
   * @returns {boolean} True if (x, y) is in bounds and not a wall.
   */
  isValidMove(x, y) {
    return (
      isValidCoordinate(x, y, this.mazeGenerator.getSize()) &&
      !this.mazeGenerator.isWall(x, y)
    );
  }

  checkWinCondition() {
    const goal = this.mazeGenerator.getGoalPosition();
    if (this.player.x === goal.x && this.player.y === goal.y) {
      this.stopTimer();
      this.status = 'won';
      this.emitStats();
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          timeSeconds: this.elapsedSeconds(),
          moves: this.moves
        });
      }
    }
  }

  /* ----------------------------------------------------------------- *
   * Auto-solving (single rAF loop)
   * ----------------------------------------------------------------- */

  /**
   * Begin animating the chosen algorithm from the player's current position.
   * @param {string} algorithmType
   */
  startAutoSolving(algorithmType) {
    this.stopAutoSolving();
    this.resetPlayer();
    this.render();

    const start = { ...this.player };
    const goal = this.mazeGenerator.getGoalPosition();

    try {
      this.solveAlgo = createAlgorithm(algorithmType, this.maze, start, goal);
    } catch (error) {
      console.error('Error starting algorithm:', error);
      showMessage(`Could not start solver: ${error.message}`, 'error');
      return;
    }

    this.solveAlgorithmType = algorithmType;
    this.isAutoSolving = true;
    this.status = 'solving';
    this.startTimer();
    if (this.callbacks.onSolveStateChange) this.callbacks.onSolveStateChange(true);
    this.emitStats();

    this.rafId = requestAnimationFrame(() => this._solveFrame());
  }

  /**
   * Steps the active search forward by `stepsPerFrame`, painting as it goes.
   * @private
   */
  _solveFrame() {
    if (!this.isAutoSolving || !this.solveAlgo) return;

    const budget = this.stepsPerFrame;
    let result = null;

    for (let i = 0; i < budget; i++) {
      result = this.solveAlgo.step();
      if (result.current) {
        this.paintVisited(result.current.x, result.current.y);
      }
      if (result.done) break;
    }

    // Keep the start and goal markers visible above the heatmap.
    this.renderMarker(this.player.x, this.player.y, this.colors.player);
    this.renderGoal();
    this.emitStats();

    if (result && result.done) {
      this._finishSolve(result.found, result.path);
      return;
    }

    this.rafId = requestAnimationFrame(() => this._solveFrame());
  }

  /**
   * Speed slider -> steps pumped per animation frame. Exponential so the slider
   * feels responsive at both ends; capped to keep huge mazes near-instant.
   * @returns {number}
   */
  get stepsPerFrame() {
    return Math.min(4000, Math.max(1, Math.round(Math.pow(1.12, this.speed))));
  }

  /**
   * @param {number} value - Slider value in [1, 100].
   */
  setSpeed(value) {
    this.speed = Math.min(100, Math.max(1, value));
  }

  /**
   * Handle completion of the search: animate the path or report no solution.
   * @private
   */
  _finishSolve(found, path) {
    this.cancelRaf();
    this.isAutoSolving = false;
    this.stopTimer();
    if (this.callbacks.onSolveStateChange) this.callbacks.onSolveStateChange(false);

    if (found && path) {
      this.status = 'solved';
      this.solvedPath = path;
      this.animatePath(path);
    } else {
      this.status = 'no-solution';
      this.emitStats();
      showMessage('No solution found!', 'error');
    }
  }

  /**
   * Progressively reveal the solution path with a glow.
   * @param {Array<{x: number, y: number}>} path
   */
  animatePath(path) {
    const perFrame = Math.max(1, Math.round(path.length / 45));
    let index = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      for (const cell of path) this.renderCell(cell.x, cell.y, this.colors.solution);
      this.renderMarker(this.player.x, this.player.y, this.colors.player);
      this.renderGoal();
      this._afterPath(path);
      return;
    }

    const draw = () => {
      const end = Math.min(index + perFrame, path.length);
      for (; index < end; index++) {
        this.renderCell(path[index].x, path[index].y, this.colors.solution, true);
      }
      this.renderMarker(this.player.x, this.player.y, this.colors.player);
      this.renderGoal();

      if (index < path.length) {
        this.rafId = requestAnimationFrame(draw);
      } else {
        this._afterPath(path);
      }
    };
    this.rafId = requestAnimationFrame(draw);
  }

  /**
   * @private
   */
  _afterPath(path) {
    this.solutionLength = calculatePathLength(path);
    this.emitStats();
    const name = (ALGORITHM_NAMES[this.solveAlgorithmType] || this.solveAlgorithmType);
    showMessage(`Solved with ${name} — path length ${this.solutionLength}`, 'success');
  }

  /**
   * Stop any in-progress auto-solve and clear its visualization.
   */
  stopAutoSolving() {
    const wasSolving = this.isAutoSolving;
    this.cancelRaf();
    this.solveAlgo = null;
    this.solvedPath = null;
    this.solutionLength = 0;
    this.isAutoSolving = false;
    this.stopTimer();

    if (wasSolving) {
      this.status = 'ready';
      this.render();
      if (this.callbacks.onSolveStateChange) this.callbacks.onSolveStateChange(false);
      this.emitStats();
    }
  }

  cancelRaf() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /* ----------------------------------------------------------------- *
   * Compare mode
   * ----------------------------------------------------------------- */

  /**
   * Run every algorithm headlessly on the current maze and collect metrics.
   * @returns {Array<{key, name, found, pathLength, nodesExplored, timeMs}>}
   */
  compareAlgorithms() {
    const start = { ...this.mazeGenerator.getStartPosition() };
    const goal = this.mazeGenerator.getGoalPosition();
    return ['bfs', 'dfs', 'dijkstra', 'astar'].map((key) => {
      const algo = createAlgorithm(key, this.maze, start, goal);
      const t0 = performance.now();
      const { found, path, nodesExplored } = algo.runToCompletion();
      const timeMs = performance.now() - t0;
      return {
        key,
        name: ALGORITHM_NAMES[key] || key,
        found,
        pathLength: path ? calculatePathLength(path) : 0,
        nodesExplored,
        timeMs
      };
    });
  }

  /* ----------------------------------------------------------------- *
   * Rendering
   * ----------------------------------------------------------------- */

  render() {
    this.clearCanvas();
    this.renderMaze();
    this.renderMarker(this.player.x, this.player.y, this.colors.player);
    this.renderGoal();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.cssSize, this.cssSize);
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.cssSize, this.cssSize);
  }

  renderMaze() {
    const size = this.mazeGenerator.getSize();
    this.ctx.fillStyle = this.colors.wall;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.maze[y][x] === 1) {
          this.ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize + 0.5,
            this.cellSize + 0.5
          );
        }
      }
    }
  }

  /**
   * Paint a visited cell using a cool->warm heatmap keyed by how far the search
   * has progressed, so the exploration wavefront is legible at a glance.
   */
  paintVisited(x, y) {
    const ratio = this.passableCount
      ? Math.min(1, this.solveAlgo.nodesExplored / this.passableCount)
      : 0;
    // Hue sweeps azure (200) -> magenta (340) as exploration progresses.
    const hue = 200 + ratio * 140;
    this.ctx.fillStyle = `hsl(${hue}, 85%, 58%)`;
    this.ctx.fillRect(
      x * this.cellSize,
      y * this.cellSize,
      this.cellSize + 0.5,
      this.cellSize + 0.5
    );
  }

  /**
   * Fill a single cell with a solid color, optionally with a glow.
   */
  renderCell(x, y, color, glow = false) {
    if (glow) {
      this.ctx.save();
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = Math.max(4, this.cellSize * 0.8);
    }
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.cellSize,
      y * this.cellSize,
      this.cellSize + 0.5,
      this.cellSize + 0.5
    );
    if (glow) this.ctx.restore();
  }

  /**
   * Draw a rounded, glowing marker (player or goal) centered in its cell.
   */
  renderMarker(x, y, color) {
    const cx = x * this.cellSize + this.cellSize / 2;
    const cy = y * this.cellSize + this.cellSize / 2;
    const radius = Math.max(1.5, this.cellSize * 0.42);

    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = Math.max(4, this.cellSize * 1.2);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  renderGoal() {
    const goal = this.mazeGenerator.getGoalPosition();
    this.renderMarker(goal.x, goal.y, this.colors.goal);
  }

  /* ----------------------------------------------------------------- *
   * Timer & stats
   * ----------------------------------------------------------------- */

  startTimer() {
    this.stopTimer();
    this.timerStart = performance.now();
    this.timerInterval = setInterval(() => this.emitStats(), 50);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.stopTimer();
    this.timerStart = null;
  }

  /**
   * @returns {number} Seconds since the active timer started (0 if stopped).
   */
  elapsedSeconds() {
    return this.timerStart ? (performance.now() - this.timerStart) / 1000 : 0;
  }

  /**
   * Push the current metrics to the UI via the onStats callback.
   */
  emitStats() {
    if (!this.callbacks.onStats) return;
    const explored = this.solveAlgo ? this.solveAlgo.nodesExplored : 0;
    this.callbacks.onStats({
      status: this.status,
      algorithm: this.solveAlgorithmType,
      nodesExplored: explored,
      frontier: this.solveAlgo ? this.solveAlgo.frontierSize : 0,
      exploredPct: this.passableCount ? (explored / this.passableCount) * 100 : 0,
      pathLength: this.solutionLength || 0,
      moves: this.moves,
      timeSeconds: this.elapsedSeconds()
    });
  }

  /* ----------------------------------------------------------------- *
   * Accessors
   * ----------------------------------------------------------------- */

  getMaze() {
    return this.maze;
  }

  getPlayerPosition() {
    return { ...this.player };
  }

  getMazeGenerator() {
    return this.mazeGenerator;
  }

  isCurrentlyAutoSolving() {
    return this.isAutoSolving;
  }
}

if (typeof window !== 'undefined') {
  window.Game = Game;
}
