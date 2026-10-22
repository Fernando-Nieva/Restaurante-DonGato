import styles from './ConnectionBadge.module.css';

const STATES = {
    connected: { label: 'En vivo', tone: 'online' },
    connecting: { label: 'Reconectando', tone: 'pending' },
    disconnected: { label: 'Sin conexión', tone: 'offline' },
};

export default function ConnectionBadge({ status }) {
    const state = STATES[status] ?? STATES.disconnected;

    return (
        <span
            className={`${styles.badge} ${styles[state.tone]}`}
            role="status"
            aria-label={state.label}
            title={state.label}
        >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.label}>{state.label}</span>
        </span>
    );
}
