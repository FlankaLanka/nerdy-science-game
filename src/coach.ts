import { missionById } from "./missions.ts";
import type { MissionId, Material, Wire } from "./missions.ts";
import type { Phase } from "./game.ts";
import { resultLabel, sanitizeWires, solveCircuit } from "./circuit.ts";

export type CoachContext = {
  mission: MissionId;
  wires: Wire[];
  material: Material;
  phase: Phase;
  prediction: string | null;
  faultPrediction: string | null;
  hints: number;
  attempts: number;
  message: string;
};
export type CoachReply = {
  text: string;
  source: "live" | "field-guide";
  reason?: "unavailable" | "unconfigured";
};

export function parseCoachContext(value: unknown): CoachContext | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!["workshop", "harbor", "beacon"].includes(input.mission as string))
    return null;
  if (
    !["build", "fault-ready", "fault-result", "reflect", "complete"].includes(
      input.phase as string,
    )
  )
    return null;
  if (
    !Array.isArray(input.wires) ||
    input.wires.length > 10 ||
    typeof input.message !== "string" ||
    input.message.length > 500
  )
    return null;
  const mission = input.mission as MissionId;
  const definition = missionById(mission);
  return {
    mission,
    wires: sanitizeWires(mission, input.wires),
    material: ["copper", "wood", "glass"].includes(input.material as string)
      ? (input.material as Material)
      : "wood",
    phase: input.phase as Phase,
    prediction: definition.predictions.some((c) => c.id === input.prediction)
      ? (input.prediction as string)
      : null,
    faultPrediction: ["stays", "out"].includes(input.faultPrediction as string)
      ? (input.faultPrediction as string)
      : null,
    hints: Number.isFinite(input.hints)
      ? Math.max(0, Math.min(999, Math.floor(input.hints as number)))
      : 0,
    attempts: Number.isFinite(input.attempts)
      ? Math.max(0, Math.min(80, Math.floor(input.attempts as number)))
      : 0,
    message: input.message.trim(),
  };
}

export function fieldGuide(ctx: CoachContext): string {
  const base = solveCircuit(ctx.mission, ctx.wires, ctx.material);
  const fault = solveCircuit(ctx.mission, ctx.wires, ctx.material, "a");
  if (
    /used?\s+up|run\s+out|empty\s+battery|consume.*current/i.test(ctx.message)
  )
    return "A lamp transfers electrical energy into light and heat; it does not use up the current. Can you trace a complete conducting path through the lamp and back to the battery?";
  if (/cross|touch|overlap/i.test(ctx.message))
    return "Wires connect only at the round sockets. If two cables cross in the middle of the board, they do not join. Trace each cable all the way to its socket.";
  if (/bright|dim/i.test(ctx.message))
    return "These lamps are identical. In one series loop they share the battery’s voltage and each is dimmer. With separate branches across the battery, each gets the full voltage in this model.";
  if (base.short)
    return "A wire has joined the battery ends without a lamp in the path, so the reusable fuse opened. Remove that shortcut. Which route would make the current pass through a lamp?";
  if (ctx.phase === "fault-ready")
    return "Before removing A, trace the path through B from one battery end to the other. Does that path have to pass through A? Use that to make your prediction.";
  if (ctx.phase === "fault-result") {
    if (fault.lamps.b?.on)
      return "B is still connected to both battery ends through its own branch. Point to that complete path. Where is the gap in A’s separate branch?";
    return ctx.mission === "beacon"
      ? "Removing A left B without a complete path. Try giving each lamp a connection to both battery ends, so B’s path can avoid A."
      : "The battery is still connected, but removing A made a gap in the only loop. Follow the route through B: where does it stop now?";
  }
  if (ctx.mission === "workshop") {
    if (base.count)
      return base.bridgeActive
        ? "Follow the glowing path through the copper bridge, lamp, and battery. Every part of this loop conducts. What happens to the path if one connection is missing?"
        : "Your wire made a conducting path around the bridge. That is a real working circuit too. Trace how it connects the lamp to both battery ends.";
    if (ctx.material !== "copper")
      return ctx.hints > 1
        ? "The dry wood and glass strips do not conduct in our model. Try copper, then connect the lamp’s loose socket to the bridge’s loose socket."
        : "A wire needs a material that conducts. What do you expect from a metal strip compared with dry wood or glass? Try one material while keeping your wires the same.";
    return ctx.hints > 1
      ? "One wire runs from the battery to the lamp. The return route needs a connection from the lamp’s free socket to the bridge’s free socket. Tap those two sockets."
      : "Start at the battery’s + socket. Trace through the lamp and the copper bridge, back to −. Where is the gap?";
  }
  if (ctx.mission === "harbor") {
    if (base.count === 2 && fault.lamps.b.on)
      return "You created an extra route. For this harbor experiment, keep the existing single loop and remove the bypass. Connect the loose end of B back to the battery’s − socket.";
    return ctx.hints > 1
      ? "The existing cables go from + through A, then B. Connect B’s free socket to the battery’s − socket to complete that one loop."
      : "Follow the existing cable from + through A and B. Where should the loose end go to complete the route?";
  }
  if (ctx.hints > 1)
    return "Give A a wire to + and another to −. Give B its own pair of connections to + and −. Both lamps can share the battery sockets, but B’s path must not pass through A.";
  if (base.count === 1)
    return "One lamp has a working path. Trace the dark lamp’s two ends. Can you connect them to opposite battery ends without breaking the first lamp’s path?";
  return "Imagine taking A out of your drawing. Can you still trace a path from + through B to −? Build that independent route, and give A a route of its own.";
}

export function coachFacts(ctx: CoachContext) {
  const result = solveCircuit(
    ctx.mission,
    ctx.wires,
    ctx.material,
    ctx.phase === "fault-result" ? "a" : null,
  );
  return {
    task: missionById(ctx.mission).task,
    phase: ctx.phase,
    wires: ctx.wires.map((w) =>
      w.map(
        (id) =>
          missionById(ctx.mission).terminals.find((t) => t.id === id)?.label ??
          id,
      ),
    ),
    fixedWires: missionById(ctx.mission).fixed.map((w) =>
      w.map(
        (id) =>
          missionById(ctx.mission).terminals.find((t) => t.id === id)?.label ??
          id,
      ),
    ),
    bridgeMaterial:
      ctx.mission === "workshop"
        ? ctx.material
        : "not present in this experiment",
    wireMaterial:
      "Every wire is an ideal conductor. The material selector changes ONLY the workshop bridge; it never changes a wire or a lamp.",
    disconnectedLamp:
      ctx.phase === "fault-result"
        ? "A is physically removed, leaving an open gap between its sockets."
        : "Neither lamp is removed.",
    observation: resultLabel(ctx.mission, result),
    lampResults: result.lamps,
    fuseOpen: result.short,
    learnerPrediction: ctx.phase.startsWith("fault")
      ? ctx.faultPrediction
      : ctx.prediction,
    hintsUsed: ctx.hints,
    attempts: ctx.attempts,
    suggestedScaffold: fieldGuide(ctx),
  };
}
