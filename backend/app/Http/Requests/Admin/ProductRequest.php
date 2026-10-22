<?php

namespace App\Http\Requests\Admin;

use App\Enums\ProductCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
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
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('products', 'name')
                    ->where(fn (Builder $query): Builder => $query->where('category', $this->input('category')))
                    ->ignore($this->route('product')),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'category' => ['required', Rule::enum(ProductCategory::class)],
            'price' => [
                'required',
                'numeric',
                'gt:0',
                'decimal:0,2',
                'max:'.config('restaurant.products.max_price'),
            ],
            'is_available' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Normalize the availability flag before validation.
     */
    protected function prepareForValidation(): void
    {
        $value = $this->input('is_available');

        if (is_string($value) && in_array(strtolower($value), ['1', '0', 'true', 'false'], true)) {
            $this->merge(['is_available' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);
        }
    }

    /**
     * Get the custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'Ya existe un producto con ese nombre en la categoría seleccionada.',
            'price.decimal' => 'El precio puede tener como máximo 2 decimales.',
            'price.max' => 'El precio supera el máximo permitido.',
        ];
    }
}
