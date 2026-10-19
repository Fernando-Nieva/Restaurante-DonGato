<?php

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
        ->middleware(['throttle:orders', 'role:mozo,admin']);

    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
