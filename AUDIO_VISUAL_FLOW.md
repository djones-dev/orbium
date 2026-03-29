# 🎶 Orbium – Audio‑Visual Data Flow Documentation

---

## 1. High‑Level Overview

```
User Input (UI) → React State (SunPanel) →
   ├─ Web Audio API (AudioEngine → SunLayer)
   ├─ Shader Uniforms (visualization/Sun.tsx)
   └─ Orbital Simulation (frontend/src/simulation/*)
```

The **Orbium** application treats the UI as the single source of truth for all user‑controllable parameters. Those parameters are stored in the component state of `SunPanel` and are immediately propagated to three subsystems:

1. **Audio Engine** – drives the Web Audio graph (`AudioEngine` → `SunLayer`).
2. **Visualization** – feeds the same parameter values to GLSL shader uniforms (`visualization/Sun.tsx`).
3. **Orbital Simulation** – uses a subset of the parameters (e.g., `rootFrequency` for orbital speed) to drive the 3‑D orbital bodies.

---

## 2. Detailed Data‑Flow Mapping

| Step | Source | Destination | Mechanism |
|------|--------|-------------|-----------|
| **2.1** | UI controls (`TerminalSlider`, `TerminalSelect`, toggle buttons) in `frontend/src/ui/SunPanel.tsx` | React state `params` (type `SunParameters`) | `useState` + event handlers (`handleParamChange`, `handleRootChange`) |
| **2.2** | React state `params` | `AudioEngine` | `engine.updateSunParams({[key]: value})` – calls `AudioEngine.updateSunParams` which forwards to `SunLayer.updateParams` |
| **2.3** | React state `params` | Shader uniforms | `SunPanel` passes `params` down to `visualization/Sun.tsx` via props; `Sun.tsx` sets uniforms with `gl.uniform*` calls (see `Sun.tsx` implementation) |
| **2.4** | React state `params` | Orbital simulation | `SunPanel` (or a higher‑level container) forwards relevant fields (currently `rootFrequency`) to the simulation module (`frontend/src/simulation/*`). The simulation reads the value each frame to adjust orbital speed/position. |
| **2.5** | Direct API (dev console) | `AudioEngine` | `AudioEngine.getInstance().updateSunParams({...})` – useful for scripted or terminal‑based changes |
| **2.6** | Direct API (dev console) | Shader uniforms | `visualization` exposes a global `setSunParams` helper that can be called from the console to update uniforms without UI interaction |

---

## 3. Edit Points (Where Parameters Can Be Changed)

| Edit Point | File / Component | UI Element | Description |
|------------|------------------|-----------|-------------|
| **3.1** | `frontend/src/ui/SunPanel.tsx` | `TerminalSlider` (ROOT, CUTOFF, SPREAD, LFO RATE, DISTORTION, GAIN, SUB, NOISE) | Calls `handleParamChange` → updates React state and pushes to `AudioEngine`.
| **3.2** | `frontend/src/ui/SunPanel.tsx` | `TerminalSelect` (WAVEFORM) | Same flow as sliders.
| **3.3** | `frontend/src/ui/SunPanel.tsx` | ON/OFF toggle buttons for **SUB** and **NOISE** | Flips boolean flags (`subEnabled`, `noiseEnabled`).
| **3.4** | `frontend/src/audio/AudioEngine.ts` | `updateSunParams` method | Receives partial `SunParameters` from UI or external callers and forwards to `SunLayer`.
| **3.5** | `frontend/src/audio/SunLayer.ts` | `updateParams` method | Directly mutates the internal audio graph (gain nodes, filter, oscillator frequencies, etc.).
| **3.6** | `frontend/src/visualization/Sun.tsx` | Uniform update logic | Consumes the same `SunParameters` object to set GLSL uniforms each render.
| **3.7** | `frontend/src/simulation/*` (e.g., `OrbitalSimulation.ts`) | Frequency‑based speed calculation | Reads `rootFrequency` to drive orbital motion.
| **3.8** | Dev‑tools / Terminal (if exposed) | Global `window.audioEngine` or `window.setSunParams` | Allows scripted changes without UI interaction.

---

## 4. Parameter Catalog

| Parameter | Type | Default | UI Control | Modification Path |
|-----------|------|---------|------------|-------------------|
| `rootFrequency` | number (Hz) | `110` | Slider (HZ mode) **or** Slider (NOTE mode) + conversion helpers | UI → `engine.updateSunParams` → `SunLayer.osc*.frequency` → Shader uniform `uRootFreq` |
| `filterCutoff` | number (Hz) | `1000` | Slider | UI → `engine.updateSunParams` → `SunLayer.filter.frequency` → Shader uniform `uCutoff` |
| `detuneSpread` | number (cents) | `10` | Slider | UI → `engine.updateSunParams` → `SunLayer.osc2.detune` / `osc3.detune` |
| `lfoRate` | number (Hz) | `0.5` | Slider | UI → `engine.updateSunParams` → `SunLayer.lfo.frequency` |
| `gainLevel` | number (dB) | `-12` | Slider | UI → `engine.updateSunParams` → `SunLayer.outputGain.gain` (linear conversion) |
| `waveform` | enum (`sine`/`triangle`/`sawtooth`/`square`) | `sine` | Select (`TerminalSelect`) | UI → `engine.updateSunParams` → `SunLayer.osc*.type` |
| `distortion` | number (0‑100) | `0` | Slider | UI → `engine.updateSunParams` → `SunLayer.distortionNode.curve` (re‑computed) |
| `noiseVol` | number (dB) | `-40` | Slider | UI → `engine.updateSunParams` → `SunLayer.noiseGain.gain` |
| `subVol` | number (dB) | `-12` | Slider | UI → `engine.updateSunParams` → `SunLayer.subGain.gain` |
| `noiseEnabled` | boolean | `true` | ON/OFF button | UI → `engine.updateSunParams` → `SunLayer.noiseGain.gain` set to `0` when disabled |
| `subEnabled` | boolean | `true` | ON/OFF button | UI → `engine.updateSunParams` → `SunLayer.subGain.gain` set to `0` when disabled |

---

## 5. Source Files Referenced

- **UI / State**: `frontend/src/ui/SunPanel.tsx`
- **Audio Engine**: `frontend/src/audio/AudioEngine.ts`
- **Audio Layer (DSP)**: `frontend/src/audio/SunLayer.ts`
- **Parameter Types**: `frontend/src/types/audio.ts`
- **Visualization (Shader Uniforms)**: `frontend/src/visualization/Sun.tsx`
- **Simulation (Orbital logic)**: `frontend/src/simulation/*` (uses `rootFrequency` for speed)

---

*Generated on 2026‑01‑16 by Antigravity – a premium, agentic coding assistant.*
