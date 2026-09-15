import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ChevronRight } from "lucide-react";
import {
  campaignReducer,
  completedIds,
  poweredIds,
  initialCampaign,
  restoreCampaign,
  SAVE_KEY,
  serializeCampaign,
} from "./chamberCampaign";
import { CHAMBERS } from "./chambers";
import type { ChamberId } from "./chambers";
import type { KitAction } from "./circuitKit";
import type { WorldHandle } from "./World";
import type { BenchView } from "./scene/benchView";
import { PLAYER_KEY, SPAWN } from "./scene/navigation";
import { roomAt } from "./scene/shipLayout";
import { STATION_DECK } from "./scene/stationLayout";
import { useSound } from "./audio";
import PauseMenu from "./PauseMenu";
import Notebook from "./Notebook";
import TitleScreen from "./TitleScreen";
import type { NotebookTab } from "./Notebook";
import { useReducedMotion } from "./useReducedMotion";
import "./game.css";
const World = lazy(() => import("./World"));
const CircuitLab = lazy(() => import("./CircuitLab"));
const GOD_MODE_KEY = "signal.asterion.god-mode";
function load() {
  try {
    return restoreCampaign(localStorage.getItem(SAVE_KEY));
  } catch {
    return initialCampaign();
  }
}
export default function App() {
  const [state, dispatch] = useReducer(campaignReducer, undefined, load);
  const [started, setStarted] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [active, setActive] = useState<number | null>(null),
    [room, setRoom] = useState(0),
    [menu, setMenu] = useState<"pause" | "notebook" | null>(null);
  const [section, setSection] = useState("Wake");
  const [godMode, setGodMode] = useState(() => {
    try {
      return sessionStorage.getItem(GOD_MODE_KEY) === "on";
    } catch {
      return false;
    }
  });
  const [benchView, setBenchView] = useState<BenchView | null>(null);
  const [tab, setTab] = useState<NotebookTab>("parts"),
    [storageFailed, setStorageFailed] = useState(false);
  const [subtitle, setSubtitle] = useState<{ id: string; text: string } | null>(
    null,
  );
  const world = useRef<WorldHandle>(null),
    sound = useSound(state.sound);
  const current = useRef({ state, active, menu, started, sound });
  current.current = { state, active, menu, started, sound };
  const subtitleTime = useRef(0),
    heard = useRef(new Set(state.heard)),
    transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = completedIds(state),
    playing = started && active === null && menu === null && benchView === null;
  const powered = useMemo(() => poweredIds(state), [state.rooms, state.proofs]);
  const firstUnpowered = CHAMBERS.findIndex(c => !powered.includes(c.id));
  const fallbackRoom = firstUnpowered < 0 ? 5 : firstUnpowered;
  const publicStation = section === "Arrival gallery" || STATION_DECK.some((r) => r.name === section);
  const reduced = useReducedMotion(state.reducedMotion);
  useEffect(() => {
    try {
      if (godMode) sessionStorage.setItem(GOD_MODE_KEY, "on");
      else sessionStorage.removeItem(GOD_MODE_KEY);
    } catch {
      /* The toggle still works when storage is unavailable. */
    }
  }, [godMode]);
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, serializeCampaign(state));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [state]);
  const speak = useCallback((id: string, text: string) => {
    if (heard.current.has(id)) return;
    heard.current.add(id);
    dispatch({ type: "HEARD", id });
    subtitleTime.current = Math.max(5500, text.split(" ").length * 340);
    setSubtitle({ id, text });
  }, []);
  useEffect(() => {
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        dt = now - previous;
      previous = now;
      if (!document.hidden && !current.current.menu) {
        subtitleTime.current -= dt;
        if (subtitleTime.current <= 0) setSubtitle(null);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);
  const leaveBench = useCallback(() => {
    if (transition.current) clearTimeout(transition.current);
    transition.current = null;
    setActive(null);
  }, []);
  const onRoom = useCallback(
    (index: number) => {
      setRoom(index);
      const c = CHAMBERS[index];
      if (!c) return;
      dispatch({ type: "VISIT", id: c.id });
      speak(`entry:${c.id}`, c.intro);
    },
    [speak],
  );
  const openBench = useCallback(
    (id: ChamberId) => {
      const index = CHAMBERS.findIndex((c) => c.id === id);
      if (index < 0) return;
      world.current?.release();
      setActive(index);
      setRoom(index);
      dispatch({ type: "VISIT", id });
      speak(`hint:${id}`, CHAMBERS[index].hint);
      current.current.sound.play("soft");
    },
    [speak],
  );
  const pause = useCallback(() => {
    if (!current.current.started) return;
    world.current?.release();
    setMenu("pause");
  }, []);
  const openNotebook = useCallback((nextTab: NotebookTab = "parts") => {
    world.current?.release();
    setTab(nextTab);
    current.current.sound.play("tablet-open");
    setMenu("notebook");
  }, []);
  function resume() {
    setMenu(null);
  }
  useEffect(() => {
    if (menu && transition.current) {
      clearTimeout(transition.current);
      transition.current = null;
    }
  }, [menu]);
  useEffect(() => {
    if (active !== null && !powered.includes(CHAMBERS[active].id) && transition.current) {
      clearTimeout(transition.current);
      transition.current = null;
    }
  }, [active, powered]);
  const previousProofs = useRef(state.proofs);
  useEffect(() => {
    const before = previousProofs.current;
    previousProofs.current = state.proofs;
    const index = state.proofs.findIndex((proof, i) => proof && !before[i]);
    if (index < 0) return;
    const c = CHAMBERS[index];
    current.current.sound.play("success");
    speak(`restore:${c.id}`, c.restored);
    if (current.current.active === index) {
      transition.current = setTimeout(() => {
        setActive(null);
        transition.current = null;
      }, 1600);
    }
  }, [state.proofs, speak]);
  useEffect(
    () => () => {
      if (transition.current) clearTimeout(transition.current);
    },
    [],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        !current.current.started ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat
      )
        return;
      if (window.document.querySelector("dialog[open]")) return;
      if (["KeyN", "KeyJ", "Tab", "KeyM"].includes(e.code)) {
        // Tab remains normal focus navigation while working at the bench.
        if (e.code === "Tab" && current.current.active !== null) return;
        e.preventDefault();
        openNotebook(e.code === "KeyM" ? "map" : "parts");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (current.current.active !== null) leaveBench();
        else pause();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [leaveBench, pause, openNotebook]);
  function begin() {
    if (!ready || started) return;
    setStarted(true);
    sound.unlock();
    sound.play("soft");
    if (failed) openBench(CHAMBERS[fallbackRoom].id);
    else {
      world.current?.capture();
      const player = world.current?.position();
      const index = player ? roomAt(player.x, player.z) : 0;
      if (index >= 0) onRoom(index);
    }
  }
  function action(action: KitAction) {
    if (active === null) return;
    if (state.proofs[active] && transition.current) {
      clearTimeout(transition.current);
      transition.current = null;
    }
    dispatch({ type: "EDIT", room: active, action });
    if (action.type === "wire") sound.play("connect");
    else if (action.type === "toggle") sound.play("test");
    else if (action.type !== "move") sound.play("soft");
  }
  function restart() {
    if (transition.current) clearTimeout(transition.current);
    transition.current = null;
    heard.current.clear();
    setSubtitle(null);
    dispatch({ type: "NEW_GAME" });
    try {
      localStorage.removeItem(PLAYER_KEY);
    } catch {
      /* Session play. */
    }
    world.current?.reset();
    setRoom(0);
    setSection("Wake");
    setGodMode(false);
    setActive(null);
    setMenu(null);
    setStarted(false);
  }
  return (
    <main
      className={`game ${started ? "has-started" : ""} ${reduced ? "reduced-motion" : ""}`}
    >
      <Suspense fallback={null}>
        <World
          ref={world}
          playing={playing && !failed}
          preview={!started}
          activeBench={failed ? null : active}
          onBenchView={setBenchView}
          completed={completed}
          powered={powered}
          godMode={godMode}
          circuits={state.rooms}
          reducedMotion={reduced}
          sensitivity={1}
          onVisit={openBench}
          onRoom={onRoom}
          onSection={setSection}
          onStation={() => {
            speak(
              "ending:commons",
              "Welcome to the main station. Circuits was just the beginning. Take your time; this place is yours to explore.",
            );
          }}
          onPause={pause}
          onReady={() => setReady(true)}
          onError={() => {
            setFailed(true);
            setBenchView(null);
            setReady(true);
          }}
          onStep={() => sound.play("step")}
          onEnvironment={(kind) => sound.play(kind)}
        />
      </Suspense>
      {!started && (
        <TitleScreen
          ready={ready}
          returning={state.visited.length > 0}
          onBegin={begin}
        />
      )}
      {started && active === null && (
        <header className="game-chrome">
          <span className="room-marker">
            {!publicStation && (
              <span className="hud-room-number">{CHAMBERS[room].number}</span>
            )}
            <span className="hud-room-name">{publicStation ? section : CHAMBERS[room]?.name ?? "Wake"}</span>
            {!publicStation && <i className={powered.includes(CHAMBERS[room].id) ? "powered" : ""} />}
            {godMode && <span className="dev-indicator" aria-label="God mode enabled">DEV</span>}
          </span>
        </header>
      )}
      {started && active !== null && (
        <Suspense
          fallback={
            <div className="bench-loading" aria-label="Opening circuit bench" />
          }
        >
          <CircuitLab
            key={active}
            chamber={CHAMBERS[active]}
            circuit={state.rooms[active]}
            restored={powered.includes(CHAMBERS[active].id)}
            canUndo={!!state.history[active].length}
            reducedMotion={reduced}
            world={failed ? null : world.current}
            view={benchView}
            suspended={menu !== null}
            onAction={action}
            onUndo={() => dispatch({ type: "UNDO", room: active })}
            onReset={() => dispatch({ type: "RESET_CIRCUIT", room: active })}
            onBack={leaveBench}
            onNotebook={() => openNotebook()}
          />
        </Suspense>
      )}
      {started && subtitle && !menu &&
        (active === null || subtitle.id !== `hint:${CHAMBERS[active].id}`) && (
        <div className="narration" role="status">
          <span>ASTER</span>
          <p key={subtitle.id}>{subtitle.text}</p>
        </div>
      )}
      {started && failed && active === null && (
        <div className="fallback-navigation">
          <p>3D view unavailable. The circuit kit is ready.</p>
          <button
            onClick={() =>
              openBench(CHAMBERS[fallbackRoom].id)
            }
          >
            Chamber {CHAMBERS[fallbackRoom].number}
            <ChevronRight />
          </button>
        </div>
      )}
      {storageFailed && (
        <span
          className="save-indicator"
          role="status"
          title="Storage unavailable. This run cannot be saved."
          aria-label="Storage unavailable. This run cannot be saved."
        >
          !
        </span>
      )}
      {menu === "notebook" && (
        <Notebook
          state={state}
          tab={tab}
          onTab={setTab}
          onClose={resume}
          current={room}
          player={world.current?.position() ?? SPAWN}
          reducedMotion={reduced}
          onSound={sound.play}
        />
      )}
      {menu === "pause" && (
        <PauseMenu
          sound={state.sound}
          reducedMotion={reduced}
          godMode={godMode}
          onResume={resume}
          onNotebook={() => openNotebook()}
          onSound={() => dispatch({ type: "SOUND" })}
          onMotion={() => dispatch({ type: "MOTION" })}
          onGodMode={() => setGodMode((enabled) => !enabled)}
          onRestart={restart}
        />
      )}
    </main>
  );
}
