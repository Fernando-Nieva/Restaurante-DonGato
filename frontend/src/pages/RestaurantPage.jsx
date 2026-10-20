import { useMemo, useState } from 'react';
import ConnectionBadge from '../components/ConnectionBadge';
import OrderPanel from '../components/OrderPanel';
import RestaurantScene from '../components/RestaurantScene';
import useOrders from '../hooks/useOrders';
import { ORDER_STATUS } from '../constants/orderStatus';
import styles from './RestaurantPage.module.css';

const STATUS_PRECEDENCE = [ORDER_STATUS.Pendiente, ORDER_STATUS.Preparando, ORDER_STATUS.Listo];

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

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
        connectionStatus,
        createOrder,
        updateStatus,
        consumeReady,
        consumeDone,
    } = useOrders();
    const [selectedId, setSelectedId] = useState(null);

    const tablesWithStatus = useMemo(
        () => tables.map((table) => ({ ...table, status: deriveTableStatus(table, orders) })),
        [tables, orders],
    );

    const selectedTable =
        tablesWithStatus.find((table) => String(table.id) === String(selectedId)) ?? null;

    const handleSelect = (id) =>
        setSelectedId((previous) => (String(previous) === String(id) ? null : id));

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Salón</h1>
                <ConnectionBadge status={connectionStatus} />
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
