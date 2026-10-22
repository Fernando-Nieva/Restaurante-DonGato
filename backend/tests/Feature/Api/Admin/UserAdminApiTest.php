<?php

namespace Tests\Feature\Api\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function userPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Usuario Nuevo',
            'email' => 'nuevo@example.com',
            'role' => 'mozo',
            'password' => 'password123',
        ], $overrides);
    }

    public function test_mozo_and_cocina_receive_403_on_admin_user_endpoints(): void
    {
        $target = User::factory()->create(['role' => 'mozo']);

        foreach (['mozo', 'cocina'] as $role) {
            $token = $this->tokenFor($role);

            $this->withToken($token)
                ->getJson('/api/admin/users')
                ->assertForbidden();

            $this->withToken($token)
                ->postJson('/api/admin/users', $this->userPayload())
                ->assertForbidden();

            $this->withToken($token)
                ->putJson("/api/admin/users/{$target->id}", [
                    'name' => $target->name,
                    'email' => $target->email,
                    'role' => $target->role,
                ])
                ->assertForbidden();

            $this->withToken($token)
                ->patchJson("/api/admin/users/{$target->id}/password", ['password' => 'newpassword123'])
                ->assertForbidden();

            $this->withToken($token)
                ->patchJson("/api/admin/users/{$target->id}/active", ['is_active' => false])
                ->assertForbidden();
        }

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'role' => 'mozo',
            'is_active' => true,
        ]);
    }

    public function test_admin_lists_users_with_role_filter_and_without_passwords(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $activeMozo = User::factory()->create(['role' => 'mozo']);
        $inactiveMozo = User::factory()->create(['role' => 'mozo', 'is_active' => false]);
        User::factory()->create(['role' => 'cocina']);

        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'is_active']],
            ])
            ->assertJsonMissingPath('data.0.password');

        $inactiveRow = collect($response->json('data'))->firstWhere('id', $inactiveMozo->id);

        $this->assertFalse($inactiveRow['is_active']);
        $this->assertArrayNotHasKey('password', $inactiveRow);

        $mozoResponse = $this->withToken($token)
            ->getJson('/api/admin/users?role=mozo')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertEqualsCanonicalizing(
            [$activeMozo->id, $inactiveMozo->id],
            array_column($mozoResponse->json('data'), 'id')
        );

        $this->withToken($token)
            ->getJson('/api/admin/users?role=admin')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $admin->id);

        $this->withToken($token)
            ->getJson('/api/admin/users?role=invalido')
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');
    }

    public function test_admin_creates_a_user_with_a_hashed_password(): void
    {
        $token = $this->tokenFor('admin');

        $response = $this->withToken($token)
            ->postJson('/api/admin/users', $this->userPayload())
            ->assertCreated()
            ->assertJsonPath('data.name', 'Usuario Nuevo')
            ->assertJsonPath('data.email', 'nuevo@example.com')
            ->assertJsonPath('data.role', 'mozo')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.password');

        $user = User::query()->where('email', 'nuevo@example.com')->firstOrFail();

        $this->assertSame($user->id, $response->json('data.id'));
        $this->assertNotSame('password123', $user->password);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertTrue($user->is_active);
    }

    public function test_admin_user_creation_validates_unique_email_role_and_password_length(): void
    {
        User::factory()->create(['email' => 'existente@example.com']);
        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->postJson('/api/admin/users', $this->userPayload([
                'email' => 'existente@example.com',
                'role' => 'supervisor',
                'password' => 'corta',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'role', 'password']);
    }

    public function test_changing_a_role_revokes_the_affected_users_tokens(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = User::factory()->create(['role' => 'mozo']);
        $targetToken = $target->createToken('target')->plainTextToken;

        $this->withToken($adminToken)
            ->putJson("/api/admin/users/{$target->id}", [
                'name' => 'Usuario Actualizado',
                'email' => $target->email,
                'role' => 'cocina',
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'cocina')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.password');

        $this->assertSame(0, $target->tokens()->count());

        $this->app['auth']->forgetGuards();

        $this->withToken($targetToken)
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_changing_a_password_hashes_it_and_revokes_tokens(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = User::factory()->create(['role' => 'mozo']);
        $target->createToken('target');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/password", [
                'password' => 'newpassword123',
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $target->id)
            ->assertJsonMissingPath('data.password');

        $target->refresh();

        $this->assertNotSame('newpassword123', $target->password);
        $this->assertTrue(Hash::check('newpassword123', $target->password));
        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_admin_deactivates_a_user_revokes_tokens_and_blocks_login(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = User::factory()->create([
            'email' => 'desactivado@example.com',
            'role' => 'mozo',
        ]);
        $target->createToken('target');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/active", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $target->refresh();

        $this->assertFalse($target->is_active);
        $this->assertSame(0, $target->tokens()->count());

        $this->postJson('/api/login', [
            'email' => 'desactivado@example.com',
            'password' => 'password',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'desactivada'));
    }

    public function test_admin_reactivates_a_user_and_login_works_again(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = User::factory()->create([
            'email' => 'reactivado@example.com',
            'role' => 'mozo',
            'is_active' => false,
        ]);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/active", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->postJson('/api/login', [
            'email' => 'reactivado@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $target->id);
    }

    public function test_admin_cannot_deactivate_themselves(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('admin')->plainTextToken;

        $this->withToken($token)
            ->patchJson("/api/admin/users/{$admin->id}/active", ['is_active' => false])
            ->assertStatus(422)
            ->assertJsonValidationErrors('is_active');

        $admin->refresh();

        $this->assertTrue($admin->is_active);
        $this->assertSame(1, $admin->tokens()->count());
    }

    public function test_admin_cannot_remove_their_own_admin_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('admin')->plainTextToken;

        $this->withToken($token)
            ->putJson("/api/admin/users/{$admin->id}", [
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => 'mozo',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $admin->refresh();

        $this->assertSame('admin', $admin->role);
        $this->assertSame(1, $admin->tokens()->count());
    }
}
