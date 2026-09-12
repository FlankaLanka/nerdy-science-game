import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, Maximize, Pause, Radio } from "lucide-react";
import {
  currentMission,
  initialProgress,
  reducer,
  restoreState,
  SAVE_KEY,
  updateProgress,
} from "./campaign";
import type { Progress } from "./campaign";
import { ACTIVITY_IDS, activity, isLab, available } from "./activities";
import type { ActivityId as MissionId } from "./activities";
import { LabWorkbench } from "./LabWorkbench";
import { updateLab } from "./labPhysics";
import type { LabProgress } from "./labPhysics";
import type { WorldHandle } from "./World";
import { SITES } from "./scene/navigation";
import { Workbench } from "./Workbench";
import { Notebook } from "./Notebook";
import { Dialog } from "./Dialog";
import { useSound } from "./audio";
import { GameViewport } from "./GameViewport";
import { prepareInterface } from "./interfaceAssets";
import { ShipMap } from "./ShipMap";
import type { Player } from "./scene/navigation";
import { SHIP_SYSTEMS, SHIP_TUNING } from "./shipSystems";

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
      return restoreState(
        localStorage.getItem(SAVE_KEY) ??
          localStorage.getItem("signal.dead-orbit.v1"),
      );
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
  const [labPractice, setLabPractice] = useState<LabProgress | null>(null);
  const [practice, setPractice] = useState<Progress | null>(null),
    [saved, setSaved] = useState(true),
    [page, setPage] = useState(0);
  const [effect, setEffect] = useState<{
    id: number;
    kind: "boot" | "restore";
    mission?: MissionId;
  } | null>(null);
  useEffect(() => {
    if (!effect) return;
    const timer = setTimeout(
      () => setEffect(null),
      effect.kind === "restore"
        ? SHIP_TUNING.restorationNoticeMs
        : SHIP_TUNING.bootNoticeMs,
    );
    return () => clearTimeout(timer);
  }, [effect]);
  const [subtitle, setSubtitle] = useState(""),
    [sensitivity, setSensitivity] = useState(1);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [displayNotice, setDisplayNotice] = useState("");
  const [mapPlayer, setMapPlayer] = useState<Player | null>(null);
  const [transmitting, setTransmitting] = useState(false);
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
    allDone = state.completed.length === ACTIVITY_IDS.length;
  const panelId = active ?? next;
  const basicPanel = isLab(panelId) ? "workshop" : panelId;
  const blocked = activity(panelId)
    .prerequisites.filter((id) => !state.completed.includes(id))
    .map((id) => activity(id).system)
    .join(" + ");
  const arrived = ready && kitReady && interfaceReady;
  const reducedMotion = state.reducedMotion || systemMotion;
  const playing = running && !menu && !active && !failed;
  useEffect(() => {
    if (!transmitting) return;
    if (!allDone || state.distressSent) {
      setTransmitting(false);
      return;
    }
    const timer = setTimeout(() => {
      dispatch({ type: "SEND_DISTRESS" });
      setTransmitting(false);
      sound.play("success");
    }, SHIP_TUNING.transmissionMs);
    return () => clearTimeout(timer);
  }, [transmitting, allDone, state.distressSent]);
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
    setEffect({ id: Date.now(), kind: "boot" });
    if (!state.started) {
      dispatch({ type: "START" });
      dispatch({ type: "INTRO", step: 3 });
      setSubtitle("The lights are out. Try the console ahead.");
    }
    resume();
  }
  function closePanel() {
    setActive(null);
    setPractice(null);
    setLabPractice(null);
    sound.play("soft");
    if (!failed) resume();
  }
  function visit(id: MissionId) {
    dispatch({ type: "VISIT", id });
    world.current?.release();
    setRunning(false);
    if (id === "beacon" && allDone && !state.distressSent) {
      setMenu("ending");
      return;
    }
    setActive(id);
    if (isLab(id) && state.completed.includes(id))
      setLabPractice(structuredClone(state.labs[id]));
    setSubtitle("");
    if (!isLab(id) && state.completed.includes(id))
      setPractice({
        ...initialProgress(),
        wires: structuredClone(state.missions[id].wires),
        material: state.missions[id].material,
      });
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
    const newlyRestored = !practice && !state.completed.includes(id);
    if (newlyRestored && !available(id, state.completed)) return;
    if (newlyRestored) dispatch({ type: "COMPLETE", id, now: Date.now() });
    setActive(null);
    setPractice(null);
    setLabPractice(null);
    sound.play(newlyRestored || practice ? "success" : "soft");
    if (newlyRestored)
      setEffect({ id: Date.now(), kind: "restore", mission: id });
    if (id === "beacon" && !practice && !allDone) {
      setRunning(false);
      setMenu("ending");
    } else {
      setSubtitle(
        practice
          ? "Experiment recorded. The commissioned station remains online."
          : activity(id).restored,
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
        {interfaceReady && !failed && (
          <Suspense fallback={null}>
            <World
              preview={!entered}
              distressSent={state.distressSent}
              transmitting={transmitting}
              ref={world}
              playing={playing}
              completed={state.completed}
              reducedMotion={reducedMotion}
              sensitivity={sensitivity}
              tracked={state.tracked}
              onVisit={visit}
              onPause={() => openMenu("pause")}
              onReady={() => setReady(true)}
              onStep={() => sound.play("step")}
              onEnvironment={(event) => sound.play(event)}
              onScan={() => sound.play("soft")}
              onError={() => {
                setFailed(true);
                setReady(true);
                setRunning(false);
              }}
            />
          </Suspense>
        )}
        <div className="lens-vignette" aria-hidden="true" />
        <div className="visor-grid" aria-hidden="true" />
        {effect && (
          <div
            key={effect.id}
            className={`world-transition transition-${effect.kind}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <span>
              {effect.kind === "boot"
                ? "NEURAL LINK ESTABLISHED"
                : "SYSTEM RESTORED"}
            </span>
          </div>
        )}
        {effect?.kind === "restore" && effect.mission && playing && (
          <div className="recovery-notice" role="status">
            <span>
              SYSTEM COMMISSIONED / {SHIP_SYSTEMS[effect.mission].code}
            </span>
            <strong>{SHIP_SYSTEMS[effect.mission].restored}</strong>
          </div>
        )}
        {!entered && (
          <main className="title-overlay">
            <div className="title-topline">
              <span className="ship-wordmark">◈ ASTERION</span>
              <span>
                DECK 07 <i /> {allDone ? "SYSTEMS RESTORED" : "RESERVE POWER"}
              </span>
            </div>
            <div className="title-content">
              <div className="title-kicker">
                <span className="status-dot" /> DEEP SPACE RESEARCH VESSEL
              </div>
              <h1>
                SIGNAL<span>DEAD ORBIT</span>
              </h1>
              <p className="title-story">
                One ship. No contact.
                <br />
                You are the way back online.
              </p>
              <button
                className="title-play"
                disabled={!arrived}
                onClick={begin}
              >
                {!arrived
                  ? "Establishing uplink…"
                  : failed
                    ? "Play circuit puzzles"
                    : state.started
                      ? "Continue"
                      : "Board the Asterion"}
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
            <div className="title-manifest" aria-hidden="true">
              <span>EMERGENCY RECORD / AST–07</span>
              <p>
                Primary bus failure.
                <br />
                External communications lost.
              </p>
              <div>
                <i /> MANUAL RECOVERY REQUIRED
              </div>
              <svg viewBox="0 0 240 112">
                <path d="M8 78h28l8-28 12 52 12-73 12 49h47l8-14 9 14h85" />
                <path
                  className="manifest-baseline"
                  d="M8 28h224M8 103h224M8 3v105M232 3v105"
                />
              </svg>
              <small>Eight connected systems. Choose your route.</small>
            </div>
            <div
              className="title-systems"
              aria-label={`${state.completed.length} of 8 systems restored`}
            >
              {(["workshop", "power", "beacon"] as MissionId[]).map((id) => (
                <div
                  key={id}
                  className={state.completed.includes(id) ? "online" : ""}
                >
                  <span>{activity(id).code}</span>
                  <i />
                  <p>
                    {SITES[id].name}
                    <small>
                      {state.completed.includes(id) ? "ONLINE" : "OFFLINE"}
                    </small>
                  </p>
                </div>
              ))}
            </div>
            <span className="title-footer-code">
              VESSEL ID / AST–07 <b>•</b> MANUAL RECOVERY PROTOCOL
            </span>
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
                  3D graphics are unavailable. Continue the ship’s repairs here.
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
          open={!!active && !isLab(active)}
          onReady={() => setKitReady(true)}
          id={basicPanel}
          progress={practice ?? state.missions[basicPanel]}
          blocked={blocked}
          practice={!!practice}
          saved={saved}
          lesson={state.lesson}
          onLesson={(step) => dispatch({ type: "LESSON", step })}
          onAction={(action) =>
            practice
              ? setPractice((p) =>
                  p ? updateProgress(basicPanel, p, action) : p,
                )
              : dispatch({ type: "MISSION", id: basicPanel, action })
          }
          onClose={closePanel}
          onComplete={complete}
          play={sound.play}
        />
        {active && isLab(active) && (
          <LabWorkbench
            key={active}
            id={active}
            p={labPractice ?? state.labs[active]}
            onAction={(action) =>
              labPractice
                ? setLabPractice((p) => (p ? updateLab(active, p, action) : p))
                : dispatch({ type: "LAB", id: active, action })
            }
            onComplete={complete}
            onClose={closePanel}
            completed={state.completed.includes(active)}
            blocked={blocked}
            play={sound.play}
          />
        )}
        {menu === "pause" && (
          <Dialog title="Paused" className="pause-dialog" onClose={resume}>
            <h2>Paused</h2>
            <nav className="pause-menu" aria-label="Pause menu">
              <button className="selected" onClick={resume}>
                Resume
                <ArrowRight size={18} />
              </button>
              <button onClick={() => setMenu("map")}>
                Deck map <kbd>M</kbd>
              </button>
              <button onClick={() => setMenu("journal")}>
                Mission log <kbd>J</kbd>
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
          <ShipMap
            state={state}
            player={failed ? null : mapPlayer}
            onClose={back}
            onTrack={(id) => {
              dispatch({ type: "TRACK", id });
              resume();
            }}
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
            <h2>Ship settings</h2>
            <label className="setting">
              <span>
                <span className="setting-copy">
                  Sound<small>Ship ambience, footsteps & equipment</small>
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
                Reduce motion
                <small>
                  {systemMotion
                    ? "Your device prefers a steady view"
                    : "Steady camera and minimal visual effects"}
                </small>
              </span>
              <input
                type="checkbox"
                aria-label="Reduce motion"
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
                <small>Let the ship fill the view</small>
              </span>
              <span className="setting-mark">↗</span>
            </button>
            <button
              className="setting"
              aria-label="Return to Engineering"
              onClick={() => {
                world.current?.reset();
                setSubtitle("Back on the engineering deck.");
                resume();
              }}
            >
              <span className="setting-copy">
                Return to Engineering
                <small>Return safely to the starting compartment</small>
              </span>
              <span className="setting-mark">↶</span>
            </button>
            <button className="text-button" onClick={() => setMenu("reset")}>
              Start a new adventure
            </button>
            <a
              className="text-button asset-credits"
              href="/credits.html"
              target="_blank"
              rel="noreferrer"
            >
              Asset credits ↗
            </a>
          </Dialog>
        )}
        {menu === "controls" && (
          <Dialog title="Controls" onClose={back} className="controls-dialog">
            <h2>Flight controls</h2>
            <dl className="control-list">
              <div>
                <dt>Move through the ship</dt>
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
                <dt>Deck map / mission log</dt>
                <dd>M / J</dd>
              </div>
              <div>
                <dt>Ship systems</dt>
                <dd>Q</dd>
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
            <span className="eyebrow">
              ASTERION / LONG-RANGE COMMUNICATIONS
            </span>
            <div
              className={`rescue-radio ${state.distressSent || transmitting ? "transmitting" : ""}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 240 100">
                <g transform="translate(120 50)">
                  <circle className="signal-orbit" r="42" />
                  <circle r="29" />
                  <path d="M-52 0h30m44 0h30M0-50v28m0 44v28" />
                  <path d="M0-17 14 8 0 3-14 8Z" />
                  <circle className="signal-pulse" r="18" />
                </g>
              </svg>
            </div>
            <h2>
              {state.distressSent
                ? "Signal received."
                : transmitting
                  ? "Reaching beyond the orbit."
                  : "Transmitter online."}
            </h2>
            <p className="rescue-message">
              {state.distressSent
                ? "“Asterion, this is Rescue Control. Your coordinates are locked. Hold position. We’re coming to get you.”"
                : transmitting
                  ? "Carrier acquired. Sending vessel identity and position through the independent backup channel."
                  : "Eight systems restored. One way home. Your distress transmitter is ready to reach beyond this orbit."}
            </p>
            <div
              className={`transmission-strip ${transmitting ? "sending" : state.distressSent ? "acknowledged" : ""}`}
              role="status"
            >
              <span>
                {state.distressSent
                  ? "RESCUE CONTROL / ACKNOWLEDGED"
                  : transmitting
                    ? "COM–08 / TRANSMITTING COORDINATES"
                    : "COM–08 / BACKUP CHANNEL VERIFIED"}
              </span>
              <div>
                <i />
              </div>
            </div>
            {state.distressSent ? (
              <button className="primary-action" onClick={resume}>
                Keep exploring
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="primary-action"
                disabled={transmitting}
                onClick={() => {
                  setTransmitting(true);
                  sound.play("signal");
                }}
              >
                {transmitting
                  ? "Sending coordinates…"
                  : "Transmit distress signal"}
                <Radio size={18} />
              </button>
            )}
            <button
              className="text-button"
              onClick={() => {
                setPage(7);
                setMenu("journal");
              }}
            >
              Open mission log
            </button>
          </Dialog>
        )}
      </div>
    </GameViewport>
  );
}
