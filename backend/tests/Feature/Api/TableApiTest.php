<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_tables_endpoint_returns_the_status_derived_from_orders(): void
    {
        $busy = Table::factory()->create();
        $free = Table::factory()->create();

        Order::factory()->for($busy)->create(['status' => OrderStatus::Preparando]);

        $token = User::factory()->create(['role' => 'mozo'])->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonFragment(['id' => $busy->id, 'status' => 'preparando'])
            ->assertJsonFragment(['id' => $free->id, 'status' => 'libre']);
    }
}
