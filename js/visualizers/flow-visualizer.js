/**
 * Flow Network & MCMF Canvas Visualizer
 * Modelación y Simulación — UVG
 */

import { MinCostMaxFlowSolver, FLOW_PRESETS } from '../algorithms/min-cost-flow.js';

export class FlowVisualizer {
  constructor(canvasElement, config = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.solver = new MinCostMaxFlowSolver(config.preset || FLOW_PRESETS.diamond);
    this.onTelemetryUpdate = config.onTelemetryUpdate || (() => {});
    this.speed = config.speed || 800; // ms per step
    this.isRunning = false;
    this.timer = null;

    this.draggingNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.particleOffset = 0; // For particle animation loop
    this.animFrameId = null;

    this.initCanvas();
    this.bindEvents();
    this.startAnimationLoop();
    this.render();
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 750;
    const height = rect.height || 420;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = width;
    this.height = height;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.render();
    });

    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left),
        y: (e.clientY - rect.top)
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);
      // Check if clicked on a node
      for (const node of this.solver.nodes) {
        const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
        if (dist <= 26) {
          this.draggingNode = node;
          this.dragOffset = { x: pos.x - node.x, y: pos.y - node.y };
          break;
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.draggingNode) return;
      const pos = getMousePos(e);
      this.draggingNode.x = Math.max(35, Math.min(this.width - 35, pos.x - this.dragOffset.x));
      this.draggingNode.y = Math.max(35, Math.min(this.height - 35, pos.y - this.dragOffset.y));
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.draggingNode = null;
    });
  }

  startAnimationLoop() {
    const loop = () => {
      this.particleOffset = (this.particleOffset + 0.015) % 1;
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  loadPreset(presetKey) {
    this.pause();
    const preset = FLOW_PRESETS[presetKey] || FLOW_PRESETS.diamond;
    this.solver.initFromPreset(preset);
    this.render();
    this.notifyTelemetry();
  }

  setSpeed(ms) {
    this.speed = ms;
    if (this.isRunning) {
      this.pause();
      this.play();
    }
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

      if (telemetry.status === 'optimal_flow_reached') {
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

  reset() {
    this.pause();
    this.solver.reset();
    this.render();
    this.notifyTelemetry();
  }

  notifyTelemetry(telemetry) {
    this.onTelemetryUpdate(telemetry || this.solver.getTelemetry());
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const telemetry = this.solver.getTelemetry();
    const augmentingEdges = new Set((telemetry.currentAugmentingPath || []).map(e => `${e.u}->${e.v}`));

    // 1. Draw Min-Cut line if reached optimal
    if (telemetry.status === 'optimal_flow_reached' && telemetry.minCutEdges.length > 0) {
      this.drawMinCutOverlay(telemetry);
    }

    // 2. Draw Edges
    for (const e of this.solver.edges) {
      const uNode = this.solver.nodes.find(n => n.id === e.u);
      const vNode = this.solver.nodes.find(n => n.id === e.v);
      if (uNode && vNode) {
        const isAugmenting = augmentingEdges.has(`${e.u}->${e.v}`);
        this.drawDirectedEdge(uNode, vNode, e, isAugmenting);
      }
    }

    // 3. Draw Nodes
    for (const node of this.solver.nodes) {
      this.drawNode(node, telemetry);
    }
  }

  drawDirectedEdge(u, v, edge, isAugmenting) {
    const ctx = this.ctx;
    ctx.save();

    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    // Unit vector
    const ux = dx / dist;
    const uy = dy / dist;

    // Offset from node circles (radius ~24)
    const nodeRadius = 24;
    const startX = u.x + ux * nodeRadius;
    const startY = u.y + uy * nodeRadius;
    const endX = v.x - ux * (nodeRadius + 6);
    const endY = v.y - uy * (nodeRadius + 6);

    // Style according to flow / capacity
    const isSaturated = edge.flow >= edge.capacity && edge.capacity > 0;
    const hasFlow = edge.flow > 0;

    let strokeColor = '#94a3b8'; // Slate 400
    let lineWidth = 2;

    if (isAugmenting) {
      strokeColor = '#06b6d4'; // Cyan 500
      lineWidth = 4.5;
    } else if (isSaturated) {
      strokeColor = '#ef4444'; // Red 500
      lineWidth = 3.5;
    } else if (hasFlow) {
      strokeColor = '#10b981'; // Emerald 500
      lineWidth = 3;
    }

    // Draw Edge Line
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw Arrowhead
    const arrowLen = 10;
    const arrowAngle = Math.PI / 6;
    const angle = Math.atan2(dy, dx);

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(endX + ux * 6, endY + uy * 6);
    ctx.lineTo(
      endX - arrowLen * Math.cos(angle - arrowAngle),
      endY - arrowLen * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      endX - arrowLen * Math.cos(angle + arrowAngle),
      endY - arrowLen * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();

    // Draw Flow Particles if active
    if (hasFlow) {
      const pCount = Math.min(4, Math.ceil(edge.flow / 2));
      for (let i = 0; i < pCount; i++) {
        const offsetRatio = (this.particleOffset + i / pCount) % 1;
        const px = startX + (endX - startX) * offsetRatio;
        const py = startY + (endY - startY) * offsetRatio;

        ctx.fillStyle = isAugmenting ? '#cffafe' : '#a7f3d0';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Edge Badge (Flow / Capacity & Cost)
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    // Badge Background
    const badgeText = `${edge.flow}/${edge.capacity}`;
    const costText = `$${edge.cost}`;

    ctx.font = 'bold 10px Fira Code, monospace';
    const textWidth = ctx.measureText(`${badgeText} (${costText})`).width;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(midX - textWidth / 2 - 5, midY - 10, textWidth + 10, 20, 6);
    ctx.fill();
    ctx.stroke();

    // Text: Flow / Cap (White / Emerald / Red)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSaturated ? '#fca5a5' : hasFlow ? '#6ee7b7' : '#e2e8f0';
    ctx.fillText(badgeText, midX - textWidth / 2, midY);

    // Text: Cost (Amber)
    ctx.fillStyle = '#fcd34d';
    ctx.fillText(` (${costText})`, midX - textWidth / 2 + ctx.measureText(badgeText).width, midY);

    ctx.restore();
  }

  drawNode(node, telemetry) {
    const ctx = this.ctx;
    ctx.save();

    const isSource = node.type === 'source';
    const isSink = node.type === 'sink';
    const isReachable = telemetry.reachableNodes.includes(node.id);

    // Node Outer Ring / Background
    let bgColor = '#334155'; // Slate 700
    let borderColor = '#64748b';
    let textColor = '#ffffff';

    if (isSource) {
      bgColor = '#059669'; // Emerald 600
      borderColor = '#34d399';
    } else if (isSink) {
      bgColor = '#e11d48'; // Rose 600
      borderColor = '#fb7185';
    } else if (isReachable && telemetry.status === 'optimal_flow_reached') {
      bgColor = '#4338ca'; // Indigo 700
      borderColor = '#818cf8';
    }

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Node Circle
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Node Label
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.id, node.x, node.y);

    // Full Node Description Tag Below
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(node.label || node.id, node.x, node.y + 34);

    ctx.restore();
  }

  drawMinCutOverlay(telemetry) {
    const ctx = this.ctx;
    ctx.save();

    // Highlight S-set vs T-set nodes with soft aura
    for (const node of this.solver.nodes) {
      const inS = telemetry.reachableNodes.includes(node.id);
      ctx.fillStyle = inS ? 'rgba(99, 102, 241, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  destroy() {
    this.pause();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
