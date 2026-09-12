import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCoachContext, fieldGuide, coachFacts } from "../src/coach.ts";
import { coachResponse } from "../server/coaching.mjs";

const context = parseCoachContext({
  mission: "workshop",
  phase: "build",
  wires: [],
  material: "polymer",
  message: "",
  hints: 1,
  attempts: 0,
})!;
test("request validation rejects unknown missions, unbounded messages, and invalid phases", () => {
  assert.equal(parseCoachContext({ ...context, mission: "secret" }), null);
  assert.equal(
    parseCoachContext({ ...context, message: "a".repeat(501) }),
    null,
  );
  assert.equal(parseCoachContext({ ...context, phase: "anything" }), null);
});
test("authored guidance changes with physical state and misconception", () => {
  assert.match(fieldGuide(context), /metal|material|conduct/i);
  assert.match(
    fieldGuide({
      ...context,
      message: "Did the first lamp use up the current?",
    }),
    /does not use up/i,
  );
  assert.equal(
    coachFacts({ ...context, wires: [["a2", "m1"]], material: "copper" })
      .lampResults.a.power,
    3,
  );
});
test("no key returns explicitly authored guidance without network access", async () => {
  let requested = false;
  const reply = await coachResponse(context, {
    key: "",
    fetchImpl: async () => {
      requested = true;
      throw new Error("should not run");
    },
  });
  assert.equal(requested, false);
  assert.equal(reply.source, "field-guide");
  assert.equal(reply.reason, "unconfigured");
});
test("the live request grounds its response in server-computed circuit facts", async () => {
  let body: Record<string, any> = {};
  const reply = await coachResponse(context, {
    key: "test-only-key",
    model: "test/model",
    fetchImpl: async (_url: unknown, options: any) => {
      // Construct real Fetch headers: a mock alone previously hid a non-ASCII title failure.
      assert.doesNotThrow(() => new Headers(options.headers));
      body = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "The bridge material matters because the whole path must conduct.",
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(reply.source, "live");
  assert.equal(body.model, "test/model");
  assert.match(body.messages[1].content, /Verified simulator facts/);
  assert.match(body.messages[1].content, /"on":false/);
  assert.match(reply.text, /What do you predict/);
});
test("the backup follow-up cannot imply a gap in B's complete path", async () => {
  const reply = await coachResponse(
    {
      ...context,
      mission: "beacon",
      phase: "fault-result",
      wires: [
        ["p", "a1"],
        ["a2", "n"],
        ["p", "b1"],
        ["b2", "n"],
      ],
    },
    {
      key: "test-only-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    "B has a complete path that does not pass through A.",
                },
              },
            ],
          }),
        ),
    },
  );
  assert.equal(reply.source, "live");
  assert.match(reply.text, /B’s complete path while avoiding A’s empty socket/);
});
test("coaching distinguishes the engineering bridge from every conducting wire and names the removed lamp", () => {
  const facts = coachFacts({
    ...context,
    mission: "harbor",
    phase: "fault-result",
    wires: [["b2", "n"]],
  });
  assert.equal(facts.bridgeMaterial, "not present in this experiment");
  assert.match(facts.wireMaterial, /Every wire is an ideal conductor/);
  assert.match(facts.disconnectedLamp, /A is physically removed/);
  assert.equal(facts.lampResults.b.on, false);
});
test("upstream failures and malformed completions fall back without breaking play", async () => {
  for (const fetchImpl of [
    async () => new Response("{}", { status: 429 }),
    async () => new Response("{}", { status: 200 }),
    async () => {
      throw new Error("network");
    },
  ]) {
    const reply = await coachResponse(context, {
      key: "test-only-key",
      fetchImpl,
    });
    assert.equal(reply.source, "field-guide");
    assert.equal(reply.reason, "unavailable");
    assert.ok(reply.text.length > 10);
  }
});
