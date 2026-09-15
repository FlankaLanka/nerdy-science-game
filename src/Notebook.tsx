import { Check, LockKeyhole, X } from "lucide-react";
import { Dialog } from "./Dialog";
import { CHAMBERS, FORMULAS } from "./chambers";
import type { Campaign } from "./chamberCampaign";
import { poweredIds, unlockedIndex } from "./chamberCampaign";
import { PART_NAMES } from "./circuitKit";
import type { PartKind } from "./circuitKit";
import { PartSpecimen } from "./PartSpecimen";
import { DECK, PORTALS, deckPoint, deckSection } from "./scene/shipLayout";
import { STATION_DECK, STATION_FURNITURE, FUTURE_LABS, FUTURE_LAB_STATUS, inMainStation } from "./scene/stationLayout";
import type { Player } from "./scene/navigation";
import "./notebook.css";
export type NotebookTab = "parts" | "formulas" | "map" | "progression";
const notes: Record<PartKind, string> = {
  battery: "Maintains voltage between its contacts.",
  bulb: "Transfers electrical energy into light and heat.",
  resistor: "Limits current. Measured in ohms (Ω).",
  switch: "Opens or closes the circuit.",
} as Record<PartKind, string>;
const order: PartKind[] = ["battery", "bulb", "switch", "resistor"];
export default function Notebook({
  state,
  tab,
  onTab,
  onClose,
  player,
  current,
  reducedMotion,
  onSound,
}: {
  state: Campaign;
  tab: NotebookTab;
  onTab: (tab: NotebookTab) => void;
  onClose: () => void;
  player: Player;
  current: number;
  reducedMotion: boolean;
  onSound: (kind: "tablet-close" | "tab") => void;
}) {
  const discovered = CHAMBERS.filter((c) => state.visited.includes(c.id));
  const powered = new Set(poweredIds(state));
  const parts = new Set(
    discovered.flatMap((c) => [
      ...c.initial.parts.map((p) => p.kind),
      ...c.tools,
    ]),
  );
  const formulas = state.formulas;
  const stationMap = inMainStation(player.x, player.z) || (player.x >= 4 && player.x <= 16 && player.z >= 27);
  const unlocked = unlockedIndex(state),
    [px, py] = deckPoint(player.x, player.z);
  return (
    <Dialog
      title="Notebook"
      onClose={onClose}
      className="notebook"
      reducedMotion={reducedMotion}
      exitMs={220}
      dismissKeys={["KeyN", "KeyJ"]}
      onDismiss={() => onSound("tablet-close")}
      closeControl={(close) => (
        <button
          className="notebook-close-button"
          aria-label="Close notebook"
          title="Close notebook · N / Esc"
          onClick={close}
        >
          <X aria-hidden="true" />
        </button>
      )}
    >
      <div className="tablet-hardware" aria-hidden="true">
        <i className="tablet-camera" />
        <i className="tablet-speaker" />
        <i className="tablet-volume-key" />
        <i className="tablet-fastener tl" />
        <i className="tablet-fastener tr" />
        <i className="tablet-fastener bl" />
        <i className="tablet-fastener br" />
      </div>
      <div className="tablet-display" data-dialog-surface>
        <header className="notebook-header">
          <h1>Notebook</h1>
        </header>
        <nav
          className="notebook-tabs"
          aria-label="Notebook sections"
        >
          {(
            [
              { id: "parts", name: "Parts" },
              { id: "formulas", name: "Formulas" },
              { id: "map", name: "Map" },
              { id: "progression", name: "Progression" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => {
                if (tab === t.id) return;
                onSound("tab");
                onTab(t.id);
              }}
            >
              {t.name}
            </button>
          ))}
        </nav>
        <div
          className={`notebook-page page-${tab}`}
          key={tab}
          role="region"
          aria-label={`${tab[0].toUpperCase()}${tab.slice(1)} notes`}
          tabIndex={0}
        >
          {tab === "parts" && (
            <div className="part-index">
              {parts.has("wire") && (
                <article>
                  <PartSpecimen kind="wire" />
                  <div>
                    <h2>Wire</h2>
                    <p>
                      Connects parts. Only its contacts conduct.
                    </p>
                  </div>
                </article>
              )}
              {order
                .filter((kind) => parts.has(kind))
                .map((kind) => (
                  <article key={kind}>
                    <PartSpecimen kind={kind} />
                    <div>
                      <h2>{PART_NAMES[kind]}</h2>
                      <p>{notes[kind]}</p>
                      {kind === "bulb" && <small>6 V · 12 Ω</small>}
                    </div>
                  </article>
                ))}
              {!parts.size && (
                <p className="empty-page">Explore to discover parts.</p>
              )}
              {parts.has("wire") && (
                <small className="notebook-footnote">
                  Current flows from + to − outside the battery.
                </small>
              )}
            </div>
          )}
          {tab === "formulas" && (
            <div className="formula-index">
              {formulas.map((id) => (
                <article key={id}>
                  <h2>{FORMULAS[id].name}</h2>
                  <p className="equation">{FORMULAS[id].equation}</p>
                  <p>{FORMULAS[id].note}</p>
                </article>
              ))}
              {!formulas.length && (
                <p className="empty-page">Inspect formula screens to add notes.</p>
              )}
            </div>
          )}
          {tab === "progression" && (
            <div className="progression-index">
              <section aria-labelledby="circuits-progress-title">
                <header className="progression-heading">
                  <h2 id="circuits-progress-title">Circuits</h2>
                  <p>{state.proofs.filter(Boolean).length} / {CHAMBERS.length} complete</p>
                </header>
                <ol className="progression-levels" aria-label="Circuit levels">
                  {CHAMBERS.map((c, i) => {
                    const status = state.proofs[i] ? "Complete" : state.visited.includes(c.id) ? "In progress"
                      : i > unlocked ? "Locked" : "Ready";
                    return (
                      <li key={c.id} data-state={status.toLowerCase().replace(" ", "-")}>
                        <span className="progression-number">{c.number}</span>
                        <span className="progression-name">{c.name}</span>
                        <span className="progression-status">
                          {status === "Complete" && <Check aria-hidden="true" />}
                          {status === "Locked" && <LockKeyhole aria-hidden="true" />}
                          {status}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
              <section aria-labelledby="future-progress-title">
                <h2 id="future-progress-title">Future labs</h2>
                <ul className="progression-labs" aria-label="Future labs">
                  {FUTURE_LABS.map((lab) => (
                    <li key={lab.code}>
                      <div>
                        <h3>{lab.name}</h3>
                        <p><LockKeyhole aria-hidden="true" />Locked · {FUTURE_LAB_STATUS}</p>
                      </div>
                      <span className="progression-count">0 / {lab.levels} levels</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          {tab === "map" && (
            <div className="station-map">
              <svg
                viewBox={stationMap ? "20 390 660 730" : "60 0 380 540"}
                style={{ overflow: "hidden" }}
                role="img"
                aria-label={`Space station map. You are in ${deckSection(player.z, player.x)}. ${state.proofs.filter(Boolean).length} of 6 chambers restored.`}
              >
                {DECK.filter(
                  (d) => !CHAMBERS.some((c) => c.x === d.x && c.z === d.z) &&
                    (stationMap ? d.station || d.name === "Arrival gallery" : !d.station),
                ).map((d, i) => {
                  const [x, y] = deckPoint(
                    d.x - d.width / 2,
                    d.z - d.depth / 2,
                  );
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width={d.width * 10}
                      height={d.depth * 10}
                      rx="2"
                      className="map-corridor"
                    />
                  );
                })}
                {!stationMap && CHAMBERS.slice(0, -1).filter(c => powered.has(c.id)).map(c => (
                  <path
                    key={`power-${c.id}`}
                    className="map-power-route"
                    d={`M${deckPoint(c.x, c.z).join(" ")}L${deckPoint(CHAMBERS[CHAMBERS.indexOf(c) + 1].x, CHAMBERS[CHAMBERS.indexOf(c) + 1].z).join(" ")}`}
                  />
                ))}
                {!stationMap && CHAMBERS.map((c, i) => {
                  const [x, y] = deckPoint(c.x - 6, c.z - 5);
                  const discovered = i <= unlocked || state.visited.includes(c.id) || !!state.proofs[i];
                  return (
                    <g
                      key={c.id}
                      className={`map-room ${!discovered ? "locked" : ""} ${powered.has(c.id) ? "powered" : ""} ${i === current ? "current" : ""}`}
                    >
                      <rect x={x} y={y} width="120" height="100" rx="3" />
                      <text x={x + 12} y={y + 24}>
                        {c.number}
                      </text>
                      <text className="map-name" x={x + 12} y={y + 81}>
                        {discovered ? c.name : ""}
                      </text>
                    </g>
                  );
                })}
                {PORTALS.filter((p) => !stationMap || p.system === "branch").map((p) => {
                  const [x, y] = deckPoint(p.x, p.z);
                  return (
                    <path
                      key={p.system}
                      d={`M ${x - 13} ${y} h 26`}
                      transform={`rotate(${(-p.rotation * 180) / Math.PI} ${x} ${y})`}
                      className={`map-door ${powered.has(p.system) ? "powered" : ""}`}
                    />
                  );
                })}
                {!stationMap && <text
                  className="map-observation"
                  x="350"
                  y="485"
                  textAnchor="middle"
                >
                  MAIN STATION ↑
                </text>}
                {stationMap && <text className="map-station-label" x="350" y="478" textAnchor="middle">Circuits</text>}
                {stationMap && STATION_DECK.filter((d) => d.width > 4).map((d) => {
                  const [x, y] = deckPoint(d.x, d.z - d.depth / 2 + 2.5);
                  return <text key={d.name} className="map-station-label" x={x} y={y} textAnchor="middle">
                    {d.name.replace("Station commons", "Commons").replace("Research concourse", "Research")}
                  </text>;
                })}
                {stationMap && STATION_FURNITURE.map((f) => {
                  const [x, y] = deckPoint(f.x - f.width / 2, f.z - f.depth / 2);
                  return <rect key={`${f.x}:${f.z}`} className="map-furniture" x={x} y={y} width={f.width * 10} height={f.depth * 10} rx="3" />;
                })}
                {stationMap && FUTURE_LABS.map((lab) => {
                  const [x, y] = deckPoint(lab.x - 0.8, lab.z);
                  return <text key={lab.code} className="map-lab-label" x={x} y={y} textAnchor="end">{lab.name}</text>;
                })}
                <g
                  transform={`translate(${px} ${py}) rotate(${(-player.yaw * 180) / Math.PI})`}
                  className="map-player"
                >
                  <circle r="12" />
                  <path d="M0-8 5 6 0 3 -5 6Z" />
                </g>
              </svg>
              <p className="map-legend">
                <span className="map-you" />
                You
                <span className="map-power" />
                {stationMap ? "Open station" : "Powered"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
