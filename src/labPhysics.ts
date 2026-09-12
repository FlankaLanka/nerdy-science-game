import type { LabId } from "./activities.ts";
export type Config = {
  voltage: number;
  material: number;
  length: number;
  area: number;
  ballast: number;
  internal: number;
  topology: number;
  a: number;
  b: number;
  branch: number;
  ca: number;
  cb: number;
  resistance: number;
  capacitance: number;
};
export const OPTIONS: Record<keyof Config, readonly number[]> = {
  voltage: [3, 6, 9, 12],
  material: [0, 1, 2],
  length: [0.6, 1.2, 2.4],
  area: [0.055, 0.11, 0.22],
  ballast: [0, 3, 5, 6, 12],
  internal: [0, 1, 2],
  topology: [0, 1, 2],
  a: [12, 24, 48],
  b: [12, 24, 48],
  branch: [0, 1],
  ca: [10, 20, 40],
  cb: [10, 20, 40],
  resistance: [100, 200, 400],
  capacitance: [10, 20, 40, 80],
};
export const defaultConfig = (): Config => ({
  voltage: 6,
  material: 2,
  length: 1.2,
  area: 0.11,
  ballast: 0,
  internal: 1,
  topology: 0,
  a: 24,
  b: 12,
  branch: 1,
  ca: 20,
  cb: 20,
  resistance: 100,
  capacitance: 10,
});
export function sanitizeConfig(raw: unknown): Config {
  const c = defaultConfig();
  if (raw && typeof raw === "object")
    for (const key of Object.keys(c) as (keyof Config)[]) {
      const value = (raw as Config)[key];
      if (OPTIONS[key].includes(value)) c[key] = value;
    }
  return c;
}
export type Reading = {
  voltage: number;
  current: number;
  resistance: number;
  va: number;
  vb: number;
  ia: number;
  ib: number;
  power: number;
  energy: number;
  sourcePower: number;
  loss: number;
  charge: number;
  capacitance: number;
  fuse: boolean;
};
export function measure(id: LabId, c: Config): Reading {
  const r: Reading = {
    voltage: 0,
    current: 0,
    resistance: 0,
    va: 0,
    vb: 0,
    ia: 0,
    ib: 0,
    power: 0,
    energy: 0,
    sourcePower: 0,
    loss: 0,
    charge: 0,
    capacitance: 0,
    fuse: false,
  };
  if (id === "ohm") {
    r.voltage = c.voltage;
    r.resistance =
      c.material === 2
        ? Infinity
        : ((c.material === 0 ? 1.68e-8 : 1.1e-6) * c.length) / (c.area * 1e-6);
    const i = c.voltage / r.resistance;
    r.fuse = i > 2;
    r.current = r.fuse ? 0 : i;
    r.va = r.fuse ? 0 : c.voltage;
    r.power = r.va * r.current;
  }
  if (id === "power") {
    r.voltage = 12;
    r.resistance = 6 + c.ballast + c.internal;
    r.current = 12 / r.resistance;
    r.va = r.current * c.ballast;
    r.vb = r.current * 6;
    r.ia = r.ib = r.current;
    r.power = r.current * r.vb;
    r.sourcePower = 12 * r.current;
    r.loss = r.current * r.current * c.internal;
  }
  if (id === "junction") {
    r.voltage = 12;
    const on = c.branch === 1;
    if (c.topology === 0) {
      r.resistance = on ? c.a + c.b : Infinity;
      r.current = 12 / r.resistance;
      r.ia = r.ib = r.current;
      r.va = r.ia * c.a;
      r.vb = r.ib * c.b;
    } else {
      const parallel = on ? 1 / (1 / c.a + 1 / c.b) : c.b;
      const feed = c.topology === 2 ? 6 : 0;
      r.resistance = parallel + feed;
      r.current = 12 / r.resistance;
      r.vb = 12 - r.current * feed;
      r.va = on ? r.vb : 0;
      r.ia = on ? r.va / c.a : 0;
      r.ib = r.vb / c.b;
    }
    r.power = r.va * r.ia + r.vb * r.ib;
    r.sourcePower = 12 * r.current;
  }
  if (id === "storage") {
    r.voltage = 12;
    const a = c.ca / 1000,
      b = c.cb / 1000;
    r.capacitance =
      c.topology === 0 ? 1 / (1 / a + 1 / b) : c.topology === 1 ? a + b : a;
    r.charge = r.capacitance * 12;
    r.va = c.topology === 0 ? r.charge / a : 12;
    r.vb = c.topology === 0 ? r.charge / b : c.topology === 1 ? 12 : 0;
    r.energy = 0.5 * r.capacitance * 144;
  }
  return r;
}
export type RCMode = "idle" | "charge" | "discharge";
export type RCState = {
  mode: RCMode;
  time: number;
  start: number;
  voltage: number;
  running: boolean;
};
export const initialRC = (): RCState => ({
  mode: "idle",
  time: 0,
  start: 0,
  voltage: 0,
  running: false,
});
/** Exact first-order response, not frame-integrated Euler drift. C input is mF. */
export function rcAt(c: Config, mode: RCMode, start: number, time: number) {
  const tau = (c.resistance * c.capacitance) / 1000;
  const target = mode === "charge" ? 12 : 0;
  const voltage =
    mode === "idle"
      ? start
      : target + (start - target) * Math.exp(-Math.max(0, time) / tau);
  return {
    voltage,
    current: (target - voltage) / c.resistance,
    charge: (c.capacitance / 1000) * voltage,
    energy: ((0.5 * c.capacitance) / 1000) * voltage * voltage,
    tau,
  };
}
export type Sample = {
  config: Config;
  mode?: RCMode;
  start?: number;
  time?: number;
};
export type LabProgress = {
  config: Config;
  samples: Sample[];
  tested: boolean;
  rc: RCState;
};
export const initialLab = (): LabProgress => ({
  config: defaultConfig(),
  samples: [],
  tested: false,
  rc: initialRC(),
});
export type LabAction =
  | { type: "SET"; key: keyof Config; value: number }
  | { type: "TEST" }
  | { type: "CHARGE" }
  | { type: "OUTAGE" }
  | { type: "ADVANCE"; seconds: number }
  | { type: "STEADY" }
  | { type: "PAUSE" }
  | { type: "RESET" };
