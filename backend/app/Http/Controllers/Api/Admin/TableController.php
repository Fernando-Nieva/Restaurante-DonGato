<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TableRequest;
use App\Http\Resources\AdminTableResource;
use App\Models\Table;
use App\Services\TableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TableController extends Controller
{
    /**
     * Create a table.
     */
    public function store(TableRequest $request, TableService $tableService): JsonResponse
    {
        $table = $tableService->create($request->validated());

        return (new AdminTableResource($table))->response()->setStatusCode(201);
    }

    /**
     * Update a table.
     */
    public function update(
        TableRequest $request,
        Table $table,
        TableService $tableService
    ): AdminTableResource {
        return new AdminTableResource(
            $tableService->update($table, $request->validated())
        );
    }

    /**
     * Delete a table, or deactivate it when it has order history.
     */
    public function destroy(Table $table, TableService $tableService): JsonResponse|Response
    {
        $deactivatedTable = $tableService->delete($table);

        if ($deactivatedTable === null) {
            return response()->noContent();
        }

        return (new AdminTableResource($deactivatedTable))->response();
    }
}
