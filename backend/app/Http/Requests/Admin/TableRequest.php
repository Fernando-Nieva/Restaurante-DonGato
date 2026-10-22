<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TableRequest extends FormRequest
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
        $room = config('restaurant.room');
        $tables = config('restaurant.tables');

        return [
            'number' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('tables', 'number')->ignore($this->route('table')),
            ],
            'seats' => ['required', 'integer', 'between:'.$tables['min_seats'].','.$tables['max_seats']],
            'pos_x' => ['required', 'numeric', 'between:'.$room['min_x'].','.$room['max_x']],
            'pos_z' => ['required', 'numeric', 'between:'.$room['min_z'].','.$room['max_z']],
        ];
    }

    /**
     * Get the custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'number.unique' => 'Ya existe una mesa con ese número.',
            'seats.between' => 'La mesa debe tener entre 1 y 12 asientos.',
            'pos_x.between' => 'La posición X está fuera de los límites del salón.',
            'pos_z.between' => 'La posición Z está fuera de los límites del salón.',
        ];
    }
}
