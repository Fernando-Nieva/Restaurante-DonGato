import { TABLE_STATUS, TABLE_STATUS_CONFIG } from '../constants/orderStatus';

const ICON_PATHS = {
    check: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    flame: (
        <path d="M12 3c.6 2.7 2 4.2 3.6 5.9A5.7 5.7 0 0 1 17 13a5 5 0 0 1-10 0c0-1.7.8-3 2-4 .1 1.4.8 2.3 1.8 2.3 1.1 0 1.7-1 1.2-2.4-.3-.9-1-1.9-2-5.9Z" />
    ),
    bell: (
        <>
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
            <path d="M10 20h4" />
        </>
    ),
    calendar: (
        <>
            <rect x="4" y="5" width="16" height="15" rx="3" />
            <path d="M8 3v4M16 3v4M4 10h16" />
            <path d="M12 13v3l2 1" />
        </>
    ),
};

export default function TableStatusIcon({ status, className, size = 16 }) {
    const key = String(status ?? '').toLowerCase();
    const icon =
        TABLE_STATUS_CONFIG[key]?.icon ?? TABLE_STATUS_CONFIG[TABLE_STATUS.Libre].icon;

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
            {ICON_PATHS[icon] ?? ICON_PATHS.check}
        </svg>
    );
}
