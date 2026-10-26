import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../services/adminApi';
import { getApiErrorMessage, getFieldError } from '../services/api';
import { toDateInputValue } from '../utils/date';
import styles from './admin/admin.module.css';

const pad = (value) => String(value).padStart(2, '0');

const toDateTimeLocal = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours(),
    )}:${pad(date.getMinutes())}`;

const toLocalInput = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return toDateTimeLocal(date);
};

const defaultReservedFor = (defaultDate) => {
    if (defaultDate && defaultDate !== toDateInputValue()) {
        return `${defaultDate}T21:00`;
    }

    const date = new Date(Date.now() + 30 * 60000);

    date.setSeconds(0, 0);

    return toDateTimeLocal(date);
};

const buildInitialForm = (reservation, defaultTableId, defaultDate) => ({
    table_id:
        reservation?.table_id != null
            ? String(reservation.table_id)
            : defaultTableId != null
              ? String(defaultTableId)
              : '',
    customer_name: reservation?.customer_name ?? '',
    party_size: reservation?.party_size != null ? String(reservation.party_size) : '',
    phone: reservation?.phone ?? '',
    reserved_for: reservation
        ? toLocalInput(reservation.reserved_for)
        : defaultReservedFor(defaultDate),
    notes: reservation?.notes ?? '',
});

const formatTime = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export default function ReservationForm({
    table = null,
    tables = null,
    reservation = null,
    formId = 'reservation-form',
    defaultDate,
    onSaved,
    onBusyChange,
}) {
    const hasTableSelector = Array.isArray(tables);
    const defaultTableId =
        table?.id ?? (hasTableSelector && tables.length === 1 ? tables[0].id : '');
    const [form, setForm] = useState(() =>
        buildInitialForm(reservation, defaultTableId, defaultDate),
    );
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    const selectedTable = useMemo(() => {
        if (!hasTableSelector) return table;

        return (
            tables.find((candidate) => String(candidate.id) === String(form.table_id)) ??
            null
        );
    }, [form.table_id, hasTableSelector, table, tables]);

    const seats = Math.max(1, Number(selectedTable?.seats) || 1);
    const tableNumber =
        selectedTable?.number ?? selectedTable?.name ?? selectedTable?.id ?? '';

    useEffect(() => {
        setForm(buildInitialForm(reservation, defaultTableId, defaultDate));
        setFieldErrors({});
        setFormError('');
    }, [defaultDate, defaultTableId, reservation?.id]);

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({
            ...current,
            [field]: undefined,
            ...(field === 'table_id' ? { party_size: undefined } : {}),
        }));
        setFormError('');
    };

    const applyShortcut = (minutes) => {
        const date = new Date(Date.now() + minutes * 60000);

        date.setSeconds(0, 0);
        updateField('reserved_for', toDateTimeLocal(date));
    };

    const validate = () => {
        const errors = {};
        const name = form.customer_name.trim();
        const partySize = Number(form.party_size);
        const reservedFor = new Date(form.reserved_for);

        if (hasTableSelector && !selectedTable) {
            errors.table_id = 'Seleccioná una mesa.';
        }

        if (!name) {
            errors.customer_name = 'Ingresá el nombre del cliente.';
        } else if (name.length > 255) {
            errors.customer_name = 'El nombre no puede superar los 255 caracteres.';
        }

        if (!Number.isInteger(partySize) || partySize < 1) {
            errors.party_size = 'Ingresá al menos una persona.';
        } else if (selectedTable && partySize > seats) {
            errors.party_size = `La mesa tiene ${seats} asiento${seats === 1 ? '' : 's'}.`;
        }

        if (!form.reserved_for || Number.isNaN(reservedFor.getTime())) {
            errors.reserved_for = 'Ingresá una fecha y hora válidas.';
        } else if (reservedFor.getTime() < Date.now() - 5 * 60000) {
            errors.reserved_for = 'La reserva no puede ser en el pasado.';
        }

        if (form.phone.trim().length > 30) {
            errors.phone = 'El teléfono no puede superar los 30 caracteres.';
        }

        if (form.notes.trim().length > 500) {
            errors.notes = 'Las notas no pueden superar los 500 caracteres.';
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const setBusy = (value) => {
        setSaving(value);
        onBusyChange?.(value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        setFormError('');

        if (!validate()) return;

        const payload = {
            table_id: selectedTable?.id ?? table?.id,
            customer_name: form.customer_name.trim(),
            party_size: Number(form.party_size),
            phone: form.phone.trim() || null,
            reserved_for: new Date(form.reserved_for).toISOString(),
            notes: form.notes.trim() || null,
        };

        setBusy(true);

        try {
            const saved = reservation
                ? await adminApi.updateReservation(reservation.id, payload)
                : await adminApi.createReservation(payload);

            const tablePrefix = tableNumber ? `Mesa ${tableNumber} · ` : '';

            addToast({
                type: 'success',
                title: reservation ? 'Reserva actualizada' : 'Reserva creada',
                message: `${tablePrefix}${payload.customer_name} · ${formatTime(
                    payload.reserved_for,
                )}`,
            });

            onSaved?.(saved);
        } catch (error) {
            const tableError = getFieldError(error, 'table_id');
            const generalError =
                getFieldError(error, 'reservation') ??
                (hasTableSelector ? null : tableError);
            const errors = {
                ...(hasTableSelector ? { table_id: tableError ?? undefined } : {}),
                customer_name: getFieldError(error, 'customer_name') ?? undefined,
                party_size: getFieldError(error, 'party_size') ?? undefined,
                phone: getFieldError(error, 'phone') ?? undefined,
                reserved_for: getFieldError(error, 'reserved_for') ?? undefined,
                notes: getFieldError(error, 'notes') ?? undefined,
            };
            const fieldMessages = Object.values(errors).filter(Boolean);
            const hasFieldErrors = fieldMessages.length > 0;

            setFieldErrors(errors);

            const message =
                generalError ??
                fieldMessages[0] ??
                getApiErrorMessage(error, 'No se pudo guardar la reserva.');

            if (generalError || !hasFieldErrors) {
                setFormError(message);
            }

            addToast({
                type: 'error',
                title: 'No se pudo guardar la reserva',
                message,
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
            {formError && (
                <p className={styles.formError} role="alert">
                    {formError}
                </p>
            )}

            <div className={styles.formGrid}>
                {hasTableSelector && (
                    <div className={styles.field}>
                        <label htmlFor={`${formId}-table`}>Mesa</label>
                        <select
                            id={`${formId}-table`}
                            className={styles.select}
                            value={form.table_id}
                            aria-invalid={Boolean(fieldErrors.table_id)}
                            onChange={(event) => updateField('table_id', event.target.value)}
                        >
                            <option value="">Seleccioná una mesa</option>
                            {tables.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    Mesa {candidate.number} · {candidate.seats} asiento
                                    {candidate.seats === 1 ? '' : 's'}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.table_id ? (
                            <p className={styles.fieldError}>{fieldErrors.table_id}</p>
                        ) : (
                            <p className={styles.help}>
                                {tables.length === 0
                                    ? 'No hay mesas activas disponibles.'
                                    : 'Solo se muestran mesas activas.'}
                            </p>
                        )}
                    </div>
                )}

                <div className={styles.field}>
                    <label htmlFor={`${formId}-name`}>Nombre del cliente</label>
                    <input
                        id={`${formId}-name`}
                        type="text"
                        className={styles.input}
                        value={form.customer_name}
                        maxLength={255}
                        autoComplete="name"
                        aria-invalid={Boolean(fieldErrors.customer_name)}
                        onChange={(event) => updateField('customer_name', event.target.value)}
                        placeholder="Ej. Ana García"
                    />
                    {fieldErrors.customer_name && (
                        <p className={styles.fieldError}>{fieldErrors.customer_name}</p>
                    )}
                </div>

                <div className={styles.field}>
                    <label htmlFor={`${formId}-party`}>Personas</label>
                    <input
                        id={`${formId}-party`}
                        type="number"
                        className={styles.input}
                        value={form.party_size}
                        min="1"
                        max={selectedTable ? seats : undefined}
                        step="1"
                        inputMode="numeric"
                        aria-invalid={Boolean(fieldErrors.party_size)}
                        onChange={(event) => updateField('party_size', event.target.value)}
                        placeholder="2"
                    />
                    {fieldErrors.party_size ? (
                        <p className={styles.fieldError}>{fieldErrors.party_size}</p>
                    ) : (
                        <p className={styles.help}>
                            {selectedTable
                                ? `Hasta ${seats} persona${seats === 1 ? '' : 's'}.`
                                : 'Elegí una mesa para validar los asientos.'}
                        </p>
                    )}
                </div>

                <div className={styles.field}>
                    <label htmlFor={`${formId}-phone`}>Teléfono (opcional)</label>
                    <input
                        id={`${formId}-phone`}
                        type="tel"
                        className={styles.input}
                        value={form.phone}
                        maxLength={30}
                        autoComplete="tel"
                        aria-invalid={Boolean(fieldErrors.phone)}
                        onChange={(event) => updateField('phone', event.target.value)}
                        placeholder="Ej. 11 5555 1234"
                    />
                    {fieldErrors.phone && (
                        <p className={styles.fieldError}>{fieldErrors.phone}</p>
                    )}
                </div>

                <div className={styles.field}>
                    <label htmlFor={`${formId}-time`}>Fecha y hora</label>
                    <input
                        id={`${formId}-time`}
                        type="datetime-local"
                        className={styles.input}
                        value={form.reserved_for}
                        step="300"
                        aria-invalid={Boolean(fieldErrors.reserved_for)}
                        onChange={(event) => updateField('reserved_for', event.target.value)}
                    />
                    <div className={styles.shortcuts}>
                        <button
                            type="button"
                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                            onClick={() => applyShortcut(0)}
                        >
                            Ahora
                        </button>
                        <button
                            type="button"
                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                            onClick={() => applyShortcut(30)}
                        >
                            En 30 min
                        </button>
                        <button
                            type="button"
                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                            onClick={() => applyShortcut(60)}
                        >
                            En 1 h
                        </button>
                    </div>
                    {fieldErrors.reserved_for && (
                        <p className={styles.fieldError}>{fieldErrors.reserved_for}</p>
                    )}
                </div>

                <div className={`${styles.field} ${styles.formSpanAll}`}>
                    <label htmlFor={`${formId}-notes`}>Notas (opcional)</label>
                    <textarea
                        id={`${formId}-notes`}
                        className={styles.textarea}
                        rows={3}
                        value={form.notes}
                        maxLength={500}
                        aria-invalid={Boolean(fieldErrors.notes)}
                        onChange={(event) => updateField('notes', event.target.value)}
                        placeholder="Ej. cumpleaños, junto a la ventana"
                    />
                    {fieldErrors.notes ? (
                        <p className={styles.fieldError}>{fieldErrors.notes}</p>
                    ) : (
                        <p className={styles.help}>Máximo 500 caracteres.</p>
                    )}
                </div>
            </div>

            {saving && (
                <p className={styles.loadingLine} role="status">
                    <span className={styles.spinner} aria-hidden="true" />
                    Guardando reserva…
                </p>
            )}
        </form>
    );
}
