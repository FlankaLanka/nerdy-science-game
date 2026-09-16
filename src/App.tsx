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
import { Check, ChevronRight } from "lucide-react";
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
import type { ChamberId, FormulaId } from "./chambers";
import type { KitAction } from "./circuitKit";
import type { WorldHandle } from "./World";
import type { BenchView } from "./scene/benchView";
import type { FormulaView } from "./scene/formulaView";
import { FormulaReader } from "./FormulaReader";
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
import { useTandem } from "./useTandem";
import {
  circuitReaction,
  conversationLine,
  hintLine,
  roomLine,
  tandemMemoryId,
  TANDEM_SCRIPTS,
} from "./tandemDialogue";
import type { TandemScene } from "./tandemDialogue";
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
    [arriving, setArriving] = useState(false),
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
  const [activeFormula, setActiveFormula] = useState<number | null>(null);
  const [formulaView, setFormulaView] = useState<FormulaView | null>(null);
  const [cameraMoving, setCameraMoving] = useState(false);
  const [formulaNotice, setFormulaNotice] = useState<FormulaId | null>(null);
  const [tab, setTab] = useState<NotebookTab>("parts"),
    [storageFailed, setStorageFailed] = useState(false);
  const {
    cue: subtitle,
    say,
    clear: clearTandem,
    continueConversation,
  } = useTandem(
    state.heard,
    (id) => dispatch({ type: "HEARD", id }),
    menu !== null || !started || activeFormula !== null,
    state.sound,
  );
  const world = useRef<WorldHandle>(null),
    sound = useSound(
      state.sound,
      menu !== null || !started || subtitle !== null,
    );
  const current = useRef({
    state,
    active,
    activeFormula,
    room,
    section,
    menu,
    started,
    sound,
  });
  current.current = { state, active, activeFormula, room, section, menu, started, sound };
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrativeRoom = useRef(-1),
    hintDepth = useRef(CHAMBERS.map(() => 0)),
    stationStory = useRef(0);
  const talk = useCallback(() => {
    const c = current.current;
    if (!c.started || c.menu || c.activeFormula !== null) return;
    c.sound.unlock();
    const player = world.current?.position();
    let index = c.active ?? (player ? roomAt(player.x, player.z) : c.room);
    // Access corridors still belong to the last puzzle, before the public station.
    if (index < 0 && c.section !== "Arrival gallery" &&
        !STATION_DECK.some((deck) => deck.name === c.section)) index = c.room;
    const context = index < 0 ? `station:${c.section}` : `room:${index}`;
    if (c.active === null && continueConversation(context)) return;
    if (index < 0) {
      say(`station-story-${stationStory.current++ % 3}` as TandemScene, {
        repeat: true,
        interrupt: true,
        conversation: context,
      });
      return;
    }
    const circuit = c.state.rooms[index],
      depth = hintDepth.current[index];
    const line =
      c.active !== null
        ? hintLine(index, circuit, depth)
        : conversationLine(
            index, circuit, depth,
            c.state.heard.includes(tandemMemoryId(roomLine(index, "story"))),
          );
    // A fault or conversation never spends a step of the requested solution.
    if (line.includes("-hint-")) hintDepth.current[index] = Math.min(2, depth + 1);
    say(line, {
      repeat: true,
      interrupt: true,
      conversation: c.active === null ? context : undefined,
      mood: c.active !== null || line.includes("-hint-") ? "point" : "speak",
    });
  }, [say, continueConversation]);
  const completed = completedIds(state),
    playing =
      started &&
      active === null &&
      activeFormula === null &&
      menu === null &&
      !cameraMoving;
  const powered = useMemo(() => poweredIds(state), [state.rooms, state.proofs]);
  const firstUnpowered = CHAMBERS.findIndex((c) => !powered.includes(c.id));
  const fallbackRoom = firstUnpowered < 0 ? 5 : firstUnpowered;
  const publicStation =
    section === "Arrival gallery" ||
    STATION_DECK.some((r) => r.name === section);
  const reduced = useReducedMotion(state.reducedMotion);
  useEffect(() => {
    if (reduced) setArriving(false);
  }, [reduced]);
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
      if (narrativeRoom.current !== index) {
        clearTandem(false, true);
        narrativeRoom.current = index;
        say(roomLine(index, "entry"));
      }
    },
    [say, clearTandem],
  );
  const openBench = useCallback(
    (id: ChamberId) => {
      const index = CHAMBERS.findIndex((c) => c.id === id);
      if (index < 0) return;
      world.current?.release();
      setActive(index);
      setRoom(index);
      dispatch({ type: "VISIT", id });
      if (narrativeRoom.current !== index) {
        clearTandem(false, true);
        narrativeRoom.current = index;
        say(roomLine(index, "entry"));
      }
      current.current.sound.play("soft");
    },
    [say, clearTandem],
  );
  const inspectFormula = useCallback((index: number) => {
    if (!CHAMBERS[index]?.formula) return;
    world.current?.release();
    setFormulaNotice(null);
    setActiveFormula(index);
    current.current.sound.play("soft");
  }, []);
  const formulaViewed = useCallback(
    (index: number) => {
      const id = CHAMBERS[index]?.formula;
      if (
        current.current.activeFormula !== index ||
        !id ||
        current.current.state.formulas.includes(id)
      )
        return;
      dispatch({ type: "DISCOVER_FORMULA", id });
      setFormulaNotice(id);
      current.current.sound.play("discover");
      say("formula");
    },
    [say],
  );
  useEffect(() => {
    if (!formulaNotice || menu) return;
    const timer = setTimeout(() => setFormulaNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [formulaNotice, menu]);
  const leaveFormula = useCallback(() => setActiveFormula(null), []);
  const pause = useCallback(() => {
    if (!current.current.started) return;
    if (current.current.menu === "pause") return;
    world.current?.release();
    current.current.sound.play("pause");
    setMenu("pause");
  }, []);
  const openNotebook = useCallback((nextTab: NotebookTab = "parts") => {
    world.current?.release();
    setTab(nextTab);
    current.current.sound.play("tablet-open");
    setMenu("notebook");
  }, []);
  function resume() {
    if (menu === "pause") sound.play("resume");
    setMenu(null);
  }
  useEffect(() => {
    if (menu && transition.current) {
      clearTimeout(transition.current);
      transition.current = null;
    }
  }, [menu]);
  useEffect(() => {
    if (
      active !== null &&
      !powered.includes(CHAMBERS[active].id) &&
      transition.current
    ) {
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
    current.current.sound.play("success");
    say(roomLine(index, "restored"), { interrupt: true, mood: "celebrate" });
    if (current.current.active === index) {
      transition.current = setTimeout(() => {
        setActive(null);
        transition.current = null;
      }, 1600);
    }
  }, [state.proofs, say]);
  const previousCircuits = useRef({ rooms: state.rooms, proofs: state.proofs });
  useEffect(() => {
    const before = previousCircuits.current;
    previousCircuits.current = { rooms: state.rooms, proofs: state.proofs };
    if (
      !started ||
      active === null ||
      before.rooms[active] === state.rooms[active]
    )
      return;
    if (!before.proofs[active] && state.proofs[active]) return;
    const line = circuitReaction(
      active,
      before.rooms[active],
      state.rooms[active],
      !!before.proofs[active],
    );
    if (line)
      say(line, {
        scope: CHAMBERS[active].id,
        interrupt: !line.endsWith("-working"),
        mood: ["short", "overload", "both-off"].includes(line)
          ? "concern"
          : line === "isolated"
            ? "celebrate"
            : "speak",
      });
  }, [state.rooms, state.proofs, started, active, say]);
  useEffect(() => {
    if (
      active === null ||
      menu ||
      !started ||
      powered.includes(CHAMBERS[active].id)
    )
      return;
    const timer = setTimeout(
      () => say("idle", { scope: CHAMBERS[active].id }),
      55000,
    );
    return () => clearTimeout(timer);
  }, [active, menu, started, state.rooms, powered, say]);
  const onSection = useCallback(
    (next: string) => {
      setSection(next);
      if (next === "Arrival gallery" || next === "Station commons" || next in TANDEM_SCRIPTS)
        clearTandem(false, true);
      if (next === "Arrival gallery") say("arrival");
      else if (next === "Station commons") say("commons");
      else if (next in TANDEM_SCRIPTS) say(next as TandemScene);
    },
    [say, clearTandem],
  );
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
      if (e.code === "KeyT" && current.current.active !== null) {
        e.preventDefault();
        talk();
        return;
      }
      if (["KeyN", "KeyJ", "Tab", "KeyM"].includes(e.code)) {
        // Close-up controls retain normal keyboard focus navigation.
        if (
          e.code === "Tab" &&
          (current.current.active !== null ||
            current.current.activeFormula !== null)
        )
          return;
        e.preventDefault();
        openNotebook(
          e.code === "KeyM"
            ? "map"
            : current.current.activeFormula !== null
              ? "formulas"
              : "parts",
        );
      }
      if (e.code === "KeyE" && current.current.activeFormula !== null) {
        e.preventDefault();
        leaveFormula();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (current.current.active !== null) leaveBench();
        else if (current.current.activeFormula !== null) leaveFormula();
        else pause();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [leaveBench, leaveFormula, pause, openNotebook, talk]);
  function begin() {
    if (!ready || started) return;
    setArriving(!reduced);
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
    else if (action.type === "add") sound.play("place");
    else if (action.type !== "move" && action.type !== "rotate")
      sound.play("soft");
  }
  function restart() {
    sound.reset();
    if (transition.current) clearTimeout(transition.current);
    transition.current = null;
    clearTandem(true);
    narrativeRoom.current = -1;
    hintDepth.current = CHAMBERS.map(() => 0);
    stationStory.current = 0;
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
    setActiveFormula(null);
    setFormulaNotice(null);
    setMenu(null);
    setArriving(false);
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
          tandemMood={subtitle?.mood ?? "listen"}
          tandemPaused={!started || menu !== null || activeFormula !== null}
          onTalk={talk}
          preview={!started}
          activeBench={failed ? null : active}
          activeFormula={failed ? null : activeFormula}
          onBenchView={setBenchView}
          onInspectFormula={inspectFormula}
          onFormulaViewed={formulaViewed}
          onFormulaView={setFormulaView}
          onCameraMoving={setCameraMoving}
          completed={completed}
          powered={powered}
          godMode={godMode}
          circuits={state.rooms}
          reducedMotion={reduced}
          sensitivity={1}
          onVisit={openBench}
          onRoom={onRoom}
          onSection={onSection}
          onStation={() => say("commons")}
          onPause={pause}
          onReady={() => setReady(true)}
          onError={() => {
            setFailed(true);
            setBenchView(null);
            setActiveFormula(null);
            setFormulaView(null);
            setCameraMoving(false);
            setReady(true);
          }}
          onEnvironment={(kind, mix) => {
            if (started && !menu) sound.play(kind, mix);
          }}
        />
      </Suspense>
      {!started && (
        <TitleScreen
          ready={ready}
          returning={state.visited.length > 0}
          onBegin={begin}
        />
      )}
      {arriving && (
        <div
          className="station-arrival"
          aria-hidden="true"
          onAnimationEnd={() => setArriving(false)}
        />
      )}
      {started && active === null && activeFormula === null && (
        <header className="game-chrome">
          <span className="room-marker">
            {!publicStation && (
              <span className="hud-room-number">{CHAMBERS[room].number}</span>
            )}
            <span className="hud-room-name">
              {publicStation ? section : (CHAMBERS[room]?.name ?? "Wake")}
            </span>
            {!publicStation && (
              <i
                className={powered.includes(CHAMBERS[room].id) ? "powered" : ""}
              />
            )}
            {godMode && (
              <span className="dev-indicator" aria-label="God mode enabled">
                DEV
              </span>
            )}
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
            onFault={() => sound.play("fault")}
            onUndo={() => {
              dispatch({ type: "UNDO", room: active });
              sound.play("soft");
            }}
            onReset={() => {
              dispatch({ type: "RESET_CIRCUIT", room: active });
              sound.play("test");
            }}
            onBack={leaveBench}
            onNotebook={() => openNotebook()}
            onAskTandem={talk}
          />
        </Suspense>
      )}
      {started && activeFormula !== null && (
        <FormulaReader
          key={activeFormula}
          index={activeFormula}
          view={formulaView}
          suspended={menu !== null}
          onClose={leaveFormula}
          onNotebook={() => openNotebook("formulas")}
        />
      )}
      {started && formulaNotice && !menu && (
        <div className="formula-notice" role="status">
          <Check aria-hidden="true" />
          New formula added!
        </div>
      )}
      {started &&
        subtitle &&
        !menu &&
        activeFormula === null &&
        !formulaNotice && (
          <div
            className={`narration tandem-caption ${active !== null ? "at-bench" : ""}`}
            role="status"
            data-line={subtitle.line}
            data-scene={subtitle.scene}
            data-beat={subtitle.beat}
          >
            <span>TANDEM</span>
            <p key={subtitle.id}>{subtitle.text}</p>
          </div>
        )}
      {started && failed && active === null && (
        <div className="fallback-navigation">
          <p>3D view unavailable. The circuit kit is ready.</p>
          <button onClick={() => openBench(CHAMBERS[fallbackRoom].id)}>
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
