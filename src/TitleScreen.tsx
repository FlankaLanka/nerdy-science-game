import { ArrowRight } from "lucide-react";
import "./title.css";

export default function TitleScreen({
  ready,
  returning,
  onBegin,
}: {
  ready: boolean;
  returning: boolean;
  onBegin: () => void;
}) {
  return (
    <section className="title-screen" aria-labelledby="game-title">
      <div className="title-content">
        <h1 id="game-title">ASTERION</h1>
        <button className="begin-button" disabled={!ready} onClick={onBegin}>
          <ArrowRight aria-hidden="true" />
          <span>{!ready ? "Loading" : returning ? "Continue" : "Begin"}</span>
        </button>
      </div>
    </section>
  );
}
