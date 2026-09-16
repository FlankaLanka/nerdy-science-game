import test from "node:test";
import assert from "node:assert/strict";
import { TandemDirector } from "../src/tandemDirector.ts";
import { sceneBeats, tandemMemoryId } from "../src/tandemDialogue.ts";
import type { TandemCue } from "../src/tandemDirector.ts";

function harness(heard: string[] = []) {
  const cues: TandemCue[] = [], memories: string[] = [];
  const director = new TandemDirector(heard, cue => { if (cue) cues.push(cue); }, id => memories.push(id));
  const finish = () => {
    assert.ok(director.cue);
    director.speechEnded(director.cue.serial);
    director.tick(1200);
  };
  return { director, cues, memories, finish };
}
test("one request plays every beat, then the next complete scene, without truncating replies", () => {
  const h = harness();
  h.director.say("wake-story", { conversation: "room:0" });
  h.director.say("formula");
  assert.equal(h.memories.length, 0, "requesting a scene doesn't mark its unheard ending as heard");
  for (let i = 0; i < sceneBeats("wake-story").length; i++) h.finish();
  assert.deepEqual(h.cues.slice(0, 5).map(c => c.line), sceneBeats("wake-story").map(b => b.line));
  assert.equal(h.director.cue?.scene, "formula");
  assert.ok(h.memories.includes(tandemMemoryId("wake-story")));
  h.finish();
  assert.equal(h.director.cue, null);
});
test("actual speech ending leaves a listening pause; paused scenes and stale audio cannot advance", () => {
  const h = harness();
  h.director.say("wake-story");
  const first = h.director.cue!.serial;
  h.director.speechEnded(first);
  h.director.tick(10000, true);
  assert.equal(h.director.cue!.beat, 1);
  h.director.tick(799);
  assert.equal(h.director.cue!.beat, 1);
  h.director.tick(1);
  assert.equal(h.director.cue!.beat, 2);
  h.director.speechEnded(first);
  h.director.tick(1200);
  assert.equal(h.director.cue!.beat, 2, "the previous clip cannot finish the new one");
});
test("E continues only its requested conversation; T or a fault can replace it", () => {
  const h = harness();
  h.director.say("wake-entry");
  assert.equal(h.director.continueConversation("room:0"), false);
  h.director.say("wake-story", { interrupt: true, conversation: "room:0" });
  assert.equal(h.director.continueConversation("room:1"), false);
  assert.equal(h.director.continueConversation("room:0"), true);
  assert.equal(h.director.cue!.beat, 2);
  h.director.say("short", { interrupt: true });
  h.finish();
  assert.equal(h.director.cue, null, "stale instructions don't resume behind a fault");
  h.director.say("wake-story", { interrupt: true, conversation: "room:0" });
  assert.equal(h.director.cue!.beat, 2, "an explicit return resumes the unfinished reply");
});
test("speech checkpoints survive reload while a new run forgets them", () => {
  const h = harness();
  h.director.say("branch-story", { conversation: "room:5" });
  h.finish(); h.finish();
  const resumed = harness(h.memories);
  resumed.director.say("branch-story");
  assert.equal(resumed.director.cue!.beat, 3);
  resumed.director.clear(true);
  resumed.director.say("branch-story");
  assert.equal(resumed.director.cue!.beat, 1);
});
test("repair payoff follows the player through a door while obsolete room dialogue is dropped", () => {
  const h = harness();
  h.director.say("wake-restored");
  h.director.clear(false, true);
  h.director.say("contact-entry");
  assert.equal(h.director.cue!.scene, "wake-restored");
  for (let i = 0; i < sceneBeats("wake-restored").length; i++) h.finish();
  assert.equal(h.director.cue!.scene, "contact-entry");
  h.director.clear(false, true);
  h.director.say("build-entry");
  assert.equal(h.director.cue!.scene, "build-entry");
});
test("caption fallback completes full scenes without audio; completed scenes don't replay", () => {
  const h = harness();
  h.director.say("share-story");
  for (const _beat of sceneBeats("share-story")) h.director.tick(30000);
  assert.equal(h.director.cue, null);
  h.director.say("share-story");
  assert.equal(h.director.cue, null);
  h.director.say("share-story", { repeat: true });
  assert.equal(h.director.cue!.beat, 1);
});
