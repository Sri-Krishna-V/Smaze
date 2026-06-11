'use strict';

/**
 * Index-based, typed-array grid model for SMaze.
 *
 * This is the foundation that lets the same maze code drive both very large 2D
 * mazes and 3D mazes. Cells live in a single flat Uint8Array (0 = passable,
 * 1 = wall) addressed by a linear index — ~1 byte per cell, versus the heavy
 * nested-array + per-cell-object representation it replaces. That keeps memory
 * at the browser's real ceiling: a few thousand cells per side in 2D, a few
 * hundred in 3D (3D grows as N^3).
 *
 * The grid is dimension-agnostic. `dims` is 2 or 3 and `neighbors(i)` yields the
 * 4 orthogonal neighbors in 2D or 6 in 3D, so generators and pathfinders are
 * written once and work for both.
 *
 * Index layout:
 *   2D: i = y * size + x
 *   3D: i = (z * size + y) * size + x
 */
class Grid {
  /**
   * @param {number} size - Cells per side (odd; identical on every axis).
   * @param {2|3} [dims=2] - Number of spatial dimensions.
   */
  constructor(size, dims = 2) {
    this.size = size;
    this.dims = dims === 3 ? 3 : 2;
    this.area = size * size;            // cells per 2D layer (also the z-stride)
    this.cellCount = this.dims === 3 ? this.area * size : this.area;
    // 0 = passable, 1 = wall. Start fully walled; generators carve passages.
    this.cells = new Uint8Array(this.cellCount).fill(1);
  }

  /* ------------------------------------------------------------------ *
   * Index <-> coordinate mapping
   * ------------------------------------------------------------------ */

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [z=0]
   * @returns {number} Linear index for the given coordinates.
   */
  index(x, y, z = 0) {
    return this.dims === 3
      ? (z * this.size + y) * this.size + x
      : y * this.size + x;
  }

  /**
   * @param {number} i - Linear index.
   * @returns {{x: number, y: number, z: number}} Coordinates for the index.
   */
  coords(i) {
    const s = this.size;
    if (this.dims === 3) {
      return {
        x: i % s,
        y: Math.floor(i / s) % s,
        z: Math.floor(i / this.area)
      };
    }
    return { x: i % s, y: Math.floor(i / s), z: 0 };
  }

  /* ------------------------------------------------------------------ *
   * Cell access
   * ------------------------------------------------------------------ */

  get(i) { return this.cells[i]; }
  set(i, value) { this.cells[i] = value; }
  carve(i) { this.cells[i] = 0; }
  isWall(i) { return this.cells[i] === 1; }
  isPassable(i) { return this.cells[i] === 0; }

  /**
   * @returns {boolean} True if the coordinates lie inside the grid.
   */
  inBounds(x, y, z = 0) {
    const s = this.size;
    if (x < 0 || x >= s || y < 0 || y >= s) return false;
    if (this.dims === 3 && (z < 0 || z >= s)) return false;
    return true;
  }

  /**
   * Orthogonal in-bounds neighbor indices of cell `i` (4 in 2D, 6 in 3D).
   *
   * Writes into a caller-supplied array to avoid per-call allocation in the hot
   * generation/pathfinding loops; pass a reusable scratch array as `out`.
   * @param {number} i
   * @param {number[]} [out] - Reusable output array (cleared on entry).
   * @returns {number[]} The neighbor indices.
   */
  neighbors(i, out) {
    const result = out || [];
    result.length = 0;
    const s = this.size;
    const { x, y, z } = this.coords(i);

    if (x + 1 < s) result.push(i + 1);
    if (x - 1 >= 0) result.push(i - 1);
    if (y + 1 < s) result.push(i + s);
    if (y - 1 >= 0) result.push(i - s);
    if (this.dims === 3) {
      if (z + 1 < s) result.push(i + this.area);
      if (z - 1 >= 0) result.push(i - this.area);
    }
    return result;
  }

  /**
   * @returns {number} Number of passable cells (used to normalize the heatmap).
   */
  countPassable() {
    const cells = this.cells;
    let count = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === 0) count++;
    }
    return count;
  }
}

// Expose for the non-module browser environment (script-tag load order).
if (typeof window !== 'undefined') {
  window.Grid = Grid;
}

// Export for module/test use.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Grid };
}
