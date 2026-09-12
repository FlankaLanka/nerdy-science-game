# Dead Orbit design

The player is aboard Asterion, a disabled research vessel running on reserve power. Restore auxiliary power in Engineering, repair the distribution bus in the Power relay, and build an independent backup supply at Command. The third repair makes a distress transmission possible; sending it produces an acknowledgement from Rescue Control.

The latest redesign decisions, five-component evaluation, explicit assumptions, state transitions and tuning plans are in [redesign.md](redesign.md).

## Presentation

The existing UI composition and interactions remain: a first-person world, contextual console prompts, a left-side circuit instrument with right-side repair controls, pause screens, a deck map, and a mission log. The game is authored at 1280 × 720 and scales as one 16:9 frame. Fullscreen is available before entry and during play. Menus never become scrolling web pages.

The visual palette uses ivory pressure hull panels, dark inset machinery, copper pipework, amber reserve fixtures and cyan active systems. The maintenance bay, reactor containment hall and command observatory have distinct equipment and silhouettes. Space Grotesk provides display and body text, with IBM Plex Mono for instrumentation. The visual environment is procedural, including the planet and rings. Observation windows look into real scene geometry rather than an illustration.

Decorative transitions include the title reveal, launch iris, console scan, hover sheen, selected-socket pulse, guided-current trace, map scan, a reactor rotor, released bulkheads, gradual system restoration, an observation-shield reveal and a distress send/acknowledge sequence. They do not delay controls or determine completion. Reduced motion removes camera bob and decorative motion, sets lights and doors directly to their target states, and keeps all text and feedback visible.

## Navigation

Engineering, the Power relay, and Command share one connected deck with two short passages. The central route is clear and console locations appear on the map. Doors release only after the corresponding upstream repair, then open on approach. Old saves can retreat from the forward side; only a saved capsule already inside an aperture receives recovery access. The observation shield opens on the first approach to Command after distribution is repaired. Visible hull boundaries and furniture block movement. The map, world, and player bounds share `shipLayout.ts`.

Starting values inherited from the navigation prototype (test for comfortable navigation and successful console approaches; lower speed if players repeatedly overshoot): walk speed is 3.5 m/s, run speed is 6 m/s, eye height is 1.68 m, and the collision radius is 0.3 m. Diagonal movement is normalized. Substeps prevent thin-wall tunnelling. A console requires proximity within 2.9 m, a facing direction inside the interaction cone, and an unobstructed approach. A separate save namespace avoids applying island coordinates to this deck.

## Circuit learning

The existing complete-loop, series, and parallel sequence remains. The selectable insulator is now a polymer service insert, alongside copper and glass. Model wires are ideal conductors; identical lamps are resistive loads. A 6 V source and 12-ohm lamps make a single or parallel lamp dissipate 3 W and each equal series lamp dissipate 0.75 W. This omits lamp temperature and source resistance; it is an educational model.

The panel labels the service represented by each load and reports solver-derived voltage, current and power. Undo, reset and cable cancellation preserve control while experimenting. The objective and optional Q systems view explain both the current fault and the persistent consequence. Predictions precede tests, edits invalidate stale results, and the original prediction and first explanation are retained. Restoring Command requires two lamps that work initially and a supply that keeps B powered when A is disconnected. World progress cannot be unlocked by narrative or coaching output. Post-rescue practice uses temporary progress.

The scope remains a three-repair adventure, with no timed oxygen meter, combat, inventory, or resource-management simulation. The story and system failures establish the survival premise. Audience appeal and lasting learning should be checked with observed high-school playtests; automated tests establish software behavior.
