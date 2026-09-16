import { useCallback, useEffect, useRef, useState } from "react";
import { TANDEM_STORY_VERSION } from "./tandemDialogue";
import { TandemDirector } from "./tandemDirector";
import type { SpeechOptions, TandemCue } from "./tandemDirector";
import type { TandemScene } from "./tandemDialogue";
export type { TandemCue } from "./tandemDirector";

export function useTandem(
  heardIds: string[],
  remember: (id: string) => void,
  paused: boolean,
  enabled: boolean,
) {
  const [cue, setCue] = useState<TandemCue | null>(null);
  const pausedRef = useRef(paused), enabledRef = useRef(enabled), rememberRef = useRef(remember);
  pausedRef.current = paused;
  enabledRef.current = enabled;
  rememberRef.current = remember;
  const director = useRef<TandemDirector | null>(null);
  if (!director.current)
    director.current = new TandemDirector(heardIds, setCue, id => rememberRef.current(id));
  const say = useCallback((scene: TandemScene, options?: SpeechOptions) => {
    director.current!.say(scene, options);
  }, []);
  const clear = useCallback((forget = false, preserveResolution = false) => {
    director.current!.clear(forget, preserveResolution);
  }, []);
  const continueConversation = useCallback((context: string) =>
    director.current!.continueConversation(context), []);
  const voice = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), dt = Math.min(300, now - last);
      last = now;
      if (pausedRef.current || document.hidden) return;
      const audio = voice.current;
      // Spoken beats advance from the actual recording, including buffering. Muted or
      // unavailable speech uses readable caption timing instead of stalling the scene.
      if (enabledRef.current && audio && !audio.paused && !audio.ended && !audio.error) return;
      director.current!.tick(dt);
    }, 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!cue) return;
    const audio = new Audio(`/audio/tandem/${encodeURIComponent(cue.line)}.mp3?v=${TANDEM_STORY_VERSION}`);
    audio.volume = 0.8;
    voice.current = audio;
    const ended = () => director.current!.speechEnded(cue.serial);
    audio.addEventListener("ended", ended);
    return () => {
      audio.removeEventListener("ended", ended);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (voice.current === audio) voice.current = null;
    };
  }, [cue]);
  useEffect(() => {
    const sync = () => {
      const audio = voice.current;
      if (!audio) return;
      if (!enabled || paused || document.hidden) audio.pause();
      else if (!audio.ended)
        void audio.play().catch(() => { /* Readable captions continue after blocked playback. */ });
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [cue, enabled, paused]);
  return { cue, say, clear, continueConversation };
}
