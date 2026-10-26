<?php

return [

    'reservation_hold_before_minutes' => 60,
    'reservation_grace_minutes' => 30,
    'reservation_duration_minutes' => 90,

    'zones' => [
        'salon' => [
            'min_x' => -8.0,
            'max_x' => 8.0,
            'min_z' => -6.0,
            'max_z' => 6.0,
        ],
        'terraza' => [
            'min_x' => -9.0,
            'max_x' => 9.0,
            'min_z' => 7.0,
            'max_z' => 14.0,
        ],
    ],

    'tables' => [
        'min_seats' => 1,
        'max_seats' => 12,
        'min_distance' => 3.0,
    ],

    'products' => [
        'max_price' => 1_000_000,
    ],

];
