/**
 * A* Pathfinding Grid Canvas Visualizer
 * Modelación y Simulación — UVG
 */

import { AStarSolver, CELL_TYPES, CELL_COSTS } from '../algorithms/a-star.js';
import { MazeGenerator } from '../algorithms/maze-generator.js';

export class GridVisualizer {
  constructor(canvasElement, config = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    this.rows = config.rows || 18;
    this.cols = config.cols || 32;
    this.grid = MazeGenerator.createEmptyGrid(this.rows, this.cols);

    this.start = config.start || { x: 3, y: Math.floor(this.rows / 2) };
    this.goal = config.goal || { x: this.cols - 4, y: Math.floor(this.rows / 2) };

    this.solverConfig = {
      start: this.start,
      goal: this.goal,
      heuristic: config.heuristic || 'manhattan',
      heuristicWeight: config.heuristicWeight !== undefined ? config.heuristicWeight : 1.0,
      allowDiagonals: config.allowDiagonals || false,
      mode: config.mode || 'astar'
    };

    this.solver = new AStarSolver(this.grid, this.solverConfig);
    this.onTelemetryUpdate = config.onTelemetryUpdate || (() => {});
    this.speed = config.speed || 30; // ms per step
    this.showCellValues = config.showCellValues !== undefined ? config.showCellValues : true;

    this.drawMode = 'wall'; // 'wall', 'mud', 'water', 'erase'
    this.isMouseDown = false;
    this.draggingNode = null; // 'start', 'goal', or null
    this.isRunning = false;
    this.timer = null;

    this.initCanvas();
    this.bindEvents();
    this.render();
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 450;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = width;
    this.height = height;

    this.cellWidth = this.width / this.cols;
    this.cellHeight = this.height / this.rows;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.render();
    });

    const getGridPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (rect.width / this.cols));
      const y = Math.floor((e.clientY - rect.top) / (rect.height / this.rows));
      return {
        x: Math.max(0, Math.min(this.cols - 1, x)),
        y: Math.max(0, Math.min(this.rows - 1, y))
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getGridPos(e);
      this.isMouseDown = true;

      if (pos.x === this.start.x && pos.y === this.start.y) {
        this.draggingNode = 'start';
      } else if (pos.x === this.goal.x && pos.y === this.goal.y) {
        this.draggingNode = 'goal';
      } else {
        this.draggingNode = null;
        this.applyBrush(pos);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const pos = getGridPos(e);

      if (this.draggingNode === 'start') {
        if (!(pos.x === this.goal.x && pos.y === this.goal.y)) {
          this.start = pos;
          this.grid[pos.y][pos.x] = CELL_TYPES.EMPTY;
          this.solverConfig.start = this.start;
          this.resetSearch();
        }
      } else if (this.draggingNode === 'goal') {
        if (!(pos.x === this.start.x && pos.y === this.start.y)) {
          this.goal = pos;
          this.grid[pos.y][pos.x] = CELL_TYPES.EMPTY;
          this.solverConfig.goal = this.goal;
          this.resetSearch();
        }
      } else {
        this.applyBrush(pos);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.draggingNode = null;
    });
  }

  applyBrush(pos) {
    if ((pos.x === this.start.x && pos.y === this.start.y) || 
        (pos.x === this.goal.x && pos.y === this.goal.y)) {
      return;
    }

    let targetType = CELL_TYPES.EMPTY;
    if (this.drawMode === 'wall') targetType = CELL_TYPES.WALL;
    else if (this.drawMode === 'mud') targetType = CELL_TYPES.MUD;
    else if (this.drawMode === 'water') targetType = CELL_TYPES.WATER;
    else if (this.drawMode === 'erase') targetType = CELL_TYPES.EMPTY;

    if (this.grid[pos.y][pos.x] !== targetType) {
      this.grid[pos.y][pos.x] = targetType;
      this.resetSearch();
    }
  }

  setDrawMode(mode) {
    this.drawMode = mode;
  }

  setHeuristic(heuristicName) {
    this.solverConfig.heuristic = heuristicName;
    this.resetSearch();
  }

  setMode(mode) {
    this.solverConfig.mode = mode; // 'astar', 'dijkstra', 'greedy'
    this.resetSearch();
  }

  setWeight(weight) {
    this.solverConfig.heuristicWeight = weight;
    this.resetSearch();
  }

  setAllowDiagonals(allow) {
    this.solverConfig.allowDiagonals = allow;
    this.resetSearch();
  }

  setSpeed(ms) {
    this.speed = ms;
    if (this.isRunning) {
      this.pause();
      this.play();
    }
  }

  toggleCellValues(show) {
    this.showCellValues = show !== undefined ? show : !this.showCellValues;
    this.render();
  }

  loadPreset(presetName) {
    this.pause();
    if (presetName === 'random') {
      this.grid = MazeGenerator.generateRandomObstacles(this.rows, this.cols, 0.28, this.start, this.goal);
    } else if (presetName === 'maze') {
      this.grid = MazeGenerator.generateRecursiveMaze(this.rows, this.cols, this.start, this.goal);
    } else if (presetName === 'trap') {
      this.grid = MazeGenerator.generateConcaveTrap(this.rows, this.cols, this.start, this.goal);
    } else if (presetName === 'swamp') {
      this.grid = MazeGenerator.generateSwampTerrain(this.rows, this.cols, this.start, this.goal);
    } else if (presetName === 'clear') {
      this.grid = MazeGenerator.createEmptyGrid(this.rows, this.cols);
    }
    this.resetSearch();
  }

  resetSearch() {
    this.pause();
    this.solver = new AStarSolver(this.grid, {
      ...this.solverConfig,
      start: this.start,
      goal: this.goal
    });
    this.render();
    this.notifyTelemetry();
  }

  step() {
    const telemetry = this.solver.step();
    this.render();
    this.notifyTelemetry(telemetry);
    return telemetry;
  }

  play() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      const telemetry = this.solver.step();
      this.render();
      this.notifyTelemetry(telemetry);

      if (telemetry.status === 'found' || telemetry.status === 'unreachable') {
        this.pause();
      }
    }, this.speed);
  }

  pause() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  notifyTelemetry(telemetry) {
    this.onTelemetryUpdate(telemetry || this.solver.getTelemetry());
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cw = this.cellWidth;
    const ch = this.cellHeight;
    const telemetry = this.solver.getTelemetry();
    const nodeData = telemetry.nodeData;
    const closedSet = telemetry.closedSetKeys;
    const openMap = new Set(telemetry.openSet.map(n => `${n.x},${n.y}`));
    const finalPathMap = new Set(telemetry.finalPath.map(p => `${p.x},${p.y}`));

    // 1. Draw Grid Cells & Terrains
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * cw;
        const y = r * ch;
        const key = `${c},${r}`;
        const cellType = this.grid[r][c];

        // Background Color
        let fillColor = '#ffffff';

        if (cellType === CELL_TYPES.WALL) {
          fillColor = '#1e293b'; // Slate dark
        } else if (cellType === CELL_TYPES.MUD) {
          fillColor = '#fef3c7'; // Amber light
        } else if (cellType === CELL_TYPES.WATER) {
          fillColor = '#e0f2fe'; // Sky light
        }

        // Overlay Search States
        if (cellType !== CELL_TYPES.WALL) {
          if (finalPathMap.has(key)) {
            fillColor = '#fef08a'; // Golden Path
          } else if (closedSet.has(key)) {
            fillColor = '#ede9fe'; // Visited / Closed (violet-100)
          } else if (openMap.has(key)) {
            fillColor = '#cffafe'; // Frontier / Open (cyan-100)
          }
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cw, ch);

        // Grid border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cw, ch);

        // Terrain Pattern / Icon
        if (cellType === CELL_TYPES.MUD) {
          ctx.fillStyle = '#b45309';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡3x', x + cw / 2, y + ch / 2 + 3);
        } else if (cellType === CELL_TYPES.WATER) {
          ctx.fillStyle = '#0369a1';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌊5x', x + cw / 2, y + ch / 2 + 3);
        }

        // Display g, h, f values if enabled and visited/open
        if (this.showCellValues && cellType !== CELL_TYPES.WALL && nodeData.has(key) && cw >= 32) {
          const data = nodeData.get(key);
          this.drawCellMath(x, y, cw, ch, data);
        }
      }
    }

    // 2. Draw Reconstructed Path Line
    if (telemetry.finalPath && telemetry.finalPath.length > 1) {
      this.drawPathLine(telemetry.finalPath, cw, ch);
    }

    // 3. Draw Currently Expanding Node highlight
    if (telemetry.currentNode && telemetry.status === 'searching') {
      const cur = telemetry.currentNode;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(cur.x * cw + 2, cur.y * ch + 2, cw - 4, ch - 4);
    }

    // 4. Draw Start & Goal Nodes
    this.drawMarker(this.start.x * cw, this.start.y * ch, cw, ch, 'S', '#10b981', '#065f46');
    this.drawMarker(this.goal.x * cw, this.goal.y * ch, cw, ch, 'G', '#ef4444', '#991b1b');
  }

  drawCellMath(x, y, cw, ch, data) {
    const ctx = this.ctx;
    ctx.save();
    
    // g-cost top-left
    ctx.font = '8px Fira Code, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(data.g)}`, x + 3, y + 9);

    // h-cost top-right
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(data.h)}`, x + cw - 3, y + 9);

    // f-cost center bold
    ctx.font = 'bold 11px Fira Code, monospace';
    ctx.fillStyle = '#1e1b4b';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(data.f)}`, x + cw / 2, y + ch - 5);

    ctx.restore();
  }

  drawPathLine(path, cw, ch) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(3, cw / 7);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x * cw + cw / 2, path[0].y * ch + ch / 2);

    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x * cw + cw / 2, path[i].y * ch + ch / 2);
    }

    ctx.stroke();
    ctx.restore();
  }

  drawMarker(x, y, cw, ch, label, bgColor, textColor) {
    const ctx = this.ctx;
    ctx.save();

    // Round badge
    const radius = Math.min(cw, ch) * 0.38;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(x + cw / 2, y + ch / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 1.1)}px Montserrat, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + cw / 2, y + ch / 2);

    ctx.restore();
  }
}
