<?php

namespace Tests\Feature;

use App\Enums\ReservationStatus;
use App\Events\ReservationUpdated;
use App\Events\TablesUpdated;
use App\Models\Reservation;
use App\Models\Table;
use App\Models\User;
use App\Services\ReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ReservationEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_reservation_broadcasts_the_updated_event_after_saving(): void
    {
        $this->travelTo('2026-10-25 18:00:00');

        $admin = User::factory()->create(['role' => 'admin']);
        $table = Table::factory()->create(['seats' => 4]);

        Event::fake([ReservationUpdated::class]);

        $reservation = app(ReservationService::class)->create([
            'table_id' => $table->id,
            'customer_name' => 'Ana Pérez',
            'party_size' => 2,
            'phone' => '5551234',
            'reserved_for' => '2026-10-25 20:00:00',
            'notes' => 'Nota interna',
        ], $admin->id);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'activa',
        ]);

        Event::assertDispatchedTimes(ReservationUpdated::class, 1);
        Event::assertDispatched(ReservationUpdated::class, function (ReservationUpdated $event) use ($reservation, $table): bool {
            $payload = $event->broadcastWith();
            $channels = array_map(fn ($channel): string => (string) $channel, $event->broadcastOn());

            return $event->reservation->is($reservation)
                && $event->tableStatus === 'libre'
                && in_array('private-restaurant', $channels, true)
                && $payload['table_id'] === $table->id
                && $payload['table_status'] === 'libre'
                && $payload['reservation']['id'] === $reservation->id
                && ! array_key_exists('phone', $payload['reservation'])
                && ! array_key_exists('notes', $payload['reservation']);
        });
    }

    public function test_seating_a_reservation_broadcasts_reservation_and_tables_events(): void
    {
        $this->travelTo('2026-10-25 20:00:00');

        $table = Table::factory()->create(['seats' => 4]);
        $reservation = Reservation::factory()->for($table)->create([
            'reserved_for' => '2026-10-25 20:30:00',
            'status' => ReservationStatus::Activa,
        ]);

        Event::fake([ReservationUpdated::class, TablesUpdated::class]);

        app(ReservationService::class)->seat($reservation);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'sentada',
        ]);

        Event::assertDispatched(ReservationUpdated::class, function (ReservationUpdated $event): bool {
            return $event->tableStatus === 'libre';
        });
        Event::assertDispatched(TablesUpdated::class, function (TablesUpdated $event) use ($table): bool {
            return $event->tableId === $table->id
                && $event->action === 'updated'
                && $event->isActive === true;
        });
    }
}
