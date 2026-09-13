import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  title,
  children,
  onClose,
  open = true,
  className = "",
  reducedMotion = false,
  exitMs = 0,
  onDismiss,
  dismissKeys = [],
  closeControl,
}: {
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  onClose: () => void;
  open?: boolean;
  className?: string;
  reducedMotion?: boolean;
  exitMs?: number;
  onDismiss?: () => void;
  dismissKeys?: readonly string[];
  closeControl?: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closePending = useRef(false),
    finished = useRef(false),
    closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    latestClose = useRef(onClose);
  latestClose.current = onClose;
  function finishClose() {
    if (finished.current) return;
    finished.current = true;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    latestClose.current();
  }
  function requestClose() {
    if (closePending.current) return;
    closePending.current = true;
    onDismiss?.();
    if (reducedMotion || !exitMs) {
      finishClose();
      return;
    }
    // Reverse from the currently displayed pose if dismissal interrupts entry.
    const dialog = ref.current!;
    const pose = getComputedStyle(dialog);
    dialog.style.setProperty("--close-transform", pose.transform);
    dialog.style.setProperty("--close-opacity", pose.opacity);
    dialog.style.setProperty(
      "--backdrop-close-opacity",
      getComputedStyle(dialog, "::backdrop").opacity,
    );
    const surface = dialog.querySelector<HTMLElement>("[data-dialog-surface]");
    if (surface) {
      const display = getComputedStyle(surface);
      dialog.style.setProperty("--surface-close-opacity", display.opacity);
      dialog.style.setProperty("--surface-close-clip", display.clipPath);
    }
    setClosing(true);
    closeTimer.current = setTimeout(finishClose, exitMs);
  }
  useEffect(() => {
    if (closing && reducedMotion) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      finishClose();
    }
  }, [closing, reducedMotion]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    const dialog = ref.current!;
    if (!open) return;
    closePending.current = false;
    finished.current = false;
    setClosing(false);
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    // Fullscreen joins the browser's top layer above an already-open dialog.
    // Reopen the dialog above it, preserving the player's focused control.
    const fullscreenChanged = () => {
      const focused = document.activeElement;
      dialog.close();
      dialog.showModal();
      if (focused instanceof HTMLElement && dialog.contains(focused))
        focused.focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", fullscreenChanged);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChanged);
      dialog.close();
      if (opener?.isConnected && opener !== document.body)
        opener.focus({ preventScroll: true });
      else
        (
          document.querySelector<HTMLElement>(".circuit-lab button") ??
          document.querySelector<HTMLElement>(".world canvas")
        )?.focus({ preventScroll: true });
    };
  }, [open]);
  return createPortal(
    <dialog
      ref={ref}
      aria-label={title}
      className={`dialog ${className} ${reducedMotion ? "reduced-motion" : ""}`}
      data-phase={closing ? "closing" : "open"}
      style={{ "--dialog-exit-ms": `${exitMs}ms` } as CSSProperties}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onKeyDown={(e) => {
        if (
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey &&
          (e.key === "Escape" || dismissKeys.includes(e.code))
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (!e.repeat) requestClose();
        }
      }}
      onClose={(e) => {
        // Native close requests can bypass a cancelable event. Keep React in sync.
        if (!e.currentTarget.open) finishClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            requestClose();
        }
      }}
    >
      <div className="screen-content">
        {typeof children === "function" ? children(requestClose) : children}
      </div>
      {closeControl ? (
        closeControl(requestClose)
      ) : (
        <button
          className="dialog-close"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={requestClose}
        >
          <kbd>ESC</kbd>
          <span>BACK</span>
        </button>
      )}
    </dialog>,
    document.body,
  );
}
