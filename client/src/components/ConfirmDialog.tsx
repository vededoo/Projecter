import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, busy = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button
            className={`btn ${danger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ lineHeight: 1.5 }}>{message}</div>
    </Modal>
  );
}
