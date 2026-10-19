<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TableResource;
use App\Models\Table;
use App\Services\OrderService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TableController extends Controller
{
    /**
     * List the dining room tables with their status derived from active orders.
     */
    public function index(OrderService $orderService): AnonymousResourceCollection
    {
        $tables = Table::query()->orderBy('number')->get();

        foreach ($tables as $table) {
            $table->setAttribute('status', $orderService->getTableStatus($table));
        }

        return TableResource::collection($tables);
    }
}
