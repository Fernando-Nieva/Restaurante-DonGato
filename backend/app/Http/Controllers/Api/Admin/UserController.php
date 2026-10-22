<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserActiveRequest;
use App\Http\Requests\Admin\UpdateUserPasswordRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /**
     * List users, optionally filtered by role.
     */
    public function index(ListUsersRequest $request, UserService $userService): AnonymousResourceCollection
    {
        return AdminUserResource::collection(
            $userService->list($request->validated('role'))
        );
    }

    /**
     * Create a user account.
     */
    public function store(StoreUserRequest $request, UserService $userService): JsonResponse
    {
        $user = $userService->create($request->validated());

        return (new AdminUserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Update a user's profile and role.
     */
    public function update(
        UpdateUserRequest $request,
        User $user,
        UserService $userService
    ): AdminUserResource {
        $user = $userService->update($request->user(), $user, $request->validated());

        return new AdminUserResource($user);
    }

    /**
     * Change a user's password.
     */
    public function updatePassword(
        UpdateUserPasswordRequest $request,
        User $user,
        UserService $userService
    ): AdminUserResource {
        $user = $userService->updatePassword($user, $request->validated('password'));

        return new AdminUserResource($user);
    }

    /**
     * Activate or deactivate a user account.
     */
    public function updateActive(
        UpdateUserActiveRequest $request,
        User $user,
        UserService $userService
    ): AdminUserResource {
        $user = $userService->updateActive(
            $request->user(),
            $user,
            $request->boolean('is_active')
        );

        return new AdminUserResource($user);
    }
}
