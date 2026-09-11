# Verification record

## Workshop geometry and circuit loading — September 11, 2026

The final TypeScript/Vite production build, all **34 unit tests**, and all **18 browser tests** passed. The browser suite includes the complete island walk and repair sequence, save restoration, keyboard and touch controls, Reset, graphics fallback, accessibility checks, fullscreen, and delayed circuit textures.

- Closed the front/rear gables and roof ridge; aligned door/window openings, trim, rafters, porch supports, fixtures, and furniture. The chimney base follows the roof pitch. Plaster coordinates stay continuous across adjoining walls and gables.
- Replaced overlapping floor slabs with a continuous joint, graded the hillside below the foundation, and excluded grass from the porch. Camera height, cabinet placement, and walking collision agree with the model. Raycasts cover roof undersides, both sides of each gable, openings, slab edges, and terrain clearance.
- Removed Undo, Hint, Ask Pip, and the coaching panel from circuit activities. Clear is now Reset. Player wires still support individual removal, and the current experiment instruction remains visible.
- Prepared paper, fonts, circuit textures, HDR lighting, and all three kits before entering the island. The workbench keeps one renderer across visits and stops drawing when closed or idle. The world retains its paused frame instead of repeatedly drawing behind menus. The fallback board stays stable if circuit graphics cannot prepare.

The local 1280 × 720 diagnostic measured **313–383 ms** from the opening key to the detailed board before the change, and **15–44 ms** afterward. Three visits previously caused six renderer builds in development StrictMode; now they reuse one. The final sample recorded no opening-time art requests, no main-thread tasks over 50 ms during opening, and no visible plain-board state. These samples include automation overhead and are not device benchmarks. See [baseline](circuit-loading-before.json), [final timings and seven views](workshop-review.json), and the reproducible `scripts/workshop-review.mjs`.

Reviewed the final [front](screenshots/workshop-front.png), [rear](screenshots/workshop-rear.png), [west](screenshots/workshop-west.png), [east](screenshots/workshop-east.png), [doorway from inside](screenshots/workshop-interior-door.png), [ceiling](screenshots/workshop-interior-roof.png), and [interior floor](screenshots/workshop-interior-rear.png), plus the [simplified circuit controls](screenshots/workshop-circuit.png).

The production smoke check loaded all 33 requested assets successfully, exercised Reset and circuit testing, reopened the same canvas, and operated the repair controls through fullscreen. The map also opened correctly. No browser page errors were reported; see [production-check.json](production-check.json). Vite retains its Three.js chunk advisory (about 588 kB uncompressed); the build succeeds.

The development server remains at **http://127.0.0.1:5174**. Temporary test/review servers on 5175 and 5176 were stopped. The records below describe previous interface versions, including the retired coaching controls.

## Menu spacing and text cleanup — September 11, 2026

The production TypeScript/Vite build and all **18 browser tests** passed after removing decorative menu captions and persistent objective text. Existing progression checks now verify restored cabinets, the map’s next location, and saved discoveries. The full island playthrough, touch repair at three phone sizes, keyboard controls, fullscreen, accessibility checks, and long radio pagination all passed.

Reviewed the title, pause menu, map, notebook, controls, settings, reset confirmation, repair controls, radio, and ending screens. Paper menus share consistent inner margins; the map illustration stays in its grid, and back buttons and notebook footer controls sit above the torn lower edge. Current captures are in `docs/screenshots/paper-*` and `docs/screenshots/fps-*`.

## First-person paper interface — September 11, 2026

Verified with Node.js 24.18.0 and Playwright Chromium. The production TypeScript/Vite build passed, all **29 unit tests** passed, and the full **18-test browser suite** passed. The three viewport/fullscreen/radio checks were rerun successfully after correcting fullscreen top-layer ordering. Production checks also exercised the final custom settings controls and clicked radio controls through an already-open fullscreen repair panel.

