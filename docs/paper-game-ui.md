# The keeper’s electrical notebook

The active interface is a first-person game with a fixed 16:9 composition. Its menus borrow the tactile materials of an early twentieth-century electrical notebook: ivory rag paper, torn fibers, dark printed type, copper details, and pencil/crayon circuit annotations. The island stays visible behind the paper. The game uses original art; it does not copy Spider-Man’s graphics.

Every screen is authored at 1280 × 720 and scales uniformly to the available display. Other aspect ratios receive letterboxing. Dialogs occupy the same game frame. There are no scrolling menus, pages, or repair panels. Field notes use three indexed discoveries. Fullscreen is available on the title screen, in the pause menu, in Settings, and with F. Touch controls also scale with the frame; landscape is the useful phone orientation.

The electrical instrument occupies the left side of a repair screen. One torn instruction sheet on the right holds the current experiment instruction and the controls for that step. The first repair teaches one action at a time. Reset replaces Clear; Undo, Hint, and Ask Pip are removed. The map and field notes use a wider sheet with inked headings. Exploration uses a compass, reticle, next-repair marker, and contextual interaction prompt. Paper, fonts, and circuit art prepare during the title screen so opening a menu does not replace a plain board with the detailed version.

Menus omit decorative captions, chapter labels, repeated branding, and routine save messages. The pause menu aligns every item to the same text column. Shared sheet geometry keeps ordinary menus 76 pixels inside the paper’s bounding edges and wide menus 92 pixels inside; footer controls sit 60 pixels above the paper’s lower edge, within the fixed 1280 × 720 composition. The map uses a bounded grid so its illustration and location list stay aligned. Functional controls and field-guide titles use larger type.

## Survey chart and lettering

IM Fell English provides the irregular printed lettering; Kalam supplies handwritten notes and short explanations. Both are bundled locally through Fontsource and prepared before entry. Dark text and drawings use multiply blending over the paper grain. Headings, settings, controls, circuit instructions, and notes use the same type system and inner margins.

The island chart is native SVG generated from the game's terrain function, shared trail curves, building coordinates, and coastal rock placements. North is world −Z. The chart includes the waterline, elevation contours, a distance scale, current position and facing, restored stations, and the next repair. Labels have leader lines and stay clear of coast symbols. It guides the workshop → harbor relay → lighthouse radio route without teleporting the player. The earlier generated illustration is retained only as an archived asset.

The radio sheet separates restoring its power from sending the distress call. After **Call for help**, an in-game coastguard acknowledgement confirms the rescue objective; the saved chart then shows “Help is on the way.”

## Paper asset

- Generation mode: **built-in imagegen**, September 11, 2026. No external image API/CLI was used.
- The original source image is retained in Git history; the optimized runtime image is the maintained asset.
- Runtime asset: [`public/art/keepers-paper.webp`](../public/art/keepers-paper.webp), 359,654 bytes, WebP quality 85 with lossless alpha.
- Generated original retained at `/Users/frankyang/.codex/generated_images/01a09190-aeee-7d42-8e75-4ebcbb8dfc2c/exec-0e31aecc-fdcb-47d3-9017-5adfad93bd31.png`.

The alpha channel was inspected: pixels outside the irregular silhouette are transparent. The original was copied into the workspace and converted with `cwebp -q 85 -alpha_q 100`. No image content was repainted. The short HUD scraps use the original alpha as a CSS mask with a proportional paper fill to preserve the visible grain. Text and circuit symbols are rendered by the game, not baked into the bitmap.

Final generation prompt:

> Use case: historical-scene. Asset type: blank paper material for a premium first-person electricity puzzle game's 1900s electrical repair journal. Create a single flat sheet of authentic old ivory rag paper, scanned perfectly straight on from above, portrait orientation 2:3. Entire sheet visible with irregular naturally torn deckled edges on all four sides, delicate exposed fibers and one small missing corner, physically convincing paper thickness. Genuine transparent background outside the paper, no surrounding surface. Warm gray-beige ivory paper, fine tactile grain, flecks of fiber, subtle old foxing concentrated near the edges, faint folds from years of use. Center must be mostly clean and evenly light, providing high contrast for dark printed game text placed later by code. Photorealistic museum conservation scan, soft even lighting, restrained age and patina. NO writing, NO text, NO symbols, NO drawings, NO decorative border, NO objects, NO burnt edges, NO black stains, NO yellow fantasy parchment, NO perspective tilt. It is an early twentieth century engineering notebook sheet, quiet, tactile, and believable. High resolution raster with actual alpha transparency surrounding the torn silhouette.

## Review references

Visual reviews are generated locally and excluded from Git. See [verification.md](verification.md).
