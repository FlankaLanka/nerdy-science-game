# Architecture

React owns the circuit documents, progression and minimal interface. Three.js renders the station and the same physical kit at two scales. Rendering cannot authorize a door: only the reducer can save a validated circuit proof.

## Circuit kit and campaign

- `circuitKit.ts`: generic component/wire graph, modified nodal solver, instantaneous readings, lamp response, virtual fuse and constrained editing.
- `chambers.ts`: six authored starting arrangements, inventories, voltages, narrative lines, formula discoveries and physical success conditions.
- `chamberCampaign.ts`: sequential access, latched completion, per-room undo, discovery and validated save restoration.
- `CircuitLab.tsx`: direct manipulation, terminal targeting, keyboard editing, part tray and selected-component readings. Circuit changes run immediately; there is no submit or test state.
- `KitScene.tsx` and `scene/kitArt.ts`: shared batteries, glass bulbs, resistors, knife switches, contacts and flexible leads. The orthographic close-up uses the same 900×500 coordinate system as its HTML hit targets and SVG current markers.

Modified nodal analysis solves connected electrical islands. Source-free islands remain at zero current. A source short trips a resettable virtual fuse. Loads are fixed resistances. The final goal re-simulates the circuit with its isolator opened; a common switched return therefore cannot falsely satisfy independence. Tests compare analytical series/parallel cases and power conservation including finite lead loss.

Edits have bounded stock and history. Fixed starter parts cannot be moved or removed. Mobile contacts retain their screen-pixel target size. Adding or dragging a part keeps every attached wire connected. Keyboard users add from the tray with Enter, select parts and use arrows to move, R to rotate and Delete to remove; contact connections use Enter as well.

## World and navigation

`shipLayout.ts` is the common spatial definition for rooms, links, windows, benches, collisions and the notebook map. Six chambers follow an authored route down the left column, across a transfer link, then back along the right column to an observation deck. There are no corridor shortcuts around locked doors.

`spaceship.ts` constructs a pressure-wall kit with distinct jamb, leaf, trim and threshold surfaces. Each of the six animated doors has colliders following its leaves and a capsule guard to prevent closing on the player. Ceiling services leave header and door-travel clearances. Windows use actual wall openings with separate sill/head infills and a single transparent pane. Eleven banks supply 38 panes; the navigation hull remains sealed.

The station has six shared kit benches, six doorway labels and three formula posters. No floor labels, mission banners, dashboards or decorative prose are created. Station fixtures and low rails respond to the completed chamber; authorized doors open on approach from either side.

`space.ts` retains the textured Earth, Moon, Saturn, rings, star field and nearby instanced solar wings. All textures are local. The exterior is composed for the fictional setting, not scaled orbital mechanics.

`navigation.ts` applies substepped capsule movement and facing/proximity/occlusion checks before a bench can be used. `renderWorld.ts` manages camera, pointer lock, drag look, touch movement, sound events and throttled room telemetry. The notebook uses the actual saved player pose, and never teleports it.

## Interface and story

`App.tsx` coordinates walking, close-up, notebook and pause. There are no ordinary network requests beyond local runtime assets. ASTER's short authored lines are triggered by room entry, initial bench use, restoration and arrival at the observation deck. Heard identifiers are persisted; subtitle time pauses in menus and hidden tabs.

`Notebook.tsx` has Parts, Formulas and Map. Only encountered components and equations are listed. Part descriptions are one sentence. Map colors distinguish current, powered and inaccessible chambers.

The native-viewport layout has responsive controls rather than a scaled fixed desktop frame. Native dialogs contain focus and restore it on close. If WebGL is unavailable, the circuit view supplies a schematic fallback with the same live model and sequential chamber controls. If storage fails, the same reducer continues session-only play.

## Performance and resource lifetime

Station geometry is batched by material and 12 m spatial cell. Rounded geometries are cached. Dynamic kits and doors stay outside those batches. Four nearby point lights, one cached directional shadow, existing 12-sample SSAO and restrained bloom retain the previous world rendering budget. No fullscreen effect or downloaded texture was added in this rebuild.

World drawing stops for a steady paused/covered scene and hidden tabs. The active close-up draws on resize or circuit changes; current markers animate in SVG without another Three.js render loop. Only one close-up renderer exists at a time. Removed component-owned materials and replaced wire geometry are disposed. Closing the kit disposes its renderer and shadow/environment resources; station kit resources detach before general scene disposal. Shared exterior shader textures are released with ordinary texture maps.

Render resolution is capped at 1.65 device pixels per CSS pixel on desktop and 1.35 on touch devices. These are tuning starting values, not a performance guarantee. See [verification](verification.md) for measurements and [design](chambers.md) for their microtests.

## Saves and retained code

Current keys are `signal.asterion.chambers.v1` and `signal.asterion.chambers.player.v1`. Earlier campaign keys are neither migrated nor overwritten. Loading sanitizes component types, inventory limits, contact IDs, coordinates and resistor values, then recomputes completion proofs in order. Undo or resetting a completed circuit does not remove door authorization.

The old client worksheets, instrument panels, fixed viewport, waypoint system and map have been removed, along with their obsolete browser journeys. `activities.ts`, `campaign.ts`, `labPhysics.ts`, `missions.ts`, `game.ts`, `circuit.ts`, and `coach.ts` retain the earlier quantitative experiments and optional coaching API's tested models. They are outside the active game bundle. Future capacitor/resistivity work can reuse that physics without bringing back its retired UI.

Current browser tests cover the kit, all six goals, the physical first-door transition, the full route and backtracking, windows, doorway surface separation, touch, keyboard, accessible controls, storage and rendering fallback. Review fixtures are test-only; no developer teleport or solve control is exposed in the game.
