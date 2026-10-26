import { ORDER_STATUS, ORDER_STATUS_COLORS, TABLE_STATUS, TABLE_STATUS_CONFIG } from './orderStatus';

export const RESERVATION_STATUS = {
    Activa: 'activa',
    Sentada: 'sentada',
    Cancelada: 'cancelada',
    Vencida: 'vencida',
};

export const RESERVATION_STATUS_LABELS = {
    [RESERVATION_STATUS.Activa]: 'Activa',
    [RESERVATION_STATUS.Sentada]: 'Sentada',
    [RESERVATION_STATUS.Cancelada]: 'Cancelada',
    [RESERVATION_STATUS.Vencida]: 'Vencida',
};

export const RESERVATION_STATUS_COLORS = {
    [RESERVATION_STATUS.Activa]: TABLE_STATUS_CONFIG[TABLE_STATUS.Reservada].color,
    [RESERVATION_STATUS.Sentada]: TABLE_STATUS_CONFIG[TABLE_STATUS.Preparando].color,
    [RESERVATION_STATUS.Cancelada]: ORDER_STATUS_COLORS[ORDER_STATUS.Cancelado],
    [RESERVATION_STATUS.Vencida]: ORDER_STATUS_COLORS[ORDER_STATUS.Entregado],
};
