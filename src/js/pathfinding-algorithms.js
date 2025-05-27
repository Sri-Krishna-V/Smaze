'use strict';

/**
 * Pathfinding algorithms for maze solving
 * Implements BFS, DFS, Dijkstra's, and A* algorithms
 *
 * NOTE: This file depends on utility functions from utils.js
 * Make sure utils.js is loaded before this file
 */

// Check if the required utility functions are available
if (typeof create2DArray === 'undefined' ||
    typeof isValidCoordinate === 'undefined' ||
    typeof manhattanDistance === 'undefined' ||
    typeof getDirections === 'undefined') {
  console.error('Required utility functions not found. Make sure utils.js is loaded before this file.');
  // Instead of just logging an error, we need to throw an error to prevent execution
  throw new Error('Required utility functions not found. Make sure utils.js is loaded before this file.');
}

/**
 * Priority Queue implementation for Dijkstra and A*
 */
class MinPriorityQueue {
  constructor(priorityFunction) {
    this.items = [];
    this.priority = priorityFunction || ((item) => item.priority);
  }

  /**
   * Add item to queue
   * @param {*} element - Element to add
   */
  enqueue(element) {
    this.items.push(element);
    this.items.sort((a, b) => this.priority(a) - this.priority(b));
  }

  /**
   * Remove and return highest priority item
   * @returns {*} Highest priority element
   */
  dequeue() {
    return this.items.shift();
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Get queue size
   * @returns {number} Number of items in queue
   */
  size() {
    return this.items.length;
  }
}

/**
 * Base pathfinding algorithm class
 */
class PathfindingAlgorithm {
  constructor(maze, start, goal) {
    this.maze = maze;
    this.start = start;
    this.goal = goal;
    this.mazeSize = maze.length;
    this.visited = create2DArray(this.mazeSize, this.mazeSize, false);
    this.cameFrom = create2DArray(this.mazeSize, this.mazeSize, null);
    this.isRunning = false;
    this.onStep = null; // Callback for visualization
    this.onComplete = null; // Callback for completion
  }

  /**
   * Check if position is the goal
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if position is goal
   */
  isGoal(x, y) {
    return x === this.goal.x && y === this.goal.y;
  }

  /**
   * Check if position is valid and unvisited
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if valid move
   */
  isValidMove(x, y) {
    return (
      isValidCoordinate(x, y, this.mazeSize) &&
      this.maze[y][x] === 0 &&
      !this.visited[y][x]
    );
  }

  /**
   * Reconstruct path from goal to start
   * @returns {Array} Path as array of coordinates
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
   * Get valid neighbors for a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of valid neighbor coordinates
   */
  getValidNeighbors(x, y) {
    return getDirections(x, y).filter(({ x: nx, y: ny }) =>
      this.isValidMove(nx, ny)
    );
  }

  /**
   * Stop the algorithm
   */
  stop() {
    this.isRunning = false;
  }
}

/**
 * Breadth-First Search implementation
 * Guarantees shortest path in unweighted graphs
 */
class BFSAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.queue = [];
  }

  /**
   * Start BFS algorithm
   * @param {Function} onStep - Callback for each step
   * @param {Function} onComplete - Callback for completion
   */
  start(onStep, onComplete) {
    this.onStep = onStep;
    this.onComplete = onComplete;
    this.isRunning = true;

    this.queue.push(this.start);
    this.visited[this.start.y][this.start.x] = true;

    this._step();
  }

  /**
   * Execute one step of BFS
   * @private
   */
  _step() {
    if (!this.isRunning || this.queue.length === 0) {
      this.onComplete && this.onComplete(null);
      return;
    }

    const current = this.queue.shift();
    
    if (this.onStep) {
      this.onStep(current.x, current.y);
    }

    if (this.isGoal(current.x, current.y)) {
      const path = this.reconstructPath();
      this.onComplete && this.onComplete(path);
      return;
    }

    const neighbors = this.getValidNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      this.visited[neighbor.y][neighbor.x] = true;
      this.cameFrom[neighbor.y][neighbor.x] = current;
      this.queue.push(neighbor);
    }

    // Continue with next step
    setTimeout(() => this._step(), 5);
  }
}

