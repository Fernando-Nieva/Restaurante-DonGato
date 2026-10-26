<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class OrderService
{
    /**
     * Create an order with its items inside a database transaction.
     *
     * The unit price is snapshotted from the product, and unknown or
     * unavailable products abort the whole operation.
     *
     * @param  array<int, array{product_id: int, quantity: int, notes?: string|null}>  $items
     */
    public function createOrder(int $tableId, int $userId, array $items, ?string $notes = null): Order
    {
        $order = DB::transaction(function () use ($tableId, $userId, $items, $notes): Order {
            $table = Table::findOrFail($tableId);

            if ($this->getTableStatus($table) === 'reservada') {
                $reservation = app(ReservationService::class)->currentReservation($table);

                throw ValidationException::withMessages([
                    'table_id' => $reservation !== null
                        ? "La mesa está reservada para {$reservation->customer_name} a las {$reservation->reserved_for->format('H:i')}. Sentá la reserva primero."
                        : 'La mesa está reservada. Sentá la reserva primero.',
                ]);
            }

            $products = Product::query()
                ->whereIn('id', array_column($items, 'product_id'))
                ->get()
                ->keyBy('id');

            $order = Order::create([
                'table_id' => $tableId,
                'user_id' => $userId,
                'status' => OrderStatus::Pendiente,
                'notes' => $notes,
            ]);

            foreach ($items as $item) {
                $product = $products->get($item['product_id']);

                if (! $product) {
                    throw new InvalidArgumentException("El producto [{$item['product_id']}] no existe.");
                }

                if (! $product->is_available) {
                    throw new InvalidArgumentException("El producto \"{$product->name}\" no está disponible.");
                }

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'notes' => $item['notes'] ?? null,
                    'unit_price' => $product->price,
                ]);
            }

            return $order;
        });

        OrderCreated::dispatch($order, $this->getTableStatus($order->table));

        return $order;
    }

    /**
     * Move an order to the given status, rejecting invalid transitions.
     */
    public function updateStatus(Order $order, OrderStatus $to): Order
    {
        if (! $order->status->canTransitionTo($to)) {
            throw new InvalidArgumentException(
                "No se puede cambiar el estado de \"{$order->status->value}\" a \"{$to->value}\"."
            );
        }

        DB::transaction(function () use ($order, $to): void {
            $timestampColumn = match ($to) {
                OrderStatus::Preparando => 'preparing_at',
                OrderStatus::Listo => 'ready_at',
                OrderStatus::Entregado => 'delivered_at',
                OrderStatus::Cancelado => 'cancelled_at',
                OrderStatus::Pendiente => null,
            };

            $attributes = ['status' => $to];

            if ($timestampColumn !== null) {
                $attributes[$timestampColumn] = now();
            }

            $order->update($attributes);
        });

        OrderStatusUpdated::dispatch($order, $this->getTableStatus($order->table));

        return $order;
    }

    /**
     * Status of a table derived from its active orders and reservations:
     * "libre" when there are none, the oldest active order status when there
     * are orders, or "reservada" when an active reservation window contains
     * the current time. Overdue reservations are marked as expired on read.
     */
    public function getTableStatus(Table $table): string
    {
        $reservationService = app(ReservationService::class);
        $reservationService->expireOverdueReservations($table);

        $active = [OrderStatus::Pendiente, OrderStatus::Preparando, OrderStatus::Listo];

        $order = $table->orders()
            ->whereIn('status', array_map(fn (OrderStatus $status): string => $status->value, $active))
            ->oldest('created_at')
            ->oldest('id')
            ->first();

        if ($order !== null) {
            return $order->status->value;
        }

        return $reservationService->currentReservation($table) !== null
            ? 'reservada'
            : 'libre';
    }
}
