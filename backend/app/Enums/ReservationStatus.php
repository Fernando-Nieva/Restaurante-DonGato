<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case Activa = 'activa';
    case Sentada = 'sentada';
    case Cancelada = 'cancelada';
    case Vencida = 'vencida';
}
