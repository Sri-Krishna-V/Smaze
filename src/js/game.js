'use strict';

/**
 * Game logic for SMaze (2D and 3D).
 *
 * Owns the maze {@link Grid}, the player, and the single requestAnimationFrame
 * loop that drives auto-solving. All drawing is delegated to a pluggable
 * renderer (Renderer2D for flat mazes, Renderer3D for volumetric ones) chosen by
 * dimension, so the game stays representation- and dimension-agnostic: positions
 * are integer cell indices, neighbor topology comes from the grid, and the
 * algorithms expose a synchronous `step()` that the game pumps a speed-controlled
 * number of times per frame.
 *
 * Communicates with the UI layer through callbacks supplied at construction:
 *   onStats(stats)                - live metrics changed
 *   onSolveStateChange(bool)      - auto-solving started (true) or stopped (false)
 *   onWin({ timeSeconds, moves }) - player reached the goal manually
 */

/* global MazeGenerator, Renderer2D, Renderer3D, createAlgorithm, showMessage,
   calculatePathLength, ALGORITHM_NAMES */

class Game {
  /**
   * @param {string} canvasId - Id of the target <canvas> (used for 2D).
   * @param {Object} [callbacks]
   */
  constructor(canvasId, callbacks = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.callbacks = callbacks;
    this.dims = 2;
    this.mazeGenerator = new MazeGenerator(25, { dims: this.dims });
    this.grid = null;
    this.renderer = null;

    this.playerIndex = -1;
    this.startIndex = -1;
    this.goalIndex = -1;
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
    this.solutionLength = 0;

    // Theme colors (kept in sync with the CSS custom properties).
    this.colors = {
      background: '#0d1117',
      wall: '#1c2330',
      player: '#58a6ff',
      goal: '#3fb950',
      solution: '#7ee787'
    };

    this.init();
  }

  init() {
    this._makeRenderer();
    this.renderer.resize();
    this.generateNewMaze();
  }

  /** Build the renderer that matches the current dimension. */
  _makeRenderer() {
    if (this.renderer) this.renderer.dispose();
    if (this.dims === 3 && typeof Renderer3D !== 'undefined') {
      this.renderer = new Renderer3D(this.canvas, this.colors);
    } else {
      this.renderer = new Renderer2D(this.canvas, this.colors);
    }
  }

  /**
   * Switch between 2D and 3D. Rebuilds the generator + renderer and regenerates.
   * @param {2|3} dims
   */
  setDimensions(dims) {
    const next = dims === 3 ? 3 : 2;
    if (next === this.dims) return;
    this.stopAutoSolving();
    this.dims = next;
    this.mazeGenerator = new MazeGenerator(this.mazeGenerator.getSize(), {
      dims: next,
      algorithm: this.mazeGenerator.getAlgorithm()
    });
    this._makeRenderer();
    this.renderer.resize();
    this.generateNewMaze();
  }

  setupCanvas() {
    this.renderer.resize();
    this.renderer.present();
  }

  /** True once mazes get large enough that cell-by-cell manual play stops making sense. */
  get manualPlayEnabled() {
    return this.dims === 2 && this.mazeGenerator.getSize() <= Game.MANUAL_PLAY_MAX_SIZE;
  }

  /* ------------------------------------------------------------------ *
   * Maze lifecycle
   * ------------------------------------------------------------------ */

  generateNewMaze(options = {}) {
    this.stopAutoSolving();
    this.grid = this.mazeGenerator.generate(options);
    this.startIndex = this.mazeGenerator.getStartIndex();
    this.goalIndex = this.mazeGenerator.getGoalIndex();
    this.passableCount = this.grid.countPassable();

    this.renderer.attach(this.grid, this.startIndex, this.goalIndex);
    this.resetPlayer();
    this.resetTimer();
    this.moves = 0;
    this.solutionLength = 0;
    this.status = 'ready';
    this.renderer.present();
    this.emitStats();
  }

  resetPlayer() {
    this.playerIndex = this.startIndex;
    this.renderer.setPlayer(this.playerIndex);
  }

  /** Reset to a fresh, unsolved state on the current maze. */
  resetGame() {
    this.stopAutoSolving();
    this.renderer.clearField();
    this.resetPlayer();
    this.resetTimer();
    this.moves = 0;
    this.solutionLength = 0;
    this.status = 'ready';
    this.renderer.present();
    this.emitStats();
  }

  /* ------------------------------------------------------------------ *
   * Manual play
   * ------------------------------------------------------------------ */

  /**
   * Move the player by an offset if the destination is open.
   * @param {number} dx
   * @param {number} dy
   * @param {number} [dz=0]
   */
  move(dx, dy, dz = 0) {
    if (this.isAutoSolving || !this.manualPlayEnabled) return;

    const p = this.grid.coords(this.playerIndex);
    const nx = p.x + dx, ny = p.y + dy, nz = p.z + dz;
    if (!this.grid.inBounds(nx, ny, nz)) return;
    const target = this.grid.index(nx, ny, nz);
    if (this.grid.isWall(target)) return;

    // Begin a fresh manual run when starting to move from any non-playing state.
    if (this.status !== 'playing') {
      this.status = 'playing';
      this.moves = 0;
      this.resetTimer();
      this.startTimer();
    }

    this.playerIndex = target;
    this.renderer.setPlayer(target);
    this.moves++;
    this.renderer.present();
    this.emitStats();
    this.checkWinCondition();
  }

