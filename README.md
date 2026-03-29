<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url] [![Issues][issues-shield]][issues-url] [![Forks][forks-shield]][forks-url] [![LinkedIn][linkedin-shield]][linkedin-url]

<div align="center">
  <h3 align="center">Orbium</h3>
  <p align="center">
    A browser-based generative ambient synthesizer driven by orbital mechanics.
    <br />
    <a href="https://github.com/djones-dev/orbium/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/djones-dev/orbium/issues">Request Feature</a>
  </p>
</div>

---

## About

Orbium reimagines music composition through the lens of orbital mechanics.
Instead of a traditional timeline, you place celestial bodies in orbit around a
central sun. Each body produces sound, and its orbital path determines the
rhythm and evolution of your composition.

The interface is split into two worlds:

1. **The Visualization** — an organic, shader-driven 3D view where planets
   breathe and pulse with their sonic characteristics.
2. **The Terminal** — a retro command center with box-drawing aesthetics and
   phosphor-glow text, giving you precise control over the synthesis parameters.

---

## Built With

- **React 18** + TypeScript + Vite
- **Three.js** via React Three Fiber
- **Web Audio API** (native browser)
- **FastAPI** + Python (backend)
- **PostgreSQL** (persistence)
- **Docker** + Nginx (deployment)

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- Docker & Docker Compose (for full stack)

### Quick Start

```bash
git clone https://github.com/djones-dev/orbium.git
cd orbium

# Frontend only  (fastest for UI/audio work)
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Full stack
cp .env.example .env          # fill in passwords
docker-compose up --build
# → http://localhost
```

See [infrastructure.md](infrastructure.md) for detailed setup, production
deployment, and database management.

---

## Usage

Once opened, you are greeted by the central Sun, which generates a continuous
harmonic drone.

- **Add Planets** — use the terminal controls to add planets (`+ PLANET`).
  Each planet is a distinct synthesizer voice.
- **Shape the Sound** — select a planet to adjust its parameters in the Body
  Inspector:
  - **Period** — orbital cycle speed (determines rhythmic trigger rate)
  - **Waveform** — sine, triangle, sawtooth, or square
  - **Filter** — cutoff and resonance sculpt the timbre
- **Visual Feedback** — planet shaders react to audio parameters in real time:
  a sawtooth planet looks jagged and aggressive; a sine planet appears smooth
  and liquid.

---

## Architecture

### High-Level Stack

```
Browser
  ├── ECS Simulation (Entity Component System)
  ├── Web Audio Engine  (synthesis + mixing)
  ├── Three.js Scene    (shader-driven visualization)
  └── Terminal UI       (React + Zustand)

Backend (FastAPI)
  ├── REST API  (/api/bodies, /api/presets)
  └── PostgreSQL (preset + scene persistence)
```

### ECS Simulation

The simulation layer uses an **Entity Component System** architecture —
separating data (components) from behavior (systems):

**Entities** are plain ID containers. All data lives in components:

| Component | Data |
|-----------|------|
| `Position` | `radius`, `angle` (polar) |
| `Velocity` | `angular`, `radial` |
| `Audio` | `layerId`, audio `parameters` |
| `Visual` | `color`, `size`, `shaderUniforms` |
| `Physics` | `mass`, `forces`, `damping` |
| `Hierarchy` | `parentId`, `childrenIds` |
| `Modulation` | modulation `routes[]` |

**Systems** query for entities with specific component combinations and run
each frame in priority order:

| System | Priority | Responsibility |
|--------|----------|----------------|
| `HierarchySystem` | 50 | Update child positions relative to parent |
| `PhysicsSystem` | 90 | Apply forces, update velocity |
| `MovementSystem` | 100 | Apply velocity to position |
| `CollisionSystem` | 150 | Detect proximity and emit events |
| `AudioSystem` | 200 | Sync audio layers with component state |
| `ModulationSystem` | 250 | Route modulation between entities |
| `RenderSystem` | 300 | Prepare Cartesian positions for Three.js |

**Example — querying movable entities:**

```typescript
const movable = entityManager.query([
    ComponentType.POSITION,
    ComponentType.VELOCITY,
]);
for (const entity of movable) {
    position.angle += velocity.angular * dt;
}
```

### Audio Engine

The `AudioEngine` singleton owns the Web Audio context and master chain:

```
SunLayer(s) → masterGain → compressor (−12 dB, 4:1) → limiter (−0.5 dB, 20:1) → analyser → destination
```

Communication with the simulation layer is decoupled through an `EventBus`:

```typescript
// Simulation emits
eventBus.emit(AudioEventType.BODY_ADDED, { body });

// AudioEngine reacts
eventBus.on(AudioEventType.BODY_ADDED, ({ body }) => {
    this.createLayerForBody(body);
});
```

---

## Development Guide

### Adding a New Audio Parameter

1. Add to `SunParameters` in `frontend/src/types/audio.ts`
2. Handle in `SunLayer.updateParams()` (`frontend/src/audio/SunLayer.ts`)
3. Add UI control in `SunPanel.tsx` or `ParameterEditor.tsx`
4. Update shader uniform in `visualization/Sun.tsx` if visual feedback needed

### Adding a New ECS Component

1. Create interface in `frontend/src/ecs/components/`
2. Add to `ComponentType` enum in `ecs/components/Component.ts`
3. Export from `ecs/components/index.ts`

### Adding a New ECS System

1. Extend `BaseSystem` in `frontend/src/ecs/systems/`
2. Implement `update(entityManager, deltaTime)` with component queries
3. Register in `frontend/src/ecs/World.ts` with appropriate priority

### Running Tests

```bash
# Frontend
cd frontend && npm test -- --run

# Backend
cd backend && pytest -v
```

---

## Roadmap

- [x] Core Web Audio engine (oscillators, filter, LFO, distortion, noise)
- [x] React Three Fiber visualization with shader-driven sun
- [x] Terminal-style UI (phosphor aesthetic, box-drawing characters)
- [x] Preset system with backend persistence
- [x] ECS architecture foundation
- [ ] Force-based orbital physics (gravity, perturbations)
- [ ] Parent-child hierarchies (moons orbiting planets)
- [ ] Proximity collision events with audio modulation
- [ ] Asteroid fields (granular synthesis via AudioWorklets)
- [ ] Comets (long-period elliptical orbits)
- [ ] Global tempo multiplier
- [ ] User accounts and cloud preset sharing

---

## License

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Project: [https://github.com/djones-dev/orbium](https://github.com/djones-dev/orbium)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/djones-dev/orbium.svg?style=for-the-badge
[contributors-url]: https://github.com/djones-dev/orbium/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/djones-dev/orbium.svg?style=for-the-badge
[forks-url]: https://github.com/djones-dev/orbium/network/members
[issues-shield]: https://img.shields.io/github/issues/djones-dev/orbium.svg?style=for-the-badge
[issues-url]: https://github.com/djones-dev/orbium/issues
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/daniel-jones-ba6325337
