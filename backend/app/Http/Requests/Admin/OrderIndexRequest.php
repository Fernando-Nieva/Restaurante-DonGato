<?php

namespace App\Http\Requests\Admin;

use App\Enums\OrderStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class OrderIndexRequest extends DateRangeRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'table_id' => ['sometimes', 'integer', 'min:1'],
            'user_id' => ['sometimes', 'integer', 'min:1'],
        ]);
    }
}
