export const ORDER_STATUS = {
    Pendiente: 'pendiente',
    Preparando: 'preparando',
    Listo: 'listo',
    Entregado: 'entregado',
    Cancelado: 'cancelado',
};

export const TABLE_STATUS_COLORS = {
    libre: '#22c55e',
    pendiente: '#eab308',
    preparando: '#f97316',
    listo: '#3b82f6',
};

export const KITCHEN_STATUS_TITLES = {
    [ORDER_STATUS.Pendiente]: 'Pendiente',
    [ORDER_STATUS.Preparando]: 'Preparando',
    [ORDER_STATUS.Listo]: 'Listo',
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
        action: 'Empezar',
    },
    {
        status: ORDER_STATUS.Preparando,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Preparando],
        action: 'Marcar listo',
    },
    {
        status: ORDER_STATUS.Listo,
        title: KITCHEN_STATUS_TITLES[ORDER_STATUS.Listo],
        note: 'Esperando al mozo',
    },
];
