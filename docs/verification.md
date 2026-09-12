# Dead Orbit verification

Verified locally on September 11, 2026, on `codex/spaceship-dead-orbit`.

| Check                                                    | Result                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm test`                                               | 31 tests passed                                                                                                  |
| `npm run test:browser`                                   | 23 tests passed                                                                                                  |
| `npm run build`                                          | TypeScript and production build passed                                                                           |
| `SIGNAL_REVIEW_URL=http://127.0.0.1:5176 npm run review` | Seven reviewed scenarios, the deck map, restored Command, and both transmitter states; no browser or HTTP errors |
| `git diff --check`                                       | Passed                                                                                                           |

The browser adventure walks from Engineering through both bulkheads to the Power relay and Command using ordinary player controls. It covers a wrong conductor, incorrect explanation, failed series backup, successful parallel backup, distress transmission, saved evidence, reload, and post-rescue practice.

Additional browser coverage includes hull collision and paused input, locked stations, keyboard socket operation, blocked storage, WebGL fallback, denied pointer lock, map/player alignment, a waypoint that follows every turning frame, fullscreen stacking and controls, delayed font readiness, and the persistent circuit renderer. Automated WCAG A/AA checks pass on the repair panel and mission log. Touch movement and the full first repair pass at 390 × 844, 844 × 390, and 320 × 568.

Spaceship-specific checks confirm that lighthouse saves remain unchanged, launch effects never intercept pointer input, doors can be traversed with animation enabled, reduced motion can be enabled during play, and a saved position inside an open doorway resumes without resetting the player. Door meshes and colliders initialize open to permit that valid save, then follow normal proximity behavior.

The current visual captures are generated in ignored `artifacts/spaceship/`. The review checks the title, engineering deck, observation window, reactor, command deck, circuit console, deck map, restored ship, and distress response. Rescue captures use a fixture produced through the real reducer's circuit/fault/explanation sequence; the separate browser adventure verifies actual gameplay. No screenshots are runtime assets or committed review output.

The build retains Vite's advisory about the approximately 565 kB uncompressed Three.js vendor chunk (approximately 141 kB gzip). It is not a compilation or runtime failure. The complete production output is approximately 1.1 MB after removing the old photographic assets and fonts.

The original cleaned lighthouse is preserved on `main` at `0f3007f`, after its 44 unit tests and production build passed. Its screenshots, redundant original downloads, and unused decorative images were removed before creating the spaceship branch. The new branch subsequently removed the replaced island geometry, active island textures, and obsolete diagnostic scripts. No remote branches were changed.

Human playtesting is still needed to assess high-school appeal, learning retention, and comfort across hardware; these automated checks verify the implemented software behavior.
