# Architecture

React owns the circuit documents, progression and minimal interface. Three.js renders the station and the same physical kit at two scales. React supplies validated live power to the renderer; saved completion proofs retain discoveries and first-completion feedback.

## Circuit kit and campaign

- `circuitKit.ts`: generic component/wire graph, modified nodal solver, instantaneous readings, lamp response, virtual fuse and constrained editing.
- `chambers.ts`: six authored starting arrangements, inventories, voltages, narrative lines, formula discoveries and physical success conditions.
- `chamberCampaign.ts`: independent activity completion, live door power, per-room undo and validated save restoration. Any reachable bench accepts visits and edits; earlier activities are not an interaction requirement.
- `CircuitLab.tsx`: direct manipulation, terminal targeting, keyboard editing, part tray and selected-component readings. Circuit changes run immediately; there is no submit or test state.
- `scene/kitArt.ts`: shared batteries, glass bulbs, resistors, knife switches, contacts and flexible leads. The room camera moves overhead for editing; projected HTML targets use the kit's 900×500 coordinate system.
- `scene/cable.ts`: smooth insulated leads, tapered strain reliefs, compression collars and embedded power traces. Bright chevrons with fading tails show direction: circuit traces follow signed solver current and the door cable flows from the bench toward its exit. Reduced motion retains static directional arrows. Trace speed is explanatory, not an electron-velocity simulation.

Modified nodal analysis solves connected electrical islands. Source-free islands remain at zero current. A source short trips a resettable virtual fuse. Loads are fixed resistances. The final goal re-simulates the circuit with its isolator opened; a common switched return therefore cannot falsely satisfy independence. Tests compare analytical series/parallel cases and power conservation including finite lead loss.

Edits have bounded stock and history. Fixed starter parts cannot be moved or removed. Mobile contacts retain their screen-pixel target size. Adding or dragging a part keeps every attached wire connected. Keyboard users add from the tray with Enter, select parts and use arrows to move, R to rotate and Delete to remove; contact connections use Enter as well.

## World and navigation

`shipLayout.ts` is the common spatial definition for rooms, links, windows, benches, collisions and the notebook map. Six chambers follow an authored route down the left column, across a transfer link, then back along the right column to an arrival gallery and the public station. There are no corridor shortcuts around locked doors.

`spaceship.ts` constructs a pressure-wall kit with distinct jamb, leaf, trim and threshold surfaces. Each of the six animated doors has colliders following its leaves and a capsule guard to prevent closing on the player. Ceiling services leave header and door-travel clearances. Windows use actual wall openings with separate sill/head infills and a single transparent pane. The circuit wing retains eleven window banks; the navigation hull remains sealed.

The station has six shared kit benches, six doorway labels and three formula posters. No floor labels, mission banners, dashboards or decorative prose are created. Station fixtures and low rails respond to the completed chamber; authorized doors open on approach from either side.

`space.ts` retains the textured Earth, Moon, Saturn, rings, star field and nearby instanced solar wings. All textures are local. The exterior is composed for the fictional setting, not scaled orbital mechanics.

`navigation.ts` applies substepped capsule movement and facing/proximity/occlusion checks before a bench can be used. `renderWorld.ts` manages camera, pointer lock, drag look, touch movement, sound events and throttled room telemetry. The notebook uses the actual saved player pose, and never teleports it.

`formulaView.ts` shares wall-screen placement, facing/proximity/occlusion checks and responsive camera framing. Pressing E at a screen uses the bench camera's travel and return path without changing the player's pose. Discovery is dispatched only when the camera arrives; leaving during travel collects nothing. E, Esc or the close control returns to walking. Reduced motion snaps to the same view. Formula inspection works wherever the player can physically reach a screen, including in god mode, without awarding circuit completion.

On arrival, `FormulaReader.tsx` places native scrolling text exactly over the projected display surface. `formulaLessons.ts` supplies short spoken-style explanations, symbol meanings, worked examples and bench experiments. Equations have a full-sentence reading for assistive technology. Mouse, keyboard and touch scroll the screen; opening the notebook preserves the reader's position. The physical screen remains visible during camera travel, and resizing reprojects the text to its surface.

### Surface joins

