# Dead Orbit — player experience redesign

Framework: `/Users/frankyang/Desktop/game_design.md`. Its three referenced files were not supplied. This document applies the supplied filter, state checklist, numbers policy and playtest requirements directly.

## Goal and diagnosis

The player is a stranded ship engineer. Recover a damaged research vessel by understanding and repairing the power network, then send a resilient distress signal. Active domains: exploration, camera, environmental storytelling, progression, circuit interaction, UI, audio, persistence.

The previous version was a visual relocation of the lighthouse lesson. It had almost uniform lighting, repeated rooms, always-open doors, few visible consequences, disappearing objectives, childlike distractors, and no measurements. A repair looked like passing a worksheet. The core weakness was clarity and relevance, before tuning movement or increasing visual effects.

ASSUMPTION: The intended audience is high-school students with mixed prior circuit knowledge.
IMPACT: Keep optional connection guidance; show measured voltage, current and power; use plausible causal explanations.
IF WRONG: New learners may need more vocabulary support, or experienced learners may need more demanding circuit networks.
VALIDATE: Observe a new learner and an experienced learner completing the first repair without spoken instructions. Record hesitation, interpretation of readings, and whether they predict the fault correctly.

ASSUMPTION: The intended experience is thoughtful exploration under narrative pressure, with no lethal countdown.
IMPACT: The reserve-power emergency is a persistent system condition. Reading, pausing and experimenting never consume hidden oxygen or time.
IF WRONG: Players seeking survival pressure may find the experience too calm.
VALIDATE: Ask playtesters what they believe they are saving and whether each repair made them want to continue.

## Defined scope and rules

1. **Ship recovery:** auxiliary repair restores local white work lights and releases the first bulkhead; distribution spins up the reactor, releases the second bulkhead and opens the observation shield; communications enables the transmitter. These are derived from validated saved completions. Grey/amber/green state labels and physical power trunks show the dependency. Machinery and architecture make each room recognizable.
2. **Service interface:** preserve the wiring workspace and action column. Add the system purpose, a visible commissioning sequence, measured load readouts, explicit fault/result evidence and undo. These are real outputs of the existing ideal resistive circuit solver. Test lamps are labelled as service loads for ship equipment; the low-voltage model is stated. Prediction remains a hypothesis, never a correctness gate. A failed test is recoverable without losing wiring or restarting the game.
3. **Presentation and response:** persistent objective card; optional systems view; contextual bulkhead status; short nonblocking scene transitions, tangible electromechanical sounds, and power-up changes in the room. No camera takeover and no input lockout for a flourish.

## Five-component evaluation, before implementation

| Feature                        | Clarity                                                                    | Motivation                                         | Response                                                                       | Satisfaction                                                           | Fit                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Physical power progression     | Bulkhead labels announce the required repair; objective says the outcome   | Repair persists and opens the next space           | Proximity opens released doors; return side always releases                    | Changed lighting, moving machinery/shield, servo and restoration audio | Power failures have mechanical consequences                                            |
| Instrumented service panel     | Fault description, purpose, measured V/A/W, test stage and observed result | Passing commissioning powers actual ship equipment | Immediate wire toggle, undo, reset, Escape cancellation; retry retains circuit | Live current paths, lit test loads, relay click and clear report       | Service modules and plausible electrical reasoning                                     |
| HUD, architecture, transitions | Distinct maintenance bay/reactor hall/observatory; stable objective        | Destination and consequence stay visible           | All overlays can close; motion never blocks input                              | Room reveal, mechanical sound and state banner                         | Restrained industrial typography, ivory hull, amber reserve light, cyan active systems |

Priority when conflicting: response, clarity, satisfaction, fit, motivation.

## State checklist

| State                       | Entry / exit                                                                     | Interrupt / chain                                                                                         | Cost | Edge cases                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| Exploration                 | Begin/resume/close panel → open menu or focused console                          | Movement and look remain immediate; blur pauses and clears keys                                           | None | Ground is level; no jumps, slopes, moving platforms or hitstun; furniture and hull remain solid                            |
| Locked bulkhead             | Upstream not complete and player behind it → repair or approach from return side | No damage; player may turn back                                                                           | None | Saved player in aperture gets safe release; no collision can close on occupied aperture; no sprint tunnelling              |
| Releasing/released bulkhead | Access allowed + approach → leave approach area                                  | Reverse on approach; leaf colliders move with visible doors                                               | None | Reduced motion sets final pose immediately; pauses do not create a walking lockout                                         |
| Repair build                | Focused available console → test with hypothesis                                 | Close at any time; Escape cancels selected cable first; undo/reset editable state                         | None | Repeated input does not duplicate fixed wires; shorts open a virtual fuse; revisions reset stale observations              |
| Fault-ready/result          | Valid initial powered circuit → hypothesis then disconnect A                     | Close preserves state; failed backup test offers revise                                                   | None | Completion still verifies actual source and fault topology, not the chosen answer alone                                    |
| Commissioned                | Valid evidence and explanation → explicitly restore system                       | Returning to world is immediate; completed systems can be inspected                                       | None | Save sanitization re-solves circuits; replay cannot overwrite original evidence or double-count completion                 |
| Recovery transition         | New persistent repair → settling machinery and notice timeout                    | Pause/menu can interrupt view; no camera override                                                         | None | Loading a completed save applies state without replaying reward audio; reduced motion skips movement                       |
| Observation reveal          | Distribution restored and player first enters Command → shield fully retracts    | Movement/look remain free; reopening a completed save on Command uses settled pose                        | None | Pause freezes it; resume continues; reset re-arms shield; no walkable space is blocked by this visual shield               |
| Distress transmission       | All circuits commissioned + explicit transmit → authored acknowledgement         | Closing console permits exploration while packet completes; reset/unmount cancels unfinished transmission | None | Repeated clicks cannot queue packets; only acknowledgement is persisted; reduced motion replaces moving progress with text |
| Systems view                | Q/button in exploration → Q/button/menu/repair                                   | Pointer/keyboard movement stays available                                                                 | None | Does not intercept E; information is also visible in deck map; no color-only statuses                                      |

