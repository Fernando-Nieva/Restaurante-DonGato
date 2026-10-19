<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class OrderController extends Controller
{
    /**
     * List orders, optionally filtered by status.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
        ]);

        $orders = Order::query()
            ->with(['table', 'user', 'items.product'])
            ->when(
                $validated['status'] ?? null,
                fn (Builder $query, string $status) => $query->where('status', $status)
            )
            ->latest()
            ->get();

        return OrderResource::collection($orders);
    }

    /**
     * Create a new order for the given table.
     */
    public function store(StoreOrderRequest $request, OrderService $orderService): JsonResponse
    {
        try {
            $order = $orderService->createOrder(
                tableId: $request->integer('table_id'),
                userId: $request->user()->id,
                items: $request->validated('items'),
                notes: $request->validated('notes'),
            );
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'items' => $exception->getMessage(),
            ]);
        }

        $order->load(['table', 'user', 'items.product']);

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    /**
     * Update the status of an order.
     */
    public function updateStatus(
        UpdateOrderStatusRequest $request,
        Order $order,
        OrderService $orderService
    ): OrderResource {
        $to = OrderStatus::from($request->validated('status'));

        if ($order->status->canTransitionTo($to)) {
            Gate::authorize('transition', [$order, $to]);
        }

        try {
            $order = $orderService->updateStatus($order, $to);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'status' => $exception->getMessage(),
            ]);
        }

        $order->load(['table', 'user', 'items.product']);

        return new OrderResource($order);
    }
}
