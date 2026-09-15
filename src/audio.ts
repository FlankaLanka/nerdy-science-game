import { useEffect, useRef } from "react";
import { SoundEngine } from "./soundEngine";
import type { Sound } from "./soundEngine";
import type { SoundMix } from "./soundscape";
export type { Sound } from "./soundEngine";

export function useSound(enabled: boolean, quiet = false) {
  const state = useRef<SoundEngine | null>(null);
  const active = useRef(enabled), subdued = useRef(quiet);
  active.current = enabled;
  subdued.current = quiet;
  function unlock() {
    if (!active.current || document.hidden) return null;
    if (!state.current) {
      try {
        state.current = new SoundEngine();
        state.current.setQuiet(subdued.current);
      } catch {
        return null;
      }
    }
    state.current.setEnabled(true);
    state.current.unlock();
    return state.current;
  }
  function play(kind: Sound, mix?: SoundMix) {
    unlock()?.play(kind, mix);
  }
  function reset() {
    state.current?.dispose();
    state.current = null;
  }
  useEffect(() => { state.current?.setEnabled(enabled); }, [enabled]);
  useEffect(() => { state.current?.setQuiet(quiet); }, [quiet]);
  useEffect(() => {
    const visibility = () => state.current?.setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      state.current?.dispose();
      state.current = null;
    };
  }, []);
  return { play, unlock, reset };
}
