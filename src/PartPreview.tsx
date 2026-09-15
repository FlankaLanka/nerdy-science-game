import type { Tool } from "./circuitKit";

/** Pre-rendered from the playable kit, including in the WebGL fallback. */
export function PartPreview({ kind }: { kind: Tool }) {
  return <img className="part-preview" src={`/assets/kit/${kind}.png`} width="144" height="96" alt="" draggable={false} />;
}
