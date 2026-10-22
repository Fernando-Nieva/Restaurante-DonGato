export const ORDER_STATUS = {
    Pendiente: 'pendiente',
    Preparando: 'preparando',
    Listo: 'listo',
    Entregado: 'entregado',
    Cancelado: 'cancelado',
};

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUS.Pendiente]: '#f5c542',
    [ORDER_STATUS.Preparando]: '#f28c28',
    [ORDER_STATUS.Listo]: '#3d8bfd',
    [ORDER_STATUS.Entregado]: '#8b8073',
    [ORDER_STATUS.Cancelado]: '#d64933',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.Pendiente]: 'Pendiente',
    [ORDER_STATUS.Preparando]: 'Preparando',
    [ORDER_STATUS.Listo]: 'Listo',
    [ORDER_STATUS.Entregado]: 'Entregado',
    [ORDER_STATUS.Cancelado]: 'Cancelado',
};

export const TABLE_STATUS_COLORS = {
    libre: '#4caf50',
    pendiente: ORDER_STATUS_COLORS[ORDER_STATUS.Pendiente],
    preparando: ORDER_STATUS_COLORS[ORDER_STATUS.Preparando],
    listo: ORDER_STATUS_COLORS[ORDER_STATUS.Listo],
};

export const TABLE_STATUS_LABELS = {
    libre: 'Libre',
    pendiente: ORDER_STATUS_LABELS[ORDER_STATUS.Pendiente],
    preparando: ORDER_STATUS_LABELS[ORDER_STATUS.Preparando],
    listo: ORDER_STATUS_LABELS[ORDER_STATUS.Listo],
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
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Pendiente],
        action: 'Empezar',
    },
    {
        status: ORDER_STATUS.Preparando,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Preparando],
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Preparando],
        action: 'Marcar listo',
    },
    {
        status: ORDER_STATUS.Listo,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Listo],
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Listo],
        note: 'Esperando al mozo',
    },
];
