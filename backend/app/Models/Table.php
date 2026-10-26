<?php

namespace App\Models;

use App\Enums\TableZone;
use Database\Factories\TableFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'seats', 'pos_x', 'pos_y', 'pos_z', 'zone', 'is_active'])]
class Table extends Model
{
    /** @use HasFactory<TableFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'seats' => 'integer',
            'pos_x' => 'decimal:2',
            'pos_y' => 'decimal:2',
            'pos_z' => 'decimal:2',
            'zone' => TableZone::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the orders for the table.
     *
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the reservations for the table.
     *
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }
}
