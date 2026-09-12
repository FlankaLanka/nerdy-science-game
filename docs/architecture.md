# Implementation boundaries

## Deck and navigation

`shipLayout.ts` defines the five connected floor rectangles, named compartments, console positions, furniture footprints, door coordinates, and map projection. `spaceship.ts` builds the matching floor tiles, hull, observation windows, bulkheads, equipment, labels, and external ship spars. The projection in `ShipMap.tsx` preserves scale and maps forward to the top of the display.

`navigation.ts` validates the entire 0.3 m player footprint against the union of floor rectangles, then tests furniture and wall obstacles. Axis-separated substeps support wall sliding without tunnelling. Door meshes and colliders share the same animated positions. Console interaction checks proximity, facing, vertical look, and a sampled unobstructed approach; only the target console's own collider is excluded.

`renderWorld.ts` owns input, pointer lock, frame scheduling, rendering, the camera, and saves. Movement stops on pause, hidden tabs, blur, or overlays. Drag and keyboard alternatives work without pointer lock. The title uses a cinematic camera without changing the saved player pose. A camera-projected waypoint updates its DOM transform after every rendered frame; React receives semantic telemetry at 10 Hz.

## Rendering and effects

The ship uses shared box geometry, metal materials, emissive light strips, point lights, and procedural signage. A deterministic starfield, shader planet, atmospheric shell, and geometry rings provide space outside the hull. Both graphics contexts use Three.js RoomEnvironment for procedural reflections, with no HDR or material image downloads. The main renderer adds restrained UnrealBloomPass and OutputPass. Each renderer and generated resource is disposed on teardown.

Decorative environment time freezes under reduced motion. Doors and system lights become instantaneous in that mode. Hidden pages stop drawing; paused scenes retain their frame unless display, progress, or motion settings change. The title can animate its camera and instruments while visible.

`BenchScene.tsx` keeps one renderer and three precompiled kits across every console opening. A prepared kit changes materials and lamp output only when the simulation result changes. A disabled WebGL context exposes the existing SVG components and native socket buttons. Source materials and sign fonts are bundled or procedural, avoiding a mid-repair texture swap.

`game.css` owns the fixed frame, responsive scale, instrument panels, startup/repair effects, touch layout, and reduced-motion overrides. `Dialog.tsx` uses native modal dialogs and restores focus on close. Dialogs occupy the same scaled 16:9 frame and reopen above the browser's fullscreen top layer when necessary.

## Simulation and evidence

`solveCircuit` merges ideal wire connections, rejects a source short, and solves Kirchhoff current equations for reachable resistive nodes. Floating networks have no source of energy. Only valid source-to-source routes through powered loads receive active cable styling. Crossings join only at sockets.

The reducer records predictions before testing, requires valid physical results before progress, preserves original explanations after corrections, and sanitizes saved socket IDs, wires, materials, choices, and experiments. Mission IDs remain `workshop`, `harbor`, and `beacon` as stable internal identifiers for the existing simulation; their visible locations are Engineering, Power relay, and Command deck. The UI makes no coaching requests; the optional server API remains separately validated.

The ship uses `signal.dead-orbit.v1` for evidence/progress and `signal.dead-orbit.player.v1` for position. It never reads or mutates the lighthouse save keys. Invalid positions return to Engineering. Unavailable storage leaves a playable tab and a visible save notice.

## Generated output

`artifacts/`, `test-results/`, `playwright-report/`, and `dist/` are ignored. `scripts/review-spaceship.mjs` is the only maintained visual capture entry point. Source contains no screenshot dependencies or external runtime art requests. The cleaned lighthouse is preserved on `main` at `0f3007f`; obsolete geometry tests were replaced with deck and navigation checks on the spaceship branch.