/**
 * Depth-First Search implementation
 * Fast exploration but doesn't guarantee shortest path
 */
class DFSAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.stack = [];
  }

  /**
   * Start DFS algorithm
   * @param {Function} onStep - Callback for each step
   * @param {Function} onComplete - Callback for completion
   */
  start(onStep, onComplete) {
    this.onStep = onStep;
    this.onComplete = onComplete;
    this.isRunning = true;

    this.stack.push(this.start);
    this.visited[this.start.y][this.start.x] = true;

    this._step();
  }

  /**
   * Execute one step of DFS
   * @private
   */
  _step() {
    if (!this.isRunning || this.stack.length === 0) {
      this.onComplete && this.onComplete(null);
      return;
    }

    const current = this.stack.pop();
    
    if (this.onStep) {
      this.onStep(current.x, current.y);
    }

    if (this.isGoal(current.x, current.y)) {
      const path = this.reconstructPath();
      this.onComplete && this.onComplete(path);
      return;
    }

    const neighbors = this.getValidNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      this.visited[neighbor.y][neighbor.x] = true;
      this.cameFrom[neighbor.y][neighbor.x] = current;
      this.stack.push(neighbor);
    }

    // Continue with next step
    setTimeout(() => this._step(), 5);
  }
}

/**
 * Dijkstra's Algorithm implementation
 * Guarantees shortest path in weighted graphs
 */
class DijkstraAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.distances = create2DArray(this.mazeSize, this.mazeSize, Infinity);
    this.pq = new MinPriorityQueue(node => node.distance);
  }

  /**
   * Start Dijkstra's algorithm
   * @param {Function} onStep - Callback for each step
   * @param {Function} onComplete - Callback for completion
   */
  start(onStep, onComplete) {
    this.onStep = onStep;
    this.onComplete = onComplete;
    this.isRunning = true;

    this.distances[this.start.y][this.start.x] = 0;
    this.pq.enqueue({
      x: this.start.x,
      y: this.start.y,
      distance: 0
    });

    this._step();
  }

  /**
   * Execute one step of Dijkstra's algorithm
   * @private
   */
  _step() {
    if (!this.isRunning || this.pq.isEmpty()) {
      this.onComplete && this.onComplete(null);
      return;
    }

    const current = this.pq.dequeue();
    
    if (this.visited[current.y][current.x]) {
      setTimeout(() => this._step(), 5);
      return;
    }

    this.visited[current.y][current.x] = true;
    
    if (this.onStep) {
      this.onStep(current.x, current.y);
    }

    if (this.isGoal(current.x, current.y)) {
      const path = this.reconstructPath();
      this.onComplete && this.onComplete(path);
      return;
    }

    const neighbors = getDirections(current.x, current.y).filter(({ x, y }) =>
      isValidCoordinate(x, y, this.mazeSize) &&
      this.maze[y][x] === 0 &&
      !this.visited[y][x]
    );

    for (const neighbor of neighbors) {
      const alt = this.distances[current.y][current.x] + 1;
      if (alt < this.distances[neighbor.y][neighbor.x]) {
        this.distances[neighbor.y][neighbor.x] = alt;
        this.cameFrom[neighbor.y][neighbor.x] = current;
        this.pq.enqueue({
          x: neighbor.x,
          y: neighbor.y,
          distance: alt
        });
      }
    }

    // Continue with next step
    setTimeout(() => this._step(), 5);
  }
}

/**
 * A* Algorithm implementation
 * Efficient directed search using heuristics
 */
class AStarAlgorithm extends PathfindingAlgorithm {
  constructor(maze, start, goal) {
    super(maze, start, goal);
    this.gScore = create2DArray(this.mazeSize, this.mazeSize, Infinity);
    this.fScore = create2DArray(this.mazeSize, this.mazeSize, Infinity);
    this.openSet = [];
  }

