/** Tandem's optical head, with the single amber lens. */
export function TandemIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 22h6v4h6v3H10v-3h2z" fill="currentColor" />
      <rect x="2" y="5" width="28" height="19" rx="6" fill="currentColor" />
      <rect x="4.5" y="7.5" width="23" height="14" rx="4" className="tandem-icon-face" />
      <rect x="21" y="10" width="3" height="9" rx="1.5" className="tandem-icon-eye" />
      <path d="M8 13v3m3-3v3" stroke="currentColor" strokeWidth="1.3" opacity=".4" />
    </svg>
  );
}