const same = (a: Config, b: Config) => JSON.stringify(a) === JSON.stringify(b);
export function updateLab(
  id: LabId,
  p: LabProgress,
  action: LabAction,
): LabProgress {
  if (action.type === "RESET") return { ...initialLab(), samples: p.samples };
  if (action.type === "SET") {
    if (!OPTIONS[action.key]?.includes(action.value)) return p;
    return {
      ...p,
      config: { ...p.config, [action.key]: action.value },
      tested: false,
      rc: initialRC(),
    };
  }
  if (action.type === "TEST" && id !== "timing")
    return {
      ...p,
      tested: true,
      samples: [...p.samples, { config: { ...p.config } }].slice(-48),
    };
  if (id !== "timing") return p;
  if (action.type === "CHARGE")
    return {
      ...p,
      tested: false,
      rc: {
        mode: "charge",
        time: 0,
        start: p.rc.voltage,
        voltage: p.rc.voltage,
        running: true,
      },
    };
  if (action.type === "OUTAGE")
    return {
      ...p,
      tested: false,
      rc: {
        mode: "discharge",
        time: 0,
        start: p.rc.voltage,
        voltage: p.rc.voltage,
        running: true,
      },
    };
  if (action.type === "PAUSE")
    return {
      ...p,
      rc: { ...p.rc, running: !p.rc.running && p.rc.mode !== "idle" },
    };
  if (action.type === "STEADY") {
    const v = rcAt(
      p.config,
      "charge",
      p.rc.voltage,
      (5 * p.config.resistance * p.config.capacitance) / 1000,
    ).voltage;
    return {
      ...p,
      tested: false,
      rc: {
        mode: "charge",
        start: p.rc.voltage,
        time: (5 * p.config.resistance * p.config.capacitance) / 1000,
        voltage: v,
        running: false,
      },
    };
  }
  if (
    action.type === "ADVANCE" &&
    p.rc.mode !== "idle" &&
    Number.isFinite(action.seconds) &&
    action.seconds > 0
  ) {
    const end =
      p.rc.mode === "discharge"
        ? 2
        : (5 * p.config.resistance * p.config.capacitance) / 1000;
    const time = Math.min(end, p.rc.time + Math.min(action.seconds, 1));
    const m = rcAt(p.config, p.rc.mode, p.rc.start, time);
    const done = p.rc.mode === "discharge" && time >= 2;
    return {
      ...p,
      tested: done,
      rc: {
        ...p.rc,
        time,
        voltage: m.voltage,
        running: time < end && p.rc.running,
      },
      samples:
        done && !p.tested
          ? [
              ...p.samples,
              {
                config: { ...p.config },
                mode: "discharge" as const,
                start: p.rc.start,
                time,
              },
            ].slice(-48)
          : p.samples,
    };
  }
  return p;
}
export function labChecks(
  id: LabId,
  p: LabProgress,
): { text: string; ok: boolean }[] {
  const r = measure(id, p.config);
  const tested = p.tested;
  if (id === "ohm") {
    const readings = p.samples.filter(
      (s) =>
        s.config.material === p.config.material &&
        s.config.length === p.config.length &&
        s.config.area === p.config.area &&
        !measure(id, s.config).fuse &&
        measure(id, s.config).current > 0,
    );
    return [
      {
        text: "Record the same conducting sample at two different voltages",
        ok: new Set(readings.map((s) => s.config.voltage)).size >= 2,
      },
      {
        text: "Supply 6 V with current between 0.45 and 0.55 A",
        ok:
          tested &&
          p.config.voltage === 6 &&
          r.current >= 0.45 &&
          r.current <= 0.55,
      },
    ];
  }
  if (id === "power")
    return [
      {
        text: "Measure 5.9–6.1 V across the 6 Ω pump controller",
        ok: tested && Math.abs(r.vb - 6) <= 0.1,
      },
    ];
  if (id === "junction")
    return [
      {
        text: "Record both loads operating at 12 V",
        ok: p.samples.some(
          (s) => s.config.topology === 1 && s.config.branch === 1,
        ),
      },
      {
        text: "Isolate A and measure B still at 12 V",
        ok: tested && p.config.branch === 0 && Math.abs(r.vb - 12) < 0.001,
      },
    ];
  if (id === "storage")
    return [
      {
        text: "Compare the same modules in series and parallel",
        ok: [0, 1].every((t) =>
          p.samples.some(
            (s) =>
              s.config.topology === t &&
              s.config.ca === p.config.ca &&
              s.config.cb === p.config.cb,
          ),
        ),
      },
      {
        text: "Store ≥ 2.5 J; neither module exceeds 12 V",
        ok: tested && r.energy >= 2.5 && r.va <= 12 && r.vb <= 12,
      },
    ];
  return [
    {
      text: "Start the outage with a charged bank (at least 10.8 V)",
      ok: p.rc.mode === "discharge" && p.rc.start >= 10.8,
    },
    {
      text: "After 2 s disconnected, retain at least 6 V",
      ok:
        tested &&
        p.rc.mode === "discharge" &&
        p.rc.time >= 2 &&
        p.rc.voltage >= 6,
    },
  ];
}
export const labReady = (id: LabId, p: LabProgress) =>
  labChecks(id, p).every((c) => c.ok);
export function restoreLab(id: LabId, raw: unknown): LabProgress {
  const p = initialLab();
  if (!raw || typeof raw !== "object") return p;
  const d = raw as LabProgress;
  p.config = sanitizeConfig(d.config);
  p.samples = Array.isArray(d.samples)
    ? d.samples.slice(-48).flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const config = sanitizeConfig(s.config);
        if (id !== "timing") return [{ config }];
        if (
          s.mode !== "discharge" ||
          !Number.isFinite(s.start) ||
          s.start! < 0 ||
          s.start! > 12 ||
          s.time !== 2
        )
          return [];
        return [
          { config, mode: "discharge" as const, start: s.start, time: 2 },
        ];
      })
    : [];
  const last = p.samples.at(-1);
  if (id !== "timing")
    p.tested = d.tested === true && !!last && same(last.config, p.config);
  else if (last && same(last.config, p.config) && d.tested === true) {
    p.tested = true;
    p.rc = {
      mode: "discharge",
      time: 2,
      start: last.start!,
      voltage: rcAt(p.config, "discharge", last.start!, 2).voltage,
      running: false,
    };
  }
  return p;
}
