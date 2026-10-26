<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    public function test_admin_can_create_a_reservation(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->withToken($admin->createToken('test')->plainTextToken)
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 3,
                'phone' => '123456789',
                'reserved_for' => '2026-10-25 20:00:00',
                'notes' => 'Cumpleaños',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.table_id', $table->id)
            ->assertJsonPath('data.customer_name', 'Ana Pérez')
            ->assertJsonPath('data.party_size', 3)
            ->assertJsonPath('data.phone', '123456789')
            ->assertJsonPath('data.notes', 'Cumpleaños')
            ->assertJsonPath('data.status', 'activa');

        $this->assertDatabaseHas('reservations', [
            'table_id' => $table->id,
            'customer_name' => 'Ana Pérez',
            'status' => 'activa',
            'created_by' => $admin->id,
        ]);
    }

    public function test_mozo_cannot_create_a_reservation(): void
    {
        $table = Table::factory()->create(['seats' => 4]);

        $this->withToken($this->tokenFor('mozo'))
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 2,
                'reserved_for' => now()->addHours(2)->toDateTimeString(),
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_mozo_cannot_cancel_a_reservation(): void
    {
        $reservation = Reservation::factory()->create(['status' => ReservationStatus::Activa]);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/admin/reservations/{$reservation->id}/cancel")
            ->assertForbidden();

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'activa',
        ]);
    }

    public function test_reservation_in_the_past_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 2,
                'reserved_for' => '2026-10-25 17:50:00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reserved_for');

        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_overlapping_reservation_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $admin = User::factory()->create(['role' => 'admin']);

        Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 2,
                'reserved_for' => '2026-10-25 21:00:00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reserved_for');

        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_party_size_larger_than_the_table_seats_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 2]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 3,
                'reserved_for' => '2026-10-25 20:00:00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('party_size');

        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_reservation_on_an_inactive_table_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4, 'is_active' => false]);

        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/reservations', [
                'table_id' => $table->id,
                'customer_name' => 'Ana Pérez',
                'party_size' => 2,
                'reserved_for' => '2026-10-25 20:00:00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('table_id');

        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_admin_can_update_an_active_reservation(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 6]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:00:00',
            'status' => ReservationStatus::Activa,
            'party_size' => 2,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->putJson("/api/admin/reservations/{$reservation->id}", [
                'table_id' => $table->id,
                'customer_name' => 'Nuevo Nombre',
                'party_size' => 4,
                'phone' => '987654321',
                'reserved_for' => '2026-10-25 21:00:00',
                'notes' => 'Mesa junto a la ventana',
            ])
            ->assertOk()
            ->assertJsonPath('data.customer_name', 'Nuevo Nombre')
            ->assertJsonPath('data.party_size', 4);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'customer_name' => 'Nuevo Nombre',
            'party_size' => 4,
            'status' => 'activa',
        ]);
    }

    public function test_updating_a_reservation_that_is_not_active_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:00:00',
            'status' => ReservationStatus::Cancelada,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->putJson("/api/admin/reservations/{$reservation->id}", [
                'table_id' => $table->id,
                'customer_name' => 'Nuevo Nombre',
                'party_size' => 2,
                'reserved_for' => '2026-10-25 21:00:00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reservation');
    }

    public function test_admin_can_cancel_an_active_reservation(): void
    {
        $reservation = Reservation::factory()->create(['status' => ReservationStatus::Activa]);

        $this->withToken($this->tokenFor('admin'))
            ->patchJson("/api/admin/reservations/{$reservation->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelada');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'cancelada',
        ]);
    }

    public function test_index_returns_today_and_future_active_reservations_ordered_by_time(): void
    {
        $this->travelTo('2026-10-25 12:00:00');

        $admin = User::factory()->create(['role' => 'admin']);
        $table = Table::factory()->create(['seats' => 4]);

        $later = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 21:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);
        $sooner = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 19:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);
        Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 11:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);
        Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-26 19:00:00',
            'status' => ReservationStatus::Cancelada,
            'created_by' => $admin->id,
        ]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->getJson('/api/admin/reservations')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $sooner->id)
            ->assertJsonPath('data.1.id', $later->id);

        $this->assertDatabaseHas('reservations', [
            'reserved_for' => '2026-10-25 11:00:00',
            'status' => 'vencida',
        ]);
    }

    public function test_index_filters_by_date_status_and_table(): void
    {
        $this->travelTo('2026-10-25 12:00:00');

        $admin = User::factory()->create(['role' => 'admin']);
        $firstTable = Table::factory()->create(['seats' => 4]);
        $secondTable = Table::factory()->create(['seats' => 4]);

        $matching = Reservation::factory()->for($firstTable)->create([
            'reserved_for' => '2026-10-26 20:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);
        Reservation::factory()->for($secondTable)->create([
            'reserved_for' => '2026-10-26 20:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);
        Reservation::factory()->for($firstTable)->create([
            'reserved_for' => '2026-10-27 20:00:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->getJson('/api/admin/reservations?date=2026-10-26&status=activa&table_id='.$firstTable->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }
}
