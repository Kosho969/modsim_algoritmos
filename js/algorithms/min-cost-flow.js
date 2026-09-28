/**
 * Min-Cost Max-Flow (MCMF) & Network Flow Engine
 * Modelación y Simulación — UVG
 */

export const FLOW_PRESETS = {
  diamond: {
    id: 'diamond',
    name: 'Red Diamante (Caminos Competitivos)',
    description: 'Red clásica de 4 nodos que ilustra cómo el algoritmo equilibra rutas baratas con rutas de mayor capacidad.',
    nodes: [
      { id: 'S', label: 'Fuente (S)', x: 100, y: 220, type: 'source' },
      { id: 'A', label: 'Nodo A', x: 350, y: 100, type: 'transit' },
      { id: 'B', label: 'Nodo B', x: 350, y: 340, type: 'transit' },
      { id: 'T', label: 'Sumidero (T)', x: 600, y: 220, type: 'sink' }
    ],
    edges: [
      { id: 'e1', u: 'S', v: 'A', capacity: 4, cost: 1 },
      { id: 'e2', u: 'S', v: 'B', capacity: 2, cost: 2 },
      { id: 'e3', u: 'A', v: 'B', capacity: 2, cost: 1 },
      { id: 'e4', u: 'A', v: 'T', capacity: 3, cost: 3 },
      { id: 'e5', u: 'B', v: 'T', capacity: 4, cost: 1 }
    ]
  },

  supplyChain: {
    id: 'supplyChain',
    name: 'Cadena de Suministro Logística (6 Nodos)',
    description: 'Modelo de transporte desde una Fábrica Central hasta el Mercado Consumidor a través de Almacenes y Centros de Distribución.',
    nodes: [
      { id: 'S', label: 'Fábrica Central (S)', x: 80, y: 220, type: 'source' },
      { id: 'W1', label: 'Almacén Norte (W1)', x: 260, y: 110, type: 'transit' },
      { id: 'W2', label: 'Almacén Sur (W2)', x: 260, y: 330, type: 'transit' },
      { id: 'D1', label: 'Distribución 1 (D1)', x: 440, y: 110, type: 'transit' },
      { id: 'D2', label: 'Distribución 2 (D2)', x: 440, y: 330, type: 'transit' },
      { id: 'T', label: 'Mercado Final (T)', x: 620, y: 220, type: 'sink' }
    ],
    edges: [
      { id: 'e1', u: 'S', v: 'W1', capacity: 10, cost: 2 },
      { id: 'e2', u: 'S', v: 'W2', capacity: 8, cost: 3 },
      { id: 'e3', u: 'W1', v: 'D1', capacity: 6, cost: 1 },
      { id: 'e4', u: 'W1', v: 'D2', capacity: 5, cost: 4 },
      { id: 'e5', u: 'W2', v: 'D1', capacity: 4, cost: 2 },
      { id: 'e6', u: 'W2', v: 'D2', capacity: 6, cost: 1 },
      { id: 'e7', u: 'D1', v: 'T', capacity: 8, cost: 2 },
      { id: 'e8', u: 'D2', v: 'T', capacity: 9, cost: 2 }
    ]
  },

  bottleneckTrap: {
    id: 'bottleneckTrap',
    name: 'Trampa de Ford-Fulkerson (Puente Central)',
    description: 'Muestra la necesidad del flujo residual para cancelar flujo en el canal central y alcanzar el flujo máximo.',
    nodes: [
      { id: 'S', label: 'Fuente (S)', x: 100, y: 220, type: 'source' },
      { id: 'A', label: 'Nodo A', x: 350, y: 100, type: 'transit' },
      { id: 'B', label: 'Nodo B', x: 350, y: 340, type: 'transit' },
      { id: 'T', label: 'Sumidero (T)', x: 600, y: 220, type: 'sink' }
    ],
    edges: [
      { id: 'e1', u: 'S', v: 'A', capacity: 10, cost: 1 },
      { id: 'e2', u: 'S', v: 'B', capacity: 10, cost: 1 },
      { id: 'e3', u: 'A', v: 'B', capacity: 1, cost: 0 },
      { id: 'e4', u: 'A', v: 'T', capacity: 10, cost: 1 },
      { id: 'e5', u: 'B', v: 'T', capacity: 10, cost: 1 }
    ]
  }
};

