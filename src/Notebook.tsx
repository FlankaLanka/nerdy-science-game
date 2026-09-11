import { ArrowLeft, ArrowRight, Download, Check } from "lucide-react";
import { MISSIONS } from "./missions";
import type { GameState } from "./game";
import { Dialog } from "./Dialog";

function Sketch({ page }: { page: number }) {
  return (
    <svg
      className="notebook-sketch"
      viewBox="0 0 300 180"
      role="img"
      aria-label={
        page === 2
          ? "Two lamp branches across the battery"
          : page === 1
            ? "Two lamps along a single loop"
            : "A lamp in a complete loop"
      }
    >
      <g
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M40 72V42H126M40 109v33h86M24 80h32M30 97h20M156 42h91v100H156" />
        <circle cx="141" cy="42" r="15" />
        <path d="m132 33 18 18m0-18-18 18" />
        {page === 1 ? (
          <>
            <circle cx="141" cy="142" r="15" />
            <path d="m132 133 18 18m0-18-18 18" />
          </>
        ) : (
          <path d="M126 142h30" />
        )}
        {page === 2 && (
          <>
            <path d="M90 42v53h36M156 95h91" />
            <circle cx="141" cy="95" r="15" />
            <path d="m132 86 18 18m0-18-18 18" />
          </>
        )}
      </g>
    </svg>
  );
}

export function Notebook({
  state,
  page,
  onPage,
  onNote,
  onClose,
}: {
  state: GameState;
  page: number;
  onPage: (page: number) => void;
  onNote: (text: string) => void;
  onClose: () => void;
}) {
  const mission = MISSIONS[page],
    progress = state.missions[mission.id],
    done = state.completed.includes(mission.id);
  const first = progress.experiments[0],
    fault = progress.experiments.find((e) => e.type === "fault");
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            game: "SIGNAL",
            exportedAt: new Date().toISOString(),
            completed: state.completed,
            note: state.note,
            experiments: Object.fromEntries(
              MISSIONS.map((m) => [
                m.id,
                {
                  experiments: state.missions[m.id].experiments,
                  firstExplanation: state.missions[m.id].firstExplanation,
                  hints: state.missions[m.id].hints,
                },
              ]),
            ),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "signal-field-notes.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog title="Notebook" onClose={onClose} className="notebook-dialog">
      <header className="screen-heading">
        <h2>FIELD NOTES</h2>
      </header>
      <nav className="archive-tabs" aria-label="Discoveries">
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            aria-pressed={page === i}
            onClick={() => onPage(i)}
          >
            <span>{m.number}</span>
            {m.place.replace("The ", "")}
            {state.completed.includes(m.id) && <Check size={16} />}
          </button>
        ))}
      </nav>
      <div className="archive-content">
        <div className={`archive-diagram ${done ? "restored" : ""}`}>
          <Sketch page={page} />
          <span className="diagram-label">
            {["COMPLETE LOOP", "SERIES CIRCUIT", "PARALLEL CIRCUIT"][page]}
          </span>
        </div>
        <div className="archive-record">
          <h3>{done ? mission.discovery : "A light waiting to return."}</h3>
          <p className="notebook-evidence">
            {done
              ? mission.evidence
              : "Explore the island and restore this circuit to record your discovery."}
          </p>
          <div className="archive-stats">
            <span>
              <strong>{progress.experiments.length}</strong> EXPERIMENTS
            </span>
            <span>
              <strong>{progress.hints}</strong> HINTS
            </span>
          </div>
          {done && (
            <div className="evidence-log">
              {first && (
                <p>
                  Your first prediction{" "}
                  {first.matched
                    ? "matched the result"
                    : "differed from the result"}
                  .
                </p>
              )}
              {fault && (
                <p>
                  Before disconnecting A, you expected B to{" "}
                  {fault.prediction === "stays" ? "stay on" : "go out"}. B{" "}
                  {fault.outcome === "stays" ? "stayed on" : "went out"}.
                </p>
              )}
              {progress.firstExplanation && (
                <p>
                  Your first explanation{" "}
                  {progress.firstExplanation === mission.answer
                    ? "fit the observation"
                    : "needed another look at the evidence"}
                  .
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <label className="personal-note" htmlFor="personal-note">
        A note to yourself
        <input
          id="personal-note"
          value={state.note}
          maxLength={1500}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Record a discovery…"
        />
      </label>
      <div className="notebook-pagination">
        <button
          className="icon-button"
          aria-label="Previous discovery"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          <ArrowLeft size={18} />
        </button>
        <span>{page + 1} / 3</span>
        <button
          className="icon-button"
          aria-label="Next discovery"
          disabled={page === 2}
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={18} />
        </button>
      </div>
      <button className="archive-export text-button" onClick={download}>
        <Download size={16} /> Keep a copy
      </button>
    </Dialog>
  );
}
