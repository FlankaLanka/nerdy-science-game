import { X } from "lucide-react";
import { Dialog } from "./Dialog";
import { CHAMBERS, FORMULAS } from "./chambers";
import type { FormulaId } from "./chambers";
import type { Campaign } from "./chamberCampaign";
import { unlockedIndex } from "./chamberCampaign";
import { PART_NAMES } from "./circuitKit";
import type { PartKind } from "./circuitKit";
import { PartSpecimen } from "./PartSpecimen";
import { DECK, PORTALS, deckPoint } from "./scene/shipLayout";
import type { Player } from "./scene/navigation";
import "./notebook.css";
export type NotebookTab = "parts" | "formulas" | "map";
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
  const parts = new Set(
    discovered.flatMap((c) => [
      ...c.initial.parts.map((p) => p.kind),
      ...c.tools,
    ]),
  );
  const formulas = [
    ...new Set(
      discovered.map((c) => c.formula).filter((id): id is FormulaId => !!id),
    ),
  ];
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
                <p className="empty-page">Find formulas as you explore.</p>
              )}
            </div>
          )}
          {tab === "map" && (
            <div className="station-map">
              <svg
                viewBox="60 0 380 540"
                role="img"
                aria-label={`Space station map. You are in chamber ${CHAMBERS[current]?.number ?? "01"}. ${unlocked} of 6 chambers restored.`}
              >
                {DECK.filter(
                  (d) => !CHAMBERS.some((c) => c.x === d.x && c.z === d.z),
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
                {unlocked > 0 && (
                  <path
                    className="map-power-route"
                    d={CHAMBERS.slice(
                      0,
                      Math.min(unlocked + 1, CHAMBERS.length),
                    )
                      .map(
                        (c, i) =>
                          `${i ? "L" : "M"}${deckPoint(c.x, c.z).join(" ")}`,
                      )
                      .join(" ")}
                  />
                )}
                {CHAMBERS.map((c, i) => {
                  const [x, y] = deckPoint(c.x - 6, c.z - 5);
                  return (
                    <g
                      key={c.id}
                      className={`map-room ${i > unlocked ? "locked" : ""} ${state.proofs[i] ? "powered" : ""} ${i === current ? "current" : ""}`}
                    >
                      <rect x={x} y={y} width="120" height="100" rx="3" />
                      <text x={x + 12} y={y + 24}>
                        {c.number}
                      </text>
                      <text className="map-name" x={x + 12} y={y + 81}>
                        {i <= unlocked ? c.name : ""}
                      </text>
                    </g>
                  );
                })}
                {PORTALS.map((p) => {
                  const [x, y] = deckPoint(p.x, p.z);
                  return (
                    <path
                      key={p.system}
                      d={`M ${x - 13} ${y} h 26`}
                      transform={`rotate(${(-p.rotation * 180) / Math.PI} ${x} ${y})`}
                      className={`map-door ${state.proofs[CHAMBERS.findIndex((c) => c.id === p.system)] ? "powered" : ""}`}
                    />
                  );
                })}
                <text
                  className="map-observation"
                  x="350"
                  y="485"
                  textAnchor="middle"
                >
                  OBSERVATION
                </text>
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
                Powered
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
