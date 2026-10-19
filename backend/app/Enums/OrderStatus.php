<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pendiente = 'pendiente';
    case Preparando = 'preparando';
    case Listo = 'listo';
    case Entregado = 'entregado';
    case Cancelado = 'cancelado';

    /**
     * Determine whether the order can move from this status to the given one.
     */
    public function canTransitionTo(OrderStatus $to): bool
    {
        return match ($this) {
            self::Pendiente => in_array($to, [self::Preparando, self::Cancelado], true),
            self::Preparando => in_array($to, [self::Listo, self::Cancelado], true),
            self::Listo => $to === self::Entregado,
            self::Entregado, self::Cancelado => false,
        };
    }
}
