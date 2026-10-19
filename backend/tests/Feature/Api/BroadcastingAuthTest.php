<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastingAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['broadcasting.default' => 'reverb']);

        require base_path('routes/channels.php');
    }

    public function test_broadcasting_auth_rejects_requests_without_a_token(): void
    {
        $this->postJson('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-restaurant',
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_subscribe_to_the_restaurant_channel(): void
    {
        $this->withToken($this->tokenFor('mozo'))
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-restaurant',
            ])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_mozo_cannot_subscribe_to_the_kitchen_channel(): void
    {
        $this->withToken($this->tokenFor('mozo'))
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-kitchen',
            ])
            ->assertForbidden();
    }

    public function test_cocina_can_subscribe_to_the_kitchen_channel(): void
    {
        $this->withToken($this->tokenFor('cocina'))
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-kitchen',
            ])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_admin_can_subscribe_to_the_kitchen_channel(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-kitchen',
            ])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }
}
