import { Check } from "lucide-react";
import { Dialog } from "./Dialog";
import type { GameState } from "./game";
import { currentMission } from "./game";
import { MISSIONS } from "./missions";
import { SITES } from "./scene/navigation";
import type { Player } from "./scene/navigation";
import {
  HARBOR,
  LIGHTHOUSE,
  TREE_SPOTS,
  WATER_LEVEL,
} from "./scene/islandLayout";
import { WORKSHOP } from "./scene/workshopLayout";
import { COAST_ROCKS } from "./scene/coastRocks";
import {
  CHART,
  chartPoint,
  SHORE_PATH,
  TIDE_PATH,
  CONTOURS,
  TRAIL_PATHS,
} from "./cartography";

const notes = {
  workshop:
    "Start at the workshop. Repair the broken connection to bring the island’s supply back.",
  harbor:
    "Follow the coastal path east. Restore the harbor relay to send power uphill.",
  beacon:
    "Take the path north to the lighthouse. Give the radio a reliable power supply.",
};
export function IslandMap({
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
  const target = SITES[next];
  const distance = player
    ? Math.round(Math.hypot(target.x - player.x, target.z - player.z))
    : null;
  const [wx, wy] = chartPoint(WORKSHOP.x, WORKSHOP.z),
    [lx, ly] = chartPoint(LIGHTHOUSE.x, LIGHTHOUSE.z);
  const [px, py] = player ? chartPoint(player.x, player.z) : [0, 0];
  const scale = CHART.scale;
  return (
    <Dialog title="Island map" className="map-dialog" onClose={onClose}>
      <header className="screen-heading map-heading">
        <h2>Bramble Island</h2>
        <p>Restore the power. Call for help.</p>
      </header>
      <div className="paper-map">
        <svg
          className="island-chart"
          viewBox="0 0 700 500"
          role="img"
          aria-label="Survey chart of Bramble Island, showing the actual coastline, paths, workshop, harbor, lighthouse and your position. North is up."
        >
          <defs>
            <pattern
              id="sea-hatching"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M2 10q4-3 8 0t8 0"
                fill="none"
                stroke="#6d8b84"
                strokeWidth=".65"
                opacity=".32"
              />
            </pattern>
            <clipPath id="chart-land">
              <path d={SHORE_PATH} />
            </clipPath>
            <g id="chart-pine">
              <path
                d="M0 8V-7M0-7l-5 8h3l-5 8H7L2 1h3Z"
                fill="#6d785044"
                stroke="#536044"
                strokeWidth=".9"
                strokeLinejoin="round"
              />
            </g>
          </defs>
          <rect
            x="22"
            y="18"
            width="656"
            height="464"
            rx="6"
            fill="url(#sea-hatching)"
            opacity=".7"
          />
          <path
            d={TIDE_PATH}
            fill="none"
            stroke="#738c80"
            strokeWidth=".9"
            opacity=".7"
          />
          <path
            d={SHORE_PATH}
            fill="#c6bd9277"
            stroke="#5b6951"
            strokeWidth="1.8"
          />
          <g clipPath="url(#chart-land)">
            {CONTOURS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#7b7651"
                strokeWidth={i ? 0.65 : 1}
                opacity=".38"
              />
            ))}
            {TREE_SPOTS.map(([x, z], i) => {
              const [a, b] = chartPoint(x, z);
              return (
                <use
                  key={i}
                  href="#chart-pine"
                  transform={`translate(${a} ${b})`}
                />
              );
            })}
            {TRAIL_PATHS.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#ede2c7"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#897551"
                  strokeWidth="1.1"
                  strokeDasharray="3 3"
                />
              </g>
            ))}
          </g>
          <g className="chart-rocks">
            {COAST_ROCKS.filter(
              (rock) => rock.y + rock.scale * 0.65 > WATER_LEVEL,
            ).map((rock) => {
              const [x, y] = chartPoint(rock.x, rock.z);
              return (
                <path
                  key={rock.i}
                  d="M-3-2 0-3 3-1 2 2-1 3-3 1Z"
                  transform={`translate(${x} ${y}) rotate(${rock.i * 109}) scale(${rock.scale * 1.05})`}
                />
              );
            })}
          </g>
          <g
            className="chart-buildings"
            fill="#9b7657"
            stroke="#59452f"
            strokeWidth="1.2"
          >
            <rect
              x={wx - (WORKSHOP.width * scale) / 2}
              y={wy - (WORKSHOP.depth * scale) / 2}
              width={WORKSHOP.width * scale}
              height={WORKSHOP.depth * scale}
            />
            <path
              d={`M${wx} ${wy - (WORKSHOP.depth * scale) / 2}v${WORKSHOP.depth * scale}`}
            />
            <rect
              x={wx - (WORKSHOP.width * scale) / 2}
              y={wy + (WORKSHOP.depth * scale) / 2}
              width={WORKSHOP.width * scale}
              height={WORKSHOP.porchDepth * scale}
              fill="#ac956955"
            />
            <circle
              cx={lx}
              cy={ly}
              r={LIGHTHOUSE.radius * scale}
              fill="#dfd3b1"
            />
            <circle cx={lx} cy={ly} r="7" />
            <rect
              x={chartPoint(HARBOR.approach, HARBOR.z)[0]}
              y={chartPoint(0, HARBOR.z - HARBOR.width / 2)[1]}
              width={(HARBOR.end - HARBOR.approach) * scale}
              height={HARBOR.width * scale}
              fill="#9a8055"
            />
            {Array.from({ length: 13 }, (_, i) => (
              <path
                key={i}
                d={`M${chartPoint(HARBOR.start + i, HARBOR.z - HARBOR.width / 2)[0]} ${chartPoint(0, HARBOR.z - HARBOR.width / 2)[1]}v${HARBOR.width * scale}`}
                strokeWidth=".55"
              />
            ))}
          </g>
          <g className="chart-label-lines">
            <path d={`M${wx - 28} ${wy - 12}l-22-24H187`} />
            <path d={`M${lx + 18} ${ly - 2}L503 123h10`} />
            <path
              d={`M${chartPoint(30, HARBOR.z)[0]} ${chartPoint(0, HARBOR.z)[1]}L550 311`}
            />
          </g>
          <g className="chart-place-names">
            <text x="177" y={wy - 31} textAnchor="end">
              Keeper’s workshop
            </text>
            <text x="519" y="128">
              North Point
            </text>
            <text x="555" y="313">
              Harbor
            </text>
            <text
              x="73"
              y="400"
              transform="rotate(-12 73 400)"
              className="chart-sea-name"
            >
              Western shoals
            </text>
          </g>
          {MISSIONS.map((m) => {
            const [x, y] = chartPoint(SITES[m.id].x, SITES[m.id].z);
            const done = state.completed.includes(m.id);
            return (
              <g
                key={m.id}
                className={`chart-stop ${done ? "restored" : m.id === next ? "next" : ""}`}
                transform={`translate(${x} ${y})`}
                data-site={m.id}
                data-world-x={SITES[m.id].x}
                data-world-z={SITES[m.id].z}
              >
                <circle r="11" />
                {done ? (
                  <path d="m-5 0 3 3 7-7" />
                ) : (
                  <text textAnchor="middle" y="5">
                    {Number(m.number)}
                  </text>
                )}
                {m.id === next && !state.distressSent && (
                  <circle className="chart-target-ring" r="16" />
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
              <circle r="7" />
              <path
                d="M0-11 5 6 0 3-5 6Z"
                transform={`rotate(${(-player.yaw * 180) / Math.PI})`}
              />
              <text x="17" y="25">
                You are here
              </text>
            </g>
          )}
          <g className="chart-compass" transform="translate(82 81)">
            <circle r="24" />
            <path d="M0-30 6 0 0 30-6 0ZM-30 0 0-6 30 0 0 6Z" />
            <path d="M0-30 6 0H0Z" fill="currentColor" />
            <text textAnchor="middle" y="-38">
              N
            </text>
          </g>
          <g className="chart-scale" transform="translate(45 451)">
            <path d={`M0-4v8m0-4h${10 * scale}m0-4v8m${-5 * scale}-8v8`} />
            <text x="0" y="24">
              0
            </text>
            <text x={10 * scale} y="24" textAnchor="middle">
              10 m
            </text>
          </g>
          <g className="chart-legend" transform="translate(270 474)">
            <path d="M0 0h26" strokeDasharray="3 3" />
            <text x="36" y="5">
              Footpath
            </text>
            <circle cx="152" cy="0" r="7" className="chart-legend-restored" />
            <path d="m148 0 3 3 6-6" className="chart-legend-check" />
            <text x="168" y="5">
              Power restored
            </text>
          </g>
        </svg>
        <aside className="map-plan">
          <h3>
            {state.distressSent
              ? "Help is on the way."
              : allDone
                ? "The radio is ready."
                : "A way off the island"}
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
                    <Check size={19} />
                  ) : (
                    Number(m.number)
                  )}
                </span>
                <div>
                  {SITES[m.id].name}
                  <small>
                    {state.completed.includes(m.id)
                      ? "Power restored"
                      : m.id === next
                        ? "Next repair"
                        : "No power"}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <div className="map-next">
            <p>
              {state.distressSent
                ? "Stay near the lighthouse. The coastguard has your position."
                : allDone
                  ? "Use the lighthouse radio to send a distress call."
                  : notes[next]}
            </p>
            {distance !== null && !state.distressSent && (
              <span>
                {distance} m to {allDone ? "the radio" : "the next repair"}
              </span>
            )}
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
