<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\ReservationStatus;
use App\Events\ReservationUpdated;
use App\Events\TablesUpdated;
use App\Models\Reservation;
use App\Models\Table;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationService
{
    /**
     * Create a reservation for the given table.
     *
     * @param  array{table_id: int, customer_name: string, party_size: int, phone?: string|null, reserved_for: string, notes?: string|null}  $data
     */
    public function create(array $data, int $createdBy): Reservation
    {
        $table = Table::findOrFail($data['table_id']);
        $reservedFor = Carbon::parse($data['reserved_for']);

        $this->ensureReservationIsValid($table, $reservedFor, (int) $data['party_size']);

        $reservation = DB::transaction(fn (): Reservation => Reservation::create([
            'table_id' => $table->id,
            'customer_name' => $data['customer_name'],
            'party_size' => (int) $data['party_size'],
            'phone' => $data['phone'] ?? null,
            'reserved_for' => $reservedFor,
            'notes' => $data['notes'] ?? null,
            'status' => ReservationStatus::Activa,
            'created_by' => $createdBy,
        ]));

        $this->dispatchUpdated($reservation, $table);

        return $reservation;
    }

    /**
     * Update an active reservation.
     *
     * @param  array{table_id: int, customer_name: string, party_size: int, phone?: string|null, reserved_for: string, notes?: string|null}  $data
     */
    public function update(Reservation $reservation, array $data): Reservation
    {
        if ($reservation->status !== ReservationStatus::Activa) {
            throw ValidationException::withMessages([
                'reservation' => 'Solo se pueden editar reservas activas.',
            ]);
        }

        $table = Table::findOrFail($data['table_id']);
        $reservedFor = Carbon::parse($data['reserved_for']);

        $this->ensureReservationIsValid($table, $reservedFor, (int) $data['party_size'], $reservation->id);

        $reservation->update([
            'table_id' => $table->id,
            'customer_name' => $data['customer_name'],
            'party_size' => (int) $data['party_size'],
            'phone' => $data['phone'] ?? null,
            'reserved_for' => $reservedFor,
            'notes' => $data['notes'] ?? null,
        ]);

        $this->dispatchUpdated($reservation, $table);

        return $reservation;
    }

    /**
     * Cancel an active reservation.
     */
    public function cancel(Reservation $reservation): Reservation
    {
        if ($reservation->status !== ReservationStatus::Activa) {
            throw ValidationException::withMessages([
                'reservation' => 'Solo se pueden cancelar reservas activas.',
            ]);
        }

        $reservation->update(['status' => ReservationStatus::Cancelada]);

        $this->dispatchUpdated($reservation, $reservation->table);

        return $reservation;
    }

    /**
     * Seat an active reservation when the current time is inside its seating window.
     */
    public function seat(Reservation $reservation): Reservation
    {
        if ($reservation->status !== ReservationStatus::Activa) {
            throw ValidationException::withMessages([
                'reservation' => 'Solo se pueden sentar reservas activas.',
            ]);
        }

        if (! $this->isWithinSeatingWindow($reservation, now())) {
            throw ValidationException::withMessages([
                'reservation' => $this->seatingWindowMessage($reservation),
            ]);
        }

        $reservation->update(['status' => ReservationStatus::Sentada]);

        $table = $reservation->table;
        $tableStatus = app(OrderService::class)->getTableStatus($table);

        ReservationUpdated::dispatch($reservation, $tableStatus);
        TablesUpdated::dispatch($table->id, 'updated', $table->is_active);

        return $reservation;
    }

    /**
     * Mark every active reservation whose seating window has ended as expired.
     */
    public function expireOverdueReservations(?Table $table = null): void
    {
        $graceMinutes = (int) config('restaurant.reservation_grace_minutes', 30);

        Reservation::query()
            ->where('status', ReservationStatus::Activa)
            ->when(
                $table !== null,
                fn ($query) => $query->where('table_id', $table->id)
            )
            ->where('reserved_for', '<', now()->subMinutes($graceMinutes))
            ->update(['status' => ReservationStatus::Vencida]);
    }

    /**
     * Get the active reservation whose seating window contains the current time.
     */
    public function currentReservation(Table $table): ?Reservation
    {
        $holdMinutes = (int) config('restaurant.reservation_hold_before_minutes', 60);
        $graceMinutes = (int) config('restaurant.reservation_grace_minutes', 30);

        return $table->reservations()
            ->where('status', ReservationStatus::Activa)
            ->where('reserved_for', '>=', now()->subMinutes($graceMinutes))
            ->where('reserved_for', '<=', now()->addMinutes($holdMinutes))
            ->oldest('reserved_for')
            ->first();
    }

    /**
     * Get the next active reservation within the given number of hours.
     */
    public function upcomingReservation(Table $table, int $hours = 3): ?Reservation
    {
        return $table->reservations()
            ->where('status', ReservationStatus::Activa)
            ->where('reserved_for', '>=', now())
            ->where('reserved_for', '<=', now()->addHours($hours))
            ->oldest('reserved_for')
            ->first();
    }

    /**
     * Determine whether another active reservation overlaps the given start time.
     */
    public function overlapsActiveReservation(
        Table $table,
        Carbon $reservedFor,
        ?int $ignoreReservationId = null
    ): bool {
        $durationMinutes = (int) config('restaurant.reservation_duration_minutes', 90);

        return $table->reservations()
            ->where('status', ReservationStatus::Activa)
            ->when(
                $ignoreReservationId !== null,
                fn ($query) => $query->whereKeyNot($ignoreReservationId)
            )
            ->where('reserved_for', '>', $reservedFor->copy()->subMinutes($durationMinutes))
            ->where('reserved_for', '<', $reservedFor->copy()->addMinutes($durationMinutes))
            ->exists();
    }

    /**
     * Determine whether the given time falls inside the current seating window.
     */
    public function fallsWithinCurrentWindow(Carbon $reservedFor): bool
    {
        $holdMinutes = (int) config('restaurant.reservation_hold_before_minutes', 60);
        $graceMinutes = (int) config('restaurant.reservation_grace_minutes', 30);

        return $reservedFor->between(
            now()->subMinutes($holdMinutes),
            now()->addMinutes($graceMinutes)
        );
    }

    /**
     * Determine whether the table currently has active orders.
     */
    public function tableHasActiveOrders(Table $table): bool
    {
        $activeStatuses = array_map(
            fn (OrderStatus $status): string => $status->value,
            [OrderStatus::Pendiente, OrderStatus::Preparando, OrderStatus::Listo]
        );

        return $table->orders()->whereIn('status', $activeStatuses)->exists();
    }

    private function ensureReservationIsValid(
        Table $table,
        Carbon $reservedFor,
        int $partySize,
        ?int $ignoreReservationId = null
    ): void {
        if (! $table->is_active) {
            throw ValidationException::withMessages([
                'table_id' => 'La mesa no existe o está inactiva.',
            ]);
        }

        if ($partySize > $table->seats) {
            throw ValidationException::withMessages([
                'party_size' => "La cantidad de personas supera los asientos de la mesa ({$table->seats}).",
            ]);
        }

        if ($reservedFor->lt(now()->subMinutes(5))) {
            throw ValidationException::withMessages([
                'reserved_for' => 'La reserva no puede ser en el pasado.',
            ]);
        }

        $this->expireOverdueReservations($table);

        if ($this->overlapsActiveReservation($table, $reservedFor, $ignoreReservationId)) {
            throw ValidationException::withMessages([
                'reserved_for' => 'Ya existe otra reserva activa para esta mesa en ese horario.',
            ]);
        }

        if ($this->fallsWithinCurrentWindow($reservedFor) && $this->tableHasActiveOrders($table)) {
            throw ValidationException::withMessages([
                'reserved_for' => 'La mesa tiene pedidos activos y no puede reservarse para esa hora.',
            ]);
        }
    }

    private function isWithinSeatingWindow(Reservation $reservation, Carbon $moment): bool
    {
        $holdMinutes = (int) config('restaurant.reservation_hold_before_minutes', 60);
        $graceMinutes = (int) config('restaurant.reservation_grace_minutes', 30);

        return $moment->between(
            $reservation->reserved_for->copy()->subMinutes($holdMinutes),
            $reservation->reserved_for->copy()->addMinutes($graceMinutes)
        );
    }

    private function seatingWindowMessage(Reservation $reservation): string
    {
        $holdMinutes = (int) config('restaurant.reservation_hold_before_minutes', 60);
        $graceMinutes = (int) config('restaurant.reservation_grace_minutes', 30);

        $start = $reservation->reserved_for->copy()->subMinutes($holdMinutes)->format('H:i');
        $end = $reservation->reserved_for->copy()->addMinutes($graceMinutes)->format('H:i');

        return "La reserva solo puede sentarse entre las {$start} y las {$end}.";
    }

    private function dispatchUpdated(Reservation $reservation, Table $table): void
    {
        ReservationUpdated::dispatch(
            $reservation,
            app(OrderService::class)->getTableStatus($table)
        );
    }
}
