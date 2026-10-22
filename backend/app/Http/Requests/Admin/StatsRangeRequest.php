<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;

class StatsRangeRequest extends DateRangeRequest
{
    public function fromDate(): Carbon
    {
        return $this->filled('from')
            ? $this->parseDate((string) $this->input('from'))
            : $this->toDate();
    }

    public function toDate(): Carbon
    {
        return $this->filled('to')
            ? $this->parseDate((string) $this->input('to'))
            : Carbon::now(config('app.timezone'))->startOfDay();
    }

    public function fromStart(): Carbon
    {
        return $this->fromDate()->startOfDay();
    }

    public function toEnd(): Carbon
    {
        return $this->toDate()->endOfDay();
    }
}