  /**
   * Heuristic function (Manhattan distance)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Heuristic value
   */
  heuristic(x, y) {
    return manhattanDistance(x, y, this.goal.x, this.goal.y);
  }

  /**
   * Start A* algorithm
   * @param {Function} onStep - Callback for each step
   * @param {Function} onComplete - Callback for completion
   */
  start(onStep, onComplete) {
    this.onStep = onStep;
    this.onComplete = onComplete;
    this.isRunning = true;

    this.gScore[this.start.y][this.start.x] = 0;
    this.fScore[this.start.y][this.start.x] = this.heuristic(this.start.x, this.start.y);
    
    this.openSet.push({
      x: this.start.x,
      y: this.start.y,
      f: this.fScore[this.start.y][this.start.x]
    });

    this._step();
  }

  /**
   * Execute one step of A* algorithm
   * @private
   */
  _step() {
    if (!this.isRunning || this.openSet.length === 0) {
      this.onComplete && this.onComplete(null);
      return;
    }

    // Find node with lowest f-score
    this.openSet.sort((a, b) => a.f - b.f);
    const current = this.openSet.shift();
    
    if (this.visited[current.y][current.x]) {
      setTimeout(() => this._step(), 5);
      return;
    }

    this.visited[current.y][current.x] = true;
    
    if (this.onStep) {
      this.onStep(current.x, current.y);
    }

    if (this.isGoal(current.x, current.y)) {
      const path = this.reconstructPath();
      this.onComplete && this.onComplete(path);
      return;
    }

    const neighbors = getDirections(current.x, current.y).filter(({ x, y }) =>
      isValidCoordinate(x, y, this.mazeSize) &&
      this.maze[y][x] === 0 &&
      !this.visited[y][x]
    );

    for (const neighbor of neighbors) {
      const tentativeGScore = this.gScore[current.y][current.x] + 1;

      if (tentativeGScore < this.gScore[neighbor.y][neighbor.x]) {
        this.cameFrom[neighbor.y][neighbor.x] = current;
        this.gScore[neighbor.y][neighbor.x] = tentativeGScore;
        this.fScore[neighbor.y][neighbor.x] = tentativeGScore + this.heuristic(neighbor.x, neighbor.y);
        
        this.openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          f: this.fScore[neighbor.y][neighbor.x]
        });
      }
    }

    // Continue with next step
    setTimeout(() => this._step(), 5);
  }
}

/**
 * Algorithm factory function
 * @param {string} algorithmType - Type of algorithm ('bfs', 'dfs', 'dijkstra', 'astar')
 * @param {Array} maze - 2D maze array
 * @param {Object} start - Start position {x, y}
 * @param {Object} goal - Goal position {x, y}
 * @returns {PathfindingAlgorithm} Algorithm instance
 */
function createAlgorithm(algorithmType, maze, start, goal) {
  // Make sure all required functions are available
  if (typeof create2DArray !== 'function' || 
      typeof isValidCoordinate !== 'function' || 
      typeof manhattanDistance !== 'function' || 
      typeof getDirections !== 'function') {
    throw new Error('Required utility functions not available. Please check utils.js is loaded.');
  }
  // Safety check to ensure we have a valid maze with expected format
  if (!maze || !Array.isArray(maze) || maze.length === 0 || !Array.isArray(maze[0])) {
    throw new Error('Invalid maze format');
  }
  
  // Safety check for start and goal positions
  if (!start || !goal || typeof start.x === 'undefined' || typeof start.y === 'undefined' || 
      typeof goal.x === 'undefined' || typeof goal.y === 'undefined') {
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

// Ensure the createAlgorithm function is available in the global scope
// This ensures that other modules can access it without issues
if (typeof window !== 'undefined') {
  window.createAlgorithm = createAlgorithm;
}
