const STATES = {
    connected: { label: 'Conectado', color: '#16a34a' },
    connecting: { label: 'Conectando…', color: '#d97706' },
    disconnected: { label: 'Desconectado', color: '#dc2626' },
};

export default function ConnectionBadge({ status }) {
    const { label, color } = STATES[status] ?? STATES.disconnected;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: `1px solid ${color}66`,
                backgroundColor: `${color}1a`,
                color,
                fontSize: '0.75rem',
                fontWeight: 600,
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: color,
                }}
            />
            {label}
        </span>
    );
}