- Walked between all three physical cabinets using real player inputs, restored the island, observed a failed series backup and a working independent branch, and retained discoveries after reload.
- Checked keyboard wiring, undo, mouse release, wall collision, locked stations, saved camera validation, old saves, and canceling a reset.
- Exercised real touch movement, look, proximity interaction, and workshop repair at 390 × 844, 844 × 390, and 320 × 568. The fixed frame letterboxes portrait displays; landscape is the useful phone orientation.
- Verified one aligned 16:9 composition at 1280 × 720, 1600 × 1000, 1920 × 800, and 960 × 540, plus 1600 × 900 visual review. Menus and repair controls stayed within the frame with no scrolling containers or document overflow.
- Entered/exited fullscreen from the title, F, and pause menu. Entering fullscreen with a dialog already open preserves its placement, visibility, click targets, and focused control. Typing F into notes does not toggle fullscreen.
- Exercised long paged coaching replies, including unbroken text, and verified all text remains reachable without colliding with pagination. Checked abandoned requests, API failure, blocked storage, and explicit WebGL fallback.
- Automated WCAG A/AA checks passed for the circuit panel and notebook in the tested states. These checks do not constitute a complete accessibility audit.
- Loaded the final production HTML, JavaScript, CSS, torn paper, and map with HTTP 200 responses. Actual clicks opened the keyless field guide in and after fullscreen. Browser page errors: none. Details: [production-check.json](production-check.json).

The local production rendering sample at 1600 × 900 recorded 16.7 ms median and 16.7 ms p95 over 150 animation-frame callbacks. This is a local diagnostic, not a device benchmark; see [render-check.json](render-check.json). Vite’s existing Three.js chunk advisory remains (about 571 kB uncompressed / 143 kB gzip); the build completes successfully.

Current visual references: [first-person play](screenshots/fps-world.png), [repair leaf](screenshots/paper-conductor.png), [pause](screenshots/paper-pause.png), [map](screenshots/paper-island-map.png), [field notes](screenshots/paper-notebook.png), and [fullscreen repair](screenshots/paper-production-fullscreen.png). The generated paper original, runtime asset, built-in imagegen mode, and full prompt are recorded in [paper-game-ui.md](paper-game-ui.md).

The user’s development server remains at **http://127.0.0.1:5174**. The temporary browser-test and production-check servers on 5175 and 5176 were stopped. No paid coaching calls were made for this update.

The records below describe earlier interface versions, including the retired scrolling journal and arrival screens.

## Historical journal update — September 11, 2026

Verified with Node.js 24.18.0. The final TypeScript/Vite build passed, all 24 unit tests passed, and all 13 Playwright browser tests passed.

- Completed all three puzzles on desktop and phone, including a failed backup, corrected explanations, notebook persistence, and post-ending practice.
- Played the new arrival and first-connection lesson on both screen sizes, reloaded partway through each, tried an insulating material, and restored the workshop.
- Used the illustrated map to enter the next unlocked puzzle; later locations stayed locked. Automated accessibility checks passed for the map, workbench, and notebook in the tested states.
- Replayed the arrival from both an existing save and a completed adventure without clearing discoveries or displaying the ending over the prologue.
- Checked that introduction controls remain reachable at 320 × 568 and 844 × 390, including scrolling the longer paper page.
- Preserved keyboard wiring, undo, focus return, the WebGL fallback, blocked-storage behavior, and coaching cancellation/fallback.
- Started the production server and verified HTTP 200 responses for the page, built JavaScript/CSS, generated map, and API status. No live coaching requests were made during this update.

The generated map, original, built-in imagegen prompt, and art direction are recorded in [journal-art.md](journal-art.md). Current visual references include [desktop arrival](screenshots/journal-desktop-arrival.png), [desktop map](screenshots/journal-desktop-prologue-map.png), [first connection](screenshots/journal-desktop-lesson.png), [phone arrival](screenshots/journal-phone-arrival.png), and [phone lesson](screenshots/journal-phone-lesson.png).

Verification servers were stopped and ports 5174 and 5175 are free. Start the game with `npm run dev`.

## Earlier verification — September 10, 2026

Verified locally on September 10, 2026 with Node.js 24.11.0 and Playwright 1.63.0.

