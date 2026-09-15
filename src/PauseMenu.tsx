import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Dialog } from "./Dialog";
import "./pause.css";

type Screen = "main" | "options" | "restart";

export default function PauseMenu({
  sound,
  reducedMotion,
  godMode,
  onResume,
  onNotebook,
  onSound,
  onMotion,
  onGodMode,
  onRestart,
}: {
  sound: boolean;
  reducedMotion: boolean;
  godMode: boolean;
  onResume: () => void;
  onNotebook: () => void;
  onSound: () => void;
  onMotion: () => void;
  onGodMode: () => void;
  onRestart: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("main");
  const menu = useRef<HTMLElement>(null);
  const returnTo = useRef("resume");

  function open(next: Screen) {
    returnTo.current = next;
    setScreen(next);
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
      title="Pause"
      onClose={onResume}
      className="pause-dialog"
      reducedMotion={reducedMotion}
      exitMs={140}
      closeControl={() => null}
      initialFocus={`[data-entry="${screen === "main" ? returnTo.current : screen === "options" ? "sound" : "cancel"}"]`}
    >
      {(close) => (
        <section
          className="pause-panel"
          aria-labelledby="pause-title"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || screen === "main" || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) setScreen("main");
          }}
        >
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
                <button data-entry="resume" onClick={close}>Resume</button>
                <button data-entry="notebook" onClick={onNotebook}>Notebook</button>
                <button data-entry="options" onClick={() => open("options")}>Options</button>
                <button data-entry="god-mode" onClick={onGodMode} aria-label="God mode (dev)" aria-pressed={godMode} title="Bypass progression doors">
                  <span>God mode <small>Dev</small></span><span className="pause-value" aria-hidden="true">{godMode ? "On" : "Off"}</span>
                </button>
                <button data-entry="restart" onClick={() => open("restart")}>New run</button>
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
                <button data-entry="back" onClick={() => setScreen("main")}>Back</button>
              </>
            )}
            {screen === "restart" && (
              <>
                <button data-entry="cancel" onClick={() => setScreen("main")}>Cancel</button>
                <button data-entry="confirm" onClick={onRestart}>Start new run</button>
              </>
            )}
          </nav>
          <button className="pause-back" onClick={screen === "main" ? close : () => setScreen("main")} aria-label={screen === "main" ? "Close pause" : "Back to pause menu"}>
            <kbd>Esc</kbd><span>{screen === "main" ? "Resume" : "Back"}</span>
          </button>
        </section>
      )}
    </Dialog>
  );
}
