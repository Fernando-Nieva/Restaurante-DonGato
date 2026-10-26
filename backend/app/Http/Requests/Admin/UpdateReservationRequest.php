<?php

namespace App\Http\Requests\Admin;

use App\Models\Reservation;

class UpdateReservationRequest extends ReservationRequest
{
    /**
     * Get the reservation being edited, when applicable.
     */
    protected function reservationBeingUpdated(): ?Reservation
    {
        $reservation = $this->route('reservation');

        return $reservation instanceof Reservation ? $reservation : null;
    }

    /**
     * Get the reservation identifier to ignore during overlap checks.
     */
    protected function ignoreReservationId(): ?int
    {
        return $this->reservationBeingUpdated()?->id;
    }
}
