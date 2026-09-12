import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Play,
  Pause,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Dialog } from "./Dialog";
import { activity } from "./activities";
import type { LabId } from "./activities";
import { measure, rcAt, labChecks, labReady, OPTIONS } from "./labPhysics";
import type { Config, LabProgress, LabAction, Reading } from "./labPhysics";
import type { Sound } from "./audio";
const number = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toFixed(d) : "OPEN";
function readAloud(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.localService && v.lang.startsWith("en"));
  if (!voice) return;
  const line = new SpeechSynthesisUtterance(text);
  line.voice = voice;
  line.rate = 0.95;
  window.speechSynthesis.speak(line);
}
function Selector({
  title,
  field,
  p,
  send,
  labels,
  values,
}: {
  title: string;
  field: keyof Config;
  p: LabProgress;
  send: (a: LabAction) => void;
  labels?: string[];
  values?: readonly number[];
}) {
  const choices = values ?? OPTIONS[field];
  return (
    <fieldset className="instrument-selector">
      <legend>{title}</legend>
      <div>
        {choices.map((v, i) => (
          <button
            key={v}
            aria-pressed={p.config[field] === v}
            onClick={() => send({ type: "SET", key: field, value: v })}
          >
            {labels?.[i] ?? v}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function Resistor({
  x,
  y,
  label,
  value,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-60 0h20m80 0h20" />
      <rect
        x="-40"
        y="-17"
        width="80"
        height="34"
        rx="3"
        className="diagram-part"
      />
      <path d="M-25 0h50" opacity=".3" />
      <text y="-31" textAnchor="middle">
        {label}
      </text>
      <text y="39" textAnchor="middle" className="diagram-value">
        {value}
      </text>
    </g>
  );
}
function Capacitor({
  x,
  y,
  label,
  value,
  sideLabel = false,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  sideLabel?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-60 0h51m18 0h51M-9-26v52M9-26v52" />
      <text
        x={sideLabel ? -72 : 0}
        y={sideLabel ? -14 : -43}
        textAnchor={sideLabel ? "end" : "middle"}
      >
        {label}
      </text>
      <text y="45" textAnchor="middle" className="diagram-value">
        {value}
      </text>
      <text x="-26" y="-12">
        +
      </text>
      <text x="18" y="-12">
        −
      </text>
    </g>
  );
}
function Schematic({ id, p, r }: { id: LabId; p: LabProgress; r: Reading }) {
  const c = p.config;
  const cap = id === "storage" || id === "timing";
  const parallel = c.topology === 1;
  const active = p.tested || (id === "timing" && p.rc.voltage > 0.01);
  const source = id === "ohm" ? c.voltage : 12;
  return (
    <svg
      className={`instrument-diagram ${active ? "energized" : ""}`}
      viewBox="0 0 740 285"
      role="img"
      aria-label={`${activity(id).concept} schematic. Conventional current direction is shown; capacitor plates are separated by a dielectric.`}
    >
      <defs>
        <pattern
          id="instrument-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M20 0H0V20"
            stroke="#78968b"
            strokeWidth=".5"
            opacity=".13"
            fill="none"
          />
        </pattern>
      </defs>
      <rect
        width="740"
        height="285"
        fill="url(#instrument-grid)"
        stroke="none"
      />
      <g className="diagram-circuit">
        <path d="M95 130V75H220M95 155v70H660V75H580" />
        <path d="M77 130h36m-27 12h18m-27 13h36" />
        <text x="48" y="119">
          +
        </text>
        <text x="48" y="174">
          −
        </text>
        <text x="95" y="254" textAnchor="middle">
          {source} V DC
        </text>
        {id === "ohm" && (
          <>
            <path d="M220 75h100m120 0h140" />
            <Resistor
              x={380}
              y={75}
              label={["COPPER", "NICHROME", "CERAMIC"][c.material]}
              value={`${number(r.resistance)} Ω`}
            />
            <g className="sample-specimen">
              <rect x="233" y="145" width="290" height="27" rx="3" />
              <rect
                x="247"
                y={157 - Math.sqrt(c.area / 0.11) * 4}
                width={(238 * c.length) / 2.4}
                height={Math.sqrt(c.area / 0.11) * 8}
                className={`sample-${c.material}`}
              />
              <text x="380" y="203" textAnchor="middle">
                L {c.length} m · A {c.area} mm² · fixed temperature
              </text>
            </g>
          </>
        )}
        {id === "power" && (
          <>
            <Resistor
              x={230}
              y={75}
              label="INTERNAL r"
              value={`${c.internal} Ω`}
            />
            <path d="M290 75h35m120 0h25" />
            <Resistor x={385} y={75} label="BALLAST" value={`${c.ballast} Ω`} />
            <Resistor x={530} y={75} label="PUMP LOAD" value="6 Ω" />
            <text
              x="385"
              y="163"
              textAnchor="middle"
              className="diagram-equation"
            >
              +12 − {number(r.current * c.internal)} − {number(r.va)} −{" "}
              {number(r.vb)} = 0 V
            </text>
            <text x="385" y="190" textAnchor="middle">
              ENERGY BALANCE AROUND ONE LOOP
            </text>
          </>
        )}
        {id === "junction" && (
          <>
            {c.topology === 0 ? (
              <>
                <path d="M220 75h5m120 0h90m120 0h25" />
                <Resistor x={285} y={75} label="PRIMARY A" value={`${c.a} Ω`} />
                <Resistor x={495} y={75} label="RESERVE B" value={`${c.b} Ω`} />
                {!c.branch && (
                  <g>
                    <path d="M350 75h60" stroke="#0d1b16" strokeWidth="8" />
                    <path className="open-switch" d="M350 75l45-26" />
                  </g>
                )}
              </>
            ) : (
              <>
                <path d="M220 75h100m120 0h140M240 75v85h80m120 0h140V75" />
                <Resistor
                  x={380}
                  y={75}
                  label="PRIMARY A"
                  value={c.branch ? `${c.a} Ω` : "ISOLATED"}
                />
                {!c.branch && (
                  <g>
                    <path d="M260 75h44" stroke="#0d1b16" strokeWidth="8" />
                    <path className="open-switch" d="M260 75l36-22" />
                  </g>
                )}
                <Resistor
                  x={380}
                  y={160}
                  label="RESERVE B"
                  value={`${c.b} Ω`}
                />
                {c.topology === 2 && (
                  <>
                    <rect
                      x="153"
                      y="61"
                      width="40"
                      height="28"
                      className="diagram-part"
                    />
                    <text x="173" y="45" textAnchor="middle">
                      6 Ω feed
                    </text>
                  </>
                )}
              </>
            )}
            <text x="380" y="268" textAnchor="middle">
              {c.topology === 0
                ? `ONE PATH: I source = I A = I B = ${number(r.current)} A`
                : `I source ${number(r.current)} = I A ${number(r.ia)} + I B ${number(r.ib)} A`}
            </text>
          </>
        )}
        {id === "storage" && (
          <>
            {parallel ? (
              <>
                <path d="M220 75h100m120 0h140M245 75v85h75m120 0h140V75" />
                <Capacitor
                  x={380}
                  y={75}
                  label="C₁"
                  value={`${c.ca} mF · ${number(r.va, 1)} V`}
                />
                <Capacitor
                  x={380}
                  y={160}
                  label="C₂"
                  sideLabel
                  value={`${c.cb} mF · ${number(r.vb, 1)} V`}
                />
              </>
            ) : (
              <>
                <path d="M220 75h10m120 0h80m120 0h30" />
                <Capacitor
                  x={290}
                  y={75}
                  label="C₁"
                  value={`${c.ca} mF · ${number(r.va, 1)} V`}
                />
                {c.topology === 0 ? (
                  <Capacitor
                    x={490}
                    y={75}
                    label="C₂"
                    value={`${c.cb} mF · ${number(r.vb, 1)} V`}
                  />
                ) : (
                  <path d="M430 75h120" />
                )}
                <text x="380" y="174" textAnchor="middle">
                  {c.topology === 0
                    ? "SAME PLATE-CHARGE MAGNITUDE · VOLTAGES ADD"
                    : "SINGLE MODULE"}
                </text>
              </>
            )}
          </>
        )}
        {id === "timing" && (
          <>
            <path d="M220 75h35m120 0h90m120 0h15" />
            <Resistor x={315} y={75} label="R" value={`${c.resistance} Ω`} />
            <Capacitor
              x={525}
              y={75}
              label="RESERVE"
              value={`${c.capacitance} mF`}
            />
            <text
              x="385"
              y="161"
              textAnchor="middle"
              className="diagram-equation"
            >
              {p.rc.mode === "discharge"
                ? "SOURCE DISCONNECTED · RESISTIVE DISCHARGE LOOP"
                : p.rc.mode === "charge"
                  ? "SOURCE CONNECTED · CAPACITOR CHARGING"
                  : "SELECT CHARGE TO BEGIN"}
            </text>
            <text x="385" y="190" textAnchor="middle">
              {p.rc.mode === "discharge"
                ? "← Discharge current reverses through R"
                : "→ Conventional current · electrons drift the other way"}
            </text>
            {p.rc.mode === "discharge" && (
              <>
                <path d="M122 74l43-27" />
                <path d="M127 77h38" stroke="#10201e" strokeWidth="7" />
                <path d="M210 75v150" />
                <text x="143" y="196">
                  ISOLATED
                </text>
              </>
            )}
          </>
        )}
        {!cap && (
          <g>
            <circle cx="180" cy="225" r="14" fill="#0d1b16" />
            <text x="180" y="229" textAnchor="middle">
              A
            </text>
          </g>
        )}
        {id === "ohm" && (
          <g>
            <path d="M320 75v50h46m28 0h46V75" strokeDasharray="3 3" />
            <circle cx="380" cy="125" r="14" fill="#0d1b16" />
            <text x="380" y="129" textAnchor="middle">
              V
            </text>
          </g>
        )}
      </g>
      {!cap && (
        <text x="27" y="24" className="diagram-corner">
          {r.fuse
            ? "FUSE OPEN · > 2 A DEMAND"
            : "V METER ACROSS LOAD · A METER IN SERIES"}
        </text>
      )}
      {cap && (
        <text x="27" y="24" className="diagram-corner">
          CAPACITOR PLATES SEPARATE CHARGE · NO DC THROUGH DIELECTRIC
        </text>
      )}
    </svg>
  );
}
function Scope({ id, p }: { id: LabId; p: LabProgress }) {
  const [view, setView] = useState<"plot" | "data">("plot");
  const c = p.config;
  const tau = (c.resistance * c.capacitance) / 1000;
  const maxT = Math.max(2, tau * 5);
  const path = (mode: "charge" | "discharge") =>
    Array.from({ length: 81 }, (_, i) => {
      const t = (i / 80) * maxT;
      const v = rcAt(c, mode, mode === "charge" ? 0 : 12, t).voltage;
      return `${i ? "L" : "M"}${55 + (i / 80) * 585} ${121 - (v / 12) * 91}`;
    }).join(" ");
  const values = p.samples.slice(-5);
  return (
    <section className="scope">
      <header>
        <span>
          {id === "timing"
            ? "TRANSIENT RECORDER"
            : id === "ohm"
              ? "I–V CHARACTERISTIC"
              : "MEASUREMENT RECORDER"}
        </span>
        <div>
          <button
            aria-pressed={view === "plot"}
            onClick={() => setView("plot")}
          >
            Trace
          </button>
          <button
            aria-pressed={view === "data"}
            onClick={() => setView("data")}
          >
            Data ({p.samples.length})
          </button>
        </div>
      </header>
      {view === "data" ? (
        <table>
          <thead>
            <tr>
              <th>Trial</th>
              <th>Configuration</th>
              <th>Reading</th>
            </tr>
          </thead>
          <tbody>
            {values.length ? (
              values.map((s, i) => {
                const r = measure(id, s.config);
                return (
                  <tr key={i}>
                    <td>{p.samples.length - values.length + i + 1}</td>
                    <td>
                      {id === "ohm"
                        ? `${s.config.voltage} V / ${number(r.resistance)} Ω`
                        : id === "storage"
                          ? ["Series", "Parallel", "Single"][s.config.topology]
                          : id === "timing"
                            ? `${s.config.resistance} Ω · ${s.config.capacitance} mF`
                            : id === "power"
                              ? `${s.config.ballast} Ω ballast`
                              : `${["Series", "Parallel", "Shared feed"][s.config.topology]} · A ${s.config.branch ? "on" : "off"}`}
                    </td>
                    <td>
                      {id === "timing"
                        ? `${number(rcAt(s.config, "discharge", s.start!, 2).voltage)} V at 2 s`
                        : id === "storage"
                          ? `${number(r.capacitance * 1000, 1)} mF / ${number(r.energy)} J`
                          : `${number(r.current)} A${id === "power" ? ` / ${number(r.vb)} V load` : ""}`}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3}>Test the equipment to record a measurement.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : id === "timing" ? (
        <svg
          viewBox="0 0 710 153"
          role="img"
          aria-label="Capacitor voltage against time: rising charge curve, falling discharge curve, and current observation"
        >
          <path
            className="scope-grid"
            d="M55 30H640M55 75H640M55 121H640M55 30v91M172 30v91M289 30v91M406 30v91M523 30v91M640 30v91"
          />
          <path className="scope-charge" d={path("charge")} />
          <path className="scope-discharge" d={path("discharge")} />
          <path className="scope-tau" d={`M${55 + (tau / maxT) * 585} 25v96`} />
          <text x={55 + (tau / maxT) * 585 + 5} y="25">
            τ = {number(tau, 1)} s
          </text>
          <text x="8" y="34">
            12 V
          </text>
          <text x="15" y="79">
            6 V
          </text>
          <text x="26" y="125">
            0
          </text>
          <text x="52" y="145">
            0
          </text>
          <text x="596" y="145">
            {number(maxT, 1)} s
          </text>
          <text x="330" y="25">
            CHARGE
          </text>
          <text x="465" y="110">
            DISCHARGE FROM 12 V
          </text>
          {p.rc.mode !== "idle" && (
            <circle
              cx={55 + (Math.min(maxT, p.rc.time) / maxT) * 585}
              cy={121 - (p.rc.voltage / 12) * 91}
              r="5"
              className="scope-dot"
            />
          )}
        </svg>
      ) : id === "ohm" ? (
        <svg
          viewBox="0 0 710 153"
          role="img"
          aria-label="Measured current against source voltage. Only the current specimen is plotted."
        >
          <path
            className="scope-grid"
            d="M55 25H640M55 73H640M55 121H640M55 25v96M202 25v96M348 25v96M494 25v96M640 25v96"
          />
          <text x="12" y="30">
            2 A
          </text>
          <text x="12" y="77">
            1 A
          </text>
          <text x="20" y="125">
            0
          </text>
          <text x="48" y="145">
            0 V
          </text>
          <text x="330" y="145">
            6 V
          </text>
          <text x="610" y="145">
            12 V
          </text>
          {p.samples
            .filter(
              (s) =>
                s.config.material === c.material &&
                s.config.length === c.length &&
                s.config.area === c.area,
            )
            .map((s, i) => {
              const r = measure(id, s.config);
              return (
                <circle
                  key={i}
                  cx={55 + (s.config.voltage / 12) * 585}
                  cy={121 - (r.current / 2) * 96}
                  r="5"
                  className="scope-dot"
                />
              );
            })}
          <text x="230" y="21">
            KEEP SAMPLE FIXED · CHANGE ONLY VOLTAGE
          </text>
        </svg>
      ) : (
        <div className="instrument-observation">
          <span>
            {p.tested ? "OBSERVATION" : "TRY A CONTROLLED COMPARISON"}
          </span>
          <p>
            {id === "power"
              ? "Follow one coulomb around the loop: the 12 J supplied are transferred in the internal resistor, ballast and pump. The current is the same through all three."
              : id === "junction"
                ? "In series, the same current passes through A and B. In parallel, compare source current with the sum of branch currents. Isolate A and observe B’s voltage."
                : "Series modules share charge and divide voltage. Parallel modules each see 12 V and store more total energy. Record both to compare the bank."}
          </p>
        </div>
      )}
    </section>
  );
}
export function LabWorkbench({
  id,
  p,
  onAction,
  onComplete,
  onClose,
  completed,
  blocked,
  play,
}: {
  id: LabId;
  p: LabProgress;
  onAction: (a: LabAction) => void;
  onComplete: () => void;
  onClose: () => void;
  completed: boolean;
  blocked: string;
  play: (s: Sound) => void;
}) {
  const [hasVoice, setHasVoice] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const check = () =>
      setHasVoice(
        window.speechSynthesis
          .getVoices()
          .some((v) => v.localService && v.lang.startsWith("en")),
      );
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, []);
  const a = activity(id),
    r = measure(id, p.config),
    rc = rcAt(p.config, p.rc.mode, p.rc.start, p.rc.time),
    checks = labChecks(id, p),
    ready = labReady(id, p);
  const latest = useRef(onAction);
  latest.current = onAction;
  useEffect(() => {
    if (id !== "timing" || !p.rc.running) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden)
        latest.current({
          type: "ADVANCE",
          seconds: Math.min((now - previous) / 1000, 0.5),
        });
      previous = now;
    }, 100);
    return () => clearInterval(timer);
  }, [id, p.rc.running]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  const send = (action: LabAction) => {
    onAction(action);
    play(
      action.type === "TEST"
        ? "test"
        : action.type === "OUTAGE"
          ? "fault"
          : "soft",
    );
  };
  const selector = (
    title: string,
    field: keyof Config,
    labels?: string[],
    values?: readonly number[],
  ) => (
    <Selector
      title={title}
      field={field}
      p={p}
      send={send}
      labels={labels}
      values={values}
    />
  );
  let observation = a.guide;
  if (p.tested) {
    if (id === "ohm")
      observation = r.fuse
        ? "The specimen demanded more than 2 A. The virtual fuse opened. Use a higher-resistance sample, then test again."
        : r.current === 0
          ? "The ceramic sample is an insulator in this model. Voltage is present, but there is no conducting return."
          : `Measured ${number(r.current)} A at ${p.config.voltage} V. ${checks[0].ok ? "The comparison is recorded." : "Keep this specimen and test a different voltage to compare."}`;
    else if (id === "timing")
      observation = ready
        ? "The charged bank kept the latch alive through the outage. Look at the graph: voltage falls continuously while the capacitor supplies energy."
        : "The latch lost its voltage reserve. Increase R or C to slow discharge, recharge, and try the outage again.";
    else
      observation = ready
        ? a.discovery
        : "The measurement is recorded. Check the highlighted requirements and change one control to investigate.";
  }
  const meters =
    id === "ohm"
      ? [
          ["SOURCE", `${number(p.config.voltage, 1)} V`],
          ["CURRENT", `${number(r.current)} A`],
          ["RESISTANCE", `${number(r.resistance)} Ω`],
          ["LOAD POWER", `${number(r.power)} W`],
        ]
      : id === "power"
        ? [
            ["TERMINAL", `${number(12 - r.current * p.config.internal)} V`],
            ["PUMP", `${number(r.vb)} V`],
            ["CURRENT", `${number(r.current)} A`],
            ["PUMP POWER", `${number(r.power)} W`],
          ]
        : id === "junction"
          ? [
              ["SOURCE I", `${number(r.current)} A`],
              ["BRANCH A", `${number(r.ia)} A`],
              ["BRANCH B", `${number(r.ib)} A`],
              ["B VOLTAGE", `${number(r.vb)} V`],
            ]
          : id === "storage"
            ? [
                ["BANK", `${number(r.capacitance * 1000, 1)} mF`],
                ["BANK |Q|", `${number(r.charge * 1000, 1)} mC`],
                ["ENERGY", `${number(r.energy)} J`],
                ["MODULE 2", `${number(r.vb, 1)} V`],
              ]
            : [
                ["CAPACITOR", `${number(p.rc.voltage)} V`],
                ["CURRENT", `${number(rc.current * 1000, 1)} mA`],
                ["PLATE Q", `${number(rc.charge * 1000, 1)} mC`],
                ["ELAPSED", `${number(p.rc.time, 1)} s`],
              ];
  return (
    <Dialog
      title={`${a.name} instruments`}
      className={`lab-dialog lab-${id}`}
      onClose={onClose}
    >
      <header className="lab-header">
        <div>
          <span>{a.code} / MAINTENANCE TERMINAL</span>
          <h1>{a.system}</h1>
        </div>
        <div className="lab-location">
          {a.name}
          <small>
            {completed ? "SYSTEM COMMISSIONED" : "LOCAL DIAGNOSTIC MODE"}
          </small>
        </div>
      </header>
      <div className="lab-body">
        <main className="lab-main">
          <div className="instrument-face">
            <div className="instrument-topline">
              <span>ISOLATED TEST EQUIPMENT</span>
              <span>
                {id === "timing"
                  ? p.rc.mode.toUpperCase()
                  : p.tested
                    ? "MEASUREMENT RECORDED"
                    : "PREVIEW · TEST TO RECORD"}
              </span>
            </div>
            <Schematic id={id} p={p} r={r} />
            <div className="instrument-meters">
              {meters.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <Scope id={id} p={p} />
          <div className="lab-narration" role="status">
            <span>MAINTENANCE GUIDE</span>
            <p>{observation}</p>
            <button
              aria-label={
                hasVoice
                  ? "Read guidance aloud"
                  : "No local English voice available; guidance is shown in text"
              }
              disabled={!hasVoice}
              onClick={() => readAloud(observation)}
            >
              <Volume2 size={17} />
            </button>
          </div>
        </main>
        <aside className="lab-controls">
          <h2>{a.goal}</h2>
          {id === "ohm" && (
            <>
              {selector("Source voltage", "voltage", [
                "3 V",
                "6 V",
                "9 V",
                "12 V",
              ])}
              {selector("Specimen material", "material", [
                "Copper",
                "Nichrome",
                "Ceramic",
              ])}
              {selector("Specimen length", "length", [
                "0.6 m",
                "1.2 m",
                "2.4 m",
              ])}
              {selector("Cross-sectional area", "area", [
                "0.055 mm²",
                "0.11 mm²",
                "0.22 mm²",
              ])}
            </>
          )}
          {id === "power" && (
            <>
              {selector("Ballast resistor", "ballast", [
                "0 Ω",
                "3 Ω",
                "5 Ω",
                "6 Ω",
                "12 Ω",
              ])}
              {selector("Source internal resistance", "internal", [
                "Ideal · 0 Ω",
                "1 Ω",
                "2 Ω",
              ])}
              <div className="formula-note">
                <span>FOLLOW THE ENERGY</span>
                <p>12 V emf = internal drop + ballast drop + pump drop.</p>
                <b>{number(r.sourcePower)} W supplied</b>
                <small>
                  {number(r.loss)} W internal + {number(r.current * r.va)} W
                  ballast + {number(r.power)} W pump
                </small>
              </div>
            </>
          )}
          {id === "junction" && (
            <>
              {selector("Network routing", "topology", [
                "Series",
                "Parallel",
                "Shared 6 Ω",
              ])}
              {selector("Primary load A", "a", ["12 Ω", "24 Ω", "48 Ω"])}
              {selector("Reserve load B", "b", ["12 Ω", "24 Ω", "48 Ω"])}
              {selector("Primary isolator", "branch", [
                "A isolated",
                "A connected",
              ])}
            </>
          )}
          {id === "storage" && (
            <>
              {selector("Bank arrangement", "topology", [
                "Series",
                "Parallel",
                "Single",
              ])}
              {selector("Module C₁", "ca", ["10 mF", "20 mF", "40 mF"])}
              {selector("Module C₂", "cb", ["10 mF", "20 mF", "40 mF"])}
              <div className="formula-note">
                <b>Q = CV · E = ½CV²</b>
                <small>
                  Q is the magnitude on one plate. The two plates carry +Q and
                  −Q.
                </small>
              </div>
            </>
          )}
          {id === "timing" && (
            <>
              {selector("Resistive test load", "resistance", [
                "100 Ω",
                "200 Ω",
                "400 Ω",
              ])}
              {selector("Reserve capacitor", "capacitance", [
                "10 mF",
                "20 mF",
                "40 mF",
                "80 mF",
              ])}
              <div className="rc-controls">
                <button onClick={() => send({ type: "CHARGE" })}>
                  <Play size={13} />
                  Charge
                </button>
                <button onClick={() => send({ type: "STEADY" })}>
                  Advance to 5τ
                </button>
                <button
                  onClick={() => send({ type: "PAUSE" })}
                  disabled={p.rc.mode === "idle"}
                >
                  {p.rc.running ? <Pause size={13} /> : <Play size={13} />}{" "}
                  {p.rc.running ? "Pause" : "Continue"}
                </button>
                <button
                  onClick={() => send({ type: "ADVANCE", seconds: 1 })}
                  disabled={p.rc.mode === "idle"}
                >
                  +1 s
                </button>
              </div>
              <p className="rc-time-note">
                τ = RC = {number(rc.tau, 1)} s. “Advance to 5τ” skips simulation
                time; it does not charge instantaneously.
              </p>
            </>
          )}
          <ul className="repair-requirements">
            {checks.map((check, i) => (
              <li key={i} className={check.ok ? "satisfied" : ""}>
                {check.ok ? (
                  <Check size={15} />
                ) : (
                  <span className="requirement-dot" />
                )}
                <span>{check.text}</span>
              </li>
            ))}
          </ul>
          <button
            className="primary-action lab-test"
            onClick={() => send({ type: id === "timing" ? "OUTAGE" : "TEST" })}
          >
            <Play size={16} />
            {id === "timing" ? "Run 2 s outage test" : "Test & record"}
          </button>
          {(ready || completed) && (
            <button
              className="primary-action lab-commission"
              disabled={!!blocked && !completed}
              onClick={onComplete}
            >
              {completed ? "Return to station" : "Commission system"}
              <ArrowRight size={16} />
            </button>
          )}
          {blocked && (
            <p className="lab-blocked">
              You can experiment now. To commission: {blocked}
            </p>
          )}
        </aside>
      </div>
      <footer className="lab-footer">
        <span>
          {a.concept} <b>·</b> AP PHYSICS 2 / {a.topics}
        </span>
        <button onClick={() => send({ type: "RESET" })}>
          <RotateCcw size={13} />
          Reset equipment
        </button>
      </footer>
    </Dialog>
  );
}
