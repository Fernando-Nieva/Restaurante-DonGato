<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationService;

class ReservationController extends Controller
{
    /**
     * Seat an active reservation when it is inside its seating window.
     */
    public function seat(
        Reservation $reservation,
        ReservationService $reservationService
    ): ReservationResource {
        return new ReservationResource(
            $reservationService->seat($reservation)->load('table')
        );
    }
}
