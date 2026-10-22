import logo from '../assets/logo.png';
import styles from './PageState.module.css';

export function PageLoader({ label = 'Cargando…' }) {
    return (
        <div className={styles.state} role="status" aria-live="polite">
            <div className={styles.logoWrap}>
                <img src={logo} alt="" className={styles.logo} width="120" height="120" />
                <span className={styles.spinner} aria-hidden="true" />
            </div>
            <p className={styles.label}>{label}</p>
        </div>
    );
}

export function PageError({ title, message, onRetry }) {
    return (
        <div className={styles.state} role="alert">
            <span className={styles.errorIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 2.7 20a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L12 3Z" strokeLinejoin="round" />
                    <path d="M12 9v5" strokeLinecap="round" />
                    <path d="M12 18h.01" strokeLinecap="round" />
                </svg>
            </span>

            <h2 className={styles.errorTitle}>{title}</h2>
            {message && <p className={styles.errorMessage}>{message}</p>}

            {onRetry && (
                <button type="button" className={styles.retry} onClick={onRetry}>
                    Reintentar
                </button>
            )}
        </div>
    );
}
