import { useEffect, useRef, useState } from "react";
import { RotateCcw, Undo2, X } from "lucide-react";
import { MATERIALS, wireKey } from "./missions";
import type { Mission, Terminal, Wire } from "./missions";
import type { Progress, MissionAction } from "./game";
import type { CircuitResult } from "./circuit";
import { FULL_POWER } from "./circuit";
import type { Sound } from "./audio";
import { BenchScene } from "./BenchScene";

export function cablePath(a: Terminal, b: Terminal): string {
  if (Math.abs(a.y - b.y) < 35)
    return `M ${a.x} ${a.y} C ${a.x} ${a.y - 66}, ${b.x} ${b.y - 66}, ${b.x} ${b.y}`;
  if (Math.abs(a.x - b.x) < 40) {
    const bend = a.x > 360 ? 82 : -60;
    return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y + (b.y - a.y) * 0.25}, ${b.x + bend} ${b.y - (b.y - a.y) * 0.25}, ${b.x} ${b.y}`;
  }
  const bend = a.x < b.x ? 60 : -60;
  return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
}

type Props = {
  mission: Mission;
  progress: Progress;
  result: CircuitResult | null;
  removed: boolean;
  onAction: (action: MissionAction) => void;
  play: (sound: Sound) => void;
  lesson: number;
};

export function CircuitBoard({
  mission,
  progress,
  result,
  removed,
  onAction,
  play,
  lesson,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null),
    [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [threeReady, setThreeReady] = useState(false);
  const board = useRef<HTMLDivElement>(null),
    skipClick = useRef(false);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const editable = progress.phase === "build" && lesson !== 0;
  useEffect(() => {
    setSelected(null);
    setPointer(null);
  }, [progress.phase, lesson]);
  useEffect(() => {
    setNotice("");
  }, [progress.wires, progress.material, progress.phase]);
  const terminal = (id: string) => mission.terminals.find((t) => t.id === id)!;
  function connect(wire: Wire) {
    const key = wireKey(wire);
    const installed = mission.fixed.some((w) => wireKey(w) === key);
    const full =
      progress.wires.length >= 10 &&
      !progress.wires.some((w) => wireKey(w) === key);
    if (installed || full) {
      setNotice(
        installed
          ? "That cable is already installed for this experiment."
          : "The board is full. Remove a wire or use Undo to make another connection.",
      );
      setSelected(null);
      setPointer(null);
      play("soft");
      return;
    }
    onAction({ type: "WIRE", wire });
    play("connect");
    setSelected(null);
    setPointer(null);
  }
  function choose(id: string) {
    if (!editable) return;
    setNotice("");
    if (selected === id) {
      setSelected(null);
      setPointer(null);
    } else if (selected) connect([selected, id]);
    else {
      setSelected(id);
      setPointer(null);
      play("soft");
    }
  }
  function point(clientX: number, clientY: number) {
    const rect = board.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 720,
      y: ((clientY - rect.top) / rect.height) * 460,
    };
  }
  const all = [...mission.fixed, ...progress.wires];
  const linked = (id: string) => all.some((w) => w.includes(id));
  return (
    <div className={`circuit-area tutorial-${lesson}`}>
      <div className="board-topline">
        <div className="board-tools" hidden={lesson === 0}>
          <button
            onClick={() => {
              onAction({ type: "UNDO" });
              setSelected(null);
              play("soft");
            }}
            disabled={!editable || !progress.history.length}
            title="Undo last change"
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          <button
            onClick={() => {
              onAction({ type: "CLEAR" });
              setSelected(null);
              play("soft");
            }}
            disabled={!editable || !progress.wires.length}
            title="Clear your wires"
          >
            <RotateCcw size={15} />
            <span>Clear</span>
          </button>
        </div>
      </div>
      <div
        ref={board}
        className={`circuit-board ${editable ? "editable" : ""} ${threeReady ? "with-depth" : ""} ${result?.count ? "has-power" : ""}`}
        onPointerMove={(e) => {
          if (selected && !drag.current)
            setPointer(point(e.clientX, e.clientY));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && selected) {
            e.preventDefault();
            e.stopPropagation();
            setSelected(null);
            setPointer(null);
          }
        }}
      >
        <BenchScene
          mission={mission}
          progress={progress}
          result={result}
          removed={removed}
          onReady={setThreeReady}
        />
        <div
          className={`board-instrument ${result?.count ? "live" : ""}`}
          aria-live="polite"
        >
          <i />
          {result
            ? result.short
              ? "FUSE OPEN"
              : result.count
                ? "CIRCUIT LIVE"
                : "NO COMPLETE PATH"
            : "POWER STANDBY"}
        </div>
        <svg
          className="circuit-drawing"
          viewBox="0 0 720 460"
          role="group"
          aria-label="Circuit components and wires"
        >
          <defs>
            <pattern
              id="boardDots"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".7" fill="#b5c4b6" opacity=".17" />
            </pattern>
            <linearGradient id="batteryCase" x2="1" y2=".3">
              <stop stopColor="#977e58" />
              <stop offset=".5" stopColor="#d2bc8a" />
              <stop offset="1" stopColor="#99805a" />
            </linearGradient>
            <linearGradient id="ceramic" x2=".8" y2="1">
              <stop stopColor="#eee7d0" />
              <stop offset="1" stopColor="#bfb99e" />
            </linearGradient>
            <radialGradient id="bulbGlow">
              <stop stopColor="#ffe3a1" stopOpacity=".7" />
              <stop offset=".5" stopColor="#ffcf70" stopOpacity=".18" />
              <stop offset="1" stopColor="#ffca6c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="glassBulb" x2=".8" y2="1">
              <stop stopColor="#bcd0bc" stopOpacity=".33" />
              <stop offset="1" stopColor="#e2edd2" stopOpacity=".08" />
            </linearGradient>
            <filter
              id="componentShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feDropShadow
                dx="2"
                dy="7"
                stdDeviation="5"
                floodColor="#071b1c"
                floodOpacity=".4"
              />
            </filter>
            <filter id="wireGlow" x="-30%" y="-50%" width="160%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect
            className="flat-board"
            width="720"
            height="460"
            fill="url(#boardDots)"
          />
          {lesson === 0 && (
            <g className="kit-annotations" aria-hidden="true">
              <text x="210" y="252" transform="rotate(-7 210 252)">
                energy starts here
              </text>
              <path d="M258 264q-30 22-75-7m9-4-9 4 8 8" />
              <text x="395" y="75" transform="rotate(-4 395 75)">
                a little light?
              </text>
            </g>
          )}
          {lesson === 1 && (
            <g className="connection-sketch" aria-hidden="true">
              <path d="M552 145 C635 208 505 255 408 330" />
              <text x="545" y="248" transform="rotate(-10 545 248)">
                join these
              </text>
            </g>
          )}
          {[
            { x: 22, y: 20 },
            { x: 698, y: 20 },
            { x: 22, y: 438 },
            { x: 698, y: 438 },
          ].map(({ x, y }) => (
            <g className="flat-board" key={`${x}-${y}`} opacity=".5">
              <circle cx={x} cy={y} r="4" fill="#8b9787" />
              <path d={`M${x - 2} ${y}h4`} stroke="#264346" />
            </g>
          ))}
          {all.map((w) => {
            const key = wireKey(w),
              path = cablePath(terminal(w[0]), terminal(w[1])),
              active = result?.activeWires.includes(key),
              fixed = mission.fixed.some((f) => wireKey(f) === key);
            return (
              <g key={key} className={`cable ${active ? "is-powered" : ""}`}>
                {active && (
                  <path
                    d={path}
                    className="cable-aura"
                    fill="none"
                    stroke="#f4c77e"
                    strokeWidth="13"
                    opacity=".35"
                    filter="url(#wireGlow)"
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  stroke="#0b2427"
                  strokeWidth="10"
                  strokeLinecap="round"
                  transform="translate(1 4)"
                  opacity=".5"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={
                    active
                      ? "#edb661"
                      : result
                        ? "#687576"
                        : fixed
                          ? "#6c9394"
                          : "#d5925c"
                  }
                  strokeWidth="7.5"
                  strokeLinecap="round"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={active ? "#ffe8ba" : "#ffffff"}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity={active ? 0.8 : 0.2}
                  transform="translate(0 -1)"
                />
                {!fixed && editable && (
                  <path
                    d={path}
                    className="wire-hit"
                    fill="none"
                    stroke="transparent"
                    strokeWidth="25"
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove wire from ${terminal(w[0]).label} to ${terminal(w[1]).label}`}
                    onClick={() => connect(w)}
                    onKeyDown={(e) => {
                      if (
                        ["Enter", " ", "Delete", "Backspace"].includes(e.key)
                      ) {
                        e.preventDefault();
                        connect(w);
                      }
                    }}
                  />
                )}
              </g>
            );
          })}
          {selected && pointer && (
            <path
              d={cablePath(terminal(selected), {
                id: "pointer",
                label: "",
                ...pointer,
              })}
              stroke="#f0d3a2"
              strokeWidth="3"
              strokeDasharray="5 7"
              fill="none"
              opacity=".8"
            />
          )}
          <g className="flat-component" filter="url(#componentShadow)">
            <rect
              x="88"
              y="175"
              width="84"
              height="120"
              rx="16"
              fill="url(#batteryCase)"
            />
            <rect x="92" y="212" width="76" height="64" rx="2" fill="#e4d8af" />
            <path
              d="M130 150v26M130 295v25"
              stroke="#b5ab8a"
              strokeWidth="13"
            />
            <path d="M130 150v26M130 295v25" stroke="#e1cf9b" strokeWidth="5" />
            <text x="130" y="236" textAnchor="middle" className="battery-volts">
              6 V
            </text>
            <text
              x="130"
              y="258"
              textAnchor="middle"
              className="battery-caption"
            >
              BATTERY
            </text>
            <text
              x="152"
              y="198"
              textAnchor="middle"
              fill="#f4e7bf"
              fontSize="15"
            >
              +
            </text>
            <text
              x="153"
              y="287"
              textAnchor="middle"
              fill="#f4e7bf"
              fontSize="15"
            >
              −
            </text>
          </g>
          {mission.lamps.map((l) => {
            const output = result?.lamps[l.id],
              on = !!output?.on,
              absent = removed && l.id === "a";
            return (
              <g key={l.id} transform={`translate(${l.x} ${l.y})`}>
                {on && (
                  <circle
                    r="92"
                    fill="url(#bulbGlow)"
                    opacity={
                      0.45 + 0.55 * Math.sqrt(output!.power / FULL_POWER)
                    }
                  />
                )}
                <g className="flat-component">
                  <path
                    d="M-72 0H-40M40 0H72"
                    stroke="#b6b194"
                    strokeWidth="8"
                  />
                  <ellipse
                    rx="43"
                    ry="34"
                    fill="url(#ceramic)"
                    filter="url(#componentShadow)"
                  />
                  <ellipse cy="-1" rx="28" ry="23" fill="#9c8f69" />
                  <ellipse cy="-2" rx="23" ry="19" fill="#615e45" />
                  {absent ? (
                    <>
                      <ellipse cy="-2" rx="17" ry="13" fill="#253e3b" />
                      <path
                        d="M-10-8 10 5M10-8-10 5"
                        stroke="#a0a998"
                        strokeWidth="2"
                      />
                    </>
                  ) : (
                    <g className={on ? "bulb lit" : "bulb"}>
                      <path
                        d="M-16 5C-17-12-28-17-26-33C-25-65 25-65 26-33C28-17 17-12 16 5Z"
                        fill={on ? "#f9d690" : "url(#glassBulb)"}
                        fillOpacity={on ? 0.75 : 1}
                        stroke={on ? "#fceac1" : "#b1c1aa"}
                        strokeWidth="1.5"
                      />
                      <path
                        d="M-10 4-9-27-5-22 0-28 5-22 9-27 10 4"
                        fill="none"
                        stroke={on ? "#fff2cc" : "#879982"}
                        strokeWidth={on ? 2.5 : 1.5}
                      />
                      <path
                        d="M-17 4H17M-17 9H17M-15 14H15"
                        stroke="#beab79"
                        strokeWidth="4"
                      />
                      <path
                        d="M-17-38Q-17-47-7-49"
                        fill="none"
                        stroke="#f7f2d6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity=".45"
                      />
                    </g>
                  )}
                </g>
                <text y="66" textAnchor="middle" className="component-label">
                  {mission.id === "workshop"
                    ? "WORKSHOP LAMP"
                    : `LAMP ${l.id.toUpperCase()}`}
                </text>
                <text
                  y="85"
                  textAnchor="middle"
                  className={`lamp-state ${on ? "on" : ""}`}
                >
                  {absent
                    ? "disconnected"
                    : result
                      ? on
                        ? "glowing"
                        : "dark"
                      : ""}
                </text>
              </g>
            );
          })}
          {mission.id === "workshop" && (
            <g transform="translate(480 330)">
              <g className="flat-component">
                <rect
                  x="-70"
                  y="-23"
                  width="140"
                  height="48"
                  rx="10"
                  fill="#1e383c"
                  stroke="#5c746d"
                />
                <rect
                  x="-50"
                  y="-13"
                  width="100"
                  height="26"
                  rx="3"
                  fill={
                    progress.material === "copper"
                      ? "#c89269"
                      : progress.material === "wood"
                        ? "#ad8d5a"
                        : "#a1beb1"
                  }
                  fillOpacity={progress.material === "glass" ? 0.3 : 1}
                />
                {progress.material === "wood" &&
                  [-5, 2, 8].map((y) => (
                    <path
                      key={y}
                      d={`M-45 ${y}Q-18 ${y - 5} 0 ${y}T45 ${y}`}
                      stroke="#7d683e"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  ))}
                {progress.material === "glass" && (
                  <path
                    d="M-38 8-22-8M-23 8-7-8"
                    stroke="#daecda"
                    opacity=".5"
                  />
                )}
                {result?.bridgeActive && (
                  <path
                    d="M-67 0H67"
                    stroke="#ffe0a3"
                    strokeWidth="3"
                    opacity=".65"
                  />
                )}
                <circle cx="-62" r="8" fill="#c0af81" />
                <circle cx="62" r="8" fill="#c0af81" />
              </g>
              <text y="56" textAnchor="middle" className="component-label">
                THE BRIDGE
              </text>
            </g>
          )}
          {threeReady && (
            <g className="depth-labels">
              <text
                x="130"
                y="233"
                textAnchor="middle"
                className="battery-volts"
              >
                6 V
              </text>
              <text
                x="130"
                y="253"
                textAnchor="middle"
                className="battery-caption"
              >
                BATTERY
              </text>
            </g>
          )}
        </svg>
        {mission.terminals.map((t) => (
          <button
            key={t.id}
            className={`socket ${selected === t.id ? "selected" : ""} ${lesson === 1 && ["a2", "m1"].includes(t.id) ? "guide-socket" : ""} ${linked(t.id) ? "connected" : ""} ${result?.activeTerminals.includes(t.id) ? "powered" : ""}`}
            style={{
              left: `${(t.x / 720) * 100}%`,
              top: `${(t.y / 460) * 100}%`,
            }}
            aria-label={t.label}
            aria-pressed={selected === t.id}
            aria-disabled={!editable}
            tabIndex={editable ? 0 : -1}
            data-terminal={t.id}
            onClick={() => {
              if (skipClick.current) {
                skipClick.current = false;
                return;
              }
              choose(t.id);
            }}
            onPointerDown={(e) => {
              if (!editable || e.button !== 0) return;
              drag.current = {
                id: t.id,
                x: e.clientX,
                y: e.clientY,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 9)
                d.moved = true;
              if (d.moved) {
                setSelected(d.id);
                setPointer(point(e.clientX, e.clientY));
              }
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (!d) return;
              drag.current = null;
              if (d.moved) {
                skipClick.current = true;
                const target = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>("[data-terminal]")?.dataset.terminal;
                if (target && target !== d.id) connect([d.id, target]);
                else {
                  setSelected(null);
                  setPointer(null);
                }
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
              skipClick.current = true;
              setSelected(null);
              setPointer(null);
            }}
          >
            <span className="socket-metal">
              <span />
            </span>
            <span className="socket-label">
              {t.id === "p"
                ? "+"
                : t.id === "n"
                  ? "−"
                  : t.id.startsWith("m")
                    ? ""
                    : t.id
                        .toUpperCase()
                        .replace("1", " · 1")
                        .replace("2", " · 2")}
            </span>
          </button>
        ))}
      </div>
      <div className="board-bottomline" aria-live="polite">
        <span>
          {notice ||
            (selected
              ? `${terminal(selected).label} selected. Choose another socket.`
              : "")}
        </span>
        {selected && (
          <button
            className="cancel-wire"
            onClick={() => {
              setSelected(null);
              setPointer(null);
            }}
            aria-label="Cancel connection"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {mission.id === "workshop" && lesson >= 2 && (
        <div className="materials">
          <span className="materials-label">Bridge</span>
          <div className="material-options">
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                disabled={!editable}
                aria-pressed={progress.material === m.id}
                onClick={() => {
                  onAction({ type: "MATERIAL", material: m.id });
                  play("connect");
                }}
              >
                <span className={`material-sample ${m.id}`} />
                {m.short}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
