<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use InvalidArgumentException;
use Tests\TestCase;

class OrderEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_created_is_broadcast_after_saving(): void
    {
        Event::fake();

        $table = Table::factory()->create();
        $user = User::factory()->create(['role' => 'mozo']);
        $product = Product::factory()->create();

        $order = app(OrderService::class)->createOrder($table->id, $user->id, [
            ['product_id' => $product->id, 'quantity' => 2],
        ]);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);

        Event::assertDispatchedTimes(OrderCreated::class, 1);
        Event::assertDispatched(OrderCreated::class, function (OrderCreated $event) use ($order, $table): bool {
            $payload = $event->broadcastWith();
            $channels = array_map(fn ($channel): string => (string) $channel, $event->broadcastOn());

            return $event->order->is($order)
                && $event->tableStatus === 'pendiente'
                && in_array('private-restaurant', $channels, true)
                && in_array('private-kitchen', $channels, true)
                && $payload['order'] instanceof OrderResource
                && $payload['order']->id === $order->id
                && $payload['table_id'] === $table->id
                && $payload['table_status'] === 'pendiente';
        });
    }

    public function test_order_status_updated_is_broadcast_after_saving(): void
    {
        Event::fake();

        $table = Table::factory()->create();
        $order = Order::factory()->for($table)->create(['status' => OrderStatus::Pendiente]);

        app(OrderService::class)->updateStatus($order, OrderStatus::Preparando);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparando']);

        Event::assertDispatchedTimes(OrderStatusUpdated::class, 1);
        Event::assertDispatched(OrderStatusUpdated::class, function (OrderStatusUpdated $event) use ($order, $table): bool {
            $payload = $event->broadcastWith();
            $channels = array_map(fn ($channel): string => (string) $channel, $event->broadcastOn());

            return $event->order->is($order)
                && $event->tableStatus === 'preparando'
                && in_array('private-restaurant', $channels, true)
                && in_array('private-kitchen', $channels, true)
                && $payload['order_id'] === $order->id
                && $payload['table_id'] === $table->id
                && $payload['status'] === 'preparando'
                && $payload['table_status'] === 'preparando';
        });
    }

    public function test_no_event_is_broadcast_when_the_transition_is_invalid(): void
    {
        Event::fake();

        $order = Order::factory()->create();

        try {
            app(OrderService::class)->updateStatus($order, OrderStatus::Listo);
            $this->fail('Se esperaba una InvalidArgumentException.');
        } catch (InvalidArgumentException) {
        }

        Event::assertNotDispatched(OrderStatusUpdated::class);
    }

    public function test_no_event_is_broadcast_when_creating_the_order_fails(): void
    {
        Event::fake();

        $table = Table::factory()->create();
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_available' => false]);

        try {
            app(OrderService::class)->createOrder($table->id, $user->id, [
                ['product_id' => $product->id, 'quantity' => 1],
            ]);
            $this->fail('Se esperaba una InvalidArgumentException.');
        } catch (InvalidArgumentException) {
        }

        Event::assertNotDispatched(OrderCreated::class);
    }
}
