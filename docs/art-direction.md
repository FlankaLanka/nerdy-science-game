# SIGNAL: coastal instruments

Historical art record. The current first-person implementation and interface are described in [design.md](design.md); the material and asset provenance below remains relevant.

This pass replaces the initial low-poly, paper-panel presentation with a more cinematic, tangible game. The reference bar was purposeful game UI and convincing materials; SIGNAL keeps its own coastal setting, typography, warm signal color, and quiet pace.

## Three bounded systems

1. **The island:** perspective camera, real reflected water, HDR lighting, textured rock/plaster/wood, photographed pine shoots, instanced grass, atmospheric depth, and light returning to repaired locations.
2. **The field kit:** actual 3D glass, ceramic, metal, and wood components, aligned with the existing accessible socket controls. A tested complete path gains warm light; inactive wires become neutral. Brightness follows the solver's lamp power. Removing a lamp physically removes its glass and filament.
3. **The presentation:** condensed display type, restrained instrument labels, a dark interface, original Pip portrait, crisp selected states, mechanical sound transients, and a short restoration camera moment. One experiment and its next decision remain visible.

The circuit rules, prediction records, first explanations, completion guards, and saved learning evidence remain the source of truth. Visual feedback never grants progress. Pip now uses a real OpenRouter model; its answer cannot mutate the simulation.

## Five-component review

| Component | Decision and check |
| --- | --- |
| Clarity | The same 720 × 460 coordinate system drives both 3D components and the native socket layer. Light marks complete conducting paths, not disconnected wires. One stage is highlighted at a time. |
| Motivation | Each experiment restores a visible place and moves the ferry's return closer. |
| Response | A socket responds immediately; the circuit calculation is local. Asset and shader preparation run separately from input. Coach requests are cancellable from the player's perspective. |
| Satisfaction | Warm light, a mechanical click, a restoration notice, and a gentle camera move connect each successful repair to the world. |
| Fit | Worn coastal instruments and brass/ceramic Pip belong to the story. There is no timer or punishment for an incorrect prediction. |

Priority when these conflict follows the supplied guide: Response, Clarity, Satisfaction, Fit, Motivation. For example, the readable native socket layer is retained above the 3D kit, and the full experiment remains available if WebGL fails.

## Presentation states

| State | Entry | Exit / interruption | Cost and edge cases |
| --- | --- | --- | --- |
| Preparing scene | Scene mounts | Assets and asynchronous shaders are ready; unmount cancels reveal | No progress cost; input and the SVG circuit continue to work. A failed WebGL context uses the fallback. |
| Editing | Mission enters build | Prediction/test or leave | Pointer, touch, and keyboard use the same terminals. An edit invalidates the prior result. |
| Energized | The local solver returns a tested result | Edit, fault test, or leave | Filament and light use computed power. A fuse-open result lights no lamp. |
| Removed lamp | Fault test opens A | Revise or complete | A's glass disappears; its socket remains. Only the remaining complete path is highlighted. |
| Restoration | Guarded completion succeeds | Notice expires, player opens the next repair, or resets | Notice cannot intercept input. Camera motion is omitted with reduced motion. Timers clean up on replacement/unmount. |
| Coaching | Player asks for a nudge or submits a question | Live answer, fallback, circuit change, or leave | API key stays server-side; one answer is labeled with its actual source. Material facts explicitly distinguish the workshop bridge from wires. |

## Starting values and micro tests

Art dimensions are authored scene coordinates, not physical measurements of the island. The following are **starting values**, subject to device and learner testing.

