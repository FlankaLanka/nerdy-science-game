# SIGNAL — Asterion

An exploratory circuits lesson aboard a stranded space station. Restore eight connected systems, investigate their behavior with working instruments, and bring the distress transmitter online.

## Run

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

The default address is **http://127.0.0.1:5174**. Set `PORT` to change it. No account or AI key is needed. Fonts, PBR textures, geometry and synthesized equipment audio are served locally. Optional read-aloud uses an available local English browser voice; the same guidance is always visible as text.

| Action                           | Control                                               |
| -------------------------------- | ----------------------------------------------------- |
| Move / run                       | WASD or ↑ ↓ / Shift                                   |
| Look                             | Mouse, ← →, Page Up / Page Down                       |
| Use nearby equipment             | E                                                     |
| Pause / release mouse            | Esc or Tab                                            |
| Station map / field observations | M / J                                                 |
| System diagnostics               | Q                                                     |
| Fullscreen                       | F                                                     |
| Wire a circuit                   | Select two sockets, or drag between them              |
| Remove a wire / undo             | Select the cable / Undo                               |
| Test                             | Test circuit or Test & record; no prediction required |

The station has two service loops around a central hub. After emergency lighting, either wing can be explored first. The map shows commissioning dependencies and lets the player track an available repair. Later equipment can be inspected and tested early. Working systems remain available for practice without overwriting their recorded commissioning evidence.

## Learning progression

| Equipment          | Investigation                                                |
| ------------------ | ------------------------------------------------------------ |
| Engineering        | Conductors, open and closed loops, current                   |
| Materials workshop | I–V comparisons; resistance, resistivity, length and area    |
| Distribution       | Series paths, voltage division, shared faults                |
| Life support       | Power, Kirchhoff's loop rule, internal source resistance     |
| Station hub        | Parallel and compound circuits, junction conservation        |
| Reserve vault      | Series/parallel capacitor banks, plate charge, stored energy |
| Airlock control    | RC charging and discharging, time constants, power hold-up   |
| Command            | Independent circuit construction and fault tolerance         |

This covers playable investigations across AP Physics 2 Unit 11, with a bridge to capacitor concepts from Unit 10.6. It is not a complete AP course or a validated substitute for laboratory work. The [research and design report](docs/research/station-design.md) contains the curriculum graph, source references, scaffolding rationale, misconceptions, state transitions, tuning assumptions and student playtest protocol.

The circuit model uses ideal wires and resistive test loads. The specimen rig opens a resettable virtual fuse above its 2 A rating. The pump model includes source resistance and accounts for power losses. Capacitor responses are calculated analytically, so display frame rate cannot change their electrical behavior. RC exponentials are used internally; the player reads graphs and measurements without entering calculus or an exponential formula.

## Saves and compatibility

Campaign state uses `signal.asterion.circuits.v2`; position uses `signal.asterion.player.v2`. Earlier spaceship progress is read as a migration source if no new save exists. Its conducting-loop and series work is preserved; new prerequisites must still be completed. Earlier spaceship and lighthouse save keys are left untouched. Active RC playback pauses when the equipment closes or the tab is hidden. Reload restores validated recorded tests, not an unattended running simulation.

When storage is unavailable, progress remains in the open tab. If WebGL is unavailable, the circuit activities remain accessible through the fallback interface. Keyboard, drag-look, touch controls, fullscreen and reduced motion are supported. The interface retains the fixed 1280×720 composition; phone users benefit from landscape orientation.

## Development

```sh
npm test
npm run test:browser
npm run build
```

Playwright browser tests use port 5175 and Chromium. Install it with `npx playwright install chromium` if needed. With a development server running, produce the current visual review:

```sh
REVIEW_URL=http://127.0.0.1:5174 npm run review
```

Review captures go to ignored `artifacts/station/`. Only current, useful views are retained. No source screenshot or unused texture library is shipped.

## Organization

- `src/activities.ts`: curriculum graph, equipment goals and fixed locations.
- `src/campaign.ts`: eight-repair progression, commissioning and save migration.
- `src/labPhysics.ts`: quantitative DC and capacitor experiments.
- `src/LabWorkbench.tsx`: instruments, graphs, measurement records and guidance.
- `src/circuit.ts`, `game.ts`, `CircuitBoard.tsx`, `BenchScene.tsx`: the three wiring investigations and their validated legacy data.
- `src/scene/shipLayout.ts`: shared hull, collision, furniture and map coordinates.
- `src/scene/spaceship.ts`: authored pressure-wall kit, machinery, four local lights and powered fixtures.
- `src/scene/renderWorld.ts`: rendering, controls, cached shadows and telemetry.
- `src/ShipMap.tsx`, `Notebook.tsx`: navigation and learning evidence.
- `public/materials/`: three licensed 1K runtime PBR maps; see [asset provenance](docs/assets.md).
- `server/`: optional foundational-circuit coaching API. The game does not call it.

`main` preserves the cleaned lighthouse baseline at `0f3007f`. The spaceship work is on `codex/spaceship-dead-orbit`. The prior three-room spaceship is preserved at `0421e7b`. Nothing has been pushed or deployed.
