<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use Illuminate\Support\Facades\DB;
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
            Table::findOrFail($tableId);

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

        $order->update(['status' => $to]);

        OrderStatusUpdated::dispatch($order, $this->getTableStatus($order->table));

        return $order;
    }

    /**
     * Status of a table derived from its active orders (pendiente, preparando, listo):
     * "libre" when there are none, otherwise the oldest active order status.
     */
    public function getTableStatus(Table $table): string
    {
        $active = [OrderStatus::Pendiente, OrderStatus::Preparando, OrderStatus::Listo];

        $order = $table->orders()
            ->whereIn('status', array_map(fn (OrderStatus $status): string => $status->value, $active))
            ->oldest('created_at')
            ->oldest('id')
            ->first();

        return $order?->status->value ?? 'libre';
    }
}
