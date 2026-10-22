<?php

namespace Database\Factories;

use App\Models\Table;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Table>
 */
class TableFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => fake()->unique()->numberBetween(1, 100),
            'seats' => fake()->numberBetween(2, 8),
            'pos_x' => fake()->randomFloat(2, -8, 8),
            'pos_y' => 0,
            'pos_z' => fake()->randomFloat(2, -6, 6),
            'is_active' => true,
        ];
    }
}