  checkWinCondition() {
    if (this.playerIndex === this.goalIndex) {
      this.stopTimer();
      this.status = 'won';
      this.emitStats();
      if (this.callbacks.onWin) {
        this.callbacks.onWin({ timeSeconds: this.elapsedSeconds(), moves: this.moves });
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Auto-solving (single rAF loop)
   * ------------------------------------------------------------------ */

  startAutoSolving(algorithmType) {
    this.stopAutoSolving();
    this.resetPlayer();
    this.renderer.clearField();
    this.renderer.present();

    try {
      this.solveAlgo = createAlgorithm(algorithmType, this.grid, this.startIndex, this.goalIndex);
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

  _solveFrame() {
    if (!this.isAutoSolving || !this.solveAlgo) return;

    const budget = this.stepsPerFrame;
    const denom = this.passableCount || 1;
    let result = null;

    for (let i = 0; i < budget; i++) {
      result = this.solveAlgo.step();
      if (result.current >= 0) {
        this.renderer.paintVisited(result.current, this.solveAlgo.nodesExplored / denom);
      }
      if (result.done) break;
    }

    this.renderer.present();
    this.emitStats();

    if (result && result.done) {
      this._finishSolve(result.found, result.path);
      return;
    }
    this.rafId = requestAnimationFrame(() => this._solveFrame());
  }

  /**
   * Speed slider → steps pumped per frame. Exponential so the slider feels
   * responsive at both ends; capped to keep huge mazes near-instant.
   */
  get stepsPerFrame() {
    return Math.min(20000, Math.max(1, Math.round(Math.pow(1.12, this.speed))));
  }

  setSpeed(value) {
    this.speed = Math.min(100, Math.max(1, value));
  }

  _finishSolve(found, path) {
    this.cancelRaf();
    this.isAutoSolving = false;
    this.stopTimer();
    if (this.callbacks.onSolveStateChange) this.callbacks.onSolveStateChange(false);

    if (found && path) {
      this.status = 'solved';
      this.animatePath(path);
    } else {
      this.status = 'no-solution';
      this.emitStats();
      showMessage('No solution found!', 'error');
    }
  }

  /** Progressively reveal the solution path. */
  animatePath(path) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      for (const idx of path) this.renderer.paintPathCell(idx);
      this.renderer.present();
      this._afterPath(path);
      return;
    }

    const perFrame = Math.max(1, Math.round(path.length / 45));
    let index = 0;
    const draw = () => {
      const end = Math.min(index + perFrame, path.length);
      for (; index < end; index++) this.renderer.paintPathCell(path[index]);
      this.renderer.present();
      if (index < path.length) {
        this.rafId = requestAnimationFrame(draw);
      } else {
        this._afterPath(path);
      }
    };
    this.rafId = requestAnimationFrame(draw);
  }

  _afterPath(path) {
    this.solutionLength = calculatePathLength(path);
    this.emitStats();
    const name = ALGORITHM_NAMES[this.solveAlgorithmType] || this.solveAlgorithmType;
    showMessage(`Solved with ${name} — path length ${this.solutionLength}`, 'success');
  }

  stopAutoSolving() {
    const wasSolving = this.isAutoSolving;
    this.cancelRaf();
    this.solveAlgo = null;
    this.solutionLength = 0;
    this.isAutoSolving = false;
    this.stopTimer();

    if (wasSolving) {
      this.status = 'ready';
      if (this.renderer) {
        this.renderer.clearField();
        this.renderer.present();
      }
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

  /* ------------------------------------------------------------------ *
   * Compare mode
   * ------------------------------------------------------------------ */

  compareAlgorithms() {
    return ['bfs', 'dfs', 'dijkstra', 'astar'].map((key) => {
      const algo = createAlgorithm(key, this.grid, this.startIndex, this.goalIndex);
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

  /* ------------------------------------------------------------------ *
   * Timer & stats
   * ------------------------------------------------------------------ */

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

  elapsedSeconds() {
    return this.timerStart ? (performance.now() - this.timerStart) / 1000 : 0;
  }

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

  /* ------------------------------------------------------------------ *
   * Accessors / view controls
   * ------------------------------------------------------------------ */

  isCurrentlyAutoSolving() { return this.isAutoSolving; }
  getMazeGenerator() { return this.mazeGenerator; }

  /** Forward view interactions to the renderer when it supports them. */
  zoomBy(factor, sx, sy) {
    if (this.renderer && this.renderer.zoomBy) this.renderer.zoomBy(factor, sx, sy);
  }
  panBy(dx, dy) {
    if (this.renderer && this.renderer.panBy) this.renderer.panBy(dx, dy);
  }
  fitView() {
    if (this.renderer && this.renderer.fitView) {
      this.renderer.fitView();
      this.renderer.present();
    }
  }
}

/** Above this side length, manual cell-by-cell play is disabled (auto-solve focus). */
Game.MANUAL_PLAY_MAX_SIZE = 151;

if (typeof window !== 'undefined') {
  window.Game = Game;
}
