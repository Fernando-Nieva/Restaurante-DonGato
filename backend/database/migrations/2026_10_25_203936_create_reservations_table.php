<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_id')->constrained()->cascadeOnDelete();
            $table->string('customer_name');
            $table->unsignedInteger('party_size');
            $table->string('phone')->nullable();
            $table->dateTime('reserved_for');
            $table->text('notes')->nullable();
            $table->string('status')->default('activa');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['table_id', 'reserved_for']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
