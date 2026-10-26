<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListReservationsRequest;
use App\Http\Requests\Admin\StoreReservationRequest;
use App\Http\Requests\Admin\UpdateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReservationController extends Controller
{
    /**
     * List reservations filtered by date, status and table.
     */
    public function index(
        ListReservationsRequest $request,
        ReservationService $reservationService
    ): AnonymousResourceCollection {
        $reservationService->expireOverdueReservations();

        $validated = $request->validated();

        $query = Reservation::query()
            ->with('table')
            ->when(
                isset($validated['table_id']),
                fn (Builder $query): Builder => $query->where('table_id', $validated['table_id'])
            )
            ->when(
                isset($validated['status']),
                fn (Builder $query): Builder => $query->where('status', $validated['status'])
            );

        if (isset($validated['date'])) {
            $query->whereDate('reserved_for', $validated['date']);
        } elseif (! isset($validated['status'])) {
            $query->where('status', ReservationStatus::Activa->value)
                ->where('reserved_for', '>=', now()->startOfDay());
        }

        $reservations = $query->orderBy('reserved_for')->get();

        return ReservationResource::collection($reservations);
    }

    /**
     * Create a reservation.
     */
    public function store(
        StoreReservationRequest $request,
        ReservationService $reservationService
    ): JsonResponse {
        $reservation = $reservationService->create(
            $request->validated(),
            $request->user()->id
        );

        return (new ReservationResource($reservation->load('table')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an active reservation.
     */
    public function update(
        UpdateReservationRequest $request,
        Reservation $reservation,
        ReservationService $reservationService
    ): ReservationResource {
        return new ReservationResource(
            $reservationService->update($reservation, $request->validated())->load('table')
        );
    }

    /**
     * Cancel an active reservation.
     */
    public function cancel(
        Reservation $reservation,
        ReservationService $reservationService
    ): ReservationResource {
        return new ReservationResource(
            $reservationService->cancel($reservation)->load('table')
        );
    }
}
