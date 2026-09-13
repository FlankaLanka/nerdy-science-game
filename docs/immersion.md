# Interface motion and material

The title is a view through station glass: a dark metal rim, a slowly turning Earth, an authored maintenance relay in the foreground, and a small response to mouse position. The title lettering resolves in sequence. Current travels around the primary control and through the small status line. These effects give the player something to perceive after the initial fade has finished, without adding instructions or telemetry panels.

The notebook is a physical tablet raised into the player's view. Its case has a recessed display, edge thickness, fasteners, camera, speaker, side keys and an etched brand. The case stays opaque throughout travel, while the screen illuminates as the tablet rises; closing dims the display and lowers the device. The illustrations depict the same five component types used at the bench. Tab selection moves one light bar and replaces the page with a short transition. The map has a locator pulse and flow through the restored route.

## Behavior and input

Response takes priority: the opening can be interrupted by Return, Escape, N or J. Closing captures the current transform, opacity and display aperture, so interrupting entry does not snap the device to its resting pose. Repeated close commands share one completion. Keyboard events handled by the device stop before reaching the game. Native dialog close requests also reconcile React state, avoiding an invisible modal with a pending animation.

The native modal owns focus while the device is present. Closing returns focus to its opener and resumes the prior activity, including an unfinished circuit. A small relay tone accompanies opening/closing and a shorter tone accompanies changing tabs. Sound preferences apply to all of them. Both the saved preference and live operating-system reduced-motion setting stop presentation motion, including portal-rendered dialogs; reducing motion during closing finishes the close immediately.

Clarity comes from the familiar parts, three tabs and Return control. Satisfaction comes from coordinated movement, screen illumination and quiet audio. The shared metal/glass treatment ties the title, HUD, pause panel and notebook to the station. Discovered content and restored routes remain the motivation; there are no new unlock requirements or lesson steps.

## Starting values and checks

All visual dimensions, colors, poses, amplitudes and durations in this pass are starting values, not externally established constants.

| Starting values | Microtest / pass condition | Adjustment if it fails |
| --- | --- | --- |
| Tablet rise 520 ms, screen illumination 480 ms; close 220 ms | Open and dismiss during the first few frames, repeat Escape, reopen, then edit the circuit. No pose snap, lost focus, duplicate close or hidden modal. | Shorten travel/duration before delaying input; preserve the interrupted pose. |
| Tab movement 240 ms, page replacement 200 ms; wake sweep 650 ms | Switch every tab while opening and after scrolling. Selection follows the click immediately and text settles promptly. | Shorten the visual transition; never add a loading stage or interaction lock. |
| Title glyph entrance 850 ms with 45 ms stagger; orbital rotation 0.006 rad/s; small damped pointer offsets | Watch the title, move the pointer across its primary action, then begin. Motion must be visible but must not move the button or alter saved player position. | Reduce pointer displacement or rotation before adding more effects. |
| Quiet UI tones: 75–220 ms envelopes, gain 0.07–0.12 before the existing master | Open, change tabs and close repeatedly with sound on and off. No sound while muted or overlapping bursts from duplicate close inputs. | Lower gain and shorten the envelope. |
| Tablet width 940 px, height capped at 670 px; compact phone frame | Review at 320–390 px phone widths, landscape, desktop and with reduced motion. Primary controls remain reachable and body content scrolls inside the screen. | Reduce case padding first; preserve text and control sizes. |

## Cost and review

The tablet and component illustrations use DOM/CSS/SVG, with no additional WebGL context or bitmap downloads. The station renderer holds a static frame behind menus. The title relay uses shared geometry and 32 instanced solar cells; it adds no lights or shadows and is hidden during play. Existing DPR limits, cached shadows and title post-processing exclusions remain in place. Planet rotation accumulates elapsed simulation time so switching between title and walking does not jump its orientation.

Run `node --experimental-strip-types scripts/review-immersion.mjs` against the review server for the recorded sequence and an intermediate tablet pose. `scripts/profile-station.mjs` includes the moving title and tablet transitions as well as walking and circuit dragging. `tests/browser/immersion.spec.ts` covers interrupting entry, repeat close inputs, reopening, focus restoration, live reduced motion and notebook accessibility.

Verification (2026-09-12): the production build and eight focused browser scenarios passed, including the first repair, discovered notebook content, rapid tablet dismissal/reopening, focus, live motion preferences, touch, WebGL fallback and saved progress. The notebook accessibility scan reported no WCAG 2 A/AA violations. Production Chromium/Metal samples at 1280 × 720 measured 16.7 ms median and p90 frame intervals, with a 16.8 ms maximum, across the animated title, walking, circuit dragging and tablet transitions (120 measured frames per sample). These local frame intervals match the preceding pass; they do not establish the GPU budget or performance on school devices. Raw samples are in `artifacts/station/performance.json`.

New-player/readability check: find Begin, open the notebook, identify a familiar part and return without instruction. Stress/abuse check: hold/repeat dismissal keys, close during entry, switch the system motion preference during a transition and ensure no gameplay advances while a modal is active. Skill check: use keyboard shortcuts to consult the map and resume a circuit without touching the pointer.

**ASSUMPTION:** Raising a physical-looking device feels more coherent with the station than a flat panel. **IMPACT:** Motion and materials should improve the sense of inhabiting the station. **IF WRONG:** The animation feels decorative or becomes a delay. **VALIDATE:** Watch first-time and returning players open it several times; reduce travel and duration if they wait for it or repeatedly dismiss it before reading. Device-level performance and player preference still require testing on representative school hardware.
