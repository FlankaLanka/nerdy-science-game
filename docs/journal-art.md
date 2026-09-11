# The keeper’s journal

Historical journal/arrival art pass. The first-person rebuild replaces the arrival pages and clickable map navigation. The generated map and its provenance below remain in use as an optional map object; see [design.md](design.md) for current behavior.

The visual direction combines the live cinematic 3D island with warm paper, graphite, copper crayon, and a keeper’s illustrated map. Body text stays typeset for readability; Caveat is reserved for annotations, labels, and short expressive phrases. The font is bundled locally from [Fontsource](https://fontsource.org/fonts/caveat) under its included SIL Open Font License.

The arrival has three player-paced pages: the shore, meeting Pip, and unfolding the map. Camera compositions change with the pages; reduced motion snaps to the same compositions. Skip, back, reload, and a settings replay are supported. Existing saves bypass the arrival automatically. The first workshop lesson reveals inspection, connection, materials, and prediction in order, and can be dismissed or replayed. Wrong predictions remain valid experiments.

Map locations are real, keyboard-accessible buttons. Restored locations open their discovery; the next available location opens its puzzle; later locations remain locked. Map marks and circuit guidance are live SVG/HTML so text remains accessible and navigation follows actual progress.

## Generated map asset

- Runtime: `public/art/keepers-map.webp`.
- Original: `art-source/keepers-map.png`.
- Generator: built-in imagegen tool.
- Integration: `src/IslandMap.tsx`, used by the prologue, map dialog, and folded-map control.
- The map is an illustration of the island. It does not imply walkable terrain, an inventory, or additional playable locations.

### Final prompt

```text
Use case: stylized-concept
Asset type: finished landscape paper map illustration for an interactive cinematic island exploration game, 1536x1024.
Primary request: A keeper's hand-drawn map of Bramble Island, rendered in wax crayon, soft graphite and restrained watercolor on warm ivory, worn folded paper. This is an actual in-game map asset, not a UI mockup or screenshot.
Scene: a single small rocky coastal island, viewed as a charming illustrated overhead map, roughly rounded, surrounded by lightly sketched ocean contour lines and just a few little wave marks. A red-roofed keeper's workshop is in the lower-left area at approximately 28 percent across and 57 percent down. A tall cream lighthouse with a copper lantern room stands on the upper-right headland at approximately 63 percent across and 28 percent down. A wooden harbor pier extends into the sea at the lower-right at approximately 74 percent across and 74 percent down. A curling walking path connects them through pine trees, coastal grass, small steps and boulders. These three locations should have clear silhouettes and space nearby for separately rendered interactive labels.
Style: a thoughtful explorer's field journal from a premium story-driven adventure. Beautiful layered imperfect pencil contours, tactile wax pigment, small crosshatched shadow details, tiny ochre route markings, muted teal water washes, olive foliage, rust-red and ochre accents. Fine detail with disciplined negative space. Handcrafted, evocative, collectible.
Composition: full-bleed rectangular warm paper, island fills middle 75 percent with comfortable blank paper margins. One subtle vertical and horizontal fold, tiny graphite compass star in upper-left corner, no decorative frames. Flat scanned art, no perspective, no photo of a desk, no items lying on the paper.
Constraints: NO TEXT, no letters, no numbers, no labels, no UI buttons, no digital pins, no photorealistic 3D imagery, no gradients, no watermarks. All map labels will be live HTML. Keep paper light and marks delicately readable.
```
