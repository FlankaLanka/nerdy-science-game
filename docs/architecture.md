# Implementation boundaries

## Physics and learning

`solveCircuit` first merges ideal conducting connections. It identifies a direct short between the source terminals, then solves Kirchhoff's current equations for all reachable resistive nodes with fixed source voltages. Disconnected networks have no source of energy. Lamp power controls illumination. A path search highlights only source-to-source routes through powered lamps, so a dangling cable does not appear active.

The visual kit applies power when Test circuit is pressed. Editing returns it to an unpowered preview. Lamp A is removed as an open circuit during a committed fault experiment. The harbor uses its installed single-loop wiring for a controlled comparison. The beacon starts empty and accepts any electrically valid circuit in which both lamps initially light and B survives A's removal.

The ideal source is 6 V and each resistive lamp is 12 ohms. A single lamp or parallel branch has 3 W; the same two lamps in series each have 0.75 W. This deliberately simplified model is not an incandescent-lamp thermal simulation. Dry wood and glass are modeled as insulators (open circuits); copper is an ideal conductor. A direct short trips a reusable virtual fuse instead of attempting to model unbounded current.

World progress is separate from learning evidence. The reducer records a prediction before evaluation. Edits invalidate the current preview and prediction while retaining earlier experiments. A student's first explanation is preserved after correction. The final chapter must pass the actual fault simulation before it can finish. No LLM output is accepted as a progress event.

Save restoration sanitizes socket IDs, wires, materials, and choices, recomputes experiment outcomes, and validates completion prerequisites. Camera position/orientation uses a separate player key and is checked against terrain and collision bounds. Reload opens Continue; the player reopens the physical cabinet to resume its saved experiment. Lighthouse practice uses isolated temporary state, preserving chapter evidence.

## Presentation

`GameViewport.tsx` scales one 1280 × 720 stage to the display. `viewport.ts` shares the scale calculation with the WebGL renderers, which adjust their drawing buffers when the frame is enlarged or enters fullscreen. Native dialogs are portaled to the document body to avoid a transformed ancestor changing their containing block. They use the same scale and center as the world. On fullscreen changes, an existing dialog is reopened above the fullscreen element in the browser’s top layer while retaining focus. Menus never reflow into document pages; their contents occupy fixed positions. Long radio replies are split into bounded pages by `textPages.ts`.

The world is a procedural Three.js scene viewed through a first-person camera. `navigation.ts` provides the shared terrain height function, normalized walking, collision substeps, safe save restoration, and distance/facing/line-of-sight interaction checks. `island.ts` builds geometry and its matching obstacles. `renderWorld.ts` owns input, pointer lock, physics timing, camera pose, rendering and save snapshots. `World.tsx` renders the small HUD and touch thumbstick. React reads telemetry at 10 Hz rather than updating the whole app every rendered frame.

Only a nearby, faced cabinet exposes an interaction button. The projected objective diamond is noninteractive. Pointer lock is optional; dragging and keyboard turning remain available. Opening a menu or circuit, losing window focus, or hiding the page clears movement and releases the mouse. Hidden pages stop drawing; overlays reduce world rendering frequency. Reduced motion freezes environmental animation and removes head bob while preserving direct movement and look controls. Terrain, architecture, instanced grass, cropped photographic pine shoots, HDR lighting, and reflected water use locally bundled assets. Source-generated audio includes sea ambience, footfalls, connections, and restoration cues.

Circuit inspection uses physical 3D glass, ceramic, metal, and wood components under an SVG cable layer. A full SVG component fallback remains available. Socket controls are native buttons, independent of WebGL, and support click, tap, drag, and keyboard entry. Wires can be removed by a click or keyboard action. The first repair has progressive guidance and material selection; later repairs remove those controls. One radio instruction and the current action occupy a torn paper leaf beside the instrument. Native modal dialogs provide focus containment and restoration. `game.css` owns the interface without the previous layered page styles. The map and notebook are optional pause-menu objects. The paper texture retains its generated alpha; text, symbols, and controls remain accessible DOM/SVG elements.

## Coaching and hosting

The Node server uses Vite middleware in development and static files in production. Both modes host `/api/status` and `/api/coach` at the same origin. The optional provider credential remains server-side. The game sends only the immediate circuit context and the player's submitted question; server logs do not store questions or notes.

Coaching input is validated and circuit facts are recomputed on the server. Live feedback is bounded and advisory. The model writes a short contextual explanation and the server adds a checked question selected from the actual experiment state. This prevents a generated follow-up from implying a gap in a verified complete branch. API availability does not affect the deterministic experiment or story. Field-guide responses identify themselves. Controlled provider tests verify error handling; separate real calls verify the configured model and same-origin production API. The checked model and asset provenance are recorded in `art-direction.md`.

Hosting behind a public proxy requires deliberate network binding and platform-level controls. There is no public deployment or remote database in this local project.
