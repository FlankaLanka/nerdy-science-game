# SIGNAL: first-person design

The playable world is the primary interface. The player walks between three broken electrical systems on a storm-darkened island. Approaching a cabinet and looking at it reveals an interaction prompt. Pressing E opens the instrument; closing it returns to the same place and orientation.

## Onboarding

The title offers one main action. Starting places the player on the workshop path, looking toward its power cabinet. One short radio subtitle establishes the problem. Movement instructions fade after walking. A small diamond marks the next repair; there are no clickable destinations in the world or map.

Inside the workshop, the repair sheet gives one instruction at a time:

1. Connect the two circled sockets.
2. Choose a bridge material.
3. Predict the lamp’s behavior and test the circuit.
4. Explain the observed complete path, then restore power.

The player may skip guidance, remove wires, reset the board, experiment, or leave at any time. The game retains the actual first prediction and explanation separately from corrections. The notebook is optional and does not obstruct exploration.

## Exploration contract

- Eye height: 1.68 world units above the walkable surface. The camera and visible terrain share the same height function.
- Walk speed: 3.5 units/second; run speed: 6. Diagonal input is normalized.
- Collision radius: 0.3. Substepping prevents thin-wall tunnelling; independent axis resolution permits wall sliding.
- Buildings, cabinets, large rocks, trees, utility poles, and the sea boundary constrain walking. The jetty has its own walkable surface.
- A cabinet requires a distance of at most 2.9 units, a facing direction within the interaction cone, and an unobstructed approach. Looking sharply away vertically clears it.
- Mouse look uses pointer lock. A denied request leaves drag-to-look and keyboard turning available. Esc, Tab, blur, hidden tabs, and overlays release movement input. Modal controls cannot move the character.
- Touch has a left thumbstick, world dragging for camera movement, and a tappable proximity prompt.
- Reduced motion removes head bob, water/boat animation, vegetation sway, and beam rotation. Player-controlled movement remains responsive.

These are tuning values for this prototype, not measured preferences. Beginner playtesting should check whether the next cabinet is easy to find and whether turning and walking feel comfortable.

## Repairs and progression

| Location           | Puzzle                                                                       | Visible consequence                                        |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Keeper’s workshop  | Complete a conducting loop; compare copper, dry wood, glass                  | Workshop and porch lamps illuminate                        |
| Harbor relay       | Restore the existing series circuit, predict a fault, remove A               | Paired jetty lamps illuminate                              |
| Lighthouse control | Build two working lamps with an independent path for B; remove A to prove it | Lens and lighthouse lighting activate; beam sweeps the sea |

The next location remains electrically locked until the previous repair is complete. Visiting a restored workshop or harbor shows its completed circuit. After the ending, the lighthouse offers a fresh practice board without changing the story evidence.

Wires are ideal connections; lamps are equal resistive loads. Nodal analysis determines power. Source shorts trip a virtual fuse. Crossings join only at sockets. This intentionally simplified model omits lamp temperature and battery internal resistance. Immediate puzzle success does not establish durable learning; that requires human evaluation and later recall.

## Presentation

The first-person view fills a fixed 16:9 game frame. All screens are authored at 1280 × 720 and scale as one composition, with letterboxing on other aspect ratios. Fullscreen is available from the title, pause menu, Settings, and F. The world and native dialog layers share exactly the same frame; neither turns into a scrolling page.

HUD content is limited to a compass, reticle, next-repair marker, and interaction prompt. Story communication is brief radio text. Menus use clear titles and controls without decorative captions or repeated objective text, with consistent space inside the torn paper edges. The UI uses old ivory rag paper with transparent torn fibers, inked typography, brass details, and crayon circuit annotations. One current instruction occupies a repair leaf beside the instrument, and the notebook uses three indexed discoveries. Circuit activities have no companion, hint, or undo controls. See [paper-game-ui.md](paper-game-ui.md) for the generated material and prompt.

Circuit inspection shows the physical board, one instruction, and only the controls relevant to the current experiment. The large chapter headings, standing companion card, navigation bar, orbit controls, and arrival slideshow are removed from the runtime interface. A single stylesheet owns the new layout.

The world uses continuous terrain, weathered architecture, a workshop doorway/interior, utility cables, photographic pine shoots, instanced grass, coastal rocks, a jetty/boat, reflective sea, HDR sky, and a full-scale lighthouse. Low-level footsteps, sea ambience, cable clicks, test sounds, and restoration chords reinforce physical actions. All essential feedback remains visible with sound off.

## Saves and interruptions

The existing `signal.lighthouse.v1` save remains the circuit/progression record. The new `signal.lighthouse.player.v1` stores position and orientation. Invalid player saves return safely to the workshop path; invalid circuit evidence cannot unlock missions. Old saves without a position start on the path while retaining their repairs.

Reload opens Continue, not a circuit modal. Closing and reopening the physical cabinet resumes its current experiment, including an unfinished fault prediction. Progress and camera saves handle unavailable storage without blocking play. Settings includes a return-to-path recovery and a separate, deliberate new-adventure reset.

Circuit activities make no coaching requests. Paper, fonts, and circuit art prepare before entering the island and stay loaded between repairs. WebGL failure is disclosed and exposes a circuit-only fallback; it is never presented as a working first-person world.

## Verification priorities

1. Walk the whole repair sequence using normal player inputs.
2. Check wall/sea collision, diagonal speed, saved camera validation, and blocked/behind-wall interaction.
3. Verify each repair, the series failure at the beacon, and successful independent backup.
4. Check pointer-lock release, keyboard alternatives, touch walking/look/interaction, and modal input isolation.
5. Verify delayed textures, renderer reuse, blocked storage, reload, and WebGL failure.
6. Inspect the fixed frame at 16:9, taller, wider, small, and fullscreen sizes; verify no scrolling or hidden controls. Landscape is the useful phone orientation. Run automated contrast/focus/semantic checks on dialogs.

The current scope is a three-repair first-person vertical slice. It does not include combat, jumping, swimming, multiplayer, a general inventory, character animation, professional voice acting, or a large authored campaign.
