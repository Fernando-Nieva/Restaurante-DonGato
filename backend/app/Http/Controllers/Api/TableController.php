<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TableResource;
use App\Models\Table;
use App\Services\OrderService;
use App\Services\ReservationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TableController extends Controller
{
    /**
     * List the dining room tables with their status derived from orders and reservations.
     */
    public function index(
        OrderService $orderService,
        ReservationService $reservationService
    ): AnonymousResourceCollection {
        $tables = Table::query()->where('is_active', true)->orderBy('number')->get();

        foreach ($tables as $table) {
            $status = $orderService->getTableStatus($table);
            $currentReservation = $status === 'reservada'
                ? $reservationService->currentReservation($table)
                : null;
            $nextReservation = $reservationService->upcomingReservation($table);

            if ($currentReservation !== null && $nextReservation?->is($currentReservation)) {
                $nextReservation = null;
            }

            $table->setAttribute('status', $status);
            $table->setAttribute('reservation', $currentReservation);
            $table->setAttribute('next_reservation', $nextReservation);
        }

        return TableResource::collection($tables);
    }
}
