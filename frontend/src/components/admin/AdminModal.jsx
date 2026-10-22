import { useEffect, useId, useRef } from 'react';
import styles from './AdminModal.module.css';

export default function AdminModal({ open, title, onClose, children, footer, size = 'normal' }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onCloseRef.current();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

        return () => {
            window.cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className={styles.overlay}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                ref={dialogRef}
                className={`${styles.dialog} ${size === 'wide' ? styles.wide : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <header className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {title}
                    </h2>

                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                        aria-label="Cerrar diálogo"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                    </button>
                </header>

                <div className={styles.body}>{children}</div>

                {footer && <footer className={styles.footer}>{footer}</footer>}
            </section>
        </div>
    );
}
