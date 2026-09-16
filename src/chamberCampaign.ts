import { CHAMBERS, CHAMBER_IDS, FORMULAS, isRestored } from "./chambers.ts";
import type { ChamberId, FormulaId } from "./chambers.ts";
import { cloneCircuit, editCircuit, endpoints } from "./circuitKit.ts";
import type { Circuit, KitAction, Part } from "./circuitKit.ts";

export const SAVE_KEY = "signal.asterion.chambers.v1";
export type Campaign = {
  version: 1;
  rooms: Circuit[];
  proofs: (Circuit | null)[];
  visited: ChamberId[];
  formulas: FormulaId[];
  heard: string[];
  sound: boolean;
  reducedMotion: boolean;
  history: Circuit[][];
};
export function initialCampaign(): Campaign {
  return {
    version: 1,
    rooms: CHAMBERS.map((c) => cloneCircuit(c.initial)),
    proofs: CHAMBERS.map(() => null),
    visited: [],
    formulas: [],
    heard: [],
    sound: true,
    reducedMotion: false,
    history: CHAMBERS.map(() => []),
  };
}
export const completedIds = (state: Campaign) =>
  CHAMBER_IDS.filter((_, i) => !!state.proofs[i]);
/** Discovery is remembered; door power always follows the current circuit. */
export const poweredIds = (state: Campaign) =>
  CHAMBER_IDS.filter((id, i) => !!state.proofs[i] && isRestored(id, state.rooms[i]));
/** First unfinished chamber on the normal route; bench interaction is independent. */
export function unlockedIndex(state: Campaign) {
  const i = state.proofs.findIndex((p) => !p);
  return i < 0 ? CHAMBERS.length : i;
}
export type CampaignAction =
  | { type: "EDIT"; room: number; action: KitAction }
  | { type: "UNDO"; room: number }
  | { type: "RESET_CIRCUIT"; room: number }
  | { type: "VISIT"; id: ChamberId }
  | { type: "DISCOVER_FORMULA"; id: FormulaId }
  | { type: "HEARD"; id: string }
  | { type: "SOUND" }
  | { type: "MOTION" }
  | { type: "NEW_GAME" };
export function campaignReducer(
  state: Campaign,
  action: CampaignAction,
): Campaign {
  if (action.type === "NEW_GAME")
    return {
      ...initialCampaign(),
      sound: state.sound,
      reducedMotion: state.reducedMotion,
    };
  if (action.type === "SOUND") return { ...state, sound: !state.sound };
  if (action.type === "MOTION")
    return { ...state, reducedMotion: !state.reducedMotion };
  if (action.type === "DISCOVER_FORMULA")
    return !Object.hasOwn(FORMULAS, action.id) || state.formulas.includes(action.id)
      ? state
      : { ...state, formulas: [...state.formulas, action.id] };
  if (action.type === "VISIT") {
    if (
      !CHAMBER_IDS.includes(action.id) ||
      state.visited.includes(action.id)
    )
      return state;
    return { ...state, visited: [...state.visited, action.id] };
  }
  if (action.type === "HEARD")
    return state.heard.includes(action.id)
      ? state
      : { ...state, heard: [...state.heard, action.id].slice(-512) };
  const index = action.room;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= CHAMBERS.length
  )
    return state;
  const rooms = [...state.rooms],
    history = state.history.map((list) => [...list]),
    proofs = [...state.proofs];
  if (action.type === "UNDO") {
    const previous = history[index].pop();
    if (!previous) return state;
    rooms[index] = previous;
  } else {
    const next =
      action.type === "RESET_CIRCUIT"
        ? cloneCircuit(CHAMBERS[index].initial)
        : editCircuit(rooms[index], action.action, CHAMBERS[index]);
    if (next === rooms[index]) return state;
    history[index] = [...history[index], rooms[index]].slice(-32);
    rooms[index] = next;
  }
  // Keep first completion for discovery and narration, independent of live power.
  if (!proofs[index] && isRestored(CHAMBERS[index].id, rooms[index]))
    proofs[index] = cloneCircuit(rooms[index]);
  return { ...state, rooms, history, proofs };
}
export function serializeCampaign(state: Campaign) {
  const { history: _history, ...saved } = state;
  return JSON.stringify(saved);
}

