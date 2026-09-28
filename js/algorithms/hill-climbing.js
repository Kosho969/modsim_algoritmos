/**
 * Hill Climbing Algorithm & Landscapes Module
 * Modelación y Simulación — UVG
 */

export const LANDSCAPES = {
  multiPeak: {
    id: 'multiPeak',
    name: 'Paisaje Multi-Pico (Trampas Locales)',
    description: 'Tres colinas de distinta altura. Muestra claramente cómo el algoritmo se queda atrapado en máximos locales según el punto inicial.',
    xMin: -10,
    xMax: 10,
    fn: (x) => {
      // 3 peaks of heights ~8.5 (local), 12.0 (global), 6.0 (local)
      const p1 = 8.5 * Math.exp(-Math.pow(x + 5.5, 2) / 6);
      const p2 = 12.0 * Math.exp(-Math.pow(x - 1.2, 2) / 7);
      const p3 = 6.2 * Math.exp(-Math.pow(x - 6.8, 2) / 4);
      const noise = 0.3 * Math.sin(2.5 * x);
      return p1 + p2 + p3 + noise + 1;
    },
    globalMax: { x: 1.2, y: 13.0 }
  },

  simpleConvex: {
    id: 'simpleConvex',
    name: 'Colina Simple (Convexa)',
    description: 'Función unimodal suave. Cualquier punto de partida converge sin dificultad al óptimo global.',
    xMin: -10,
    xMax: 10,
    fn: (x) => {
      return 14.0 * Math.exp(-Math.pow(x, 2) / 25) + 1;
    },
    globalMax: { x: 0.0, y: 15.0 }
  },

  plateau: {
    id: 'plateau',
    name: 'Meseta Plana (Plateau)',
    description: 'Colina con hombro completamente plano donde el gradiente local es nulo. El algoritmo estándar se detiene prematuramente.',
    xMin: -10,
    xMax: 10,
    fn: (x) => {
      if (x >= -2 && x <= 2) {
        return 7.5; // perfectly flat plateau
      } else if (x > 2) {
        return 7.5 + 5.5 * Math.exp(-Math.pow(x - 5.5, 2) / 4);
      } else {
        return 7.5 * Math.exp(-Math.pow(x + 2, 2) / 10);
      }
    },
    globalMax: { x: 5.5, y: 13.0 }
  },

  rastrigin: {
    id: 'rastrigin',
    name: 'Paisaje Escarpado (Estilo Rastrigin)',
    description: 'Múltiples ondas oscilatorias superpuestas. Un reto extremo para búsqueda local sin reinicios.',
    xMin: -6,
    xMax: 6,
    fn: (x) => {
      // Inverted Rastrigin for maximization
      const A = 10;
      const val = 15 - (Math.pow(x, 2) - A * Math.cos(2 * Math.PI * x) + A);
      return Math.max(0.5, val + 15);
    },
    globalMax: { x: 0.0, y: 30.0 }
  }
};

export class HillClimbingOptimizer {
  constructor(config = {}) {
    this.landscapeKey = config.landscape || 'multiPeak';
    this.landscape = LANDSCAPES[this.landscapeKey];
    this.stepSize = config.stepSize || 0.4;
    this.numNeighbors = config.numNeighbors || 2; // 2 for 1D (left/right) or sampled
    this.variant = config.variant || 'steepestAscent'; // 'simple', 'steepestAscent', 'stochastic', 'randomRestart'
    this.maxIterations = config.maxIterations || 150;
    this.maxRestarts = config.maxRestarts || 10;
    
    this.reset();
  }

  setLandscape(key) {
    if (LANDSCAPES[key]) {
      this.landscapeKey = key;
      this.landscape = LANDSCAPES[key];
      this.reset();
    }
  }

  setVariant(variant) {
    this.variant = variant;
    this.reset();
  }

  setStepSize(size) {
    this.stepSize = Math.max(0.05, Math.min(2.0, size));
  }

  setInitialPosition(x) {
    this.currentX = Math.max(this.landscape.xMin, Math.min(this.landscape.xMax, x));
    this.currentY = this.landscape.fn(this.currentX);
    this.trajectory = [{ x: this.currentX, y: this.currentY, restart: this.restarts }];
    this.status = 'ready';
    this.iterations = 0;
    
    if (this.currentY > this.bestEver.y) {
      this.bestEver = { x: this.currentX, y: this.currentY };
    }
  }

  reset() {
    // Random initial position if not specified
    const range = this.landscape.xMax - this.landscape.xMin;
    const initialX = this.landscape.xMin + Math.random() * range;
    
    this.currentX = initialX;
    this.currentY = this.landscape.fn(this.currentX);
    this.iterations = 0;
    this.restarts = 0;
    this.status = 'ready'; // 'ready', 'climbing', 'local_max', 'plateau', 'completed'
    this.bestEver = { x: this.currentX, y: this.currentY };
    this.trajectory = [{ x: this.currentX, y: this.currentY, restart: 0 }];
    this.lastEvaluatedNeighbors = [];
    this.restartHistories = [];
  }

