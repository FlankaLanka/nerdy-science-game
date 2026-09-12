import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog } from "./Dialog";
import type { LabId } from "./activities";
import { ACTIVITIES, isLab } from "./activities";
import type { GameState } from "./campaign";
import { measure, rcAt } from "./labPhysics";
export function Notebook({
  state,
  page,
  onPage,
  onNote,
  onClose,
}: {
  state: GameState;
  page: number;
  onPage: (p: number) => void;
  onNote: (s: string) => void;
  onClose: () => void;
}) {
  const index = Math.min(page, ACTIVITIES.length - 1),
    a = ACTIVITIES[index],
    done = state.completed.includes(a.id);
  function download() {
    const file = new Blob(
      [
        JSON.stringify(
          {
            title: "Asterion circuit investigations",
            completed: state.completed,
            experiments: state.labs,
            circuits: state.missions,
            note: state.note,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asterion-investigations.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog
      title="Mission log"
      className="notebook-dialog science-log"
      onClose={onClose}
    >
      <header className="screen-heading">
        <div>
          <span className="eyebrow">ASTERION / ENGINEERING RECORD</span>
          <h2>Field observations</h2>
        </div>
        <button className="text-button" onClick={download}>
          <Download size={16} />
          Export data
        </button>
      </header>
      <div className="science-log-grid">
        <section>
          <span className="eyebrow">
            {a.code} · {done ? "COMMISSIONED" : "INVESTIGATION OPEN"}
          </span>
          <h3>{a.concept}</h3>
          <p>{a.purpose}</p>
          <div className="log-discovery">
            <span>MODEL TO TAKE WITH YOU</span>
            <p>{a.discovery}</p>
          </div>
          <span className="eyebrow">RECORDED EVIDENCE</span>
          {isLab(a.id) ? (
            <table>
              <thead>
                <tr>
                  <th>Trial</th>
                  <th>Measurement</th>
                </tr>
              </thead>
              <tbody>
                {state.labs[a.id].samples.slice(-5).map((s, i) => {
                  const r = measure(a.id as LabId, s.config);
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        {a.id === "timing"
                          ? `${rcAt(s.config, "discharge", s.start!, s.time!).voltage.toFixed(2)} V after ${s.time} s · ${s.config.capacitance} mF · ${s.config.resistance} Ω`
                          : a.id === "storage"
                            ? `${(r.capacitance * 1000).toFixed(1)} mF · ${r.energy.toFixed(2)} J · ${["series", "parallel", "single"][s.config.topology]}`
                            : `${r.current.toFixed(3)} A · ${r.voltage} V source`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>
              {state.missions[a.id].experiments.length} circuit tests recorded.{" "}
              {done
                ? "A working repair was verified."
                : "Visit the equipment to investigate."}
            </p>
          )}
          <nav className="log-pages">
            <button
              aria-label="Previous investigation"
              disabled={index === 0}
              onClick={() => onPage(index - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {index + 1} / {ACTIVITIES.length}
            </span>
            <button
              aria-label="Next investigation"
              disabled={index === ACTIVITIES.length - 1}
              onClick={() => onPage(index + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        </section>
        <aside>
          <span className="eyebrow">YOUR NOTES · OPTIONAL</span>
          <label htmlFor="field-notes">
            What changed, and what stayed the same?
          </label>
          <textarea
            id="field-notes"
            value={state.note}
            onChange={(e) => onNote(e.target.value)}
            maxLength={3000}
            placeholder="Record a useful comparison or a question to try next."
          />
          <p>
            Measurements are recorded automatically. Writing here is optional
            and never blocks a repair.
          </p>
        </aside>
      </div>
    </Dialog>
  );
}
