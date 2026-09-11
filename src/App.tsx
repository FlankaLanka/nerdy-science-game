import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Maximize,
  Pause,
  Radio,
  Volume2,
} from "lucide-react";
import {
  currentMission,
  initialProgress,
  reducer,
  restoreState,
  SAVE_KEY,
  updateProgress,
} from "./game";
import type { Progress } from "./game";
import { MISSIONS } from "./missions";
import type { MissionId } from "./missions";
import type { WorldHandle } from "./World";
import { SITES } from "./scene/navigation";
import { Workbench } from "./Workbench";
import { Notebook } from "./Notebook";
import { Dialog } from "./Dialog";
import { useSound } from "./audio";
import { GameViewport } from "./GameViewport";
import { prepareInterface } from "./interfaceAssets";

const World = lazy(() => import("./World"));
type Menu =
  | "pause"
  | "map"
  | "journal"
  | "settings"
  | "controls"
  | "reset"
  | "ending"
  | null;

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      return restoreState(localStorage.getItem(SAVE_KEY));
    } catch {
      return restoreState(null);
    }
  });
  const [running, setRunning] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [kitReady, setKitReady] = useState(false);
  const [interfaceReady, setInterfaceReady] = useState(false);
  useEffect(() => {
    let canceled = false;
    void prepareInterface().then(() => {
      if (!canceled) setInterfaceReady(true);
    });
    return () => {
      canceled = true;
    };
  }, []);
  const [entered, setEntered] = useState(false),
    [menu, setMenu] = useState<Menu>(null),
    [active, setActive] = useState<MissionId | null>(null);
  const [practice, setPractice] = useState<Progress | null>(null),
    [saved, setSaved] = useState(true),
    [page, setPage] = useState(0);
  const [subtitle, setSubtitle] = useState(""),
    [sensitivity, setSensitivity] = useState(1);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [displayNotice, setDisplayNotice] = useState("");
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else throw new Error("unavailable");
      setDisplayNotice("");
    } catch {
      setDisplayNotice(
        "Fullscreen is unavailable here. Use your browser’s fullscreen command.",
      );
    }
  }
  const [systemMotion, setSystemMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const world = useRef<WorldHandle>(null),
    sound = useSound(state.sound);
  const next = currentMission(state),
    allDone = state.completed.length === 3;
  const panelId = active ?? next;
  const arrived = ready && kitReady && interfaceReady;
  const reducedMotion = state.reducedMotion || systemMotion;
  const playing = running && !menu && !active && !failed;
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [state]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setSystemMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? "reduce" : "full";
  }, [reducedMotion]);
  useEffect(() => {
    if (!subtitle) return;
    const timer = setTimeout(() => setSubtitle(""), 8500);
    return () => clearTimeout(timer);
  }, [subtitle]);
  function openMenu(value: Menu) {
    world.current?.release();
    setRunning(false);
    setMenu(value);
    sound.play("soft");
  }
  function resume() {
    setEntered(true);
    setMenu(null);
    setRunning(true);
    sound.unlock();
    world.current?.capture();
  }
  function begin() {
    if (!state.started) {
      dispatch({ type: "START" });
      dispatch({ type: "INTRO", step: 3 });
      setSubtitle(
        "You’re awake. Good. The storm took out our power. Let’s try the workshop.",
      );
    }
    resume();
  }
  function closePanel() {
    setActive(null);
    setPractice(null);
    sound.play("soft");
    if (!failed) resume();
  }
  function visit(id: MissionId) {
    if (!state.completed.includes(id) && id !== next) {
      setSubtitle(
        `This line is dead. We need to repair the ${next === "workshop" ? "workshop" : "harbor"} first.`,
      );
      return;
    }
    world.current?.release();
    setRunning(false);
    setActive(id);
    setSubtitle("");
    if (id === "beacon" && allDone) setPractice(initialProgress());
    if (id === "workshop" && state.lesson === 0)
      dispatch({
        type: "LESSON",
        step: state.missions.workshop.wires.length ? 2 : 1,
      });
    sound.play("connect");
  }
  function complete() {
    if (!active) return;
    const id = active;
    if (!practice && !state.completed.includes(id))
      dispatch({ type: "COMPLETE", id, now: Date.now() });
    setActive(null);
    setPractice(null);
    sound.play("success");
    if (id === "beacon" && !practice && !allDone) {
      setRunning(false);
      setMenu("ending");
    } else {
      setSubtitle(
        practice
          ? "Another working route. Nicely done."
          : id === "workshop"
            ? "There it is. Follow the path to the harbor. Two more lights to bring back."
            : id === "harbor"
              ? "The harbor is alive. Head uphill. The lighthouse needs a circuit that can survive a broken lamp."
              : "The power is holding.",
      );
      if (!failed) resume();
    }
  }
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.code === "KeyF") {
        e.preventDefault();
        if (!e.repeat) void toggleFullscreen();
        return;
      }
      if (!entered || active || menu) return;
      if (e.code === "Escape") {
        e.preventDefault();
        openMenu("pause");
      }
      if (e.code === "KeyM" || e.code === "KeyJ" || e.code === "Tab") {
        e.preventDefault();
        openMenu(
          e.code === "KeyM" ? "map" : e.code === "KeyJ" ? "journal" : "pause",
        );
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  });
  function back() {
    setMenu("pause");
  }
  return (
    <GameViewport>
      <div
        className={`game ${active ? "inspecting" : ""} ${!entered ? "title-screen" : ""}`}
      >
        {!failed && (
          <Suspense fallback={null}>
            <World
              ref={world}
              playing={playing}
              completed={state.completed}
              reducedMotion={reducedMotion}
              sensitivity={sensitivity}
              onVisit={visit}
              onPause={() => openMenu("pause")}
              onReady={() => setReady(true)}
              onStep={() => sound.play("step")}
              onError={() => {
                setFailed(true);
                setReady(true);
                setRunning(false);
              }}
            />
          </Suspense>
        )}
        <div className="lens-vignette" aria-hidden="true" />
        {!entered && (
          <main className="title-overlay">
            <div className="title-content">
              <h1>
                SIGNAL<span>THE LAST LIGHTHOUSE</span>
              </h1>
              <button
                className="title-play"
                disabled={!arrived}
                onClick={begin}
              >
                {!arrived
                  ? "Arriving on the island…"
                  : failed
                    ? "Play circuit puzzles"
                    : state.started
                      ? "Continue"
                      : "Enter the island"}
                <ArrowRight size={20} />
              </button>
              <button
                className="title-fullscreen"
                onClick={() => void toggleFullscreen()}
              >
                <kbd>F</kbd>
                <Maximize size={17} />
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
              {failed && (
                <p className="graphics-notice">
                  3D graphics are unavailable in this browser. Circuit puzzles
                  still work.
                </p>
              )}
            </div>
            {displayNotice && (
              <p className="display-notice" role="status">
                {displayNotice}
              </p>
            )}
          </main>
        )}
        {entered && !active && !menu && (
          <>
            <button
              className="pause-trigger"
              aria-label="Pause game"
              onClick={() => openMenu("pause")}
            >
              <Pause size={16} />
              <kbd>Esc</kbd>
            </button>
            {subtitle && (
              <div className="radio-subtitle" role="status">
                <Radio size={17} />
                <span>{subtitle}</span>
              </div>
            )}
            {failed && (
              <main className="graphics-fallback">
                <h1>Circuit mode</h1>
                <p>
                  3D graphics are unavailable. Continue the island’s repairs
                  here.
                </p>
                <button className="primary-action" onClick={() => visit(next)}>
                  {allDone
                    ? "Try another circuit"
                    : `Repair ${SITES[next].name}`}
                  <ArrowRight size={17} />
                </button>
              </main>
            )}
          </>
        )}
        <Workbench
          open={!!active}
          onReady={() => setKitReady(true)}
          id={panelId}
          progress={practice ?? state.missions[panelId]}
          practice={!!practice}
          saved={saved}
          lesson={state.lesson}
          onLesson={(step) => dispatch({ type: "LESSON", step })}
          onAction={(action) =>
            practice
              ? setPractice((p) => (p ? updateProgress(panelId, p, action) : p))
              : dispatch({ type: "MISSION", id: panelId, action })
          }
          onClose={closePanel}
          onComplete={complete}
          play={sound.play}
        />
        {menu === "pause" && (
          <Dialog title="Paused" className="pause-dialog" onClose={resume}>
            <h2>Paused</h2>
            <nav className="pause-menu" aria-label="Pause menu">
              <button className="selected" onClick={resume}>
                Resume
                <ArrowRight size={18} />
              </button>
              <button onClick={() => setMenu("map")}>
                Island map <kbd>M</kbd>
              </button>
              <button onClick={() => setMenu("journal")}>
                Field notes <kbd>J</kbd>
              </button>
              <button onClick={() => setMenu("settings")}>Settings</button>
              <button onClick={() => setMenu("controls")}>Controls</button>
              <button onClick={() => void toggleFullscreen()}>
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
                <kbd>F</kbd>
              </button>
            </nav>
            {!saved && (
              <p className="save-status" role="status">
                Saving unavailable. Progress stays in this tab.
              </p>
            )}
            {displayNotice && (
              <p className="display-notice" role="status">
                {displayNotice}
              </p>
            )}
          </Dialog>
        )}
        {menu === "map" && (
          <Dialog title="Island map" className="map-dialog" onClose={back}>
            <header className="screen-heading">
              <h2>ISLAND MAP</h2>
            </header>
            <div className="paper-map">
              <img
                src="/art/keepers-map.webp"
                width="1536"
                height="1024"
                alt="The keeper’s illustrated island map: workshop to the west, harbor to the east, lighthouse to the north."
              />
              <ol className="map-stops">
                {MISSIONS.map((m) => (
                  <li
                    key={m.id}
                    aria-current={
                      m.id === next && !allDone ? "step" : undefined
                    }
                    className={
                      state.completed.includes(m.id)
                        ? "done"
                        : m.id === next
                          ? "current"
                          : ""
                    }
                  >
                    <span>
                      {state.completed.includes(m.id) ? (
                        <Check size={15} />
                      ) : (
                        m.number
                      )}
                    </span>
                    {SITES[m.id].name}
                  </li>
                ))}
              </ol>
            </div>
          </Dialog>
        )}
        {menu === "journal" && (
          <Notebook
            state={state}
            page={page}
            onPage={setPage}
            onNote={(text) => dispatch({ type: "NOTE", text })}
            onClose={back}
          />
        )}
        {menu === "settings" && (
          <Dialog title="Settings" onClose={back} className="settings-dialog">
            <h2>Settings</h2>
            <label className="setting">
              <span>
                <Volume2 size={17} /> Sound
              </span>
              <input
                type="checkbox"
                checked={state.sound}
                onChange={() => dispatch({ type: "SOUND" })}
              />
            </label>
            <label className="setting">
              <span>Reduce camera motion</span>
              <input
                type="checkbox"
                checked={reducedMotion}
                disabled={systemMotion}
                onChange={() => dispatch({ type: "MOTION" })}
              />
            </label>
            <label className="setting">
              <span>Look sensitivity</span>
              <input
                type="range"
                min="0.4"
                max="2"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
            </label>
            <button className="setting" onClick={() => void toggleFullscreen()}>
              <span>
                <Maximize size={17} />{" "}
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </span>
            </button>
            <button
              className="setting"
              onClick={() => {
                world.current?.reset();
                setSubtitle("Back at the workshop path.");
                resume();
              }}
            >
              Return to the path
            </button>
            <button className="text-button" onClick={() => setMenu("reset")}>
              Start a new adventure
            </button>
          </Dialog>
        )}
        {menu === "controls" && (
          <Dialog title="Controls" onClose={back} className="controls-dialog">
            <h2>Controls</h2>
            <dl className="control-list">
              <div>
                <dt>Move</dt>
                <dd>W A S D / ↑ ↓</dd>
              </div>
              <div>
                <dt>Look</dt>
                <dd>Mouse / ← → / Page Up & Down</dd>
              </div>
              <div>
                <dt>Run</dt>
                <dd>Shift</dd>
              </div>
              <div>
                <dt>Interact</dt>
                <dd>E, when close to a cabinet</dd>
              </div>
              <div>
                <dt>Pause / release mouse</dt>
                <dd>Esc / Tab</dd>
              </div>
              <div>
                <dt>Map / journal</dt>
                <dd>M / J</dd>
              </div>
              <div>
                <dt>Fullscreen</dt>
                <dd>F</dd>
              </div>
            </dl>
            <p className="control-note">
              Drag to look if the mouse is unlocked. On touch screens, use the
              left thumbstick to move.
            </p>
            <p className="control-note">
              Select two sockets to wire them. Select a wire to remove it.
            </p>
          </Dialog>
        )}
        {menu === "reset" && (
          <Dialog
            title="New adventure"
            onClose={back}
            className="confirm-dialog"
          >
            <h2>Begin again?</h2>
            <p>
              This clears your repairs, discoveries, and notes on this device.
            </p>
            <div className="dialog-actions">
              <button className="text-button" onClick={back}>
                Keep exploring
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  dispatch({ type: "RESET" });
                  world.current?.reset();
                  setMenu(null);
                  setEntered(false);
                  setRunning(false);
                  setSubtitle("");
                }}
              >
                Start new adventure
              </button>
            </div>
          </Dialog>
        )}
        {menu === "ending" && (
          <Dialog
            title="Signal restored"
            className="ending-dialog"
            onClose={resume}
          >
            <h2>
              Someone out there
              <br />
              can see us now.
            </h2>
            <p>The lighthouse holds. Even when one lamp fails.</p>
            <button className="primary-action" onClick={resume}>
              Keep exploring
              <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setPage(2);
                setMenu("journal");
              }}
            >
              Open field notes
            </button>
          </Dialog>
        )}
      </div>
    </GameViewport>
  );
}
