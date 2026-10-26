<?php

namespace Tests\Feature;

use App\Enums\TableZone;
use App\Models\Table;
use App\Models\User;
use Database\Seeders\TableSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableZoneTest extends TestCase
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
            'number' => 9,
            'seats' => 4,
            'zone' => TableZone::Terraza->value,
            'pos_x' => 0,
            'pos_z' => 8.5,
        ], $overrides);
    }

    public function test_admin_creates_a_table_in_the_terrace_zone(): void
    {
        $response = $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload());

        $response->assertCreated()
            ->assertJsonPath('data.number', 9)
            ->assertJsonPath('data.zone', 'terraza')
            ->assertJsonPath('data.pos_x', 0)
            ->assertJsonPath('data.pos_z', 8.5);

        $this->assertDatabaseHas('tables', [
            'number' => 9,
            'zone' => 'terraza',
            'pos_x' => 0,
            'pos_z' => 8.5,
        ]);
    }

    public function test_admin_updates_a_table_to_the_terrace_zone(): void
    {
        $table = Table::factory()->create([
            'number' => 1,
            'zone' => TableZone::Salon->value,
            'pos_x' => -2,
            'pos_z' => 0,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->putJson("/api/admin/tables/{$table->id}", $this->tablePayload([
                'number' => 1,
                'zone' => TableZone::Terraza->value,
                'pos_x' => 0,
                'pos_z' => 8.5,
            ]))
            ->assertOk()
            ->assertJsonPath('data.id', $table->id)
            ->assertJsonPath('data.zone', 'terraza')
            ->assertJsonPath('data.pos_x', 0)
            ->assertJsonPath('data.pos_z', 8.5);

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'zone' => 'terraza',
            'pos_x' => 0,
            'pos_z' => 8.5,
        ]);
    }

    public function test_admin_requires_a_zone(): void
    {
        $payload = $this->tablePayload();
        unset($payload['zone']);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('zone')
            ->assertJsonPath('errors.zone.0', 'La zona es obligatoria.');

        $this->assertDatabaseCount('tables', 0);
    }

    public function test_admin_rejects_an_unknown_zone(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload(['zone' => 'patio']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zone')
            ->assertJsonPath('errors.zone.0', 'La zona indicada no es válida.');

        $this->assertDatabaseCount('tables', 0);
    }

    public function test_admin_rejects_a_terrace_position_inside_the_salon(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload([
                'pos_x' => 0,
                'pos_z' => 0,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pos_z')
            ->assertJsonPath('errors.pos_z.0', 'La posición Z está fuera de los límites de la zona terraza (Z: 7 a 14).');

        $this->assertDatabaseMissing('tables', ['number' => 9]);
    }

    public function test_admin_rejects_a_salon_position_inside_the_terrace(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload([
                'zone' => TableZone::Salon->value,
                'pos_x' => 0,
                'pos_z' => 8.5,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pos_z')
            ->assertJsonPath('errors.pos_z.0', 'La posición Z está fuera de los límites de la zona salón (Z: -6 a 6).');

        $this->assertDatabaseMissing('tables', ['number' => 9]);
    }

    public function test_admin_rejects_moving_a_salon_table_to_an_invalid_terrace_position(): void
    {
        $table = Table::factory()->create([
            'number' => 1,
            'zone' => TableZone::Salon->value,
            'pos_x' => -2,
            'pos_z' => 0,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->putJson("/api/admin/tables/{$table->id}", $this->tablePayload([
                'number' => 1,
                'zone' => TableZone::Terraza->value,
                'pos_x' => 0,
                'pos_z' => 0,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pos_z')
            ->assertJsonPath('errors.pos_z.0', 'La posición Z está fuera de los límites de la zona terraza (Z: 7 a 14).');

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'zone' => 'salon',
            'pos_x' => -2,
            'pos_z' => 0,
        ]);
    }

    public function test_admin_rejects_a_collision_between_salon_and_terrace_tables(): void
    {
        Table::factory()->create([
            'number' => 1,
            'zone' => TableZone::Salon->value,
            'pos_x' => 0,
            'pos_z' => 6,
            'is_active' => true,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/tables', $this->tablePayload([
                'number' => 9,
                'zone' => TableZone::Terraza->value,
                'pos_x' => 0,
                'pos_z' => 8.5,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('position');

        $this->assertDatabaseMissing('tables', ['number' => 9]);
    }

    public function test_table_seeder_adds_terrace_tables_without_overwriting_existing_rows(): void
    {
        $this->seed(TableSeeder::class);

        $this->assertDatabaseCount('tables', 13);
        $this->assertSame(8, Table::where('zone', TableZone::Salon->value)->count());
        $this->assertSame(5, Table::where('zone', TableZone::Terraza->value)->count());
        $this->assertSame(
            [9, 10, 11, 12, 13],
            Table::where('zone', TableZone::Terraza->value)->orderBy('number')->pluck('number')->all(),
        );
        $this->assertDatabaseHas('tables', [
            'number' => 9,
            'seats' => 4,
            'pos_x' => -6.5,
            'pos_z' => 8.5,
            'zone' => 'terraza',
        ]);

        $table = Table::where('number', 9)->firstOrFail();
        $table->update(['seats' => 2]);

        $this->seed(TableSeeder::class);

        $this->assertDatabaseCount('tables', 13);
        $this->assertDatabaseHas('tables', [
            'number' => 9,
            'seats' => 2,
            'zone' => 'terraza',
        ]);
    }

    public function test_public_tables_endpoint_includes_the_zone(): void
    {
        $salon = Table::factory()->create([
            'number' => 1,
            'zone' => TableZone::Salon->value,
            'pos_x' => -2,
            'pos_z' => 0,
        ]);
        $terraza = Table::factory()->create([
            'number' => 2,
            'zone' => TableZone::Terraza->value,
            'pos_x' => 0,
            'pos_z' => 8.5,
        ]);

        $this->withToken($this->tokenFor('mozo'))
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonFragment(['id' => $salon->id, 'zone' => 'salon'])
            ->assertJsonFragment(['id' => $terraza->id, 'zone' => 'terraza']);
    }
}