## Starting values and micro test plans

All newly introduced art dimensions, colors and render parameters are **Starting values**, not claims of established standards. Geometry must fit the shared deck footprints, present readable text from the interaction distance, avoid floating/intersecting objects and keep the direct walk route clear. Compare authored screenshots before/after repair. If failed, move/resize the offending fixture or change the light contrast before adding detail.

| Starting value                                                          | Micro test / pass metric                                                                                                                        | If it fails                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Door approach 5.5 m, damping 8/s, saved-aperture recovery margin 0.65 m | Approach at run speed; stop and reverse at threshold; resume in aperture. No collision stop on released-door approach and no trapping on return | Increase approach distance first; increase opening rate if needed                        |
| Power damping 1.8/s, shield damping 0.7/s                               | Watch repair transition while moving; room effect identifiable and controls remain responsive                                                   | Strengthen difference between offline/online first; shorten settling if it obscures goal |
| Restore notice 4200 ms, boot 1400 ms                                    | Observer can read result while player keeps moving; notice does not overlap interaction                                                         | Simplify copy/move notice; extend read time only if still missed                         |
| HUD/console transitions 180–360 ms                                      | Repeated open/close and keyboard activation; no swallowed input                                                                                 | Remove transition that delays response                                                   |
| Low ambient light, localized amber/cyan/white sources; restrained bloom | Offline room remains navigable; powered room differs clearly; labels never bloom into illegibility                                              | Increase local fill, reduce emissive strength/bloom, then adjust contrast                |
| Servo envelope 0.6 s, low gain; power-start sweep 1.2 s                 | Headphone smoke test; audible distinction from wire click without masking foreground actions                                                    | Reduce gain or shorten decay; maintain visual status if sound muted                      |
| Distress send 2600 ms                                                   | Transmit, attempt repeat, close console and reopen. A single acknowledgement occurs and control stays available                                 | Shorten if waiting distracts; improve stage text before extending duration               |
| Existing ideal source 6 V, equal test loads 12 Ω                        | Analytical checks: single/parallel load 6 V, 0.50 A, 3 W; series load 3 V, 0.25 A, 0.75 W                                                       | Correct solver/readout, never tune physics to a desired visual                           |

## Risks and abuse

- Saves from before gating may be forward of an unrepaired bulkhead: permit retreat, keep console authorization enforced.
- The reactor and observation shield must derive from the same validated completion list as the objective, doors and map.
- A series circuit may light both backup loads but must fail the disconnection check. A direct short cannot commission anything.
- Undo must reset prediction and stale results, including explanation. Existing first-attempt evidence is retained.
- Textures are code-authored surface detail, not downloaded assets; merge static geometry by material to control draw calls. Dynamic parts remain separate.
- Reduced motion uses the final world pose with identical gameplay rules, removes scanning/pulsing/sweeping effects, and does not change completion.

Motion reference: [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) and [CSS reduced-motion technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39). Nonessential motion can be disabled; the in-game setting and system preference both suppress it. This is the basis for the motion treatment, not a claim of complete accessibility conformance.

## Playtest script and tuning priority

1. **New player:** start without saved progress; identify the fault and destination from HUD; find the marked console; connect, try an insulator, observe zero current, replace with copper. Before restoring, explain what changes in the ship. After restoring, find the released door without additional instructions.
2. **Stress:** spam E/Q/menu, open and cancel wiring, undo repeatedly, run into locked door, reverse through a closing released door, reload in doorway, mute audio, enable reduced motion, background the tab. No lost control, duplicate rewards, invalid saves or trapping.
3. **Skill:** predict series voltage and failure, then intentionally build a series transmitter and revise to parallel. Measurements and actual isolation should explain the improvement.
4. **Abuse:** try a battery short, bypass fixed series hardware, restore before a valid test, revisit completed consoles, and load forged progress. No progression skips.
5. **Observer readability:** compare offline/restored shots from the same pose; identify the new power state, accessible destination and machine behavior without seeing the circuit panel. Inspect full motion and reduced motion.

Automated tests cover mechanics and interaction; screenshots cover visual consistency. Neither substitutes for testing with high-school students. Record actual smoke-test results in `docs/verification.md` after implementation. Tune missing information and input response before animation duration, lighting embellishment or challenge pacing.

## Implementation review

- [x] Five-component filter, assumptions and bounded feature scope documented before implementation.
- [x] Entry, exit, interruption, chained actions and zero-resource-cost states specified.
- [x] Locked-door approach, old doorway saves, circuit shorts, failed backup, undo, pause and reduced-motion cases covered.
- [x] Significant actions pair visible changes with generated audio; mute verified.
- [x] New-player, stress, skill, abuse and observer scenarios scripted; mechanics and visual smoke results recorded in [verification.md](verification.md).
- [x] New tuning values labelled as starting values with tests and adjustment direction.

Observed high-school playtesting and subjective headphone/motion comfort are pending; the automated completion checks are not evidence of audience appeal.
