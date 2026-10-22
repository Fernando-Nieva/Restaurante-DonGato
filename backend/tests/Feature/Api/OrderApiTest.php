<?php

namespace Tests\Feature\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    public function test_mozo_can_create_an_order(): void
    {
        $table = Table::factory()->create();
        $product = Product::factory()->create(['price' => 1500]);

        $response = $this->withToken($this->tokenFor('mozo'))->postJson('/api/orders', [
            'table_id' => $table->id,
            'notes' => 'Sin cebolla',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pendiente')
            ->assertJsonPath('data.table_id', $table->id)
            ->assertJsonPath('data.notes', 'Sin cebolla')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unit_price', fn ($value): bool => (float) $value === 1500.0)
            ->assertJsonPath('data.items.0.product.name', $product->name);

        $this->assertDatabaseHas('orders', [
            'table_id' => $table->id,
            'status' => 'pendiente',
        ]);
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 1500,
        ]);
    }

    public function test_creating_an_order_with_an_unavailable_product_returns_422(): void
    {
        $table = Table::factory()->create();
        $product = Product::factory()->create(['is_available' => false]);

        $this->withToken($this->tokenFor('mozo'))
            ->postJson('/api/orders', [
                'table_id' => $table->id,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.product_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cocina_can_advance_the_order_status(): void
    {
        $order = Order::factory()->create();

        $this->withToken($this->tokenFor('cocina'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparando'])
            ->assertOk()
            ->assertJsonPath('data.status', 'preparando');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparando']);
    }

    public function test_invalid_status_transition_returns_422(): void
    {
        $order = Order::factory()->create();

        $this->withToken($this->tokenFor('cocina'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'listo'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);
    }

    public function test_mozo_cannot_update_the_order_status(): void
    {
        $order = Order::factory()->create();

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparando'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);
    }

    public function test_cocina_cannot_create_orders(): void
    {
        $table = Table::factory()->create();
        $product = Product::factory()->create();

        $this->withToken($this->tokenFor('cocina'))
            ->postJson('/api/orders', [
                'table_id' => $table->id,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_admin_cannot_create_orders(): void
    {
        $table = Table::factory()->create();
        $product = Product::factory()->create();

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/orders', [
                'table_id' => $table->id,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('orders', 0);
    }
}
