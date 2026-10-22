import { ORDER_STATUS } from '../constants/orderStatus';

const PATHS = {
    [ORDER_STATUS.Pendiente]: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),
    [ORDER_STATUS.Preparando]: (
        <path
            d="M12 3c.6 2.7 2 4.2 3.6 5.9A5.7 5.7 0 0 1 17 13a5 5 0 0 1-10 0c0-1.7.8-3 2-4 .1 1.4.8 2.3 1.8 2.3 1.1 0 1.7-1 1.2-2.4-.3-.9-1-1.9-2-5.9Z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ),
    [ORDER_STATUS.Listo]: (
        <>
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinejoin="round" />
            <path d="M10 20h4" strokeLinecap="round" />
        </>
    ),
    [ORDER_STATUS.Entregado]: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),
    [ORDER_STATUS.Cancelado]: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m9 9 6 6M15 9l-6 6" strokeLinecap="round" />
        </>
    ),
};

export default function StatusIcon({ status, className, size = 16 }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[status] ?? (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v6" strokeLinecap="round" />
                    <path d="M12 7h.01" strokeLinecap="round" />
                </>
            )}
        </svg>
    );
}