export class MinCostMaxFlowSolver {
  constructor(networkData) {
    this.initFromPreset(networkData || FLOW_PRESETS.diamond);
  }

  initFromPreset(preset) {
    this.nodes = JSON.parse(JSON.stringify(preset.nodes));
    this.originalEdges = JSON.parse(JSON.stringify(preset.edges));
    this.sourceId = this.nodes.find(n => n.type === 'source')?.id || this.nodes[0].id;
    this.sinkId = this.nodes.find(n => n.type === 'sink')?.id || this.nodes[this.nodes.length - 1].id;

    this.reset();
  }

  reset() {
    this.totalFlow = 0;
    this.totalCost = 0;
    this.iterations = 0;
    this.status = 'ready'; // 'ready', 'augmenting', 'optimal_flow_reached'
    this.currentAugmentingPath = null;
    this.lastBottleneck = 0;
    this.minCutEdges = [];
    this.reachableNodes = new Set();
    this.historyPaths = [];

    // Build internal residual graph representation
    // Adjacency list: node -> array of internal edges
    this.adj = {};
    for (const node of this.nodes) {
      this.adj[node.id] = [];
    }

    this.edges = [];
    let edgeIndex = 0;

    for (const e of this.originalEdges) {
      const forwardEdge = {
        id: e.id,
        u: e.u,
        v: e.v,
        capacity: e.capacity,
        flow: 0,
        cost: e.cost,
        isResidual: false,
        revIndex: 0
      };

      const backwardEdge = {
        id: `${e.id}_rev`,
        u: e.v,
        v: e.u,
        capacity: 0,
        flow: 0,
        cost: -e.cost,
        isResidual: true,
        revIndex: 0
      };

      const fIdx = this.adj[e.u].length;
      const bIdx = this.adj[e.v].length;

      forwardEdge.revIndex = bIdx;
      backwardEdge.revIndex = fIdx;

      this.adj[e.u].push(forwardEdge);
      this.adj[e.v].push(backwardEdge);

      this.edges.push(forwardEdge);
    }
  }

  /**
   * Find Shortest Path in Residual Graph with SPFA (Shortest Path Faster Algorithm)
   * Handles negative edge costs arising from flow cancellation.
   */
  findShortestAugmentingPath() {
    const dist = {};
    const parentEdge = {};
    const inQueue = {};
    const count = {};

    for (const node of this.nodes) {
      dist[node.id] = Infinity;
      parentEdge[node.id] = null;
      inQueue[node.id] = false;
      count[node.id] = 0;
    }

    const queue = [this.sourceId];
    dist[this.sourceId] = 0;
    inQueue[this.sourceId] = true;

    while (queue.length > 0) {
      const u = queue.shift();
      inQueue[u] = false;

      for (let i = 0; i < this.adj[u].length; i++) {
        const edge = this.adj[u][i];
        const v = edge.v;
        const residualCapacity = edge.capacity - edge.flow;

        if (residualCapacity > 1e-6 && dist[u] + edge.cost < dist[v] - 1e-6) {
          dist[v] = dist[u] + edge.cost;
          parentEdge[v] = { u, edgeIndex: i, edge };

          if (!inQueue[v]) {
            queue.push(v);
            inQueue[v] = true;
            count[v]++;
            if (count[v] > this.nodes.length) {
              // Negative cycle detected (guard)
              break;
            }
          }
        }
      }
    }

    if (dist[this.sinkId] === Infinity) {
      return null; // No augmenting path exists
    }

    // Reconstruct path
    const pathEdges = [];
    let curr = this.sinkId;
    let bottleneck = Infinity;

    while (curr !== this.sourceId) {
      const p = parentEdge[curr];
      if (!p) break;
      const edge = p.edge;
      bottleneck = Math.min(bottleneck, edge.capacity - edge.flow);
      pathEdges.unshift(edge);
      curr = p.u;
    }

    return {
      edges: pathEdges,
      costPerUnit: dist[this.sinkId],
      bottleneck: bottleneck
    };
  }

