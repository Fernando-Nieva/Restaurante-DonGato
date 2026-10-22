<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class DateRangeRequest extends FormRequest
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
            'from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $from = $this->fromDate();
            $to = $this->toDate();

            if ($from === null || $to === null) {
                return;
            }

            if ($from->gt($to)) {
                $validator->errors()->add(
                    'from',
                    'La fecha desde no puede ser posterior a la fecha hasta.'
                );

                return;
            }

            if ($from->diffInDays($to) > 366) {
                $validator->errors()->add(
                    'from',
                    'El rango de fechas no puede superar los 366 días.'
                );
            }
        });
    }

    public function fromStart(): ?Carbon
    {
        return $this->fromDate()?->copy()->startOfDay();
    }

    public function toEnd(): ?Carbon
    {
        return $this->toDate()?->copy()->endOfDay();
    }

    public function fromDate(): ?Carbon
    {
        return $this->filled('from')
            ? $this->parseDate((string) $this->input('from'))
            : null;
    }

    public function toDate(): ?Carbon
    {
        return $this->filled('to')
            ? $this->parseDate((string) $this->input('to'))
            : null;
    }

    protected function parseDate(string $value): Carbon
    {
        return Carbon::createFromFormat(
            'Y-m-d',
            $value,
            config('app.timezone')
        )->startOfDay();
    }
}
