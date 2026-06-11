'use strict';

/**
 * 3D (WebGL / Three.js) renderer for SMaze.
 *
 * Rendering every wall voxel of a 3D maze is both infeasible (millions of cubes)
 * and useless (you can't see inside a solid block). Instead this renderer leaves
 * walls *implicit* and visualizes the space the search can actually move through:
 *
 *   - a dim Points cloud of all passable cells sketches the corridors,
 *   - the search frontier floods outward as instanced cubes on a cool→warm
 *     heatmap (grown one cell per `paintVisited`),
 *   - the solution path glows as bright instanced cubes,
 *   - start/goal are marked spheres, framed by a wireframe bounding box.
 *
 * Camera is a custom minimal orbit (drag to rotate, wheel to dolly) so we depend
 * only on the core three.min.js global build — no examples/jsm modules.
 *
 * Implements the same renderer interface as {@link Renderer2D} so {@link Game}
 * can treat 2D and 3D identically: attach / resize / present / paintVisited /
 * paintPathCell / clearField / setPlayer / dispose.
 */

/* global THREE, Grid */

class Renderer3D {
  constructor(baseCanvas, colors) {
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js failed to load; 3D mode is unavailable.');
    }
    this.colors = colors;
    this.baseCanvas = baseCanvas;

    // The 2D canvas can't host a WebGL context, so use a dedicated sibling canvas.
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'maze-canvas-3d';
    this.canvas.style.width = '100%';
    this.canvas.style.display = 'block';
    baseCanvas.style.display = 'none';
    baseCanvas.parentNode.insertBefore(this.canvas, baseCanvas.nextSibling);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100000);

    this.grid = null;
    this.size = 0;
    this.explored = null;   // InstancedMesh
    this.exploredCount = 0;
    this.pathMesh = null;    // InstancedMesh
    this.pathCount = 0;
    this.points = null;
    this.player = null;
    this.goalMarker = null;
    this.bounds = null;

    this._tmpMatrix = new THREE.Matrix4();
    this._tmpColor = new THREE.Color();

    // Orbit state (spherical around the maze center).
    this.orbit = { radius: 10, theta: Math.PI * 0.25, phi: Math.PI * 0.3 };
    this._installOrbitControls();

    this._running = true;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  get dims() { return 3; }

  /* ------------------------------------------------------------------ *
   * Scene construction
   * ------------------------------------------------------------------ */

  attach(grid, startIndex, goalIndex) {
    this.grid = grid;
    this.size = grid.size;
    this._disposeSceneContent();

    const s = this.size;
    this._center = new THREE.Vector3(0, 0, 0);
    this.orbit.radius = s * 1.6;

    // Wireframe bounding box.
    const boxGeo = new THREE.BoxGeometry(s, s, s);
    this.bounds = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0x2a3344 })
    );
    this.scene.add(this.bounds);

    this._buildPassableCloud();

    // Instanced meshes for explored + path cells.
    const passable = this.grid.countPassable();
    const cap = Math.min(passable, Renderer3D.MAX_INSTANCES);
    const cubeGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);

    this.explored = new THREE.InstancedMesh(
      cubeGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }), cap
    );
    this.explored.count = 0;
    this.scene.add(this.explored);

    this.pathMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.95),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(this.colors.solution) }),
      Math.min(cap, 200000)
    );
    this.pathMesh.count = 0;
    this.scene.add(this.pathMesh);
    this.exploredCount = 0;
    this.pathCount = 0;

    // Player + goal spheres.
    const sphereGeo = new THREE.SphereGeometry(0.9, 16, 16);
    this.player = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(this.colors.player) }));
    this.goalMarker = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(this.colors.goal) }));
    this.scene.add(this.player, this.goalMarker);
    this._placeMesh(this.goalMarker, goalIndex);
    this.setPlayer(startIndex);

    this.resize();
  }

  /** Dim point cloud of passable cells to sketch the corridors (capped). */
  _buildPassableCloud() {
    const passable = this.grid.countPassable();
    if (passable > Renderer3D.MAX_POINTS) return; // Too many to sketch usefully.

    const positions = new Float32Array(passable * 3);
    const cells = this.grid.cells;
    const half = this.size / 2;
    let p = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== 0) continue;
      const c = this.grid.coords(i);
      positions[p++] = c.x - half;
      positions[p++] = c.y - half;
      positions[p++] = c.z - half;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x8b949e, size: 0.25, transparent: true, opacity: 0.35 })
    );
    this.scene.add(this.points);
  }

  /* ------------------------------------------------------------------ *
   * Painting (same interface as Renderer2D)
   * ------------------------------------------------------------------ */

  paintVisited(index, ratio) {
    if (!this.explored || this.exploredCount >= this.explored.instanceMatrix.count) return;
    const i = this.exploredCount++;
    this._setInstance(this.explored, i, index);
    const hue = (200 + Math.min(1, ratio) * 140) / 360;
    this._tmpColor.setHSL(hue, 0.85, 0.58);
    this.explored.setColorAt(i, this._tmpColor);
    this.explored.count = this.exploredCount;
    this.explored.instanceMatrix.needsUpdate = true;
    if (this.explored.instanceColor) this.explored.instanceColor.needsUpdate = true;
  }

  paintPathCell(index) {
    if (!this.pathMesh || this.pathCount >= this.pathMesh.instanceMatrix.count) return;
    const i = this.pathCount++;
    this._setInstance(this.pathMesh, i, index);
    this.pathMesh.count = this.pathCount;
    this.pathMesh.instanceMatrix.needsUpdate = true;
  }

  clearField() {
    this.exploredCount = 0;
    this.pathCount = 0;
    if (this.explored) this.explored.count = 0;
    if (this.pathMesh) this.pathMesh.count = 0;
  }

  setPlayer(index) {
    if (this.player) this._placeMesh(this.player, index);
  }

  /** No-op: a continuous rAF loop renders the scene (orbit needs live frames). */
  present() {}

  /** Recenter / reset the orbit distance to frame the whole maze. */
  fitView() {
    this.orbit.radius = this.size * 1.6;
    this.orbit.theta = Math.PI * 0.25;
    this.orbit.phi = Math.PI * 0.3;
  }

  /* ------------------------------------------------------------------ *
   * Sizing & render loop
   * ------------------------------------------------------------------ */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width || 600);
    const h = w; // keep square to match the 2D stage
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
  }

  _loop() {
    if (!this._running) return;
    const o = this.orbit;
    this.camera.position.set(
      o.radius * Math.sin(o.phi) * Math.cos(o.theta),
      o.radius * Math.cos(o.phi),
      o.radius * Math.sin(o.phi) * Math.sin(o.theta)
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._loop);
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  _placeMesh(mesh, index) {
    const c = this.grid.coords(index);
    const half = this.size / 2;
    mesh.position.set(c.x - half, c.y - half, c.z - half);
  }

  _setInstance(instanced, slot, cellIndex) {
    const c = this.grid.coords(cellIndex);
    const half = this.size / 2;
    this._tmpMatrix.makeTranslation(c.x - half, c.y - half, c.z - half);
    instanced.setMatrixAt(slot, this._tmpMatrix);
  }

  _installOrbitControls() {
    const el = this.canvas;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    el.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.orbit.theta -= (e.clientX - lastX) * 0.01;
      this.orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.05, this.orbit.phi - (e.clientY - lastY) * 0.01));
      lastX = e.clientX;
      lastY = e.clientY;
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 0.9 : 1.1;
      this.orbit.radius = Math.max(2, Math.min(this.size * 4, this.orbit.radius * factor));
    }, { passive: false });
  }

  _disposeSceneContent() {
    for (const obj of [this.points, this.explored, this.pathMesh, this.player, this.goalMarker, this.bounds]) {
      if (!obj) continue;
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    this.points = this.explored = this.pathMesh = this.player = this.goalMarker = this.bounds = null;
  }

  dispose() {
    this._running = false;
    this._disposeSceneContent();
    this.renderer.dispose();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.baseCanvas.style.display = '';
  }
}

/** Caps so visualization stays interactive on large 3D mazes. */
Renderer3D.MAX_INSTANCES = 1_500_000;
Renderer3D.MAX_POINTS = 600_000;

if (typeof window !== 'undefined') {
  window.Renderer3D = Renderer3D;
}
