import { test, expect } from "@playwright/test";
import { begin, hold } from "./helpers";

test("local audio decodes with headroom and the ventilation loop has a continuous seam", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const checks = await page.evaluate(async () => {
    const url = "/src/soundEngine.ts";
    const { SOUND_FILES } = await import(url) as typeof import("../../src/soundEngine");
    const context = new OfflineAudioContext(2, 44100, 44100);
    const results = [];
    for (const [name, path] of Object.entries(SOUND_FILES)) {
      const response = await fetch(path);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      let peak = 0, energy = 0, difference = 0;
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
        energy += samples[i] ** 2;
        if (i) difference += (samples[i] - samples[i - 1]) ** 2;
      }
      results.push({ name, ok: response.ok, peak, rms: Math.sqrt(energy / samples.length), duration: buffer.duration,
        seam: Math.abs(samples[0] - samples.at(-1)!), delta: Math.sqrt(difference / samples.length) });
    }
    return results;
  });
  expect(checks).toHaveLength(8);
  for (const sound of checks) {
    expect(sound.ok, sound.name).toBe(true);
    expect(sound.peak, sound.name).toBeLessThan(.75);
    expect(sound.rms, sound.name).toBeGreaterThan(.005);
    expect(sound.duration, sound.name).toBeLessThan(6);
  }
  const loop = checks.find(sound => sound.name === "ventilation")!;
  expect(loop.seam).toBeLessThan(loop.delta * 3);
});

test("the rendered mix respects stereo position, headroom, mute, and missing-file fallbacks", async ({ page }) => {
  await page.route("**/audio/ventilation.wav", route => route.abort());
  await page.goto("/tests/browser/fixture.html");
  async function render(muted: boolean, hidden: boolean) {
    return page.evaluate(async ({ muted, hidden }) => {
      const url = "/src/soundEngine.ts";
      const { SoundEngine } = await import(url) as typeof import("../../src/soundEngine");
      const Native = window.AudioContext;
      class OfflineHarness extends OfflineAudioContext {
        constructor() { super(2, 44100 * 3, 44100); }
        override resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
      }
      window.AudioContext = OfflineHarness as unknown as typeof AudioContext;
      const engine = new SoundEngine();
      window.AudioContext = Native;
      await engine.ready;
      engine.setEnabled(!muted);
      engine.setHidden(hidden);
      engine.play("door", { gain: 1, pan: .85 });
      engine.play("door-close", { gain: .8, pan: .85 });
      engine.play("power", { gain: .8, pan: .85 });
      const buffer = await (engine.context as unknown as OfflineAudioContext).startRendering();
      const stats = [0, 1].map(channel => {
        const data = buffer.getChannelData(channel);
        return { peak: data.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
          energy: data.reduce((sum, sample) => sum + sample * sample, 0) };
      });
      engine.dispose();
      return stats;
    }, { muted, hidden });
  }
  const audible = await render(false, false);
  expect(audible[1].energy).toBeGreaterThan(audible[0].energy * 8);
  expect(audible[1].peak).toBeGreaterThan(.02);
  expect(audible[1].peak).toBeLessThan(.8);
  const muted = await render(true, false);
  expect(muted.every(channel => channel.peak === 0)).toBe(true);
  const hidden = await render(false, true);
  expect(hidden.every(channel => channel.peak === 0)).toBe(true);
  await page.route("**/audio/**", route => route.abort());
  const fallback = await render(false, false);
  expect(fallback[1].peak).toBeGreaterThan(.01);
  expect(fallback[1].peak).toBeLessThan(.5);
});

test("doors emit one opening and closing cue across all gates and both motion settings", async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  const failures = await page.evaluate(async () => {
    const threeUrl = "/node_modules/.vite/deps/three.js", shipUrl = "/src/scene/spaceship.ts";
    const layoutUrl = "/src/scene/shipLayout.ts", artUrl = "/src/scene/art.ts";
    const THREE = await import(threeUrl);
    const { buildSpaceship } = await import(shipUrl) as typeof import("../../src/scene/spaceship");
    const { PORTALS } = await import(layoutUrl) as typeof import("../../src/scene/shipLayout");
    const { disposeScene } = await import(artUrl);
    const failures: string[] = [];
    for (const reduced of [false, true]) {
      const scene = new THREE.Scene(), model = buildSpaceship(scene);
      let player = { x: 100, z: 100, yaw: 0, pitch: 0 };
      const update = (powered: (typeof PORTALS)[number]["system"][], preview = false) =>
        model.update(1 / 60, 0, player, powered, reduced, true, undefined, preview);
      const initial = update([]);
      if (initial.length) failures.push("initialization made sound");
      for (let frame = 0; frame < 150; frame++) update([]);
      for (const gate of PORTALS) {
        const normal = { x: Math.sin(gate.rotation), z: Math.cos(gate.rotation) };
        player = { x: gate.x + normal.x * 2.4, z: gate.z + normal.z * 2.4, yaw: 0, pitch: 0 };
        const opened = [];
        for (let frame = 0; frame < 150; frame++) opened.push(...update([gate.system]));
        if (opened.filter(e => e.kind === "door" && e.x === gate.x && e.z === gate.z).length !== 1)
          failures.push(`${gate.system}/${reduced}: opening repeats or missing`);
        if (opened.filter(e => e.kind === "power").length !== 1) failures.push(`${gate.system}: power cue repeats or missing`);
        player = { ...player, x: gate.x, z: gate.z };
        if (update([]).some(e => e.kind === "door-close")) failures.push(`${gate.system}: safety hold made closing sound`);
        player = { ...player, x: gate.x + normal.x * 7, z: gate.z + normal.z * 7 };
        const closed = [];
        for (let frame = 0; frame < 150; frame++) closed.push(...update([]));
        if (closed.filter(e => e.kind === "door-close" && e.x === gate.x && e.z === gate.z).length !== 1)
          failures.push(`${gate.system}/${reduced}: closing repeats or missing`);
        player = { ...player, x: gate.x + normal.x * 2.4, z: gate.z + normal.z * 2.4 };
        if (update([gate.system], true).length) failures.push(`${gate.system}: preview made sound`);
        for (let frame = 0; frame < 150; frame++) update([]);
      }
      model.dispose();
      disposeScene(scene);
    }
    return failures;
  });
  expect(failures).toEqual([]);
});

