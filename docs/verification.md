# Asterion verification

Verified locally on September 12, 2026, on `codex/spaceship-dead-orbit`.

## Doorways and orbital exterior follow-up

The doorway audit originally found coincident frame/ceiling faces and coplanar wall-stiffener ends at exposed reveals. The revised construction separates those surfaces and keeps ceiling services clear of the header and leaf travel. The old overlapping observation-wall infills were removed. Doors now have explicit seam, frame and threshold clearances with colliders following their leaves.

Nine window banks provide 32 actual hull openings. The exterior contains textured Earth, Moon, Saturn and the Milky Way, with clouds, night-side lighting, an atmosphere, ring shadows and instanced solar wings. Engineering cylinders and Distribution racks were moved to the aft walls to clear the views. The existing repair cabinets and circulation routes remain in place. No floor writing or additional world signs were introduced.

| Check                  | Result                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | 45 unit tests passed after the final layout change                                                                                |
| `npm run build`        | TypeScript and production build passed                                                                                            |
| Selected browser suite | All 15 tests in `architecture`, `adventure`, `spaceship` and `touch` passed in 3.1 minutes                                        |
| Doorway geometry       | 4,680 sampled sight lines: both approaches to six frames, plus four door-opening amounts; no visible parallel faces within 0.5 mm |
| Windows and collision  | All 32 panes have an unobstructed outward ray through the hull; all reject an exterior player position                            |
| Texture lifetime       | All seven exterior textures, including shared shader uniforms, disposed exactly once                                              |

The full adventure again completes all eight repairs using ordinary movement. The door passes both motion modes and safe doorway resume. Touch movement and the first repair pass at all three existing phone viewports. One stale map assertion was updated from the old objective sentence to the compact “Series interlock” heading; map tracking then passed with the final layout.

Twelve focused doorway/window views supplement the room and instrument captures in ignored `artifacts/station/`. Visual inspection caught ceiling services cutting through the introductory door, ceiling haunches masking windows, and equipment blocking side views; those were corrected before final verification. Scene captures had no page or HTTP errors. The geometry sampling is a regression check for the reviewed areas, not an exhaustive proof for every viewing angle in the entire station.

With the final exterior and layout, isolated 120-frame local Chromium/Metal samples at 1280 × 720 measured **16.7 ms median** for both stationary and moving Hub and Earth-window views. Earth-view p90 was **16.7 ms**; Hub p90 was **16.7–16.8 ms**. This remains approximately 60 fps on this machine. No extra lights, shadow maps or fullscreen postprocess were introduced. Transparent window and ring surfaces use a single pass. These samples do not establish minimum-spec GPU performance or cold-load speed.

The seven space maps add **3,201,408 bytes** to the locally served assets; together with the existing metal maps the total is **5,439,155 bytes**. Attribution is provided in Settings → Asset credits and [asset provenance](assets.md). The credits link was checked within the settings panel, opens the local attribution page, and that page fits a 390 px viewport without horizontal overflow. Celestial sizes and positions are composed for the fictional setting, not an orbital-scale model.

## World readability follow-up

The subsequent visual simplification removes all 17 floor labels, cabinet banners, repeated compartment signs and decorative text plates. Six short doorway names remain. Shared graphic displays preserve repair-state feedback without words; the walking HUD presents a compact objective and location.

The production build and 11 relevant browser checks passed after this change: map placement and waypoint tracking, save isolation, the first repair and physical door in both motion modes, optional network interaction, safe doorway resume, three touch viewports, and transmission while walking. No physics or campaign rule changed, so the broader circuit results below remain the preceding campaign verification.

Seven world/title captures were refreshed and inspected. The same local 1280 × 720 stationary and moving samples each retained 16.7 ms median and p90 frame intervals. The small objective text received stronger local shadow/contrast after inspecting the bright reserve room. Updated captures replace the older views in place.

## Campaign rebuild checks

| Check                  | Result                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| `npm test`             | 45 unit tests passed                                              |
| `npm run test:browser` | All 31 browser tests passed in 3.8 minutes                        |
| `npm run build`        | TypeScript and production build passed                            |
| `npm run review`       | Current station, map and instrument views; no page or HTTP errors |
| `git diff --check`     | Passed                                                            |

## Gameplay and physics

After the final label and isolated-branch voltage corrections, all 45 unit tests and the production build passed again; the seven instrument, accessibility and RC interruption browser checks also passed again.

The complete browser adventure walks both service loops with ordinary movement controls and completes all eight repairs. It chooses the distribution branch first, returns through the transverse service connection, investigates materials and life support, tests RC hold-up, builds the final independent circuits and transmits the distress signal. It does not teleport between activities. It tests equipment without entering a prediction or explanation.

