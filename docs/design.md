# Dead Orbit design

The player is aboard Asterion, a disabled research vessel running on reserve power. Restore auxiliary power in Engineering, repair the distribution bus in the Power relay, and build an independent backup supply at Command. The third repair makes a distress transmission possible; sending it produces an acknowledgement from Rescue Control.

## Presentation

The existing UI composition and interactions remain: a first-person world, contextual console prompts, a left-side circuit instrument with right-side repair controls, pause screens, a deck map, and a mission log. The game is authored at 1280 × 720 and scales as one 16:9 frame. Fullscreen is available before entry and during play. Menus never become scrolling web pages.

The visual palette is cool hull metal, deep navy glass, cyan equipment light, amber reactor accents, and violet command systems. Space Grotesk provides display and body text, with IBM Plex Mono for instrumentation. The visual environment is procedural, including the planet and rings. Observation windows look into real scene geometry rather than an illustration.

Decorative transitions include the title reveal, launch iris, console scan, hover sheen, selected-socket pulse, guided-current trace, map scan, rotating holographic instruments, automatic doors, gradual system restoration, and transmission rings. They do not delay controls or determine completion. Reduced motion removes camera bob and decorative motion, sets lights and doors directly to their target states, and keeps all text and feedback visible.

## Navigation

Engineering, the Power relay, and Command share one connected deck with two short passages. The central route is clear and console locations appear on the map. Doors open automatically on approach. Visible hull boundaries and furniture block movement. The map, world, and player bounds share `shipLayout.ts`.

Walk speed is 3.5 m/s, run speed is 6 m/s, eye height is 1.68 m, and the collision radius is 0.3 m. Diagonal movement is normalized. Substeps prevent thin-wall tunnelling. A console requires proximity within 2.9 m, a facing direction inside the interaction cone, and an unobstructed approach. A separate save namespace avoids applying island coordinates to this deck.

## Circuit learning

The existing complete-loop, series, and parallel sequence remains. The selectable insulator is now a polymer service insert, alongside copper and glass. Model wires are ideal conductors; identical lamps are resistive loads. A 6 V source and 12-ohm lamps make a single or parallel lamp dissipate 3 W and each equal series lamp dissipate 0.75 W. This omits lamp temperature and source resistance; it is an educational model.

Predictions precede tests, edits invalidate stale results, and the original prediction and first explanation are retained. Restoring Command requires two lamps that work initially and a supply that keeps B powered when A is disconnected. World progress cannot be unlocked by narrative or coaching output. Post-rescue practice uses temporary progress.

The scope remains a three-repair adventure, with no timed oxygen meter, combat, inventory, or resource-management simulation. The story and system failures establish the survival premise. Audience appeal and lasting learning should be checked with observed high-school playtests; automated tests establish software behavior.
