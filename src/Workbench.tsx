import { ArrowRight, Lightbulb, Play } from "lucide-react";
import { CircuitBoard } from "./CircuitBoard";
import { Dialog } from "./Dialog";
import { missionById } from "./missions";
import type { MissionId } from "./missions";
import { canFinish } from "./game";
import type { Progress, MissionAction } from "./game";
import { solveCircuit } from "./circuit";
import type { Sound } from "./audio";
import { SITES } from "./scene/navigation";
import { SHIP_SYSTEMS } from "./shipSystems";
import { ServiceReadout } from "./ServiceReadout";

type Props = {
  id: MissionId;
  open: boolean;
  onReady: () => void;
  progress: Progress;
  onAction: (action: MissionAction) => void;
  onClose: () => void;
  onComplete: () => void;
  play: (sound: Sound) => void;
  saved: boolean;
  practice: boolean;
  lesson: number;
  onLesson: (step: number) => void;
  blocked?: string;
};

export function Workbench({
  id,
  open,
  onReady,
  progress: p,
  onAction,
  onClose,
  onComplete,
  play,
  saved,
  practice,
  lesson,
  onLesson,
  blocked,
}: Props) {
  const mission = missionById(id),
    removed = p.phase === "fault-result";
  const result =
    p.tested || p.phase !== "build"
      ? solveCircuit(id, p.wires, p.material, removed ? "a" : null)
      : null;
  function act(action: MissionAction) {
    onAction(action);
    if (id === "workshop" && lesson <= 1 && action.type === "WIRE") onLesson(2);
    if (id === "workshop" && lesson === 2 && action.type === "MATERIAL")
      onLesson(3);
    if (action.type === "TEST")
      play(solveCircuit(id, p.wires, p.material).short ? "fault" : "test");
    if (action.type === "FAULT_TEST")
      play(
        id === "beacon" && solveCircuit(id, p.wires, p.material, "a").lamps.b.on
          ? "success"
          : "fault",
      );
    if (action.type === "EXPLAIN")
      play(action.value === mission.answer ? "success" : "soft");
  }
  const success = canFinish(id, p),
    done = p.phase === "complete";
  const faultFailed = removed && id === "beacon" && !result?.lamps.b.on;
  const reflection = p.phase === "reflect" || (removed && !faultFailed);
  const guided = id === "workshop" && lesson < 4 && p.phase === "build";
  const stage = guided ? (!p.wires.length ? 1 : Math.max(2, lesson)) : 4;
  let instruction =
    id === "harbor"
      ? "Reconnect B’s loose end to battery −."
      : id === "beacon"
        ? "Give each lamp its own path to both battery ends."
        : "Complete the path through the lamp and bridge.";
  if (guided)
    instruction =
      stage === 1
        ? "Select the two circled sockets to connect a wire."
        : stage === 2
          ? "Replace the broken bridge. Choose a material below."
          : "Switch on and read the instruments. You can change the circuit and test again.";
  if (p.tested && p.phase === "build")
    instruction = result?.short
      ? "Short circuit. Remove the wire bypassing the lamps."
      : id === "workshop" && p.material !== "copper"
        ? "No current through the bridge. Try a conducting material."
        : id === "harbor" && result?.count === 2
          ? "A bypass changed the supplied series circuit. Remove it so the fault test measures the shared route."
          : "The path is still open. Check both battery connections.";
  if (p.phase === "fault-ready")
    instruction = "Both lamps work. What happens if we disconnect A?";
  if (faultFailed)
    instruction = "Both went dark. Give B a path that doesn’t depend on A.";
  if (reflection)
    instruction =
      id === "workshop"
        ? "Auxiliary path confirmed."
        : id === "harbor"
          ? "They shared one path."
          : "The backup held.";
  if (success || done)
    instruction = "Circuit restored. Ready to bring the power online.";
  return (
    <Dialog
      open={open}
      title={`${SITES[id].name} circuit`}
      className={`repair-dialog phase-${p.phase}`}
      onClose={onClose}
    >
      <div className="repair-heading">
        <span className="eyebrow">
          MAINTENANCE INTERFACE / {mission.number}
        </span>
        <h1>
          {SITES[id].name}
          <span className="station-system">{SITES[id].system}</span>
        </h1>
      </div>
      <p className="service-purpose">
        <span>{SHIP_SYSTEMS[id].code}</span>
        {SHIP_SYSTEMS[id].consequence}
      </p>
      <div className="repair-instruction" role="status">
        <span className="eyebrow">
          {success || done ? "DIAGNOSTIC COMPLETE" : "REPAIR PROTOCOL"}
        </span>
        <span key={instruction}>{instruction}</span>
      </div>
      <div className="repair-layout">
        <ol className="commissioning-steps" aria-label="Commissioning sequence">
          {[
            "Connect",
            "Energize",
            ...(id === "workshop" ? [] : ["Isolate"]),
            "Commission",
          ].map((label, i) => {
            const step =
              p.phase === "build"
                ? p.prediction || p.tested
                  ? 1
                  : 0
                : p.phase === "fault-ready"
                  ? 2
                  : id === "workshop"
                    ? 2
                    : 3;
            return (
              <li
                key={label}
                className={i === step ? "current" : i < step ? "done" : ""}
                aria-current={i === step ? "step" : undefined}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <CircuitBoard
          active={open}
          onReady={onReady}
          mission={mission}
          progress={p}
          result={result}
          removed={removed}
          onAction={act}
          play={play}
          lesson={stage}
        />
        <section className="repair-actions" aria-label="Circuit controls">
          {p.phase === "build" && (
            <button
              className="primary-action"
              onClick={() => act({ type: "TEST" })}
            >
              <Play size={16} /> Test circuit
            </button>
          )}
          {guided && stage < 3 && (
            <div className="repair-step">
              <span className="step-number">{stage === 1 ? "01" : "02"}</span>
              <span>
                {stage === 1 ? "Connect the loose ends" : "Find a conductor"}
              </span>
              <p>
                {stage === 1
                  ? "A surge opened the auxiliary circuit. Reconnect the lamp to the replaceable conductor insert."
                  : "The insert must carry current back to the source. Compare materials, then verify the result on the instruments."}
              </p>
            </div>
          )}
          {p.phase === "fault-ready" && (
            <div className="repair-step">
              <p>
                Both loads are on. Disconnect A to see whether B has an
                independent return path.
              </p>
              <button
                className="primary-action"
                onClick={() => act({ type: "FAULT_TEST" })}
              >
                <Lightbulb size={16} /> Disconnect lamp A
              </button>
            </div>
          )}
          {faultFailed && (
            <button
              className="primary-action"
              onClick={() => act({ type: "REVISE" })}
            >
              Revise your circuit
              <ArrowRight size={17} />
            </button>
          )}
          {reflection && (
            <div className="observation-explainer">
              <span>WHAT THE METERS SHOW</span>
              <p>{mission.evidence}</p>
            </div>
          )}
          {(success || done) && (
            <div className="commission-result">
              <span>
                {blocked
                  ? "UPSTREAM REPAIR NEEDED"
                  : done
                    ? "SYSTEM ONLINE"
                    : "ON COMMISSION"}
              </span>
              {blocked && <p>{blocked}</p>}
              <p>
                {id === "harbor" ? "Re-seat test module A. " : ""}
                {SHIP_SYSTEMS[id].restored}
              </p>
              <button
                className="primary-action restore-action"
                onClick={onComplete}
                disabled={!!blocked && !done}
              >
                {done
                  ? "Back to the ship"
                  : practice
                    ? "Finish circuit"
                    : mission.restore}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </section>
      </div>
      <ServiceReadout id={id} result={result} removed={removed} />
      <footer className="repair-footer">
        {!saved && (
          <span role="status">
            Saving unavailable · progress stays in this tab
          </span>
        )}
        {guided && (
          <button className="text-button" onClick={() => onLesson(4)}>
            Skip guidance
          </button>
        )}
      </footer>
    </Dialog>
  );
}