The adventure observes the virtual fuse with a low-resistance specimen, a 0.50 A reading for the 6 V / 12 Ω sample, a 3 V / 0.25 A series load, branch isolation with 12 V retained on the reserve, 2.88 J stored in a parallel bank, and an initially inadequate RC reserve followed by a successful 40 mF repair. Unit tests separately check material resistivity and conductor geometry in SI units, current and power conservation, source internal resistance, unequal capacitor combinations, charge and discharge signs, time constants, and analytic results independent of update cadence.

Comparison evidence must use the same specimen or capacitor modules. Changing equipment invalidates the current result. Commissioning requires valid measurements and the incoming systems in the dependency graph. Save validation recomputes physical evidence rather than accepting supplied numbers. Completed equipment can be reopened for practice without replacing its commissioned state.

## Interaction and resilience

Browser coverage includes early equipment inspection with commissioning blocked by explicit dependencies, selecting either repair wing on the map, keyboard wiring and undo, save migration, corrupted or unavailable storage, reduced motion, hull and door collisions, a saved capsule inside an aperture, pointer-lock denial, WebGL fallback, fullscreen controls, delayed font readiness and reuse of the circuit renderer. The map and waypoint use the same physical locations as the station.

RC playback can be paused, stepped and closed. Hidden or closed panels do not advance model time. Reload restores validated recorded evidence without silently running the apparatus. Sending the final packet continues when the console closes, permits walking and produces one acknowledgement.

Automated WCAG A/AA checks pass on all five advanced instrument panels, the foundational repair interface and the mission log. The advanced panels also have geometric checks for content and close-button bounds. Touch movement and the introductory repair pass at 390 × 844, 844 × 390 and 320 × 568. These checks do not establish that every small-screen interaction is equally comfortable; the game retains a fixed composition and is best viewed in landscape.

## Visual review

The campaign review produced fourteen captures in ignored `artifacts/station/`: title, engineering, hub, materials, life support, reserve, command, the first wiring repair, all five advanced instrument panels, and the station map. The doorway/window follow-up extends that set to 26 views. The campaign captures were inspected for compartment continuity, readable equipment identities, panel clipping, chart visibility and schematic correctness. That review caught and corrected ceiling transitions, disconnected pipe runs, a chart/guide overlap and a capacitor-label collision. The final isolated series schematic displays a physically open route.

`npm run review -- storage-instruments wiring-instruments` updates selected views and preserves other review results. Fixtures are produced through the real reducers; the separate full adventure verifies player interaction and travel. No captures are runtime assets. Superseded captures from `artifacts/spaceship/` were removed.

## Performance and assets

At 1280 × 720 in local headless Chromium using Metal, 120-frame samples measured **16.7 ms median and 16.7 ms p90** for both a stationary hub view and a moving sample. This matches the previous local median and p90, with no observed regression in that sample. It is approximately 60 frames per second on this machine, not a minimum-spec or integrated-GPU guarantee. A browser animation-frame sample is not a GPU profiler or a whole-campaign worst-case benchmark.

The renderer retains the existing pixel-ratio caps, ambient occlusion and bloom budget. It uses four nearby point-light slots, one cached directional shadow, material batches split into spatial cells for culling, and no additional fullscreen postprocessing. Static and hidden rendering is suspended when appropriate. Authored geometry and three shared 1K PBR maps supply the new compartment detail.

The three licensed metal maps total **2,237,747 bytes**. Only the runtime color, normal and roughness maps are retained; provenance is in [assets.md](assets.md). The build retains Vite's advisory about the approximately 552 kB uncompressed Three.js vendor chunk (approximately 137 kB gzip). It is an advisory, not a compilation failure. No dependency was added for this rebuild.

## Practical limits

The station is an authored browser game using original modular geometry and licensed surface maps. It does not reach Alien: Isolation's production asset fidelity. The circuits are explicitly idealized test models: real lamps, motors, capacitor leakage, heating and instrument uncertainty require further activities or a physical-lab follow-up.

The research establishes a rationale for scaffolding and comparison, not measured learning gains. High-school appeal, navigation comfort, transfer to unseen circuits, delayed retention and performance on a representative school laptop require observed playtests. See the [research report](research/station-design.md) and [classroom protocol](playtest.md).

The cleaned lighthouse remains on `main` at `0f3007f`; the prior three-room spaceship remains at `0421e7b`. No remote branch was changed and nothing was deployed.
