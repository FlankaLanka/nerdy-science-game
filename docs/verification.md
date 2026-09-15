# Asterion circuit chambers — verification

Verified locally on September 12, 2026, on `codex/asterion-circuit-chambers`, based on `36eeedc`.

## Automated checks

| Check                  | Result                                          |
| ---------------------- | ----------------------------------------------- |
| `npm test`             | 53 unit tests passed                            |
| `npm run test:browser` | 24 browser tests passed in 1.9 minutes          |
| `npm run build`        | TypeScript and production build passed          |
| `npm run review`       | Twelve current captures; no page or HTTP errors |
| `git diff --check`     | Passed                                          |

The unit suite checks the new modified nodal solver, source voltage, open circuits, series/parallel behavior, voltage sharing, total power including lead losses, dangling components, shorts, fuse recovery and physically valid goals for all six chambers. It checks sequential discovery, live door power after edits/reset/undo/reload, save validation and safe navigation. Retained earlier physics/coaching tests also pass; they are not all new game features.

Browser play completes each of the six authored circuits using the normal controls. Coverage includes adding and moving components, click and drag wiring, a physical switch, resistance adjustment, independent branches, undo and safe post-completion practice. The first repair opens a door that the test walks through into chamber two. A separate geometry/navigation journey traverses the entire authored route through all six gates and returns along it, with collision enabled.

A closed first door rejects ordinary movement. The doorway audit samples **14,040 sight lines**, covering both approaches to all six doors while closed and at four opening amounts; it found no visible parallel faces within 0.5 mm. This is a regression sample, not a proof about every viewing angle. All **38 window panes across eleven banks** have clear outward rays through their hull openings and reject a player position outside the hull. Exterior shader textures are released exactly once.

The notebook discovers only relevant parts and equations; its map shows the same room plan without teleportation. Keyboard-only circuit construction, part movement, contact connection, notebook focus and Escape work. A 390×844 touch viewport completes the first repair and uses every notebook tab without horizontal overflow. Automated WCAG A/AA checks pass on the notebook and circuit interface. Storage denial preserves session play; WebGL denial preserves the functional circuit kit and sequential access. Reload retains validated restoration evidence.

A production-server smoke test also passed: dragging a battery from the tray, constructing a working loop, restoring power and opening the notebook during restoration. The notebook correctly interrupted automatic bench exit. No page or HTTP errors occurred. A 320×568 production view was visually inspected and had no horizontal overflow. Drag cancellation and avoiding accidental switch toggles have dedicated browser coverage.

## Visual review

Current useful captures in ignored `artifacts/station/` cover title, dark/powered Wake, the first circuit, resistance, independent branches, notebook parts/formulas/map, Earth, Saturn and the equation poster. Superseded station screenshots were removed; no screenshot is a shipped asset.

The review corrected overlapping component ratings, fallback typography in wall posters, current markers drawing across component bodies, subdued lamp response, the observation-deck room marker on resume, and the Earth composition behind the other station wing. The physical world and close-up share the same authored parts. Equations use locally loaded fonts before their canvases are painted.

## Local performance

Measured in an isolated headless Chromium/Metal session at 1280×720, with ordinary motion enabled. Each sample retains 120 animation-frame intervals after its warm-up. Current results are reproducible with `node scripts/profile-station.mjs` and recorded in ignored `artifacts/station/performance.json`.

| View               | Condition                           |  Median |     p90 |
| ------------------ | ----------------------------------- | ------: | ------: |
| Wake               | Stationary                          | 16.7 ms | 16.7 ms |
| Wake               | Turning                             | 16.7 ms | 16.7 ms |
| Earth window       | Stationary                          | 16.7 ms | 16.7 ms |
| Earth window       | Turning                             | 16.7 ms | 16.7 ms |
| Two-branch circuit | Stationary, current markers running | 16.7 ms | 16.7 ms |
| Two-branch circuit | Dragging a connected bulb           | 16.7 ms | 16.7 ms |

The previous local baseline also measured 16.7 ms median/p90. The new samples show no regression in those measures. One Wake turning interval reached 33.4 ms; other maxima were 16.8 ms. These are browser frame-interval samples, not GPU timings, cold-load measurements or a guarantee for school hardware.

The world retains four local light slots, one cached directional shadow, existing SSAO/bloom and pixel-ratio caps. Only the active close-up renders, and it draws on document/size changes rather than continuously. Wires and component-owned materials are disposed when replaced or removed. Removed worksheets, instrument display machinery, waypoint code and an unused font weight reduce the active code/assets. No new dependency, downloaded texture, audio recording or image library was added.

All ten retained surface/space maps are used and total **5,439,155 bytes**. Attribution remains in Pause → Credits and [asset provenance](assets.md). The build reports the existing large-Three.js-chunk advisory: 557.19 kB minified, 139.05 kB gzip. It is an advisory, not a compilation failure.

## Scope and remaining evidence

The playable result is six foundational DC chambers, original industrial station geometry and a minimal notebook. It does not claim the asset fidelity of a commercial AAA production or full AP Physics 2 coverage. Lamps are simplified fixed-resistance loads, and current markers are explanatory, not physical electron velocities.

Learning transfer, pacing and comfort still need observed student playtests. The [chamber design](chambers.md) records the assumptions, starting values and pass/fail criteria. Earlier extended curriculum research is retained for subsequent development. Earlier saves and branches are unchanged; no remote branch or deployment was modified.

## Cable refinement — September 15, 2026

The cable update passed the production build, 60 unit tests and 27 selected circuit, camera, power-link and surface browser cases. Shader rendering checks verify moving and reversed flow, steady reduced motion, immediate power loss and a fresh surge after repair. The surface audit covers the rounded routes, end fittings and door-frame brackets. Visual review includes powered/unpowered routes, the doorway close-up, the first circuit and the two-branch kit. The wire inventory image was regenerated from the same physical model.

## Formula inspection — September 15, 2026

The production build, 32 selected formula/circuit/navigation/camera unit tests and 11 selected browser checks passed. Entering a room leaves formulas locked. E moves to the physical screen, arrival registers it, and early cancellation registers nothing. Checks cover returning to the original player pose, duplicate suppression, reload persistence, god-mode inspection without lesson completion, reduced motion, touch controls and notebook focus. Old saves with no explicit discoveries start empty. Captures in `artifacts/formula-*.png` were reviewed at 1280×720, 320×568 and 844×390; screen captions use short lines for phone readability.

The scrollable explanation update passed seven formula discovery/projection unit checks and nine selected browser checks. Tests verify wheel, keyboard and real touch scrolling, notebook scroll-position retention, resizing, screen-reader semantics and automated WCAG A/AA checks. The build passed. Desktop, phone and scrolled reader captures were visually inspected; explanations stay inside the original wall display.

## Combined workspace verification — September 15, 2026

The combined cable, bench, station, progression and formula changes passed all 68 unit tests, TypeScript, the production build and whitespace checks. The full browser run passed 61 of 62 scenarios. Its only failure was an older assertion that god-mode exploration records no room visits; reachable rooms now record visits independently of completion. The corrected scenario passed in a targeted rerun and still verifies that room entry adds no formula and inspection awards no circuit completion.

The first two commit snapshots were also checked independently: both passed TypeScript, with four camera projection tests for the cable/bench snapshot and 22 circuit/navigation tests for the station/progression snapshot. Generated captures and test reports remain ignored. Local development and test servers are stopped after verification.
