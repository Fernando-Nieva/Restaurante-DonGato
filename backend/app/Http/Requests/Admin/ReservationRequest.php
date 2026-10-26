<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Table;
use App\Services\ReservationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class ReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'table_id' => [
                'required',
                'integer',
                Rule::exists('tables', 'id')->where('is_active', true),
            ],
            'customer_name' => ['required', 'string', 'max:255'],
            'party_size' => ['required', 'integer', 'min:1'],
            'phone' => ['nullable', 'string', 'max:30'],
            'reserved_for' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Get the custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'table_id.exists' => 'La mesa no existe o está inactiva.',
            'party_size.min' => 'La reserva debe ser para al menos una persona.',
            'reserved_for.date' => 'La fecha y hora de la reserva no es válida.',
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $reservation = $this->reservationBeingUpdated();

                if ($reservation !== null && $reservation->status !== ReservationStatus::Activa) {
                    $validator->errors()->add('reservation', 'Solo se pueden editar reservas activas.');

                    return;
                }

                $table = Table::find($this->integer('table_id'));

                if ($table === null) {
                    return;
                }

                $reservedFor = Carbon::parse($this->input('reserved_for'));
                $partySize = $this->integer('party_size');
                $reservationService = app(ReservationService::class);

                $reservationService->expireOverdueReservations($table);

                if ($partySize > $table->seats) {
                    $validator->errors()->add(
                        'party_size',
                        "La cantidad de personas supera los asientos de la mesa ({$table->seats})."
                    );
                }

                if ($reservedFor->lt(now()->subMinutes(5))) {
                    $validator->errors()->add('reserved_for', 'La reserva no puede ser en el pasado.');
                }

                if ($reservationService->overlapsActiveReservation(
                    $table,
                    $reservedFor,
                    $this->ignoreReservationId()
                )) {
                    $validator->errors()->add(
                        'reserved_for',
                        'Ya existe otra reserva activa para esta mesa en ese horario.'
                    );
                }

                if (
                    $reservationService->fallsWithinCurrentWindow($reservedFor)
                    && $reservationService->tableHasActiveOrders($table)
                ) {
                    $validator->errors()->add(
                        'reserved_for',
                        'La mesa tiene pedidos activos y no puede reservarse para esa hora.'
                    );
                }
            },
        ];
    }

    /**
     * Get the reservation being edited, when applicable.
     */
    protected function reservationBeingUpdated(): ?Reservation
    {
        return null;
    }

    /**
     * Get the reservation identifier to ignore during overlap checks.
     */
    protected function ignoreReservationId(): ?int
    {
        return null;
    }
}
