import { sceneBeats, tandemMemoryId } from "./tandemDialogue.ts";
import type { TandemScene, TandemLine, TandemMood, TandemBeat } from "./tandemDialogue.ts";

export type TandemCue = {
  id: string;
  scene: TandemScene;
  line: TandemLine;
  text: string;
  mood: TandemMood;
  serial: number;
  beat: number;
  total: number;
};
export type SpeechOptions = {
  repeat?: boolean;
  interrupt?: boolean;
  mood?: TandemMood;
  scope?: string;
  conversation?: string;
};
type Scene = {
  id: string;
  scene: TandemScene;
  beats: TandemBeat[];
  index: number;
  mood: TandemMood;
  conversation?: string;
};

/** Queue whole scenes; preserve their beats, listening pauses and interruption checkpoints. */
export class TandemDirector {
  cue: TandemCue | null = null;
  private active: Scene | null = null;
  private queue: Scene[] = [];
  private heard: Set<string>;
  private checkpoints = new Map<string, number>();
  private remaining = 0;
  private serial = 0;
  private publish: (cue: TandemCue | null) => void;
  private remember: (id: string) => void;
  constructor(
    heard: string[],
    publish: (cue: TandemCue | null) => void,
    remember: (id: string) => void,
  ) {
    this.publish = publish;
    this.remember = remember;
    this.heard = new Set(heard);
    for (const id of heard) {
      const match = id.match(/^(tandem:.+):beat:(\d+)$/);
      if (match && !this.heard.has(match[1]))
        this.checkpoints.set(match[1], Math.max(this.checkpoints.get(match[1]) ?? 0, Number(match[2])));
    }
  }
  say(scene: TandemScene, options: SpeechOptions = {}) {
    const id = tandemMemoryId(scene, options.scope);
    if (!options.repeat && (this.heard.has(id) || this.active?.id === id || this.queue.some(s => s.id === id)))
      return;
    const next: Scene = {
      id, scene, beats: sceneBeats(scene),
      index: Math.min(this.checkpoints.get(id) ?? 0, sceneBeats(scene).length - 1),
      mood: options.mood ?? (scene.includes("hint") ? "point" : "speak"),
      conversation: options.conversation,
    };
    if (options.interrupt || !this.active) {
      this.queue = [];
      this.start(next);
    } else {
      // Bound incidental events, without truncating any scene's internal dialogue.
      this.queue = [...this.queue, next].slice(-2);
    }
  }
  private start(scene: Scene) {
    this.active = scene;
    this.showBeat();
  }
  private showBeat() {
    const scene = this.active!;
    const beat = scene.beats[scene.index];
    this.checkpoints.set(scene.id, scene.index);
    this.remaining = Math.max(2200, beat.text.split(/\s+/).length * 360 + 400) + beat.pause;
    this.cue = {
      id: scene.id, scene: scene.scene, line: beat.line, text: beat.text,
      mood: scene.mood, serial: ++this.serial, beat: scene.index + 1, total: scene.beats.length,
    };
    this.publish(this.cue);
  }
  private nextBeat() {
    const scene = this.active;
    if (!scene) return;
    scene.index++;
    if (scene.index < scene.beats.length) {
      this.remember(`${scene.id}:beat:${scene.index}`);
      this.showBeat();
      return;
    }
    this.checkpoints.delete(scene.id);
    this.heard.add(scene.id);
    this.remember(scene.id);
    this.active = null;
    const next = this.queue.shift();
    if (next) this.start(next);
    else {
      this.cue = null;
      this.publish(null);
    }
  }
  /** E continues a requested exchange; automatic narration is not mistaken for a request. */
  continueConversation(context: string) {
    if (this.active?.conversation !== context) return false;
    this.nextBeat();
    return true;
  }
  /** The audio ended. Keep the listening pause; don't wait out a guessed reading duration. */
  speechEnded(serial: number) {
    if (serial !== this.cue?.serial || !this.active) return;
    this.remaining = this.active.beats[this.active.index].pause;
  }
  tick(milliseconds: number, paused = false) {
    if (!this.active || paused) return;
    this.remaining -= milliseconds;
    if (this.remaining <= 0) this.nextBeat();
  }
  clear(forget = false, preserveResolution = false) {
    this.queue = [];
    // Let a repair's payoff finish as the player walks through its exit.
    if (preserveResolution && this.active?.scene.endsWith("-restored")) return;
    this.active = null;
    this.cue = null;
    this.remaining = 0;
    if (forget) {
      this.heard.clear();
      this.checkpoints.clear();
    }
    this.publish(null);
  }
}
