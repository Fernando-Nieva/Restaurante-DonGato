import { useEffect, useRef, useState } from 'react';
import AdminTablePanel from '../components/admin/AdminTablePanel';
import OrderPanel from '../components/OrderPanel';
import RestaurantScene from '../components/RestaurantScene';
import { PageError, PageLoader } from '../components/PageState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useOrders from '../hooks/useOrders';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../constants/orderStatus';
import { tableDisplayName } from '../utils/table';
import styles from './RestaurantPage.module.css';

const orderTableLabel = (order) => {
    if (order.table && (order.table.number ?? order.table.name ?? order.table.id) != null) {
        return tableDisplayName(order.table);
    }

    return order.table_id != null ? `Mesa ${order.table_id}` : '—';
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
        seatReservation,
        refreshTables,
        consumeReady,
        consumeDone,
    } = useOrders();
    const [selectedId, setSelectedId] = useState(null);
    const { addToast } = useToast();
    const { user } = useAuth();
    const isAdmin = String(user?.role ?? '').toLowerCase() === 'admin';
    const statusesRef = useRef(new Map());

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
                message: `${orderTableLabel(order)} · retirar de cocina`,
            });
        });
    }, [orders, addToast]);

    const selectedTable =
        tables.find((table) => String(table.id) === String(selectedId)) ?? null;

    const handleSelect = (id) =>
        setSelectedId((previous) => (String(previous) === String(id) ? null : id));

    if (loading) {
        return (
            <main className={styles.page}>
                <PageLoader label="Preparando el restaurante…" />
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.page}>
                <PageError
                    title="No pudimos cargar el restaurante"
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
                    <h1 className={styles.title}>Restaurante</h1>
                    <p className={styles.subtitle}>
                        {isAdmin
                            ? 'Seleccioná una mesa para gestionar reservas y revisar pedidos.'
                            : 'Seleccioná una mesa para tomar o revisar pedidos.'}
                    </p>
                </div>
            </header>

            <div className={styles.scene}>
                <RestaurantScene
                    tables={tables}
                    orders={orders}
                    ordersLoaded={ordersLoaded}
                    consumeReady={consumeReady}
                    consumeDone={consumeDone}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    panelOpen={Boolean(selectedTable)}
                />

                {selectedTable &&
                    (isAdmin ? (
                        <AdminTablePanel
                            table={selectedTable}
                            orders={orders}
                            onClose={() => setSelectedId(null)}
                            onRefresh={refreshTables}
                        />
                    ) : (
                        <OrderPanel
                            table={selectedTable}
                            orders={orders}
                            createOrder={createOrder}
                            updateStatus={updateStatus}
                            seatReservation={seatReservation}
                            onClose={() => setSelectedId(null)}
                        />
                    ))}
            </div>
        </main>
    );
}
