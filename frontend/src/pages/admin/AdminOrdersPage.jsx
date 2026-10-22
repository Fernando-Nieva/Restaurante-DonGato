import { Fragment, useEffect, useState } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import styles from '../../components/admin/admin.module.css';
import { ORDER_STATUS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../constants/orderStatus';
import { useToast } from '../../context/ToastContext';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../services/api';
import { daysAgo, formatDateTime, toDateInputValue } from '../../utils/date';
import { formatPrice } from '../../utils/formatPrice';

const INITIAL_FILTERS = {
    from: daysAgo(6),
    to: toDateInputValue(),
    status: '',
    table_id: '',
    user_id: '',
};

const CSV_LIMIT = 1000;

const TIMELINE_FIELDS = [
    {
        key: 'created_at',
        label: 'Pedido creado',
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Pendiente],
    },
    {
        key: 'preparing_at',
        label: 'En preparación',
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Preparando],
    },
    {
        key: 'ready_at',
        label: 'Listo para entregar',
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Listo],
    },
    {
        key: 'delivered_at',
        label: 'Entregado',
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Entregado],
    },
    {
        key: 'cancelled_at',
        label: 'Cancelado',
        color: ORDER_STATUS_COLORS[ORDER_STATUS.Cancelado],
    },
];

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const statusLabel = (status) =>
    ORDER_STATUS_LABELS[normalizeStatus(status)] ?? String(status ?? 'Sin estado');

const statusColor = (status) =>
    ORDER_STATUS_COLORS[normalizeStatus(status)] ?? 'var(--color-muted)';

const tableLabel = (order) =>
    order.table?.number != null ? `Mesa ${order.table.number}` : `Mesa ${order.table_id}`;

const userLabel = (order) => order.user?.name ?? `Usuario ${order.user_id}`;

const detailPanelId = (orderId, variant) => `order-detail-${variant}-${orderId}`;

const hasActiveFilters = (filters) =>
    Boolean(filters.status || filters.table_id || filters.user_id) ||
    filters.from !== INITIAL_FILTERS.from ||
    filters.to !== INITIAL_FILTERS.to;

const buildQueryFilters = (filters, page) => {
    const query = {};

    if (page != null) query.page = page;
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
    if (filters.status) query.status = filters.status;
    if (filters.table_id) query.table_id = Number(filters.table_id);
    if (filters.user_id) query.user_id = Number(filters.user_id);

    return query;
};

