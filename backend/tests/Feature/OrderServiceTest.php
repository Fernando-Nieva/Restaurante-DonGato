<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class OrderServiceTest extends TestCase
{
    use RefreshDatabase;

    private OrderService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(OrderService::class);
    }

    public function test_create_order_stores_items_with_the_product_price(): void
    {
        $table = Table::factory()->create();
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 1250.50]);

        $order = $this->service->createOrder($table->id, $user->id, [
            ['product_id' => $product->id, 'quantity' => 2, 'notes' => 'Sin sal'],
        ], 'Mesa junto a la ventana');

        $this->assertSame(OrderStatus::Pendiente, $order->status);
        $this->assertSame('Mesa junto a la ventana', $order->notes);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'table_id' => $table->id,
            'user_id' => $user->id,
            'status' => 'pendiente',
        ]);

        $item = $order->items()->sole();

        $this->assertSame($product->id, $item->product_id);
        $this->assertSame(2, $item->quantity);
        $this->assertSame('Sin sal', $item->notes);
        $this->assertSame('1250.50', $item->unit_price);
    }

    public function test_create_order_rejects_unavailable_products(): void
    {
        $table = Table::factory()->create();
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_available' => false]);

        try {
            $this->service->createOrder($table->id, $user->id, [
                ['product_id' => $product->id, 'quantity' => 1],
            ]);
            $this->fail('Se esperaba una InvalidArgumentException.');
        } catch (InvalidArgumentException) {
            // Esperado: la transacción revierte todo.
        }

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_create_order_rejects_unknown_products(): void
    {
        $table = Table::factory()->create();
        $user = User::factory()->create();

        try {
            $this->service->createOrder($table->id, $user->id, [
                ['product_id' => 99999, 'quantity' => 1],
            ]);
            $this->fail('Se esperaba una InvalidArgumentException.');
        } catch (InvalidArgumentException) {
            // Esperado: la transacción revierte todo.
        }

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_update_status_walks_the_happy_path(): void
    {
        $order = Order::factory()->create();

        $this->service->updateStatus($order, OrderStatus::Preparando);
        $this->assertSame(OrderStatus::Preparando, $order->status);
        $this->assertNotNull($order->preparing_at);

        $this->service->updateStatus($order, OrderStatus::Listo);
        $this->assertSame(OrderStatus::Listo, $order->status);
        $this->assertNotNull($order->ready_at);

        $this->service->updateStatus($order, OrderStatus::Entregado);
        $this->assertSame(OrderStatus::Entregado, $order->status);
        $this->assertNotNull($order->delivered_at);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'entregado']);
    }

    public function test_can_cancel_pending_and_preparing_orders(): void
    {
        $pending = Order::factory()->create();

        $this->service->updateStatus($pending, OrderStatus::Cancelado);
        $this->assertSame(OrderStatus::Cancelado, $pending->status);
        $this->assertNotNull($pending->cancelled_at);

        $preparing = Order::factory()->create();

        $this->service->updateStatus($preparing, OrderStatus::Preparando);
        $this->service->updateStatus($preparing, OrderStatus::Cancelado);
        $this->assertSame(OrderStatus::Cancelado, $preparing->status);
        $this->assertNotNull($preparing->preparing_at);
        $this->assertNotNull($preparing->cancelled_at);
    }

    public function test_update_status_rejects_invalid_transitions(): void
    {
        $order = Order::factory()->create();

        try {
            $this->service->updateStatus($order, OrderStatus::Listo);
            $this->fail('Se esperaba una InvalidArgumentException.');
        } catch (InvalidArgumentException) {
            // Esperado.
        }

        $this->assertSame(OrderStatus::Pendiente, $order->status);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);
    }

    public function test_update_status_rejects_transitions_from_final_states(): void
    {
        $order = Order::factory()->create();

        $this->service->updateStatus($order, OrderStatus::Preparando);
        $this->service->updateStatus($order, OrderStatus::Listo);
        $this->service->updateStatus($order, OrderStatus::Entregado);

        foreach ([OrderStatus::Preparando, OrderStatus::Cancelado] as $invalid) {
            try {
                $this->service->updateStatus($order, $invalid);
                $this->fail('Se esperaba una InvalidArgumentException.');
            } catch (InvalidArgumentException) {
                // Esperado.
            }
        }

        $this->assertSame(OrderStatus::Entregado, $order->status);
    }

    public function test_get_table_status_returns_libre_without_active_orders(): void
    {
        $table = Table::factory()->create();

        $this->assertSame('libre', $this->service->getTableStatus($table));
    }

    public function test_get_table_status_returns_the_oldest_active_order_status(): void
    {
        $table = Table::factory()->create();

        $oldest = Order::factory()->for($table)->create();
        Order::factory()->for($table)->create();

        $this->service->updateStatus($oldest, OrderStatus::Preparando);
        $this->service->updateStatus($oldest, OrderStatus::Listo);

        $this->assertSame('listo', $this->service->getTableStatus($table));

        $this->service->updateStatus($oldest, OrderStatus::Entregado);

        $this->assertSame('pendiente', $this->service->getTableStatus($table));
    }

    public function test_get_table_status_ignores_delivered_and_cancelled_orders(): void
    {
        $table = Table::factory()->create();

        $delivered = Order::factory()->for($table)->create();
        $this->service->updateStatus($delivered, OrderStatus::Preparando);
        $this->service->updateStatus($delivered, OrderStatus::Listo);
        $this->service->updateStatus($delivered, OrderStatus::Entregado);

        $cancelled = Order::factory()->for($table)->create();
        $this->service->updateStatus($cancelled, OrderStatus::Cancelado);

        $this->assertSame('libre', $this->service->getTableStatus($table));
    }
}
