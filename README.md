# Asterion — A place for bright ideas

A relaxed circuit-building game aboard a research station waiting for power. Connect physical parts, watch current flow, and restore the lights to open the next chamber. ASTER, the station's gently playful research companion, accompanies the player through six short chambers to an observation deck. Clean ivory panels and blue and apricot accents sit in dim, cool standby light; solving a circuit brings on warm overhead lights and illuminated floor rails.

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
| Use a circuit bench       | E                                                               |
| Notebook / station map    | N / M                                                           |
| Back / pause              | Esc                                                             |
| Connect                   | Click two contacts, or drag between them                        |
| Add a part                | Choose a tray item, then click the board; or drag from the tray |
| Move a part               | Drag its body; select and use arrow keys with a keyboard        |
| Rotate / remove selection | R / Delete                                                      |

Touch controls provide a movement stick, drag-to-look and a bench interaction button. Circuit contacts also work by tapping. The interface uses the full viewport, including portrait screens.

Using a bench glides the room camera directly overhead. Parts, wires, and live drag previews stay on the original 3D table, with a small parts tray and selection controls around it. Leaving glides back to the same standing position and viewing direction. Reduced motion switches views immediately; a flat kit is used only when WebGL is unavailable.

## Sample progression

| Chamber           | New idea                         | Player action                                             |
| ----------------- | -------------------------------- | --------------------------------------------------------- |
| 01 · Wake         | A complete conducting path       | Connect the two open contacts                             |
| 02 · Contact      | Switching                        | Close the physical switch                                 |
| 03 · Assembly     | Constructing with familiar parts | Add a battery and bulb; make a loop                       |
| 04 · Balance      | Resistance and voltage           | Add and adjust a resistor for a 6 V lamp on a 12 V supply |
| 05 · Shared light | Series circuits                  | Power two 6 V lamps from one 12 V source                  |
| 06 · Independence | Parallel circuits and isolation  | Give the second lamp an independent path                  |

Circuits run continuously. There is no Test button, hypothesis form, measurement log or commissioning step. A working circuit lights its chamber and permanently unlocks the next door. The first successful restoration returns the player to the room; the bench remains available for experimentation.

The notebook has **Parts**, **Formulas** and **Map** tabs. Components and equations appear as they are encountered. Three wall posters introduce Ohm's law, series voltage sharing and parallel voltage. The walking HUD contains a room number, reticle, and contextual interaction key. Open the notebook with N and pause with Esc. The pause menu uses a sparse list over the scene, with sound and motion controls under Options; arrow keys navigate and Esc goes back. ASTER speaks through short, transient subtitles.

Eleven window banks provide 38 hull openings onto textured Earth, Moon, Saturn and a star field. The final observation deck has windows on three sides. These views are composed for the fictional setting; they are not a scale model of the Solar System. Asset attribution is available through Pause → Credits.

## Physics and pedagogy

The kit uses modified nodal analysis to solve the actual connected network. Batteries maintain voltage; resistors and the simplified 12 Ω lamps are resistive loads. Wires and closed switches use 1 mΩ resistance. A resettable virtual fuse trips above 4 A; editing a short immediately retries the circuit. Bulbs respond to voltage with visible dimming or overload color. The final chamber validates branch independence by simulating its isolator opening.

These are six foundational DC samples, not a complete AP Physics 2 unit. Capacitors, resistivity investigations and transistor behavior are not presented as unlocked mechanics. The earlier campaign's tested physics modules remain available for future work, but its worksheet interface has been removed. See [the chamber design](docs/chambers.md) for the learning sequence, model boundaries, sources and playtest criteria.

## Saves

This version uses `signal.asterion.chambers.v1` and `signal.asterion.chambers.player.v1`. Earlier game saves are left untouched. Completed circuits are re-simulated when loading; invalid evidence cannot unlock later chambers. Doors stay unlocked when a completed circuit is subsequently changed or reset. Storage failure permits session-only play. If WebGL is unavailable, the circuit kit and sequential chamber navigation remain playable.

## Development

```sh
npm test
npm run test:browser
npm run build
REVIEW_URL=http://localhost:5176 npm run review
REVIEW_URL=http://localhost:5176 node scripts/profile-station.mjs
```

Browser tests use Chromium and port 5175. Run `npx playwright install chromium` if needed. Reviews are generated into ignored `artifacts/station/`; no screenshots are runtime assets. [Verification](docs/verification.md) records the current checks and their limits.

Current work is on `codex/asterion-circuit-chambers`, based on `36eeedc` on `codex/spaceship-dead-orbit`. The prior station and extended curriculum remain in Git history. Nothing is pushed or deployed by these commands.
