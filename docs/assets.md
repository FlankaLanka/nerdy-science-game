# Asset provenance

| Runtime files                                                                              | Source                                                                                                  | License                              | Use                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `public/materials/deck-color.jpg`, `deck-normal.jpg`, `deck-roughness.jpg`                 | [Poly Haven: Metal Plate](https://polyhaven.com/a/metal_plate), 1K Diffuse / OpenGL normal / Rough maps | [CC0](https://polyhaven.com/license) | Locally served floor and maintenance-deck PBR material |
| Space Grotesk and IBM Plex Mono font files                                                 | Installed `@fontsource` packages                                                                        | License files in their packages      | Local interface fonts                                  |
| All pressure-wall geometry, fixtures, instruments, signage, diagrams and interface effects | Authored in this repository                                                                             | Project code                         | Fixed modular station; no downloaded franchise models  |

The three texture files total 2,237,747 bytes. Original source maps, alternate resolutions, displacement maps, archive downloads and unused model exports are not retained. The metal maps were downloaded from Poly Haven's published asset metadata (`https://api.polyhaven.com/files/metal_plate`) and are not fetched from that service during play.

Color uses sRGB; normal and roughness remain linear data. Anisotropy is capped at 4 for these textures. The floor uses a shared material and geometry UV scaling instead of duplicating textures by room. The existing procedural exterior is retained behind the small observation aperture.

The art direction draws on industrial retrofuturism and the instrument language discussed by Alien: Isolation's UI designer. No Alien: Isolation textures, meshes, branding, levels or audio have been copied into the project.
