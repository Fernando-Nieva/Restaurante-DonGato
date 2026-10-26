<?php

namespace App\Enums;

enum TableZone: string
{
    case Salon = 'salon';
    case Terraza = 'terraza';

    public function label(): string
    {
        return match ($this) {
            self::Salon => 'salón',
            self::Terraza => 'terraza',
        };
    }
}
