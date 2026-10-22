<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class StatsService
{
    /**
     * Build the admin sales summary for the given date range.
     *
     * @return array<string, mixed>
     */
    public function summary(Carbon $from, Carbon $to): array
    {
        $statusRows = Order::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $ordersByStatus = array_fill_keys(
            array_map(fn (OrderStatus $status): string => $status->value, OrderStatus::cases()),
            0
        );

        foreach ($statusRows as $status => $total) {
            if (array_key_exists($status, $ordersByStatus)) {
                $ordersByStatus[$status] = (int) $total;
            }
        }

        $metrics = Order::query()
            ->leftJoinSub(
                $this->orderTotalsSubquery(),
                'order_totals',
                'order_totals.order_id',
                '=',
                'orders.id'
            )
            ->where('orders.status', OrderStatus::Entregado->value)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('COUNT(orders.id) as delivered_orders')
            ->selectRaw('COALESCE(SUM(order_totals.total), 0) as total_sales')
            ->selectRaw(
                $this->averageSecondsExpression('orders.created_at', 'orders.ready_at')
                .' as average_preparation_seconds'
            )
            ->selectRaw(
                $this->averageSecondsExpression('orders.ready_at', 'orders.delivered_at')
                .' as average_delivery_seconds'
            )
            ->first();

        $totalSales = round((float) ($metrics->total_sales ?? 0), 2);
        $deliveredOrders = (int) ($metrics->delivered_orders ?? 0);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total_sales' => $totalSales,
            'total_orders' => array_sum($ordersByStatus),
            'delivered_orders' => $deliveredOrders,
            'orders_by_status' => $ordersByStatus,
            'average_ticket' => $deliveredOrders > 0
                ? round($totalSales / $deliveredOrders, 2)
                : 0.0,
            'average_preparation_minutes' => round(
                ((float) ($metrics->average_preparation_seconds ?? 0)) / 60,
                2
            ),
            'average_delivery_minutes' => round(
                ((float) ($metrics->average_delivery_seconds ?? 0)) / 60,
                2
            ),
        ];
    }

    /**
     * Get the best-selling products for delivered orders in the range.
     *
     * @return array<string, mixed>
     */
    public function topProducts(Carbon $from, Carbon $to, int $limit): array
    {
        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.status', OrderStatus::Entregado->value)
            ->whereBetween('orders.created_at', [$from, $to])
            ->select('products.id as product_id', 'products.name')
            ->selectRaw('SUM(order_items.quantity) as quantity')
            ->selectRaw('SUM(order_items.quantity * order_items.unit_price) as total_sales')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('quantity')
            ->orderByDesc('total_sales')
            ->orderBy('products.name')
            ->limit($limit)
            ->get();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $rows->map(fn ($row): array => [
                'product_id' => (int) $row->product_id,
                'name' => $row->name,
                'quantity' => (int) $row->quantity,
                'total_sales' => round((float) $row->total_sales, 2),
            ])->all(),
        ];
    }

    /**
     * Get delivered sales grouped by hour for a single date.
     *
     * @return array<string, mixed>
     */
    public function salesByHour(Carbon $date): array
    {
        $hourExpression = $this->hourExpression('orders.delivered_at');

        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', OrderStatus::Entregado->value)
            ->whereNotNull('orders.delivered_at')
            ->whereBetween('orders.delivered_at', [
                $date->copy()->startOfDay(),
                $date->copy()->endOfDay(),
            ])
            ->selectRaw("{$hourExpression} as hour")
            ->selectRaw('COUNT(DISTINCT orders.id) as orders_count')
            ->selectRaw('SUM(order_items.quantity * order_items.unit_price) as total_sales')
            ->groupByRaw($hourExpression)
            ->get()
            ->keyBy(fn ($row): int => (int) $row->hour);

        $hours = [];

        for ($hour = 0; $hour < 24; $hour++) {
            $row = $rows->get($hour);

            $hours[] = [
                'hour' => $hour,
                'orders_count' => (int) ($row->orders_count ?? 0),
                'total_sales' => round((float) ($row->total_sales ?? 0), 2),
            ];
        }

        return [
            'date' => $date->toDateString(),
            'timezone' => config('app.timezone'),
            'data' => $hours,
        ];
    }

    /**
     * Get order and sales totals grouped by waiter.
     *
     * @return array<string, mixed>
     */
    public function byWaiter(Carbon $from, Carbon $to): array
    {
        $rows = Order::query()
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->leftJoinSub(
                $this->orderTotalsSubquery(),
                'order_totals',
                'order_totals.order_id',
                '=',
                'orders.id'
            )
            ->whereBetween('orders.created_at', [$from, $to])
            ->select('users.id as user_id', 'users.name')
            ->selectRaw('COUNT(orders.id) as orders_count')
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN orders.status = ? THEN order_totals.total ELSE 0 END), 0) as total_sales',
                [OrderStatus::Entregado->value]
            )
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_sales')
            ->orderBy('users.name')
            ->get();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $rows->map(fn ($row): array => [
                'user_id' => (int) $row->user_id,
                'name' => $row->name,
                'orders_count' => (int) $row->orders_count,
                'total_sales' => round((float) $row->total_sales, 2),
            ])->all(),
        ];
    }

    private function orderTotalsSubquery(): Builder
    {
        return OrderItem::query()
            ->selectRaw('order_id, SUM(quantity * unit_price) as total')
            ->groupBy('order_id');
    }

    private function averageSecondsExpression(string $startColumn, string $endColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => "AVG(TIMESTAMPDIFF(SECOND, {$startColumn}, {$endColumn}))",
            'pgsql' => "AVG(EXTRACT(EPOCH FROM ({$endColumn} - {$startColumn})))",
            'sqlsrv' => "AVG(DATEDIFF(SECOND, {$startColumn}, {$endColumn}))",
            default => "AVG((julianday({$endColumn}) - julianday({$startColumn})) * 86400)",
        };
    }

    private function hourExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => "HOUR({$column})",
            'pgsql' => "CAST(EXTRACT(HOUR FROM {$column}) AS INTEGER)",
            'sqlsrv' => "DATEPART(HOUR, {$column})",
            default => "CAST(strftime('%H', {$column}) AS INTEGER)",
        };
    }
}
