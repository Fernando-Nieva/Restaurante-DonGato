<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderIndexRequest;
use App\Http\Resources\AdminOrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    /**
     * List the order history with filters and server-side totals.
     */
    public function index(OrderIndexRequest $request): AnonymousResourceCollection
    {
        $from = $request->fromStart();
        $to = $request->toEnd();
        $filters = $request->validated();

        $orderTotals = OrderItem::query()
            ->selectRaw('order_id, SUM(quantity * unit_price) as total')
            ->groupBy('order_id');

        $orders = Order::query()
            ->leftJoinSub(
                $orderTotals,
                'order_totals',
                'order_totals.order_id',
                '=',
                'orders.id'
            )
            ->select('orders.*')
            ->selectRaw('COALESCE(order_totals.total, 0) as total')
            ->with(['table', 'user', 'items.product'])
            ->when(
                $from !== null,
                fn (Builder $query): Builder => $query->where('orders.created_at', '>=', $from)
            )
            ->when(
                $to !== null,
                fn (Builder $query): Builder => $query->where('orders.created_at', '<=', $to)
            )
            ->when(
                isset($filters['status']),
                fn (Builder $query): Builder => $query->where('orders.status', $filters['status'])
            )
            ->when(
                isset($filters['table_id']),
                fn (Builder $query): Builder => $query->where('orders.table_id', $filters['table_id'])
            )
            ->when(
                isset($filters['user_id']),
                fn (Builder $query): Builder => $query->where('orders.user_id', $filters['user_id'])
            )
            ->orderByDesc('orders.created_at')
            ->orderByDesc('orders.id')
            ->paginate(20)
            ->withQueryString();

        return AdminOrderResource::collection($orders);
    }
}
