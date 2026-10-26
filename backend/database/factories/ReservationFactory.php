<?php

namespace Database\Factories;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'table_id' => Table::factory(),
            'customer_name' => fake()->name(),
            'party_size' => fake()->numberBetween(1, 2),
            'phone' => fake()->optional()->phoneNumber(),
            'reserved_for' => now()->addHours(2),
            'notes' => fake()->optional()->sentence(),
            'status' => ReservationStatus::Activa,
            'created_by' => User::factory(),
        ];
    }
}
