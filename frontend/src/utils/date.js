const pad = (value) => String(value).padStart(2, '0');

export function toDateInputValue(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysAgo(days, from = new Date()) {
    const date = new Date(from);

    date.setDate(date.getDate() - days);

    return toDateInputValue(date);
}

export function formatDateTime(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(value) {
    if (!value) return '—';

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? `${value}T12:00:00`
        : value;
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatHour(hour) {
    const value = Number(hour);

    if (!Number.isInteger(value) || value < 0 || value > 23) return '—';

    return `${pad(value)}:00`;
}

export function formatMinutes(value) {
    const minutes = Number(value);

    if (!Number.isFinite(minutes) || minutes <= 0) return '—';

    if (minutes < 1) return '< 1 min';

    const rounded = Math.round(minutes);

    return `${rounded} min`;
}
