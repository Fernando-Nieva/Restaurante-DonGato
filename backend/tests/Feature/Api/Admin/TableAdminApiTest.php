<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\OrderStatus;
use App\Events\TablesUpdated;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TableAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function tablePayload(array $overrides = []): array
    {
        return array_merge([
            'number' => 10,
            'seats' => 4,
            'pos_x' => 0,
            'pos_z' => 0,
        ], $overrides);
    }

    public function test_mozo_and_cocina_receive_403_on_admin_table_endpoints(): void
    {
        $table = Table::factory()->create();

        foreach (['mozo', 'cocina'] as $role) {
            $token = $this->tokenFor($role);

            $this->withToken($token)
                ->postJson('/api/admin/tables', $this->tablePayload())
                ->assertForbidden();

            $this->withToken($token)
                ->putJson("/api/admin/tables/{$table->id}", $this->tablePayload())
                ->assertForbidden();

            $this->withToken($token)
                ->deleteJson("/api/admin/tables/{$table->id}")
                ->assertForbidden();
        }

        $this->assertDatabaseCount('tables', 1);
    }

    public function test_admin_creates_a_table_with_zero_vertical_position_and_broadcasts_tables_updated(): void
    {
        $token = $this->tokenFor('admin');

        Event::fake([TablesUpdated::class]);

        $response = $this->withToken($token)
            ->postJson('/api/admin/tables', $this->tablePayload([
                'number' => 12,
                'seats' => 6,
                'pos_x' => 2.5,
                'pos_y' => 99,
                'pos_z' => -1.5,
            ]));

        $response->assertCreated()
            ->assertJsonPath('data.number', 12)
            ->assertJsonPath('data.seats', 6)
            ->assertJsonPath('data.pos_x', 2.5)
            ->assertJsonPath('data.pos_y', 0)
            ->assertJsonPath('data.pos_z', -1.5)
            ->assertJsonPath('data.is_active', true);

        $tableId = $response->json('data.id');

        $this->assertDatabaseHas('tables', [
            'id' => $tableId,
            'number' => 12,
            'seats' => 6,
            'pos_x' => 2.5,
            'pos_y' => 0,
            'pos_z' => -1.5,
            'is_active' => true,
        ]);

        Event::assertDispatched(TablesUpdated::class, function (TablesUpdated $event) use ($tableId): bool {
            $channels = array_map(fn ($channel): string => (string) $channel, $event->broadcastOn());

            return $event->tableId === $tableId
                && $event->action === 'created'
                && $event->isActive === true
                && in_array('private-restaurant', $channels, true);
        });
    }

    public function test_admin_updates_a_table_and_broadcasts_tables_updated(): void
    {
        $table = Table::factory()->create([
            'number' => 1,
            'seats' => 2,
            'pos_x' => -2,
            'pos_y' => 0,
            'pos_z' => 0,
        ]);
        $token = $this->tokenFor('admin');

        Event::fake([TablesUpdated::class]);

        $this->withToken($token)
            ->putJson("/api/admin/tables/{$table->id}", $this->tablePayload([
                'number' => 3,
                'seats' => 8,
                'pos_x' => -2.5,
                'pos_y' => 4,
                'pos_z' => 1.5,
            ]))
            ->assertOk()
            ->assertJsonPath('data.id', $table->id)
            ->assertJsonPath('data.number', 3)
            ->assertJsonPath('data.seats', 8)
            ->assertJsonPath('data.pos_x', -2.5)
            ->assertJsonPath('data.pos_y', 0)
            ->assertJsonPath('data.pos_z', 1.5);

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'number' => 3,
            'seats' => 8,
            'pos_x' => -2.5,
            'pos_y' => 0,
            'pos_z' => 1.5,
        ]);

        Event::assertDispatched(TablesUpdated::class, fn (TablesUpdated $event): bool => $event->tableId === $table->id
            && $event->action === 'updated');
    }

    public function test_admin_rejects_a_new_table_that_collides_with_an_active_table(): void
    {
        Table::factory()->create([
            'number' => 1,
            'pos_x' => 0,
            'pos_z' => 0,
            'is_active' => true,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload([
                'number' => 2,
                'pos_x' => 2,
                'pos_z' => 0,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('position');

        $this->assertDatabaseMissing('tables', ['number' => 2]);
    }

    public function test_admin_rejects_moving_a_table_next_to_another_active_table(): void
    {
        Table::factory()->create([
            'number' => 1,
            'pos_x' => 0,
            'pos_z' => 0,
            'is_active' => true,
        ]);
        $table = Table::factory()->create([
            'number' => 2,
            'pos_x' => 5,
            'pos_z' => 0,
            'is_active' => true,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->putJson("/api/admin/tables/{$table->id}", $this->tablePayload([
                'number' => 2,
                'pos_x' => 2,
                'pos_z' => 0,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('position');

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'pos_x' => 5,
            'pos_z' => 0,
        ]);
    }

    public function test_admin_rejects_a_duplicate_table_number(): void
    {
        Table::factory()->create(['number' => 10, 'pos_x' => -4, 'pos_z' => 0]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload([
                'number' => 10,
                'pos_x' => 4,
                'pos_z' => 0,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('number');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    #[DataProvider('invalidTableData')]
    public function test_admin_rejects_invalid_seats_and_positions(array $overrides, string $field): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload($overrides))
            ->assertStatus(422)
            ->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('tables', 0);
    }

    /**
     * @return array<string, array{array<string, mixed>, string}>
     */
    public static function invalidTableData(): array
    {
        return [
            'too many seats' => [['seats' => 13], 'seats'],
            'zero seats' => [['seats' => 0], 'seats'],
            'x outside room' => [['pos_x' => 8.01], 'pos_x'],
            'z outside room' => [['pos_z' => -6.01], 'pos_z'],
        ];
    }

    /**
     * @return array<string, array{OrderStatus}>
     */
    public static function activeOrderStatuses(): array
    {
        return [
            'pendiente' => [OrderStatus::Pendiente],
            'preparando' => [OrderStatus::Preparando],
            'listo' => [OrderStatus::Listo],
        ];
    }

    #[DataProvider('activeOrderStatuses')]
    public function test_admin_cannot_delete_a_table_with_active_orders(OrderStatus $status): void
    {
        $table = Table::factory()->create();
        Order::factory()->for($table)->create(['status' => $status]);

        Event::fake([TablesUpdated::class]);

        $this->withToken($this->tokenFor('admin'))
            ->deleteJson("/api/admin/tables/{$table->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('table');

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'is_active' => true,
        ]);

        Event::assertNotDispatched(TablesUpdated::class);
    }

    public function test_admin_deactivates_a_table_with_old_orders_instead_of_deleting_it(): void
    {
        $table = Table::factory()->create();
        Order::factory()->for($table)->create(['status' => OrderStatus::Entregado]);

        Event::fake([TablesUpdated::class]);

        $this->withToken($this->tokenFor('admin'))
            ->deleteJson("/api/admin/tables/{$table->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $table->id)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'is_active' => false,
        ]);

        Event::assertDispatched(TablesUpdated::class, fn (TablesUpdated $event): bool => $event->tableId === $table->id
            && $event->action === 'deactivated'
            && $event->isActive === false);
    }

    public function test_admin_physically_deletes_a_table_without_orders(): void
    {
        $table = Table::factory()->create();

        Event::fake([TablesUpdated::class]);

        $this->withToken($this->tokenFor('admin'))
            ->deleteJson("/api/admin/tables/{$table->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tables', ['id' => $table->id]);

        Event::assertDispatched(TablesUpdated::class, fn (TablesUpdated $event): bool => $event->tableId === $table->id
            && $event->action === 'deleted'
            && $event->isActive === false);
    }

    public function test_public_tables_endpoint_only_returns_active_tables(): void
    {
        $activeTable = Table::factory()->create([
            'number' => 1,
            'pos_x' => -2,
            'pos_z' => 0,
            'is_active' => true,
        ]);
        Table::factory()->create([
            'number' => 2,
            'pos_x' => 2,
            'pos_z' => 0,
            'is_active' => false,
        ]);

        $this->withToken($this->tokenFor('mozo'))
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activeTable->id);
    }
}
