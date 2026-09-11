import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { renderWorld } from "./scene/renderWorld";
import type { Telemetry, WorldState } from "./scene/renderWorld";
import { SITES } from "./scene/navigation";
import type { MissionId } from "./missions";

export type WorldHandle = {
  capture: () => void;
  release: () => void;
  reset: () => void;
};
type Props = WorldState & {
  onVisit: (id: MissionId) => void;
  onPause: () => void;
  onReady: () => void;
  onError: () => void;
  onStep: () => void;
};

export default forwardRef<WorldHandle, Props>(function World(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const controls = useRef<ReturnType<typeof renderWorld> | null>(null);
  const [hud, setHud] = useState<Telemetry | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const stickPointer = useRef<number | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      capture: () => controls.current?.capture(),
      release: () => controls.current?.release(),
      reset: () => controls.current?.reset(),
    }),
    [],
  );
  useEffect(() => {
    const world = renderWorld({
      container: host.current!,
      state: () => latest.current,
      ready: () => latest.current.onReady(),
      error: () => latest.current.onError(),
      telemetry: setHud,
      interact: (id) => latest.current.onVisit(id),
      pause: () => latest.current.onPause(),
      step: () => latest.current.onStep(),
    });
    controls.current = world;
    return () => {
      world.dispose();
      controls.current = null;
    };
  }, []);
  useEffect(() => {
    if (!props.playing) {
      controls.current?.stick(0, 0);
      setStick({ x: 0, y: 0 });
      stickPointer.current = null;
    }
  }, [props.playing]);
  const focus = hud?.focus,
    complete = focus ? props.completed.includes(focus) : false;
  const next = (["workshop", "harbor", "beacon"] as MissionId[]).find(
    (id) => !props.completed.includes(id),
  );
  const available = focus === next || complete;
  function stopStick() {
    controls.current?.stick(0, 0);
    setStick({ x: 0, y: 0 });
    stickPointer.current = null;
  }
  return (
    <>
      <div className="world" ref={host} />
      {props.playing && hud && (
        <div className="game-hud">
          <div
            className="compass"
            aria-label={`Facing ${Math.round(hud.heading)} degrees`}
          >
            <span>
              {
                ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
                  Math.round(hud.heading / 45) % 8
                ]
              }
            </span>
            <i />
            <span>{String(Math.round(hud.heading)).padStart(3, "0")}°</span>
          </div>
          <div
            className={`reticle ${focus ? "has-target" : ""}`}
            aria-hidden="true"
          />
          {hud.marker.visible && (
            <div
              className="world-waypoint"
              style={{ left: hud.marker.x, top: hud.marker.y }}
              aria-hidden="true"
            >
              <i />
              <span>{Math.round(hud.distance)} m</span>
            </div>
          )}
          {focus && (
            <button
              className="interact-prompt"
              onClick={() => controls.current?.interact()}
              aria-label={`${complete ? "Inspect" : available ? "Repair" : "Inspect locked"} ${SITES[focus].name}`}
            >
              <kbd>E</kbd>
              <span>
                <small>{SITES[focus].name}</small>
                {complete
                  ? "Power restored · inspect"
                  : available
                    ? "Open circuit panel"
                    : "No incoming power"}
              </span>
            </button>
          )}
          {!focus && (
            <div className={`movement-hint ${hud.moved ? "has-moved" : ""}`}>
              <span className="desktop-controls">
                <kbd>W A S D</kbd> Move <b>·</b> Mouse Look <b>·</b>{" "}
                <kbd>Shift</kbd> Run
              </span>
              <span className="touch-controls">
                Left thumb to move · drag to look
              </span>
            </div>
          )}
          <div
            className="touch-stick"
            role="group"
            aria-label="Movement joystick"
            onPointerDown={(e) => {
              stickPointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (stickPointer.current !== e.pointerId) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const radius = rect.width * (38 / 140);
              let x = (e.clientX - rect.left - rect.width / 2) / radius,
                y = (e.clientY - rect.top - rect.height / 2) / radius;
              const length = Math.max(1, Math.hypot(x, y));
              x /= length;
              y /= length;
              setStick({ x: x * 32, y: y * 32 });
              controls.current?.stick(x, y);
            }}
            onPointerUp={stopStick}
            onPointerCancel={stopStick}
            onLostPointerCapture={stopStick}
          >
            <i style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
          </div>
          <span className="sr-only" role="status">
            {focus
              ? `${SITES[focus].name}. Press E to interact.`
              : next
                ? `${Math.round(hud.distance)} meters to ${SITES[next].name}`
                : "All island power restored"}
          </span>
        </div>
      )}
    </>
  );
});
