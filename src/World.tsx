import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { renderWorld } from "./scene/renderWorld";
import type { Telemetry, WorldState } from "./scene/renderWorld";
import { SPAWN } from "./scene/navigation";
import type { Player } from "./scene/navigation";
import type { ChamberId } from "./chambers";
import type { BenchControls, BenchView } from "./scene/benchView";
import type { FormulaView } from "./scene/formulaView";
export type WorldHandle = BenchControls & {
  capture: () => void;
  release: () => void;
  reset: () => void;
  position: () => Player;
};
type Props = WorldState & {
  onVisit: (id: ChamberId) => void;
  onRoom: (index: number) => void;
  onStation: () => void;
  onSection: (section: string) => void;
  onPause: () => void;
  onReady: () => void;
  onError: () => void;
  onStep: () => void;
  onEnvironment: (sound: "door" | "power") => void;
  onBenchView: (view: BenchView | null) => void;
  onInspectFormula: (index: number) => void;
  onFormulaViewed: (index: number) => void;
  onFormulaView: (view: FormulaView | null) => void;
  onCameraMoving: (moving: boolean) => void;
};
export default forwardRef<WorldHandle, Props>(function World(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const controls = useRef<ReturnType<typeof renderWorld> | null>(null);
  const [hud, setHud] = useState<Telemetry | null>(null),
    [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      capture: () => controls.current?.capture(),
      release: () => controls.current?.release(),
      reset: () => controls.current?.reset(),
      position: () => controls.current?.position() ?? { ...SPAWN },
      setBenchInteraction: (interaction) =>
        controls.current?.setBenchInteraction(interaction),
      benchPoint: (x, y) => controls.current?.benchPoint(x, y) ?? null,
      projectBench: (point, elevation) =>
        controls.current?.projectBench(point, elevation) ?? null,
      pickBench: (x, y) => controls.current?.pickBench(x, y) ?? null,
    }),
    [],
  );
  useEffect(() => {
    let cancelled = false;
    // Canvas labels must be painted after the locally served fonts are available.
    void Promise.allSettled([
      document.fonts.load('600 16px "Space Grotesk"'),
      document.fonts.load('400 12px "IBM Plex Mono"'),
    ]).then(() => {
      if (cancelled) return;
      controls.current = renderWorld({
        container: host.current!,
        state: () => latest.current,
        ready: () => latest.current.onReady(),
        error: () => latest.current.onError(),
        telemetry: setHud,
        interact: (id) => latest.current.onVisit(id),
        pause: () => latest.current.onPause(),
        step: () => latest.current.onStep(),
        environment: (sound) => latest.current.onEnvironment(sound),
        benchView: (view) => latest.current.onBenchView(view),
        inspectFormula: (index) => latest.current.onInspectFormula(index),
        formulaViewed: (index) => latest.current.onFormulaViewed(index),
        formulaView: (view) => latest.current.onFormulaView(view),
        cameraMoving: (moving) => latest.current.onCameraMoving(moving),
      });
    });
    return () => {
      cancelled = true;
      controls.current?.dispose();
      controls.current = null;
    };
  }, []);
  useEffect(() => {
    if (props.playing && hud && hud.room >= 0) props.onRoom(hud.room);
    if (props.playing && hud) props.onSection(hud.section);
    if (props.playing && hud?.section === "Station commons") props.onStation();
  }, [hud?.room, hud?.section, props.playing]);
  function stop() {
    controls.current?.stick(0, 0);
    setStick({ x: 0, y: 0 });
    pointer.current = null;
  }
  useEffect(() => {
    if (!props.playing) stop();
  }, [props.playing]);
  return (
    <>
      <div
        className="world"
        ref={host}
        aria-hidden={props.preview || undefined}
      />
      {props.playing && hud && (
        <div className="world-hud">
          <span
            className={`reticle ${hud.focus || hud.formula !== null ? "focused" : ""}`}
            aria-hidden="true"
          />
          {(hud.focus || hud.formula !== null) && (
            <button
              className="use-prompt"
              onClick={() => controls.current?.interact()}
              aria-label={hud.formula !== null ? "Inspect formula screen" : "Use circuit bench"}
            >
              <kbd>E</kbd>
            </button>
          )}
          <div
            className="touch-stick"
            role="group"
            aria-label="Movement joystick"
            onPointerDown={(e) => {
              pointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (pointer.current !== e.pointerId) return;
              const r = e.currentTarget.getBoundingClientRect();
              let x = (e.clientX - r.left - r.width / 2) / (r.width * 0.3),
                y = (e.clientY - r.top - r.height / 2) / (r.height * 0.3);
              const length = Math.max(1, Math.hypot(x, y));
              x /= length;
              y /= length;
              setStick({ x: x * 28, y: y * 28 });
              controls.current?.stick(x, y);
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
          >
            <i style={{ transform: `translate(${stick.x}px,${stick.y}px)` }} />
          </div>
        </div>
      )}
    </>
  );
});
