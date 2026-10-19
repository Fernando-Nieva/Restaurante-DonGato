<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    private function orderWithStatus(OrderStatus $status): Order
    {
        return Order::factory()->create(['status' => $status]);
    }

    public function test_cocina_cannot_deliver_a_ready_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Listo);

        $this->withToken($this->tokenFor('cocina'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'entregado'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'listo']);
    }

    public function test_cocina_cannot_cancel_an_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Pendiente);

        $this->withToken($this->tokenFor('cocina'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelado'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);
    }

    public function test_mozo_cannot_move_a_pending_order_to_preparing(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Pendiente);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparando'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pendiente']);
    }

    public function test_mozo_cannot_move_a_preparing_order_to_ready(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Preparando);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'listo'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparando']);
    }

    public function test_mozo_can_deliver_any_ready_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Listo);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'entregado'])
            ->assertOk()
            ->assertJsonPath('data.status', 'entregado');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'entregado']);
    }

    public function test_mozo_can_cancel_a_pending_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Pendiente);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelado'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelado');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelado']);
    }

    public function test_mozo_cannot_cancel_a_preparing_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Preparando);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelado'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparando']);
    }

    public function test_admin_can_walk_the_full_transition_chain(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Pendiente);
        $token = $this->tokenFor('admin');

        foreach (['preparando', 'listo', 'entregado'] as $status) {
            $this->withToken($token)
                ->patchJson("/api/orders/{$order->id}/status", ['status' => $status])
                ->assertOk()
                ->assertJsonPath('data.status', $status);
        }

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'entregado']);
    }

    public function test_admin_can_cancel_a_preparing_order(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Preparando);

        $this->withToken($this->tokenFor('admin'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'cancelado'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelado');
    }

    public function test_admin_cannot_perform_an_invalid_transition(): void
    {
        $order = $this->orderWithStatus(OrderStatus::Preparando);

        $this->withToken($this->tokenFor('admin'))
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'entregado'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'preparando']);
    }
}
