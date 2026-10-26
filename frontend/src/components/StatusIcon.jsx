import { ORDER_STATUS, TABLE_STATUS_CONFIG } from '../constants/orderStatus';
import TableStatusIcon from './TableStatusIcon';

const EXTRA_PATHS = {
    [ORDER_STATUS.Entregado]: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
        </>
    ),
    [ORDER_STATUS.Cancelado]: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m9 9 6 6M15 9l-6 6" />
        </>
    ),
};

export default function StatusIcon({ status, className, size = 16 }) {
    const key = String(status ?? '').toLowerCase();

    if (TABLE_STATUS_CONFIG[key]) {
        return <TableStatusIcon status={key} className={className} size={size} />;
    }

    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {EXTRA_PATHS[key] ?? (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v6" />
                    <path d="M12 7h.01" />
                </>
            )}
        </svg>
    );
}
