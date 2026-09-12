import { useEffect, useRef } from "react";

export type Sound =
  | "connect"
  | "test"
  | "success"
  | "fault"
  | "soft"
  | "step"
  | "door"
  | "power"
  | "signal";
// Starting gains and envelopes; micro tests and tuning direction are in docs/design.md.
export function useSound(enabled: boolean) {
  const state = useRef<{ context: AudioContext; master: GainNode } | null>(
    null,
  );
  const active = useRef(enabled);
  active.current = enabled;
  function unlock() {
    if (!active.current) return null;
    if (!state.current) {
      try {
        const context = new AudioContext(),
          master = context.createGain();
        master.gain.value = 0.26;
        master.connect(context.destination);
        const buffer = context.createBuffer(
          1,
          context.sampleRate * 6,
          context.sampleRate,
        );
        const samples = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < samples.length; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
          samples[i] = last * 3;
        }
        const noise = context.createBufferSource(),
          filter = context.createBiquadFilter(),
          volume = context.createGain();
        noise.buffer = buffer;
        noise.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = 240;
        volume.gain.value = 0.065;
        noise.connect(filter);
        filter.connect(volume);
        volume.connect(master);
        noise.start();
        for (const frequency of [48, 72]) {
          const hum = context.createOscillator(),
            humGain = context.createGain();
          hum.type = "sine";
          hum.frequency.value = frequency;
          humGain.gain.value = 0.045;
          hum.connect(humGain);
          humGain.connect(master);
          hum.start();
        }
        state.current = { context, master };
      } catch {
        return null;
      }
    }
    if (!document.hidden) void state.current.context.resume().catch(() => {});
    return state.current;
  }
  function play(kind: Sound) {
    const audio = unlock();
    if (!audio) return;
    const { context, master } = audio;
    if (kind === "door" || kind === "power") {
      // Starting envelopes: a servo hiss and low motor spin-up, never a startle cue.
      const duration = kind === "door" ? 0.6 : 1.2;
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * duration),
        context.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] =
          (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / samples.length);
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(
        kind === "door" ? 900 : 180,
        context.currentTime,
      );
      filter.frequency.exponentialRampToValueAtTime(
        kind === "door" ? 240 : 1100,
        context.currentTime + duration,
      );
      gain.gain.value = kind === "door" ? 0.12 : 0.14;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      const motor = context.createOscillator(),
        motorGain = context.createGain();
      motor.type = "sine";
      motor.frequency.setValueAtTime(
        kind === "door" ? 100 : 42,
        context.currentTime,
      );
      motor.frequency.exponentialRampToValueAtTime(
        kind === "door" ? 65 : 120,
        context.currentTime + duration,
      );
      motorGain.gain.setValueAtTime(0, context.currentTime);
      motorGain.gain.linearRampToValueAtTime(0.13, context.currentTime + 0.08);
      motorGain.gain.linearRampToValueAtTime(0, context.currentTime + duration);
      motor.connect(motorGain);
      motorGain.connect(master);
      motor.start();
      motor.stop(context.currentTime + duration);
      motor.onended = () => {
        motor.disconnect();
        motorGain.disconnect();
      };
      return;
    }
    if (kind === "signal") {
      let start = context.currentTime;
      for (const [i, length] of [1, 1, 1, 3, 3, 3, 1, 1, 1].entries()) {
        const oscillator = context.createOscillator(),
          gain = context.createGain();
        oscillator.frequency.value = 660;
        oscillator.type = "sine";
        const end = start + length * 0.085;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.008);
        gain.gain.setValueAtTime(0.22, end - 0.008);
        gain.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(end + 0.01);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        start = end + (i === 2 || i === 5 ? 0.25 : 0.085);
      }
      return;
    }
    if (kind === "step") {
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.12),
        context.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * 0.16));
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = 690;
      gain.gain.value = 0.2;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      return;
    }
    // A short filtered transient gives connections a physical snap and the switch a relay click.
    if (kind === "connect" || kind === "test" || kind === "fault") {
      const duration = kind === "test" ? 0.1 : 0.045;
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * duration),
        context.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * 0.12));
      const click = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        volume = context.createGain();
      click.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = kind === "connect" ? 2300 : 850;
      filter.Q.value = 0.7;
      volume.gain.value = 0.28;
      click.connect(filter);
      filter.connect(volume);
      volume.connect(master);
      click.start();
      click.onended = () => {
        click.disconnect();
        filter.disconnect();
        volume.disconnect();
      };
    }
    const notes =
      kind === "success"
        ? [392, 493.88, 587.33, 783.99]
        : kind === "connect"
          ? [850, 1100]
          : kind === "test"
            ? [220, 330, 440]
            : kind === "fault"
              ? [164.81, 130.81]
              : [440];
    notes.forEach((frequency, i) => {
      const osc = context.createOscillator(),
        gain = context.createGain(),
        start = context.currentTime + i * (kind === "success" ? 0.11 : 0.055);
      osc.type = kind === "connect" ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        kind === "connect" ? 0.13 : 0.15,
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        start + (kind === "success" ? 1.4 : 0.24),
      );
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 1.5);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }
  useEffect(() => {
    const audio = state.current;
    if (audio) {
      audio.master.gain.setTargetAtTime(
        enabled ? 0.26 : 0,
        audio.context.currentTime,
        0.06,
      );
      if (enabled && !document.hidden)
        void audio.context.resume().catch(() => {});
    }
  }, [enabled]);
  useEffect(() => {
    const visibility = () => {
      const a = state.current;
      if (!a) return;
      if (document.hidden) void a.context.suspend().catch(() => {});
      else if (active.current) void a.context.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void state.current?.context.close().catch(() => {});
      state.current = null;
    };
  }, []);
  return { play, unlock };
}
