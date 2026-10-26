import { useEffect, useRef, useState } from 'react';
import useOrders from '../hooks/useOrders';
import { useToast } from '../context/ToastContext';
import { KITCHEN_COLUMNS, NEXT_STATUS, ORDER_STATUS } from '../constants/orderStatus';
import { tableDisplayName } from '../utils/table';
import { PageError, PageLoader } from './PageState';
import StatusIcon from './StatusIcon';
import styles from './KitchenBoard.module.css';

const HIGHLIGHT_MS = 3500;
const CLOCK_TICK_MS = 30000;

const BOARD_STATUSES = KITCHEN_COLUMNS.map((column) => column.status);

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const tableLabel = (order) => {
    const table = order.table;

    if (
        table &&
        typeof table === 'object' &&
        (table.number ?? table.name ?? table.id) != null
    ) {
        return tableDisplayName(table);
    }

    if (table != null) return `Mesa ${table}`;
    if (order.table_id != null) return `Mesa ${order.table_id}`;

    return '—';
};

const orderItems = (order) => order.items ?? order.order_items ?? [];

const itemName = (item) => {
    if (typeof item === 'string') return item;

    return item.product_name ?? item.product?.name ?? item.name ?? 'Producto';
};

const itemQuantity = (item) => (typeof item === 'string' ? 1 : (item.quantity ?? 1));

const formatTime = (value) => {
    if (!value) return '--:--';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '--:--';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const minutesSince = (value, now) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return Math.max(0, Math.floor((now - date.getTime()) / 60000));
};

const elapsedLabel = (minutes) => {
    if (minutes === null) return 'Sin hora';
    if (minutes < 1) return 'recién';

    return `hace ${minutes} min`;
};

function EmptyState() {
    return (
        <div className={styles.empty}>
            <svg
                className={styles.emptyIcon}
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden="true"
            >
                <path d="M10 34a22 22 0 0 1 44 0" strokeLinecap="round" />
                <path d="M6 39h52" strokeLinecap="round" />
                <path d="M14 46h36" strokeLinecap="round" />
                <path d="M32 12v-3" strokeLinecap="round" />
                <circle cx="32" cy="6" r="2" />
            </svg>
            <p>Sin pedidos por ahora</p>
        </div>
    );
}

