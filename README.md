# Asterion — A place for bright ideas

A circuit-building game aboard Asterion, where your parents enrolled you in a residential AP Physics program: ace the exam, go home. Connect physical parts, watch current flow, and restore the lights to open the next chamber. Tandem, a physical, voiced guide with a humorously condescending teaching style, accompanies the player through six short chambers into the larger, freely explorable station. Clean ivory panels and blue and apricot accents sit in dim, cool standby light; solving a circuit brings on warm overhead lights and illuminated floor rails.

## Run

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

The default address is **http://127.0.0.1:5174**; set `PORT` to change it. No account, API key, remote asset service or narration service is needed.

| Action                    | Control                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Move / run                | WASD / Shift                                                    |
| Look                      | Mouse or arrows; Page Up / Down for vertical look               |
| Use a circuit bench / talk to Tandem | E                                                               |
| Ask Tandem for a hint     | T at a bench, or the Tandem button                              |
| Notebook / station map    | N / M                                                           |
| Back / pause              | Esc                                                             |
| Connect                   | Click two contacts, or drag between them                        |
| Add a part                | Choose a tray item, then click the board; or drag from the tray |
| Move a part               | Drag its body; select and use arrow keys with a keyboard        |
| Rotate selection          | Drag a corner; Shift snaps to 15°; R turns 90°                   |
| Remove selection          | Delete                                                          |

Touch controls provide a movement stick, drag-to-look and a bench interaction button. Circuit contacts also work by tapping. The interface uses the full viewport, including portrait screens.

Press E at any reachable circuit bench to open its activity, regardless of which activities are complete. Edits and completion save independently for each table. Using a bench glides the room camera directly overhead. Parts, wires, and live drag previews stay on the original 3D table, with a small parts tray and selection controls around it. Leaving glides back to the same standing position and viewing direction. Reduced motion switches views immediately; a flat kit is used only when WebGL is unavailable.

## Sample progression

| Chamber           | New idea                         | Player action                                             |
| ----------------- | -------------------------------- | --------------------------------------------------------- |
| 01 · Wake         | A complete conducting path       | Connect the two open contacts                             |
| 02 · Contact      | Switching                        | Close the physical switch                                 |
| 03 · Assembly     | Constructing with familiar parts | Add a battery and bulb; make a loop                       |
| 04 · Balance      | Resistance and voltage           | Add and adjust a resistor for a 6 V lamp on a 12 V supply |
| 05 · Shared light | Series circuits                  | Power two 6 V lamps from one 12 V source                  |
| 06 · Independence | Parallel circuits and isolation  | Give the second lamp an independent path                  |

Circuits run continuously. There is no Test button, hypothesis form, measurement log or commissioning step. An insulated cable with an amber trace connects each bench to its exit. A working circuit turns that trace cyan, sends soft light surges toward the door, and changes the bench and door indicators from empty squares to checkmarks. The chamber lights up and the door opens on approach. Opening, shorting or otherwise invalidating that circuit turns its trace amber and closes its door; repairing it restores power. The first successful restoration returns the player to the room; the bench remains available for experimentation.

The notebook has **Parts**, **Formulas**, **Map** and **Progression** tabs. Progression lists the six circuit levels and their saved completion status. Future labs remain locked at zero progress, with placeholder counts of 8 levels for Kinematics, 10 for Electromagnetism and 8 for Waves & optics; their room signs say “Coming soon.” Components appear as their rooms are visited. To collect a formula, approach its wall screen and press E: the camera moves in, then “New formula added!” confirms it is saved in the notebook. Entering the room alone never adds an equation. The three screens introduce Ohm's law, series voltage sharing and parallel voltage. Scroll inside a close-up screen for the equation in words, an explanation, an example and an experiment to try. E or Esc returns from a screen; N opens its notebook page. The walking HUD contains a room number, reticle, and contextual interaction key. Open the notebook with N and pause with Esc. The pause menu uses a sparse list over the scene, with sound and motion controls under Options; arrow keys navigate and Esc goes back. Tandem speaks through locally stored voice lines and short captions. Look at it and press E to begin a full, paced conversation. E again advances its next reply; after the conversation, further requests provide progressively more specific help. Working circuits have their own post-repair conversations. At a bench, press T or select Tandem for direct hints. It reacts to live circuit faults, recovery and isolation tests, leads toward powered exits, and accompanies free exploration. Completed replies are checkpointed across saves. Sound off preserves captions; menus and hidden tabs pause speech. The other AP Physics labs, final exam, and departure are future chapters. See [Tandem](docs/tandem.md).

The circuit wing opens into a vaulted commons, an Earth-facing lounge, a research concourse and a docking gallery. Closed future bays hint at kinematics, electromagnetism, and waves and optics. There are no further lessons yet. Framed observation windows look onto textured planets, stars and a docked transport. See [the main station](docs/main-station.md). These views are composed for the fictional setting; they are not a scale model of the Solar System. Asset attribution is documented in [asset provenance](docs/assets.md).

## Physics and pedagogy

The kit uses modified nodal analysis to solve the actual connected network. Batteries maintain voltage; resistors and the simplified 12 Ω lamps are resistive loads. Wires and closed switches use 1 mΩ resistance. A resettable virtual fuse trips above 4 A; editing a short immediately retries the circuit. Bulbs respond to voltage with visible dimming or overload color. The final chamber validates branch independence by simulating its isolator opening.

These are six foundational DC samples, not a complete AP Physics 2 unit. Capacitors, resistivity investigations and transistor behavior are not presented as unlocked mechanics. The earlier campaign's tested physics modules remain available for future work, but its worksheet interface has been removed. See [the chamber design](docs/chambers.md) for the learning sequence, model boundaries, sources and playtest criteria.

## Saves

This version uses `signal.asterion.chambers.v1` and `signal.asterion.chambers.player.v1`. Earlier game saves are left untouched. Completed circuits are re-simulated when loading; invalid evidence cannot unlock later chambers. Door power is recomputed from the current circuits after edits, undo, reset and reload. Earlier discoveries remain available. Storage failure permits session-only play. If WebGL is unavailable, the circuit kit and sequential chamber navigation remain playable.

## Development

**Esc → God mode (Dev)** opens progression doors on approach without completing circuits. Walls and furniture remain solid. A small DEV marker shows when it is active. The setting survives refreshes in the same tab and resets on a new run; turning it off restores normal door locks. Any reachable bench remains usable; completion still requires a valid repair.

```sh
npm test
npm run test:browser
npm run build
REVIEW_URL=http://localhost:5176 npm run review
REVIEW_URL=http://localhost:5176 node scripts/profile-station.mjs
```

Browser tests use Chromium and port 5175. Run `npx playwright install chromium` if needed. Reviews are generated into ignored `artifacts/station/`; no screenshots are runtime assets. [Verification](docs/verification.md) records the current checks and their limits.

Current work is on `codex/asterion-circuit-chambers`, based on `36eeedc` on `codex/spaceship-dead-orbit`. The prior station and extended curriculum remain in Git history. Nothing is pushed or deployed by these commands.

### Sound

Doors have distinct opening and closing sounds with stereo direction and distance falloff. Warm ambient music accompanies exploration and circuit work, with quiet ventilation, tactile controls and brief UI/repair feedback. Walking is silent. Music fades in gently and lowers in menus. Pause → Options → Sound mutes everything. Audio files ship locally and require no API key during play; source prompts and regeneration details are in [asset provenance](docs/assets.md#station-audio).