const csvCell = (value) => {
    const text = String(value ?? '');
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

    return /[;"\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
};

const downloadCsv = (content, filename) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function OrderDetailContent({ order }) {
    const timeline = TIMELINE_FIELDS.map((field) => ({
        ...field,
        value: order[field.key],
    })).filter((event) => Boolean(event.value));

    return (
        <div className={styles.detailGrid}>
            <div className={styles.detailBlock}>
                <h3 className={styles.detailTitle}>Ítems del pedido</h3>

                {(order.items ?? []).length === 0 ? (
                    <p className={styles.muted}>Sin ítems registrados.</p>
                ) : (
                    <ul className={styles.detailItems}>
                        {(order.items ?? []).map((item) => (
                            <li key={item.id} className={styles.detailItem}>
                                <span className={styles.detailQuantity}>{item.quantity}×</span>
                                <span className={styles.detailProduct}>
                                    <span>{item.product?.name ?? 'Producto'}</span>
                                    {item.notes && (
                                        <span className={styles.detailItemNotes}>
                                            {item.notes}
                                        </span>
                                    )}
                                </span>
                                <span className={styles.detailItemPrice}>
                                    {formatPrice(Number(item.unit_price) * item.quantity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {order.notes && (
                    <div className={styles.detailNotes}>
                        <strong>Notas del pedido:</strong> {order.notes}
                    </div>
                )}
            </div>

            <div className={styles.detailBlock}>
                <h3 className={styles.detailTitle}>Ciclo del pedido</h3>

                <ol className={styles.timeline}>
                    {timeline.map((event) => (
                        <li
                            key={event.key}
                            className={styles.timelineItem}
                            style={{ '--timeline-color': event.color }}
                        >
                            <span className={styles.timelineDot} aria-hidden="true" />
                            <span className={styles.timelineLabel}>{event.label}</span>
                            <time className={styles.timelineTime} dateTime={event.value}>
                                {formatDateTime(event.value)}
                            </time>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

export default function AdminOrdersPage() {
    const { addToast } = useToast();
    const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [page, setPage] = useState(1);
    const [filterError, setFilterError] = useState('');
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [tables, setTables] = useState([]);
    const [users, setUsers] = useState([]);
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        let active = true;

        Promise.allSettled([adminApi.listTables(), adminApi.listUsers()]).then(
            ([tablesResult, usersResult]) => {
                if (!active) return;

                if (tablesResult.status === 'fulfilled') {
                    setTables(tablesResult.value);
                } else {
                    console.error(
                        'No se pudieron cargar las mesas para el filtro:',
                        tablesResult.reason,
                    );
                }

                if (usersResult.status === 'fulfilled') {
                    setUsers(usersResult.value);
                } else {
                    console.error(
                        'No se pudieron cargar los usuarios para el filtro:',
                        usersResult.reason,
                    );
                }
            },
        );

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError(null);

        adminApi
            .listOrders(buildQueryFilters(filters, page))
            .then((payload) => {
                if (!active) return;

                setOrders(Array.isArray(payload?.data) ? payload.data : []);
                setMeta(payload?.meta ?? null);
            })
            .catch((loadError) => {
                if (active) {
                    console.error('No se pudo cargar el historial de pedidos:', loadError);
                    setError(loadError);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [filters, page, reloadKey]);

    const currentPage = Number(meta?.current_page ?? page);
    const lastPage = Math.max(Number(meta?.last_page ?? 1), 1);
    const totalOrders = Number(meta?.total ?? orders.length);
    const pageSize = Math.max(Number(meta?.per_page ?? 20), 1);
    const filtered = hasActiveFilters(filters);

    const toggleOrder = (orderId) => {
        setExpandedIds((previous) => {
            const next = new Set(previous);

            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }

            return next;
        });
    };

    const goToPage = (nextPage) => {
        setExpandedIds(new Set());
        setPage(nextPage);
    };

    const applyFilters = (event) => {
        event.preventDefault();

        if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
            setFilterError('La fecha desde no puede ser posterior a la fecha hasta.');
            return;
        }

        if (draftFilters.from && draftFilters.to) {
            const from = new Date(`${draftFilters.from}T12:00:00`);
            const to = new Date(`${draftFilters.to}T12:00:00`);
            const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);

            if (days > 366) {
                setFilterError('El rango no puede superar los 366 días.');
                return;
            }
        }

        setFilterError('');
        setExpandedIds(new Set());
        setPage(1);
        setFilters({ ...draftFilters });
    };

    const clearFilters = () => {
        setDraftFilters(INITIAL_FILTERS);
        setFilters(INITIAL_FILTERS);
        setFilterError('');
        setExpandedIds(new Set());
        setPage(1);
    };

    const viewLast30Days = () => {
        const nextFilters = { ...INITIAL_FILTERS, from: daysAgo(29) };

        setDraftFilters(nextFilters);
        setFilters(nextFilters);
        setFilterError('');
        setExpandedIds(new Set());
        setPage(1);
    };

    const exportOrders = async () => {
        if (exporting || totalOrders === 0) return;

        setExporting(true);

        const exportLimit = Math.min(totalOrders, CSV_LIMIT);

        if (totalOrders > CSV_LIMIT) {
            addToast({
                type: 'info',
                title: 'Exportación limitada',
                message: `Se exportarán los primeros ${CSV_LIMIT} de ${totalOrders} pedidos.`,
            });
        }

        try {
            const pagesToFetch = Math.ceil(exportLimit / pageSize);
            const rows = [];

            for (let exportPage = 1; exportPage <= pagesToFetch; exportPage += 1) {
                const payload = await adminApi.listOrders(
                    buildQueryFilters(filters, exportPage),
                );

                rows.push(...(Array.isArray(payload?.data) ? payload.data : []));

                if (rows.length >= CSV_LIMIT) break;
            }

            const exportRows = rows.slice(0, exportLimit);
            const headers = [
                'Pedido',
                'Fecha',
                'Mesa',
                'Mozo',
                'Estado',
                'Ítems',
                'Notas',
                'Total',
            ];
            const lines = exportRows.map((order) => {
                const items = (order.items ?? [])
                    .map((item) => {
                        const notes = item.notes ? ` (${item.notes})` : '';

                        return `${item.quantity}× ${item.product?.name ?? 'Producto'}${notes}`;
                    })
                    .join(' | ');

                return [
                    order.id,
                    formatDateTime(order.created_at),
                    tableLabel(order),
                    userLabel(order),
                    statusLabel(order.status),
                    items,
                    order.notes ?? '',
                    formatPrice(order.total),
                ]
                    .map(csvCell)
                    .join(';');
            });
            const csv = [headers.map(csvCell).join(';'), ...lines].join('\r\n');
            const filename = `pedidos-${filters.from || 'inicio'}-a-${filters.to || 'hoy'}.csv`;

            downloadCsv(csv, filename);
            addToast({
                type: 'success',
                title: 'CSV exportado',
                message: `Se exportaron ${exportRows.length} pedidos.`,
            });
        } catch (exportError) {
            console.error('No se pudo exportar el historial de pedidos:', exportError);
            addToast({
                type: 'error',
                title: 'No se pudo exportar',
                message: getApiErrorMessage(exportError),
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Pedidos</h1>
                    <p className={styles.subtitle}>
                        Consultá el historial completo, ampliá cada pedido y exportá el período.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={exportOrders}
                        disabled={exporting || loading || Boolean(error) || totalOrders === 0}
                    >
                        {exporting ? 'Exportando…' : 'Exportar CSV'}
                    </button>
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setReloadKey((key) => key + 1)}
                        disabled={loading}
                    >
                        Actualizar
                    </button>
                </div>
            </header>

            <form className={styles.toolbar} onSubmit={applyFilters}>
                <div className={styles.filters}>
                    <div className={styles.field}>
                        <label htmlFor="orders-from">Desde</label>
                        <input
                            id="orders-from"
                            type="date"
                            className={styles.input}
                            value={draftFilters.from}
                            max={draftFilters.to || undefined}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    from: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="orders-to">Hasta</label>
                        <input
                            id="orders-to"
                            type="date"
                            className={styles.input}
                            value={draftFilters.to}
                            min={draftFilters.from || undefined}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    to: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="orders-status">Estado</label>
                        <select
                            id="orders-status"
                            className={styles.select}
                            value={draftFilters.status}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))
                            }
                        >
                            <option value="">Todos</option>
                            {Object.values(ORDER_STATUS).map((status) => (
                                <option key={status} value={status}>
                                    {ORDER_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="orders-table">Mesa</label>
                        <select
                            id="orders-table"
                            className={styles.select}
                            value={draftFilters.table_id}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    table_id: event.target.value,
                                }))
                            }
                        >
                            <option value="">Todas</option>
                            {tables.map((table) => (
                                <option key={table.id} value={table.id}>
                                    Mesa {table.number}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="orders-user">Mozo</label>
                        <select
                            id="orders-user"
                            className={styles.select}
                            value={draftFilters.user_id}
                            onChange={(event) =>
                                setDraftFilters((current) => ({
                                    ...current,
                                    user_id: event.target.value,
                                }))
                            }
                        >
                            <option value="">Todos</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.filterActions}>
                    <button type="button" className={styles.buttonGhost} onClick={clearFilters}>
                        Limpiar
                    </button>
                    <button type="submit" className={styles.buttonPrimary}>
                        Filtrar
                    </button>
                </div>

                {filterError && (
                    <p className={`${styles.fieldError} ${styles.formSpanAll}`} role="alert">
                        {filterError}
                    </p>
                )}
            </form>

            {loading && <PageLoader label="Cargando pedidos…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar los pedidos"
                    message={getApiErrorMessage(error)}
                    onRetry={() => setReloadKey((key) => key + 1)}
                />
            )}

            {!loading && !error && orders.length === 0 && (
                <AdminEmptyState
                    title={
                        filtered
                            ? 'Sin resultados para estos filtros'
                            : 'Todavía no hay pedidos en este período'
                    }
                    message={
                        filtered
                            ? 'Probá ampliar las fechas o quitar algunos filtros para ver más pedidos.'
                            : 'Cuando se registren pedidos, acá vas a poder consultar sus ítems y tiempos.'
                    }
                    action={
                        filtered ? (
                            <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={clearFilters}
                            >
                                Limpiar filtros
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={viewLast30Days}
                            >
                                Ver últimos 30 días
                            </button>
                        )
                    }
                    showDevSeed={!filtered}
                />
            )}

            {!loading && !error && orders.length > 0 && (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Pedido</th>
                                    <th scope="col">Fecha</th>
                                    <th scope="col">Mesa</th>
                                    <th scope="col">Mozo</th>
                                    <th scope="col">Estado</th>
                                    <th scope="col">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const expanded = expandedIds.has(order.id);
                                    const panelId = detailPanelId(order.id, 'table');

                                    return (
                                        <Fragment key={order.id}>
                                            <tr
                                                className={`${styles.orderRow} ${
                                                    expanded ? styles.orderRowExpanded : ''
                                                }`}
                                                onClick={() => toggleOrder(order.id)}
                                            >
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={styles.orderExpandButton}
                                                        aria-expanded={expanded}
                                                        aria-controls={panelId}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleOrder(order.id);
                                                        }}
                                                    >
                                                        <svg
                                                            className={`${styles.chevron} ${
                                                                expanded ? styles.chevronOpen : ''
                                                            }`}
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                d="m6 9 6 6 6-6"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        <span className={styles.cellStrong}>
                                                            #{order.id}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className={styles.cellMuted}>
                                                        {formatDateTime(order.created_at)}
                                                    </span>
                                                </td>
                                                <td>{tableLabel(order)}</td>
                                                <td>{userLabel(order)}</td>
                                                <td>
                                                    <span
                                                        className={styles.badge}
                                                        style={{
                                                            '--badge-color': statusColor(
                                                                order.status,
                                                            ),
                                                        }}
                                                    >
                                                        <span
                                                            className={styles.badgeDot}
                                                            aria-hidden="true"
                                                        />
                                                        {statusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={styles.price}>
                                                        {formatPrice(order.total)}
                                                    </span>
                                                </td>
                                            </tr>

                                            {expanded && (
                                                <tr className={styles.detailRow}>
                                                    <td
                                                        colSpan="6"
                                                        id={panelId}
                                                        className={styles.detailCell}
                                                    >
                                                        <div className={styles.detailPanel}>
                                                            <OrderDetailContent order={order} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <ul className={styles.mobileList}>
                        {orders.map((order) => {
                            const expanded = expandedIds.has(order.id);
                            const panelId = detailPanelId(order.id, 'card');

                            return (
                                <li
                                    key={order.id}
                                    className={`${styles.itemCard} ${
                                        expanded ? styles.itemCardExpanded : ''
                                    }`}
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    <div className={styles.itemCardHeader}>
                                        <div>
                                            <h2 className={styles.itemCardTitle}>
                                                Pedido #{order.id}
                                            </h2>
                                            <p className={styles.itemCardText}>
                                                {formatDateTime(order.created_at)}
                                            </p>
                                        </div>
                                        <span
                                            className={styles.badge}
                                            style={{
                                                '--badge-color': statusColor(order.status),
                                            }}
                                        >
                                            <span
                                                className={styles.badgeDot}
                                                aria-hidden="true"
                                            />
                                            {statusLabel(order.status)}
                                        </span>
                                    </div>

                                    <p className={styles.itemCardText}>
                                        {tableLabel(order)} · {userLabel(order)} ·{' '}
                                        {(order.items ?? []).length} ítems
                                    </p>

                                    <div className={styles.itemCardFooter}>
                                        <div className={styles.cardTotal}>
                                            <span className={styles.cellMuted}>Total</span>
                                            <span className={styles.orderTotal}>
                                                {formatPrice(order.total)}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className={`${styles.buttonGhost} ${styles.buttonSmall}`}
                                            aria-expanded={expanded}
                                            aria-controls={panelId}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                toggleOrder(order.id);
                                            }}
                                        >
                                            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                                            <svg
                                                className={`${styles.chevron} ${
                                                    expanded ? styles.chevronOpen : ''
                                                }`}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="m6 9 6 6 6-6"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    {expanded && (
                                        <div
                                            id={panelId}
                                            className={styles.itemCardDetail}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <OrderDetailContent order={order} />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <div className={styles.pagination}>
                        <p className={styles.paginationInfo}>
                            Página {currentPage} de {lastPage} · {totalOrders} pedidos
                        </p>

                        <div className={styles.paginationActions}>
                            <button
                                type="button"
                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                                disabled={currentPage <= 1}
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                onClick={() => goToPage(Math.min(currentPage + 1, lastPage))}
                                disabled={currentPage >= lastPage}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
