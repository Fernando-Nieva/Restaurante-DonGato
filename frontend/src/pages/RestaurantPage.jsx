import { useEffect, useMemo, useRef, useState } from 'react';
import OrderPanel from '../components/OrderPanel';
import RestaurantScene from '../components/RestaurantScene';
import { PageError, PageLoader } from '../components/PageState';
import { useToast } from '../context/ToastContext';
import useOrders from '../hooks/useOrders';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../constants/orderStatus';
import styles from './RestaurantPage.module.css';

const STATUS_PRECEDENCE = [ORDER_STATUS.Pendiente, ORDER_STATUS.Preparando, ORDER_STATUS.Listo];

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

const orderTableLabel = (order) =>
    order.table?.number ?? order.table?.name ?? order.table?.id ?? order.table_id ?? '—';

const deriveTableStatus = (table, orders) => {
    const tableId = String(table.id);

    const statuses = new Set(
        orders
            .filter((order) => {
                const id = orderTableId(order);

                return id != null && String(id) === tableId;
            })
            .map((order) => String(order.status ?? '').toLowerCase())
            .filter(Boolean),
    );

    return STATUS_PRECEDENCE.find((status) => statuses.has(status)) ?? 'libre';
};

export default function RestaurantPage() {
    const {
        tables,
        orders,
        ordersLoaded,
        loading,
        error,
        retry,
        createOrder,
        updateStatus,
        consumeReady,
        consumeDone,
    } = useOrders();
    const [selectedId, setSelectedId] = useState(null);
    const { addToast } = useToast();
    const statusesRef = useRef(new Map());

    const tablesWithStatus = useMemo(
        () => tables.map((table) => ({ ...table, status: deriveTableStatus(table, orders) })),
        [tables, orders],
    );

    useEffect(() => {
        const previousStatuses = statusesRef.current;
        const nextStatuses = new Map();
        const readyOrders = [];

        orders.forEach((order) => {
            const key = String(order.id);
            const current = String(order.status ?? '').toLowerCase();
            const previous = previousStatuses.get(key);

            if (previous !== undefined && previous !== current && current === ORDER_STATUS.Listo) {
                readyOrders.push(order);
            }

            nextStatuses.set(key, current);
        });

        statusesRef.current = nextStatuses;

        readyOrders.forEach((order) => {
            addToast({
                type: 'success',
                title: `Pedido ${ORDER_STATUS_LABELS[ORDER_STATUS.Listo].toLowerCase()}`,
                message: `Mesa ${orderTableLabel(order)} · retirar de cocina`,
            });
        });
    }, [orders, addToast]);

    const selectedTable =
        tablesWithStatus.find((table) => String(table.id) === String(selectedId)) ?? null;

    const handleSelect = (id) =>
        setSelectedId((previous) => (String(previous) === String(id) ? null : id));

    if (loading) {
        return (
            <main className={styles.page}>
                <PageLoader label="Preparando el salón…" />
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.page}>
                <PageError
                    title="No pudimos cargar el salón"
                    message="Revisá la conexión con el servidor e intentá de nuevo."
                    onRetry={retry}
                />
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Salón</h1>
                    <p className={styles.subtitle}>
                        Seleccioná una mesa para tomar o revisar pedidos.
                    </p>
                </div>
            </header>

            <div className={styles.scene}>
                <RestaurantScene
                    tables={tablesWithStatus}
                    orders={orders}
                    ordersLoaded={ordersLoaded}
                    consumeReady={consumeReady}
                    consumeDone={consumeDone}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    panelOpen={Boolean(selectedTable)}
                />

                {selectedTable && (
                    <OrderPanel
                        table={selectedTable}
                        orders={orders}
                        createOrder={createOrder}
                        updateStatus={updateStatus}
                        onClose={() => setSelectedId(null)}
                    />
                )}
            </div>
        </main>
    );
}
