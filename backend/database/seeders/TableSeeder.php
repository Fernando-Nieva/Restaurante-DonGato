<?php

namespace Database\Seeders;

use App\Enums\TableZone;
use App\Models\Table;
use Illuminate\Database\Seeder;

class TableSeeder extends Seeder
{
    /**
     * Seed the dining room and terrace tables without overwriting existing rows.
     */
    public function run(): void
    {
        $tables = [
            ['number' => 1, 'seats' => 4, 'pos_x' => -3.5, 'pos_y' => 0, 'pos_z' => -2.5, 'zone' => TableZone::Salon->value],
            ['number' => 2, 'seats' => 4, 'pos_x' => 0, 'pos_y' => 0, 'pos_z' => -2.5, 'zone' => TableZone::Salon->value],
            ['number' => 3, 'seats' => 4, 'pos_x' => 3.5, 'pos_y' => 0, 'pos_z' => -2.0, 'zone' => TableZone::Salon->value],
            ['number' => 4, 'seats' => 4, 'pos_x' => -3.5, 'pos_y' => 0, 'pos_z' => 1.5, 'zone' => TableZone::Salon->value],
            ['number' => 5, 'seats' => 6, 'pos_x' => 0, 'pos_y' => 0, 'pos_z' => 1.5, 'zone' => TableZone::Salon->value],
            ['number' => 6, 'seats' => 4, 'pos_x' => 3.5, 'pos_y' => 0, 'pos_z' => 1.5, 'zone' => TableZone::Salon->value],
            ['number' => 7, 'seats' => 2, 'pos_x' => -6, 'pos_y' => 0, 'pos_z' => 4.5, 'zone' => TableZone::Salon->value],
            ['number' => 8, 'seats' => 2, 'pos_x' => 6, 'pos_y' => 0, 'pos_z' => 4.5, 'zone' => TableZone::Salon->value],
            ['number' => 9, 'seats' => 4, 'pos_x' => -6.5, 'pos_y' => 0, 'pos_z' => 8.5, 'zone' => TableZone::Terraza->value],
            ['number' => 10, 'seats' => 4, 'pos_x' => -3.0, 'pos_y' => 0, 'pos_z' => 8.5, 'zone' => TableZone::Terraza->value],
            ['number' => 11, 'seats' => 4, 'pos_x' => 3.0, 'pos_y' => 0, 'pos_z' => 8.5, 'zone' => TableZone::Terraza->value],
            ['number' => 12, 'seats' => 4, 'pos_x' => 6.5, 'pos_y' => 0, 'pos_z' => 8.5, 'zone' => TableZone::Terraza->value],
            ['number' => 13, 'seats' => 2, 'pos_x' => 0, 'pos_y' => 0, 'pos_z' => 12.0, 'zone' => TableZone::Terraza->value],
        ];

        foreach ($tables as $table) {
            Table::firstOrCreate(['number' => $table['number']], $table);
        }
    }
}
