# SMaze - Interactive Maze Generator & Solver

A visually enhanced maze generation and pathfinding visualization tool with multiple algorithms.

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

## Algorithm Guide

### Maze Generation: Kruskal's Algorithm
- **How it works**: 
  - Treats maze as a graph where cells are vertices
  - Randomly joins cells while avoiding cycles
  - Creates perfect maze with exactly one path between any two points
- **Time Complexity**: O(E log V)
- **Characteristics**:
  - Unbiased maze generation
  - Guarantees solvable paths
  - Creates mazes with many long corridors

### Pathfinding Algorithms

#### 1. Breadth-First Search (BFS)
- **Strategy**: Explores all cells at current distance before moving further
- **Characteristics**:
  - Guarantees shortest path
  - Explores radially outward
  - Complete: Will find solution if exists
- **Time Complexity**: O(V + E)
- **Space Complexity**: O(V)
- **Best Used When**: Finding shortest path in unweighted maze
- **Visual Pattern**: Expands like a circle from start

#### 2. Depth-First Search (DFS)
- **Strategy**: Explores as far as possible along each branch
- **Characteristics**:
  - Memory efficient
  - May not find shortest path
  - Complete for finite mazes
- **Time Complexity**: O(V + E)
- **Space Complexity**: O(h) where h is maze height
- **Best Used When**: Memory is constrained
- **Visual Pattern**: Explores one long path at a time

#### 3. Dijkstra's Algorithm
- **Strategy**: Explores cells based on distance from start
- **Characteristics**:
  - Guarantees shortest path
  - Works with weighted paths
  - Complete and optimal
- **Time Complexity**: O((V + E) log V)
- **Space Complexity**: O(V)
- **Best Used When**: Finding shortest path in weighted maze
- **Visual Pattern**: Expands based on distance

#### 4. A* Search
- **Strategy**: Uses heuristic to guide search toward goal
- **Characteristics**:
  - Usually faster than Dijkstra
  - Optimal with admissible heuristic
  - Combines actual and estimated cost
- **Time Complexity**: O((V + E) log V)
- **Space Complexity**: O(V)
- **Best Used When**: Speed is priority and have good heuristic
- **Visual Pattern**: Focuses exploration toward goal

### Algorithm Comparison

| Algorithm | Guarantees Shortest Path | Memory Usage | Speed | Use Case |
|-----------|-------------------------|--------------|-------|-----------|
| BFS | Yes | High | Medium | Unweighted, shortest path needed |
| DFS | No | Low | Fast | Memory constrained, any path needed |
| Dijkstra | Yes | Medium | Medium | Weighted, shortest path needed |
| A* | Yes* | Medium | Fast | When good heuristic exists |

\* With admissible heuristic

### Visual Patterns

### Visual Enhancements
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
1. Open the `SMaze.html` file in your web browser.
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
