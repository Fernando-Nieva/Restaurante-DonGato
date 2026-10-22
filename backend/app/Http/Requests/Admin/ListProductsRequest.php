<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListProductsRequest extends FormRequest
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
            'category' => ['sometimes', Rule::enum(ProductCategory::class)],
            'available' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Normalize the availability filter before validation.
     */
    protected function prepareForValidation(): void
    {
        $value = $this->input('available');

        if (is_string($value) && in_array(strtolower($value), ['1', '0', 'true', 'false'], true)) {
            $this->merge(['available' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);
        }
    }
}
