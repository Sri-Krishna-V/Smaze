'use strict';

/**
 * Utility functions for SMaze application
 */

/**
 * Creates a seeded pseudo-random number generator (mulberry32).
 *
 * Returns a function producing floats in [0, 1). Seeding makes maze
 * generation reproducible, which powers the shareable-seed feature.
 * @param {number} seed - 32-bit unsigned integer seed.
 * @returns {() => number} A deterministic random function.
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a random 32-bit seed suitable for mulberry32.
 * @returns {number} A non-negative integer seed.
 */
function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @param {() => number} [rng=Math.random] - Random source (e.g. a seeded RNG).
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calculates Manhattan distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Manhattan distance
 */
function manhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculates path length from a path array
 * @param {Array} path - Array of path coordinates
 * @returns {number} Path length
 */
function calculatePathLength(path) {
  return Math.max(0, path.length - 1);
}

/**
 * Shows a transient toast notification, stacked in a corner so it never
 * covers the maze. Toasts auto-dismiss and are announced to screen readers
 * via the container's aria-live region.
 * @param {string} text - Message text to display.
 * @param {('info'|'success'|'error')} [type='info'] - Visual variant.
 * @param {number} [duration=2600] - Time in ms before auto-dismiss.
 */
function showMessage(text, type = 'info', duration = 2600) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = text;
  container.appendChild(toast);

  // Trigger enter animation on the next frame.
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  const remove = () => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback removal if the transition never fires (e.g. reduced motion).
    setTimeout(() => toast.remove(), 400);
  };

  setTimeout(remove, duration);
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validates maze size input
 * @param {number} size - Size to validate
 * @returns {number} Valid maze size (always odd)
 */
function validateMazeSize(size) {
  const parsed = parseInt(size, 10);
  if (isNaN(parsed) || parsed < 11) return 11;
  if (parsed > 99) return 99;
  return parsed % 2 === 0 ? parsed + 1 : parsed;
}

/**
 * Checks if coordinates are within maze bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} mazeSize - Size of the maze
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinate(x, y, mazeSize) {
  return x >= 0 && x < mazeSize && y >= 0 && y < mazeSize;
}

/**
 * Gets available directions from a position
 * @param {number} x - Current X position
 * @param {number} y - Current Y position
 * @returns {Array} Array of direction objects
 */
function getDirections(x, y) {
  return [
    { x: x + 1, y: y, direction: 'east' },
    { x: x - 1, y: y, direction: 'west' },
    { x: x, y: y + 1, direction: 'south' },
    { x: x, y: y - 1, direction: 'north' }
  ];
}

/**
 * Formats a duration in seconds for display.
 * @param {number} seconds - Time in seconds.
 * @returns {string} Formatted value, e.g. "1.23s".
 */
function formatTime(seconds) {
  return `${seconds.toFixed(2)}s`;
}

/**
 * Creates a 2D array filled with a default value
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {*} defaultValue - Default value to fill
 * @returns {Array} 2D array
 */
function create2DArray(rows, cols, defaultValue = 0) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => defaultValue)
  );
}

// Export functions for potential future module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mulberry32,
    randomSeed,
    shuffleArray,
    manhattanDistance,
    calculatePathLength,
    showMessage,
    debounce,
    validateMazeSize,
    isValidCoordinate,
    getDirections,
    formatTime,
    create2DArray
  };
}
