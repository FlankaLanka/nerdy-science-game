# Asset provenance

| Runtime files                                                                              | Source                                                                                                  | License                                                   | Use                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `public/materials/deck-color.jpg`, `deck-normal.jpg`, `deck-roughness.jpg`                 | [Poly Haven: Metal Plate](https://polyhaven.com/a/metal_plate), 1K Diffuse / OpenGL normal / Rough maps | [CC0](https://polyhaven.com/license)                      | Locally served floor and maintenance-deck PBR material |
| Seven files in `public/space/`, listed below                                               | [Solar System Scope textures](https://www.solarsystemscope.com/textures/)                               | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Earth, Moon, Saturn, rings and star field              |
| Space Grotesk and IBM Plex Mono font files                                                 | Installed `@fontsource` packages                                                                        | License files in their packages                           | Local interface fonts                                  |
| All pressure-wall geometry, fixtures, instruments, signage, diagrams and interface effects | Authored in this repository                                                                             | Project code                                              | Fixed modular station; no downloaded franchise models  |

The three texture files total 2,237,747 bytes. Original source maps, alternate resolutions, displacement maps, archive downloads and unused model exports are not retained. The metal maps were downloaded from Poly Haven's published asset metadata (`https://api.polyhaven.com/files/metal_plate`) and are not fetched from that service during play.

Color uses sRGB; normal and roughness remain linear data. Anisotropy is capped at 4 for these textures. The floor uses a shared material and geometry UV scaling instead of duplicating textures by room.

Space Grotesk and IBM Plex Mono use the SIL Open Font License. [Lucide icons](https://lucide.dev/license) use the ISC license.

## Orbital exterior

The following published Solar System Scope files are retained unmodified, with shorter local names.

| Runtime file       | Original download                                                                                       |     Bytes |
| ------------------ | ------------------------------------------------------------------------------------------------------- | --------: |
| `earth-day.jpg`    | [2k_earth_daymap.jpg](https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg)           |   463,087 |
| `earth-night.jpg`  | [2k_earth_nightmap.jpg](https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg)       |   255,287 |
| `earth-clouds.jpg` | [2k_earth_clouds.jpg](https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg)           |   965,676 |
| `moon.jpg`         | [2k_moon.jpg](https://www.solarsystemscope.com/textures/download/2k_moon.jpg)                           | 1,053,869 |
| `saturn.jpg`       | [2k_saturn.jpg](https://www.solarsystemscope.com/textures/download/2k_saturn.jpg)                       |   199,916 |
| `saturn-ring.png`  | [2k_saturn_ring_alpha.png](https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png) |    12,119 |
| `stars.jpg`        | [2k_stars_milky_way.jpg](https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg)     |   251,454 |

These total **3,201,408 bytes**; all retained space and metal maps total **5,439,155 bytes**. Six maps are 2048 × 1024; the ring strip is 2048 × 125 with alpha. No alternate resolutions, source archives, unused maps or reference screenshots ship with them. All seven are used by the exterior renderer and served locally during play.

Solar System Scope describes its maps as based on NASA imagery and other data with artistic adjustments. These are licensed published visualization textures, not untouched observational datasets. The game supplies sunlight, night-side lighting, cloud blending, an atmosphere and ring shadowing. Planet dimensions and positions are composed for a fictional view, not a scaled model of the Solar System.

Color textures use sRGB; the cloud mask uses linear data. Anisotropy is capped at 2. Shared shader textures are included in scene disposal. The sky uses one textured mesh, and the nearby solar cells use one instanced draw. There is no remote asset request during play.

The station uses industrial retrofuturism, restrained instrument displays and geometry authored in this repository.
