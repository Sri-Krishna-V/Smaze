'use strict';

/**
 * Application entry point for SMaze.
 *
 * Wires the DOM controls to the Game, owns the single keyboard handler,
 * renders the live stats panel and compare results, manages the win overlay
 * and on-screen touch controls, and keeps the maze state shareable via the URL
 * hash (size, generation algorithm, seed, pathfinding algorithm).
 */

/* global Game, showMessage, debounce, validateMazeSize, formatTime,
   MAZE_ALGORITHMS */

class App {
  constructor() {
    this.elements = {};
    this.game = null;
    this.init();
  }

  init() {
    this.cacheElements();
    this.setupGame();
    if (!this.game) return;
    this.setupEventListeners();
    this.applyStateFromHash();
  }

  /**
   * Cache every interactive element by id. Missing ids are tolerated so the
   * app degrades gracefully if markup changes.
   */
  cacheElements() {
    const ids = [
      'algorithm', 'genAlgorithm', 'speed', 'speedValue', 'size', 'seed',
      'solveBtn', 'stopBtn', 'resetBtn', 'newMazeBtn', 'changeSizeBtn',
      'applySeedBtn', 'randomSeedBtn', 'compareBtn',
      'statStatus', 'statTime', 'statNodes', 'statFrontier', 'statPath',
      'statExplored', 'statMoves', 'exploreBar',
      'compareResults', 'compareTableBody',
      'winOverlay', 'winStats', 'winCloseBtn', 'dpad'
    ];
    for (const id of ids) {
      this.elements[id] = document.getElementById(id);
    }
  }

