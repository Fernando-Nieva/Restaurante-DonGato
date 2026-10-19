import { useEffect, useRef, useState } from 'react';
import ConnectionBadge from './ConnectionBadge';
import useOrders from '../hooks/useOrders';
import { KITCHEN_COLUMNS, NEXT_STATUS } from '../constants/orderStatus';
import styles from './KitchenBoard.module.css';

const HIGHLIGHT_MS = 3500;

const BOARD_STATUSES = KITCHEN_COLUMNS.map((column) => column.status);

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const tableLabel = (order) => {
    const table = order.table;

    if (table && typeof table === 'object') {
        return table.name ?? table.number ?? table.id ?? '—';
    }

    return table ?? order.table_id ?? '—';
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

export default function KitchenBoard() {
    const { orders, connectionStatus, updateStatus } = useOrders();
    const boardOrders = orders.filter((order) =>
        BOARD_STATUSES.includes(normalizeStatus(order.status)),
    );
    const [highlightedIds, setHighlightedIds] = useState(() => new Set());
    const [busyIds, setBusyIds] = useState(() => new Set());
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

    const advance = async (order, nextStatus) => {
        const key = String(order.id);

        if (busyIds.has(key)) return;

        setBusyIds((previous) => new Set(previous).add(key));

        try {
            await updateStatus(order.id, nextStatus);
        } catch (error) {
            console.error(`No se pudo actualizar el pedido #${order.id}:`, error);
        } finally {
            setBusyIds((previous) => {
                const next = new Set(previous);
                next.delete(key);

                return next;
            });
        }
    };

    return (
        <section>
            <div className={styles.toolbar}>
                <h2 className={styles.toolbarTitle}>Órdenes en vivo</h2>
                <ConnectionBadge status={connectionStatus} />
            </div>

            <div className={styles.board}>
                {KITCHEN_COLUMNS.map((column) => {
                    const nextStatus = NEXT_STATUS.cocina[column.status];
                    const columnOrders = boardOrders.filter(
                        (order) => normalizeStatus(order.status) === column.status,
                    );

                    return (
                        <div key={column.status} className={`${styles.column} ${styles[column.status]}`}>
                            <header className={styles.columnHeader}>
                                <span className={styles.columnTitle}>{column.title}</span>
                                <span className={styles.count}>{columnOrders.length}</span>
                            </header>

                            <div className={styles.cards}>
                                {columnOrders.length === 0 && <p className={styles.empty}>Sin pedidos</p>}

                                {columnOrders.map((order) => {
                                    const key = String(order.id);
                                    const items = orderItems(order);

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
                                                <span className={styles.table}>Mesa {tableLabel(order)}</span>
                                                <time className={styles.time}>{formatTime(order.created_at)}</time>
                                            </header>

                                            <ul className={styles.items}>
                                                {items.map((item, index) => (
                                                    <li key={`${itemName(item)}-${index}`}>
                                                        {itemQuantity(item)} × {itemName(item)}
                                                        {item?.notes && (
                                                            <em className={styles.itemNotes}>
                                                                {item.notes}
                                                            </em>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>

                                            {order.notes && <p className={styles.notes}>{order.notes}</p>}

                                            {nextStatus ? (
                                                <button
                                                    type="button"
                                                    className={styles.button}
                                                    disabled={busyIds.has(key)}
                                                    onClick={() => advance(order, nextStatus)}
                                                >
                                                    {column.action}
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
