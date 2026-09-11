import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  title,
  children,
  onClose,
  open = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  open?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    if (!open) return;
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
        document
          .querySelector<HTMLButtonElement>('[aria-label="Pause game"]')
          ?.focus({ preventScroll: true });
    };
  }, [open]);
  return createPortal(
    <dialog
      ref={ref}
      aria-label={title}
      className={`dialog ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
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
            onClose();
        }
      }}
    >
      <div className="screen-content">{children}</div>
      <button
        className="dialog-close"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
      >
        <kbd>ESC</kbd>
        <span>BACK</span>
      </button>
    </dialog>,
    document.body,
  );
}
