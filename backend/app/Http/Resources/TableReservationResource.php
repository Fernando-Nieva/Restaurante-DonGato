<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableReservationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->role === 'admin';

        return [
            'id' => $this->id,
            'customer_name' => $this->customer_name,
            'party_size' => $this->party_size,
            'reserved_for' => $this->reserved_for?->toISOString(),
            'phone' => $this->when($isAdmin, $this->phone),
            'notes' => $this->when($isAdmin, $this->notes),
        ];
    }
}
