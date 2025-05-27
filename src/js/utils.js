'use strict';

/**
 * Utility functions for SMaze application
 */

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} The shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
 * Shows a message with animation
 * @param {string} text - Message text to display
 */
function showMessage(text) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  
  messageDiv.textContent = text;
  messageDiv.style.animation = 'none';
  // Force reflow
  void messageDiv.offsetWidth;
  messageDiv.style.animation = '';
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
  if (isNaN(parsed) || parsed < 10) return 11;
  if (parsed > 100) return 99;
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
 * Formats time in seconds to display format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  return `Time: ${seconds.toFixed(2)}s`;
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
