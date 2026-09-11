# A new science game

Original ideas brief · September 10, 2026. SIGNAL was subsequently selected and built; see [the playable project](README.md).

## Starting point

The existing project at `../nerdy-hackathon` is **Luma — The Silent Crossing**, a React, TypeScript, Three.js, and Blender Chinese-learning adventure. Its useful patterns are a compact explorable world, physical object puzzles, a notebook, narrative consequences, and persistent progress. Its current learning feedback is authored; there is no live AI tutor.

The inspected folder has no Git metadata, so this review describes its current files, not a verified branch or commit. The review covered the README, application and game state, puzzle logic, narrative, 3D scene setup, learning-design document, and an existing courtyard preview; it was not a fresh runtime test.

[The Nerdy hackathon](https://hackathon.nerdy.com/) accepts original learning-tool ideas. Its page currently lists September 18, 2026 as the submission deadline and requests a 2–3 minute demo video. A science game can fit its open prompt. These concepts are our proposals, not organizer recommendations.

Working audience assumption: English-reading learners roughly ages 10–14. Scope the first release around one science topic and one short chapter, then adjust difficulty after choosing the concept.

## Five directions

### 1. SIGNAL — The Last Lighthouse

**Pitch:** A storm has darkened an island. You and a small maintenance robot must bring its lighthouse back to life.

**What you do:** Explore a coastal workshop, collect components, connect wires, operate switches, and test your circuits. Repairs illuminate the island and open the route to the beacon. The final puzzle asks you to keep one lamp working when the other lamp is disconnected.

**Science:** Complete circuits, conducting materials, and the difference between simple series and parallel circuits.

**AI role:** The robot compares a player's prediction with the observed result and asks a focused follow-up. For example: “You expected both lamps to go out. What path still connects this one to the battery?” Hints use the actual circuit and attempt history.

**First chapter:** One island scene, one circuit workbench, three connected repairs, and a final unfamiliar circuit to solve independently. Use a small, deterministic model of batteries, wires, switches, and resistive lamps.

**Visual hook:** Rain-dark stone, brass instruments, warm windows, and a beacon sweeping over the ocean as the finale.

**Scope:** Most practical starting point. The component set is small, changes are immediately visible, and the final challenge can test whether the player transfers what they learned to a different layout.

### 2. Pocket Biosphere

**Pitch:** An abandoned research station has left you a tiny living world in a glass sphere. Bring it back into balance.

**What you do:** Adjust light, add plants, and manage a small set of organisms and resources. Advance simulated days, compare snapshots, and investigate why a population changed. Keep a second sphere as a comparison experiment.

**Science:** Ecosystem interactions, limiting resources, and changing one variable to investigate cause and effect.

**AI role:** The field assistant helps turn a guess into a testable prediction and points out when several changed variables make the result hard to interpret.

**First chapter:** One simplified pond ecosystem with a few explicit relationships and three research missions. Show the assumptions and limits of the model in the field notebook.

**Visual hook:** A living miniature world that visibly grows and changes while you rotate it in your hands.

**Scope:** Strongest visual transformation; more work to make the ecosystem model understandable and scientifically defensible. Limit the organism count early.

### 3. Moonmail

**Pitch:** Be the smallest delivery service in the solar system. Your next parcel is going to a very inconvenient crater.

**What you do:** Launch cargo between lunar outposts, choose angle and speed, watch the trajectory, then revise the next attempt. Later missions compare the same launch under different gravitational conditions.

**Science:** Motion, gravity, initial velocity, and the value of a controlled comparison.

**AI role:** Mission control responds to a specific prediction or repeated miss and suggests an experiment, such as holding the angle steady while changing launch speed.

**First chapter:** One airless moon, three delivery sites, and one challenge with changed gravity. Keep the initial simulation to short-range projectile motion with explicitly simplified assumptions; orbital mechanics can come later.

**Visual hook:** A little courier robot, colorful parcels tracing arcs against black space, and satisfying landings.

**Scope:** Strong immediate replay value. Predictions and final challenges must distinguish understanding from finding a working angle by repeated guessing.

### 4. Prism — The Sleeping Observatory

**Pitch:** An observatory has gone dark. Its instruments can only wake when you guide light through its forgotten mechanisms.

**What you do:** Rotate mirrors, move obstacles, predict where a beam will land, and redirect light to receivers that unfold bridges and open shutters.

**Science:** Straight-line light propagation, reflection, and shadows. Add refraction or additive color mixing only in a later chapter.

**AI role:** The observatory's guide asks the player to sketch or select the next beam segment, then discusses the difference between the prediction and the traced beam.

**First chapter:** Three rooms using mirrors and opaque barriers, followed by a new arrangement with the beam preview hidden until the player commits a prediction.

**Visual hook:** Visible beams in dusty air, huge moving lenses as scenery, deep blue rooms, and a final instrument opening to the sky.

**Scope:** Very achievable and visually legible. Include unfamiliar angles and layouts so success requires more than memorizing a mirror sequence.

### 5. Matterworks

**Pitch:** Run a miniature molecule factory where every atom has to end up somewhere.

**What you do:** Feed molecule pieces into machines, select quantities, run an allowed reaction, and route the products. Leftover reactants become part of the next puzzle. Orders reward efficient arrangements and complete accounting of atoms.

**Science:** Atoms versus molecules, conservation of atoms, and balancing simple chemical equations.

**AI role:** The factory assistant asks the player to track one element through a proposed reaction and explain any mismatch before trying again.

**First chapter:** One factory board with a small, reviewed reaction library and three orders. Represent reactions as simplified models; arbitrary atom arrangements should not automatically count as valid chemistry.

**Visual hook:** Bright molecular pieces, satisfying conveyor movement, and transparent machines that show the rearrangement.

**Scope:** Compact and expandable. Make the scientific meaning of the pieces explicit so the game teaches more than matching colors or counting tokens.

## Recommendation: begin with SIGNAL

SIGNAL gives us a small scientific model, a strong story outcome, and visible evidence of how AI responds to a particular learner. It also fits the compact adventure structure already explored in Luma.

The intended loop is **predict → build → test → observe → explain → apply somewhere new**. Short predictions and optional explanations belong inside the repair task. Support the player with compact dialogue and an experiment notebook.

Suggested opening sequence:

1. **Wake the workshop.** A lamp stays dark. The player predicts what is missing, completes the circuit, and sees the room light up.
2. **Investigate the walkway lamps.** Two lamps share a circuit. The player predicts what happens when a connection is removed and compares the result with the prediction.
3. **Restore the beacon.** Build separate branches so one beacon lamp can keep working when the other is disconnected. Finish with a different layout and reduced help.

The AI companion reads the simulation state, predictions, and recent actions. It supplies a short question or explanation grounded in those observations. Circuit outcomes come from validated simulation rules. Use authored feedback when AI is unavailable, with an honest indication that the response is scripted.

Record predictions before testing, hints requested, and performance on the unfamiliar final circuit. These are useful observations of current performance; completing the story alone does not establish durable learning.

The first build should prove the complete workbench interaction and one live, grounded AI response before expanding the island art. Then connect the repairs into the story and polish the final reveal for a 2–3 minute demo.

## Decision still open

Choose the premise before scaffolding the application. SIGNAL is the recommendation; Pocket Biosphere favors a living-world simulation, Moonmail favors repeatable action, Prism favors spatial puzzles, and Matterworks favors construction and optimization.
