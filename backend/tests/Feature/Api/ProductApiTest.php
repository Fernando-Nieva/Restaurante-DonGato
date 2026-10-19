<?php

namespace Tests\Feature\Api;

use App\Enums\ProductCategory;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    public function test_products_endpoint_lists_only_available_products_ordered_by_category_and_name(): void
    {
        Product::factory()->create([
            'name' => 'Zeta',
            'description' => 'Hamburguesa de prueba.',
            'category' => ProductCategory::Hamburguesa,
        ]);
        Product::factory()->create(['name' => 'Alfa', 'category' => ProductCategory::Bebida]);
        Product::factory()->create(['name' => 'Beta', 'category' => ProductCategory::Bebida]);
        Product::factory()->create([
            'name' => 'No disponible',
            'category' => ProductCategory::Pizza,
            'is_available' => false,
        ]);

        $response = $this->withToken($this->tokenFor('mozo'))->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'Alfa')
            ->assertJsonPath('data.0.category', 'bebida')
            ->assertJsonPath('data.1.name', 'Beta')
            ->assertJsonPath('data.2.name', 'Zeta')
            ->assertJsonStructure(['data' => [['id', 'name', 'description', 'category', 'price']]]);

        $this->assertNotContains('No disponible', array_column($response->json('data'), 'name'));
    }

    public function test_unavailable_product_is_not_listed_and_cannot_be_ordered(): void
    {
        $available = Product::factory()->create();
        $unavailable = Product::factory()->create(['is_available' => false]);
        $token = $this->tokenFor('mozo');

        $this->withToken($token)
            ->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $available->id);

        $table = Table::factory()->create();

        $this->withToken($token)
            ->postJson('/api/orders', [
                'table_id' => $table->id,
                'items' => [
                    ['product_id' => $unavailable->id, 'quantity' => 1],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.product_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_mozo_cannot_change_product_availability(): void
    {
        $product = Product::factory()->create(['is_available' => true]);

        $this->withToken($this->tokenFor('mozo'))
            ->patchJson("/api/products/{$product->id}/availability", ['is_available' => false])
            ->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $product->id, 'is_available' => true]);
    }

    public function test_admin_can_deactivate_a_product_and_it_disappears_from_the_menu(): void
    {
        $product = Product::factory()->create(['is_available' => true]);
        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->patchJson("/api/products/{$product->id}/availability", ['is_available' => false])
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);

        $this->assertDatabaseHas('products', ['id' => $product->id, 'is_available' => false]);

        $this->withToken($token)
            ->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withToken($token)
            ->patchJson("/api/products/{$product->id}/availability", ['is_available' => true])
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $product->id);
    }
}
