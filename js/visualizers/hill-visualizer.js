/**
 * Hill Climbing Canvas Visualizer
 * Modelación y Simulación — UVG
 */

import { HillClimbingOptimizer, LANDSCAPES } from '../algorithms/hill-climbing.js';

export class HillVisualizer {
  constructor(canvasElement, config = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.optimizer = new HillClimbingOptimizer(config);
    this.onTelemetryUpdate = config.onTelemetryUpdate || (() => {});
    this.speed = config.speed || 100; // ms per step
    this.timer = null;
    this.isRunning = false;

    // Viewport padding
    this.padding = { top: 40, right: 40, bottom: 50, left: 50 };

    this.initCanvas();
    this.bindEvents();
    this.render();
  }

  initCanvas() {
    // Handle High DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Set display size
    const width = rect.width || 800;
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

    // Click to place agent
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const mathX = this.canvasToMathX(clickX);
      
      this.pause();
      this.optimizer.setInitialPosition(mathX);
      this.render();
      this.notifyTelemetry();
    });
  }

  mathToCanvasX(x) {
    const { xMin, xMax } = this.optimizer.landscape;
    const plotWidth = this.width - this.padding.left - this.padding.right;
    return this.padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  }

  canvasToMathX(cx) {
    const { xMin, xMax } = this.optimizer.landscape;
    const plotWidth = this.width - this.padding.left - this.padding.right;
    const clampedCx = Math.max(this.padding.left, Math.min(this.width - this.padding.right, cx));
    return xMin + ((clampedCx - this.padding.left) / plotWidth) * (xMax - xMin);
  }

  mathToCanvasY(y, yMin = 0, yMax = 18) {
    const plotHeight = this.height - this.padding.top - this.padding.bottom;
    return this.height - this.padding.bottom - ((y - yMin) / (yMax - yMin)) * plotHeight;
  }

  setLandscape(key) {
    this.pause();
    this.optimizer.setLandscape(key);
    this.render();
    this.notifyTelemetry();
  }

  setVariant(variant) {
    this.pause();
    this.optimizer.setVariant(variant);
    this.render();
    this.notifyTelemetry();
  }

  setStepSize(size) {
    this.optimizer.setStepSize(size);
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
    const telemetry = this.optimizer.step();
    this.render();
    this.notifyTelemetry(telemetry);
    return telemetry;
  }

  play() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      const telemetry = this.optimizer.step();
      this.render();
      this.notifyTelemetry(telemetry);

      if (telemetry.status === 'completed' || 
          (this.optimizer.variant !== 'randomRestart' && (telemetry.status === 'local_max' || telemetry.status === 'plateau' || telemetry.status === 'global_optimal'))) {
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
    this.optimizer.reset();
    this.render();
    this.notifyTelemetry();
  }

  notifyTelemetry(telemetry) {
    this.onTelemetryUpdate(telemetry || this.optimizer.getTelemetry());
  }

  render() {
    const ctx = this.ctx;
    const { xMin, xMax, fn, globalMax } = this.optimizer.landscape;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // Calculate Y range
    let yMin = 0;
    let yMax = 16;
    if (this.optimizer.landscapeKey === 'rastrigin') yMax = 32;

    // 1. Draw Grid & Axes
    this.drawGrid(xMin, xMax, yMin, yMax);

    // 2. Draw Curve Landscape
    this.drawLandscapeCurve(xMin, xMax, yMin, yMax, fn);

    // 3. Draw Global Optimum Target Marker
    if (globalMax) {
      this.drawGlobalOptimumMarker(globalMax, yMin, yMax);
    }

    // 4. Draw Restart Histories (if random restart mode)
    this.drawRestartHistories(yMin, yMax);

    // 5. Draw Trajectory Path
    this.drawTrajectory(yMin, yMax);

    // 6. Draw Neighbor Probes (if available)
    this.drawNeighborProbes(yMin, yMax);

    // 7. Draw Current Climber Particle
    this.drawClimber(yMin, yMax);
  }

  drawGrid(xMin, xMax, yMin, yMax) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '11px Fira Code, monospace';
    ctx.fillStyle = '#94a3b8';

    // Vertical grid lines
    const xStep = (xMax - xMin) <= 12 ? 2 : 4;
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += xStep) {
      const cx = this.mathToCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, this.padding.top);
      ctx.lineTo(cx, this.height - this.padding.bottom);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(x.toString(), cx, this.height - this.padding.bottom + 18);
    }

    // Horizontal grid lines
    const yStep = yMax > 20 ? 5 : 2;
    for (let y = yMin; y <= yMax; y += yStep) {
      const cy = this.mathToCanvasY(y, yMin, yMax);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, cy);
      ctx.lineTo(this.width - this.padding.right, cy);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(y.toString(), this.padding.left - 10, cy + 4);
    }

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Espacio de Estados (x)', this.width / 2, this.height - 10);
    
    ctx.save();
    ctx.translate(16, this.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Función Objetivo f(x)', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  drawLandscapeCurve(xMin, xMax, yMin, yMax, fn) {
    const ctx = this.ctx;
    ctx.save();

    // Fill Gradient under curve
    const gradient = ctx.createLinearGradient(0, this.padding.top, 0, this.height - this.padding.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.02)');

    ctx.beginPath();
    const samples = 250;
    const dx = (xMax - xMin) / samples;

    const startX = this.mathToCanvasX(xMin);
    const startY = this.mathToCanvasY(fn(xMin), yMin, yMax);
    ctx.moveTo(startX, startY);

    for (let i = 1; i <= samples; i++) {
      const mx = xMin + i * dx;
      const my = fn(mx);
      ctx.lineTo(this.mathToCanvasX(mx), this.mathToCanvasY(my, yMin, yMax));
    }

    ctx.lineTo(this.mathToCanvasX(xMax), this.height - this.padding.bottom);
    ctx.lineTo(this.mathToCanvasX(xMin), this.height - this.padding.bottom);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline Curve
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 1; i <= samples; i++) {
      const mx = xMin + i * dx;
      const my = fn(mx);
      ctx.lineTo(this.mathToCanvasX(mx), this.mathToCanvasY(my, yMin, yMax));
    }
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  drawGlobalOptimumMarker(globalMax, yMin, yMax) {
    const ctx = this.ctx;
    const cx = this.mathToCanvasX(globalMax.x);
    const cy = this.mathToCanvasY(globalMax.y, yMin, yMax);

    ctx.save();
    // Star or Flag icon
    ctx.strokeStyle = '#eab308';
    ctx.fillStyle = '#fef08a';
    ctx.lineWidth = 2;
    
    // Dashed guide line down
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, this.height - this.padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flag badge
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#854d0e';
    ctx.textAlign = 'center';
    ctx.fillText('Óptimo Global', cx, cy - 14);

    ctx.restore();
  }

  drawRestartHistories(yMin, yMax) {
    const ctx = this.ctx;
    if (!this.optimizer.restartHistories.length) return;

    ctx.save();
    for (const hist of this.optimizer.restartHistories) {
      if (hist.trajectory.length < 2) continue;

      ctx.beginPath();
      const first = hist.trajectory[0];
      ctx.moveTo(this.mathToCanvasX(first.x), this.mathToCanvasY(first.y, yMin, yMax));

      for (let i = 1; i < hist.trajectory.length; i++) {
        const pt = hist.trajectory[i];
        ctx.lineTo(this.mathToCanvasX(pt.x), this.mathToCanvasY(pt.y, yMin, yMax));
      }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw ghost flag at trapped spot
      const finalX = this.mathToCanvasX(hist.finalX);
      const finalY = this.mathToCanvasY(hist.finalY, yMin, yMax);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.beginPath();
      ctx.arc(finalX, finalY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTrajectory(yMin, yMax) {
    const traj = this.optimizer.trajectory;
    if (traj.length < 2) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    const first = traj[0];
    ctx.moveTo(this.mathToCanvasX(first.x), this.mathToCanvasY(first.y, yMin, yMax));

    for (let i = 1; i < traj.length; i++) {
      const pt = traj[i];
      ctx.lineTo(this.mathToCanvasX(pt.x), this.mathToCanvasY(pt.y, yMin, yMax));
    }
    ctx.stroke();

    // Step dots
    ctx.fillStyle = '#0891b2';
    for (const pt of traj) {
      ctx.beginPath();
      ctx.arc(this.mathToCanvasX(pt.x), this.mathToCanvasY(pt.y, yMin, yMax), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawNeighborProbes(yMin, yMax) {
    const neighbors = this.optimizer.lastEvaluatedNeighbors;
    if (!neighbors || !neighbors.length) return;

    const ctx = this.ctx;
    ctx.save();

    for (const nb of neighbors) {
      const cx = this.mathToCanvasX(nb.x);
      const cy = this.mathToCanvasY(nb.y, yMin, yMax);
      const isImprovement = nb.y > this.optimizer.currentY + 1e-5;

      ctx.fillStyle = isImprovement ? '#10b981' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Connector line from current
      ctx.strokeStyle = isImprovement ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(this.mathToCanvasX(this.optimizer.currentX), this.mathToCanvasY(this.optimizer.currentY, yMin, yMax));
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawClimber(yMin, yMax) {
    const cx = this.mathToCanvasX(this.optimizer.currentX);
    const cy = this.mathToCanvasY(this.optimizer.currentY, yMin, yMax);
    const ctx = this.ctx;

    ctx.save();

    // Pulse Ring
    const pulseColor = this.optimizer.status === 'local_max' ? 'rgba(239, 68, 68, 0.4)' :
                       this.optimizer.status === 'plateau' ? 'rgba(245, 158, 11, 0.4)' :
                       this.optimizer.status === 'global_optimal' ? 'rgba(16, 185, 129, 0.5)' :
                       'rgba(99, 102, 241, 0.4)';

    ctx.fillStyle = pulseColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Core Particle
    const coreColor = this.optimizer.status === 'local_max' ? '#dc2626' :
                      this.optimizer.status === 'plateau' ? '#d97706' :
                      this.optimizer.status === 'global_optimal' ? '#059669' :
                      '#4338ca';

    ctx.fillStyle = coreColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating Label with current Fitness
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px Fira Code, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`f(x) = ${this.optimizer.currentY.toFixed(2)}`, cx, cy - 20);

    ctx.restore();
  }
}
