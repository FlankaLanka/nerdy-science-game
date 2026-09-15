/** The notebook's device silhouette, with its three display tabs. */
export function TabletIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <rect x="5" y="2" width="22" height="28" rx="3" fill="currentColor" />
      <rect x="8" y="6" width="16" height="19" rx="1" className="tablet-icon-screen" />
      <path d="M10 9h3m1 0h3m1 0h4M10 13h12M10 16h8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 27.5h4" className="tablet-icon-screen" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
