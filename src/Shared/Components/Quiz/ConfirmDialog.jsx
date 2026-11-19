// ConfirmDialog.jsx
// In-page confirmation pop-up (replaces window.confirm). Uses the native
// <dialog> element: it dims the page, traps keyboard focus, and closes on Esc.
import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  // open/close the dialog to match the `open` prop
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onCancel={(e) => {
        e.preventDefault(); // we close it through the `open` prop instead
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        // clicking the dimmed backdrop (outside the box) cancels
        if (e.target === ref.current && !busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
