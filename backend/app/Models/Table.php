<?php

namespace App\Models;

use Database\Factories\TableFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'seats', 'pos_x', 'pos_y', 'pos_z', 'is_active'])]
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
}
