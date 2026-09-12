import type { Tool } from "./circuitKit";
export function PartIcon({
  kind,
  closed = false,
}: {
  kind: Tool;
  closed?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "wire" && <path d="M3 18C11 18 9 6 17 6h12M3 15v6M29 3v6" />}
      {kind === "battery" && (
        <>
          <path d="M2 12h9m10 0h9M11 4v16m10-12v8M4 4h4M6 2v4" />
          <path d="M16 7v10" strokeWidth="4" />
        </>
      )}
      {kind === "bulb" && (
        <>
          <circle cx="16" cy="12" r="9" />
          <path d="m10 6 12 12m0-12L10 18M1 12h6m18 0h6" />
        </>
      )}
      {kind === "resistor" && (
        <path d="M1 12h5l2-6 4 12 4-12 4 12 4-12 2 6h5" />
      )}
      {kind === "switch" && (
        <>
          <path d={closed ? "M1 16h30" : "M1 16h7m16 0h7M9 15 23 5"} />
          <circle cx="9" cy="16" r="2" />
          <circle cx="23" cy="16" r="2" />
        </>
      )}
    </svg>
  );
}
