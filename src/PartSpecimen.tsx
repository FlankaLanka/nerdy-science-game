import { useId } from "react";
import type { Tool } from "./circuitKit";

/** Notebook views of the bench hardware, on a shared 120 × 96 drawing area. */
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
      focusable="false"
    >
      <defs>
        {/* User-space gradients also render on horizontal and vertical leads. */}
        <linearGradient id={metal} gradientUnits="userSpaceOnUse" x1="0" y1="26" x2="0" y2="76">
          <stop stopColor="#e5eceb" />
          <stop offset="0.35" stopColor="#a9bdc4" />
          <stop offset="0.7" stopColor="#5c7783" />
          <stop offset="1" stopColor="#b7c8cd" />
        </linearGradient>
        <radialGradient id={glass} cx="0.3" cy="0.2" r="0.85">
          <stop stopColor="#e3f5f0" stopOpacity="0.32" />
          <stop offset="0.65" stopColor="#accdd6" stopOpacity="0.04" />
          <stop offset="1" stopColor="#c9e6e4" stopOpacity="0.23" />
        </radialGradient>
        <linearGradient id={cell} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#edb184" />
          <stop offset="0.32" stopColor="#dc9565" />
          <stop offset="1" stopColor="#925839" />
        </linearGradient>
      </defs>
      {kind === "wire" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="60" cy="78" rx="32" ry="3" fill="#06121b" opacity=".25" />
          <path d="M25 66C63 87 39 17 86 33" stroke="#182d36" strokeWidth="10" />
          <path d="M25 65C63 86 39 16 86 32" stroke="#ba8d50" strokeWidth="7" />
          <path d="M25 63C63 84 39 14 86 30" stroke="#e9c588" strokeWidth="1.5" />
          <path d="m16 62 10 4m59-34 15 3" stroke={`url(#${metal})`} strokeWidth="7" />
          <path d="m17 61 8 3m62-33 12 3" stroke="#e4eeeb" strokeOpacity=".7" />
          <circle cx="16" cy="62" r="3.5" fill="#304b57" stroke="#d2dfdc" strokeWidth="1.5" />
          <circle cx="100" cy="35" r="3.5" fill="#304b57" stroke="#d2dfdc" strokeWidth="1.5" />
        </g>
      )}
      {kind === "battery" && (
        <>
          <ellipse cx="60" cy="74" rx="37" ry="3" fill="#06121b" opacity=".25" />
          <rect x="29" y="29" width="68" height="38" rx="7" fill={`url(#${cell})`} stroke="#efc29b" strokeWidth=".75" />
          <path d="M90 30v36" stroke="#6e4737" strokeWidth="2" />
          <path d="M94 31v34" stroke="#263b43" strokeWidth="5" />
          <ellipse cx="29" cy="48" rx="7" ry="19" fill={`url(#${metal})`} stroke="#d1dcdb" strokeWidth=".7" />
          <path d="M20 40h6v16h-6" fill="#b79a60" />
          <ellipse cx="20" cy="48" rx="3" ry="8" fill="#e1c48c" />
          {/* Both marks share the cell's centerline, with equal end insets. */}
          <path d="M46 43v10m-5-5h10M75 48h10" stroke="#fff4df" strokeWidth="2" strokeLinecap="square" />
          <path d="M38 34h47" stroke="#ffe3b8" strokeOpacity=".45" strokeLinecap="round" />
        </>
      )}
      {kind === "bulb" && (
        <>
          <ellipse cx="60" cy="83" rx="32" ry="3" fill="#06121b" opacity=".25" />
          <path d="m28 69 32-10 32 10-32 11Z" fill="#eeeade" stroke="#d6e0db" strokeWidth=".7" />
          <path d="M28 69v6l32 11v-6Z" fill="#9dadab" />
          <path d="m60 80 32-11v6L60 86Z" fill="#bac9c3" />
          <ellipse cx="60" cy="69" rx="15" ry="5" fill="#536d78" />
          <rect x="49" y="53" width="22" height="17" rx="4" fill={`url(#${metal})`} />
          <path d="m50 58 20-3m-20 8 20-3m-20 8 20-3" stroke="#e3c48d" strokeWidth="1.5" />
          <path d="M50 55c0-10-11-12-11-24a21 21 0 0 1 42 0c0 12-11 14-11 24Z" fill={`url(#${glass})`} stroke="#c1dddf" strokeWidth="1.1" />
          <path d="M55 54V35m10 19V35" stroke="#b2c9cb" strokeWidth="1.2" />
          <path d="m55 35 3-4 4 7 3-3" stroke="#ebc586" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M44 30c0-7 4-12 10-14" stroke="#edf8ef" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {kind === "resistor" && (
        <>
          <ellipse cx="60" cy="80" rx="38" ry="3" fill="#06121b" opacity=".25" />
          <path d="m20 63 57-15 24 12-58 16Z" fill={`url(#${metal})`} />
          <path d="M20 63v5l23 13v-5m0 5 58-16v-5" fill="#718995" />
          <path d="M15 60h15m61-9h14" stroke="#b8cbd0" strokeWidth="3" strokeLinecap="round" />
          <path d="m28 46 55-13 10 6-55 14Z" fill="#f1ecdc" />
          <path d="M28 46v15l10 6V53Z" fill="#acb7b2" />
          <path d="m38 53 55-14v15L38 67Z" fill="#d7dacb" />
          <path d="m33 45 10 6v14m-4-21 10 5v15m-4-21 10 5v15m-4-21 10 5v15m-4-21 10 5v15m-4-21 10 5v15m-4-21 10 5v15m-4-21 10 5v15" stroke="#b48050" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="28" cy="65" r="2" fill="#e0bf80" />
          <circle cx="92" cy="61" r="2" fill="#e0bf80" />
        </>
      )}
      {kind === "switch" && (
        <>
          <ellipse cx="60" cy="83" rx="37" ry="3" fill="#06121b" opacity=".25" />
          <path d="m23 60 51-14 25 13-52 16Z" fill="#eeeade" stroke="#d6e0db" strokeWidth=".7" />
          <path d="M23 60v7l24 15v-7Z" fill="#9dadab" />
          <path d="m47 75 52-16v7L47 82Z" fill="#bac9c3" />
          <path d="m36 60 12 6m27-16 12 6" stroke="#c3a063" strokeWidth="7" />
          <path d="m45 63 26-33" stroke={`url(#${metal})`} strokeWidth="5" strokeLinecap="round" />
          <circle cx="45" cy="63" r="3" fill="#e8ce96" stroke="#957344" />
          <path d="m63 40 13-17" stroke="#415e6d" strokeWidth="10" strokeLinecap="round" />
          <path d="m63 37 10-13" stroke="#819caa" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
