<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminOrderResource extends JsonResource
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
            'user_id' => $this->user_id,
            'status' => $this->status->value,
            'notes' => $this->notes,
            'table' => new TableResource($this->whenLoaded('table')),
            'user' => new UserResource($this->whenLoaded('user')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'total' => (float) ($this->total ?? 0),
            'created_at' => $this->created_at?->toISOString(),
            'preparing_at' => $this->preparing_at?->toISOString(),
            'ready_at' => $this->ready_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
        ];
    }
}
