import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, Maximize, Pause, Radio } from "lucide-react";
import {
  currentMission,
  initialProgress,
  reducer,
  restoreState,
  SAVE_KEY,
  updateProgress,
} from "./game";
import type { Progress } from "./game";
import type { MissionId } from "./missions";
import type { WorldHandle } from "./World";
import { SITES } from "./scene/navigation";
import { Workbench } from "./Workbench";
import { Notebook } from "./Notebook";
import { Dialog } from "./Dialog";
import { useSound } from "./audio";
import { GameViewport } from "./GameViewport";
import { prepareInterface } from "./interfaceAssets";
import { IslandMap } from "./IslandMap";
import type { Player } from "./scene/navigation";

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
  const [mapPlayer, setMapPlayer] = useState<Player | null>(null);
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
    setMapPlayer(world.current?.position() ?? null);
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
        "The storm cut the power. Get the lighthouse radio working so we can call for help. Start at the workshop.",
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
    if (id === "beacon" && allDone && !state.distressSent) {
      setMenu("ending");
      return;
    }
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
            ? "The supply is back. Follow the coastal path to the harbor relay."
            : id === "harbor"
              ? "Power is reaching North Point. Head uphill and repair the lighthouse radio’s supply."
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
              distressSent={state.distressSent}
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
          <IslandMap
            state={state}
            player={failed ? null : mapPlayer}
            onClose={back}
          />
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
            <h2>Field settings</h2>
            <label className="setting">
              <span>
                <span className="setting-copy">
                  Sound<small>Waves, footsteps & equipment</small>
                </span>
              </span>
              <input
                type="checkbox"
                aria-label="Sound"
                checked={state.sound}
                onChange={() => dispatch({ type: "SOUND" })}
              />
            </label>
            <label className="setting">
              <span className="setting-copy">
                Reduce camera motion
                <small>
                  {systemMotion
                    ? "Your device prefers a steady view"
                    : "A steady view on the island paths"}
                </small>
              </span>
              <input
                type="checkbox"
                aria-label="Reduce camera motion"
                checked={reducedMotion}
                disabled={systemMotion}
                onChange={() => dispatch({ type: "MOTION" })}
              />
            </label>
            <label className="setting">
              <span className="setting-copy">
                Look sensitivity<small>How quickly you turn</small>
              </span>
              <input
                type="range"
                aria-label="Look sensitivity"
                min="0.4"
                max="2"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
            </label>
            <button
              className="setting"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={() => void toggleFullscreen()}
            >
              <span className="setting-copy">
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
                <small>Let the island fill the view</small>
              </span>
              <span className="setting-mark">↗</span>
            </button>
            <button
              className="setting"
              aria-label="Return to the path"
              onClick={() => {
                world.current?.reset();
                setSubtitle("Back at the workshop path.");
                resume();
              }}
            >
              <span className="setting-copy">
                Return to the path
                <small>Find your footing by the workshop</small>
              </span>
              <span className="setting-mark">↶</span>
            </button>
            <button className="text-button" onClick={() => setMenu("reset")}>
              Start a new adventure
            </button>
          </Dialog>
        )}
        {menu === "controls" && (
          <Dialog title="Controls" onClose={back} className="controls-dialog">
            <h2>Finding your feet</h2>
            <dl className="control-list">
              <div>
                <dt>Walk the island</dt>
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
                <dt>Use equipment</dt>
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
            <div className="rescue-radio" aria-hidden="true">
              <svg viewBox="0 0 240 100">
                <path d="M54 36h132v53H54zM71 48h53v25H71zM81 53v15m9-15v15m9-15v15m9-15v15M163 37l17-31M54 62H36m-9-12q-15 12 0 24m174-24q15 12 0 24" />
                <circle cx="153" cy="59" r="10" />
                <path d="M170 78h6m-21 0h6m-20 0h6" />
              </svg>
            </div>
            <h2>
              {state.distressSent
                ? "Help is on the way."
                : "The radio has power."}
            </h2>
            <p className="rescue-message">
              {state.distressSent
                ? "“Bramble Island, we have your position. Keep the lighthouse lit. We’re on our way.”"
                : "The lighthouse is shining. The radio is alive. Time to let someone know you’re here."}
            </p>
            {state.distressSent ? (
              <button className="primary-action" onClick={resume}>
                Keep exploring
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="primary-action"
                onClick={() => {
                  dispatch({ type: "SEND_DISTRESS" });
                  sound.play("signal");
                }}
              >
                Call for help
                <Radio size={18} />
              </button>
            )}
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
