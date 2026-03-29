# Current Architecture Snapshot

> Captured at the start of the ECS migration. Use this as a reference for
> what the new architecture must preserve in terms of external behaviour.

---

## Service Topology

```
Browser
  └── Nginx :80
        ├── /* ────────────→ Vite dev server :5173   (frontend)
        └── /api/* ────────→ FastAPI :8000            (backend)
                                  └── PostgreSQL :5432
```

All services share the `orbium-network` Docker bridge.  No ports other than 80
are exposed on the host by default.

---

## Frontend Module Map

```
src/
├── App.tsx                        Entry: SelectionProvider > Layout > Scene
├── main.tsx
│
├── audio/
│   ├── AudioEngine.ts             Singleton. Owns AudioContext + master chain.
│   ├── SunLayer.ts                One Web Audio graph per body.
│   ├── audioUtils.ts              dB/note conversion helpers.
│   └── worklets/
│       └── noise-processor.js    AudioWorklet: white/pink/brown noise.
│
├── simulation/
│   └── OrbitalBodiesManager.ts   Observer pattern. Owns bodies[]. Syncs to backend.
│
├── visualization/
│   ├── Scene.tsx                  R3F canvas, camera, lighting, body meshes.
│   └── Sun.tsx                    Shader-driven mesh. Runs position update in useFrame.
│
├── presets/
│   ├── PresetManager.ts           In-memory preset cache.
│   └── defaults.ts
│
├── ui/
│   ├── Layout.tsx                 Root layout + AudioStartModal gate.
│   ├── ResizableLayout.tsx        Draggable split pane.
│   ├── SunPanel.tsx               Sun parameter controls.
│   ├── ParameterEditor.tsx        Selected-body inspector.
│   ├── PresetBrowser.tsx
│   ├── PresetItem.tsx
│   └── terminal/                  Phosphor-green UI primitives.
│
├── contexts/
│   └── SelectionContext.tsx       React context: selected body + manager ref.
│
├── stores/
│   └── uiStore.ts                 Zustand: isAudioActive, toast, modals.
│
├── hooks/
│   ├── useAudioEngine.ts          Wraps singleton access.
│   └── usePresets.ts
│
├── services/
│   ├── BodyService.ts             HTTP client → /api/bodies
│   └── PresetService.ts           HTTP client → /api/presets
│
└── types/
    ├── audio.ts                   SunParameters interface.
    ├── orbital.ts                 OrbitalBody interface.
    └── preset.ts                  Preset interface.
```

---

## Critical Data Flows

### 1 — Parameter change (Sun controls)

```
SunPanel (UI)
  └─ handleParamChange(key, value)
       └─ bodiesManager.updateBodyParams('sun-primary', { [key]: value }, false)
            └─ onParamsChange callback → AudioEngine.updateSunParams()
                 └─ SunLayer.updateParams()        (audio graph)
            └─ (same params) → Sun.tsx uniforms    (shader)
```

### 2 — Body instantiation from preset

```
PresetBrowser click
  └─ AudioEngine.instantiateBodyFromPreset(preset, position)
       └─ OrbitalBodiesManager.addBody(body)
            ├─ onBodyAdded callback → AudioEngine.createLayerForBody()
            │    └─ new SunLayer(), connect to masterGain, store in layers Map
            └─ bodyService.createBody(body)  [backend sync]
```

### 3 — Orbital position update (per-frame)

```
React Three Fiber useFrame (Sun.tsx)
  └─ body.position.angle += velocity * dt
  └─ mesh.position.set(radius * cos(angle), 0, radius * sin(angle))
```

> ⚠️  Physics lives entirely inside the React render loop — a known coupling
> issue targeted in Phase 3 of the migration.

---

## AudioEngine Master Chain

```
SunLayer(s)
  └─ masterGain  (gain: 0.8)
       └─ compressor  (threshold: -12 dB, ratio: 4:1, glue)
            └─ limiter  (threshold: -0.5 dB, ratio: 20:1, brickwall)
                 └─ analyser  (fftSize: 2048)
                      └─ AudioContext.destination
```

AudioWorklet (`noise-processor.js`) loaded once in `AudioEngine.initialize()`,
then instantiated per `SunLayer` constructor.

---

## SunLayer Signal Graph

```
osc1 (root)   ──┐
osc2 (+detune) ─┤
osc3 (−detune) ─┼─→ mixer ─→ waveShaper ─→ biquadFilter ─→ outputGain ──→ (master)
subOsc        ──┤              (tanh)       (lowpass)
noiseWorklet  ──┘
                     ↑ LFO modulates filter.frequency (30% depth)
```

---

## Backend API Surface

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health + DB connectivity |
| GET | `/api/bodies` | List all bodies for `anonymous` user |
| POST | `/api/bodies` | Create body |
| PATCH | `/api/bodies/{id}` | Update body fields |
| DELETE | `/api/bodies/{id}` | Delete body |
| POST | `/api/bodies/{id}/attributes` | Attach attribute preset |
| GET | `/api/presets` | List presets (filterable by type/category) |
| GET | `/api/presets/defaults` | List seeded default presets |
| GET | `/api/presets/{id}` | Get single preset |
| POST | `/api/presets` | Create user preset |
| PATCH | `/api/presets/{id}` | Update user preset (defaults protected) |
| DELETE | `/api/presets/{id}` | Delete user preset (defaults protected) |

---

## Known Issues (pre-migration)

| # | Location | Issue |
|---|----------|-------|
| 1 | `docker-compose.yml` | Hardcoded DB credentials; no `.env` support |
| 2 | `Dockerfiles` | Dev-only images (`--reload`, `npm run dev`); no production build |
| 3 | `backend/db/session.py` | Hardcoded fallback `DATABASE_URL` |
| 4 | `nginx/nginx.conf` | No timeouts, no security headers, no `X-Forwarded-For` |
| 5 | `AudioEngine.ts` | OrbitalBodiesManager callbacks wired in constructor (tight coupling) |
| 6 | `visualization/Sun.tsx` | Physics calculation inside `useFrame` (rendering drives simulation) |
| 7 | `types/orbital.ts` | Monolithic `OrbitalBody` mixes audio, visual, and physics concerns |
| 8 | `OrbitalBodiesManager` | No hierarchy queries; `parentId` field unused |
| 9 | All | No database migration tooling (Alembic) |
| 10 | All | No `.dockerignore` files |
