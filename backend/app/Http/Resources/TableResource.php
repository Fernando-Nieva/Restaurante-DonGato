<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'seats' => $this->seats,
            'pos_x' => (float) $this->pos_x,
            'pos_y' => (float) $this->pos_y,
            'pos_z' => (float) $this->pos_z,
            'zone' => $this->zone->value,
            'status' => $this->status,
            'reservation' => $this->reservation
                ? new TableReservationResource($this->reservation)
                : null,
            'next_reservation' => $this->next_reservation
                ? new TableReservationResource($this->next_reservation)
                : null,
        ];
    }
}
