<?php

namespace App\Http\Requests\Admin;

use App\Enums\TableZone;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
        $tables = config('restaurant.tables');

        return [
            'number' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('tables', 'number')->ignore($this->route('table')),
            ],
            'seats' => ['required', 'integer', 'between:'.$tables['min_seats'].','.$tables['max_seats']],
            'zone' => [
                'required',
                Rule::in(array_map(
                    fn (TableZone $zone): string => $zone->value,
                    TableZone::cases(),
                )),
            ],
            'pos_x' => ['required', 'numeric'],
            'pos_z' => ['required', 'numeric'],
        ];
    }

    /**
     * Validate the coordinates against the selected zone.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $zoneValue = $this->input('zone');

            if (! is_string($zoneValue)) {
                return;
            }

            $zone = TableZone::tryFrom($zoneValue);

            if ($zone === null) {
                return;
            }

            $bounds = config("restaurant.zones.{$zone->value}");

            if (! is_array($bounds)) {
                return;
            }

            $posX = $this->input('pos_x');
            $posZ = $this->input('pos_z');

            if (is_numeric($posX)) {
                $this->validateAxis(
                    $validator,
                    'pos_x',
                    'X',
                    $zone,
                    (float) $posX,
                    $bounds['min_x'],
                    $bounds['max_x'],
                );
            }

            if (is_numeric($posZ)) {
                $this->validateAxis(
                    $validator,
                    'pos_z',
                    'Z',
                    $zone,
                    (float) $posZ,
                    $bounds['min_z'],
                    $bounds['max_z'],
                );
            }
        });
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
            'zone.required' => 'La zona es obligatoria.',
            'zone.in' => 'La zona indicada no es válida.',
        ];
    }

    private function validateAxis(
        Validator $validator,
        string $field,
        string $axis,
        TableZone $zone,
        float $value,
        float|int $min,
        float|int $max,
    ): void {
        if ($value >= (float) $min && $value <= (float) $max) {
            return;
        }

        $validator->errors()->add(
            $field,
            sprintf(
                'La posición %s está fuera de los límites de la zona %s (%s: %s a %s).',
                $axis,
                $zone->label(),
                $axis,
                $this->formatBound($min),
                $this->formatBound($max),
            ),
        );
    }

    private function formatBound(float|int $value): string
    {
        return sprintf('%g', (float) $value);
    }
}
