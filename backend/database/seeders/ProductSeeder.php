<?php

namespace Database\Seeders;

use App\Enums\ProductCategory;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Seed the menu: 5 pizzas, 5 burgers and 5 drinks (prices in ARS).
     */
    public function run(): void
    {
        $products = [
            ['name' => 'Muzzarella', 'category' => ProductCategory::Pizza, 'description' => 'Salsa de tomate y mozzarella con orégano.', 'price' => 9800.00, 'is_available' => true],
            ['name' => 'Napolitana', 'category' => ProductCategory::Pizza, 'description' => 'Mozzarella, tomate en rodajas y ajo.', 'price' => 11200.00, 'is_available' => true],
            ['name' => 'Fugazzeta', 'category' => ProductCategory::Pizza, 'description' => 'Cebolla, mozzarella y orégano.', 'price' => 11500.00, 'is_available' => false],
            ['name' => 'Calabresa', 'category' => ProductCategory::Pizza, 'description' => 'Mozzarella y salame calabrés.', 'price' => 11800.00, 'is_available' => true],
            ['name' => 'Cuatro Quesos', 'category' => ProductCategory::Pizza, 'description' => 'Mozzarella, provolone, roquefort y parmesano.', 'price' => 12500.00, 'is_available' => true],
            ['name' => 'Clásica', 'category' => ProductCategory::Hamburguesa, 'description' => 'Medallón de carne, lechuga, tomate y mayonesa.', 'price' => 8500.00, 'is_available' => true],
            ['name' => 'Doble Queso', 'category' => ProductCategory::Hamburguesa, 'description' => 'Doble medallón con cheddar fundido.', 'price' => 10500.00, 'is_available' => true],
            ['name' => 'Bacon', 'category' => ProductCategory::Hamburguesa, 'description' => 'Medallón, bacon crocante y cheddar.', 'price' => 11200.00, 'is_available' => true],
            ['name' => 'Criolla', 'category' => ProductCategory::Hamburguesa, 'description' => 'Medallón con morrones, huevo y salsa criolla.', 'price' => 10800.00, 'is_available' => true],
            ['name' => 'Vegetariana', 'category' => ProductCategory::Hamburguesa, 'description' => 'Medallón de lentejas, rúcula y tomate.', 'price' => 9500.00, 'is_available' => true],
            ['name' => 'Coca-Cola 500ml', 'category' => ProductCategory::Bebida, 'description' => 'Gaseosa clásica, botella de 500 ml.', 'price' => 2800.00, 'is_available' => true],
            ['name' => 'Sprite 500ml', 'category' => ProductCategory::Bebida, 'description' => 'Gaseosa lima-limón, botella de 500 ml.', 'price' => 2800.00, 'is_available' => true],
            ['name' => 'Agua mineral', 'category' => ProductCategory::Bebida, 'description' => 'Botella sin gas de 500 ml.', 'price' => 2200.00, 'is_available' => true],
            ['name' => 'Cerveza lata', 'category' => ProductCategory::Bebida, 'description' => 'Lager nacional de 473 ml.', 'price' => 3500.00, 'is_available' => false],
            ['name' => 'Jugo de naranja', 'category' => ProductCategory::Bebida, 'description' => 'Exprimido natural, vaso de 400 ml.', 'price' => 3200.00, 'is_available' => true],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}
