import { useId } from "react";
import type { Tool } from "./circuitKit";

/** Small illustrations of the same hardware used on the bench. No extra renderer. */
export function PartSpecimen({ kind }: { kind: Tool }) {
  const id = useId(),
    metal = `${id}-metal`,
    glass = `${id}-glass`,
    cell = `${id}-cell`;
  return (
    <svg
      className={`part-specimen specimen-${kind}`}
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="0.3" y2="1">
          <stop stopColor="#d8e2df" />
          <stop offset="0.28" stopColor="#738a88" />
          <stop offset="0.64" stopColor="#283c3f" />
          <stop offset="1" stopColor="#819795" />
        </linearGradient>
        <radialGradient id={glass} cx="0.35" cy="0.25" r="0.8">
          <stop stopColor="#d5f6ed" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#799eb0" stopOpacity="0.06" />
          <stop offset="1" stopColor="#b7ddd6" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={cell} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#9cae99" />
          <stop offset="0.3" stopColor="#607e72" />
          <stop offset="1" stopColor="#1e3530" />
        </linearGradient>
      </defs>
      <path
        d="M10 30V12h18m64 0h18v18M10 66v18h18m64 0h18V66"
        stroke="#91cfc3"
        strokeOpacity=".2"
      />
      <ellipse cx="60" cy="76" rx="37" ry="6" fill="#000" opacity=".35" />
      {kind === "wire" && (
        <>
          <path
            d="M24 67C62 86 37 20 83 35"
            stroke="#0d191a"
            strokeWidth="11"
          />
          <path d="M24 65C62 84 37 18 83 33" stroke="#a7834e" strokeWidth="7" />
          <path
            d="M24 63C62 82 37 16 83 31"
            stroke="#ddba73"
            strokeWidth="1.5"
          />
          <path
            d="m16 63 10 4m56-36 12 2"
            stroke={`url(#${metal})`}
            strokeWidth="9"
          />
          <circle cx="16" cy="63" r="4" stroke="#b9d1ca" strokeWidth="2" />
          <circle cx="94" cy="33" r="4" stroke="#b9d1ca" strokeWidth="2" />
        </>
      )}
      {kind === "battery" && (
        <>
          <rect
            x="24"
            y="31"
            width="70"
            height="38"
            rx="8"
            fill={`url(#${cell})`}
            stroke="#92a89b"
            strokeWidth=".7"
          />
          <path d="M77 32v36M81 32v36" stroke="#acb89b" strokeOpacity=".4" />
          <ellipse cx="27" cy="50" rx="8" ry="19" fill={`url(#${metal})`} />
          <ellipse cx="21" cy="50" rx="4" ry="9" fill="#c8ac72" />
          <path
            d="M48 40v12m-6-6h12m31 0h6"
            stroke="#c9dfc9"
            strokeWidth="1.5"
          />
          <path d="M36 35h35" stroke="#d2e1c4" strokeOpacity=".45" />
        </>
      )}
      {kind === "bulb" && (
        <>
          <path d="m28 69 33-9 30 10-32 12Z" fill="#c4c9b2" />
          <path d="M28 69v8l31 11v-6m0 6 32-10v-8" fill="#778f84" />
          <rect
            x="50"
            y="50"
            width="22"
            height="21"
            rx="5"
            fill={`url(#${metal})`}
          />
          <path
            d="m51 56 20-3m-20 9 20-3m-20 9 20-3"
            stroke="#bdcfc3"
            strokeOpacity=".5"
          />
          <path
            d="M51 53c0-11-12-13-12-27a22 22 0 0 1 44 0c0 14-12 16-12 27Z"
            fill={`url(#${glass})`}
            stroke="#a6cdc6"
            strokeWidth=".9"
          />
          <path
            d="M56 53V32m10 21V32m-10 0 3-5 4 7 3-2"
            stroke="#e5c387"
            strokeWidth="1.5"
          />
          <path
            d="M45 26c0-8 5-14 12-15"
            stroke="#e4fff4"
            strokeOpacity=".65"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "resistor" && (
        <>
          <path d="M15 51h90" stroke={`url(#${metal})`} strokeWidth="4" />
          <rect
            x="30"
            y="38"
            width="60"
            height="26"
            rx="10"
            fill="#bcad89"
            stroke="#e1d1a9"
            strokeWidth=".7"
          />
          <path
            d="M41 39v24m11-25v26m16-26v26m12-25v24"
            stroke="#72564b"
            strokeWidth="5"
          />
          <path d="M52 38v26" stroke="#a7503f" strokeWidth="5" />
          <path d="M80 39v24" stroke="#c69f57" strokeWidth="3" />
          <path
            d="M39 43h43"
            stroke="#fff6d3"
            strokeWidth="2"
            strokeOpacity=".38"
          />
        </>
      )}
      {kind === "switch" && (
        <>
          <path d="m23 59 51-13 25 13-52 16Z" fill="#b6bdac" />
          <path d="M23 59v9l24 16v-9m0 9 52-16v-9" fill="#61776e" />
          <path d="m38 58 14 8m18-17 14 8" stroke="#bd9e5d" strokeWidth="7" />
          <path d="m48 62 22-35" stroke={`url(#${metal})`} strokeWidth="5" />
          <path
            d="m64 37 11-16"
            stroke="#263d3d"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path d="m66 34 8-12" stroke="#77928b" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
