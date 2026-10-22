<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed the demo users. Admin uses a distinct demo password.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Mozo Demo', 'email' => 'mozo@example.com', 'role' => 'mozo', 'password' => 'password'],
            ['name' => 'Mozo Dos', 'email' => 'mozo2@example.com', 'role' => 'mozo', 'password' => 'password'],
            ['name' => 'Cocina Demo', 'email' => 'cocina@example.com', 'role' => 'cocina', 'password' => 'password'],
            ['name' => 'Admin Demo', 'email' => 'admin@example.com', 'role' => 'admin', 'password' => 'AdminDemo2026!'],
        ];

        foreach ($users as $user) {
            if (User::query()->where('email', $user['email'])->exists()) {
                continue;
            }

            User::factory()->create($user);
        }
    }
}