test("audio starts with play, alternates footsteps, and stays silent while muted", async ({ page }) => {
  await page.addInitScript(() => {
    const trace = { contexts: 0, closed: 0, decoded: 0, starts: [] as { duration: number; loop: boolean }[] };
    Object.assign(window, { audioTrace: trace });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() { super(); trace.contexts++; }
      override close() { trace.closed++; return super.close(); }
      override decodeAudioData(...args: Parameters<AudioContext["decodeAudioData"]>) {
        return super.decodeAudioData(...args).then(buffer => { trace.decoded++; return buffer; });
      }
      override createBufferSource() {
        const source = super.createBufferSource(), start = source.start.bind(source);
        source.start = (...args) => {
          trace.starts.push({ duration: source.buffer?.duration ?? 0, loop: source.loop });
          start(...args);
        };
        return source;
      }
    };
  });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/audio/")) requests.push(request.url()); });
  await page.goto("/");
  const trace = () => page.evaluate(() => (window as unknown as { audioTrace: { contexts: number; closed: number; decoded: number; starts: { duration: number; loop: boolean }[] } }).audioTrace);
  expect((await trace()).contexts).toBe(0);
  expect(requests).toHaveLength(0);
  await begin(page);
  await expect.poll(async () => (await trace()).starts.some(source => source.loop)).toBe(true);
  await expect.poll(async () => (await trace()).decoded).toBe(8);
  expect((await trace()).contexts).toBe(1);
  expect(requests).toHaveLength(8);
  await hold(page, "s", 1800);
  const steps = (await trace()).starts.filter(source => !source.loop && source.duration > .19 && source.duration < .42);
  expect(new Set(steps.map(source => source.duration)).size).toBe(2);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sound", exact: true })).toHaveAttribute("aria-pressed", "false");
  const count = (await trace()).starts.length;
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await hold(page, "w", 800);
  expect((await trace()).starts).toHaveLength(count);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await hold(page, "s", 800);
  expect((await trace()).starts.length).toBeGreaterThan(count);
  expect((await trace()).contexts).toBe(1);
  expect(requests).toHaveLength(8);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await page.getByRole("button", { name: "Start new run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Begin", exact: true })).toBeVisible();
  expect((await trace()).closed).toBe(1);
});

test("late sample loading cannot replay an action or start ambience after mute", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/audio/**", async route => { await waiting; await route.continue(); });
  await page.goto("/tests/browser/fixture.html");
  await page.evaluate(async () => {
    const url = "/src/soundEngine.ts";
    const { SoundEngine } = await import(url) as typeof import("../../src/soundEngine");
    const starts: boolean[] = [];
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      starts.push(this.loop);
      original.apply(this, args);
    };
    const engine = new SoundEngine();
    engine.play("door");
    engine.setEnabled(false);
    Object.assign(window, { pendingAudio: { engine, starts, before: starts.length } });
  });
  release();
  const result = await page.evaluate(async () => {
    const { engine, starts, before } = (window as unknown as { pendingAudio: {
      engine: import("../../src/soundEngine").SoundEngine; starts: boolean[]; before: number;
    } }).pendingAudio;
    await engine.ready;
    const afterLoad = starts.length;
    engine.play("step");
    const afterMutedPlay = starts.length;
    engine.setEnabled(true);
    engine.play("step");
    const afterEnable = starts.length;
    engine.dispose();
    await new Promise(resolve => setTimeout(resolve, 30));
    return { before, afterLoad, afterMutedPlay, afterEnable, loops: starts.filter(Boolean).length, state: engine.context.state };
  });
  expect(result.before).toBe(1);
  expect(result.afterLoad).toBe(result.before);
  expect(result.afterMutedPlay).toBe(result.before);
  expect(result.afterEnable).toBe(result.before + 2);
  expect(result.loops).toBe(1);
  expect(result.state).toBe("closed");
});
