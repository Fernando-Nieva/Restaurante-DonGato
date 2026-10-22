<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;

class TopProductsRequest extends StatsRangeRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'limit' => ['sometimes', 'integer', 'min:1'],
        ]);
    }

    public function limit(): int
    {
        return (int) ($this->validated('limit') ?? 5);
    }
}
