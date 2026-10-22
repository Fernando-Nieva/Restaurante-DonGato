import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import SalesByHourChart from '../../components/admin/SalesByHourChart';
import styles from '../../components/admin/admin.module.css';
import { ORDER_STATUS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../constants/orderStatus';
import { getEcho, subscribeToEcho } from '../../lib/echo';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../services/api';
import { daysAgo, formatDate, formatMinutes, toDateInputValue } from '../../utils/date';
import { formatPrice } from '../../utils/formatPrice';

const PRESETS = [
    { value: 'today', label: 'Hoy' },
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: 'custom', label: 'Personalizado' },
];

const buildPresetRange = (preset) => {
    const to = toDateInputValue();

    if (preset === 'today') return { from: to, to };
    if (preset === '30d') return { from: daysAgo(29), to };

    return { from: daysAgo(6), to };
};

const INITIAL_RANGE = buildPresetRange('7d');
const LIVE_REFRESH_DELAY = 900;

export default function AdminDashboardPage() {
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [period, setPeriod] = useState('7d');
    const [range, setRange] = useState(INITIAL_RANGE);
    const [draftRange, setDraftRange] = useState(INITIAL_RANGE);
    const [rangeError, setRangeError] = useState('');
    const [summary, setSummary] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [waiters, setWaiters] = useState([]);
    const [hours, setHours] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const loadedRangeRef = useRef('');
    const liveTimerRef = useRef(null);

    useEffect(() => {
        let active = true;
        const rangeKey = `${range.from}|${range.to}`;
        const isBackgroundRefresh = loadedRangeRef.current === rangeKey;

        setError(null);

        if (isBackgroundRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
            setSummary(null);
            setTopProducts([]);
            setWaiters([]);
            setHours([]);
        }

        Promise.all([
            adminApi.getSummary(range),
            adminApi.getTopProducts({ ...range, limit: 5 }),
            adminApi.getByWaiter(range),
            adminApi.getSalesByHour({ date: range.to }),
        ])
            .then(([summaryPayload, topProductsPayload, waitersPayload, hoursPayload]) => {
                if (!active) return;

                loadedRangeRef.current = rangeKey;
                setSummary(summaryPayload ?? null);
                setTopProducts(Array.isArray(topProductsPayload?.data) ? topProductsPayload.data : []);
                setWaiters(Array.isArray(waitersPayload?.data) ? waitersPayload.data : []);
                setHours(Array.isArray(hoursPayload?.data) ? hoursPayload.data : []);
            })
            .catch((loadError) => {
                if (!active || loadError?.name === 'AbortError') return;

                console.error('No se pudieron cargar las estadísticas:', loadError);

                if (!isBackgroundRefresh) setError(loadError);
            })
            .finally(() => {
                if (!active) return;

                setLoading(false);
                setRefreshing(false);
            });

        return () => {
            active = false;
        };
    }, [range, reloadKey]);

    useEffect(() => {
        if (!echo) return undefined;

        const channel = echo.private('restaurant');

        const scheduleRefresh = () => {
            if (liveTimerRef.current) clearTimeout(liveTimerRef.current);

            liveTimerRef.current = setTimeout(() => {
                liveTimerRef.current = null;
                setReloadKey((key) => key + 1);
            }, LIVE_REFRESH_DELAY);
        };

        const handleOrderCreated = () => scheduleRefresh();

        const handleOrderStatusUpdated = (payload) => {
            if (String(payload?.status ?? '').toLowerCase() === ORDER_STATUS.Entregado) {
                scheduleRefresh();
            }
        };

        channel.listen('OrderCreated', handleOrderCreated);
        channel.listen('OrderStatusUpdated', handleOrderStatusUpdated);

        return () => {
            if (liveTimerRef.current) {
                clearTimeout(liveTimerRef.current);
                liveTimerRef.current = null;
            }

            channel.stopListening('OrderCreated', handleOrderCreated);
            channel.stopListening('OrderStatusUpdated', handleOrderStatusUpdated);
        };
    }, [echo]);

    const maxTopQuantity = useMemo(
        () => Math.max(...topProducts.map((product) => Number(product.quantity ?? 0)), 1),
        [topProducts],
    );

    const hasHourlySales = hours.some((hour) => Number(hour.total_sales ?? 0) > 0);
    const statusCounts = summary?.orders_by_status ?? {};
    const totalOrders = Number(summary?.total_orders ?? 0);
    const deliveredOrders = Number(summary?.delivered_orders ?? 0);

    const applyPreset = (preset) => {
        const next = buildPresetRange(preset);

        setPeriod(preset);
        setDraftRange(next);
        setRange(next);
        setRangeError('');
    };

    const selectCustomPeriod = () => {
        setPeriod('custom');
        setDraftRange(range);
        setRangeError('');
    };

    const applyRange = (event) => {
        event.preventDefault();

        if (!draftRange.from || !draftRange.to) {
            setRangeError('Seleccioná las dos fechas del período.');
            return;
        }

        if (draftRange.from > draftRange.to) {
            setRangeError('La fecha desde no puede ser posterior a la fecha hasta.');
            return;
        }

        const from = new Date(`${draftRange.from}T12:00:00`);
        const to = new Date(`${draftRange.to}T12:00:00`);
        const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);

        if (days > 366) {
            setRangeError('El rango no puede superar los 366 días.');
            return;
        }

        setRangeError('');
        setPeriod('custom');
        setRange({ ...draftRange });
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Panel</h1>
                    <p className={styles.subtitle}>
                        Resumen de operación y ventas del restaurante.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    {refreshing && (
                        <span className={styles.refreshHint} aria-live="polite">
                            Actualizando…
                        </span>
                    )}
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setReloadKey((key) => key + 1)}
                        disabled={loading || refreshing}
                    >
                        Actualizar
                    </button>
                </div>
            </header>

            <form className={`${styles.toolbar} ${styles.periodToolbar}`} onSubmit={applyRange}>
                <div className={styles.periodSelector} role="group" aria-label="Período">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            className={`${styles.periodButton} ${
                                period === preset.value ? styles.periodButtonActive : ''
                            }`}
                            aria-pressed={period === preset.value}
                            onClick={() =>
                                preset.value === 'custom'
                                    ? selectCustomPeriod()
                                    : applyPreset(preset.value)
                            }
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {period === 'custom' ? (
                    <>
                        <div className={styles.field}>
                            <label htmlFor="stats-from">Desde</label>
                            <input
                                id="stats-from"
                                type="date"
                                className={styles.input}
                                value={draftRange.from}
                                max={draftRange.to || undefined}
                                onChange={(event) =>
                                    setDraftRange((current) => ({
                                        ...current,
                                        from: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="stats-to">Hasta</label>
                            <input
                                id="stats-to"
                                type="date"
                                className={styles.input}
                                value={draftRange.to}
                                min={draftRange.from || undefined}
                                max={toDateInputValue()}
                                onChange={(event) =>
                                    setDraftRange((current) => ({
                                        ...current,
                                        to: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className={styles.filterActions}>
                            <button type="submit" className={styles.buttonPrimary}>
                                Aplicar
                            </button>
                        </div>
                    </>
                ) : (
                    <p className={styles.periodSummary}>
                        {formatDate(range.from)} al {formatDate(range.to)}
                    </p>
                )}

                {rangeError && (
                    <p className={`${styles.fieldError} ${styles.formSpanAll}`} role="alert">
                        {rangeError}
                    </p>
                )}
            </form>

            {loading && <PageLoader label="Calculando estadísticas…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar el panel"
                    message={getApiErrorMessage(error)}
                    onRetry={() => setReloadKey((key) => key + 1)}
                />
            )}

            {!loading && !error && summary && (
                <>
                    <section className={styles.statGrid} aria-label="Resumen de ventas">
                        <article className={styles.statCard}>
                            <p className={styles.statLabel}>Ventas totales</p>
                            <p className={styles.statValue}>{formatPrice(summary.total_sales)}</p>
                            <p className={styles.statHint}>
                                {formatDate(summary.from)} al {formatDate(summary.to)}
                            </p>
                        </article>

                        <article className={styles.statCard}>
                            <p className={styles.statLabel}>Pedidos</p>
                            <p className={styles.statValue}>{totalOrders}</p>
                            <p className={styles.statHint}>{deliveredOrders} entregados</p>
                        </article>

                        <article className={styles.statCard}>
                            <p className={styles.statLabel}>Ticket promedio</p>
                            <p className={styles.statValue}>
                                {formatPrice(summary.average_ticket)}
                            </p>
                            <p className={styles.statHint}>Sobre pedidos entregados</p>
                        </article>

                        <article className={styles.statCard}>
                            <p className={styles.statLabel}>Tiempo de preparación</p>
                            <p className={styles.statValue}>
                                {formatMinutes(summary.average_preparation_minutes)}
                            </p>
                            <p className={styles.statHint}>Promedio hasta estar listo</p>
                        </article>

                        <article className={styles.statCard}>
                            <p className={styles.statLabel}>Tiempo de entrega</p>
                            <p className={styles.statValue}>
                                {formatMinutes(summary.average_delivery_minutes)}
                            </p>
                            <p className={styles.statHint}>Promedio de listo a mesa</p>
                        </article>
                    </section>

                    {totalOrders === 0 ? (
                        <AdminEmptyState
                            title="Todavía no hay pedidos en este período"
                            message="Cuando se registren pedidos vas a ver acá las ventas, los tiempos y el rendimiento del equipo."
                            action={
                                <button
                                    type="button"
                                    className={styles.buttonSecondary}
                                    onClick={() => applyPreset('7d')}
                                >
                                    Ver últimos 7 días
                                </button>
                            }
                            showDevSeed
                        />
                    ) : (
                        <>
                            <section className={styles.panel}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h2 className={styles.sectionTitle}>Ventas por hora</h2>
                                        <p className={styles.sectionHint}>
                                            Pedidos entregados el {formatDate(range.to)}. Pasá el
                                            cursor o tocá una barra para ver el detalle.
                                        </p>
                                    </div>
                                </div>

                                {hasHourlySales ? (
                                    <SalesByHourChart hours={hours} />
                                ) : (
                                    <p className={styles.muted}>
                                        Todavía no hay ventas entregadas para esa fecha.
                                    </p>
                                )}
                            </section>

                            <div className={styles.splitGrid}>
                                <section className={styles.panel}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <h2 className={styles.sectionTitle}>Más vendidos</h2>
                                            <p className={styles.sectionHint}>
                                                Ranking por unidades en pedidos entregados.
                                            </p>
                                        </div>
                                    </div>

                                    {topProducts.length === 0 ? (
                                        <p className={styles.muted}>
                                            Todavía no hay ventas entregadas en este período.
                                        </p>
                                    ) : (
                                        <ol className={styles.rankList}>
                                            {topProducts.map((product, index) => (
                                                <li
                                                    key={product.product_id ?? product.name}
                                                    className={styles.rankRow}
                                                >
                                                    <span className={styles.rankPosition}>
                                                        {index + 1}
                                                    </span>
                                                    <div className={styles.rankInfo}>
                                                        <div className={styles.rankNameRow}>
                                                            <span className={styles.rankName}>
                                                                {product.name}
                                                            </span>
                                                            <span className={styles.rankMeta}>
                                                                {product.quantity} unidades
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={styles.rankBarTrack}
                                                            aria-hidden="true"
                                                        >
                                                            <span
                                                                className={styles.rankBarFill}
                                                                style={{
                                                                    width: `${Math.max(
                                                                        (Number(product.quantity) /
                                                                            maxTopQuantity) *
                                                                            100,
                                                                        4,
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </span>
                                                    </div>
                                                    <span className={styles.rankValue}>
                                                        {formatPrice(product.total_sales)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </section>

                                <section className={styles.panel}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <h2 className={styles.sectionTitle}>Pedidos por estado</h2>
                                            <p className={styles.sectionHint}>
                                                Pedidos creados dentro del período.
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.statusGrid}>
                                        {Object.values(ORDER_STATUS).map((status) => (
                                            <div key={status} className={styles.statusItem}>
                                                <span
                                                    className={styles.badgeDot}
                                                    style={{
                                                        '--badge-color':
                                                            ORDER_STATUS_COLORS[status],
                                                    }}
                                                    aria-hidden="true"
                                                />
                                                <span className={styles.statusItemName}>
                                                    {ORDER_STATUS_LABELS[status]}
                                                </span>
                                                <span className={styles.statusItemValue}>
                                                    {statusCounts[status] ?? 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <section className={styles.panel}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h2 className={styles.sectionTitle}>
                                            Rendimiento por mozo
                                        </h2>
                                        <p className={styles.sectionHint}>
                                            Pedidos creados y ventas entregadas en el período.
                                        </p>
                                    </div>
                                </div>

                                {waiters.length === 0 ? (
                                    <p className={styles.muted}>Sin actividad de mozos en el período.</p>
                                ) : (
                                    <div className={styles.tableScroll}>
                                        <table
                                            className={`${styles.table} ${styles.waiterTable}`}
                                        >
                                            <thead>
                                                <tr>
                                                    <th scope="col">Mozo</th>
                                                    <th scope="col">Pedidos</th>
                                                    <th scope="col">Ventas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {waiters.map((waiter) => (
                                                    <tr key={waiter.user_id}>
                                                        <td>
                                                            <span className={styles.cellStrong}>
                                                                {waiter.name}
                                                            </span>
                                                        </td>
                                                        <td>{waiter.orders_count}</td>
                                                        <td>
                                                            <span className={styles.price}>
                                                                {formatPrice(waiter.total_sales)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
