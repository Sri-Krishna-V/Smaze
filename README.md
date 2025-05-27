# SMaze - Interactive Maze Generator & Solver

A modern, accessible maze generation and pathfinding visualization tool built with vanilla JavaScript. Features multiple algorithms, responsive design, and educational visualizations.

## ✨ Features

### 🏗️ Maze Generation

- **Kruskal's Algorithm**: Creates perfect mazes with guaranteed unique solutions
- **Adjustable Size**: Dynamic maze sizes from 10x10 to 100x100
- **Instant Generation**: Fast maze creation with optimized algorithms

### 🔍 Pathfinding Algorithms

- **Breadth-First Search (BFS)**: Guarantees shortest path discovery
- **Depth-First Search (DFS)**: Fast exploration with memory efficiency
- **Dijkstra's Algorithm**: Optimal pathfinding for weighted graphs
- **A* Search**: Intelligent heuristic-based pathfinding

### 🎮 Interactive Features

- **Manual Play**: Use WASD or arrow keys to navigate
- **Auto-Solve**: Watch algorithms solve mazes in real-time
- **Timer**: Track solving performance
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites

- Modern web browser with JavaScript enabled
- Node.js 14+ (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smaze

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Deployment

```bash
# Build for production
npm run build

# Serve static files
npm start
```

## 🎯 Usage

### Manual Navigation

- Use **WASD** or **Arrow Keys** to move the blue player
- Reach the **green goal** in the bottom-right corner
- Track your time with the built-in timer

### Auto-Solving

1. Select a pathfinding algorithm from the dropdown
2. Click **"Solve Maze"** to start visualization
3. Watch the algorithm explore the maze (red cells)
4. View the final solution path (green cells)

### Keyboard Shortcuts

- **Space**: Start/Stop solving
- **R**: Reset player position
- **N**: Generate new maze
- **Escape**: Stop current algorithm

## 🏗️ Project Structure

```text
smaze/
├── index.html              # Main HTML file
├── package.json            # Project dependencies
├── .eslintrc.json         # ESLint configuration
├── .prettierrc.json       # Prettier configuration
├── src/
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   └── js/
│       ├── app.js         # Application entry point
│       ├── game.js        # Game logic and rendering
│       ├── maze-generator.js    # Maze generation algorithms
│       ├── pathfinding-algorithms.js  # Pathfinding implementations
│       └── utils.js       # Utility functions
├── assets/                # Static assets
└── README.md             # Project documentation
```

## 📊 Algorithm Details

### Maze Generation: Kruskal's Algorithm

- **How it works**: Treats maze as a graph where cells are vertices, randomly joins cells while avoiding cycles
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
- **Best Used When**: Memory is limited
- **Visual Pattern**: Creates long corridors before backtracking

#### 3. Dijkstra's Algorithm

- **Strategy**: Explores cells based on distance from start
- **Characteristics**:
  - Guarantees shortest path
  - Works with weighted graphs
  - Complete and optimal
- **Time Complexity**: O((V + E) log V)
- **Space Complexity**: O(V)
- **Best Used When**: Graph has weighted edges
- **Visual Pattern**: Uniform cost expansion

#### 4. A* Search

- **Strategy**: Uses heuristic to guide search toward goal
- **Characteristics**:
  - Optimal with admissible heuristic
  - More efficient than Dijkstra
  - Directed search
- **Time Complexity**: O(b^d) where b is branching factor
- **Space Complexity**: O(b^d)
- **Best Used When**: Speed is priority and have good heuristic
- **Visual Pattern**: Directed toward goal

## 🛠️ Development

### Code Quality

The project follows modern JavaScript best practices:

- **ES6+ Features**: Modern JavaScript syntax and features
- **Strict Mode**: All modules use strict mode
- **ESLint**: Code linting with recommended rules
- **Prettier**: Consistent code formatting
- **JSDoc**: Comprehensive code documentation

### Architecture

- **Modular Design**: Separation of concerns with dedicated modules
- **Class-Based**: Object-oriented approach for better maintainability
- **Error Handling**: Robust error handling throughout the application
- **Performance**: Optimized algorithms and rendering

### Scripts

```bash
# Development
npm run dev          # Start development server with live reload
npm run serve        # Serve static files

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
```

## 🎨 Features

### Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Flexible Layout**: Adapts to different screen sizes
- **Touch Support**: Touch-friendly controls

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and semantic HTML
- **Focus Management**: Proper focus indicators
- **Color Contrast**: High contrast for visibility

### Performance

- **Optimized Rendering**: Efficient canvas drawing
- **Memory Management**: Proper cleanup and resource management
- **Smooth Animations**: 60fps animations and transitions

## 🚀 Technologies Used

- **HTML5 Canvas**: High-performance maze rendering
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with custom properties
- **Web APIs**: Performance timing, visibility API
- **Node.js**: Development tooling and package management

## 📱 Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic maze algorithms and pathfinding visualizations
- Built for educational purposes in AI and algorithms courses
- Thanks to the computer science community for algorithm research

---

**SMaze** - Making pathfinding algorithms visual and interactive! 🎯
