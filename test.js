/**
 * Automated Verification Suite for ModSim Algorithms
 */

import { HillClimbingOptimizer, LANDSCAPES } from './js/algorithms/hill-climbing.js';
import { AStarSolver, CELL_TYPES, CELL_COSTS, HEURISTICS } from './js/algorithms/a-star.js';
import { MazeGenerator } from './js/algorithms/maze-generator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Testing Hill Climbing Optimizer ---');
{
  // 1. Convex landscape convergence
  const opt = new HillClimbingOptimizer({ landscape: 'simpleConvex', stepSize: 0.3 });
  opt.setInitialPosition(6.0);
  for (let i = 0; i < 50; i++) opt.step();
  const tel = opt.getTelemetry();
  assert(Math.abs(tel.currentX - 0.0) < 0.6, `Convex hill converges to 0.0 (got x=${tel.currentX.toFixed(2)})`);
  assert(tel.fitness > 14.0, `Convex hill achieves high fitness (got f=${tel.fitness.toFixed(2)})`);

  // 2. Multi-peak local trap
  const opt2 = new HillClimbingOptimizer({ landscape: 'multiPeak', stepSize: 0.2, variant: 'steepestAscent' });
  opt2.setInitialPosition(-5.5); // Started at local peak on left
  for (let i = 0; i < 30; i++) opt2.step();
  const tel2 = opt2.getTelemetry();
  assert(tel2.status === 'local_max' || tel2.status === 'completed', `Steepest ascent stops at local peak (status=${tel2.status})`);
  assert(tel2.fitness < 10.0, `Local peak fitness is bounded below global (got f=${tel2.fitness.toFixed(2)})`);

  // 3. Random Restart recovers global optimum
  const opt3 = new HillClimbingOptimizer({ landscape: 'multiPeak', stepSize: 0.3, variant: 'randomRestart', maxRestarts: 12 });
  opt3.setInitialPosition(-5.5);
  for (let i = 0; i < 300; i++) opt3.step();
  const tel3 = opt3.getTelemetry();
  assert(tel3.bestEver.y > 11.5, `Random-restart discovered global optimum (bestEver=${tel3.bestEver.y.toFixed(2)})`);
}

console.log('\n--- Testing A* Pathfinding Engine ---');
{
  // 1. Direct path without obstacles
  const grid = MazeGenerator.createEmptyGrid(10, 10);
  const start = { x: 1, y: 1 };
  const goal = { x: 7, y: 1 };
  const solver = new AStarSolver(grid, { start, goal, heuristic: 'manhattan' });
  const tel = solver.runToCompletion();

  assert(tel.status === 'found', 'A* finds path in open grid');
  assert(tel.totalCost === 6, `Optimal cost from (1,1) to (7,1) is 6 (got ${tel.totalCost})`);
  assert(tel.finalPath.length === 7, `Path length contains 7 nodes including start & goal (got ${tel.finalPath.length})`);

  // 2. Obstacle avoidance
  const gridWithWall = MazeGenerator.createEmptyGrid(10, 10);
  for (let y = 0; y < 8; y++) gridWithWall[y][4] = CELL_TYPES.WALL; // Wall blocking direct line
  const solverWall = new AStarSolver(gridWithWall, { start: { x: 2, y: 3 }, goal: { x: 6, y: 3 } });
  const telWall = solverWall.runToCompletion();
  assert(telWall.status === 'found', 'A* routes around vertical wall');
  assert(telWall.totalCost > 4, `Cost around wall is greater than direct Manhattan (cost=${telWall.totalCost})`);

  // 3. Unreachable target
  const blockedGrid = MazeGenerator.createEmptyGrid(6, 6);
  // Box goal in completely
  blockedGrid[1][4] = CELL_TYPES.WALL;
  blockedGrid[2][3] = CELL_TYPES.WALL;
  blockedGrid[2][5] = CELL_TYPES.WALL;
  blockedGrid[3][4] = CELL_TYPES.WALL;
  const solverBlocked = new AStarSolver(blockedGrid, { start: { x: 0, y: 0 }, goal: { x: 4, y: 2 } });
  const telBlocked = solverBlocked.runToCompletion();
  assert(telBlocked.status === 'unreachable', 'A* detects blocked goal with status unreachable');

  // 4. Mud terrain penalty comparison
  const swampGrid = MazeGenerator.createEmptyGrid(5, 5);
  swampGrid[2][1] = CELL_TYPES.MUD; // cost 3
  swampGrid[2][2] = CELL_TYPES.MUD;
  swampGrid[2][3] = CELL_TYPES.MUD;
  const solverSwamp = new AStarSolver(swampGrid, { start: { x: 2, y: 0 }, goal: { x: 2, y: 4 } });
  const telSwamp = solverSwamp.runToCompletion();
  assert(telSwamp.status === 'found', 'A* solves grid with mud terrain');
  // Avoids direct mud if going around is cheaper (straight through mud = 1 + 3 + 3 + 3 + 1 = 11, around mud = 1+1+1+1+1+1 = 6)
  assert(telSwamp.totalCost <= 8, `A* navigates around mud terrain to minimize cost (cost=${telSwamp.totalCost})`);
}

console.log('\n--- Testing Maze & Preset Generators ---');
{
  const rows = 15;
  const cols = 25;
  const maze = MazeGenerator.generateRecursiveMaze(rows, cols, { x: 1, y: 1 }, { x: 23, y: 13 });
  assert(maze.length === rows && maze[0].length === cols, 'Recursive maze generated with correct dimensions');
  assert(maze[1][1] === CELL_TYPES.EMPTY, 'Start cell is carved empty');
  assert(maze[13][23] === CELL_TYPES.EMPTY, 'Goal cell is carved empty');

  const trap = MazeGenerator.generateConcaveTrap(rows, cols);
  assert(trap.length === rows, 'Concave trap generated successfully');

  const swamp = MazeGenerator.generateSwampTerrain(rows, cols);
  let hasMud = false;
  let hasWater = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (swamp[r][c] === CELL_TYPES.MUD) hasMud = true;
      if (swamp[r][c] === CELL_TYPES.WATER) hasWater = true;
    }
  }
  assert(hasMud && hasWater, 'Swamp generator creates Mud and Water cells');
}

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
