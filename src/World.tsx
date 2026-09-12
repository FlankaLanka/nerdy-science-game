import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { renderWorld } from "./scene/renderWorld";
import type { Telemetry, WorldState } from "./scene/renderWorld";
import { SITES, SPAWN } from "./scene/navigation";
import type { Player } from "./scene/navigation";
import {
  ACTIVITY_IDS,
  nextActivity,
  available as isAvailable,
} from "./activities";
import type { ActivityId as MissionId } from "./activities";
import { SHIP_SYSTEMS, SYSTEM_ORDER, systemStatus } from "./shipSystems";
import { Activity, ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { DOORWAYS } from "./scene/shipLayout";

export type WorldHandle = {
  capture: () => void;
  release: () => void;
  reset: () => void;
  position: () => Player;
};
type Props = WorldState & {
  onVisit: (id: MissionId) => void;
  onPause: () => void;
  onReady: () => void;
  onError: () => void;
  onStep: () => void;
  onEnvironment: (sound: "door" | "power") => void;
  onScan: () => void;
};

export default forwardRef<WorldHandle, Props>(function World(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const controls = useRef<ReturnType<typeof renderWorld> | null>(null);
  const [hud, setHud] = useState<Telemetry | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [systemsOpen, setSystemsOpen] = useState(false);
  const stickPointer = useRef<number | null>(null);
  const waypoint = useRef<HTMLDivElement>(null);
  const waypointDistance = useRef<HTMLSpanElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      capture: () => controls.current?.capture(),
      release: () => controls.current?.release(),
      reset: () => controls.current?.reset(),
      position: () => controls.current?.position() ?? { ...SPAWN },
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
      waypoint: (point) => {
        if (!waypoint.current) return;
        waypoint.current.style.visibility = point.visible
          ? "visible"
          : "hidden";
        if (!point.visible) return;
        waypoint.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        if (waypointDistance.current)
          waypointDistance.current.textContent = `${Math.round(point.distance)} m`;
      },
      interact: (id) => latest.current.onVisit(id),
      pause: () => latest.current.onPause(),
      step: () => latest.current.onStep(),
      environment: (sound) => latest.current.onEnvironment(sound),
    });
    controls.current = world;
    return () => {
      world.dispose();
      controls.current = null;
    };
  }, []);
  useEffect(() => {
    if (!props.playing) {
      setSystemsOpen(false);
      controls.current?.stick(0, 0);
      setStick({ x: 0, y: 0 });
      stickPointer.current = null;
    }
  }, [props.playing]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !latest.current.playing ||
        event.repeat ||
        event.code !== "KeyQ" ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      setSystemsOpen((open) => !open);
      latest.current.onScan();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const focus = hud?.focus,
    complete = focus ? props.completed.includes(focus) : false;
  const next =
    props.completed.length === ACTIVITY_IDS.length
      ? undefined
      : nextActivity(props.completed, props.tracked);
  const available = focus
    ? isAvailable(focus, props.completed) || complete
    : false;
  const current = next ? SHIP_SYSTEMS[next] : null;
  const position = controls.current?.position();
  const lockedDoor = position
    ? DOORWAYS.findIndex(
        (z, i) =>
          !props.completed.includes(SYSTEM_ORDER[i]) &&
          position.z > z &&
          position.z - z < 5 &&
          Math.abs(position.x) < 2.8,
      )
    : -1;
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
          <div className="deck-readout">
            <span className="eyebrow">ASTERION / DECK 07</span>
            <strong>{hud.section}</strong>
            <span className="deck-status">
              <i />
              {props.completed.length === ACTIVITY_IDS.length
                ? "PRIMARY SYSTEMS ONLINE"
                : props.completed.includes("harbor")
                  ? "REACTOR ONLINE / COMMS OFFLINE"
                  : props.completed.includes("workshop")
                    ? "AUXILIARY SUPPLY ONLINE"
                    : "RESERVE POWER ACTIVE"}
            </span>
          </div>
          <div className="system-readout">
            <span>
              {props.distressSent
                ? "RESCUE SIGNAL ACKNOWLEDGED"
                : `${props.completed.length} / ${ACTIVITY_IDS.length} SYSTEMS ONLINE`}
            </span>
            <div>
              {ACTIVITY_IDS.map((id) => (
                <i
                  key={id}
                  className={
                    props.completed.includes(id as MissionId) ? "online" : ""
                  }
                />
              ))}
            </div>
            <span className="hud-shortcuts">
              <kbd>M</kbd> DECK MAP <kbd>J</kbd> MISSION LOG
            </span>
          </div>
          <aside className="objective-card" aria-label="Current objective">
            <span className="eyebrow">
              {props.distressSent ? "MISSION COMPLETE" : "RECOVERY OBJECTIVE"}
              <span>{SHIP_SYSTEMS[next ?? "beacon"].code}</span>
            </span>
            <h2>
              {props.distressSent
                ? "Rescue has our coordinates."
                : props.transmitting
                  ? "Transmitting the distress signal"
                  : (current?.goal ?? "Send the distress signal")}
            </h2>
            <p>
              {props.distressSent
                ? "Keep the transmitter online. Explore the restored ship."
                : props.transmitting
                  ? "Sending vessel identity and position. Awaiting rescue control’s acknowledgement."
                  : current
                    ? current.consequence.split(". ")[0] + "."
                    : "Use the forward console to contact rescue control."}
            </p>
            <span className="objective-location">
              <ArrowUpRight size={13} />
              {current?.destination ?? "Command deck · forward console"}
            </span>
          </aside>
          {lockedDoor >= 0 && !focus && (
            <div className="bulkhead-notice" role="status">
              <LockKeyhole size={15} />
              <span>
                Bulkhead sealed
                <small>
                  {lockedDoor === 0
                    ? "Restore auxiliary power to release this door."
                    : "Restore distribution to release this door."}
                </small>
              </span>
            </div>
          )}
          <button
            className={`systems-toggle ${systemsOpen ? "active" : ""}`}
            aria-expanded={systemsOpen}
            aria-controls="ship-systems"
            onClick={() => {
              setSystemsOpen((open) => !open);
              props.onScan();
            }}
          >
            <Activity size={15} />
            <kbd>Q</kbd> {systemsOpen ? "Close systems" : "Ship systems"}
          </button>
          {systemsOpen && (
            <aside
              id="ship-systems"
              className="systems-panel"
              aria-label="Ship systems"
            >
              <span className="eyebrow">POWER NETWORK / LIVE DIAGNOSTICS</span>
              <ol>
                {ACTIVITY_IDS.map((id, index) => {
                  const status = systemStatus(id, props.completed);
                  return (
                    <li key={id} data-status={status}>
                      <span className="network-node">
                        {status === "ONLINE" ? (
                          <Check size={14} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <strong>{SHIP_SYSTEMS[id].label}</strong>
                        <small>{status}</small>
                        {id === next && <p>{SHIP_SYSTEMS[id].fault}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="network-caption">
                Explore either service wing. The map shows which upstream
                repairs each system needs.
              </p>
            </aside>
          )}
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
          <div
            ref={waypoint}
            className="world-waypoint"
            style={{ visibility: "hidden" }}
            aria-hidden="true"
          >
            <i />
            <span ref={waypointDistance} />
          </div>
          {focus && (
            <button
              className="interact-prompt"
              onClick={() => controls.current?.interact()}
              aria-label={
                focus === "beacon" &&
                props.completed.length === ACTIVITY_IDS.length &&
                !props.distressSent
                  ? "Use distress transmitter"
                  : `${complete ? "Inspect" : available ? "Repair" : "Inspect locked"} ${SITES[focus].name}`
              }
            >
              <kbd>E</kbd>
              <span>
                {focus === "beacon" &&
                props.completed.length === ACTIVITY_IDS.length &&
                !props.distressSent
                  ? "Use distress transmitter"
                  : complete
                    ? `Inspect ${SITES[focus].name}`
                    : available
                      ? `Repair ${SITES[focus].name}`
                      : `Inspect ${SITES[focus].name}`}
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
                : "All ship systems restored"}
          </span>
        </div>
      )}
    </>
  );
});
