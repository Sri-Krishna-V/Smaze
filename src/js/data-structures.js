'use strict';

/**
 * Core data structures for SMaze.
 *
 * Loaded after utils.js and before maze-generator.js / pathfinding-algorithms.js.
 * These replace the previous O(n log n)-per-insert priority queue and the
 * O(V^2) Kruskal set-merge, making large mazes generate and solve instantly.
 */

/**
 * Array-based binary min-heap.
 *
 * Items are ordered by a comparator `(a, b) => number` (negative if a < b).
 * Push and pop are O(log n); peek and size are O(1). Used by Dijkstra and A*
 * in place of a sort-on-every-insert priority queue.
 */
class BinaryHeap {
  /**
   * @param {(a: *, b: *) => number} comparator - Orders items; min comes out first.
   */
  constructor(comparator) {
    this.items = [];
    this.compare = comparator || ((a, b) => a - b);
  }

  /**
   * Insert an element, restoring the heap invariant.
   * @param {*} element
   */
  push(element) {
    this.items.push(element);
    this._bubbleUp(this.items.length - 1);
  }

  /**
   * Remove and return the minimum element.
   * @returns {*} The smallest element, or undefined if empty.
   */
  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();

    if (items.length > 0) {
      items[0] = last;
      this._bubbleDown(0);
    }

    return top;
  }

  /**
   * Return the minimum element without removing it.
   * @returns {*}
   */
  peek() {
    return this.items[0];
  }

  /**
   * @returns {number} Number of elements in the heap.
   */
  size() {
    return this.items.length;
  }

  /**
   * @returns {boolean} True when the heap holds no elements.
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Restore order by moving the element at `index` toward the root.
   * @private
   * @param {number} index
   */
  _bubbleUp(index) {
    const items = this.items;
    const element = items[index];

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = items[parentIndex];

      if (this.compare(element, parent) >= 0) break;

      items[index] = parent;
      index = parentIndex;
    }

    items[index] = element;
  }

  /**
   * Restore order by moving the element at `index` toward the leaves.
   * @private
   * @param {number} index
   */
  _bubbleDown(index) {
    const items = this.items;
    const length = items.length;
    const element = items[index];

    while (true) {
      const left = 2 * index + 1;
      const right = left + 1;
      let smallest = index;
      let smallestItem = element;

      if (left < length && this.compare(items[left], smallestItem) < 0) {
        smallest = left;
        smallestItem = items[left];
      }
      if (right < length && this.compare(items[right], smallestItem) < 0) {
        smallest = right;
        smallestItem = items[right];
      }

      if (smallest === index) break;

      items[index] = items[smallest];
      index = smallest;
    }

    items[index] = element;
  }
}

/**
 * Disjoint-set (union-find) with path compression and union by rank.
 *
 * Both find and union run in near-constant amortized time, replacing the
 * full-grid scan the maze generator previously used to merge cell sets.
 */
class UnionFind {
  /**
   * @param {number} count - Number of distinct elements (ids 0..count-1).
   */
  constructor(count) {
    // Typed arrays so union-find over millions of room cells stays compact.
    // rank never exceeds ~log2(count) < 32, so a single byte per node suffices.
    this.parent = new Int32Array(count);
    this.rank = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      this.parent[i] = i;
    }
  }

  /**
   * Find the representative of `x`'s set, compressing the path on the way up.
   * @param {number} x
   * @returns {number} Set representative.
   */
  find(x) {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    // Path compression: point every node on the path straight at the root.
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  /**
   * Merge the sets containing `a` and `b`.
   * @param {number} a
   * @param {number} b
   * @returns {boolean} True if a merge happened, false if already joined.
   */
  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;

    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    return true;
  }

  /**
   * @param {number} a
   * @param {number} b
   * @returns {boolean} True if a and b are in the same set.
   */
  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

// Expose for the non-module browser environment (script-tag load order).
if (typeof window !== 'undefined') {
  window.BinaryHeap = BinaryHeap;
  window.UnionFind = UnionFind;
}

// Export for potential module/test use.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BinaryHeap, UnionFind };
}