  step() {
    if (this.status === 'optimal_flow_reached') {
      return this.getTelemetry();
    }

    const aug = this.findShortestAugmentingPath();

    if (!aug || aug.bottleneck <= 1e-6) {
      this.status = 'optimal_flow_reached';
      this.currentAugmentingPath = null;
      this.calculateMinCut();
      return this.getTelemetry();
    }

    this.iterations++;
    this.status = 'augmenting';
    this.currentAugmentingPath = aug.edges;
    this.lastBottleneck = aug.bottleneck;

    // Augment flow along path in residual network
    for (const edge of aug.edges) {
      edge.flow += aug.bottleneck;
      // Get reverse edge
      const revEdge = this.adj[edge.v][edge.revIndex];
      revEdge.flow -= aug.bottleneck;
    }

    this.totalFlow += aug.bottleneck;
    this.recalculateTotalCost();

    this.historyPaths.push({
      iteration: this.iterations,
      path: aug.edges.map(e => `${e.u}→${e.v}`).join(', '),
      flowAdded: aug.bottleneck,
      unitCost: aug.costPerUnit,
      totalFlowSoFar: this.totalFlow,
      totalCostSoFar: this.totalCost
    });

    return this.getTelemetry();
  }

  runToCompletion(maxSteps = 500) {
    let steps = 0;
    while (this.status !== 'optimal_flow_reached' && steps < maxSteps) {
      this.step();
      steps++;
    }
    return this.getTelemetry();
  }

  recalculateTotalCost() {
    let cost = 0;
    for (const e of this.edges) {
      if (e.flow > 0) {
        cost += e.flow * e.cost;
      }
    }
    this.totalCost = cost;
  }

  calculateMinCut() {
    // BFS on residual graph from Source S
    const visited = new Set();
    const queue = [this.sourceId];
    visited.add(this.sourceId);

    while (queue.length > 0) {
      const u = queue.shift();
      for (const edge of this.adj[u]) {
        const residual = edge.capacity - edge.flow;
        if (residual > 1e-6 && !visited.has(edge.v)) {
          visited.add(edge.v);
          queue.push(edge.v);
        }
      }
    }

    this.reachableNodes = visited;

    // Min-Cut edges are forward original edges from visited to unvisited
    this.minCutEdges = [];
    for (const e of this.edges) {
      if (visited.has(e.u) && !visited.has(e.v)) {
        this.minCutEdges.push(e);
      }
    }
  }

  getNodeBalance(nodeId) {
    let inFlow = 0;
    let outFlow = 0;

    for (const e of this.edges) {
      if (e.v === nodeId && e.flow > 0) inFlow += e.flow;
      if (e.u === nodeId && e.flow > 0) outFlow += e.flow;
    }

    return { inFlow, outFlow, net: inFlow - outFlow };
  }

  getTelemetry() {
    return {
      status: this.status,
      totalFlow: this.totalFlow,
      totalCost: this.totalCost,
      iterations: this.iterations,
      currentAugmentingPath: this.currentAugmentingPath,
      lastBottleneck: this.lastBottleneck,
      minCutEdges: this.minCutEdges,
      reachableNodes: Array.from(this.reachableNodes),
      edges: this.edges,
      nodes: this.nodes,
      historyPaths: this.historyPaths,
      sourceId: this.sourceId,
      sinkId: this.sinkId
    };
  }
}
