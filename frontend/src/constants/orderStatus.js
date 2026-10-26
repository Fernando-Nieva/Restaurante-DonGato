export const ORDER_STATUS = {
    Pendiente: 'pendiente',
    Preparando: 'preparando',
    Listo: 'listo',
    Entregado: 'entregado',
    Cancelado: 'cancelado',
};

export const TABLE_STATUS = {
    Libre: 'libre',
    Pendiente: ORDER_STATUS.Pendiente,
    Preparando: ORDER_STATUS.Preparando,
    Listo: ORDER_STATUS.Listo,
    Reservada: 'reservada',
};

export const TABLE_STATUS_CONFIG = {
    [TABLE_STATUS.Libre]: {
        color: '#2ecc71',
        icon: 'check',
        label: 'Libre',
        shortLabel: 'Libre',
        glow: 1.2,
        pulseSpeed: 0,
        textColor: '#ffffff',
    },
    [TABLE_STATUS.Pendiente]: {
        color: '#ffd23f',
        icon: 'clock',
        label: 'Pendiente',
        shortLabel: 'Pend.',
        glow: 1.4,
        pulseSpeed: 1.8,
        textColor: '#2b1d12',
    },
    [TABLE_STATUS.Preparando]: {
        color: '#ff5a1f',
        icon: 'flame',
        label: 'Preparando',
        shortLabel: 'Prep.',
        glow: 1.65,
        pulseSpeed: 1.8,
        textColor: '#ffffff',
    },
    [TABLE_STATUS.Listo]: {
        color: '#1e90ff',
        icon: 'bell',
        label: 'Listo',
        shortLabel: 'Listo',
        glow: 1.95,
        pulseSpeed: 5.2,
        textColor: '#ffffff',
    },
    [TABLE_STATUS.Reservada]: {
        color: '#9b5cff',
        icon: 'calendar',
        label: 'Reservada',
        shortLabel: 'Reserva',
        glow: 1.6,
        pulseSpeed: 1.4,
        textColor: '#ffffff',
    },
};

const tableStatusEntries = Object.entries(TABLE_STATUS_CONFIG);

export const TABLE_STATUS_COLORS = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.color]),
);

export const TABLE_STATUS_LABELS = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.label]),
);

export const TABLE_STATUS_SHORT_LABELS = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.shortLabel]),
);

export const TABLE_STATUS_ICONS = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.icon]),
);

export const TABLE_STATUS_GLOW = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.glow]),
);

export const TABLE_STATUS_PULSE_SPEEDS = Object.fromEntries(
    tableStatusEntries.map(([status, config]) => [status, config.pulseSpeed]),
);

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUS.Pendiente]: TABLE_STATUS_CONFIG[TABLE_STATUS.Pendiente].color,
    [ORDER_STATUS.Preparando]: TABLE_STATUS_CONFIG[TABLE_STATUS.Preparando].color,
    [ORDER_STATUS.Listo]: TABLE_STATUS_CONFIG[TABLE_STATUS.Listo].color,
    [ORDER_STATUS.Entregado]: '#8b8073',
    [ORDER_STATUS.Cancelado]: '#d64933',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.Pendiente]: TABLE_STATUS_CONFIG[TABLE_STATUS.Pendiente].label,
    [ORDER_STATUS.Preparando]: TABLE_STATUS_CONFIG[TABLE_STATUS.Preparando].label,
    [ORDER_STATUS.Listo]: TABLE_STATUS_CONFIG[TABLE_STATUS.Listo].label,
    [ORDER_STATUS.Entregado]: 'Entregado',
    [ORDER_STATUS.Cancelado]: 'Cancelado',
};

export const KITCHEN_STATUS_TITLES = {
    [ORDER_STATUS.Pendiente]: ORDER_STATUS_LABELS[ORDER_STATUS.Pendiente],
    [ORDER_STATUS.Preparando]: ORDER_STATUS_LABELS[ORDER_STATUS.Preparando],
    [ORDER_STATUS.Listo]: ORDER_STATUS_LABELS[ORDER_STATUS.Listo],
};

export const NEXT_STATUS = {
    cocina: {
        [ORDER_STATUS.Pendiente]: ORDER_STATUS.Preparando,
        [ORDER_STATUS.Preparando]: ORDER_STATUS.Listo,
    },
    mozo: {
        [ORDER_STATUS.Listo]: ORDER_STATUS.Entregado,
        [ORDER_STATUS.Pendiente]: ORDER_STATUS.Cancelado,
    },
};

export const KITCHEN_COLUMNS = [
    {
        status: ORDER_STATUS.Pendiente,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Pendiente],
        shortLabel: TABLE_STATUS_CONFIG[TABLE_STATUS.Pendiente].shortLabel,
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Pendiente],
        icon: TABLE_STATUS_CONFIG[TABLE_STATUS.Pendiente].icon,
        action: 'Empezar',
    },
    {
        status: ORDER_STATUS.Preparando,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Preparando],
        shortLabel: TABLE_STATUS_CONFIG[TABLE_STATUS.Preparando].shortLabel,
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Preparando],
        icon: TABLE_STATUS_CONFIG[TABLE_STATUS.Preparando].icon,
        action: 'Marcar listo',
    },
    {
        status: ORDER_STATUS.Listo,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Listo],
        shortLabel: TABLE_STATUS_CONFIG[TABLE_STATUS.Listo].shortLabel,
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Listo],
        icon: TABLE_STATUS_CONFIG[TABLE_STATUS.Listo].icon,
        note: 'Esperando al mozo',
    },
];
