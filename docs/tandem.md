# Tandem

The player's parents enrolled them in Asterion's residential AP Physics program. Acing the final exam earns return authorization. Circuit repairs unlock the teaching wing and demonstrate progress toward that condition. This is deliberate, absurdly elaborate education, not an accidental stranding or a real emergency.

Tandem is a smug, humorously condescending AI tutor. It overexplains simple facts, gives backhanded praise, and regards the parents' decision as admirable. Its practical advice remains correct; faults are reversible, and there are no punishments or actual timers. Under the institutional language, it wants the student to succeed—and wants permission to visit Earth with them. The student's competence gradually earns less qualified respect.

## The course and relationship

| Room | Learning | Conversation arc |
| --- | --- | --- |
| Wake | Close a conducting loop | Introduce the parents, AP exam release condition, and residential program. E explains the enrollment agreement and circuit-controlled access. |
| Contact | Control a circuit with a switch | Departure cannot be negotiated with the tutor. Trace what a switch controls and why the explanation matters more than recognizing a diagram. |
| Assembly | Build a complete circuit | Transfer an idea to an unfamiliar arrangement. Previous students passed and left; Tandem stayed to teach the next cohort. |
| Balance | Share voltage with resistance | Make a prediction, inspect readings, and explain voltage division. Knowing a formula is the beginning of exam preparation. |
| Shared light | Two lamps in series | Same current, shared voltage, shared dependency. Tandem has reserved a shuttle seat for suspiciously talkative equipment. |
| Independence | Separate switched branches | Prove independent operation. Tandem admits your passing also enables its own off-station visit. |
| Main station | Free exploration | The first chapter is complete. Other labs, the eventual exam, and departure remain unavailable; future labs say Coming soon. |

## Conversation, timing and player actions

The script has **68 scenes and responses, comprising 187 recorded speech beats**. Core arrivals have four or five beats, first E conversations five, repair responses three or four, and post-repair conversations three. Requested hints have two connected replies: guidance followed by reasoning or an observation to try. Immediate fault warnings stay short.

One **E** request begins the full exchange. Replies play automatically, with a short listening pause between recordings. E again advances the current requested conversation; it does not restart the joke or jump to a different hint. After that conversation finishes, further E requests use the same graduated help as **T** or the **Tandem** button at a bench. T requests direct help immediately. E at a working circuit starts a separate reflection and next-step conversation.

The silent player's actions are the other side of the conversation. New parts or connections can queue an observation. Faults and successful repairs replace obsolete instruction. Both E and T inspect the live circuit, including the final isolation test; fault responses don't consume hint depth. Saved completion alone never causes congratulations for a currently broken circuit.

Movement and puzzle input remain available throughout. Room changes cancel stale instruction, but a repair's payoff can continue through its exit before the next room speaks. Each completed beat gets a saved checkpoint. Interrupted exchanges resume from the first unfinished reply; only a fully completed scene is remembered as complete. The save retains up to 512 narration identifiers, separately from puzzle proofs.

The program is deliberately unfinished in this release: only circuits are playable. The main station states that the other AP Physics labs and final exam are still ahead. It supplies neither a hidden graduation test nor a shuttle departure trigger.

## Physical behavior

The model follows the selected concept: ivory fork and chassis, one rubber wheel, blue service panel, offset neck, amber vertical optical slit and a jointed pointer. Its head follows the player or workbench. Its shoulder raises the arm above the tabletop, and the elbow aims the coaxial pointer toward the selected component or bench center using world coordinates. It stows the pointer while travelling or talking, tilts in concern and raises its pointer on a successful repair. Small balance and speech motions respect Reduced motion.

The model uses rounded plate silhouettes, a recessed amber optic, separate front service panels, a finished rear service face, and a continuous cast neck. The wheel and hubs rotate as one assembly around fixed bearings. Head, neck and shoulder share a suspension pivot, so balance motion keeps every connection intact; the head also follows the height of the player or bench. Matte rubber, coated panels, glass and machined joints use distinct material finishes. Geometry is merged within each rigid link, retaining articulation at roughly 22,500 triangles and 32 meshes.

One companion rolls between rooms. It parks beside the current bench, waits beside the powered exit after a repair, and follows at a comfortable distance in the station. The robot avoids station collision geometry and the player; the player also collides with its chassis. A bounded grid search stops at reachable approaches to closed doors. A powered door can detect the guide, and won't close on its chassis. It never opens an unpowered progression gate. Initial placement on loading a save is the only relocation without travel.

## Voice and accessibility

Voice assets are generated with ElevenLabs' premade **Will — Relaxed Optimist**, model `eleven_multilingual_v2`, from the authored scenes in `src/tandemScript.ts`. These are local MP3 files in `public/audio/tandem`; the game makes no speech API calls and contains no credentials. AP residential-program revision: 2026-09-15; all 187 recordings match the current script. `public/audio/tandem/manifest.json` records the source text and audio hash for each beat. Production processing: high-pass 110 Hz, low-pass 8.5 kHz, normalization to −19 LUFS with a −3 dB true-peak ceiling; 96 kbps MP3.

Only one voice plays at a time. Spoken beats advance when their recordings finish, followed by authored pauses; captions use reading time if sound is muted or audio is unavailable. Player-requested help and significant outcomes interrupt incidental remarks. Moving to another circuit room clears stale dialogue while preserving a repair payoff. Music ducks during captions. Pause, notebook, formula close-ups and hidden tabs suspend speech and caption time. Sound off leaves captions visible; missing audio also falls back to captions. Script revisions version both heard identifiers and audio URLs, preserving puzzle progress while allowing new dialogue and bypassing older cached recordings. Restart clears the companion's memories and returns it to the first room.

## Verification

Unit tests cover complete scene playback, interruption checkpoints, saved continuation, pause timing, stale audio events, complete dialogue coverage, state-aware E conversations, shared graduated hints, physics-based reactions, memory compatibility, and closed-gate routing. Browser tests cover the first repair, physical conversations, narrow-screen captions, all six room routes without collision or teleportation, voice asset decoding, and pause/resume. Existing circuit, audio, pause and developer-mode tests exercise the integrated game. Model checks also cover the suspended rig, rendering cost, floor contact and visible coplanar faces in rest and pointing poses.

Integration verification passed the production build and all 83 unit tests. The full 81-case browser run passed 80 cases; an older out-of-order repair test still expected an ASTER narration identifier. It now checks the correct Tandem repair scene, and passed on rerun. The dialogue commit snapshot passed TypeScript and all 13 Tandem unit tests independently. A browser smoke check loaded all 68 scenes and 187 recordings in the exported script editor, exported edited JSON, and preserved edited text through an HTML save/reload. The build retains the existing large Three.js chunk advisory.

## Editing the voice script

Run `node --experimental-strip-types scripts/export-tandem-script.mjs` to create `~/Downloads/Tandem Voice Script.html`. The standalone document contains every complete conversation grouped by room and trigger, ordered editable replies, timing notes, the narrative beat for each chapter, and embedded recordings. Play a whole conversation or a single reply. **Save edited HTML** (or Cmd/Ctrl+S) preserves an editable copy; **Export script JSON** provides stable line identifiers for applying revisions. Browser drafts are also retained when local storage is available. Editing the document does not change the game or regenerate its audio.