| Check                                  | Result                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                             | 24 tests passed                                                                                                                             |
| `npm run test:browser`                 | 8 tests passed                                                                                                                              |
| `npm run build`                        | TypeScript and Vite production build passed                                                                                                 |
| Production browser smoke               | Built application loaded and the workshop circuit operated in Chromium without page errors; the real Ask Pip flow displayed a live response |
| Production HTTP smoke                  | Built HTML and linked assets served; same-origin coaching worked; private/source paths returned 404                                         |
| Desktop and portrait visual inspection | Arrival, 3D workbench, backup experiment, ending, and notebook screenshots inspected                                                        |
| Live model checks                      | Real OpenRouter calls covered workshop insulation, a removed series lamp, and an independent parallel branch                                |
| Active rendering on local Apple M1     | 16.7 ms median frame interval; 33.4 ms p95 in a 120-frame sample at 1440 × 960; no browser errors                                           |

## What was exercised

- Open circuits, conductive and nonconductive bridges, a valid bypass, source shorts, floating components, duplicate and malformed wires, series/parallel voltage and power, and removal of a lamp.
- Predictions before testing, cleared predictions after editing, an incorrect first explanation followed by correction, assistance records, failed beacon designs, and valid completion prerequisites.
- Complete desktop and phone adventures, including actual touch socket input on the phone and a drag connection on desktop. Both routes reached the ending, retained observations after reload, saved a personal note, and entered a fresh practice circuit without clearing chapter progress.
- Keyboard socket entry and cancellation, undo, notebook focus return, help navigation, and canceling a proposed reset.
- Blocked browser storage, unavailable coaching, a response arriving after its experiment was abandoned, and unavailable WebGL. The circuit game remained playable in each case.
- Request validation and live-coaching response handling with controlled provider responses. Missing credentials and upstream errors used explicitly authored fallback guidance.
- Axe checks for WCAG A/AA tags on the workbench and notebook returned no violations in the tested desktop states. Dark workbench text and selected-state contrast were also reviewed directly. This is a limited automated accessibility check, not a complete conformance audit.

The generated art, source licenses, final prompt, and presentation tuning are recorded in [art-direction.md](art-direction.md).

## Visual record

| View                  | Desktop                                                          | Phone                                        |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Arrival               | [Island](screenshots/desktop-island.png)                         | [Island](screenshots/phone-island.png)       |
| First experiment      | [Workbench](screenshots/desktop-workbench.png)                   | [Workbench](screenshots/phone-workbench.png) |
| Live coaching         | [Pip in the production game](screenshots/desktop-live-coach.png) | Covered by the same responsive guide         |
| Surviving backup lamp | [Backup](screenshots/desktop-backup.png)                         | [Backup](screenshots/phone-backup.png)       |
| Finale                | [Ending](screenshots/desktop-ending.png)                         | [Ending](screenshots/phone-ending.png)       |
| Learning record       | [Notebook](screenshots/desktop-notebook.png)                     | [Notebook](screenshots/phone-notebook.png)   |

The arrival and first-workbench screenshots were refreshed against the production server. The remaining screenshots come from the successful complete browser playthroughs.

## Practical limits

Live coaching is configured locally using a private, Git-ignored `.env`. Real calls to Claude Opus 5 were reviewed against all three experiments. The final server-based checks are in [live-coach-check.json](live-coach-check.json). Those checks exposed and prompted fixes for a non-ASCII HTTP header, ambiguous material context, and an ambiguous follow-up question. The server now supplies a checked follow-up; the model remains advisory. The credential is absent from source, documentation, and the public build. Browser regression tests use an independent keyless server on port 5175.

No human learner study was conducted. The implementation and assessment records support the intended pedagogy, but they do not establish learning effectiveness or durable understanding. The [playtest script](playtest.md) includes an unfamiliar later circuit and delayed retrieval for that work.

Vite reports an advisory for the Three.js vendor chunk (approximately 572 kB uncompressed / 144 kB gzip). It is loaded separately from the application. The build completes successfully. Runtime WebP images total approximately 3.29 MB, with an additional 1.19 MB local HDR environment. Original images are retained outside the public directory. The measured render result is from the local Mac, not a guarantee for other hardware; see [render-check.json](render-check.json).

## Framework completion

- [x] Five-component evaluation documented.
- [x] State entry, exit, interruptions, persistence, and edge cases defined.
- [x] Significant interactions have visual and optional audio feedback.
- [x] Playtest script written and its principal software routes smoke-tested.
- [x] Starting values and adjustment directions documented.

The September 10 verification left the production server at **http://127.0.0.1:5174**; it has since been stopped. The independent local Git repository uses branch `main`; no remote was created or project published.
