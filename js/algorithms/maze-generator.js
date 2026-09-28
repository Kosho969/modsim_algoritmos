/**
 * Maze & Obstacle Map Generators
 * Modelación y Simulación — UVG
 */

import { CELL_TYPES } from './a-star.js';

export class MazeGenerator {
  static createEmptyGrid(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push(new Array(cols).fill(CELL_TYPES.EMPTY));
    }
    return grid;
  }

  static generateRandomObstacles(rows, cols, density = 0.28, start, goal) {
    const grid = this.createEmptyGrid(rows, cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((start && c === start.x && r === start.y) || (goal && c === goal.x && r === goal.y)) {
          continue;
        }
        if (Math.random() < density) {
          grid[r][c] = CELL_TYPES.WALL;
        }
      }
    }
    return grid;
  }

  static generateRecursiveMaze(rows, cols, start, goal) {
    // Fill all with walls
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push(new Array(cols).fill(CELL_TYPES.WALL));
    }

    // DFS carving on odd cells
    function carve(cx, cy) {
      grid[cy][cx] = CELL_TYPES.EMPTY;
      const dirs = [
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 }
      ].sort(() => Math.random() - 0.5);

      for (const dir of dirs) {
        const nx = cx + dir.dx;
        const ny = cy + dir.dy;

        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === CELL_TYPES.WALL) {
          grid[cy + dir.dy / 2][cx + dir.dx / 2] = CELL_TYPES.EMPTY;
          carve(nx, ny);
        }
      }
    }

    carve(1, 1);

    // Ensure start and goal are clear + some random shortcuts to make it a braid maze
    if (start) {
      grid[start.y][start.x] = CELL_TYPES.EMPTY;
      if (start.x + 1 < cols) grid[start.y][start.x + 1] = CELL_TYPES.EMPTY;
    }
    if (goal) {
      grid[goal.y][goal.x] = CELL_TYPES.EMPTY;
      if (goal.x - 1 >= 0) grid[goal.y][goal.x - 1] = CELL_TYPES.EMPTY;
    }

    // Carve random loops so there are multiple alternative paths
    for (let i = 0; i < Math.floor((rows * cols) * 0.05); i++) {
      const rx = 1 + Math.floor(Math.random() * (cols - 2));
      const ry = 1 + Math.floor(Math.random() * (rows - 2));
      grid[ry][rx] = CELL_TYPES.EMPTY;
    }

    return grid;
  }

  static generateConcaveTrap(rows, cols, start, goal) {
    const grid = this.createEmptyGrid(rows, cols);
    const midX = Math.floor(cols / 2);
    const midY = Math.floor(rows / 2);
    const halfHeight = Math.floor(rows / 3);

    // Vertical wall facing goal
    for (let r = midY - halfHeight; r <= midY + halfHeight; r++) {
      if (r >= 0 && r < rows) {
        grid[r][midX] = CELL_TYPES.WALL;
      }
    }

    // Top and bottom horizontal prongs extending towards start
    const prongLen = Math.floor(cols / 4);
    for (let c = midX - prongLen; c <= midX; c++) {
      if (midY - halfHeight >= 0) grid[midY - halfHeight][c] = CELL_TYPES.WALL;
      if (midY + halfHeight < rows) grid[midY + halfHeight][c] = CELL_TYPES.WALL;
    }

    // Clear start and goal
    if (start) grid[start.y][start.x] = CELL_TYPES.EMPTY;
    if (goal) grid[goal.y][goal.x] = CELL_TYPES.EMPTY;

    return grid;
  }

  static generateSwampTerrain(rows, cols, start, goal) {
    const grid = this.createEmptyGrid(rows, cols);
    const midX = Math.floor(cols / 2);
    const midY = Math.floor(rows / 2);

    // Large mud/swamp patch in the middle
    for (let r = 2; r < rows - 2; r++) {
      for (let c = midX - 4; c <= midX + 4; c++) {
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          // Center is water (cost 5), perimeter is mud (cost 3)
          if (c >= midX - 2 && c <= midX + 2 && r >= midY - 2 && r <= midY + 2) {
            grid[r][c] = CELL_TYPES.WATER;
          } else {
            grid[r][c] = CELL_TYPES.MUD;
          }
        }
      }
    }

    // Clear start and goal
    if (start) grid[start.y][start.x] = CELL_TYPES.EMPTY;
    if (goal) grid[goal.y][goal.x] = CELL_TYPES.EMPTY;

    return grid;
  }
}