Give each exposed surface one owner. End perpendicular wall trim and solar-frame rails before their corners overlap; fit window posts between the sill and header. Ceiling transitions sit entirely on the taller-room side. Embossed symbols use one silhouette, and closed doors use one recessed center seal. Door cables use continuous sweeps with locally rounded bends, clear of the floor, bench base and passage. Keep ceiling services outside the full door-header depth. Fix these joins in geometry instead of masking them with depth bias.

`tests/browser/surfaces.spec.ts` checks overlapping opaque triangle interiors, including batched and instanced geometry. It samples visibility from walkable room and doorway positions and overhead benches, and checks the exterior and title relay. Buried intersections and touching edges are allowed. The doorway tests also sample both approaches during travel. These checks complement visual review of close and oblique views; they do not model every GPU depth-buffer artifact.

`stationLayout.ts` extends the shared deck beyond the final gate. `mainStation.ts` builds the commons, Earth gallery, research concourse and docking gallery. Their furniture has matching colliders, their lighting reuses the four nearest-light slots, and saved positions require all six circuit proofs. The notebook frames the current wing. See [main station](main-station.md).

## Interface and story

`App.tsx` coordinates walking, close-up, notebook and pause. There are no ordinary network requests beyond local runtime assets. ASTER's short authored lines are triggered by room entry, initial bench use, restoration and arrival in the main station commons. Heard identifiers are persisted; subtitle time pauses in menus and hidden tabs.

`Notebook.tsx` has Parts, Formulas, Map and Progression. Progression reads completion proofs independently of live door power or god mode; future lab counts come from `FUTURE_LABS` and stay locked at zero. Parts come from visited rooms; equations come only from the campaign's explicit `formulas` discoveries. First inspection shows a short “New formula added!” status; repeat inspections do not. Part descriptions are one sentence. Map colors distinguish current, powered and inaccessible chambers.

The native-viewport layout has responsive controls rather than a scaled fixed desktop frame. Native dialogs contain focus and restore it on close. If WebGL is unavailable, the circuit view supplies a schematic fallback with the same live model and sequential chamber controls. If storage fails, the same reducer continues session-only play.

## Performance and resource lifetime

Station geometry is batched by material and 12 m spatial cell. Rounded geometries are cached. Dynamic kits and doors stay outside those batches. Four nearby point lights, one cached directional shadow, existing 12-sample SSAO and restrained bloom retain the previous world rendering budget. No fullscreen effect or downloaded texture was added in this rebuild.

World drawing stops for a steady paused/covered scene and hidden tabs. Walking and overhead editing share one renderer. Power traces animate in the cable materials; reduced-motion editing redraws only when its view or document changes. Cable geometry concentrates samples around bends and adds no lights or textures. Replaced leads dispose their jacket, fittings and materials; station kit resources detach before general scene disposal. Shared exterior shader textures are released with ordinary texture maps.

Render resolution is capped at 1.65 device pixels per CSS pixel on desktop and 1.35 on touch devices. These are tuning starting values, not a performance guarantee. See [verification](verification.md) for measurements and [design](chambers.md) for their microtests.

## Saves and retained code

Current keys are `signal.asterion.chambers.v1` and `signal.asterion.chambers.player.v1`. Earlier campaign keys are neither migrated nor overwritten. Loading sanitizes component types, inventory limits, contact IDs, coordinates and resistor values, then validates each completion proof independently. Out-of-order work and room discoveries persist. The current circuit independently determines door power. Breaking or resetting it closes its door and clears its checkmarks; repairing it restores access. Completion feedback identifies the newly solved activity by its proof, and discoveries prevent repeated first-completion narration. The first unfinished room still defines the normal route's safe reload boundary.

Formula discoveries are saved separately, validated and deduplicated on load, and cleared by a new run. Saves without the `formulas` field start with no collected formulas; previous room visits do not count as screen inspections.

The old client worksheets, instrument panels, fixed viewport, waypoint system and map have been removed, along with their obsolete browser journeys. `activities.ts`, `campaign.ts`, `labPhysics.ts`, `missions.ts`, `game.ts`, `circuit.ts`, and `coach.ts` retain the earlier quantitative experiments and optional coaching API's tested models. They are outside the active game bundle. Future capacitor/resistivity work can reuse that physics without bringing back its retired UI.

Current browser tests cover the kit, all six goals, the physical first-door transition, the full route and backtracking, windows, doorway surface separation, touch, keyboard, accessible controls, storage and rendering fallback. Review fixtures are test-only; no developer teleport or solve control is exposed in the game.
