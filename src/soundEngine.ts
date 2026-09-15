import type { SoundMix } from "./soundscape";

export type Sound =
  | "connect" | "test" | "place" | "success" | "discover" | "fault" | "soft"
  | "step" | "door" | "door-close" | "power" | "power-down"
  | "tablet-open" | "tablet-close" | "tab" | "pause" | "resume";

export const SOUND_FILES = {
  door: "/audio/door-open.mp3",
  "door-close": "/audio/door-close.mp3",
  power: "/audio/power-up.mp3",
  connect: "/audio/connector.mp3",
  test: "/audio/relay.mp3",
  "step-a": "/audio/step-a.mp3",
  "step-b": "/audio/step-b.mp3",
  ventilation: "/audio/ventilation.wav",
} as const;
type Sample = keyof typeof SOUND_FILES;
const LEVELS: Partial<Record<Sound, number>> = {
  door: .62, "door-close": .5, power: .3, connect: .66, test: .58, place: .42,
};
type Voice = { source: AudioScheduledSourceNode; nodes: AudioNode[] };

/** One gesture-created context; local samples with immediate synthesized fallbacks. */
export class SoundEngine {
  readonly context: AudioContext;
  readonly ready: Promise<void>;
  private master: GainNode;
  private compressor: DynamicsCompressorNode;
  private ambience: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private buffers = new Map<Sample, AudioBuffer>();
  private voices = new Set<Voice>();
  private recent = new Map<Sound, number>();
  private request = new AbortController();
  private enabled = true;
  private hidden = false;
  private quiet = false;
  private disposed = false;
  private foot = 0;

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.master.gain.value = .7;
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = .003;
    this.compressor.release.value = .15;
    this.master.connect(this.compressor).connect(this.context.destination);
    this.ready = Promise.all(Object.entries(SOUND_FILES).map(async ([name, url]) => {
      try {
        const response = await fetch(url, { signal: this.request.signal });
        if (!response.ok) return;
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        if (this.disposed) return;
        this.buffers.set(name as Sample, buffer);
        if (name === "ventilation") this.startAmbience();
      } catch {
        // Missing/offline samples use immediate cues; loading never delays an action.
      }
    })).then(() => {});
  }

  private startAmbience() {
    if (!this.enabled || this.hidden || this.ambience || this.disposed) return;
    const buffer = this.buffers.get("ventilation");
    if (!buffer) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(this.quiet ? .018 : .055, this.context.currentTime, .5);
    source.connect(gain).connect(this.master);
    source.start();
    this.ambience = { source, gain };
  }

  unlock() {
    if (this.enabled && !this.hidden && !this.disposed) {
      void this.context.resume().catch(() => {});
      this.startAmbience();
    }
  }

  setEnabled(enabled: boolean) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (this.disposed) return;
    this.master.gain.setTargetAtTime(enabled ? .7 : 0, this.context.currentTime, .012);
    if (!enabled) this.stopVoices();
    else this.unlock();
  }

  setQuiet(quiet: boolean) {
    this.quiet = quiet;
    this.ambience?.gain.gain.setTargetAtTime(quiet ? .018 : .055, this.context.currentTime, .12);
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (this.disposed) return;
    if (hidden) {
      this.stopVoices();
      void this.context.suspend().catch(() => {});
    } else this.unlock();
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    // Rapid edits or many nearby doors must not accumulate unlimited voices.
    while (this.voices.size >= 20) {
      const oldest = this.voices.values().next().value!;
      oldest.source.stop();
      oldest.nodes.forEach(node => node.disconnect());
      this.voices.delete(oldest);
    }
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach(node => node.disconnect());
      this.voices.delete(voice);
    };
  }

  private stopVoices() {
    for (const voice of this.voices) {
      voice.source.stop();
      voice.nodes.forEach(node => node.disconnect());
    }
    this.voices.clear();
    this.recent.clear();
  }

  private output(gain: number, pan: number) {
    const volume = this.context.createGain(), panner = this.context.createStereoPanner();
    volume.gain.value = gain;
    panner.pan.value = pan;
    volume.connect(panner).connect(this.master);
    return { volume, panner };
  }

  private sample(name: Sample, gain: number, pan: number, rate = 1) {
    const buffer = this.buffers.get(name);
    if (!buffer) return false;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const { volume, panner } = this.output(gain, pan);
    source.connect(volume);
    this.track(source, [source, volume, panner]);
    source.start();
    return true;
  }

  private tone(frequency: number, end: number, duration: number, gain: number, pan: number, delay = 0) {
    const start = this.context.currentTime + delay;
    const source = this.context.createOscillator();
    source.type = "sine";
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(end, start + duration);
    const { volume, panner } = this.output(0, pan);
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(gain, start + .006);
    volume.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(volume);
    this.track(source, [source, volume, panner]);
    source.start(start);
    source.stop(start + duration + .015);
  }

  private texture(duration: number, frequency: number, gain: number, pan: number) {
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.min(1, t * 100) * Math.exp(-t * 7);
    }
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    const { volume, panner } = this.output(gain, pan);
    source.connect(filter).connect(volume);
    this.track(source, [source, filter, volume, panner]);
    source.start();
  }

  play(kind: Sound, mix: SoundMix = { gain: 1, pan: 0 }) {
    if (!this.enabled || this.hidden || this.disposed) return;
    const gain = Number.isFinite(mix.gain) ? Math.max(0, Math.min(1, mix.gain)) : 0;
    const pan = Number.isFinite(mix.pan) ? Math.max(-1, Math.min(1, mix.pan)) : 0;
    if (gain < .008) return;
    const now = this.context.currentTime;
    const cooldown = kind === "step" ? .22 : kind === "fault" ? .6 : .045;
    if (now - (this.recent.get(kind) ?? -Infinity) < cooldown) return;
    this.recent.set(kind, now);
    this.unlock();
    if (kind === "step") {
      const side = this.foot++ % 2;
      if (this.sample(side ? "step-b" : "step-a", .22 * gain, side ? .12 : -.12, .96 + Math.random() * .08)) return;
      this.texture(.13, 650, .12 * gain, 0);
      return;
    }
    if (kind in LEVELS) {
      const name = kind === "place" ? "test" : kind as Sample;
      const rate = kind === "place" ? .84 : kind === "connect" || kind === "test" ? .97 + Math.random() * .06 : 1;
      if (this.sample(name, LEVELS[kind]! * gain, pan, rate)) return;
      const machinery = kind === "door" || kind === "door-close" || kind === "power";
      this.texture(machinery ? .65 : .08, machinery ? 700 : 2100, .16 * gain, pan);
      if (machinery) this.tone(160, kind === "power" ? 280 : 100, .6, .055 * gain, pan);
      return;
    }
    if (kind === "success" || kind === "discover") {
      this.tone(660, 660, .22, .065 * gain, pan);
      this.tone(kind === "success" ? 990 : 880, kind === "success" ? 990 : 880, .32, .05 * gain, pan, .11);
    } else if (kind === "fault" || kind === "power-down") {
      this.tone(230, 130, .2, .085 * gain, pan);
      this.texture(.09, 1200, .055 * gain, pan);
    } else {
      // Quiet instrument feedback, with no sustained notes under menu navigation.
      const opening = kind === "tablet-open" || kind === "resume";
      const closing = kind === "tablet-close" || kind === "pause";
      this.texture(.035, 1600, .07 * gain, pan);
      this.tone(opening ? 480 : closing ? 560 : 740,
        opening ? 640 : closing ? 360 : 680, opening || closing ? .13 : .045, .035 * gain, pan);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.request.abort();
    this.stopVoices();
    this.ambience?.source.stop();
    this.ambience?.source.disconnect();
    this.ambience?.gain.disconnect();
    this.master.disconnect();
    this.compressor.disconnect();
    this.buffers.clear();
    void this.context.close().catch(() => {});
  }
}
