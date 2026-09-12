import type { CircuitResult } from "./circuit";
import { LAMP_OHMS, SOURCE_VOLTS } from "./circuit";
import type { MissionId } from "./missions";
import { SHIP_SYSTEMS } from "./shipSystems";

export function ServiceReadout({
  id,
  result,
  removed,
}: {
  id: MissionId;
  result: CircuitResult | null;
  removed: boolean;
}) {
  const system = SHIP_SYSTEMS[id];
  const loads = id === "workshop" ? ["a"] : ["a", "b"];
  return (
    <div className="service-readout" aria-label="Measured circuit readings">
      <div className="readout-source">
        <span>SERVICE SOURCE</span>
        <strong>
          {SOURCE_VOLTS.toFixed(1)} <small>V DC</small>
        </strong>
        <em>12 Ω test loads</em>
      </div>
      {loads.map((load) => {
        const output = result?.lamps[load];
        const isolated = removed && load === "a";
        return (
          <div
            className={`load-readout ${output?.on ? "energized" : ""}`}
            key={load}
            data-load={load}
          >
            <span>
              <i />
              {load.toUpperCase()} /{" "}
              {load === "a" ? system.loadA : system.loadB}
            </span>
            <strong>
              {output ? output.voltage.toFixed(1) : "—"}
              <small>V</small>
              <b>/</b>
              {output ? (output.voltage / LAMP_OHMS).toFixed(2) : "—"}
              <small>A</small>
              <b>/</b>
              {output ? output.power.toFixed(2) : "—"}
              <small>W</small>
            </strong>
            <em>
              {isolated
                ? "BRANCH DISCONNECTED"
                : result?.short
                  ? "FUSE OPEN · SUPPLY ISOLATED"
                  : result
                    ? output?.on
                      ? "LOAD ENERGIZED"
                      : "NO CURRENT"
                    : "AWAITING TEST"}
            </em>
          </div>
        );
      })}
    </div>
  );
}
