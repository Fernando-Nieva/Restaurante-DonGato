<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatsApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    /**
     * @param  array<int, array{product: Product, quantity: int, unit_price: int|float}>  $items
     */
    private function createOrderAt(
        User $waiter,
        Table $table,
        Carbon $createdAt,
        OrderStatus $status,
        array $items = [],
        ?Carbon $preparingAt = null,
        ?Carbon $readyAt = null,
        ?Carbon $deliveredAt = null,
        ?Carbon $cancelledAt = null
    ): Order {
        $order = Order::factory()->create([
            'user_id' => $waiter->id,
            'table_id' => $table->id,
            'status' => $status->value,
        ]);

        $order->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $deliveredAt ?? $cancelledAt ?? $readyAt ?? $createdAt,
            'preparing_at' => $preparingAt,
            'ready_at' => $readyAt,
            'delivered_at' => $deliveredAt,
            'cancelled_at' => $cancelledAt,
        ])->saveQuietly();

        foreach ($items as $item) {
            $order->items()->create([
                'product_id' => $item['product']->id,
                'quantity' => $item['quantity'],
                'notes' => null,
                'unit_price' => $item['unit_price'],
            ]);
        }

        return $order;
    }

    public function test_summary_calculates_sales_ticket_and_average_times_with_known_data(): void
    {
        $date = Carbon::parse('2026-05-10', 'UTC');
        $waiter = User::factory()->create(['role' => 'mozo']);
        $table = Table::factory()->create();
        $pizza = Product::factory()->create();
        $drink = Product::factory()->create();

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(10, 0),
            OrderStatus::Entregado,
            [
                ['product' => $pizza, 'quantity' => 2, 'unit_price' => 1000],
                ['product' => $drink, 'quantity' => 1, 'unit_price' => 500],
            ],
            $date->copy()->setTime(10, 5),
            $date->copy()->setTime(10, 20),
            $date->copy()->setTime(10, 30)
        );

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(12, 0),
            OrderStatus::Entregado,
            [
                ['product' => $pizza, 'quantity' => 1, 'unit_price' => 2000],
            ],
            $date->copy()->setTime(12, 2),
            $date->copy()->setTime(12, 30),
            $date->copy()->setTime(13, 0)
        );

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(9, 0),
            OrderStatus::Pendiente,
            [
                ['product' => $pizza, 'quantity' => 1, 'unit_price' => 100],
            ]
        );

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(11, 0),
            OrderStatus::Cancelado,
            [
                ['product' => $pizza, 'quantity' => 1, 'unit_price' => 9999],
            ],
            cancelledAt: $date->copy()->setTime(11, 10)
        );

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->subDay()->setTime(18, 0),
            OrderStatus::Entregado,
            [
                ['product' => $pizza, 'quantity' => 1, 'unit_price' => 5000],
            ],
            $date->copy()->subDay()->setTime(18, 10),
            $date->copy()->subDay()->setTime(18, 20)
        );

        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->getJson('/api/admin/stats/summary?from=2026-05-10&to=2026-05-10')
            ->assertOk()
            ->assertJsonPath('total_sales', 4500)
            ->assertJsonPath('delivered_orders', 2)
            ->assertJsonPath('orders_by_status.pendiente', 1)
            ->assertJsonPath('orders_by_status.preparando', 0)
            ->assertJsonPath('orders_by_status.listo', 0)
            ->assertJsonPath('orders_by_status.entregado', 2)
            ->assertJsonPath('orders_by_status.cancelado', 1)
            ->assertJsonPath('average_ticket', 2250)
            ->assertJsonPath('average_preparation_minutes', 25)
            ->assertJsonPath('average_delivery_minutes', 20);
    }

    public function test_summary_rejects_inverted_and_too_long_date_ranges(): void
    {
        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->getJson('/api/admin/stats/summary?from=2026-05-11&to=2026-05-10')
            ->assertStatus(422)
            ->assertJsonValidationErrors('from');

        $this->withToken($token)
            ->getJson('/api/admin/stats/summary?from=2025-01-01&to=2026-01-03')
            ->assertStatus(422)
            ->assertJsonValidationErrors('from');
    }

    public function test_cancelled_orders_do_not_add_to_sales(): void
    {
        $date = Carbon::parse('2026-05-10', 'UTC');
        $waiter = User::factory()->create(['role' => 'mozo']);
        $table = Table::factory()->create();
        $product = Product::factory()->create();

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(11, 0),
            OrderStatus::Cancelado,
            [
                ['product' => $product, 'quantity' => 2, 'unit_price' => 9999],
            ],
            cancelledAt: $date->copy()->setTime(11, 10)
        );

        $this->withToken($this->tokenFor('admin'))
            ->getJson('/api/admin/stats/summary?from=2026-05-10&to=2026-05-10')
            ->assertOk()
            ->assertJsonPath('total_sales', 0)
            ->assertJsonPath('delivered_orders', 0)
            ->assertJsonPath('orders_by_status.cancelado', 1);
    }

    public function test_stats_and_history_endpoints_are_admin_only(): void
    {
        foreach (['mozo', 'cocina'] as $role) {
            $token = $this->tokenFor($role);

            foreach ([
                '/api/admin/stats/summary',
                '/api/admin/stats/top-products',
                '/api/admin/stats/sales-by-hour',
                '/api/admin/stats/by-waiter',
                '/api/admin/orders',
            ] as $url) {
                $this->withToken($token)->getJson($url)->assertForbidden();
            }
        }
    }

    public function test_top_products_sales_by_hour_and_by_waiter_return_aggregated_data(): void
    {
        $date = Carbon::parse('2026-05-10', 'UTC');
        $waiter = User::factory()->create(['role' => 'mozo', 'name' => 'Mozo Uno']);
        $otherWaiter = User::factory()->create(['role' => 'mozo', 'name' => 'Mozo Dos']);
        $table = Table::factory()->create();
        $pizza = Product::factory()->create(['name' => 'Muzzarella']);
        $drink = Product::factory()->create(['name' => 'Agua']);

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(14, 0),
            OrderStatus::Entregado,
            [
                ['product' => $pizza, 'quantity' => 2, 'unit_price' => 1000],
                ['product' => $drink, 'quantity' => 1, 'unit_price' => 500],
            ],
            $date->copy()->setTime(14, 5),
            $date->copy()->setTime(14, 15),
            $date->copy()->setTime(14, 20)
        );

        $this->createOrderAt(
            $otherWaiter,
            $table,
            $date->copy()->setTime(15, 0),
            OrderStatus::Entregado,
            [
                ['product' => $pizza, 'quantity' => 1, 'unit_price' => 1000],
            ],
            $date->copy()->setTime(15, 5),
            $date->copy()->setTime(15, 15),
            $date->copy()->setTime(15, 30)
        );

        $this->createOrderAt(
            $waiter,
            $table,
            $date->copy()->setTime(16, 0),
            OrderStatus::Cancelado,
            cancelledAt: $date->copy()->setTime(16, 5)
        );

        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->getJson('/api/admin/stats/top-products?from=2026-05-10&to=2026-05-10&limit=5')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.product_id', $pizza->id)
            ->assertJsonPath('data.0.quantity', 3)
            ->assertJsonPath('data.0.total_sales', 3000)
            ->assertJsonPath('data.1.product_id', $drink->id)
            ->assertJsonPath('data.1.quantity', 1)
            ->assertJsonPath('data.1.total_sales', 500);

        $this->withToken($token)
            ->getJson('/api/admin/stats/sales-by-hour?date=2026-05-10')
            ->assertOk()
            ->assertJsonCount(24, 'data')
            ->assertJsonPath('data.14.orders_count', 1)
            ->assertJsonPath('data.14.total_sales', 2500)
            ->assertJsonPath('data.15.orders_count', 1)
            ->assertJsonPath('data.15.total_sales', 1000);

        $this->withToken($token)
            ->getJson('/api/admin/stats/by-waiter?from=2026-05-10&to=2026-05-10')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.user_id', $waiter->id)
            ->assertJsonPath('data.0.orders_count', 2)
            ->assertJsonPath('data.0.total_sales', 2500)
            ->assertJsonPath('data.1.user_id', $otherWaiter->id)
            ->assertJsonPath('data.1.orders_count', 1)
            ->assertJsonPath('data.1.total_sales', 1000);
    }

    public function test_order_history_is_paginated_and_includes_items_and_server_totals(): void
    {
        $date = Carbon::parse('2026-05-10', 'UTC');
        $waiter = User::factory()->create(['role' => 'mozo']);
        $table = Table::factory()->create();
        $product = Product::factory()->create();

        for ($i = 0; $i < 21; $i++) {
            $this->createOrderAt(
                $waiter,
                $table,
                $date->copy()->setTime(10, $i),
                OrderStatus::Entregado,
                [
                    ['product' => $product, 'quantity' => 2, 'unit_price' => 1000],
                ],
                $date->copy()->setTime(10, $i),
                $date->copy()->setTime(10, 30),
                $date->copy()->setTime(11, $i)
            );
        }

        $this->withToken($this->tokenFor('admin'))
            ->getJson(
                '/api/admin/orders?status=entregado&table_id='.$table->id
                .'&user_id='.$waiter->id
                .'&from=2026-05-10&to=2026-05-10'
            )
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 21)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('data.0.total', 2000)
            ->assertJsonPath('data.0.items.0.quantity', 2)
            ->assertJsonPath('data.0.items.0.product.id', $product->id);
    }
}
