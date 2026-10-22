<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\ProductCategory;
use App\Events\MenuUpdated;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ProductAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): string
    {
        return User::factory()->create(['role' => $role])->createToken('test')->plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function productPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Producto de prueba',
            'description' => 'Descripción de prueba.',
            'category' => ProductCategory::Pizza->value,
            'price' => 12500.50,
            'is_available' => true,
        ], $overrides);
    }

    public function test_mozo_and_cocina_receive_403_on_admin_product_endpoints(): void
    {
        $product = Product::factory()->create();

        foreach (['mozo', 'cocina'] as $role) {
            $token = $this->tokenFor($role);

            $this->withToken($token)
                ->getJson('/api/admin/products')
                ->assertForbidden();

            $this->withToken($token)
                ->postJson('/api/admin/products', $this->productPayload())
                ->assertForbidden();

            $this->withToken($token)
                ->putJson("/api/admin/products/{$product->id}", $this->productPayload())
                ->assertForbidden();

            $this->withToken($token)
                ->patchJson("/api/admin/products/{$product->id}/availability", ['is_available' => false])
                ->assertForbidden();
        }

        $this->assertDatabaseCount('products', 1);
    }

    public function test_admin_lists_all_products_and_filters_by_category_and_availability(): void
    {
        $availablePizza = Product::factory()->create([
            'name' => 'Muzzarella',
            'category' => ProductCategory::Pizza,
            'is_available' => true,
        ]);
        $unavailablePizza = Product::factory()->create([
            'name' => 'Fugazzeta',
            'category' => ProductCategory::Pizza,
            'is_available' => false,
        ]);
        Product::factory()->create([
            'name' => 'Agua',
            'category' => ProductCategory::Bebida,
            'is_available' => true,
        ]);

        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->withToken($token)
            ->getJson('/api/admin/products?category=pizza&available=false')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unavailablePizza->id)
            ->assertJsonPath('data.0.is_available', false);

        $this->withToken($token)
            ->getJson('/api/admin/products?category=pizza&available=true')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $availablePizza->id);
    }

    public function test_admin_creates_a_product_and_broadcasts_menu_updated(): void
    {
        $token = $this->tokenFor('admin');

        Event::fake([MenuUpdated::class]);

        $payload = $this->productPayload();
        unset($payload['is_available']);

        $response = $this->withToken($token)
            ->postJson('/api/admin/products', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Producto de prueba')
            ->assertJsonPath('data.category', 'pizza')
            ->assertJsonPath('data.price', 12500.5)
            ->assertJsonPath('data.is_available', true);

        $productId = $response->json('data.id');

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Producto de prueba',
            'category' => 'pizza',
            'price' => 12500.50,
            'is_available' => true,
        ]);

        Event::assertDispatched(MenuUpdated::class, function (MenuUpdated $event) use ($productId): bool {
            $channels = array_map(fn ($channel): string => (string) $channel, $event->broadcastOn());

            return $event->productId === $productId
                && $event->action === 'created'
                && $event->isAvailable === true
                && in_array('private-restaurant', $channels, true);
        });
    }

    public function test_admin_updates_a_product_and_broadcasts_menu_updated(): void
    {
        $product = Product::factory()->create([
            'name' => 'Muzzarella',
            'category' => ProductCategory::Pizza,
            'price' => 10000,
            'is_available' => true,
        ]);
        $token = $this->tokenFor('admin');

        Event::fake([MenuUpdated::class]);

        $this->withToken($token)
            ->putJson("/api/admin/products/{$product->id}", $this->productPayload([
                'name' => 'Muzzarella especial',
                'price' => 15000.25,
                'is_available' => false,
            ]))
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.name', 'Muzzarella especial')
            ->assertJsonPath('data.price', 15000.25)
            ->assertJsonPath('data.is_available', false);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Muzzarella especial',
            'price' => 15000.25,
            'is_available' => false,
        ]);

        Event::assertDispatched(MenuUpdated::class, fn (MenuUpdated $event): bool => $event->productId === $product->id
            && $event->action === 'updated'
            && $event->isAvailable === false);
    }

    public function test_admin_rejects_a_duplicate_product_name_in_the_same_category_but_allows_another_category(): void
    {
        Product::factory()->create([
            'name' => 'Muzzarella',
            'category' => ProductCategory::Pizza,
        ]);
        $token = $this->tokenFor('admin');

        $this->withToken($token)
            ->postJson('/api/admin/products', $this->productPayload([
                'name' => 'Muzzarella',
                'category' => ProductCategory::Pizza->value,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->withToken($token)
            ->postJson('/api/admin/products', $this->productPayload([
                'name' => 'Muzzarella',
                'category' => ProductCategory::Hamburguesa->value,
            ]))
            ->assertCreated();

        $this->assertDatabaseCount('products', 2);
    }

    public function test_admin_deactivates_a_product_and_it_disappears_from_the_public_menu(): void
    {
        $product = Product::factory()->create(['is_available' => true]);
        $token = $this->tokenFor('admin');

        Event::fake([MenuUpdated::class]);

        $this->withToken($token)
            ->patchJson("/api/admin/products/{$product->id}/availability", ['is_available' => false])
            ->assertOk()
            ->assertJsonPath('data.is_available', false);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_available' => false,
        ]);

        $this->withToken($token)
            ->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        Event::assertDispatched(MenuUpdated::class, fn (MenuUpdated $event): bool => $event->productId === $product->id
            && $event->action === 'availability_updated'
            && $event->isAvailable === false);
    }

    public function test_admin_rejects_a_price_with_more_than_two_decimals(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/products', $this->productPayload(['price' => 12500.555]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');

        $this->assertDatabaseCount('products', 0);
    }

    public function test_admin_rejects_a_price_above_the_reasonable_maximum(): void
    {
        $this->withToken($this->tokenFor('admin'))
            ->postJson('/api/admin/products', $this->productPayload(['price' => 1_000_001]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('price');

        $this->assertDatabaseCount('products', 0);
    }
}
