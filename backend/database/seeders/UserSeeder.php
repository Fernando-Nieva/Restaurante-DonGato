<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed the demo users (password: "password").
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Mozo Demo', 'email' => 'mozo@example.com', 'role' => 'mozo'],
            ['name' => 'Mozo Dos', 'email' => 'mozo2@example.com', 'role' => 'mozo'],
            ['name' => 'Cocina Demo', 'email' => 'cocina@example.com', 'role' => 'cocina'],
            ['name' => 'Admin Demo', 'email' => 'admin@example.com', 'role' => 'admin'],
        ];

        foreach ($users as $user) {
            if (User::query()->where('email', $user['email'])->exists()) {
                continue;
            }

            User::factory()->create($user);
        }
    }
}
