export function HistoryIcon({ kind }: { kind: "undo" | "reset" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {kind === "undo" ? (
        <>
          <path d="m9 3-7 6 7 6v-4h6a4 4 0 0 1 0 8h-4v2h4a6 6 0 0 0 0-12H9Z" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M5 8a8 8 0 1 1-1 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
          <path d="M2 2v8h8Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