  getNeighbors(x) {
    const neighbors = [];
    const delta = this.stepSize;

    // Standard 1D neighbors: left & right
    const leftX = Math.max(this.landscape.xMin, x - delta);
    const rightX = Math.min(this.landscape.xMax, x + delta);

    neighbors.push({ x: leftX, y: this.landscape.fn(leftX), dir: 'left' });
    neighbors.push({ x: rightX, y: this.landscape.fn(rightX), dir: 'right' });

    // Additional sampled micro-neighbors if stepSize is large
    if (this.numNeighbors > 2) {
      for (let i = 0; i < this.numNeighbors - 2; i++) {
        const offset = (Math.random() * 2 - 1) * delta;
        const candidateX = Math.max(this.landscape.xMin, Math.min(this.landscape.xMax, x + offset));
        neighbors.push({ x: candidateX, y: this.landscape.fn(candidateX), dir: offset > 0 ? 'right' : 'left' });
      }
    }

    return neighbors;
  }

  step() {
    if (this.status === 'completed' || this.status === 'local_max' || this.status === 'plateau') {
      if (this.variant === 'randomRestart' && this.restarts < this.maxRestarts) {
        this.performRestart();
        return this.getTelemetry();
      }
      return this.getTelemetry();
    }

    this.iterations++;
    this.status = 'climbing';

    const neighbors = this.getNeighbors(this.currentX);
    this.lastEvaluatedNeighbors = neighbors;

    let nextStep = null;
    const improvingNeighbors = neighbors.filter(n => n.y > this.currentY + 1e-5);
    const flatNeighbors = neighbors.filter(n => Math.abs(n.y - this.currentY) <= 1e-5);

    if (this.variant === 'simple' || this.variant === 'firstChoice') {
      // First improving neighbor found
      if (improvingNeighbors.length > 0) {
        nextStep = improvingNeighbors[0];
      }
    } else if (this.variant === 'stochastic') {
      // Stochastic selection proportional to improvement
      if (improvingNeighbors.length > 0) {
        const totalDelta = improvingNeighbors.reduce((sum, n) => sum + (n.y - this.currentY), 0);
        let rand = Math.random() * totalDelta;
        for (const n of improvingNeighbors) {
          rand -= (n.y - this.currentY);
          if (rand <= 0) {
            nextStep = n;
            break;
          }
        }
        if (!nextStep) nextStep = improvingNeighbors[0];
      }
    } else {
      // Steepest Ascent (Default & Random-Restart base)
      let bestNeighbor = null;
      let maxVal = this.currentY;

      for (const n of neighbors) {
        if (n.y > maxVal) {
          maxVal = n.y;
          bestNeighbor = n;
        }
      }
      nextStep = bestNeighbor;
    }

    if (nextStep && nextStep.y > this.currentY + 1e-5) {
      this.currentX = nextStep.x;
      this.currentY = nextStep.y;
      this.trajectory.push({ x: this.currentX, y: this.currentY, restart: this.restarts });

      if (this.currentY > this.bestEver.y) {
        this.bestEver = { x: this.currentX, y: this.currentY };
      }
    } else {
      // No improvement found in neighborhood
      if (flatNeighbors.length > 0 && Math.abs(flatNeighbors[0].y - this.currentY) < 1e-6) {
        this.status = 'plateau';
      } else {
        this.status = 'local_max';
      }

      if (this.variant === 'randomRestart') {
        if (this.restarts < this.maxRestarts) {
          this.performRestart();
        } else {
          this.status = 'completed';
        }
      }
    }

    if (this.iterations >= this.maxIterations && this.status === 'climbing') {
      this.status = 'completed';
    }

    return this.getTelemetry();
  }

  performRestart() {
    this.restartHistories.push({
      restartIndex: this.restarts,
      finalX: this.currentX,
      finalY: this.currentY,
      trajectory: [...this.trajectory]
    });

    this.restarts++;
    const range = this.landscape.xMax - this.landscape.xMin;
    this.currentX = this.landscape.xMin + Math.random() * range;
    this.currentY = this.landscape.fn(this.currentX);
    this.status = 'climbing';
    this.trajectory.push({ x: this.currentX, y: this.currentY, restart: this.restarts });

    if (this.currentY > this.bestEver.y) {
      this.bestEver = { x: this.currentX, y: this.currentY };
    }
  }

  getTelemetry() {
    const isGlobalOptimal = Math.abs(this.currentX - this.landscape.globalMax.x) < (this.stepSize * 1.5) &&
                            Math.abs(this.currentY - this.landscape.globalMax.y) < 0.5;

    return {
      currentX: this.currentX,
      currentY: this.currentY,
      fitness: this.currentY,
      iterations: this.iterations,
      restarts: this.restarts,
      status: isGlobalOptimal && (this.status === 'local_max' || this.status === 'completed') ? 'global_optimal' : this.status,
      bestEver: this.bestEver,
      trajectory: this.trajectory,
      lastEvaluatedNeighbors: this.lastEvaluatedNeighbors,
      landscape: this.landscape,
      variant: this.variant
    };
  }
}
