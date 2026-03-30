# 🎶 Orbium – Audio‑Visual Data Flow Documentation

---

## 1. High‑Level Overview

```
User Input (UI) → OrbitalBodiesManager → ECS World
   ├─ EventBus (BODY_ADDED, PARAMS_CHANGED)
   │    └─ AudioEngine (creates/updates SunLayer)
   ├─ PhysicsSystem (calculates orbits & gravity)
   └─ RenderSystem (updates shader uniforms via Sun components)
```

The **Orbium** application uses a decoupled **Entity Component System (ECS)** architecture. The UI interacts with the `OrbitalBodiesManager`, which synchronizes state between the backend, the local simulation, and the ECS World.

1. **Audio Engine** – Listens to `EventBus` for body lifecycle and parameter changes, driving the Web Audio graph (`AudioEngine` → `SunLayer`).
2. **Visualization** – Consumes ECS components (`Position`, `Audio`, `Visual`) to drive React Three Fiber meshes and GLSL shaders (`visualization/Sun.tsx`).
3. **Orbital Simulation** – The `PhysicsSystem` calculates fixed-timestep motion, applying gravity and forces, which are then synced back to ECS components.

---

## 2. Detailed Data‑Flow Mapping

| Step | Source | Destination | Mechanism |
|------|--------|-------------|-----------|
| **2.1** | UI controls in `SunPanel.tsx` or `ParameterEditor.tsx` | `OrbitalBodiesManager` | Calls `updateBodyParams` with partial updates. |
| **2.2** | `OrbitalBodiesManager` | ECS World & EventBus | Updates `AudioComponent` in World; emits `PARAMS_CHANGED` event. |
| **2.3** | `EventBus` | `AudioEngine` | Handle `PARAMS_CHANGED` → calls `SunLayer.updateParams`. |
| **2.4** | ECS World | Shader uniforms | `Sun.tsx` `useFrame` hook reads `AudioComponent` and updates uniforms each frame. |
| **2.5** | `PhysicsSystem` | ECS World | Integrates forces/gravity; `MovementSystem` syncs resulting positions to `PositionComponent`. |
| **2.6** | Direct API | `OrbitalBodiesManager` | `AudioEngine.getInstance().bodiesManager.updateBodyParams(...)` |

---

## 3. Edit Points (Where Parameters Can Be Changed)

| Edit Point | File / Component | UI Element | Description |
|------------|------------------|-----------|-------------|
| **3.1** | `frontend/src/ui/SunPanel.tsx` | `TerminalSlider` | Sun primary controls.
| **3.2** | `frontend/src/ui/ParameterEditor.tsx` | `TerminalKnob` / `TerminalSelect` | Selected body inspector.
| **3.3** | `frontend/src/simulation/OrbitalBodiesManager.ts` | `updateBodyParams` method | Central entry point for all parameter mutations.
| **3.4** | `frontend/src/audio/AudioEngine.ts` | Event Listeners | Dispatches updates to corresponding audio layers.
| **3.5** | `frontend/src/audio/layers/SunLayer.ts` | `updateParams` method | Mutates the internal audio graph with 50ms smoothing ramps.
| **3.6** | `frontend/src/visualization/Sun.tsx` | `useFrame` logic | Reactively updates shader uniforms from ECS component state.
| **3.7** | `frontend/src/simulation/PhysicsSystem.ts` | `integrate` method | Hot-path calculation of orbital motion and gravity.

---

## 4. Parameter Catalog

| Parameter | Type | Default | UI Control | Modification Path |
|-----------|------|---------|------------|-------------------|
| `rootFrequency` | number (Hz) | `110` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `filterCutoff` | number (Hz) | `1000` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `detuneSpread` | number (cents) | `10` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `lfoRate` | number (Hz) | `0.5` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `gainLevel` | number (dB) | `-12` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `waveform` | enum | `sine` | Select | UI → Manager → ECS → Audio/Shader |
| `distortion` | number (0‑100) | `0` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `noiseVol` | number (dB) | `-40` | Slider / Knob | UI → Manager → ECS → Audio/Shader |
| `subVol` | number (dB) | `-12` | Slider / Knob | UI → Manager → ECS → Audio/Shader |

---

## 5. Source Files Referenced

- **ECS Core**: `frontend/src/ecs/`
- **Audio Engine**: `frontend/src/audio/AudioEngine.ts`
- **Audio Layers**: `frontend/src/audio/layers/SunLayer.ts`
- **Simulation**: `frontend/src/simulation/PhysicsSystem.ts`
- **Visualization**: `frontend/src/visualization/Sun.tsx`
- **Bridge**: `frontend/src/simulation/OrbitalBodiesManager.ts`

---

*Updated on 2026-03-29 by Gemini CLI (ECS Migration complete).*
