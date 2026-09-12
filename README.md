# SIGNAL — Dead Orbit

A first-person circuit-repair adventure aboard **Asterion**, a stranded research ship. Restore three electrical systems, bring the deck back online, and send a distress signal home.

## Play

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5174**. Set `PORT` to use another port. The complete game works without an account or AI key. Fonts, geometry, effects, and audio run locally; the world uses no external images or sky downloads.

| Action                            | Control                                          |
| --------------------------------- | ------------------------------------------------ |
| Move / run                        | W A S D or ↑ ↓ / Shift                           |
| Look                              | Mouse, ← →, Page Up / Page Down                  |
| Use a nearby console              | E                                                |
| Pause / release mouse             | Esc or Tab                                       |
| Deck map / mission log            | M / J                                            |
| Fullscreen                        | F                                                |
| Connect a wire                    | Select two sockets, or drag between them         |
| Remove a wire                     | Select its cable, or connect the same pair again |
| Cancel connection / close console | Esc / Esc again                                  |

Touch controls provide a left thumbstick, drag-to-look, and a contextual interaction button. Landscape is recommended on phones. If pointer lock is denied, drag-to-look and keyboard turning still work. Settings includes sound, reduced motion, sensitivity, fullscreen, and a safe return to Engineering.

## The ship

| Compartment  | Repair                                                         | Result                                                    |
| ------------ | -------------------------------------------------------------- | --------------------------------------------------------- |
| Engineering  | Complete a conducting loop; compare copper, polymer, and glass | Auxiliary deck lighting comes online                      |
| Power relay  | Repair a series circuit and disconnect one lamp                | Restore distribution and observe a shared failure         |
| Command deck | Build independent branches; prove B survives A's removal       | Power the distress transmitter and contact Rescue Control |

The connected deck includes observation windows, a ringed planet, a holographic orbital display, a reactor, cryogenic equipment, and proximity-operated bulkheads. The deck map shares the real hull and station coordinates. Repairs visibly change the lighting and station indicators.

The UI preserves the previous fixed **16:9**, 1280 × 720 composition: first-person exploration, a physical circuit module on the left, instructions and controls on the right, pause menus, a full-width map, and a mission log. Dark instrument panels, local Space Grotesk / IBM Plex Mono fonts, cyan highlights, restrained bloom, console reveals, a launch iris, connection pulses, and signal rings establish the new theme. Reduced motion disables decorative animation and camera bob.

The model retains ideal conducting wires, a 6 V source, and equal resistive lamps. A direct short trips a resettable virtual fuse. The insulating polymer replaces the old wooden test strip. Every repair requires a valid circuit; the final backup must pass its actual fault test. First predictions and explanations remain in the mission log.

Progress and position save separately in `signal.dead-orbit.v1` and `signal.dead-orbit.player.v1`. Lighthouse saves are untouched. Closing and reopening a console resumes its experiment. After the rescue signal, Command offers a fresh practice circuit without changing the recorded discoveries. When storage or WebGL is unavailable, the app reports it and keeps the accessible circuit activities playable.

## Development and verification

```sh
npm test
npm run test:browser
npm run build
npm start
```

Browser tests use port 5175 and require Playwright Chromium (`npx playwright install chromium`). They cover the full walk and rescue, incorrect circuits, save restoration, hull collision, keyboard/touch input, map alignment, fullscreen, accessibility, startup readiness, and renderer reuse.

Run a development server, then generate the current visual review:

```sh
SIGNAL_REVIEW_URL=http://127.0.0.1:5174 npm run review
```

The review script writes a small set of current captures to `artifacts/spaceship/`. Generated captures and reports are ignored by Git. Tests only retain screenshots on failures.

## Repository organization

- `main` preserves the cleaned lighthouse baseline at `0f3007f`.
- `codex/spaceship-dead-orbit` contains the spaceship version.
- `src/scene/shipLayout.ts` owns the connected deck, furniture, stations, and map projection.
- `src/scene/spaceship.ts` builds the ship and procedural space, animates the doors and instruments, and updates restored systems.
- `src/scene/navigation.ts` owns movement, collision, interaction, and player saves.
- `src/scene/renderWorld.ts` owns rendering, input, telemetry, and camera-following waypoints.
- `src/App.tsx`, `src/game.css`, and `src/Dialog.tsx` own the interface and transitions.
- `src/ShipMap.tsx` and `src/Notebook.tsx` display navigation and learning evidence.
- `src/Workbench.tsx`, `src/CircuitBoard.tsx`, and `src/BenchScene.tsx` implement the persistent accessible circuit console.
- `src/circuit.ts`, `src/missions.ts`, and `src/game.ts` implement the simulation and progression.
- `server/` retains the optional coaching API; circuit activities make no coaching requests.

The cleanup removed obsolete screenshots, review reports, original image duplicates, unused portraits/maps, and then the superseded island geometry, textures, fonts, and review scripts. Earlier assets and implementation are recoverable from Git history. See [design](docs/design.md), [architecture](docs/architecture.md), and [verification](docs/verification.md).
