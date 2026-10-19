<?php

namespace Tests\Unit;

use App\Enums\OrderStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class OrderStatusTest extends TestCase
{
    #[DataProvider('validTransitions')]
    public function test_allows_valid_transitions(OrderStatus $from, OrderStatus $to): void
    {
        $this->assertTrue($from->canTransitionTo($to));
    }

    #[DataProvider('invalidTransitions')]
    public function test_rejects_invalid_transitions(OrderStatus $from, OrderStatus $to): void
    {
        $this->assertFalse($from->canTransitionTo($to));
    }

    /**
     * @return array<string, array{OrderStatus, OrderStatus}>
     */
    public static function validTransitions(): array
    {
        return [
            'pendiente → preparando' => [OrderStatus::Pendiente, OrderStatus::Preparando],
            'pendiente → cancelado' => [OrderStatus::Pendiente, OrderStatus::Cancelado],
            'preparando → listo' => [OrderStatus::Preparando, OrderStatus::Listo],
            'preparando → cancelado' => [OrderStatus::Preparando, OrderStatus::Cancelado],
            'listo → entregado' => [OrderStatus::Listo, OrderStatus::Entregado],
        ];
    }

    /**
     * @return array<string, array{OrderStatus, OrderStatus}>
     */
    public static function invalidTransitions(): array
    {
        return [
            'pendiente → pendiente' => [OrderStatus::Pendiente, OrderStatus::Pendiente],
            'pendiente → listo' => [OrderStatus::Pendiente, OrderStatus::Listo],
            'pendiente → entregado' => [OrderStatus::Pendiente, OrderStatus::Entregado],
            'preparando → pendiente' => [OrderStatus::Preparando, OrderStatus::Pendiente],
            'preparando → entregado' => [OrderStatus::Preparando, OrderStatus::Entregado],
            'listo → pendiente' => [OrderStatus::Listo, OrderStatus::Pendiente],
            'listo → preparando' => [OrderStatus::Listo, OrderStatus::Preparando],
            'listo → cancelado' => [OrderStatus::Listo, OrderStatus::Cancelado],
            'entregado → listo' => [OrderStatus::Entregado, OrderStatus::Listo],
            'entregado → cancelado' => [OrderStatus::Entregado, OrderStatus::Cancelado],
            'cancelado → pendiente' => [OrderStatus::Cancelado, OrderStatus::Pendiente],
            'cancelado → preparando' => [OrderStatus::Cancelado, OrderStatus::Preparando],
        ];
    }
}
