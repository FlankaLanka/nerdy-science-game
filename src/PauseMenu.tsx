import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Dialog } from "./Dialog";
import "./pause.css";

type Screen = "main" | "options" | "restart";

export default function PauseMenu({
  sound,
  reducedMotion,
  onResume,
  onNotebook,
  onSound,
  onMotion,
  onRestart,
}: {
  sound: boolean;
  reducedMotion: boolean;
  onResume: () => void;
  onNotebook: () => void;
  onSound: () => void;
  onMotion: () => void;
  onRestart: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("main");
  const menu = useRef<HTMLElement>(null);
  const returnTo = useRef("resume");

  function open(next: Screen) {
    returnTo.current = next;
    setScreen(next);
  }

  function back() {
    if (screen === "main") onResume();
    else setScreen("main");
  }

  function navigate(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>("[data-entry]") ?? []);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % entries.length; break;
      case "ArrowUp": next = (index - 1 + entries.length) % entries.length; break;
      case "Home": next = 0; break;
      case "End": next = entries.length - 1; break;
      case "ArrowLeft":
      case "ArrowRight":
        if (entries[index]?.hasAttribute("aria-pressed")) {
          event.preventDefault();
          if (!event.repeat) entries[index].click();
        }
        return;
      default: return;
    }
    event.preventDefault();
    entries[next]?.focus();
  }

  return (
    <Dialog
      key={screen}
      title="Pause"
      onClose={back}
      className="pause-dialog"
      reducedMotion={reducedMotion}
      closeControl={() => null}
      initialFocus={`[data-entry="${screen === "main" ? returnTo.current : screen === "options" ? "sound" : "cancel"}"]`}
    >
      <section className="pause-panel" aria-labelledby="pause-title">
        <h1 id="pause-title">{screen === "main" ? "Paused" : screen === "options" ? "Options" : "New run?"}</h1>
        {screen === "restart" && <p className="pause-warning">Your current progress will be lost.</p>}
        <nav
          ref={menu}
          className="pause-menu"
          aria-label="Pause menu"
          onKeyDown={navigate}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const entry = (event.target as HTMLElement).closest<HTMLElement>("[data-entry]");
            if (entry && entry !== document.activeElement)
              entry.focus({ preventScroll: true });
          }}
        >
          {screen === "main" && (
            <>
              <button data-entry="resume" onClick={onResume}>Resume</button>
              <button data-entry="notebook" onClick={onNotebook}>Notebook</button>
              <button data-entry="options" onClick={() => open("options")}>Options</button>
              <button data-entry="restart" onClick={() => open("restart")}>New run</button>
              <a data-entry="credits" href="/credits.html" target="_blank" rel="noreferrer">Credits</a>
            </>
          )}
          {screen === "options" && (
            <>
              <button data-entry="sound" onClick={onSound} aria-label="Sound" aria-pressed={sound}>
                <span>Sound</span><span className="pause-value" aria-hidden="true">{sound ? "On" : "Off"}</span>
              </button>
              <button data-entry="motion" onClick={onMotion} aria-label="Reduced motion" aria-pressed={reducedMotion}>
                <span>Reduced motion</span><span className="pause-value" aria-hidden="true">{reducedMotion ? "On" : "Off"}</span>
              </button>
              <button data-entry="back" onClick={back}>Back</button>
            </>
          )}
          {screen === "restart" && (
            <>
              <button data-entry="cancel" onClick={back}>Cancel</button>
              <button data-entry="confirm" onClick={onRestart}>Start new run</button>
            </>
          )}
        </nav>
        <button className="pause-back" onClick={back} aria-label={screen === "main" ? "Close pause" : "Back to pause menu"}>
          <kbd>Esc</kbd><span>{screen === "main" ? "Resume" : "Back"}</span>
        </button>
      </section>
    </Dialog>
  );
}
