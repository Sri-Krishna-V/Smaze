'use strict';

/**
 * Main application entry point for SMaze
 * Handles UI interactions and coordinates game components
 */

class App {
  constructor() {
    this.game = null;
    this.elements = {};
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.cacheElements();
    this.validateElements();
    this.setupGame();
    this.setupEventListeners();
    this.updateUI();
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    this.elements = {
      algorithm: document.getElementById('algorithm'),
      solveBtn: document.getElementById('solveBtn'),
      stopBtn: document.getElementById('stopBtn'),
      resetBtn: document.getElementById('resetBtn'),
      newMazeBtn: document.getElementById('newMazeBtn'),
      size: document.getElementById('size'),
      changeSizeBtn: document.getElementById('changeSizeBtn'),
      timer: document.getElementById('timer'),
      message: document.getElementById('message')
    };
  }

  /**
   * Validate that all required elements exist
   */
  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Setup the game instance
   */
  setupGame() {
    try {
      this.game = new Game('mazeCanvas');
    } catch (error) {
      console.error('Failed to initialize game:', error);
      showMessage('Failed to initialize game. Please refresh the page.');
    }
  }

  /**
   * Setup event listeners for UI elements
   */
  setupEventListeners() {
    // Algorithm solving
    this.elements.solveBtn.addEventListener('click', () => {
      this.handleSolveClick();
    });

    // Stop solving
    this.elements.stopBtn.addEventListener('click', () => {
      this.handleStopClick();
    });

    // Reset player position
    this.elements.resetBtn.addEventListener('click', () => {
      this.handleResetClick();
    });

    // Generate new maze
    this.elements.newMazeBtn.addEventListener('click', () => {
      this.handleNewMazeClick();
    });

    // Change maze size with debouncing
    this.elements.changeSizeBtn.addEventListener('click', () => {
      this.handleSizeChangeClick();
    });

    // Add keyboard shortcut hints
    this.setupKeyboardShortcuts();

    // Handle window resize
    window.addEventListener('resize', debounce(() => {
      this.handleWindowResize();
    }, 250));

    // Handle visibility change (pause when tab is not active)
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Only process shortcuts if not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (this.game.isCurrentlyAutoSolving()) {
            this.handleStopClick();
          } else {
            this.handleSolveClick();
          }
          break;
        case 'KeyR':
          event.preventDefault();
          this.handleResetClick();
          break;
        case 'KeyN':
          event.preventDefault();
          this.handleNewMazeClick();
          break;
        case 'Escape':
          event.preventDefault();
          this.handleStopClick();
          break;
      }
    });
  }

  /**
   * Handle solve button click
   */
  handleSolveClick() {
    if (this.game.isCurrentlyAutoSolving()) {
      showMessage('Algorithm is already running!');
      return;
    }

    const algorithmType = this.elements.algorithm.value;
    this.game.startAutoSolving(algorithmType);
    this.updateUI();
  }

  /**
   * Handle stop button click
   */
  handleStopClick() {
    this.game.stopAutoSolving();
    this.updateUI();
    showMessage('Algorithm stopped');
  }

  /**
   * Handle reset button click
   */
  handleResetClick() {
    this.game.resetGame();
    this.updateUI();
    showMessage('Player position reset');
  }

  /**
   * Handle new maze button click
   */
  handleNewMazeClick() {
    this.game.generateNewMaze();
    this.updateUI();
    showMessage('New maze generated');
  }

  /**
   * Handle maze size change
   */
  handleSizeChangeClick() {
    const newSize = this.validateSizeInput();
    if (newSize !== null) {
      this.game.updateMazeSize(newSize);
      this.updateUI();
      showMessage(`Maze size changed to ${newSize}x${newSize}`);
    }
  }

  /**
   * Validate and return maze size input
   * @returns {number|null} Valid size or null if invalid
   */
  validateSizeInput() {
    const inputValue = this.elements.size.value;
    const size = validateMazeSize(inputValue);
    
    if (size !== parseInt(inputValue, 10)) {
      this.elements.size.value = size;
      showMessage(`Size adjusted to ${size} (must be odd, 10-100)`);
    }
    
    return size;
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    // Re-render game to adjust to new window size
    if (this.game) {
      this.game.render();
    }
  }

  /**
   * Handle visibility change (tab switching)
   */
  handleVisibilityChange() {
    if (document.hidden && this.game && this.game.isCurrentlyAutoSolving()) {
      // Optionally pause solving when tab is not visible
      // this.game.stopAutoSolving();
      // showMessage('Algorithm paused (tab not visible)');
    }
  }

  /**
   * Update UI state based on game state
   */
  updateUI() {
    if (!this.game) return;

    const isAutoSolving = this.game.isCurrentlyAutoSolving();
    
    // Update button states
    this.elements.solveBtn.disabled = isAutoSolving;
    this.elements.stopBtn.disabled = !isAutoSolving;
    this.elements.algorithm.disabled = isAutoSolving;
    this.elements.changeSizeBtn.disabled = isAutoSolving;
    this.elements.size.disabled = isAutoSolving;

    // Update button text and appearance
    if (isAutoSolving) {
      this.elements.solveBtn.textContent = 'Solving...';
      this.elements.solveBtn.style.opacity = '0.6';
    } else {
      this.elements.solveBtn.textContent = 'Solve Maze';
      this.elements.solveBtn.style.opacity = '1';
    }

    // Update accessibility attributes
    this.elements.solveBtn.setAttribute('aria-disabled', isAutoSolving);
    this.elements.stopBtn.setAttribute('aria-disabled', !isAutoSolving);
  }

  /**
   * Get algorithm display name
   * @param {string} algorithmType - Algorithm type
   * @returns {string} Display name
   */
  getAlgorithmDisplayName(algorithmType) {
    const names = {
      'bfs': 'Breadth-First Search',
      'dfs': 'Depth-First Search',
      'dijkstra': "Dijkstra's Algorithm",
      'astar': 'A* Algorithm'
    };
    return names[algorithmType] || algorithmType;
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('Application error:', error);
    showMessage('An error occurred. Please refresh the page.');
  }

  /**
   * Get current application state
   * @returns {Object} Current state
   */
  getState() {
    return {
      algorithm: this.elements.algorithm.value,
      mazeSize: parseInt(this.elements.size.value, 10),
      isAutoSolving: this.game ? this.game.isCurrentlyAutoSolving() : false,
      playerPosition: this.game ? this.game.getPlayerPosition() : null
    };
  }

  /**
   * Cleanup application resources
   */
  cleanup() {
    if (this.game) {
      this.game.stopAutoSolving();
    }
    
    // Remove event listeners if needed for SPA scenarios
    // This would be expanded in a more complex application
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    
    // Make app globally available for debugging
    if (typeof window !== 'undefined') {
      window.smazeApp = app;
    }
    
    console.log('SMaze application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SMaze application:', error);
    
    // Show fallback error message
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = 'Failed to initialize application. Please refresh the page.';
      messageEl.style.display = 'block';
      messageEl.style.opacity = '1';
    }
  }
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
