<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProductAvailabilityRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * List the available menu products ordered by category and name.
     */
    public function index(): AnonymousResourceCollection
    {
        return ProductResource::collection(
            Product::query()
                ->where('is_available', true)
                ->orderBy('category')
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * Toggle the availability of the given product.
     */
    public function updateAvailability(
        UpdateProductAvailabilityRequest $request,
        Product $product,
        ProductService $productService
    ): ProductResource {
        $product = $productService->updateAvailability(
            $product,
            $request->boolean('is_available')
        );

        return new ProductResource($product);
    }
}
