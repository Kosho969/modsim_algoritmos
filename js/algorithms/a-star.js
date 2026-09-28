/**
 * A* Pathfinding Engine & Heuristics
 * Modelación y Simulación — UVG
 */

export class MinHeap {
  constructor() {
    this.heap = [];
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }

  _bubbleUp(index) {
    const item = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (item.f >= parent.f) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = item;
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const item = this.heap[index];

    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let swapIdx = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].f < item.f) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        if (
          (swapIdx === null && this.heap[rightChildIdx].f < item.f) ||
          (swapIdx !== null && this.heap[rightChildIdx].f < this.heap[leftChildIdx].f)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      index = swapIdx;
    }
    this.heap[index] = item;
  }

  getItems() {
    return [...this.heap];
  }
}

export const HEURISTICS = {
  manhattan: (a, b) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  },
  euclidean: (a, b) => {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  chebyshev: (a, b) => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  },
  dijkstra: () => {
    return 0; // Pure uniform-cost search
  }
};

export const CELL_TYPES = {
  EMPTY: 0,
  WALL: 1,
  MUD: 2,    // Cost 3
  WATER: 3,  // Cost 5
};

export const CELL_COSTS = {
  [CELL_TYPES.EMPTY]: 1,
  [CELL_TYPES.WALL]: Infinity,
  [CELL_TYPES.MUD]: 3,
  [CELL_TYPES.WATER]: 5
};

export class AStarSolver {
  constructor(grid, config = {}) {
    this.grid = grid; // 2D array of CELL_TYPES
    this.rows = grid.length;
    this.cols = grid[0].length;
    
    this.start = config.start || { x: 2, y: Math.floor(this.rows / 2) };
    this.goal = config.goal || { x: this.cols - 3, y: Math.floor(this.rows / 2) };
    this.heuristicName = config.heuristic || 'manhattan';
    this.heuristicWeight = config.heuristicWeight !== undefined ? config.heuristicWeight : 1.0;
    this.allowDiagonals = config.allowDiagonals || false;
    this.mode = config.mode || 'astar'; // 'astar', 'dijkstra', 'greedy'
    
    this.reset();
  }

  reset() {
    this.openHeap = new MinHeap();
    this.openMap = new Map();     // key -> Node
    this.closedSet = new Set();   // Set of keys 'x,y'
    this.nodeData = new Map();    // key -> { x, y, g, h, f, parent }
    
    this.currentNode = null;
    this.finalPath = [];
    this.status = 'ready'; // 'ready', 'searching', 'found', 'unreachable'
    this.nodesExpanded = 0;
    this.totalCost = 0;

    const startKey = `${this.start.x},${this.start.y}`;
    const h = this.calculateH(this.start, this.goal);
    const startNode = {
      x: this.start.x,
      y: this.start.y,
      g: 0,
      h: h,
      f: this.calculateF(0, h),
      parent: null
    };

    this.openHeap.push(startNode);
    this.openMap.set(startKey, startNode);
    this.nodeData.set(startKey, startNode);
  }

  calculateH(node, goal) {
    if (this.mode === 'dijkstra') return 0;
    const fn = HEURISTICS[this.heuristicName] || HEURISTICS.manhattan;
    return fn(node, goal);
  }

  calculateF(g, h) {
    if (this.mode === 'greedy') {
      return h; // Ignores path cost
    }
    if (this.mode === 'dijkstra') {
      return g; // Ignores heuristic
    }
    return g + this.heuristicWeight * h;
  }

