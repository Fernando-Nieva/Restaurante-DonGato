<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\ReservationStatus;
use App\Models\Order;
use App\Models\Reservation;
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

    public function test_table_is_reserved_when_an_active_reservation_window_contains_the_current_time(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $admin = User::factory()->create(['role' => 'admin']);
        $reservation = Reservation::factory()->for($table)->create([
            'customer_name' => 'Ana Pérez',
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Activa,
            'created_by' => $admin->id,
        ]);

        $token = User::factory()->create(['role' => 'mozo'])->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonFragment(['id' => $table->id, 'status' => 'reservada'])
            ->assertJsonPath('data.0.reservation.id', $reservation->id)
            ->assertJsonPath('data.0.reservation.customer_name', 'Ana Pérez')
            ->assertJsonPath('data.0.next_reservation', null);
    }

    public function test_overdue_reservation_is_marked_expired_and_the_table_is_free(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 18:00:00',
            'status' => ReservationStatus::Activa,
        ]);

        $token = User::factory()->create(['role' => 'mozo'])->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonFragment(['id' => $table->id, 'status' => 'libre'])
            ->assertJsonPath('data.0.reservation', null)
            ->assertJsonPath('data.0.next_reservation', null);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'vencida',
        ]);
    }

    public function test_tables_endpoint_includes_the_next_reservation_within_three_hours(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'customer_name' => 'Ana Pérez',
            'reserved_for' => '2026-10-25 20:00:00',
            'status' => ReservationStatus::Activa,
        ]);

        $token = User::factory()->create(['role' => 'mozo'])->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonFragment(['id' => $table->id, 'status' => 'libre'])
            ->assertJsonPath('data.0.reservation', null)
            ->assertJsonPath('data.0.next_reservation.id', $reservation->id);
    }

    public function test_admin_sees_reservation_contact_fields_but_mozo_does_not(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $admin = User::factory()->create(['role' => 'admin']);
        Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Activa,
            'phone' => '5551234',
            'notes' => 'Junto a la ventana',
            'created_by' => $admin->id,
        ]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonPath('data.0.reservation.phone', '5551234')
            ->assertJsonPath('data.0.reservation.notes', 'Junto a la ventana');

        $mozo = User::factory()->create(['role' => 'mozo']);
        $this->app['auth']->forgetGuards();

        $this->withToken($mozo->createToken('test')->plainTextToken)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonMissingPath('data.0.reservation.phone')
            ->assertJsonMissingPath('data.0.reservation.notes');
    }
}
