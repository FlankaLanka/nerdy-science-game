import { Check, Navigation, Radio } from "lucide-react";
import { Dialog } from "./Dialog";
import { currentMission } from "./game";
import type { GameState } from "./game";
import { MISSIONS } from "./missions";
import { DECK, DOORWAYS, FURNITURE, deckPoint } from "./scene/shipLayout";
import { SYSTEM_ORDER } from "./shipSystems";
import { SITES } from "./scene/navigation";
import type { Player } from "./scene/navigation";

export function ShipMap({
  state,
  player,
  onClose,
}: {
  state: GameState;
  player: Player | null;
  onClose: () => void;
}) {
  const next = currentMission(state),
    allDone = state.completed.length === 3;
  const [px, py] = player ? deckPoint(player.x, player.z) : [0, 0];
  const distance = player
    ? Math.round(Math.hypot(SITES[next].x - player.x, SITES[next].z - player.z))
    : null;
  const notes = {
    workshop:
      "Restore auxiliary power at the marked engineering console. This releases the first bulkhead and restores deck lighting.",
    harbor:
      "Follow the center passage forward. The distribution console is to starboard of the reactor.",
    beacon:
      "Continue through the forward bulkhead. Build a reliable supply for the distress transmitter.",
  };
  return (
    <Dialog title="Deck map" className="map-dialog" onClose={onClose}>
      <header className="screen-heading map-heading">
        <div>
          <span className="eyebrow">ASTERION / NAVIGATION</span>
          <h2>Deck map</h2>
        </div>
        <p>
          DECK 07 <span className="status-dot" /> LIVE POSITION
        </p>
      </header>
      <div className="deck-map">
        <svg
          className="ship-chart"
          viewBox="0 0 700 460"
          role="img"
          aria-label="Deck plan of Asterion showing engineering, the power relay, command deck, and your position. Forward is up."
        >
          <defs>
            <pattern
              id="deck-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M24 0H0V24"
                fill="none"
                stroke="#5d8b9e"
                strokeWidth=".45"
                opacity=".22"
              />
            </pattern>
            <linearGradient id="deck-fill" x2="1" y2="1">
              <stop stopColor="#12333d" />
              <stop offset="1" stopColor="#0b1a2a" />
            </linearGradient>
          </defs>
          <rect width="700" height="460" fill="url(#deck-grid)" />
          <path
            d="M350 20V435"
            stroke="#5c8597"
            strokeDasharray="3 8"
            opacity=".35"
          />
          <path d="M350 17l-5 8h10Z" fill="#8aa3b6" />
          <text x="367" y="26" className="chart-micro">
            FORWARD
          </text>
          {DECK.map((room) => {
            const [x, y] = deckPoint(room.x, room.z);
            return (
              <g key={room.id}>
                <rect
                  x={x - room.width * 3.6}
                  y={y - room.depth * 3.6}
                  width={room.width * 7.2}
                  height={room.depth * 7.2}
                  fill="url(#deck-fill)"
                  stroke={room.color}
                  strokeWidth="1.2"
                  opacity=".85"
                />
                {room.width > 6 && (
                  <rect
                    x={x - room.width * 3.6 + 5}
                    y={y - room.depth * 3.6 + 5}
                    width={room.width * 7.2 - 10}
                    height={room.depth * 7.2 - 10}
                    fill="none"
                    stroke={room.color}
                    strokeWidth=".45"
                    opacity=".25"
                  />
                )}
              </g>
            );
          })}
          <g stroke="#81a7bd" fill="none" opacity=".65">
            <path d="M274 92H163l-22-22H85M413 225h50l20 22h140M283 353h-63l-25 22H70" />
            {FURNITURE.map((item, i) => {
              const [x, y] = deckPoint(item.x, item.z);
              return "radius" in item ? (
                <circle key={i} cx={x} cy={y} r={item.radius * 7.2} />
              ) : (
                <rect
                  key={i}
                  x={x - item.width * 3.6}
                  y={y - item.depth * 3.6}
                  width={item.width * 7.2}
                  height={item.depth * 7.2}
                />
              );
            })}
          </g>
          {DOORWAYS.map((z, index) => {
            const [x, y] = deckPoint(0, z);
            const released = state.completed.includes(SYSTEM_ORDER[index]);
            return (
              <g
                key={z}
                transform={`translate(${x} ${y})`}
                className={`chart-bulkhead ${released ? "released" : "sealed"}`}
                aria-label={`Bulkhead ${index + 1}: ${released ? "released" : "sealed"}`}
              >
                <path d={released ? "M-19-4v8m38-8v8" : "M-19 0h38"} />
                <text x="28" y="3">
                  {released ? "RELEASED" : "SEALED"}
                </text>
              </g>
            );
          })}
          <g className="chart-place-names">
            <text x="85" y="58">
              03 / COMMAND
            </text>
            <text x="85" y="77" className="chart-micro">
              DISTRESS TRANSMITTER
            </text>
            <text x="484" y="234">
              02 / POWER RELAY
            </text>
            <text x="484" y="266" className="chart-micro">
              DISTRIBUTION BUS
            </text>
            <text x="70" y="364">
              01 / ENGINEERING
            </text>
            <text x="70" y="395" className="chart-micro">
              AUXILIARY POWER
            </text>
          </g>
          {MISSIONS.map((m) => {
            const [x, y] = deckPoint(SITES[m.id].x, SITES[m.id].z),
              done = state.completed.includes(m.id);
            return (
              <g
                key={m.id}
                className={`chart-stop ${done ? "restored" : m.id === next ? "next" : ""}`}
                transform={`translate(${x} ${y})`}
                data-site={m.id}
                data-world-x={SITES[m.id].x}
                data-world-z={SITES[m.id].z}
              >
                <circle r="9" />
                {done ? (
                  <path d="m-4 0 3 3 6-6" />
                ) : (
                  <text textAnchor="middle" y="3.5">
                    {Number(m.number)}
                  </text>
                )}
                {m.id === next && !state.distressSent && (
                  <circle className="chart-target-ring" r="15" />
                )}
              </g>
            );
          })}
          {player && (
            <g
              className="chart-player"
              transform={`translate(${px} ${py})`}
              data-world-x={player.x}
              data-world-z={player.z}
              aria-label="You are here"
            >
              <circle r="9" />
              <path
                d="M0-9 5 6 0 3-5 6Z"
                transform={`rotate(${(-player.yaw * 180) / Math.PI})`}
              />
              <text x="18" y="5">
                YOU
              </text>
            </g>
          )}
          <g className="chart-scale" transform="translate(45 429)">
            <path d="M0-4v8m0-4h72m0-4v8" />
            <text x="0" y="19">
              10 M
            </text>
          </g>
          <text x="655" y="441" textAnchor="end" className="chart-micro">
            PRESSURIZED DECK
          </text>
          <rect
            className="chart-scan"
            width="700"
            height="1"
            y="0"
            fill="#60eadb"
            opacity=".25"
          />
        </svg>
        <aside className="map-plan">
          <span className="eyebrow">RECOVERY SEQUENCE</span>
          <h3>
            {state.distressSent
              ? "Signal received."
              : allDone
                ? "Ready to transmit."
                : "Bring us back online."}
          </h3>
          <ol className="map-stops">
            {MISSIONS.map((m) => (
              <li
                key={m.id}
                className={
                  state.completed.includes(m.id)
                    ? "done"
                    : m.id === next
                      ? "current"
                      : ""
                }
                aria-current={m.id === next && !allDone ? "step" : undefined}
              >
                <span>
                  {state.completed.includes(m.id) ? (
                    <Check size={16} />
                  ) : (
                    m.number
                  )}
                </span>
                <div>
                  {SITES[m.id].name}
                  <small>
                    {state.completed.includes(m.id)
                      ? "SYSTEM ONLINE"
                      : m.id === next
                        ? "MANUAL REPAIR REQUIRED"
                        : "AWAITING POWER"}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <div className="map-next">
            {state.distressSent ? (
              <Radio size={17} />
            ) : (
              <Navigation size={17} />
            )}
            <p>
              {state.distressSent
                ? "Rescue control has your coordinates. Keep the transmitter online."
                : allDone
                  ? "Use the command console to send your distress signal."
                  : notes[next]}
            </p>
            {distance !== null && !state.distressSent && (
              <span>
                {distance} M TO {allDone ? "TRANSMITTER" : "NEXT REPAIR"}
              </span>
            )}
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
