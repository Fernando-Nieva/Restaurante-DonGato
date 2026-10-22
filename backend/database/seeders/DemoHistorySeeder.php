<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Optional demo history generator.
 *
 * This seeder is intentionally not registered in DatabaseSeeder.
 * Run it with: php artisan db:seed --class=DemoHistorySeeder
 */
class DemoHistorySeeder extends Seeder
{
    /**
     * Seed 60 delivered orders from the last seven days.
     */
    public function run(): void
    {
        $waiters = User::query()->where('role', 'mozo')->get();

        if ($waiters->isEmpty()) {
            $waiters = User::factory()->count(2)->create(['role' => 'mozo']);
        }

        $tables = Table::query()->where('is_active', true)->get();

        if ($tables->isEmpty()) {
            $tables = Table::factory()->count(8)->create();
        }

        $products = Product::query()->where('is_available', true)->get();

        if ($products->isEmpty()) {
            $products = Product::factory()->count(10)->create(['is_available' => true]);
        }

        $hours = [11, 12, 12, 13, 13, 14, 19, 20, 20, 21, 21, 22, 23];

        DB::transaction(function () use ($waiters, $tables, $products, $hours): void {
            for ($i = 0; $i < 60; $i++) {
                $createdAt = now()
                    ->subDays(random_int(0, 6))
                    ->setTime($hours[array_rand($hours)], random_int(0, 59), 0);

                if ($createdAt->isFuture()) {
                    $createdAt->subDay();
                }

                $preparingAt = $createdAt->copy()->addMinutes(random_int(1, 4));
                $readyAt = $createdAt->copy()->addMinutes(random_int(8, 35));
                $deliveredAt = $readyAt->copy()->addMinutes(random_int(2, 12));

                if ($deliveredAt->isFuture()) {
                    $createdAt->subDay();
                    $preparingAt->subDay();
                    $readyAt->subDay();
                    $deliveredAt->subDay();
                }

                $order = new Order([
                    'table_id' => $tables->random()->id,
                    'user_id' => $waiters->random()->id,
                    'status' => OrderStatus::Entregado,
                    'notes' => null,
                    'preparing_at' => $preparingAt,
                    'ready_at' => $readyAt,
                    'delivered_at' => $deliveredAt,
                    'cancelled_at' => null,
                ]);

                $order->created_at = $createdAt;
                $order->updated_at = $deliveredAt;
                $order->save();

                $itemCount = random_int(1, min(4, $products->count()));

                foreach ($products->random($itemCount) as $product) {
                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => random_int(1, 3),
                        'notes' => null,
                        'unit_price' => $product->price,
                    ]);
                }
            }
        });
    }
}
