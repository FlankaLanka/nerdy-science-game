# Asterion: circuit chambers

## Player experience

The player wakes alone on Asterion. A maintenance intelligence, ASTER, has kept one small reserve running. The player's immediate action is to reconnect a lamp. Its light, a rising equipment hum and a powered door demonstrate the consequence. The same circuit parts recur throughout the station. With each repair, ASTER reveals that independent electrical paths kept it alive while the rest of the station failed. Restoring the final branch releases the observation deck and a brief welcome home.

No scoring, mandatory hypothesis, reflection form, test submission or mission checklist interrupts construction. Circuit behavior is continuous. The notebook is a small reference, not a list of assignments. The world has room numbers and three equations; there is no floor writing or decorative prose.

## References and design decisions

The [PhET Circuit Construction Kit DC simulation](https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html) was inspected in its Intro screen. Its component tray, direct connections, lifelike parts and visible current informed this original kit. No PhET code, artwork or interface assets were copied. The station supplies the progression and story around the construction activity.

Podolefsky, Moore and Perkins describe implicit scaffolding through affordances, constraints, cueing and feedback in [Implicit scaffolding in interactive simulations](https://arxiv.org/abs/1306.6544). Here that motivates small inventories, recognizable contacts, continuous lamp response and gradual access to components. The specific six-room sequence is our design inference; the paper does not establish its effectiveness or a required number of chambers.

The supplied [game-design framework](/Users/frankyang/Desktop/game_design.md) prioritizes Response → Clarity → Satisfaction → Fit → Motivation. Applying it: wire previews cancel; undo reverses edits; fixed introductory components reduce choices; restoration changes light, sound and door access; a shared physical kit ties the close-up to the world. The user can open the notebook or continue editing to interrupt the initial automatic return from the bench.

## Scaffold and dependency graph

`closed path → switch → independent construction → resistance/voltage → series sharing → independent parallel branches`

| Chamber      | Supplied / available parts                               | New idea and observable feedback                                                                                    | Completion                                                                           |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Wake         | 6 V battery, 6 V / 12 Ω lamp; one return lead; wire tool | Two empty contacts imply a missing conducting path. Both leads carry current when closed.                           | Lamp at its operating voltage                                                        |
| Contact      | Same source and lamp, fully wired open switch            | Closing a gap changes a complete network from no current to current.                                                | Closed switch carries current and lamp is powered                                    |
| Assembly     | Empty board; one battery, one bulb, wires                | Reconstruct the familiar loop without fixed positions.                                                              | One powered lamp                                                                     |
| Balance      | 12 V source, 6 V lamp, one lead; one adjustable resistor | Compare 6, 12 and 24 Ω while observing actual V and I. Low resistance overloads the lamp; high resistance dims it.  | Resistor carries current and lamp receives 6 V                                       |
| Shared light | 12 V source; two identical 6 V lamps                     | One path produces equal current and shared voltage. Connecting both directly to the supply visibly overdrives them. | Both lamps at 6 V                                                                    |
| Stay alive   | 6 V source, one lamp behind a switch; one extra bulb     | An independent branch survives isolation of its neighbor.                                                           | Both lamps powered; opening the isolator in the model leaves only the second powered |

The chamber goal checks numerical behavior, not an expected list of wire pairs. Valid alternative layouts work. The player can short contacts, disconnect leads, toggle switches and rebuild after success. The source fuse is virtual and resettable. Door authorization latches to validated evidence so further investigation cannot trap the player.

## Notebook and equations

Parts are discovered by encountering a chamber containing or offering them. The five entries are wire, battery, bulb, switch and resistor. Bulbs are described as energy-transferring loads, not sources. Equations are discovered in the first room where they help:

- Balance: `V = I R`, with the units V, A and Ω.
- Shared light: `Vₛ = V₁ + V₂`; one path has the same current.
- Stay alive: `V₁ = V₂ = Vₛ`; parallel branches share a source voltage.

Only selected components reveal live V and I, starting in Balance. Ratings remain on the components. Conventional current markers travel from positive to negative outside the source. They are qualitative animation, not electron speed, energy packets or a literal travel-time simulation. They are static when reduced motion is enabled.

The map uses the same room and doorway coordinates as rendering and collision. It marks the player, powered chambers and locked chambers. It provides orientation without teleportation or another progress panel.

## Start screen

The current motion, physical tablet, sound and input behavior are specified in [Interface motion and material](immersion.md).

An orbital view gives the title its own composition. The existing Earth, atmosphere and star textures supply the image; no second renderer, video, downloaded artwork or extra post-processing is introduced. Contact occlusion and fixture bloom warm once before Begin is enabled, then are disabled for the orbital camera and restored for walking. The preview never changes the player's position, discovered rooms or save data.

Response: Begin / Continue accepts keyboard, pointer and touch input as soon as the renderer is ready. Clarity: one primary action and a brief tagline. Satisfaction: an existing soft sound and a short reveal into the station. Fit: restrained lettering, an original orbital insignia and the same exterior seen through the windows. Motivation: the orbital station view and Restore the light tagline establish the setting and goal; progress remains in the notebook map.

Loading → ready enables the primary button. Activating it immediately enters walking, or the circuit fallback when WebGL is unavailable. The visual fade neither captures input nor delays control. Pause, notebook and movement work during it. New run returns to the orbital camera; sound and motion preferences persist. Reduced motion removes both title and arrival animations. Sound is a preference on the title; audio begins only when the player starts.

| Starting values | Microtest / pass condition | Adjustment if it fails |
| --- | --- | --- |
| 0.85 s title entrance, 45 ms glyph stagger; 0.7 s station reveal; 0.18 s button feedback | Start repeatedly with keyboard, click and touch; no delayed input or covered controls after the reveal. Reduced motion must show the final state immediately. | Shorten the visual duration or remove travel; never add an input lock. |
| 54° landscape lens; minimum 82° portrait lens; portrait breakpoint 0.85 aspect | Inspect desktop, ultrawide, portrait phone, small phone, tablet and landscape phone. Title, action and station label must remain legible and inside the viewport. | Reframe the planet and reduce its projected size before reducing text or hit areas. |
| CSS spacing / type scale; 248 × 62 px primary action, 220 × 58 px in portrait; 44 px sound control | Tab to both controls, activate with Enter, tap on phone, and run the title contrast/name checks. | Increase clearance or contrast; retain the primary action's visual priority. |
| Retained DPR caps and assets; title omits SSAO and bloom | Profile the animated title and the first room after entering. Compare local frame intervals with the existing renderer samples. | Reduce rendering work; do not add decorative passes or larger textures. |

Review: `npm run review -- title title-phone title-wide title-landscape`. Stress / abuse checks: repeat entry, reload Continue, reset from pause, and press movement keys on the title; no duplicate start, altered saved pose or unlocked chamber. Skill check: returning players can resume with keyboard alone. Readability checks include reduced motion and WebGL failure.

**ASSUMPTION:** A quiet orbital composition communicates the setting without a paragraph of exposition. **IMPACT:** The first impression depends on atmosphere and a clear action. **IF WRONG:** Players see a generic space menu. **VALIDATE:** In a first-time playtest, ask what the setting and immediate goal appear to be before explaining the game.

Implementation verification (2026-09-12): production build and five existing browser scenarios passed, covering the first repair, notebook, touch, WebGL fallback and saved progress. Additional browser checks passed for keyboard entry, mute persistence, saved player position, reset, input during the reveal, reduced motion and viewport fit. Desktop and phone title accessibility scans reported no violations. Production Chromium/Metal samples at 1280 × 720 measured 16.7 ms median and p90 intervals for the animated title, walking and circuit dragging; these local samples do not establish performance on school devices.

## Physical model boundaries

Modified nodal analysis applies KCL at contacts and voltage constraints across sources. Electrical islands without a source remain unpowered. Loads obey Ohm's law. Wires and closed contacts have a small finite resistance so directly shorting a source has a defined current and trips its virtual fuse. The total source power includes load and lead losses.

Kit lamps are explicitly idealized fixed 12 Ω loads with a 6 V operating rating. Actual incandescent lamp resistance varies with temperature. Brightness follows relative electrical power; this is an explanatory display rather than a calibrated photometric model. The kit does not model thermal damage, AC, charge transients or transistor junction behavior. Capacitor experiments from the previous campaign remain in the source archive but are not part of this playable sequence.

## State transitions

- Title → walking: Begin / Continue; shader preparation completes before input is enabled.
- Walking → bench: proximity, line of sight and E / touch interaction; movement releases.
- Bench → walking: Back / Esc, or the first successful restoration response.
- Selection → unselected: Esc cancels a lead, placement or selection before leaving the bench.
- Bench / walking → notebook or pause: release controls; return to the previous activity.
- Unpowered → powered: a live circuit meets the goal; save a validated proof; authorize the next door.
- Powered → practice: edits affect the lamp and readings while door access remains latched.
- Any save → reload: sanitize circuit objects, recompute proofs, keep only a contiguous completed prefix.
- Rendering failure → kit fallback: maintain electrical behavior and sequential access.

## Starting values and microtests

These are implementation starting values, not researched universal tuning constants. Circuit values were chosen to produce transparent whole-number relationships.

| Starting value                                                           | Microtest and pass condition                                                                                                                                                | Adjustment if it fails                                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 6 V / 12 Ω lamps; 6 V then 12 V sources; 6/12/24 Ω resistor choices      | Solve the examples analytically; compare the solver with expected 0.5 A, equal voltage division and independent branches. Automated conservation and goal checks must pass. | Correct the model; do not widen tolerances to mask a wrong calculation.                                    |
| ±6% lamp operating-voltage tolerance                                     | Lead losses must not reject a valid circuit; 4 V and 8 V outcomes must fail.                                                                                                | Tighten to the largest physically justified numerical/lead error if unintended circuits pass.              |
| 1 mΩ leads / closed switches, 4 A virtual fuse                           | A valid two-lamp branch remains powered; a direct source short trips and undo recovers.                                                                                     | Improve solver conditioning if necessary; preserve this behavior and explain any changed model.            |
| 44 px contact hit areas; 26 px drag capture; 5–6 px motion threshold     | New-player and touch tests: at least 9/10 intended connections succeed, with no accidental adjacent-contact selection.                                                      | Enlarge separation or targets; tune capture before adding instructional text.                              |
| 10-unit placement grid, 32 undo steps                                    | Drag, rotate, reconnect and undo one edit at a time; no attached cable disappears.                                                                                          | Reduce snap spacing if placement feels constrained; retain consistent undo units.                          |
| 1.6 s first-restoration return                                           | Observe the first successful circuit: player notices the lit bulb and restored room without searching for a submit button. Book or another edit cancels the return.         | Lengthen or remove the automatic return if players miss the electrical consequence.                        |
| Subtitle minimum 5.5 s, about 340 ms per word                            | Players read an entry while walking without losing control or encountering stacked captions.                                                                                | Shorten lines before increasing duration. Pause timing in menus or hidden tabs.                            |
| 3.5 m/s walk, 6 m/s run, 2.9 m bench interaction, door damping 8/s       | Navigate around every bench, stop at each sealed door, return through powered doors and resume inside an aperture without trapping.                                         | Adjust sightlines and collision geometry first; then interaction range or speed.                           |
| Offline/online local lights 7/32; four light slots; desktop DPR cap 1.65 | Review dark-to-powered contrast; sample stationary and turning scenes against prior local ~16.7 ms frame intervals.                                                         | Reduce drawing cost before adding any new rendering effect; raise ambient only if targets cannot be found. |

## Critical assumptions and playtests still needed

**ASSUMPTION:** A new high-school player recognizes the two open contacts without a lengthy tutorial. **IMPACT:** The entire opening depends on acting immediately. **IF WRONG:** An attractive room still feels like an unexplained worksheet. **VALIDATE:** Observe first-time players without prompting; record their first action and whether they connect the contacts within one minute.

**ASSUMPTION:** Seeing brightness and selected V/I is enough to make resistance understandable. **IMPACT:** Balance is the first numerical step. **IF WRONG:** Players cycle resistor values without connecting cause and effect. **VALIDATE:** After success, change the supply or lamp resistance in an unseen example and ask which direction resistance should change; do not add a required answer field to the game.

**ASSUMPTION:** Automatic branch validation does not replace the player's curiosity about the switch. **IMPACT:** The ending needs a useful model of independence. **IF WRONG:** The player solves by wiring once and never notices isolation. **VALIDATE:** Observe whether players reopen the kit and toggle the isolator; if not, make the physical restoration response demonstrate that isolation rather than introducing another test form.

**ASSUMPTION:** The school device can support the retained renderer. **IMPACT:** Stable interaction matters more than lighting complexity. **IF WRONG:** Pointer targeting becomes frustrating. **VALIDATE:** Repeat the local timing, dragging and touch samples on representative integrated-GPU school laptops; the local Metal result alone is insufficient.

New-player test: complete Wake, Contact and Assembly unaided. Stress test: click rapidly, cancel midway through a cable, reset an edited circuit, pause during restoration, deny storage/WebGL, and reload. Skill test: construct an unseen series or parallel circuit with the same kit. Abuse test: short the source, bypass a lamp, place dangling components, forge save data and try to cross each sealed doorway. Readability test: identify the next usable bench and compare lamp states on a small screen without reading a persistent objective.
