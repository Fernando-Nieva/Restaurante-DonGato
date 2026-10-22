<?php

use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\StatsController as AdminStatsController;
use App\Http\Controllers\Api\Admin\TableController as AdminTableController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TableController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/tables', [TableController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);

    Route::patch('/products/{product}/availability', [ProductController::class, 'updateAvailability'])
        ->middleware('role:admin');

    Route::get('/orders', [OrderController::class, 'index']);

    Route::post('/orders', [OrderController::class, 'store'])
        ->middleware(['throttle:orders', 'role:mozo']);

    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);

    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/products', [AdminProductController::class, 'index']);
        Route::post('/products', [AdminProductController::class, 'store']);
        Route::put('/products/{product}', [AdminProductController::class, 'update']);
        Route::patch('/products/{product}/availability', [AdminProductController::class, 'updateAvailability']);

        Route::post('/tables', [AdminTableController::class, 'store']);
        Route::put('/tables/{table}', [AdminTableController::class, 'update']);
        Route::delete('/tables/{table}', [AdminTableController::class, 'destroy']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::patch('/users/{user}/password', [AdminUserController::class, 'updatePassword']);
        Route::patch('/users/{user}/active', [AdminUserController::class, 'updateActive']);

        Route::get('/orders', [AdminOrderController::class, 'index']);

        Route::get('/stats/summary', [AdminStatsController::class, 'summary']);
        Route::get('/stats/top-products', [AdminStatsController::class, 'topProducts']);
        Route::get('/stats/sales-by-hour', [AdminStatsController::class, 'salesByHour']);
        Route::get('/stats/by-waiter', [AdminStatsController::class, 'byWaiter']);
    });
});
