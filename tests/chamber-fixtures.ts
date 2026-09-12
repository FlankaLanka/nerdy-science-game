import { CHAMBERS } from "../src/chambers.ts";
import { cloneCircuit, editCircuit } from "../src/circuitKit.ts";
import type { Circuit, KitAction, PartKind } from "../src/circuitKit.ts";
import { initialCampaign } from "../src/chamberCampaign.ts";
/** Authored examples, used only by tests and the visual review script. */
export function solvedCircuit(index: number): Circuit {
  let doc = cloneCircuit(CHAMBERS[index].initial);
  const edit = (action: KitAction) => {
    doc = editCircuit(doc, action, CHAMBERS[index]);
  };
  const wire = (a: string, b: string) => edit({ type: "wire", a, b });
  const add = (kind: PartKind, x: number, y: number) => {
    edit({ type: "add", kind, x, y });
    return doc.parts.at(-1)!.id;
  };
  if (index === 0) wire("source:b", "lamp:b");
  if (index === 1) edit({ type: "toggle", id: "isolator" });
  if (index === 2) {
    const battery = add("battery", 250, 265),
      bulb = add("bulb", 650, 265);
    wire(`${battery}:a`, `${bulb}:a`);
    wire(`${battery}:b`, `${bulb}:b`);
  }
  if (index === 3) {
    const r = add("resistor", 450, 135);
    edit({ type: "value", id: r, value: 12 });
    wire("source:b", `${r}:a`);
    wire(`${r}:b`, "lamp:b");
  }
  if (index === 4) {
    const a = add("bulb", 440, 155),
      b = add("bulb", 665, 295);
    edit({ type: "rotate", id: a });
    wire("source:b", `${a}:a`);
    wire(`${a}:b`, `${b}:b`);
    wire(`${b}:a`, "source:a");
  }
  if (index === 5) {
    const b = add("bulb", 455, 375);
    edit({ type: "rotate", id: b });
    wire("source:a", `${b}:a`);
    wire("source:b", `${b}:b`);
  }
  return doc;
}
export function chamberFixture(completed = 0) {
  const state = initialCampaign();
  for (let i = 0; i < completed; i++) {
    state.rooms[i] = solvedCircuit(i);
    state.proofs[i] = cloneCircuit(state.rooms[i]);
    state.visited.push(CHAMBERS[i].id);
  }
  return state;
}