  getNeighbors(node) {
    const neighbors = [];
    const directions = [
      { dx: 0, dy: -1, cost: 1 }, // Up
      { dx: 1, dy: 0, cost: 1 },  // Right
      { dx: 0, dy: 1, cost: 1 },  // Down
      { dx: -1, dy: 0, cost: 1 }  // Left
    ];

    if (this.allowDiagonals) {
      directions.push(
        { dx: 1, dy: -1, cost: Math.SQRT2 },
        { dx: 1, dy: 1, cost: Math.SQRT2 },
        { dx: -1, dy: 1, cost: Math.SQRT2 },
        { dx: -1, dy: -1, cost: Math.SQRT2 }
      );
    }

    for (const dir of directions) {
      const nx = node.x + dir.dx;
      const ny = node.y + dir.dy;

      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        const cellType = this.grid[ny][nx];
        if (cellType !== CELL_TYPES.WALL) {
          // If diagonal, prevent corner-cutting through walls
          if (dir.cost > 1) {
            if (this.grid[node.y][nx] === CELL_TYPES.WALL && this.grid[ny][node.x] === CELL_TYPES.WALL) {
              continue; // Block diagonal pinch
            }
          }
          const terrainMultiplier = CELL_COSTS[cellType] || 1;
          neighbors.push({
            x: nx,
            y: ny,
            stepCost: dir.cost * terrainMultiplier
          });
        }
      }
    }

    return neighbors;
  }

  step() {
    if (this.status === 'found' || this.status === 'unreachable') {
      return this.getTelemetry();
    }

    if (this.openHeap.isEmpty()) {
      this.status = 'unreachable';
      return this.getTelemetry();
    }

    this.status = 'searching';
    const current = this.openHeap.pop();
    const currentKey = `${current.x},${current.y}`;
    this.openMap.delete(currentKey);

    // If already in closedSet with lower or equal g, skip
    if (this.closedSet.has(currentKey)) {
      return this.step(); // Recursively get next valid node
    }

    this.closedSet.add(currentKey);
    this.currentNode = current;
    this.nodesExpanded++;

    // Check if goal reached
    if (current.x === this.goal.x && current.y === this.goal.y) {
      this.status = 'found';
      this.reconstructPath(current);
      return this.getTelemetry();
    }

    const neighbors = this.getNeighbors(current);
    for (const nb of neighbors) {
      const nbKey = `${nb.x},${nb.y}`;
      if (this.closedSet.has(nbKey)) continue;

      const tentativeG = current.g + nb.stepCost;
      const existingData = this.nodeData.get(nbKey);

      if (!existingData || tentativeG < existingData.g) {
        const h = this.calculateH(nb, this.goal);
        const f = this.calculateF(tentativeG, h);
        const neighborNode = {
          x: nb.x,
          y: nb.y,
          g: tentativeG,
          h: h,
          f: f,
          parent: current
        };

        this.nodeData.set(nbKey, neighborNode);
        this.openHeap.push(neighborNode);
        this.openMap.set(nbKey, neighborNode);
      }
    }

    return this.getTelemetry();
  }

  reconstructPath(goalNode) {
    const path = [];
    let curr = goalNode;
    while (curr) {
      path.unshift({ x: curr.x, y: curr.y, g: curr.g, h: curr.h, f: curr.f });
      curr = curr.parent;
    }
    this.finalPath = path;
    this.totalCost = goalNode.g;
  }

  runToCompletion(maxSteps = 50000) {
    const startTime = performance.now();
    let steps = 0;
    while (this.status === 'searching' || this.status === 'ready') {
      this.step();
      steps++;
      if (steps > maxSteps) break;
    }
    const elapsed = performance.now() - startTime;
    const telemetry = this.getTelemetry();
    telemetry.timeMs = elapsed;
    return telemetry;
  }

  getTelemetry() {
    return {
      status: this.status,
      currentNode: this.currentNode,
      openSet: Array.from(this.openMap.values()),
      closedSetCount: this.closedSet.size,
      closedSetKeys: this.closedSet,
      nodeData: this.nodeData,
      finalPath: this.finalPath,
      nodesExpanded: this.nodesExpanded,
      totalCost: this.totalCost,
      start: this.start,
      goal: this.goal,
      heuristic: this.heuristicName,
      weight: this.heuristicWeight,
      mode: this.mode
    };
  }
}