| Setting | Starting value | Micro test / pass criterion | Adjustment if it fails |
| --- | --- | --- | --- |
| Socket target | 44 CSS px | Complete the phone adventure without an accidental neighboring socket | Enlarge target or increase spacing |
| World camera | 39° FOV; bounded rotation | All three location markers remain recognizable at the supported views | Reframe target/distance |
| Pixel ratio cap | 1.75 desktop; 1.5 narrow screens | Check active camera and wire input on the target device | Reduce cap before reducing legibility |
| Water reflection | 512 desktop; 256 narrow screens | Inspect reflection and frame pacing together | Reduce reflection resolution |
| Repeated vegetation | Up to 3,800 grass blades and 1,152 pine cards | Check readable paths, silhouette, and rendering time | Reduce density or shadow cost |
| Bloom | Strength .14, threshold 1.7 | Dark lamp remains visibly dark; ocean does not obscure the lighthouse | Raise threshold or reduce strength |
| Bulb response | Damped transition at 8/s | Result appears promptly and only on the computed live path | Shorten response; never delay the calculation |
| Restoration | 4.2 seconds; 3 seconds without motion | Player notices the repaired place and can immediately continue | Shorten notice or reduce its footprint |
| Coach timeout | 20 seconds server; 22 seconds client | Disconnected or slow service returns authored help and leaves input working | Tune timeout against observed latency |
| Image compression | WebP quality 85–90 | Inspect glass, foliage edges, normal maps, and Pip at displayed size | Increase quality only for affected assets |

ASSUMPTION: The primary player is roughly 10–14 and can read short circuit prompts. IMPACT: Labels and explanations use plain language without a reading-level selector. IF WRONG: Add an age-appropriate text/audio mode. VALIDATE: Use the unfamiliar-learner session in `playtest.md`; automated tests cannot establish instructional effectiveness.

## Art provenance and reproducibility

- Original Pip portrait: built-in `image_gen` tool, requested at highest available quality with transparent alpha. Source is `art-source/pip-v2.png`; the runtime copy is `public/art/pip-v2.webp`.
- Photographic material maps, pure-sky HDR, and pine shoot atlas: [Poly Haven, CC0](https://polyhaven.com/license). Exact asset URLs and original downloads are in `public/art/credits.json`.
- Water normal source: Three.js example texture, recorded in that manifest.
- Geometry, scene composition, interface, shaders, and sound synthesis are authored in this project. The pine atlas is sampled by UVs on instanced geometry, not used as a flat island background.
- Fonts: Barlow Condensed, IBM Plex Mono, DM Sans, and Cormorant Garamond via Fontsource, with licenses in their packages.
- `scripts/fetch-art.mjs` fetches the base material library. `scripts/optimize-art.mjs` uses `cwebp`, preserves originals in `art-source/`, and writes the runtime image-size manifest. The game itself makes no external art requests.

### Final image-generation prompt

> Use case: stylized-concept. Asset type: final transparent character portrait for the playable science adventure SIGNAL. Create an original premium game character, Pip, a small thoughtful coastal maintenance robot. Full body, three-quarter front view, clean centered silhouette. Squat rounded rectangular ivory ceramic head with precise beveled edges, scuffed paint, tiny screw fittings, dark curved glass face screen with two simple soft amber horizontal eyes, short bent antenna with a tiny amber lamp. Round aged brass and dark teal body, small articulated mechanical arms, small rubber wheels, coiled fabric cable details. Expressive curious head tilt, one little hand raised as if explaining an experiment. Tangible hand-crafted industrial materials: micro-scratches, patinated brass, ceramic glaze, rubber and woven cable. Sophisticated cinematic 3D character rendering, physically based lighting, amber rim light and cool diffuse fill, beautiful silhouette and controlled contrast. Friendly, grounded, believable engineering. Entire robot visible with generous transparent margin. Real transparent alpha background, NO scenery, NO floor, NO cast shadow plane, NO text, NO logo, NO watermark. Not a toy, no plastic cartoon shader, no flat vector shapes. Render at highest available quality, square portrait composition.

## Coaching model

The local `.env` selects `anthropic/claude-opus-5`, verified against the [OpenRouter model catalog](https://openrouter.ai/anthropic/claude-opus-5). Medium reasoning is requested with a bounded response budget. Live checks exposed ambiguous material context and an ambiguous follow-up question. The facts now name the removed lamp, label visible terminals, and state that every wire is conductive. The model writes a short contextual explanation; the server appends a checked question selected from the actual experiment state. A malformed answer falls back to authored guidance. The final live response is still advisory, not a substitute for the simulator.
