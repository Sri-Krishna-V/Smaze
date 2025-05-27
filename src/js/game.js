'use strict';

/**
 * Game logic and rendering for SMaze
 * Handles player movement, maze rendering, and game state
 */

class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.mazeGenerator = new MazeGenerator(25);
    this.maze = null;
    this.player = null;
    this.cellSize = 0;
    this.currentAlgorithm = null;
    this.isAutoSolving = false;
    this.gameStartTime = null;
    this.timerInterval = null;
    
    // Colors for rendering
    this.colors = {
      wall: '#161b22',
      path: '#0d1117',
      player: '#58a6ff',
      goal: '#3fb950',
      visited: '#f85149',
      solution: '#7ee787',
      border: '#30363d'
    };
    
    this.init();
  }

  /**
   * Initialize the game
   */
  init() {
    this.generateNewMaze();
    this.setupEventListeners();
    this.resetGame();
  }

  /**
   * Generate a new maze
   */
  generateNewMaze() {
    // Generate the maze and store a reference to it
    const mazeData = this.mazeGenerator.generate();
    // Store a local copy of the maze for convenience (previously this was undefined)
    this.maze = mazeData;
    this.calculateCellSize();
    this.resetPlayer();
    this.render();
  }

  /**
   * Calculate cell size based on canvas and maze dimensions
   */
  calculateCellSize() {
    this.cellSize = Math.min(
      this.canvas.width / this.mazeGenerator.getSize(),
      this.canvas.height / this.mazeGenerator.getSize()
    );
  }

  /**
   * Reset player to start position
   */
  resetPlayer() {
    this.player = { ...this.mazeGenerator.getStartPosition() };
  }

  /**
   * Reset game state
   */
  resetGame() {
    this.stopAutoSolving();
    this.resetPlayer();
    this.render();
    this.resetTimer();
  }

  /**
   * Set up keyboard event listeners
   */
  setupEventListeners() {
    document.addEventListener('keydown', (event) => {
      if (this.isAutoSolving) return;
      
      const { key } = event;
      const movement = this.getMovementFromKey(key);
      
      if (movement) {
        event.preventDefault();
        this.movePlayer(movement.dx, movement.dy);
      }
    });
  }

  /**
   * Get movement direction from key press
   * @param {string} key - Pressed key
   * @returns {Object|null} Movement object or null
   */
  getMovementFromKey(key) {
    const movements = {
      'w': { dx: 0, dy: -1 },
      'ArrowUp': { dx: 0, dy: -1 },
      's': { dx: 0, dy: 1 },
      'ArrowDown': { dx: 0, dy: 1 },
      'a': { dx: -1, dy: 0 },
      'ArrowLeft': { dx: -1, dy: 0 },
      'd': { dx: 1, dy: 0 },
      'ArrowRight': { dx: 1, dy: 0 }
    };
    
    return movements[key] || null;
  }

  /**
   * Move player by given offset
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   */
  movePlayer(dx, dy) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    
    if (this.isValidMove(newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
      this.render();
      this.checkWinCondition();
    }
  }

  /**
   * Check if move is valid
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if move is valid
   */
  isValidMove(x, y) {
    return (
      isValidCoordinate(x, y, this.mazeGenerator.getSize()) &&
      !this.mazeGenerator.isWall(x, y)
    );
  }

  /**
   * Check if player has won
   */
  checkWinCondition() {
    const goal = this.mazeGenerator.getGoalPosition();
    if (this.player.x === goal.x && this.player.y === goal.y) {
      this.handleWin();
    }
  }

  /**
   * Handle win condition
   */
  handleWin() {
    this.stopTimer();
    showMessage('Congratulations! You solved the maze!');
  }

  /**
   * Start auto-solving with specified algorithm
   * @param {string} algorithmType - Algorithm type
   */
  startAutoSolving(algorithmType) {
    if (this.isAutoSolving) {
      this.stopAutoSolving();
    }

    this.isAutoSolving = true;
    this.startTimer();
    
    const start = { ...this.player };
    const goal = this.mazeGenerator.getGoalPosition();
    
    try {
      // Get the maze data from the mazeGenerator
      const mazeData = this.mazeGenerator.getMaze();
      
      if (!mazeData) {
        throw new Error('Maze data not available');
      }
      
      // Create algorithm with proper error handling
      if (typeof createAlgorithm !== 'function') {
        throw new Error('createAlgorithm function not available. Check script loading order.');
      }
      
      this.currentAlgorithm = createAlgorithm(algorithmType, mazeData, start, goal);
      
      if (!this.currentAlgorithm || typeof this.currentAlgorithm.start !== 'function') {
        throw new Error(`Algorithm ${algorithmType} was created but doesn't have a start method`);
      }
      
      this.currentAlgorithm.start(
        (x, y) => this.visualizeStep(x, y),
        (path) => this.handleSolutionComplete(path, algorithmType)
      );
    } catch (error) {
      console.error('Error starting algorithm:', error);
      showMessage('Error starting pathfinding algorithm: ' + error.message);
      this.stopAutoSolving();
    }
  }

  /**
   * Stop auto-solving
   */
  stopAutoSolving() {
    if (this.currentAlgorithm) {
      this.currentAlgorithm.stop();
      this.currentAlgorithm = null;
    }
    this.isAutoSolving = false;
    this.stopTimer();
  }

  /**
   * Visualize algorithm step
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  visualizeStep(x, y) {
    this.renderCell(x, y, this.colors.visited);
  }

  /**
   * Handle solution completion
   * @param {Array|null} path - Solution path or null if no solution
   * @param {string} algorithmType - Algorithm type used
   */
  handleSolutionComplete(path, algorithmType) {
    this.stopTimer();
    this.isAutoSolving = false;
    
    if (path) {
      this.renderSolutionPath(path);
      const pathLength = calculatePathLength(path);
      showMessage(`Maze solved with ${algorithmType.toUpperCase()}! Path length: ${pathLength}`);
    } else {
      showMessage('No solution found!');
    }
  }

  /**
   * Render solution path
   * @param {Array} path - Array of path coordinates
   */
  renderSolutionPath(path) {
    for (const { x, y } of path) {
      this.renderCell(x, y, this.colors.solution);
    }
    
    // Re-render player and goal
    this.renderPlayer();
    this.renderGoal();
  }

  /**
   * Update maze size
   * @param {number} newSize - New maze size
   */
  updateMazeSize(newSize) {
    this.mazeGenerator.updateSize(newSize);
    this.generateNewMaze();
  }

  /**
   * Render the entire game
   */
  render() {
    this.clearCanvas();
    this.renderMaze();
    this.renderPlayer();
    this.renderGoal();
  }

  /**
   * Clear the canvas
   */
  clearCanvas() {
    this.ctx.fillStyle = this.colors.path;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render the maze walls
   */
  renderMaze() {
    const size = this.mazeGenerator.getSize();
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.mazeGenerator.isWall(x, y)) {
          this.renderCell(x, y, this.colors.wall);
        }
      }
    }
  }

  /**
   * Render player
   */
  renderPlayer() {
    this.renderCell(this.player.x, this.player.y, this.colors.player);
  }

  /**
   * Render goal
   */
  renderGoal() {
    const goal = this.mazeGenerator.getGoalPosition();
    this.renderCell(goal.x, goal.y, this.colors.goal);
  }

  /**
   * Render a single cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - Cell color
   */
  renderCell(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.cellSize,
      y * this.cellSize,
      this.cellSize,
      this.cellSize
    );
  }

  /**
   * Start game timer
   */
  startTimer() {
    if (this.timerInterval) {
      this.stopTimer();
    }
    
    this.gameStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.updateTimerDisplay();
    }, 10);
  }

  /**
   * Stop game timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Reset game timer
   */
  resetTimer() {
    this.stopTimer();
    this.gameStartTime = null;
    this.updateTimerDisplay();
  }

  /**
   * Update timer display
   */
  updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    if (this.gameStartTime) {
      const elapsedSeconds = (Date.now() - this.gameStartTime) / 1000;
      timerElement.textContent = formatTime(elapsedSeconds);
    } else {
      timerElement.textContent = formatTime(0);
    }
  }

  /**
   * Get current maze
   * @returns {Array} Current maze array
   */
  getMaze() {
    return this.maze;
  }

  /**
   * Get current player position
   * @returns {Object} Player position {x, y}
   */
  getPlayerPosition() {
    return { ...this.player };
  }

  /**
   * Get maze generator
   * @returns {MazeGenerator} Maze generator instance
   */
  getMazeGenerator() {
    return this.mazeGenerator;
  }

  /**
   * Check if currently auto-solving
   * @returns {boolean} True if auto-solving
   */
  isCurrentlyAutoSolving() {
    return this.isAutoSolving;
  }
}
