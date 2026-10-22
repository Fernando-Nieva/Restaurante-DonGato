<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserActiveRequest extends FormRequest
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
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * Normalize the activation flag before validation.
     */
    protected function prepareForValidation(): void
    {
        $value = $this->input('is_active');

        if (is_string($value) && in_array(strtolower($value), ['1', '0', 'true', 'false'], true)) {
            $this->merge(['is_active' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);
        }
    }
}
