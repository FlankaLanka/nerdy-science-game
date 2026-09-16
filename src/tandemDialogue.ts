import { CHAMBERS, isRestored } from "./chambers.ts";
import { simulate, lampState } from "./circuitKit.ts";
import type { Circuit } from "./circuitKit.ts";

import { TANDEM_STORY_VERSION } from "./tandemScript.ts";
import type { TandemScene } from "./tandemScript.ts";
export { TANDEM_STORY_VERSION, TANDEM_SCRIPTS, TANDEM_LINES, sceneBeats } from "./tandemScript.ts";
export type { TandemScene, TandemLine, TandemMood, TandemBeat } from "./tandemScript.ts";

export function tandemMemoryId(line: TandemScene, scope?: string) {
  return `tandem:${TANDEM_STORY_VERSION}:${scope ? `${scope}:` : ""}${line}`;
}
export function roomLine(
  index: number,
  kind: "entry" | "restored" | "story" | "after" | "working",
): TandemScene {
  return `${CHAMBERS[index].id}-${kind}` as TandemScene;
}
export function hintLine(
  index: number,
  circuit: Circuit,
  depth: number,
): TandemScene {
  const result = simulate(circuit);
  if (result.tripped) return "short";
  if (
    circuit.parts.some(
      (p) => p.kind === "bulb" && lampState(p, result).overloaded,
    )
  )
    return "overload";
  if (isRestored(CHAMBERS[index].id, circuit)) return "solved-hint";
  if (index === 5) {
    const isolation = isolationLine(circuit, result);
    if (isolation) return isolation;
  }
  return `${CHAMBERS[index].id}-hint-${Math.min(2, Math.max(0, depth))}` as TandemScene;
}
/** E adds character to the first nudge; faults and live repairs take precedence. */
export function conversationLine(
  index: number,
  circuit: Circuit,
  depth: number,
  storyHeard: boolean,
): TandemScene {
  const hint = hintLine(index, circuit, depth);
  if (hint === "solved-hint") return roomLine(index, "after");
  if (!hint.includes("-hint-") || storyHeard) return hint;
  return roomLine(index, "story");
}
function isolationLine(
  circuit: Circuit,
  result: ReturnType<typeof simulate>,
): TandemScene | null {
  const toggle = circuit.parts.find((p) => p.kind === "switch");
  if (
    !toggle || toggle.closed ||
    circuit.parts.filter((p) => p.kind === "bulb").length !== 2
  )
    return null;
  const original = circuit.parts.find((p) => p.id === "lamp-a");
  if (original && lampState(original, result).lit) return "switch-bypassed";
  return circuit.parts.some(
    (p) => p.kind === "bulb" && p.id !== "lamp-a" && lampState(p, result).lit,
  )
    ? "isolated"
    : "both-off";
}
export function circuitReaction(
  index: number,
  before: Circuit,
  after: Circuit,
  proved: boolean,
): TandemScene | null {
  const a = simulate(before),
    b = simulate(after);
  const overloaded = (c: Circuit, r: ReturnType<typeof simulate>) =>
    c.parts.some((p) => p.kind === "bulb" && lampState(p, r).overloaded);
  if (b.tripped && !a.tripped) return "short";
  if (!b.tripped && overloaded(after, b) && !overloaded(before, a))
    return "overload";
  if (
    !b.tripped &&
    !overloaded(after, b) &&
    (a.tripped || overloaded(before, a))
  )
    return "recovered";
  const switchA = before.parts.find((p) => p.kind === "switch");
  const switchB = after.parts.find((p) => p.kind === "switch");
  if (
    index === 5 &&
    switchA?.closed &&
    switchB &&
    !switchB.closed &&
    after.parts.filter((p) => p.kind === "bulb").length === 2
  ) {
    return isolationLine(after, b);
  }
  const was = isRestored(CHAMBERS[index].id, before),
    now = isRestored(CHAMBERS[index].id, after);
  if (proved && was && !now) return "power-lost";
  if (proved && !was && now) return "power-back";
  if (
    index >= 3 &&
    !now &&
    after.parts.some(
      (p) =>
        p.kind === "bulb" &&
        Math.abs(b.parts[p.id]?.voltage ?? 0) > 0.2 &&
        Math.abs(b.parts[p.id]?.voltage ?? 0) < 4.5,
    ) &&
    !before.parts.some(
      (p) => p.kind === "bulb" && Math.abs(a.parts[p.id]?.voltage ?? 0) > 0.2,
    )
  )
    return "dim";
  if (!proved && !now && !b.tripped && !overloaded(after, b) &&
      (after.parts.length > before.parts.length || after.wires.length > before.wires.length))
    return roomLine(index, "working");
  return null;
}
