<?php

namespace App\Services;

use App\Events\MenuUpdated;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class ProductService
{
    /**
     * List products, optionally filtered by category and availability.
     *
     * @param  array{category?: string, available?: bool}  $filters
     * @return Collection<int, Product>
     */
    public function list(array $filters = []): Collection
    {
        return Product::query()
            ->when(
                isset($filters['category']),
                fn (Builder $query): Builder => $query->where('category', $filters['category'])
            )
            ->when(
                array_key_exists('available', $filters),
                fn (Builder $query): Builder => $query->where('is_available', $filters['available'])
            )
            ->orderBy('category')
            ->orderBy('name')
            ->get();
    }

    /**
     * Create a product and notify the open restaurant screens.
     *
     * @param  array{name: string, description?: string|null, category: string, price: int|float|string, is_available?: bool}  $data
     */
    public function create(array $data): Product
    {
        $product = Product::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'price' => $data['price'],
            'is_available' => $data['is_available'] ?? true,
        ]);

        $this->broadcastProductChange($product, 'created');

        return $product;
    }

    /**
     * Update a product and notify the open restaurant screens.
     *
     * @param  array{name: string, description?: string|null, category: string, price: int|float|string, is_available?: bool}  $data
     */
    public function update(Product $product, array $data): Product
    {
        $product->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'price' => $data['price'],
            'is_available' => $data['is_available'] ?? $product->is_available,
        ]);

        $this->broadcastProductChange($product, 'updated');

        return $product;
    }

    /**
     * Change a product's availability and notify the open restaurant screens.
     */
    public function updateAvailability(Product $product, bool $isAvailable): Product
    {
        $product->update(['is_available' => $isAvailable]);

        $this->broadcastProductChange($product, 'availability_updated');

        return $product;
    }

    private function broadcastProductChange(Product $product, string $action): void
    {
        MenuUpdated::dispatch($product->id, $action, $product->is_available);
    }
}
