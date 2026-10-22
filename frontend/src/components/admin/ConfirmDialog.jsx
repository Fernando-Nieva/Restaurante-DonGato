import AdminModal from './AdminModal';
import styles from './admin.module.css';

export default function ConfirmDialog({
    open,
    title,
    message,
    error = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Volver',
    busy = false,
    danger = false,
    onConfirm,
    onCancel,
}) {
    const close = busy ? () => {} : onCancel;

    return (
        <AdminModal
            open={open}
            title={title}
            onClose={close}
            footer={
                <>
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={onCancel}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={danger ? styles.buttonDanger : styles.buttonPrimary}
                        onClick={onConfirm}
                        disabled={busy}
                        aria-busy={busy}
                    >
                        {busy && <span className={styles.spinner} aria-hidden="true" />}
                        {busy ? 'Procesando…' : confirmLabel}
                    </button>
                </>
            }
        >
            <div className={styles.confirmBody}>
                <p className={styles.confirmText}>{message}</p>
                {error && (
                    <p className={styles.formError} role="alert">
                        {error}
                    </p>
                )}
            </div>
        </AdminModal>
    );
}
