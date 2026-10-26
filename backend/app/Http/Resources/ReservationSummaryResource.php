<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationSummaryResource extends JsonResource
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
            'table_id' => $this->table_id,
            'customer_name' => $this->customer_name,
            'party_size' => $this->party_size,
            'reserved_for' => $this->reserved_for?->toISOString(),
            'status' => $this->status->value,
        ];
    }
}
