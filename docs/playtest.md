# Playtest and demonstration

## Uncoached learner session

Use these as starting evaluation criteria. Observe interaction before supplying help. Software smoke tests execute the same major routes; they cannot substitute for learner observations.

1. Ask the player to enter the island, look around, walk to the workshop, and open its cabinet with E. Can they explain why the island needs repairs and find the first station without facilitator directions?
2. Watch the first socket connection. Can the player tell that the socket is selected, connect it, and undo an unintended wire? Try mouse, touch, and keyboard separately.
3. Invite a prediction with the default dry-wood bridge. Let the test produce a surprise. Ask what could be changed while leaving other variables alone.
4. After the copper test, ask the player to trace the complete conducting path. Do not accept “I clicked the green answer” as evidence of understanding.
5. At the harbor, commit a forecast before disconnecting A. Ask what changed and what stayed the same. Check for the misconception that the first lamp used up the current.
6. Let the player design the beacon circuit. If they use series wiring, allow the fault test to reveal the failure before offering a nudge. Record attempts and support.
7. Ask why B can stay on. Use a new paper layout later to check transfer. Repeat the question on another day to sample retention; do not call a single immediate success mastery.
8. Open the notebook, add a personal note, leave, and reload. The note, first predictions, hints, and repair progress should remain.

## Stress and abuse smoke tests

- Connect the same pair twice, select a socket twice, drag off the board, cancel with Escape, and rapidly undo. No half-wire should survive accidentally.
- Try a source short, a bypassed bulb, an open return path, and a floating loop. Only physically valid light should be shown.
- Walk to a future cabinet before the preceding repair. It should report no incoming power, and completion order must remain intact.
- Walk into workshop walls, trees, rocks, and the shoreline. Verify collision, sliding along walls, and walking onto the jetty. Turn away from a cabinet or move out of range; its prompt should disappear.
- Open a panel or pause while holding movement. Close it and verify movement does not stick. Release pointer lock with Escape, blur the window, and return. Test drag-to-look and arrow-key alternatives with pointer lock denied.
- Reload after committing the harbor fault prediction and after observing its result. The forecast must not be lost or silently replaced.
- Ask Pip, then edit the circuit or leave. A response to the old circuit must not appear in the new context.
- Disconnect the API and deny storage writes. Experiments still work; the field-guide source and save limitation must be visible.
- Mute, enable reduced motion, and inspect at phone width. Critical information must remain available without audio or animation.
- Restart only through the explicit confirmation. Canceling that dialog must preserve the current experiment.
- Enter and exit fullscreen from the title and pause menu and with F. The world and menus must remain in the same 16:9 frame, with no scrollbars at taller or wider window sizes.
- Read a long hint using the next/previous controls. All text should remain available on its pages. Inspect the material buttons and the longest correction inside their paper edges.

## Demo outline

The hackathon requests a 2–3 minute video. The timings below are starting editorial targets, not gameplay deadlines.

| Segment          | Show                                                              | Say                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening          | Enter the island, walk, approach a cabinet, press E               | “SIGNAL teaches electricity by making a place work again.”                                                                                      |
| First repair     | Predict, test wood, change to copper, restore the workshop        | “Predictions come before feedback. A surprising result gives the learner something to explain.”                                                 |
| Harbor           | Predict a failure and remove lamp A                               | “The game makes a common circuit misconception visible.”                                                                                        |
| AI demonstration | Ask Pip a circuit question; show the source label                 | Explain whether this recording uses configured live coaching or the authored field guide. Never describe field-guide output as live generation. |
| Beacon           | Run a failed series backup, revise, then disconnect A in parallel | “The final challenge asks the learner to apply the earlier observation to a new circuit.”                                                       |
| Ending           | Activated lighthouse beam and optional notebook                   | “We preserve first predictions and assistance, so finishing the story is separate from evidence of learning.”                                   |

For the demo, rehearse the interactions and show actual transitions. Any shortened footage should preserve the prediction-before-observation order. The next product step is an observed learner study with delayed and unfamiliar circuit tasks.
