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
    if (action.type === "TEST") play("test");
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
  const stage = guided ? Math.max(1, lesson) : 4;
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
          : "What will the lamp do? Predict, then switch on.";
  if (p.tested && p.phase === "build")
    instruction = result?.short
      ? "Short circuit. Remove the wire bypassing the lamps."
      : id === "workshop" && p.material !== "copper"
        ? "No current through the bridge. Try a conducting material."
        : "The path is still open. Check both battery connections.";
  if (p.phase === "fault-ready")
    instruction = "Both lamps work. What happens if we disconnect A?";
  if (faultFailed)
    instruction = "Both went dark. Give B a path that doesn’t depend on A.";
  if (reflection)
    instruction =
      id === "workshop"
        ? "There’s our spark."
        : id === "harbor"
          ? "They shared one path."
          : "The backup held.";
  if (success || done)
    instruction = "Circuit restored. Ready to bring the power online.";
  const shortAnswers: Record<string, Record<string, string>> = {
    workshop: {
      near: "A nearby battery",
      loop: "A complete conducting loop",
      one: "One battery connection",
    },
    harbor: {
      used: "A used up the current",
      loop: "Their only path was broken",
      battery: "The battery emptied",
    },
    beacon: {
      store: "B stored some light",
      bigger: "B became stronger",
      branch: "B has its own complete path",
    },
  };
  return (
    <Dialog
      open={open}
      title={`${SITES[id].name} circuit`}
      className={`repair-dialog phase-${p.phase}`}
      onClose={onClose}
    >
      <div className="repair-heading">
        <h1>{SITES[id].name}</h1>
      </div>
      <div className="repair-instruction" role="status">
        <span>{instruction}</span>
      </div>
      <div className="repair-layout">
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
          {p.phase === "build" && (!guided || stage >= 3) && (
            <>
              <fieldset>
                <legend>
                  {id === "workshop" ? "The lamp will…" : "Your prediction"}
                </legend>
                <div className="choice-row">
                  {mission.predictions.map((c) => (
                    <button
                      key={c.id}
                      aria-pressed={p.prediction === c.id}
                      className="choice"
                      onClick={() => act({ type: "PREDICT", value: c.id })}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                className="primary-action"
                disabled={!p.prediction}
                onClick={() => act({ type: "TEST" })}
              >
                <Play size={16} /> Test circuit
              </button>
            </>
          )}
          {guided && stage < 3 && (
            <div className="repair-step">
              <span className="crayon-number">{stage === 1 ? "01" : "02"}</span>
              <span>
                {stage === 1 ? "Connect the loose ends" : "Find a conductor"}
              </span>
            </div>
          )}
          {p.phase === "fault-ready" && (
            <>
              <fieldset>
                <legend>Disconnect A. What happens to B?</legend>
                <div className="choice-row">
                  {[
                    { id: "stays", text: "B stays on" },
                    { id: "out", text: "B goes out" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      className="choice"
                      aria-pressed={p.faultPrediction === c.id}
                      onClick={() =>
                        act({ type: "FAULT_PREDICT", value: c.id })
                      }
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                className="primary-action"
                disabled={!p.faultPrediction}
                onClick={() => act({ type: "FAULT_TEST" })}
              >
                <Lightbulb size={16} /> Disconnect lamp A
              </button>
            </>
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
          {reflection && !success && (
            <fieldset className="reflection">
              <legend>{mission.question}</legend>
              <div className="choice-row">
                {mission.explanations.map((c) => (
                  <button
                    key={c.id}
                    className="choice"
                    aria-label={c.text}
                    aria-pressed={p.explanation === c.id}
                    onClick={() => act({ type: "EXPLAIN", value: c.id })}
                  >
                    {shortAnswers[id][c.id]}
                  </button>
                ))}
              </div>
              {p.explanation && p.explanation !== mission.answer && (
                <p className="explanation-feedback" role="status">
                  {mission.misconception[p.explanation]}
                </p>
              )}
            </fieldset>
          )}
          {(success || done) && (
            <button
              className="primary-action restore-action"
              onClick={onComplete}
            >
              {done
                ? "Back to the island"
                : practice
                  ? "Finish circuit"
                  : mission.restore}
              <ArrowRight size={18} />
            </button>
          )}
        </section>
      </div>
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
