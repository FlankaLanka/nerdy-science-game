import { useEffect, useMemo, useId, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Lightbulb,
  MousePointer2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import {
  cablePath,
  endpoints,
  lampState,
  PART_NAMES,
  simulate,
  terminalId,
} from "./circuitKit";
import type { Circuit, KitAction, Part, PartKind, Tool } from "./circuitKit";
import type { Chamber } from "./chambers";
import { PartIcon } from "./PartIcon";
import type { BenchControls, BenchView } from "./scene/benchView";
type Props = {
  chamber: Chamber;
  circuit: Circuit;
  restored: boolean;
  canUndo: boolean;
  reducedMotion: boolean;
  world: BenchControls | null;
  view: BenchView | null;
  suspended: boolean;
  onAction: (action: KitAction) => void;
  onUndo: () => void;
  onReset: () => void;
  onBack: () => void;
  onNotebook: () => void;
};
type Point = { x: number; y: number };
const flatPosition = (p: Point): CSSProperties => ({
  left: `${p.x / 9}%`,
  top: `${p.y / 5}%`,
});
const bounded = (v: number, max: number) =>
  Math.max(105, Math.min(max - 105, v));
export default function CircuitLab(props: Props) {
  const { chamber, circuit, restored, world, view } = props;
  const fallback = !world;
  const benchReady =
    fallback || (!!view?.ready && view.index === Number(chamber.number) - 1);
  const board = useRef<HTMLDivElement>(null),
    maskId = useId();
  const [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState<Tool>("wire");
  const [start, setStart] = useState<string | null>(null),
    [cursor, setCursor] = useState<Point | null>(null);
  const [preview, setPreview] = useState<Circuit | null>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    offset: Point;
    moved: boolean;
  } | null>(null);
  const wireDrag = useRef<{
    a: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const trayDrag = useRef<{ kind: PartKind; x: number; y: number } | null>(
    null,
  );
  const document = preview ?? circuit,
    result = useMemo(() => simulate(document), [document]);
  const points = useMemo(() => endpoints(document), [document]);
  const chosen = document.parts.find((p) => p.id === selected);
  const overloaded = document.parts.some((p) => p.kind === "bulb" && lampState(p, result).overloaded);
  const latest = useRef(props);
  latest.current = props;
  const position = (p: Point, elevation = 0): CSSProperties => {
    const projected = world?.projectBench(p, elevation);
    if (!projected || !view) return flatPosition(p);
    return { left: projected.x - view.left, top: projected.y - view.top };
  };
  const point = (x: number, y: number): Point => {
    const projected = latest.current.world?.benchPoint(x, y);
    if (projected) return projected;
    const r = board.current!.getBoundingClientRect();
    return {
      x: ((x - r.left) / r.width) * 900,
      y: ((y - r.top) / r.height) * 500,
    };
  };
  function connect(a: string, b: string) {
    if (a !== b) props.onAction({ type: "wire", a, b });
    setStart(null);
    setCursor(null);
    setSelected(null);
  }
  function contact(id: string) {
    setTool("wire");
    if (start && start !== id) connect(start, id);
    else {
      setStart(start === id ? null : id);
      setCursor(null);
    }
  }
  const name = (part: Part) => {
    const siblings = document.parts.filter((p) => p.kind === part.kind);
    return (
      PART_NAMES[part.kind] +
      (siblings.length > 1
        ? ` ${siblings.findIndex((p) => p.id === part.id) + 1}`
        : "")
    );
  };
  function terminalName(part: Part, end: "a" | "b") {
    return `${name(part)} ${part.kind === "battery" ? (end === "a" ? "positive" : "negative") : `contact ${end.toUpperCase()}`}`;
  }
  function move(e: ReactPointerEvent) {
    if (!benchReady || props.suspended) return;
    const p = point(e.clientX, e.clientY);
    if (start || wireDrag.current) setCursor(p);
    if (
      wireDrag.current &&
      Math.hypot(
        e.clientX - wireDrag.current.x,
        e.clientY - wireDrag.current.y,
      ) > 6
    )
      wireDrag.current.moved = true;
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true;
    if (d.moved && !circuit.parts.find((p) => p.id === d.id)?.fixed)
      setPreview({
        ...circuit,
        parts: circuit.parts.map((part) =>
          part.id === d.id
            ? {
                ...part,
                x: bounded(p.x - d.offset.x, 900),
                y: bounded(p.y - d.offset.y, 500),
              }
            : part,
        ),
      });
  }
  function up(e: ReactPointerEvent) {
    const w = wireDrag.current;
    wireDrag.current = null;
    if (w) {
      if (w.moved) {
        const p = point(e.clientX, e.clientY),
          scale = board.current!.getBoundingClientRect().width / 900;
        const distance = (target: Point) => {
          const screen = world?.projectBench(target, 11);
          return screen
            ? Math.hypot(screen.x - e.clientX, screen.y - e.clientY)
            : Math.hypot(target.x - p.x, target.y - p.y) * scale;
        };
        const match = Object.entries(points)
          .filter(([id]) => id !== w.a)
          .sort((a, b) => distance(a[1]) - distance(b[1]))[0];
        if (match && distance(match[1]) < Math.max(25 * scale, 26))
          connect(w.a, match[0]);
        else {
          setStart(w.a);
          setCursor(p);
        }
      } else contact(w.a);
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (d) {
      const part = circuit.parts.find((p) => p.id === d.id);
      if (!part) {
        setPreview(null);
        return;
      }
      if (d.moved) {
        const p = point(e.clientX, e.clientY);
        props.onAction({
          type: "move",
          id: d.id,
          x: p.x - d.offset.x,
          y: p.y - d.offset.y,
        });
      } else if (part.kind === "switch")
        props.onAction({ type: "toggle", id: d.id });
      setPreview(null);
      return;
    }
  }
  function cancel() {
    drag.current = null;
    wireDrag.current = null;
    setPreview(null);
    setCursor(null);
  }
  function grab(part: Part, e: ReactPointerEvent) {
    if (e.button !== 0 || !benchReady || props.suspended) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(part.id);
    setStart(null);
    setTool("wire");
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e.clientX, e.clientY);
    drag.current = {
      id: part.id,
      x: e.clientX,
      y: e.clientY,
      offset: { x: p.x - part.x, y: p.y - part.y },
      moved: false,
    };
  }
  function grabContact(id: string, e: ReactPointerEvent) {
    if (e.button !== 0 || !benchReady || props.suspended) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wireDrag.current = { a: id, x: e.clientX, y: e.clientY, moved: false };
    setCursor(points[id]);
  }
  useEffect(() => {
    const blur = () => {
      cancel();
      trayDrag.current = null;
      setStart(null);
    };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, []);
  useEffect(() => {
    if (props.suspended || !benchReady) {
      cancel();
      trayDrag.current = null;
      setStart(null);
    }
  }, [props.suspended, benchReady]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        window.document.querySelector("dialog[open]") ||
        !benchReady ||
        props.suspended
      )
        return;
      if (
        e.key === "Escape" &&
        (start ||
          selected ||
          tool !== "wire" ||
          drag.current ||
          wireDrag.current ||
          trayDrag.current)
      ) {
        cancel();
        trayDrag.current = null;
        e.preventDefault();
        e.stopImmediatePropagation();
        setStart(null);
        setSelected(null);
        setTool("wire");
        setCursor(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        latest.current.onAction({ type: "remove", id: selected });
        setSelected(null);
      }
      if (
        chosen &&
        !chosen.fixed &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)
      ) {
        e.preventDefault();
        latest.current.onAction({
          type: "move",
          id: chosen.id,
          x:
            chosen.x +
            (e.code === "ArrowRight" ? 10 : e.code === "ArrowLeft" ? -10 : 0),
          y:
            chosen.y +
            (e.code === "ArrowDown" ? 10 : e.code === "ArrowUp" ? -10 : 0),
        });
      }
      if (e.code === "KeyR" && chosen && !chosen.fixed) {
        e.preventDefault();
        latest.current.onAction({ type: "rotate", id: chosen.id });
      }
    };
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, [selected, start, chosen, tool, benchReady, props.suspended]);
  // A tray item can also be dragged directly onto the board.
  useEffect(() => {
    const release = (e: PointerEvent) => {
      const d = trayDrag.current;
      trayDrag.current = null;
      if (
        !d ||
        latest.current.suspended ||
        (latest.current.world && !latest.current.view?.ready) ||
        Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8
      )
        return;
      const r = board.current!.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        return;
      const p = point(e.clientX, e.clientY);
      latest.current.onAction({ type: "add", kind: d.kind, ...p });
      setTool("wire");
    };
    window.addEventListener("pointerup", release);
    return () => window.removeEventListener("pointerup", release);
  }, []);
  const held = wireDrag.current?.a ?? start;
  useEffect(() => {
    world?.setBenchInteraction({
      circuit: document,
      selected,
      lead:
        held && points[held] && cursor ? { a: points[held], b: cursor } : null,
    });
  }, [world, document, selected, held, points, cursor]);
  useEffect(() => () => world?.setBenchInteraction(null), [world]);
  const readout = chosen && result.parts[chosen.id];
  const instruction = !benchReady
    ? "Approaching workbench…"
    : held
      ? "Choose another contact to finish the wire"
      : tool !== "wire"
        ? `Place the ${PART_NAMES[tool].toLowerCase()} on the bench`
        : "Connect contacts. Follow the current.";
  // Native modal dialogs isolate background focus. Setting inert here would
  // blur the opener before the dialog can remember it for focus restoration.
  return (
    <section
      className={`circuit-lab ${fallback ? "" : "in-world"} ${restored ? "restored" : ""} ${result.tripped || overloaded ? "has-fault" : ""}`}
      aria-label={`Chamber ${chamber.number} circuit`}
      aria-busy={!benchReady}
    >
      <header className="lab-header">
        <button
          className="icon-button"
          onClick={props.onBack}
          aria-label="Leave circuit bench"
          title="Back · Esc"
        >
          <ArrowLeft />
        </button>
        <div className="chamber-id">
          <span className="chamber-number">{chamber.number}</span>
          <div className="mission-copy">
            <span className="ui-eyebrow">Asterion · Circuit lab</span>
            <h1>{chamber.name}</h1>
          </div>
        </div>
        <div className="lab-status-block">
          <div className="lab-state" role="status">
            {result.tripped ? <><Zap /><span>Short circuit</span></>
              : overloaded ? <><Zap /><span>Too much voltage</span></>
              : restored ? <><Check /><span>Power restored</span></>
                : <><span className="status-dot" /><span>Awaiting power</span></>}
          </div>
          <div className="chamber-progress" role="img" aria-label={`Chamber ${chamber.number} of 6`}>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={i < Number(chamber.number) - 1 || (restored && i === Number(chamber.number) - 1) ? "complete" : i === Number(chamber.number) - 1 ? "current" : ""} />
            ))}
          </div>
        </div>
        <button className="icon-button lab-notebook" onClick={props.onNotebook} aria-label="Open notebook" title="Notebook · N"><BookOpen /></button>
      </header>
      <div className="lab-objective">
        <Lightbulb aria-hidden="true" />
        <p>{result.tripped ? "Remove the short or undo your last connection." : overloaded ? "Adjust the circuit to bring each lamp to 6 V." : chamber.hint}</p>
      </div>
      <div className="bench-shell">
        <div
          className={`kit-board ${tool !== "wire" ? "placing" : ""} ${fallback ? "kit-fallback" : ""}`}
          ref={board}
          data-ready={benchReady}
          inert={!benchReady}
          style={
            !fallback && view
              ? {
                  left: view.left,
                  top: view.top,
                  width: view.width,
                  height: view.height,
                  visibility: benchReady ? "visible" : "hidden",
                }
              : !fallback
                ? { visibility: "hidden" }
                : undefined
          }
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!benchReady || e.button !== 0) return;
            if (tool !== "wire") {
              props.onAction({
                type: "add",
                kind: tool,
                ...point(e.clientX, e.clientY),
              });
              setTool("wire");
            } else {
              const picked = world?.pickBench(e.clientX, e.clientY);
              if (picked && points[picked]) {
                grabContact(picked, e);
                return;
              }
              const part = document.parts.find((part) => part.id === picked);
              if (part) {
                grab(part, e);
                return;
              }
              if (picked) {
                setSelected(picked);
                setStart(null);
                return;
              }
              setSelected(null);
              setStart(null);
              setCursor(null);
            }
          }}
        >
          {fallback && (
            <svg
              className="wire-layer"
              viewBox="0 0 900 500"
              aria-hidden="true"
            >
              <defs>
                <mask
                  id={maskId}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="900"
                  height="500"
                >
                  <rect width="900" height="500" fill="white" />
                  {document.parts.map((p) => (
                    <rect
                      key={p.id}
                      x={p.x - 63}
                      y={p.y - 36}
                      width="126"
                      height="72"
                      rx="5"
                      fill="black"
                      transform={`rotate(${(p.angle * 180) / Math.PI} ${p.x} ${p.y})`}
                    />
                  ))}
                </mask>
              </defs>
              {document.wires.map((w) => {
                const a = points[w.a],
                  b = points[w.b];
                if (!a || !b) return null;
                const current = result.wires[w.id] ?? 0;
                return (
                  <g key={w.id} mask={`url(#${maskId})`}>
                    <path
                      className={`wire-visible ${selected === w.id ? "selected" : ""}`}
                      d={cablePath(a, b)}
                    />
                    {Math.abs(current) > 0.005 && (
                      <path
                        className={`current-flow ${props.reducedMotion ? "still" : ""}`}
                        d={cablePath(a, b)}
                        style={{
                          animationDirection:
                            current > 0 ? "normal" : "reverse",
                          animationDuration: `${Math.max(0.65, 1.5 / Math.abs(current))}s`,
                        }}
                      />
                    )}
                    <path
                      className="wire-hit"
                      d={cablePath(a, b)}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelected(w.id);
                        setStart(null);
                      }}
                    />
                  </g>
                );
              })}
              {held && points[held] && cursor && (
                <path
                  className="wire-preview"
                  d={cablePath(points[held], cursor)}
                />
              )}
            </svg>
          )}
          {document.wires.map((w, i) => {
            const a = points[w.a],
              b = points[w.b];
            if (!a || !b) return null;
            const sag = Math.min(42, Math.hypot(a.x - b.x, a.y - b.y) * 0.13);
            return (
              <button
                key={w.id}
                className="wire-grip"
                style={position(
                  {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2 + sag * 0.75,
                  },
                  13,
                )}
                aria-label={`Select wire ${i + 1}`}
                onFocus={() => setSelected(w.id)}
                onClick={() => {
                  setSelected(w.id);
                  setStart(null);
                }}
              />
            );
          })}
          {document.parts.map((part) => (
            <div
              key={part.id}
              className={`part-wrap ${part.kind} ${chosen?.id === part.id ? "selected" : ""} ${part.kind === "bulb" && lampState(part, result).lit ? "lit" : ""} ${part.kind === "bulb" && lampState(part, result).overloaded ? "overloaded" : ""}`}
            >
              <button
                className="part-body"
                style={{
                  ...position(part, 32),
                  ...(!fallback
                    ? {
                        width: `${(Math.abs(Math.cos(part.angle)) * 130 + Math.abs(Math.sin(part.angle)) * 82) / 9}%`,
                        height: `${(Math.abs(Math.sin(part.angle)) * 130 + Math.abs(Math.cos(part.angle)) * 82) / 5}%`,
                      }
                    : {}),
                }}
                aria-label={
                  part.kind === "switch"
                    ? `${part.closed ? "Open" : "Close"} switch`
                    : `Select ${name(part)}`
                }
                onPointerDown={(e) => grab(part, e)}
                onClick={(e) => {
                  if (e.detail !== 0) return;
                  setSelected(part.id);
                  if (part.kind === "switch")
                    props.onAction({ type: "toggle", id: part.id });
                }}
              >
                <span className="fallback-part">
                  <PartIcon kind={part.kind} closed={part.closed} />
                </span>
                <span
                  className={`part-value ${Math.abs(Math.sin(part.angle)) > 0.7 ? "vertical" : ""}`}
                >
                  {part.kind === "battery"
                    ? `${part.value} V`
                    : part.kind === "bulb"
                      ? "6 V"
                      : part.kind === "resistor"
                        ? `${part.value} Ω`
                        : null}
                </span>
                {part.kind === "bulb" && (
                  <span
                    className="bulb-halo"
                    style={{
                      opacity: Math.min(
                        0.8,
                        lampState(part, result).brightness * 0.55,
                      ),
                    }}
                  />
                )}
              </button>
              {(["a", "b"] as const).map((end) => {
                const id = terminalId(part.id, end),
                  connected = document.wires.some(
                    (w) => w.a === id || w.b === id,
                  );
                return (
                  <button
                    key={end}
                    className={`terminal ${connected ? "connected" : "open"} ${held === id ? "armed" : ""}`}
                    style={position(points[id], 11)}
                    aria-label={terminalName(part, end)}
                    aria-pressed={held === id}
                    onPointerDown={(e) => grabContact(id, e)}
                    onClick={(e) => {
                      if (e.detail === 0) contact(id);
                    }}
                  >
                    <i />
                    {part.kind === "battery" && (
                      <span>{end === "a" ? "+" : "−"}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {fallback && tool !== "wire" && (
            <span className="placement-ghost" aria-hidden="true">
              <PartIcon kind={tool} />
            </span>
          )}
        </div>
        <div className="selection-bar" aria-live="polite" inert={!benchReady}>
          {selected && (
            <>
              <div className="selection-identity">
                <PartIcon kind={chosen?.kind ?? "wire"} />
                <span><small>{chosen?.fixed ? "Fixed component" : "Selected"}</small><strong>{chosen ? name(chosen) : "Wire"}</strong></span>
              </div>
              {chosen?.kind === "resistor" && (
                <div className="value-options" aria-label="Resistance">
                  {chamber.resistorValues.map((value) => (
                    <button
                      key={value}
                      aria-pressed={chosen.value === value}
                      onClick={() =>
                        props.onAction({ type: "value", id: chosen.id, value })
                      }
                    >
                      {value} Ω
                    </button>
                  ))}
                </div>
              )}
              {chamber.formula && readout && chosen?.kind !== "switch" && (
                <span className="meter">
                  <span><small>Voltage</small><strong>{readout.voltage.toFixed(1)} <em>V</em></strong></span>
                  <span><small>Current</small><strong>{Math.abs(readout.current).toFixed(2)} <em>A</em></strong></span>
                </span>
              )}
              {chosen && !chosen.fixed && (
                <button
                  className="icon-button"
                  aria-label={`Rotate ${PART_NAMES[chosen.kind]}`}
                  title="Rotate · R"
                  onClick={() =>
                    props.onAction({ type: "rotate", id: chosen.id })
                  }
                >
                  <RotateCw />
                </button>
              )}
              {!chosen?.fixed && (
                <button
                  className="icon-button"
                  aria-label={`Remove ${chosen ? PART_NAMES[chosen.kind] : "wire"}`}
                  title="Remove · Delete"
                  onClick={() => {
                    props.onAction({ type: "remove", id: selected });
                    setSelected(null);
                  }}
                >
                  <Trash2 />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <footer className="kit-toolbar" inert={!benchReady}>
        <div className="tool-instruction" role="status">
          <MousePointer2 aria-hidden="true" />
          <span>{instruction}</span>
        </div>
        <div className="tool-tray" aria-label="Circuit parts">
          {chamber.tools.map((kind) => {
            const remaining = kind === "wire" ? null : Math.max(0,
              (chamber.limits[kind] ?? 0) - circuit.parts.filter((p) => p.kind === kind).length);
            const full =
              kind !== "wire" &&
              circuit.parts.filter((p) => p.kind === kind).length >=
                (chamber.limits[kind] ?? 0);
            return (
              <button
                key={kind}
                className="kit-tool"
                aria-label={
                  kind === "wire" ? "Wire tool" : `Add ${PART_NAMES[kind]}`
                }
                aria-pressed={tool === kind}
                disabled={full}
                title={remaining === null ? "Connect two contacts" : `${PART_NAMES[kind]} · ${remaining} available`}
                onPointerDown={(e) => {
                  if (kind !== "wire")
                    trayDrag.current = { kind, x: e.clientX, y: e.clientY };
                }}
                onClick={(e) => {
                  if (kind !== "wire" && e.detail === 0) {
                    const locations =
                      kind === "battery"
                        ? [{ x: 250, y: 265 }]
                        : kind === "resistor"
                          ? [{ x: 450, y: 135 }]
                          : [
                              { x: 650, y: 275 },
                              { x: 450, y: 375 },
                            ];
                    const location =
                      locations[
                        Math.min(
                          circuit.parts.filter((p) => p.kind === kind).length,
                          locations.length - 1,
                        )
                      ];
                    props.onAction({ type: "add", kind, ...location });
                    setTool("wire");
                    return;
                  }
                  setTool(kind);
                  setSelected(null);
                  setStart(null);
                }}
              >
                <span className="tool-glyph"><PartIcon kind={kind} /></span>
                <span className="tool-name">{kind === "wire" ? "Wire" : PART_NAMES[kind]}</span>
                <span className="tool-stock" aria-hidden="true">{remaining === null ? "∞" : remaining}</span>
              </button>
            );
          })}
        </div>
        <div className="history-tools">
          <button
            className="icon-button"
            onClick={() => {
              props.onUndo();
              setSelected(null);
              setStart(null);
            }}
            disabled={!props.canUndo}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 />
            <span>Undo</span>
          </button>
          <button
            className="icon-button"
            onClick={() => {
              props.onReset();
              setSelected(null);
              setStart(null);
            }}
            aria-label="Reset circuit"
            title="Reset circuit"
          >
            <RotateCcw />
            <span>Reset</span>
          </button>
        </div>
      </footer>
    </section>
  );
}