function sanitizeCircuit(raw: unknown, index: number): Circuit {
  const c = CHAMBERS[index],
    fallback = cloneCircuit(c.initial);
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Partial<Circuit>;
  if (!Array.isArray(data.parts) || !Array.isArray(data.wires)) return fallback;
  const parts: Part[] = fallback.parts.map((original) => {
    const saved = data.parts!.find((p) => p && p.id === original.id);
    return {
      ...original,
      ...(original.kind === "switch" && typeof saved?.closed === "boolean"
        ? { closed: saved.closed }
        : {}),
    };
  });
  const ids = new Set(parts.map((p) => p.id));
  for (const p of data.parts.slice(0, 12)) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[a-z][a-z0-9-]{0,31}$/.test(p.id) ||
      ids.has(p.id) ||
      !c.tools.includes(p.kind) ||
      ![p.x, p.y, p.angle].every(Number.isFinite)
    )
      continue;
    if (
      parts.filter((v) => v.kind === p.kind).length >= (c.limits[p.kind] ?? 0)
    )
      continue;
    if (!["battery", "bulb", "resistor", "switch"].includes(p.kind)) continue;
    ids.add(p.id);
    parts.push({
      id: p.id,
      kind: p.kind,
      x: Math.max(105, Math.min(795, p.x)),
      y: Math.max(105, Math.min(395, p.y)),
      angle: p.angle % (2 * Math.PI),
      value:
        p.kind === "battery"
          ? c.voltage
          : p.kind === "resistor"
            ? c.resistorValues.includes(p.value)
              ? p.value
              : c.resistorValues[0]
            : 12,
      ...(p.kind === "bulb" ? { rating: 6 } : {}),
      ...(p.kind === "switch" ? { closed: !!p.closed } : {}),
    });
  }
  const valid = endpoints({ parts, wires: [], serial: 1 }),
    wires: Circuit["wires"] = [],
    pairs = new Set<string>();
  for (const w of data.wires.slice(0, 24)) {
    if (
      !w ||
      typeof w.a !== "string" ||
      typeof w.b !== "string" ||
      !Object.hasOwn(valid, w.a) ||
      !Object.hasOwn(valid, w.b) ||
      w.a === w.b
    )
      continue;
    const key = [w.a, w.b].sort().join("|");
    if (pairs.has(key)) continue;
    pairs.add(key);
    wires.push({ id: `saved-${wires.length}`, a: w.a, b: w.b });
  }
  const serial =
    1 +
    Math.max(0, ...parts.map((p) => Number(p.id.match(/-(\d+)$/)?.[1] ?? 0)));
  return { parts, wires, serial };
}
export function restoreCampaign(raw: string | null): Campaign {
  const state = initialCampaign();
  try {
    const data = JSON.parse(raw ?? "null");
    if (data?.version !== 1) return state;
    if (Array.isArray(data.rooms))
      state.rooms = CHAMBERS.map((_, i) => sanitizeCircuit(data.rooms[i], i));
    if (Array.isArray(data.proofs))
      for (let i = 0; i < CHAMBERS.length; i++) {
        if (!data.proofs[i]) continue;
        const proof = sanitizeCircuit(data.proofs[i], i);
        if (!isRestored(CHAMBERS[i].id, proof)) continue;
        state.proofs[i] = proof;
      }
    if (Array.isArray(data.visited))
      state.visited = CHAMBER_IDS.filter(
        id => data.visited.includes(id),
      );
    // Older saves have no explicit discoveries; posters must now be inspected.
    if (Array.isArray(data.formulas))
      state.formulas = (Object.keys(FORMULAS) as FormulaId[]).filter(id => data.formulas.includes(id));
    if (Array.isArray(data.heard))
      state.heard = data.heard
        .filter(
          (id: unknown) =>
            typeof id === "string" &&
            /^(?:(entry|hint|restore|ending):[a-z-]+|tandem:[a-zA-Z0-9: -]{1,90})$/.test(id),
        )
        .slice(-512);
    state.sound = data.sound !== false;
    state.reducedMotion = data.reducedMotion === true;
  } catch {
    /* A damaged save starts safely in the first chamber. Earlier editions are untouched. */
  }
  return state;
}
