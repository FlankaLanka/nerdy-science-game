import type { CSSProperties } from "react";
import { ChevronRight, Power, Volume2, VolumeX } from "lucide-react";
import { CHAMBERS } from "./chambers";

export default function TitleScreen({
  ready,
  returning,
  powered,
  sound,
  onSound,
  onBegin,
}: {
  ready: boolean;
  returning: boolean;
  powered: number;
  sound: boolean;
  onSound: () => void;
  onBegin: () => void;
}) {
  return (
    <section className="title-screen" aria-labelledby="game-title">
      <div className="title-viewport" aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="viewport-metal" x2="0.7" y2="1">
              <stop stopColor="#34484f" />
              <stop offset=".35" stopColor="#0a141c" />
              <stop offset=".8" stopColor="#0c171e" />
              <stop offset="1" stopColor="#3d555d" />
            </linearGradient>
          </defs>
          <path
            d="M0 0H1200V800H0Z M22 57 57 22H1151L1178 49V743L1143 778H49L22 751Z"
            fill="url(#viewport-metal)"
            fillRule="evenodd"
          />
          <path
            d="M22 57 57 22H1151L1178 49V743L1143 778H49L22 751Z"
            stroke="#82999a"
            strokeOpacity=".3"
            fill="none"
          />
          <path
            d="m24 67 43-43m1066 752 43-43"
            stroke="#aec0b8"
            strokeOpacity=".28"
          />
          <path
            d="M160 10h64m752 780h64"
            stroke="#91b2b4"
            strokeOpacity=".25"
            strokeWidth="2"
          />
        </svg>
        <i className="viewport-light" />
        <i className="viewport-reflection" />
      </div>
      <header className="title-identity">
        <svg
          className="station-insignia"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <path d="M10 29 20 7l10 22M14 22h12" />
          <path
            className="insignia-orbit"
            d="M5 18a16 16 0 0 0 26 14M35 22A16 16 0 0 0 9 8"
          />
          <circle cx="34" cy="12" r="2" />
        </svg>
        <span>Deep space research station</span>
      </header>
      <div className="title-content">
        <div className="title-signal" aria-hidden="true">
          <i />
          <span />
          <i />
        </div>
        <h1 id="game-title" aria-label="ASTERION">
          {[..."ASTERION"].map((letter, index) => (
            <span
              aria-hidden="true"
              key={index}
              style={{ "--glyph": index } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </h1>
        <p className="title-tagline">Restore the light.</p>
        <button className="begin-button" disabled={!ready} onClick={onBegin}>
          <svg
            className="begin-outline"
            viewBox="0 0 248 62"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path d="M.5.5H237.5L247.5 10.5V61.5H10.5L.5 51.5Z" />
            <path
              className="begin-current"
              pathLength="100"
              d="M.5 51.5V.5H237.5L247.5 10.5V61.5H10.5Z"
            />
          </svg>
          <Power className="begin-power" aria-hidden="true" />
          <span>{!ready ? "Loading…" : returning ? "Continue" : "Begin"}</span>
          <span className="begin-key" aria-hidden="true">
            <ChevronRight />
          </span>
        </button>
      </div>
      <footer className="title-footer">
        <span className="title-power">
          <span className="power-cells" aria-hidden="true">
            {CHAMBERS.map((c, i) => (
              <i key={c.id} className={i < powered ? "powered" : ""} />
            ))}
          </span>
          {powered === CHAMBERS.length ? "Power restored" : "Reserve power"}
        </span>
        <button
          className="title-sound icon-button"
          aria-label={sound ? "Mute sound" : "Enable sound"}
          aria-pressed={!sound}
          title={sound ? "Mute sound" : "Enable sound"}
          onClick={onSound}
        >
          {sound ? (
            <Volume2 aria-hidden="true" />
          ) : (
            <VolumeX aria-hidden="true" />
          )}
        </button>
      </footer>
    </section>
  );
}
