import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { gameScale } from "./viewport";

/** One 1280×720 composition, scaled as a unit. Menus never reflow into a page. */
export function GameViewport({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const resize = () =>
      document.documentElement.style.setProperty(
        "--game-scale",
        String(gameScale()),
      );
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return (
    <div className="game-screen">
      <div className="game-stage">{children}</div>
    </div>
  );
}
