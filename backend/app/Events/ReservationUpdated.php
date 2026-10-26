<?php

namespace App\Events;

use App\Http\Resources\ReservationSummaryResource;
use App\Models\Reservation;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReservationUpdated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Reservation $reservation,
        public string $tableStatus,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('restaurant'),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'table_id' => $this->reservation->table_id,
            'table_status' => $this->tableStatus,
            'reservation' => (new ReservationSummaryResource($this->reservation))->resolve(),
        ];
    }
}
