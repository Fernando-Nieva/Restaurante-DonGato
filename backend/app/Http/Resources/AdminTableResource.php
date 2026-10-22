<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminTableResource extends JsonResource
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
            'is_active' => $this->is_active,
        ];
    }
}
