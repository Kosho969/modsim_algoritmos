# Modelación y Simulación — Búsqueda, Optimización y Flujo en Redes

Entorno docente interactivo, presentación de diapositivas en **Reveal.js** y laboratorios visuales de simulación para el curso de **Modelación y Simulación (CC3088)** en la **Universidad del Valle de Guatemala (UVG)**.

---

## 🚀 Contenido del Proyecto

1. **Portal Principal (`index.html`)**: Landing page moderna con conceptos teóricos, comparativas formales, cuadros de complejidad y accesos directos a los laboratorios.
2. **Presentación de Clase (`presentation.html`)**: Diapositivas interactivas en Reveal.js listas para dictar clase, con fórmulas matemáticas, diagramas técnicos y **mini-widgets interactivos incrustados** para demostraciones en vivo.
3. **Simulador de Hill Climbing (`demos/hill-climbing.html`)**:
   - Paisajes de optimización interactivos (Multi-Pico con trampas locales, Colina simple convexa, Meseta plana, Estilo Rastrigin).
   - Variantes seleccionables: *Steepest Ascent*, *First-Choice*, *Stochastic* y *Random-Restart*.
   - Posicionamiento interactivo mediante click en el gráfico, control de paso $\delta$, velocidad y telemetría en vivo.
4. **Simulador de Algoritmo A\* (`demos/a-star.html`)**:
   - Cuadrícula 2D interactiva con dibujo de obstáculos, barro (costo 3x) y agua (costo 5x).
   - Desglose numérico en tiempo real de $f(n) = g(n) + h(n)$ en cada celda.
   - Modos comparables: *A\* Search*, *Dijkstra ($h=0$)*, *Greedy Best-First ($g=0$)* y *Weighted A\** con slider de peso.
   - Heurísticas: Manhattan ($L_1$), Euclidiana ($L_2$), Chebyshev / Octile.
   - Generador de laberintos (DFS Backtracker), trampas en U y pantanos.
   - Inspección en vivo de la Cola de Prioridad (MinHeap).
5. **Simulador de Flujo Máximo y Costo Mínimo (`demos/min-cost-max-flow.html`)**:
   - Grafo interactivo en Canvas 2D con nodos arrastrables y tuberías con flujo animado.
   - Algoritmo Successive Shortest Path con SPFA en red residual (manejando cancelación de flujo y costos negativos).
   - Verificación de leyes de conservación ($\sum f_{in} = \sum f_{out}$) y capacidades.
   - Detección automática del Corte Mínimo (Teorema Max-Flow Min-Cut).
   - Modelos preconfigurados: *Red Diamante, Cadena de Suministro Logística (6 nodos) y Trampa de Ford-Fulkerson*.

---

## 🛠️ Ejecución Local

Dado que el proyecto está construido con **HTML5 Vanilla + ES6 Modules + Tailwind CSS + Reveal.js (CDN)**, no requiere compilar ningún backend ni instalar dependencias pesadas:

### Opción 1: Con Python
```bash
python3 -m http.server 8080
# Abre http://localhost:8080 en tu navegador
```

### Opción 2: Con Node (npx serve o live-server)
```bash
npx serve .
```

---

## 🧪 Pruebas Automatizadas

Ejecuta el conjunto de pruebas unitarias en Node.js:
```bash
npm test
# o: node test.js
```

---

## 🌐 Despliegue en GitHub Pages

1. Inicializa el repositorio git y haz push a tu cuenta de GitHub:
   ```bash
   git add .
   git commit -m "feat: complete modsim interactive suite with HC, A* and MCMF"
   git remote add origin https://github.com/menene/modsim.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub: ve a **Settings** > **Pages** > selecciona **Deploy from a branch (`main` / root)**.
3. El portal quedará disponible automáticamente en `https://menene.github.io/modsim/`.

---

## 📚 Estructura de Archivos

```
.
├── index.html                  # Portal principal
├── presentation.html           # Diapositivas Reveal.js
├── README.md                   # Documentación del proyecto
├── .gitignore                  # Exclusiones de Git
├── package.json                # Configuración ES Modules y scripts
├── test.js                     # Suite de pruebas unitarias
├── css/
│   └── styles.css              # Estilos compartidos y temas
├── js/
│   ├── algorithms/
│   │   ├── hill-climbing.js    # Motor de optimización local y paisajes
│   │   ├── a-star.js           # Motor A*, MinHeap y heurísticas
│   │   ├── maze-generator.js   # Generador de laberintos y mapas
│   │   └── min-cost-flow.js    # Motor MCMF, red residual y Min-Cut
│   └── visualizers/
│       ├── hill-visualizer.js  # Renderizador Canvas 2D de Hill Climbing
│       ├── grid-visualizer.js  # Renderizador Canvas 2D de A*
│       └── flow-visualizer.js  # Renderizador Canvas 2D de Flujo en Redes
└── demos/
    ├── hill-climbing.html      # Laboratorio completo de Hill Climbing
    ├── a-star.html             # Laboratorio completo de A*
    └── min-cost-max-flow.html  # Laboratorio completo de Flujo MCMF
```
