# Smaze - Interactive Maze Generator & Solver

A visually enhanced maze generation and pathfinding visualization tool with multiple algorithms and dark theme aesthetics.

![Maze Screenshot](screenshots/maze.png)

## Features

### Maze Generation
- Random maze generation using Kruskal's algorithm
- Adjustable maze size (10x10 to 100x100)
- Guaranteed solvable paths

### Pathfinding Algorithms
- Breadth-First Search (BFS) - Guarantees shortest path
- Depth-First Search (DFS) - Fast exploration
- Dijkstra's Algorithm - Optimal pathfinding
- A* Search - Efficient directed search

### Visual Enhancements
- GitHub Dark theme inspired design
- Radial gradient background (#0D1117 to #161B22)
- Glowing maze walls with gradient effects
- Glass-morphism UI elements
- Real-time solving visualization
- Path tracking with highlighted solutions
- Dynamic timer display

### Interactive Controls
- Algorithm selection dropdown
- Maze size adjustment
- Solution visualization
- Player reset
- Maze regeneration
- Solving process control (Start/Stop)

## Tech Stack
- HTML5 Canvas for maze rendering
- CSS3 with modern features:
  - Backdrop filters
  - Glass-morphism effects
  - CSS Grid/Flexbox
  - Custom animations
- Vanilla JavaScript for algorithms

## File Structure

## Usage

### Running the Project
1. Open the `index.html` file in your web browser.
2. The maze will be generated automatically upon loading.

### Interactive Controls
- **Algorithm Selection**: Use the dropdown menu to select the desired pathfinding algorithm (BFS, DFS, Dijkstra, A*).
- **Maze Size Adjustment**: Enter a value between 10 and 100 in the "Maze Size" input field and click "Change Size" to adjust the maze size.
- **Solve Maze**: Click the "Solve Maze" button to start solving the maze using the selected algorithm.
- **Stop Solving**: Click the "Stop Solving" button to stop the solving process.
- **Reset Player**: Click the "Reset Player" button to reset the player's position to the start of the maze.
- **Generate New Maze**: Click the "Generate New Maze" button to generate a new random maze.

### Additional Information
- The timer will start when you begin solving the maze and stop when the maze is solved or the solving process is stopped.
- The player's position can be controlled using the 'W', 'A', 'S', 'D' keys to move up, left, down, and right respectively.
- The goal is to reach the green cell at the bottom-right corner of the maze.
