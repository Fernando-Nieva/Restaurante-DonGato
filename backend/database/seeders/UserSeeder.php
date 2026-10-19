<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed one user per role (password: "password").
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Mozo Demo', 'email' => 'mozo@example.com', 'role' => 'mozo'],
            ['name' => 'Cocina Demo', 'email' => 'cocina@example.com', 'role' => 'cocina'],
            ['name' => 'Admin Demo', 'email' => 'admin@example.com', 'role' => 'admin'],
        ];

        foreach ($users as $user) {
            User::factory()->create($user);
        }
    }
}
