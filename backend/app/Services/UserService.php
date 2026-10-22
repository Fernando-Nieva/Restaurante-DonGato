<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    /**
     * List users, optionally filtered by role.
     *
     * @return Collection<int, User>
     */
    public function list(?string $role = null): Collection
    {
        return User::query()
            ->when(
                $role !== null,
                fn (Builder $query): Builder => $query->where('role', $role)
            )
            ->orderBy('name')
            ->orderBy('id')
            ->get();
    }

    /**
     * Create a user account.
     *
     * @param  array{name: string, email: string, role: string, password: string}  $data
     */
    public function create(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
            'is_active' => true,
        ]);
    }

    /**
     * Update a user's profile and role.
     *
     * @param  array{name: string, email: string, role: string}  $data
     */
    public function update(User $actor, User $user, array $data): User
    {
        $roleChanged = $user->role !== $data['role'];

        if ($actor->is($user) && $data['role'] !== 'admin') {
            throw ValidationException::withMessages([
                'role' => 'No podés quitarte el rol de administrador.',
            ]);
        }

        if (
            $roleChanged
            && $user->role === 'admin'
            && $user->is_active
            && $this->activeAdminCount() <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'No podés dejar al sistema sin ningún administrador activo.',
            ]);
        }

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ]);

        if ($roleChanged) {
            $this->revokeTokens($user);
        }

        return $user;
    }

    /**
     * Change a user's password and revoke their access tokens.
     */
    public function updatePassword(User $user, string $password): User
    {
        $user->update([
            'password' => Hash::make($password),
        ]);

        $this->revokeTokens($user);

        return $user;
    }

    /**
     * Activate or deactivate a user account.
     */
    public function updateActive(User $actor, User $user, bool $isActive): User
    {
        if (! $isActive) {
            if ($actor->is($user)) {
                throw ValidationException::withMessages([
                    'is_active' => 'No podés desactivar tu propia cuenta.',
                ]);
            }

            if (
                $user->role === 'admin'
                && $user->is_active
                && $this->activeAdminCount() <= 1
            ) {
                throw ValidationException::withMessages([
                    'is_active' => 'No podés desactivar al último administrador activo.',
                ]);
            }
        }

        $user->update([
            'is_active' => $isActive,
        ]);

        if (! $isActive) {
            $this->revokeTokens($user);
        }

        return $user;
    }

    private function activeAdminCount(): int
    {
        return User::query()
            ->where('role', 'admin')
            ->where('is_active', true)
            ->count();
    }

    private function revokeTokens(User $user): void
    {
        $user->tokens()->delete();
    }
}
