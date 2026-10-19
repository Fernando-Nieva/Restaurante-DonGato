<?php

namespace Database\Seeders;

use App\Models\Table;
use Illuminate\Database\Seeder;

class TableSeeder extends Seeder
{
    /**
     * Seed the dining room: 8 tables placed clear of the bar and kitchen zones (pos_y = floor level).
     */
    public function run(): void
    {
        $tables = [
            ['number' => 1, 'seats' => 4, 'pos_x' => -3.5, 'pos_y' => 0, 'pos_z' => -2.5],
            ['number' => 2, 'seats' => 4, 'pos_x' => 0, 'pos_y' => 0, 'pos_z' => -2.5],
            ['number' => 3, 'seats' => 4, 'pos_x' => 3.5, 'pos_y' => 0, 'pos_z' => -2.0],
            ['number' => 4, 'seats' => 4, 'pos_x' => -3.5, 'pos_y' => 0, 'pos_z' => 1.5],
            ['number' => 5, 'seats' => 6, 'pos_x' => 0, 'pos_y' => 0, 'pos_z' => 1.5],
            ['number' => 6, 'seats' => 4, 'pos_x' => 3.5, 'pos_y' => 0, 'pos_z' => 1.5],
            ['number' => 7, 'seats' => 2, 'pos_x' => -6, 'pos_y' => 0, 'pos_z' => 4.5],
            ['number' => 8, 'seats' => 2, 'pos_x' => 6, 'pos_y' => 0, 'pos_z' => 4.5],
        ];

        foreach ($tables as $table) {
            Table::create($table);
        }
    }
}
