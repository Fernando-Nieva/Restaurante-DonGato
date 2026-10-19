<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('restaurant', fn (User $user): bool => true);

Broadcast::channel('kitchen', fn (User $user): bool => in_array($user->role, ['cocina', 'admin'], true));
