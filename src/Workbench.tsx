import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Lightbulb,
  MessageCircle,
  Play,
  Radio,
  Send,
  X,
} from "lucide-react";
import { CircuitBoard } from "./CircuitBoard";
import { Dialog } from "./Dialog";
import { missionById } from "./missions";
import type { MissionId } from "./missions";
import { canFinish } from "./game";
import type { Progress, MissionAction } from "./game";
import { solveCircuit } from "./circuit";
import { fieldGuide } from "./coach";
import type { CoachContext, CoachReply } from "./coach";
import type { Sound } from "./audio";
import { SITES } from "./scene/navigation";
import { textPages } from "./textPages";

type Props = {
  id: MissionId;
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
  const [asking, setAsking] = useState(false),
    [message, setMessage] = useState("");
  const [reply, setReply] = useState<CoachReply | null>(null),
    [pending, setPending] = useState(false);
  const [replyPage, setReplyPage] = useState(0);
  const replyPages = textPages(reply?.text ?? "");
  useEffect(() => setReplyPage(0), [reply]);
  const request = useRef<AbortController | null>(null),
    generation = useRef(0);
  const boardKey = JSON.stringify([p.wires, p.material, p.phase]);
  useEffect(() => {
    generation.current++;
    request.current?.abort();
    setPending(false);
    setReply(null);
  }, [boardKey]);
  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
    },
    [],
  );
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
  async function ask(text: string) {
    if (pending) return;
    const context: CoachContext = {
      mission: id,
      wires: p.wires,
      material: p.material,
      phase: p.phase,
      prediction: p.prediction,
      faultPrediction: p.faultPrediction,
      hints: p.hints + 1,
      attempts: p.experiments.length,
      message: text,
    };
    onAction({ type: "HINT" });
    setPending(true);
    setReply(null);
    setAsking(false);
    setMessage("");
    const controller = new AbortController();
    request.current = controller;
    const token = ++generation.current;
    const timer = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
        signal: controller.signal,
      });
      const data = await response.json();
      if (
        !response.ok ||
        typeof data.text !== "string" ||
        !["live", "field-guide"].includes(data.source)
      )
        throw new Error("unavailable");
      if (generation.current === token) setReply(data);
    } catch {
      if (generation.current === token)
        setReply({
          text: fieldGuide(context),
          source: "field-guide",
          reason: "unavailable",
        });
    } finally {
      clearTimeout(timer);
      if (generation.current === token) setPending(false);
    }
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
      title={`${SITES[id].name} circuit`}
      className={`repair-dialog phase-${p.phase}`}
      onClose={onClose}
    >
      <div className="repair-heading">
        <span className="overline">
          {practice ? "FREE CIRCUIT" : `POWER SYSTEM ${mission.number}`}
        </span>
        <h1>{SITES[id].name}</h1>
        <span className="repair-close-hint">
          <kbd>Esc</kbd> Close panel
        </span>
      </div>
      <div className="repair-instruction" role="status">
        <Radio size={18} />
        <span>
          <small>PIP</small>
          <span>{instruction}</span>
        </span>
      </div>
      <div className="repair-layout">
        <CircuitBoard
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
        <span>
          {saved ? "" : "Saving unavailable · progress stays in this tab"}
        </span>
        <div>
          {guided && (
            <button className="text-button" onClick={() => onLesson(4)}>
              Skip guidance
            </button>
          )}
          <button
            className="text-button"
            disabled={pending}
            onClick={() => void ask("")}
          >
            <Lightbulb size={15} /> Hint
          </button>
          <button
            className="text-button"
            disabled={pending}
            onClick={() => setAsking(true)}
          >
            <MessageCircle size={15} /> Ask Pip
          </button>
        </div>
      </footer>
      {(asking || pending || reply) && (
        <aside className="pip-radio" aria-label="Pip’s radio">
          <button
            className="icon-button"
            aria-label="Close Pip’s radio"
            onClick={() => {
              setAsking(false);
              setReply(null);
              generation.current++;
              request.current?.abort();
              setPending(false);
            }}
          >
            <X size={17} />
          </button>
          {pending && <p role="status">Pip is thinking…</p>}
          {reply && (
            <div role="status">
              <span className="overline">
                {reply.source === "live"
                  ? "PIP · LIVE COACH"
                  : "PIP · FIELD GUIDE"}
              </span>
              <p>{replyPages[replyPage] ?? replyPages[0]}</p>
              {replyPages.length > 1 && (
                <div className="radio-pagination">
                  <button
                    aria-label="Previous radio page"
                    disabled={replyPage === 0}
                    onClick={() => setReplyPage(replyPage - 1)}
                  >
                    ←
                  </button>
                  <span>
                    {replyPage + 1} / {replyPages.length}
                  </span>
                  <button
                    aria-label="Next radio page"
                    disabled={replyPage === replyPages.length - 1}
                    onClick={() => setReplyPage(replyPage + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
          {asking && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) void ask(message.trim());
              }}
            >
              <label htmlFor="pip-question">What are you thinking?</label>
              <input
                id="pip-question"
                autoFocus
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                className="text-button"
                type="submit"
                disabled={!message.trim()}
              >
                Send <Send size={15} />
              </button>
            </form>
          )}
        </aside>
      )}
    </Dialog>
  );
}
