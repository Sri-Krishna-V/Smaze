'use strict';

/**
 * Maze generation using Kruskal's algorithm
 * Creates perfect mazes with exactly one path between any two points
 */

class MazeGenerator {
  /**
   * Creates a new MazeGenerator instance
   * @param {number} size - Size of the maze (should be odd)
   */
  constructor(size) {
    this.size = validateMazeSize(size);
    this.maze = null;
  }

  /**
   * Generates a new maze using Kruskal's algorithm
   * @returns {Array} 2D maze array (0 = path, 1 = wall)
   */
  generate() {
    this.maze = create2DArray(this.size, this.size, 1);
    const sets = create2DArray(this.size, this.size, 0);
    const walls = [];

    // Initialize cells and sets for Kruskal's algorithm
    this._initializeCellsAndSets(sets);
    
    // Create list of potential walls
    this._createWallsList(walls);
    
    // Shuffle walls for random generation
    shuffleArray(walls);
    
    // Apply Kruskal's algorithm
    this._applyKruskals(walls, sets);
    
    // Ensure entry and exit points
    this._createEntryAndExit();
    
    return this.maze;
  }

  /**
   * Initialize maze cells and disjoint sets
   * @private
   * @param {Array} sets - 2D array for disjoint sets
   */
  _initializeCellsAndSets(sets) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (y % 2 === 1 && x % 2 === 1) {
          this.maze[y][x] = 0; // Path cell
          sets[y][x] = y * this.size + x; // Unique set ID
        }
      }
    }
  }

  /**
   * Create list of walls between cells
   * @private
   * @param {Array} walls - Array to store wall objects
   */
  _createWallsList(walls) {
    for (let y = 1; y < this.size - 1; y += 2) {
      for (let x = 1; x < this.size - 1; x += 2) {
        // Horizontal wall (right)
        if (x < this.size - 2) {
          walls.push({
            x: x + 1,
            y: y,
            dx: 1,
            dy: 0
          });
        }
        // Vertical wall (down)
        if (y < this.size - 2) {
          walls.push({
            x: x,
            y: y + 1,
            dx: 0,
            dy: 1
          });
        }
      }
    }
  }

  /**
   * Apply Kruskal's algorithm to generate maze
   * @private
   * @param {Array} walls - Array of wall objects
   * @param {Array} sets - 2D array for disjoint sets
   */
  _applyKruskals(walls, sets) {
    while (walls.length > 0) {
      const wall = walls.pop();
      const x1 = wall.x - wall.dx;
      const y1 = wall.y - wall.dy;
      const x2 = wall.x + wall.dx;
      const y2 = wall.y + wall.dy;

      // Check if cells are in different sets
      if (sets[y1][x1] !== sets[y2][x2]) {
        // Remove wall (create passage)
        this.maze[wall.y][wall.x] = 0;

        // Merge sets
        this._mergeSets(sets, sets[y2][x2], sets[y1][x1]);
      }
    }
  }

  /**
   * Merge two disjoint sets
   * @private
   * @param {Array} sets - 2D array for disjoint sets
   * @param {number} oldSet - Set to be merged into newSet
   * @param {number} newSet - Target set for merging
   */
  _mergeSets(sets, oldSet, newSet) {
    for (let y = 1; y < this.size - 1; y += 2) {
      for (let x = 1; x < this.size - 1; x += 2) {
        if (sets[y][x] === oldSet) {
          sets[y][x] = newSet;
        }
      }
    }
  }

  /**
   * Create entry and exit points for the maze
   * @private
   */
  _createEntryAndExit() {
    // Entry at top-left
    this.maze[1][0] = 0;
    
    // Exit at bottom-right
    this.maze[this.size - 2][this.size - 1] = 0;
  }

  /**
   * Get the current maze
   * @returns {Array|null} Current maze or null if not generated
   */
  getMaze() {
    return this.maze;
  }

  /**
   * Get maze size
   * @returns {number} Maze size
   */
  getSize() {
    return this.size;
  }

  /**
   * Update maze size and regenerate
   * @param {number} newSize - New maze size
   * @returns {Array} New generated maze
   */
  updateSize(newSize) {
    this.size = validateMazeSize(newSize);
    return this.generate();
  }

  /**
   * Check if a position is a wall
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if position is a wall
   */
  isWall(x, y) {
    if (!this.maze || !isValidCoordinate(x, y, this.size)) {
      return true;
    }
    return this.maze[y][x] === 1;
  }

  /**
   * Check if a position is a path
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if position is a path
   */
  isPath(x, y) {
    return !this.isWall(x, y);
  }

  /**
   * Get start position
   * @returns {Object} Start position {x, y}
   */
  getStartPosition() {
    return { x: 0, y: 1 };
  }

  /**
   * Get goal position
   * @returns {Object} Goal position {x, y}
   */
  getGoalPosition() {
    return { x: this.size - 1, y: this.size - 2 };
  }
}
