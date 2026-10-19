<?php

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * Determine whether the user may perform the given status transition.
     */
    public function transition(User $user, Order $order, OrderStatus $to): bool
    {
        return match ($user->role) {
            'admin' => true,
            'cocina' => ($order->status === OrderStatus::Pendiente && $to === OrderStatus::Preparando)
                || ($order->status === OrderStatus::Preparando && $to === OrderStatus::Listo),
            'mozo' => ($order->status === OrderStatus::Listo && $to === OrderStatus::Entregado)
                || ($order->status === OrderStatus::Pendiente && $to === OrderStatus::Cancelado),
            default => false,
        };
    }
}
