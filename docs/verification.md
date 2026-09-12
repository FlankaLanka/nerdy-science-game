# Dead Orbit verification

Verified locally on September 11, 2026, on `codex/spaceship-dead-orbit`.

| Check                                                    | Result                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                               | 34 tests passed                                                                                                         |
| `npm run test:browser`                                   | 24-test full suite passed; the additional transmission regression also passed (25 browser checks total)                 |
| `npm run build`                                          | TypeScript and production build passed                                                                                  |
| `SIGNAL_REVIEW_URL=http://127.0.0.1:5176 npm run review` | Ten reviewed scenarios plus panel, map, network and transmission states; 16 current captures; no browser or HTTP errors |
| `git diff --check`                                       | Passed                                                                                                                  |

The browser adventure walks from Engineering through both bulkheads to the Power relay and Command using ordinary player controls. It covers a wrong conductor, incorrect explanation, failed series backup, successful parallel backup, distress transmission, saved evidence, reload, and post-rescue practice.

Additional browser coverage includes hull collision and paused input, locked stations, keyboard socket operation, blocked storage, WebGL fallback, denied pointer lock, map/player alignment, a waypoint that follows every turning frame, fullscreen stacking and controls, delayed font readiness, and the persistent circuit renderer. Automated WCAG A/AA checks pass on the repair panel and mission log. Touch movement and the full first repair pass at 390 × 844, 844 × 390, and 320 × 568.

Spaceship checks confirm that lighthouse saves remain unchanged, launch effects never intercept pointer input, unrepaired bulkheads stop movement and explain their requirement, commissioning releases access, and a saved position inside an aperture resumes safely. The anti-trapping rule cannot be triggered by approaching a locked door. Q opens and closes the live power network without losing control. Undo restores the previous edit and re-establishes connection guidance. Browser assertions verify zero current through an insulator, 0.50 A through the completed auxiliary load, 3 V / 0.25 A in the series test, and a 0.50 A backup after the main parallel branch is disconnected.

The additional transmission regression starts from physically validated commissioned circuits, sends the packet, closes the console, moves through the ship and observes a single persistent acknowledgement. The HUD reports sending while this runs. The player can explore throughout.

The current visual captures are generated in ignored `artifacts/spaceship/`. The review checks the title, engineering deck, observation window, reactor, command deck, circuit console, deck map, Q network view, restored ship, sending state and distress response. Engineering, reactor and the Command observation shield have matching before/after camera views. The service panel was inspected before and after energizing its load, including focus, readings and panel bounds. Rescue captures use a fixture produced through the real reducer's circuit/fault/explanation sequence; the separate browser adventure verifies actual gameplay. No screenshots are runtime assets or committed review output.

The build retains Vite's advisory about the approximately 549 kB uncompressed Three.js vendor chunk (approximately 136 kB gzip). It is not a compilation or runtime failure. The complete production output is approximately 1.1 MB after removing the old photographic assets and fonts.

A local 120-frame stationary check at 1280 × 720 in headless Chromium with Metal measured a median frame interval of 33.3 ms before shadow caching and 16.7 ms afterward (90th percentile 16.7 ms afterward). This is a local smoke sample, not a hardware-wide performance guarantee. Static geometry is merged by material; only moving bulkheads/shields invalidate the directional shadow map.

A Web Audio analyser probe confirmed a running audio context and nonzero output for ambience/UI feedback (sample peak 0.051, RMS 0.0126, below clipping), then zero sampled output after muting. This checks signal generation and mute behavior; subjective headphone balance remains a human playtest item.

The original cleaned lighthouse is preserved on `main` at `0f3007f`, after its 44 unit tests and production build passed. Its screenshots, redundant original downloads, and unused decorative images were removed before creating the spaceship branch. The new branch subsequently removed the replaced island geometry, active island textures, and obsolete diagnostic scripts. No remote branches were changed.

Human playtesting is still needed to assess high-school appeal, learning retention, and comfort across hardware; these automated checks verify the implemented software behavior.
