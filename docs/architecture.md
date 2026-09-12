# Architecture

React owns campaign state and the instrument UI. Three.js owns the first-person environment and its transient presentation. The reducers are authoritative for repair completion; renderer state cannot commission equipment.

## Campaign and simulation

`activities.ts` defines eight fixed equipment locations, their prerequisites, concept summaries and guidance. `campaign.ts` stores completion, visits, a tracked objective, foundational circuit progress, five quantitative lab records and optional notes. Inspection and experimentation are permitted before prerequisites; commissioning requires both upstream repairs and physically valid evidence.

`game.ts` retains the foundational wire-editing reducer and legacy save sanitizer. `circuit.ts` uses conducting-node unions and nodal analysis for the 6 V resistive wiring rigs. Shorts open a virtual fuse. Neither predictions nor selected explanations are required. Old prediction data can still be read without blocking new tests.

`labPhysics.ts` evaluates the specimen from resistivity and SI geometry, the pump from series resistance including source losses, and the junction network from its series/parallel arrangement. Capacitor bank values use equivalent capacitance, Q = CV, and E = ½CV². RC voltage is evaluated analytically from the starting voltage, R, C, mode and elapsed simulation time. The graph uses the same evaluator as the success predicate. No frame-integrated approximation determines the result.

Editing a setting invalidates the current measurement. Historical samples remain available for comparison, bounded to 48 per equipment panel. The specimen comparison only qualifies readings of the same material and geometry. RC tests record starting voltage and time; restored voltage is recomputed instead of trusting saved readings. Active playback stops advancing when the panel closes or document is hidden. It resumes explicitly in the open panel; reload restores completed observations with playback paused.

Completed systems are immutable in the campaign reducer. Reopening them creates local practice state. The notebook and JSON export retain original commissioning measurements.

## World

`shipLayout.ts` is the common coordinate source for hull boundaries, navigation and map. The deck is the union of authored compartment footprints, with two wing loops, a transverse connection and a forward command deck. Ceiling-height transitions are closed with lintels. `navigation.ts` enforces a capsule footprint with substepped movement and occluded, facing-based interaction. Doors have colliders synchronized to visible leaves and an aperture-resume guard.

`spaceship.ts` builds modular pressure-wall panels, physical service cabinets, the central heat exchanger, ventilation, reserve racks and observation aperture. Static geometry is merged by material and 12 m spatial cell. Rounded geometry is cached by dimensions. Dynamic machinery and instrument displays remain outside immutable batches. Four local point-light slots select nearby fixtures; there is one cached directional shadow map. Surface textures are local and shared.

World text is restricted to six short doorway names. Floors, cabinet headers and decorative machinery carry no writing. The inset displays reuse cached 512×256 graphical textures by display kind and equipment state; they change only when commissioning state changes. The display cache is explicitly disposed, including materials no longer attached to a visible mesh. The walking HUD shows a compact objective and location; detailed instructions live in the repair panels and optional network view.

`renderWorld.ts` retains the existing pixel-ratio caps, 12-sample SSAO, restrained bloom and tone mapping. It avoids drawing hidden tabs and steady paused views. Shadow maps update when doors or texture readiness require it, not on every frame. Waypoints follow the current camera every rendered frame; React telemetry is throttled independently. All scene resources are disposed when the renderer unmounts.

## Interface and fallback

The viewport preserves a 1280×720 authored composition. Native dialogs remain above fullscreen via top-layer reordering and restore focus. The advanced instrument panels use accessible HTML controls and SVG schematics/graphs, so their measurements do not depend on WebGL. Wiring panels retain a persistent precompiled 3D bench with an SVG fallback. A graphics failure exposes the next repair in circuit mode.

Sound uses local Web Audio synthesis. Read-aloud is optional and available only when the browser exposes a local English speech voice. The maintenance guidance is always available as text. The UI makes no requests to the optional coaching API.

## Save keys

- Current campaign: `signal.asterion.circuits.v2`.
- Current camera: `signal.asterion.player.v2`.
- Migration source only: `signal.dead-orbit.v1`.
- Older spaceship camera and lighthouse keys are preserved.

A v1 campaign is sanitized through the existing foundational model. Previous working loops remain; the new advanced prerequisites are required before finishing the expanded campaign. Invalid or unavailable storage falls back to safe session state.
