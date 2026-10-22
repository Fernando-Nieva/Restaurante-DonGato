import styles from './admin.module.css';

export default function AdminEmptyState({ title, message, action, showDevSeed = false }) {
    return (
        <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" strokeLinejoin="round" />
                    <path d="M4 7.5 12 12l8-4.5M12 12v9" strokeLinejoin="round" />
                </svg>
            </span>

            <h3 className={styles.emptyTitle}>{title}</h3>
            {message && <p className={styles.emptyText}>{message}</p>}
            {action && <div className={styles.emptyAction}>{action}</div>}

            {showDevSeed && import.meta.env.DEV && (
                <div className={styles.devSeed}>
                    <p className={styles.devSeedTitle}>Datos de demostración</p>
                    <p className={styles.devSeedText}>
                        Ejecutá este comando para cargar un historial de ejemplo:
                    </p>
                    <code className={styles.devSeedCode}>
                        php artisan db:seed --class=DemoHistorySeeder
                    </code>
                </div>
            )}
        </div>
    );
}
