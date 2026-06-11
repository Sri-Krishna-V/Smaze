'use strict';

/**
 * 2D canvas renderer for SMaze with pan/zoom that scales to huge mazes.
 *
 * The key idea: keep an offscreen "field" canvas at exactly 1 pixel per cell.
 * The base maze is rasterized into it once (via ImageData), and exploration /
 * solution cells are stamped in as 1px rects as they happen — each O(1). Every
 * frame the visible region is drawn to the on-screen canvas with a single
 * `drawImage` (nearest-neighbour, smoothing off). Render cost therefore depends
 * on the *viewport* pixel count, not on the maze size, so a 5000×5000 maze is as
 * cheap to display as a 25×25 one.
 *
 * The view is a square sub-region of the field, expressed in cell units:
 *   view = { x, y, cells }  →  scale = cssSize / view.cells  (screen px per cell)
 *
 * Markers (player, goal) are drawn as glowing overlays on top of the blit so
 * they stay visible even when a cell is sub-pixel.
 */

/* global Grid */

class Renderer2D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} colors - Theme colors (see Game.colors).
   */
  constructor(canvas, colors) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colors = colors;

    this.grid = null;
    this.size = 0;
    this.startIndex = -1;
    this.goalIndex = -1;
    this.playerIndex = -1;

    this.field = document.createElement('canvas');
    this.fieldCtx = this.field.getContext('2d');

    this.cssSize = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.view = { x: 0, y: 0, cells: 1 };
    this.minCells = 8; // Tightest zoom: ~8 cells across the viewport.
  }

  /** Mode tag so Game can branch on capabilities (e.g. manual play). */
  get dims() { return 2; }

  /**
   * Bind a freshly generated grid and rasterize its base into the field canvas.
   */
  attach(grid, startIndex, goalIndex) {
    this.grid = grid;
    this.size = grid.size;
    this.startIndex = startIndex;
    this.goalIndex = goalIndex;
    this.playerIndex = startIndex;

    this.field.width = this.size;
    this.field.height = this.size;
    this.fieldCtx.imageSmoothingEnabled = false;
    this._rasterizeBase();
    this.fitView();
  }

  /** Paint the static maze (walls vs background) into the field at 1px/cell. */
  _rasterizeBase() {
    const s = this.size;
    const img = this.fieldCtx.createImageData(s, s);
    const data = img.data;
    const cells = this.grid.cells;
    const wall = this._rgb(this.colors.wall);
    const bg = this._rgb(this.colors.background);

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i] === 1 ? wall : bg;
      const p = i * 4;
      data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
    }
    this.fieldCtx.putImageData(img, 0, 0);
  }

  /* ------------------------------------------------------------------ *
   * Sizing & view
   * ------------------------------------------------------------------ */

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.cssSize = Math.round(rect.width || this.canvas.width || 600);
    this.canvas.width = this.cssSize * this.dpr;
    this.canvas.height = this.cssSize * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Reset the view to frame the entire maze. */
  fitView() {
    this.view.x = 0;
    this.view.y = 0;
    this.view.cells = this.size;
  }

  get scale() {
    return this.cssSize / this.view.cells;
  }

  /** Zoom by `factor` (>1 zooms in) keeping the cell under (sx, sy) fixed. */
  zoomBy(factor, sx = this.cssSize / 2, sy = this.cssSize / 2) {
    const before = this._screenToCell(sx, sy);
    const next = Math.min(this.size, Math.max(this.minCells, this.view.cells / factor));
    this.view.cells = next;
    // Keep the cursor's cell anchored after the zoom.
    this.view.x = before.cx - sx / this.scale;
    this.view.y = before.cy - sy / this.scale;
    this._clampView();
    this.present();
  }

  /** Pan by a screen-pixel delta. */
  panBy(dxScreen, dyScreen) {
    this.view.x -= dxScreen / this.scale;
    this.view.y -= dyScreen / this.scale;
    this._clampView();
    this.present();
  }

  _clampView() {
    const span = this.view.cells;
    if (span >= this.size) {
      // Whole maze visible: center it.
      this.view.x = (this.size - span) / 2;
      this.view.y = (this.size - span) / 2;
      return;
    }
    this.view.x = Math.min(this.size - span, Math.max(0, this.view.x));
    this.view.y = Math.min(this.size - span, Math.max(0, this.view.y));
  }

  _screenToCell(sx, sy) {
    return { cx: this.view.x + sx / this.scale, cy: this.view.y + sy / this.scale };
  }

  _cellCenterToScreen(x, y) {
    return {
      sx: (x + 0.5 - this.view.x) * this.scale,
      sy: (y + 0.5 - this.view.y) * this.scale
    };
  }

  /* ------------------------------------------------------------------ *
   * Painting
   * ------------------------------------------------------------------ */

  /**
   * Blit the visible field region to the canvas, then draw the markers. Called
   * once per animation frame and after any view change.
   */
  present() {
    if (!this.grid) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssSize, this.cssSize);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.field,
      this.view.x, this.view.y, this.view.cells, this.view.cells,
      0, 0, this.cssSize, this.cssSize
    );
    this._drawMarker(this.goalIndex, this.colors.goal);
    this._drawMarker(this.playerIndex, this.colors.player);
  }

  /** Stamp an explored cell with a cool→warm heatmap color (1px in the field). */
  paintVisited(index, ratio) {
    const { x, y } = this.grid.coords(index);
    const hue = 200 + Math.min(1, ratio) * 140; // azure → magenta
    this.fieldCtx.fillStyle = `hsl(${hue}, 85%, 58%)`;
    this.fieldCtx.fillRect(x, y, 1, 1);
  }

  /** Stamp a solution-path cell. */
  paintPathCell(index) {
    const { x, y } = this.grid.coords(index);
    this.fieldCtx.fillStyle = this.colors.solution;
    this.fieldCtx.fillRect(x, y, 1, 1);
  }

  /** Repaint the static base, clearing all exploration/solution stamps. */
  clearField() {
    this._rasterizeBase();
  }

  setPlayer(index) {
    this.playerIndex = index;
  }

  _drawMarker(index, color) {
    if (index < 0) return;
    const { x, y } = this.grid.coords(index);
    // Skip if well outside the viewport.
    if (x < this.view.x - 1 || x > this.view.x + this.view.cells + 1 ||
        y < this.view.y - 1 || y > this.view.y + this.view.cells + 1) {
      return;
    }
    const { sx, sy } = this._cellCenterToScreen(x, y);
    const radius = Math.max(3, this.scale * 0.42);
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(4, radius * 2.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Parse a #rrggbb color into [r, g, b]. */
  _rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  dispose() { /* nothing to release for the 2D renderer */ }
}

if (typeof window !== 'undefined') {
  window.Renderer2D = Renderer2D;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Renderer2D };
}
