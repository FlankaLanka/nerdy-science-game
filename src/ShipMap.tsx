import { Check, Navigation } from "lucide-react";
import { Dialog } from "./Dialog";
import { currentMission } from "./campaign";
import type { GameState } from "./campaign";
import { ACTIVITIES, available, activity } from "./activities";
import type { ActivityId } from "./activities";
import { DECK, FURNITURE, deckPoint } from "./scene/shipLayout";
import type { Player } from "./scene/navigation";
export function ShipMap({
  state,
  player,
  onClose,
  onTrack,
}: {
  state: GameState;
  player: Player | null;
  onClose: () => void;
  onTrack: (id: ActivityId) => void;
}) {
  const next = currentMission(state);
  const [px, py] = player ? deckPoint(player.x, player.z) : [0, 0];
  return (
    <Dialog
      title="Deck map"
      className="map-dialog exploration-map"
      onClose={onClose}
    >
      <header className="screen-heading map-heading">
        <div>
          <span className="eyebrow">ASTERION / MAINTENANCE DECK</span>
          <h2>Station map</h2>
        </div>
        <p>TWO SERVICE LOOPS · LIVE POSITION</p>
      </header>
      <div className="deck-map">
        <svg
          className="ship-chart"
          viewBox="0 0 700 460"
          role="img"
          aria-label="Connected station plan. West loop: materials and life support. East loop: distribution and reserve vault. Cross passage leads to command."
        >
          <defs>
            <pattern
              id="station-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M20 0H0V20"
                fill="none"
                stroke="#7a9f8c"
                strokeWidth=".5"
                opacity=".2"
              />
            </pattern>
          </defs>
          <rect width="700" height="460" fill="url(#station-grid)" />
          {DECK.map((room) => {
            const [x, y] = deckPoint(room.x, room.z);
            return (
              <rect
                key={room.id}
                x={x - room.width * 4}
                y={y - room.depth * 4}
                width={room.width * 8}
                height={room.depth * 8}
                fill="#192925"
                stroke={room.color}
                strokeWidth="1"
              />
            );
          })}
          <g stroke="#698071" fill="#304139">
            {FURNITURE.map((f, i) => {
              const [x, y] = deckPoint(f.x, f.z);
              return "radius" in f ? (
                <circle key={i} cx={x} cy={y} r={f.radius * 8} />
              ) : (
                <rect
                  key={i}
                  x={x - f.width * 4}
                  y={y - f.depth * 4}
                  width={f.width * 8}
                  height={f.depth * 8}
                />
              );
            })}
          </g>
          {ACTIVITIES.map((a) => {
            const [x, y] = deckPoint(a.x, a.z),
              done = state.completed.includes(a.id),
              ready = available(a.id, state.completed);
            return (
              <g
                key={a.id}
                className={`chart-stop ${done ? "restored" : a.id === next ? "next" : ""}`}
                transform={`translate(${x} ${y})`}
                aria-label={`${a.name}: ${done ? "online" : ready ? "repair available" : "inspection available"}`}
                data-site={a.id}
                data-world-x={a.x}
                data-world-z={a.z}
              >
                <circle r="10" />
                {done ? (
                  <path d="m-4 0 3 3 6-6" />
                ) : (
                  <text y="3.5" textAnchor="middle">
                    {a.code.split("–")[1]}
                  </text>
                )}
                <text
                  className="chart-room-label"
                  x={
                    a.id === "timing" || a.id === "beacon"
                      ? 0
                      : a.x > 8
                        ? 22
                        : a.x < -8
                          ? -22
                          : 20
                  }
                  y={a.id === "timing" || a.id === "beacon" ? -23 : -6}
                  textAnchor={
                    a.id === "timing" || a.id === "beacon"
                      ? "middle"
                      : a.x < -8
                        ? "end"
                        : "start"
                  }
                >
                  {a.name}
                </text>
                {a.id === next && (
                  <circle r="16" className="chart-target-ring" />
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
              <text x="15" y="4">
                YOU
              </text>
            </g>
          )}
          <text x="40" y="440" className="chart-micro">
            N ↑ · 8 PX / M · PRESSURIZED DECK
          </text>
        </svg>
        <aside className="map-plan">
          <span className="eyebrow">CHOOSE YOUR NEXT REPAIR</span>
          <h3>
            {state.distressSent ? "Contact established." : "Follow the fault."}
          </h3>
          <p className="map-exploration-note">
            Explore either wing. Repair dependencies show which systems need
            incoming power.
          </p>
          <div className="activity-map-list">
            {ACTIVITIES.map((a) => {
              const done = state.completed.includes(a.id),
                ready = available(a.id, state.completed);
              return (
                <button
                  key={a.id}
                  disabled={done || !ready}
                  onClick={() => onTrack(a.id)}
                  className={a.id === next ? "tracked" : ""}
                >
                  <span>
                    {done ? <Check size={14} /> : a.code.split("–")[1]}
                  </span>
                  <div>
                    {a.name}
                    <small>
                      {done
                        ? "ONLINE"
                        : ready
                          ? "TRACK REPAIR"
                          : a.prerequisites
                              .filter((id) => !state.completed.includes(id))
                              .map((id) => activity(id).name)
                              .join(" + ")}
                    </small>
                  </div>
                  {ready && !done && <Navigation size={13} />}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
