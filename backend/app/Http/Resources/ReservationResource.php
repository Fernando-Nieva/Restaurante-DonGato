<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
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
            'phone' => $this->phone,
            'reserved_for' => $this->reserved_for?->toISOString(),
            'notes' => $this->notes,
            'status' => $this->status->value,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'table' => new TableResource($this->whenLoaded('table')),
        ];
    }
}
