import type { Tool } from "./circuitKit";

/** A consistent set of front-view hardware pictograms for the notebook. */
export function PartSpecimen({ kind }: { kind: Tool }) {
  return (
    <svg
      className={`part-specimen specimen-${kind}`}
      viewBox="0 0 120 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "wire" && (
        <>
          <path d="M28 64h6c25 0 17-32 42-32h16" strokeWidth="6" />
          <path d="M16 60h14v8H16zm74-32h14v8H90Z" fill="currentColor" stroke="none" />
          <path d="M18 64h8m68-32h8" className="specimen-cutout" strokeWidth="2" />
        </>
      )}
      {kind === "battery" && (
        <>
          <rect x="26" y="30" width="74" height="36" rx="4" fill="currentColor" stroke="none" />
          <path d="M26 40h-7v16h7" fill="currentColor" stroke="none" />
          <path d="M35 31v34m57-34v34" className="specimen-cutout" strokeWidth="1.5" opacity=".5" />
          {/* Equal-size polarity marks on the body's horizontal centerline. */}
          <path d="M47 42v12m-6-6h12m20 0h12" className="specimen-cutout" strokeWidth="2.5" strokeLinecap="square" />
        </>
      )}
      {kind === "bulb" && (
        <>
          <path d="M49 62v-5c0-8-10-11-10-24a21 21 0 0 1 42 0c0 13-10 16-10 24v5Z" />
          <path d="M55 60V38l5 5 5-5v22" strokeWidth="2" />
          <path d="M47 67h26m-24 5h22" strokeWidth="3" />
          <path d="M52 75h16v4H52Zm-20 6h56v4H32Z" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "switch" && (
        <>
          <path d="M18 60h16m52 0h16M36 56l41-30" strokeWidth="3" />
          <path d="m67 33 14-10" strokeWidth="8" />
          <circle cx="36" cy="60" r="5" />
          <path d="M82 55h8v10h-8Zm-54 18h64v5H28Z" fill="currentColor" stroke="none" />
          <path d="M36 66v6m50-6v6" strokeWidth="2" />
        </>
      )}
      {kind === "resistor" && (
        <>
          <path d="M16 48h14m60 0h14" strokeWidth="3" />
          <rect x="30" y="33" width="60" height="30" rx="3" fill="currentColor" stroke="none" />
          <path d="m39 35 5 26m3-26 5 26m3-26 5 26m3-26 5 26m3-26 5 26m3-26 5 26" className="specimen-cutout" strokeWidth="2.5" />
          <path d="M35 64v5m50-5v5M26 72h68" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
