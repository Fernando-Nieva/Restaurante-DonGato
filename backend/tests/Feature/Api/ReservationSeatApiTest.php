<?php

namespace Tests\Feature\Api;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationSeatApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    public function test_mozo_can_seat_a_reservation_inside_its_window(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Activa,
        ]);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/reservations/{$reservation->id}/seat")
            ->assertOk()
            ->assertJsonPath('data.status', 'sentada');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'sentada',
        ]);
    }

    public function test_admin_can_seat_a_reservation_inside_its_window(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Activa,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->patchJson("/api/reservations/{$reservation->id}/seat")
            ->assertOk()
            ->assertJsonPath('data.status', 'sentada');
    }

    public function test_seating_outside_the_window_returns_422(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:00:00',
            'status' => ReservationStatus::Activa,
        ]);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/reservations/{$reservation->id}/seat")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reservation');

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'activa',
        ]);
    }

    public function test_cocina_cannot_seat_a_reservation(): void
    {
        $reservation = Reservation::factory()->create(['status' => ReservationStatus::Activa]);

        $this->withToken($this->tokenFor('cocina'))
            ->patchJson("/api/reservations/{$reservation->id}/seat")
            ->assertForbidden();

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'activa',
        ]);
    }

    public function test_cancelled_reservation_cannot_be_seated(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Cancelada,
        ]);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/reservations/{$reservation->id}/seat")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reservation');
    }
}
