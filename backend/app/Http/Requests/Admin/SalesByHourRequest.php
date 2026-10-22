<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SalesByHourRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    public function reportDate(): Carbon
    {
        $timezone = config('app.timezone');

        if ($this->filled('date')) {
            return Carbon::createFromFormat(
                'Y-m-d',
                (string) $this->input('date'),
                $timezone
            )->startOfDay();
        }

        return Carbon::now($timezone)->startOfDay();
    }
}
