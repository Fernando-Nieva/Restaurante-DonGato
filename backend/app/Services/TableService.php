<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Events\TablesUpdated;
use App\Models\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class TableService
{
    /**
     * Create a table and notify the open restaurant screens.
     *
     * @param  array{number: int, seats: int, pos_x: int|float|string, pos_z: int|float|string}  $data
     */
    public function create(array $data): Table
    {
        $posX = (float) $data['pos_x'];
        $posZ = (float) $data['pos_z'];

        $this->ensurePositionIsFree($posX, $posZ);

        $table = Table::create([
            'number' => $data['number'],
            'seats' => $data['seats'],
            'pos_x' => $posX,
            'pos_y' => 0,
            'pos_z' => $posZ,
            'is_active' => true,
        ]);

        $this->broadcastTableChange($table, 'created');

        return $table;
    }

    /**
     * Update a table and notify the open restaurant screens.
     *
     * @param  array{number: int, seats: int, pos_x: int|float|string, pos_z: int|float|string}  $data
     */
    public function update(Table $table, array $data): Table
    {
        $posX = (float) $data['pos_x'];
        $posZ = (float) $data['pos_z'];

        $this->ensurePositionIsFree($posX, $posZ, $table->id);

        $table->update([
            'number' => $data['number'],
            'seats' => $data['seats'],
            'pos_x' => $posX,
            'pos_y' => 0,
            'pos_z' => $posZ,
        ]);

        $this->broadcastTableChange($table, 'updated');

        return $table;
    }

    /**
     * Delete a table without breaking its order history.
     *
     * Tables with active orders cannot be deleted. Tables with old orders are
     * deactivated instead of removed. Tables without orders are physically deleted.
     * Returns the deactivated table, or null after a physical deletion.
     */
    public function delete(Table $table): ?Table
    {
        if ($this->hasActiveOrders($table)) {
            throw ValidationException::withMessages([
                'table' => 'La mesa tiene pedidos activos y no puede eliminarse.',
            ]);
        }

        if ($table->orders()->exists()) {
            $table->update(['is_active' => false]);

            $this->broadcastTableChange($table, 'deactivated');

            return $table;
        }

        $tableId = $table->id;

        $table->delete();

        TablesUpdated::dispatch($tableId, 'deleted', false);

        return null;
    }

    private function ensurePositionIsFree(float $posX, float $posZ, ?int $ignoreTableId = null): void
    {
        $minDistance = (float) config('restaurant.tables.min_distance', 3.0);

        $hasCollision = Table::query()
            ->where('is_active', true)
            ->when(
                $ignoreTableId !== null,
                fn (Builder $query): Builder => $query->whereKeyNot($ignoreTableId)
            )
            ->get(['id', 'pos_x', 'pos_z'])
            ->contains(function (Table $table) use ($posX, $posZ, $minDistance): bool {
                $distance = sqrt(
                    ((float) $table->pos_x - $posX) ** 2
                    + ((float) $table->pos_z - $posZ) ** 2
                );

                return $distance < $minDistance;
            });

        if ($hasCollision) {
            throw ValidationException::withMessages([
                'position' => 'La posición se superpone con otra mesa activa.',
            ]);
        }
    }

    private function hasActiveOrders(Table $table): bool
    {
        $activeStatuses = array_map(
            fn (OrderStatus $status): string => $status->value,
            [OrderStatus::Pendiente, OrderStatus::Preparando, OrderStatus::Listo]
        );

        return $table->orders()
            ->whereIn('status', $activeStatuses)
            ->exists();
    }

    private function broadcastTableChange(Table $table, string $action): void
    {
        TablesUpdated::dispatch($table->id, $action, $table->is_active);
    }
}
