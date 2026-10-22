import styles from './Toast.module.css';

function ToastIcon({ type }) {
    if (type === 'success') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === 'error') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6" strokeLinecap="round" />
                <path d="M12 17h.01" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6" strokeLinecap="round" />
            <path d="M12 7h.01" strokeLinecap="round" />
        </svg>
    );
}

export default function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div className={styles.viewport} aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${styles.toast} ${styles[toast.type] ?? styles.info}`}
                    role={toast.type === 'error' ? 'alert' : 'status'}
                >
                    <span className={styles.icon} aria-hidden="true">
                        <ToastIcon type={toast.type} />
                    </span>

                    <div className={styles.body}>
                        {toast.title && <strong className={styles.title}>{toast.title}</strong>}
                        {toast.message && <p className={styles.message}>{toast.message}</p>}
                    </div>

                    <button
                        type="button"
                        className={styles.close}
                        onClick={() => onDismiss(toast.id)}
                        aria-label="Cerrar notificación"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
