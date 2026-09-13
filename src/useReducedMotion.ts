import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
function subscribe(update: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
export function useReducedMotion(preference = false) {
  const system = useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
  );
  return preference || system;
}