  setupGame() {
    try {
      this.game = new Game('mazeCanvas', {
        onStats: (stats) => this.renderStats(stats),
        onSolveStateChange: (solving) => this.updateControls(solving),
        onWin: (info) => this.showWin(info)
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
      showMessage('Failed to initialize game. Please refresh the page.', 'error', 6000);
    }
  }

  /* ----------------------------------------------------------------- *
   * Event wiring
   * ----------------------------------------------------------------- */

  setupEventListeners() {
    const el = this.elements;

    el.solveBtn.addEventListener('click', () => this.handleSolve());
    el.stopBtn.addEventListener('click', () => this.handleStop());
    el.resetBtn.addEventListener('click', () => this.handleReset());
    el.newMazeBtn.addEventListener('click', () => this.handleNewMaze());
    el.changeSizeBtn.addEventListener('click', () => this.handleSizeChange());

    if (el.compareBtn) el.compareBtn.addEventListener('click', () => this.handleCompare());
    if (el.applySeedBtn) el.applySeedBtn.addEventListener('click', () => this.handleApplySeed());
    if (el.randomSeedBtn) el.randomSeedBtn.addEventListener('click', () => this.handleRandomSeed());

    if (el.genAlgorithm) {
      el.genAlgorithm.addEventListener('change', () => this.handleGenAlgorithmChange());
    }

    if (el.speed) {
      el.speed.addEventListener('input', () => {
        const value = parseInt(el.speed.value, 10);
        this.game.setSpeed(value);
        if (el.speedValue) el.speedValue.textContent = `${value}`;
      });
    }

    if (el.winCloseBtn) {
      el.winCloseBtn.addEventListener('click', () => {
        this.hideWin();
        this.game.resetGame(); // Return the player to the start for a fresh run.
      });
    }

    this.setupKeyboard();
    this.setupTouchControls();

    window.addEventListener('resize', debounce(() => {
      if (this.game && !this.game.isCurrentlyAutoSolving()) {
        this.game.setupCanvas();
      }
    }, 200));
  }

  /**
   * The single keyboard entry point: movement plus action shortcuts.
   */
  setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const move = this.movementForKey(event.key);
      if (move) {
        event.preventDefault();
        this.game.move(move.dx, move.dy);
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          this.game.isCurrentlyAutoSolving() ? this.handleStop() : this.handleSolve();
          break;
        case 'KeyR':
          event.preventDefault();
          this.handleReset();
          break;
        case 'KeyN':
          event.preventDefault();
          this.handleNewMaze();
          break;
        case 'KeyC':
          event.preventDefault();
          this.handleCompare();
          break;
        case 'Escape':
          event.preventDefault();
          if (this.elements.winOverlay && !this.elements.winOverlay.hidden) {
            this.hideWin();
          } else {
            this.handleStop();
          }
          break;
      }
    });
  }

  /**
   * Map a key to a movement delta (WASD or arrow keys).
   * @returns {{dx: number, dy: number}|null}
   */
  movementForKey(key) {
    const map = {
      w: { dx: 0, dy: -1 }, ArrowUp: { dx: 0, dy: -1 },
      s: { dx: 0, dy: 1 }, ArrowDown: { dx: 0, dy: 1 },
      a: { dx: -1, dy: 0 }, ArrowLeft: { dx: -1, dy: 0 },
      d: { dx: 1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 }
    };
    return map[key] || map[key.toLowerCase?.()] || null;
  }

  /**
   * On-screen D-pad plus swipe gestures for touch devices.
   */
  setupTouchControls() {
    if (this.elements.dpad) {
      this.elements.dpad.addEventListener('click', (event) => {
        const button = event.target.closest('[data-dir]');
        if (!button) return;
        const deltas = {
          up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
          left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
        };
        const delta = deltas[button.dataset.dir];
        if (delta) this.game.move(delta.dx, delta.dy);
      });
    }

    const canvas = this.game.canvas;
    let startX = 0;
    let startY = 0;
    canvas.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 24) return; // Ignore taps.
      if (absX > absY) {
        this.game.move(dx > 0 ? 1 : -1, 0);
      } else {
        this.game.move(0, dy > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------------- *
   * Action handlers
   * ----------------------------------------------------------------- */

  handleSolve() {
    if (this.game.isCurrentlyAutoSolving()) return;
    this.hideCompare();
    this.game.startAutoSolving(this.elements.algorithm.value);
  }

  handleStop() {
    if (!this.game.isCurrentlyAutoSolving()) return;
    this.game.stopAutoSolving();
    showMessage('Solver stopped', 'info');
  }

  handleReset() {
    this.game.resetGame();
    this.hideCompare();
    showMessage('Maze reset', 'info');
  }

  handleNewMaze() {
    this.hideCompare();
    this.game.generateNewMaze({ algorithm: this.elements.genAlgorithm?.value, seed: null });
    this.syncSeedInput();
    this.writeHash();
    showMessage('New maze generated', 'info');
  }

  handleSizeChange() {
    const requested = parseInt(this.elements.size.value, 10);
    const size = validateMazeSize(requested);
    if (size !== requested) {
      this.elements.size.value = size;
      showMessage(`Size adjusted to ${size} (odd, 11–99)`, 'info');
    }
    this.hideCompare();
    this.game.mazeGenerator.size = size;
    this.game.generateNewMaze({ algorithm: this.elements.genAlgorithm?.value, seed: null });
    this.game.setupCanvas();
    this.syncSeedInput();
    this.writeHash();
  }

  handleGenAlgorithmChange() {
    this.hideCompare();
    this.game.generateNewMaze({ algorithm: this.elements.genAlgorithm.value, seed: null });
    this.syncSeedInput();
    this.writeHash();
  }

  handleApplySeed() {
    const seed = parseInt(this.elements.seed.value, 10);
    if (Number.isNaN(seed)) {
      showMessage('Enter a numeric seed', 'error');
      return;
    }
    this.hideCompare();
    this.game.generateNewMaze({ algorithm: this.elements.genAlgorithm?.value, seed });
    this.writeHash();
    showMessage(`Maze regenerated from seed ${seed}`, 'info');
  }

  handleRandomSeed() {
    this.hideCompare();
    this.game.generateNewMaze({ algorithm: this.elements.genAlgorithm?.value, seed: null });
    this.syncSeedInput();
    this.writeHash();
  }

  handleCompare() {
    if (this.game.isCurrentlyAutoSolving()) {
      showMessage('Stop the solver before comparing', 'info');
      return;
    }
    const results = this.game.compareAlgorithms();
    this.renderCompare(results);
  }

  /* ----------------------------------------------------------------- *
   * UI rendering
   * ----------------------------------------------------------------- */

  /**
   * Reflect the current metrics in the stats panel.
   * @param {Object} stats
   */
  renderStats(stats) {
    const el = this.elements;
    const set = (node, value) => { if (node) node.textContent = value; };

    const statusLabels = {
      ready: 'Ready', playing: 'Playing', solving: 'Solving…',
      solved: 'Solved', 'no-solution': 'No solution', won: 'You won!'
    };
    set(el.statStatus, statusLabels[stats.status] || 'Ready');
    set(el.statTime, formatTime(stats.timeSeconds));
    set(el.statNodes, stats.nodesExplored.toLocaleString());
    set(el.statFrontier, stats.frontier.toLocaleString());
    set(el.statPath, stats.pathLength ? stats.pathLength.toLocaleString() : '—');
    set(el.statExplored, `${stats.exploredPct.toFixed(1)}%`);
    set(el.statMoves, stats.moves.toLocaleString());

    if (el.exploreBar) {
      el.exploreBar.style.width = `${Math.min(100, stats.exploredPct)}%`;
    }
  }

  /**
   * Enable/disable controls based on whether the solver is running.
   * @param {boolean} solving
   */
  updateControls(solving) {
    const el = this.elements;
    const lock = [
      el.solveBtn, el.algorithm, el.genAlgorithm, el.changeSizeBtn,
      el.size, el.seed, el.applySeedBtn, el.randomSeedBtn,
      el.newMazeBtn, el.compareBtn
    ];
    for (const node of lock) {
      if (node) node.disabled = solving;
    }
    if (el.stopBtn) el.stopBtn.disabled = !solving;
    if (el.solveBtn) el.solveBtn.textContent = solving ? 'Solving…' : 'Solve';
  }

  /**
   * Render the compare-mode results table, highlighting the shortest path
   * and the fewest nodes explored.
   * @param {Array} results
   */
  renderCompare(results) {
    const tbody = this.elements.compareTableBody;
    if (!tbody || !this.elements.compareResults) return;

    const minPath = Math.min(...results.filter(r => r.found).map(r => r.pathLength));
    const minNodes = Math.min(...results.map(r => r.nodesExplored));

    tbody.innerHTML = '';
    for (const r of results) {
      const row = document.createElement('tr');
      const path = r.found ? r.pathLength : '—';
      row.innerHTML = `
        <td>${r.name}</td>
        <td class="${r.found && r.pathLength === minPath ? 'is-best' : ''}">${path}</td>
        <td class="${r.nodesExplored === minNodes ? 'is-best' : ''}">${r.nodesExplored.toLocaleString()}</td>
        <td>${r.timeMs.toFixed(2)} ms</td>`;
      tbody.appendChild(row);
    }
    this.elements.compareResults.hidden = false;
  }

  hideCompare() {
    if (this.elements.compareResults) this.elements.compareResults.hidden = true;
  }

  /**
   * Show the win overlay with final stats.
   * @param {{timeSeconds: number, moves: number}} info
   */
  showWin(info) {
    const overlay = this.elements.winOverlay;
    if (!overlay) {
      showMessage('Congratulations! You solved the maze!', 'success');
      return;
    }
    if (this.elements.winStats) {
      this.elements.winStats.textContent =
        `Time ${formatTime(info.timeSeconds)} · ${info.moves} moves`;
    }
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  }

  hideWin() {
    const overlay = this.elements.winOverlay;
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  /* ----------------------------------------------------------------- *
   * Seed + URL hash state
   * ----------------------------------------------------------------- */

  syncSeedInput() {
    if (this.elements.seed) {
      this.elements.seed.value = this.game.mazeGenerator.getSeed();
    }
  }

  /**
   * Encode the current state into location.hash for sharing/bookmarking.
   */
  writeHash() {
    const params = new URLSearchParams({
      size: this.game.mazeGenerator.getSize(),
      gen: this.game.mazeGenerator.getAlgorithm(),
      seed: this.game.mazeGenerator.getSeed(),
      algo: this.elements.algorithm.value
    });
    history.replaceState(null, '', `#${params.toString()}`);
  }

  /**
   * Restore state from location.hash on load, then sync controls + the maze.
   */
  applyStateFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const el = this.elements;

    const size = params.has('size') ? validateMazeSize(parseInt(params.get('size'), 10)) : null;
    const gen = params.get('gen');
    const seedRaw = params.get('seed');
    const algo = params.get('algo');

    if (size && el.size) el.size.value = size;
    if (gen && el.genAlgorithm && MAZE_ALGORITHMS.includes(gen)) el.genAlgorithm.value = gen;
    if (algo && el.algorithm) el.algorithm.value = algo;
    if (el.speed) {
      this.game.setSpeed(parseInt(el.speed.value, 10));
      if (el.speedValue) el.speedValue.textContent = el.speed.value;
    }

    const seed = seedRaw !== null && seedRaw !== '' ? parseInt(seedRaw, 10) : null;
    if (size) this.game.mazeGenerator.size = size;
    this.game.generateNewMaze({
      algorithm: el.genAlgorithm?.value,
      seed: Number.isNaN(seed) ? null : seed
    });
    this.game.setupCanvas();
    this.syncSeedInput();
    this.writeHash();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.smazeApp = new App();
  } catch (error) {
    console.error('Failed to initialize SMaze:', error);
    showMessage('Failed to initialize application. Please refresh.', 'error', 6000);
  }
});

window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
