<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SalesByHourRequest;
use App\Http\Requests\Admin\StatsRangeRequest;
use App\Http\Requests\Admin\TopProductsRequest;
use App\Services\StatsService;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /**
     * Return the sales and operations summary.
     */
    public function summary(StatsRangeRequest $request, StatsService $statsService): JsonResponse
    {
        return response()->json(
            $statsService->summary($request->fromStart(), $request->toEnd())
        );
    }

    /**
     * Return the best-selling products.
     */
    public function topProducts(TopProductsRequest $request, StatsService $statsService): JsonResponse
    {
        return response()->json(
            $statsService->topProducts(
                $request->fromStart(),
                $request->toEnd(),
                $request->limit()
            )
        );
    }

    /**
     * Return delivered sales grouped by hour.
     */
    public function salesByHour(SalesByHourRequest $request, StatsService $statsService): JsonResponse
    {
        return response()->json(
            $statsService->salesByHour($request->reportDate())
        );
    }

    /**
     * Return order and sales totals grouped by waiter.
     */
    public function byWaiter(StatsRangeRequest $request, StatsService $statsService): JsonResponse
    {
        return response()->json(
            $statsService->byWaiter($request->fromStart(), $request->toEnd())
        );
    }
}
