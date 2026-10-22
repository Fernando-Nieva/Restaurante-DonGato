<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListProductsRequest;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Requests\UpdateProductAvailabilityRequest;
use App\Http\Resources\AdminProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * List all products, including unavailable ones.
     */
    public function index(
        ListProductsRequest $request,
        ProductService $productService
    ): AnonymousResourceCollection {
        return AdminProductResource::collection(
            $productService->list($request->validated())
        );
    }

    /**
     * Create a product.
     */
    public function store(ProductRequest $request, ProductService $productService): JsonResponse
    {
        $product = $productService->create($request->validated());

        return (new AdminProductResource($product))->response()->setStatusCode(201);
    }

    /**
     * Update a product.
     */
    public function update(
        ProductRequest $request,
        Product $product,
        ProductService $productService
    ): AdminProductResource {
        return new AdminProductResource(
            $productService->update($product, $request->validated())
        );
    }

    /**
     * Update a product's availability.
     */
    public function updateAvailability(
        UpdateProductAvailabilityRequest $request,
        Product $product,
        ProductService $productService
    ): AdminProductResource {
        return new AdminProductResource(
            $productService->updateAvailability($product, $request->boolean('is_available'))
        );
    }
}