export default function KitchenBoard() {
    const { orders, updateStatus, loading, error, retry } = useOrders();
    const { addToast } = useToast();
    const boardOrders = orders.filter((order) =>
        BOARD_STATUSES.includes(normalizeStatus(order.status)),
    );
    const [activeStatus, setActiveStatus] = useState(KITCHEN_COLUMNS[0].status);
    const [highlightedIds, setHighlightedIds] = useState(() => new Set());
    const [busyIds, setBusyIds] = useState(() => new Set());
    const [now, setNow] = useState(() => Date.now());
    const hydratedRef = useRef(false);
    const knownIdsRef = useRef(new Set());
    const initialOrdersRef = useRef(orders);
    const timersRef = useRef(new Map());

    useEffect(() => {
        if (!hydratedRef.current) {
            if (orders === initialOrdersRef.current && orders.length === 0) return;

            hydratedRef.current = true;
            knownIdsRef.current = new Set(orders.map((order) => String(order.id)));

            return;
        }

        const ids = new Set(orders.map((order) => String(order.id)));
        const newIds = [...ids].filter((id) => !knownIdsRef.current.has(id));
        knownIdsRef.current = ids;

        if (newIds.length === 0) return;

        setHighlightedIds((previous) => {
            const next = new Set(previous);
            newIds.forEach((id) => next.add(id));

            return next;
        });

        newIds.forEach((id) => {
            clearTimeout(timersRef.current.get(id));

            const timer = setTimeout(() => {
                setHighlightedIds((previous) => {
                    const next = new Set(previous);
                    next.delete(id);

                    return next;
                });
                timersRef.current.delete(id);
            }, HIGHLIGHT_MS);

            timersRef.current.set(id, timer);
        });
    }, [orders]);

    useEffect(() => {
        const timers = timersRef.current;

        return () => timers.forEach((timer) => clearTimeout(timer));
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

        return () => clearInterval(timer);
    }, []);

    const advance = async (order, nextStatus) => {
        const key = String(order.id);

        if (busyIds.has(key)) return;

        setBusyIds((previous) => new Set(previous).add(key));

        try {
            await updateStatus(order.id, nextStatus);
        } catch (error) {
            console.error(`No se pudo actualizar el pedido #${order.id}:`, error);
            addToast({
                type: 'error',
                title: 'No se pudo actualizar el pedido',
                message: `Pedido #${order.id}. Intentá de nuevo.`,
            });
        } finally {
            setBusyIds((previous) => {
                const next = new Set(previous);
                next.delete(key);

                return next;
            });
        }
    };

    if (loading) {
        return <PageLoader label="Preparando la cocina…" />;
    }

    if (error) {
        return (
            <PageError
                title="No pudimos cargar los pedidos"
                message="Revisá la conexión con el servidor e intentá de nuevo."
                onRetry={retry}
            />
        );
    }

    return (
        <section className={styles.boardSection}>
            <div className={styles.toolbar}>
                <h2 className={styles.toolbarTitle}>Órdenes en vivo</h2>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Filtrar órdenes por estado">
                {KITCHEN_COLUMNS.map((column) => {
                    const count = boardOrders.filter(
                        (order) => normalizeStatus(order.status) === column.status,
                    ).length;
                    const active = activeStatus === column.status;

                    return (
                        <button
                            key={column.status}
                            id={`kitchen-tab-${column.status}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={`kitchen-panel-${column.status}`}
                            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                            style={{ '--status-color': column.color }}
                            onClick={() => setActiveStatus(column.status)}
                        >
                            <StatusIcon
                                status={column.status}
                                className={styles.tabIcon}
                                size={14}
                            />
                            <span className={styles.tabLabel}>{column.title}</span>
                            <span className={styles.tabCount}>{count}</span>
                        </button>
                    );
                })}
            </div>

            <div className={styles.board}>
                {KITCHEN_COLUMNS.map((column) => {
                    const nextStatus = NEXT_STATUS.cocina[column.status];
                    const columnOrders = boardOrders.filter(
                        (order) => normalizeStatus(order.status) === column.status,
                    );
                    const active = activeStatus === column.status;

                    return (
                        <div
                            key={column.status}
                            id={`kitchen-panel-${column.status}`}
                            role="tabpanel"
                            aria-labelledby={`kitchen-tab-${column.status}`}
                            className={`${styles.column} ${
                                active ? styles.columnActive : ''
                            }`}
                            style={{ '--status-color': column.color }}
                        >
                            <header className={styles.columnHeader}>
                                <h3 className={styles.columnTitle}>
                                    <StatusIcon
                                        status={column.status}
                                        className={styles.columnIcon}
                                        size={20}
                                    />
                                    {column.title}
                                </h3>
                                <span className={styles.count}>{columnOrders.length}</span>
                            </header>

                            <div className={styles.cards}>
                                {columnOrders.length === 0 && <EmptyState />}

                                {columnOrders.map((order) => {
                                    const key = String(order.id);
                                    const items = orderItems(order);
                                    const minutes = minutesSince(order.created_at, now);
                                    const isLate =
                                        column.status === ORDER_STATUS.Pendiente &&
                                        minutes !== null &&
                                        minutes > 15;

                                    return (
                                        <article
                                            key={key}
                                            className={
                                                highlightedIds.has(key)
                                                    ? `${styles.card} ${styles.cardNew}`
                                                    : styles.card
                                            }
                                        >
                                            <header className={styles.cardHeader}>
                                                <span className={styles.table}>
                                                    {tableLabel(order)}
                                                </span>
                                                <time
                                                    className={`${styles.time} ${
                                                        isLate ? styles.timeLate : ''
                                                    }`}
                                                    dateTime={order.created_at ?? undefined}
                                                    title={formatTime(order.created_at)}
                                                >
                                                    {elapsedLabel(minutes)}
                                                </time>
                                            </header>

                                            <ul className={styles.items}>
                                                {items.map((item, index) => (
                                                    <li key={`${itemName(item)}-${index}`}>
                                                        <span className={styles.itemQuantity}>
                                                            {itemQuantity(item)} ×
                                                        </span>{' '}
                                                        {itemName(item)}
                                                        {item?.notes && (
                                                            <em className={styles.itemNotes}>
                                                                {item.notes}
                                                            </em>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>

                                            {order.notes && (
                                                <p className={styles.notes}>
                                                    <strong className={styles.notesLabel}>
                                                        Notas:
                                                    </strong>{' '}
                                                    {order.notes}
                                                </p>
                                            )}

                                            {nextStatus ? (
                                                <button
                                                    type="button"
                                                    className={styles.button}
                                                    disabled={busyIds.has(key)}
                                                    onClick={() => advance(order, nextStatus)}
                                                >
                                                    {busyIds.has(key)
                                                        ? 'Actualizando…'
                                                        : column.action}
                                                </button>
                                            ) : (
                                                column.note && (
                                                    <p className={styles.note}>{column.note}</p>
                                                )
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
