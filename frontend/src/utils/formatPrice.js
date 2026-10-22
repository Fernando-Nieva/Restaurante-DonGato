const PRICE_LOCALE = 'es-AR';
const PRICE_CURRENCY = 'ARS';

const wholePriceFormatter = new Intl.NumberFormat(PRICE_LOCALE, {
    style: 'currency',
    currency: PRICE_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const centsPriceFormatter = new Intl.NumberFormat(PRICE_LOCALE, {
    style: 'currency',
    currency: PRICE_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatPrice(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value !== 'number' && typeof value !== 'string') return '—';
    if (typeof value === 'string' && value.trim() === '') return '—';

    const amount = Number(value);

    if (!Number.isFinite(amount)) return '—';

    const cents = Math.round(Math.abs(amount) * 100);
    const hasCents = cents % 100 !== 0;

    return (hasCents ? centsPriceFormatter : wholePriceFormatter).format(amount);
}
