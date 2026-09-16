import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CHAMBERS } from "../src/chambers.ts";
import { editCircuit } from "../src/circuitKit.ts";
import {
  circuitReaction,
  conversationLine,
  hintLine,
  roomLine,
  TANDEM_LINES,
  TANDEM_SCRIPTS,
  sceneBeats,
  TANDEM_STORY_VERSION,
  tandemMemoryId,
} from "../src/tandemDialogue.ts";
import {
  campaignReducer,
  restoreCampaign,
  serializeCampaign,
} from "../src/chamberCampaign.ts";
import { solvedCircuit, chamberFixture } from "./chamber-fixtures.ts";
import { guidePath, clearGuidePath } from "../src/scene/guideNavigation.ts";
import { FURNITURE } from "../src/scene/shipLayout.ts";

test("every current subtitle matches the script used for its recorded audio", () => {
  const folder = new URL("../public/audio/tandem/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", folder), "utf8"));
  assert.equal(manifest.version, TANDEM_STORY_VERSION);
  assert.deepEqual(Object.keys(manifest.lines).sort(), Object.keys(TANDEM_LINES).sort());
  for (const [id, text] of Object.entries(TANDEM_LINES)) {
    assert.equal(manifest.lines[id].text, text, `Re-record changed subtitle: ${id}`);
    const bytes = readFileSync(new URL(`${encodeURIComponent(id)}.mp3`, folder));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.lines[id].sha256, id);
  }
});
test("the voiced script covers complete scenes with unique, readable beats", () => {
  const beats = Object.keys(TANDEM_SCRIPTS).flatMap(key => sceneBeats(key as keyof typeof TANDEM_SCRIPTS));
  assert.equal(new Set(beats.map(b => b.line)).size, Object.keys(TANDEM_LINES).length);
  assert.ok(beats.every(b => b.text.split(/\s+/).length <= 45));
});
test("each chapter has an introduction, personal conversation, resolution and graduated help", () => {
  for (let i = 0; i < 6; i++) {
    for (const kind of ["entry", "story", "restored", "after", "working"] as const)
      {
      assert.ok(TANDEM_LINES[roomLine(i, kind)]);
      assert.ok(sceneBeats(roomLine(i, kind)).length >= 2);
    }
    const steps = [0, 1, 2].map((d) => hintLine(i, CHAMBERS[i].initial, d));
    assert.equal(new Set(steps).size, 3);
    assert.equal(hintLine(i, solvedCircuit(i), 0), "solved-hint");
  }
});
test("E mixes a first conversation with contextual help, then follows shared hint depth", () => {
  for (let i = 0; i < 6; i++) {
    assert.equal(conversationLine(i, CHAMBERS[i].initial, 0, false), roomLine(i, "story"));
    for (const depth of [0, 1, 2, 8]) {
      assert.equal(conversationLine(i, CHAMBERS[i].initial, depth, true), hintLine(i, CHAMBERS[i].initial, depth));
    }
    // Live working state, including returning to an earlier room, changes the conversation.
    assert.equal(conversationLine(i, solvedCircuit(i), 2, false), roomLine(i, "after"));
    assert.equal(conversationLine(i, CHAMBERS[i].initial, 1, true), hintLine(i, CHAMBERS[i].initial, 1));
  }
});
test("reactive guidance distinguishes shorts, recovery, overload and independent branches", () => {
  const solved = solvedCircuit(0),
    short = editCircuit(
      solved,
      { type: "wire", a: "source:a", b: "source:b" },
      CHAMBERS[0],
    );
  assert.equal(circuitReaction(0, solved, short, true), "short");
  assert.equal(hintLine(0, short, 0), "short");
  assert.equal(conversationLine(0, short, 0, false), "short");
  assert.equal(circuitReaction(0, short, solved, true), "recovered");
  const balance = CHAMBERS[3].initial,
    hot = editCircuit(
      balance,
      { type: "wire", a: "source:b", b: "lamp:b" },
      CHAMBERS[3],
    );
  assert.equal(circuitReaction(3, balance, hot, false), "overload");
  assert.equal(conversationLine(3, hot, 0, false), "overload");
  const branches = solvedCircuit(5),
    isolated = editCircuit(
      branches,
      { type: "toggle", id: "isolator" },
      CHAMBERS[5],
    );
  assert.equal(circuitReaction(5, branches, isolated, true), "isolated");
  assert.equal(hintLine(5, isolated, 0), "isolated");
  assert.equal(conversationLine(5, isolated, 0, false), "isolated");
  const bypassed = editCircuit(isolated, { type: "wire", a: "source:b", b: "lamp-a:b" }, CHAMBERS[5]);
  assert.equal(conversationLine(5, bypassed, 0, true), "switch-bypassed");
  const second = isolated.parts.find((p) => p.kind === "bulb" && p.id !== "lamp-a")!;
  // Move the second lamp onto the same switched return path: both now depend on it.
  const shared = structuredClone(isolated);
  shared.wires = shared.wires.map((w) => w.a === "source:b" && w.b === `${second.id}:b`
    ? { ...w, a: "lamp-a:b" } : w);
  assert.equal(conversationLine(5, shared, 0, true), "both-off");
});
test("Tandem memories survive saves without invalidating old narrator saves", () => {
  let state = chamberFixture(2);
  for (const id of [
    "entry:wake",
    "tandem:wake-entry",
    "tandem:branch:isolated",
    "tandem:Earth gallery",
    tandemMemoryId("wake-entry"),
    tandemMemoryId("wake-story"),
    `${tandemMemoryId("branch-story")}:beat:2`,
    tandemMemoryId("isolated", "branch"),
  ])
    state = campaignReducer(state, { type: "HEARD", id });
  assert.deepEqual(
    restoreCampaign(serializeCampaign(state)).heard,
    state.heard,
  );
  assert.equal(
    restoreCampaign(serializeCampaign(state)).proofs.filter(Boolean).length,
    2,
  );
  assert.notEqual(tandemMemoryId("wake-entry"), "tandem:wake-entry");
});
test("guide routes around a bench and approaches a closed gate without crossing it", () => {
  const start = { x: -12.25, z: 19.5 },
    target = { x: -10, z: 10 };
  const gate = { x: -10, z: 13, width: 4, depth: 0.3 };
  const obstacles = [...FURNITURE, gate];
  const path = guidePath(start, target, obstacles);
  assert.ok(path.length);
  let p = start;
  for (const next of path) {
    assert.ok(clearGuidePath(p, next, obstacles));
    p = next;
  }
  assert.ok(p.z > 13);
  const opened = guidePath(p, target, [...FURNITURE]);
  assert.deepEqual(opened.at(-1), target);
});
