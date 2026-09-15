# Main station

Circuits is the first lesson wing. Completing Independence opens the existing final gate; the arrival gallery now leads into Asterion's public habitat. Players can explore and return to any reachable circuit bench. No additional lessons, objectives, scores or interactive equipment are introduced.

## Spaces

- **Commons:** 36 × 42 m, with an 11.2 m vaulted pressure shell, structural ribs, a glazed zenith light well, suspended lighting, planted islands, a galley and environmental equipment racks.
- **Earth gallery:** a quiet side lounge with framed viewports, seating and nearby exterior radiators.
- **Research concourse:** three closed bays marked Kinematics, Electromagnetism and Waves & optics. Their “Coming soon” signs mark future activities.
- **Docking gallery:** observation windows, secured stores and a closed berth facing a docked transfer vehicle.

The open habitat is a fictional extrapolation. Modular functions, environmental racks, protected services and observation framing draw on [ESA's Tranquility module](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Node-3_Cupola/Node-3_the_most_modern_module_of_the_ISS) and [NASA's Cupola](https://www.nasa.gov/international-space-station/cupola/). The existing flat-deck movement and art-directed planetary scale remain in use.

## Implementation

`scene/stationLayout.ts` owns the footprint, furniture and future bay locations. `scene/mainStation.ts` builds the architecture and props. The main station joins `DECK`, so collision, saved-position validation, room telemetry and the notebook share its actual coordinates. All new spaces require progression stage 6 on restore. Future bays are static, physically closed and absent from the lesson graph.

The map frames the current wing automatically. The HUD names the current gallery. ASTER speaks once when the player enters the commons; resuming elsewhere does not replay the first circuit's greeting. Saves retain the original six-room campaign format.

Materials and geometry are local. Station fixtures reuse the four nearest-light slots; static geometry uses the existing material/spatial batching. Cached sun-shadow coverage follows the player into the larger habitat. Pressure-shell joints retain distinct face depths, and the surface regression scan includes the expanded footprint.

## Verification

Browser checks cover the final gate, the arrival and reload, rejection of premature station saves, a walking loop through every public gallery, blocked future bays, clear observation openings and surface overlap. The original circuit, navigation and resource-disposal checks also remain applicable. Visual review includes the entrance reveal, both side galleries, docking, return route and the map.

Local Chromium/Metal review at 1280 × 720 measured 16.7 ms median and p90 frame intervals in the commons, Earth gallery and research concourse, both stationary and moving. These are short local samples, not a minimum-hardware guarantee. Capture and measurement artifacts are under `artifacts/main-station/`.
