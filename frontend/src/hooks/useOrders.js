import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEcho, subscribeToEcho } from '../lib/echo';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const CHANNEL_NAME = 'restaurant';

const authHeaders = () => {
    const token = localStorage.getItem('token');

    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toConnectionStatus = (state) => {
    if (state === 'connected') return 'connected';
    if (state === 'connecting' || state === 'initialized') return 'connecting';

    return 'disconnected';
};

const extractList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
};

const extractOrder = (payload) => {
    if (!payload || typeof payload !== 'object') return null;

    const candidate = payload.order ?? payload.data ?? payload;

    if (!candidate || typeof candidate !== 'object' || candidate.id == null) return null;

    return candidate;
};

const upsertOrder = (orders, incoming) => {
    const index = orders.findIndex((order) => String(order.id) === String(incoming.id));

    if (index === -1) return [...orders, incoming];

    return orders.map((order, position) => (position === index ? { ...order, ...incoming } : order));
};

const request = async (path, { method = 'GET', body, signal } = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        signal,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
            (payload && typeof payload === 'object' && payload.message) ||
            `${method} ${path} respondió ${response.status}`;
        const error = new Error(message);

        error.status = response.status;
        error.errors =
            payload && typeof payload === 'object' && payload.errors ? payload.errors : {};
        error.payload = payload;

        throw error;
    }

    if (response.status === 204) return null;

    return response.json();
};

export default function useOrders() {
    const { logout } = useAuth();
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const ordersRef = useRef(orders);
    const readyQueue = useRef([]);
    const doneQueue = useRef([]);

    const handleUnauthorized = useCallback(
        async (error) => {
            if (error?.status !== 401) return false;

            await logout();

            return true;
        },
        [logout],
    );

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadInitialState = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const [tablesPayload, ordersPayload] = await Promise.all([
                    request('/api/tables', { signal: controller.signal }),
                    request('/api/orders', { signal: controller.signal }),
                ]);

                if (!active) return;

                setTables(extractList(tablesPayload));
                setOrders(extractList(ordersPayload));
                setOrdersLoaded(true);
            } catch (error) {
                if (await handleUnauthorized(error)) return;

                if (active) {
                    console.error('No se pudo cargar el estado inicial de mesas y pedidos:', error);
                    setLoadError(error);
                    setOrdersLoaded(true);
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadInitialState();

        return () => {
            active = false;
            controller.abort();
        };
    }, [reloadKey, handleUnauthorized]);

    const retry = useCallback(() => {
        setReloadKey((key) => key + 1);
    }, []);

    useEffect(() => {
        if (!echo) return undefined;

        const connection = echo.connector?.pusher?.connection;

        if (!connection) return undefined;

        setConnectionStatus(toConnectionStatus(connection.state));

        const handleStateChange = ({ current }) => setConnectionStatus(toConnectionStatus(current));

        connection.bind('state_change', handleStateChange);

        return () => connection.unbind('state_change', handleStateChange);
    }, [echo]);

    const reloadOrders = useCallback(async () => {
        try {
            const payload = await request('/api/orders');

            setOrders(extractList(payload));
        } catch (error) {
            if (await handleUnauthorized(error)) return;

            console.error('No se pudieron recargar los pedidos:', error);
        }
    }, [handleUnauthorized]);

    const reloadTables = useCallback(async () => {
        try {
            const payload = await request('/api/tables');

            setTables(extractList(payload));
        } catch (error) {
            if (await handleUnauthorized(error)) return;

            console.error('No se pudieron recargar las mesas:', error);
        }
    }, [handleUnauthorized]);

    useEffect(() => {
        const refreshWhenVisible = () => {
            if (document.hidden) return;

            void reloadTables();
        };
        const interval = window.setInterval(refreshWhenVisible, 60000);

        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [reloadTables]);

    const consumeReady = useCallback(() => {
        const queue = readyQueue.current;

        readyQueue.current = [];

        return queue;
    }, []);

    const consumeDone = useCallback(() => {
        const queue = doneQueue.current;

        doneQueue.current = [];

        return queue;
    }, []);

    useEffect(() => {
        if (!echo) return undefined;

        const handleOrderCreated = (payload) => {
            const incoming = extractOrder(payload);

            if (!incoming) return;

            setOrders((previous) => upsertOrder(previous, incoming));
        };

        const handleStatusUpdated = (payload) => {
            if (!payload || typeof payload !== 'object') return;

            const orderId = payload.order_id;
            const tableId = payload.table_id;
            const status = payload.status;
            const tableStatus = payload.table_status;

            if (orderId != null && String(status ?? '').toLowerCase() === 'listo') {
                readyQueue.current.push({ orderId, tableId: tableId ?? null, ts: Date.now() });
            }

            const normalized = String(status ?? '').toLowerCase();

            if (orderId != null && (normalized === 'entregado' || normalized === 'cancelado')) {
                doneQueue.current.push({
                    orderId,
                    tableId: tableId ?? null,
                    status: normalized,
                    ts: Date.now(),
                });
            }

            if (orderId != null && status != null) {
                const knownOrder = ordersRef.current.some(
                    (order) => String(order.id) === String(orderId),
                );

                if (knownOrder) {
                    setOrders((previous) =>
                        previous.map((order) =>
                            String(order.id) === String(orderId) ? { ...order, status } : order,
                        ),
                    );
                } else {
                    reloadOrders();
                }
            }

            if (tableId != null && tableStatus != null) {
                setTables((previous) =>
                    previous.map((table) =>
                        String(table.id) === String(tableId)
                            ? { ...table, status: tableStatus }
                            : table,
                    ),
                );
            }
        };

        const handleTablesUpdated = (payload) => {
            if (!payload || typeof payload !== 'object') return;

            const tableId = payload.table_id;
            const action = String(payload.action ?? '').toLowerCase();

            if (
                tableId != null &&
                (action === 'deleted' || action === 'deactivated' || payload.is_active === false)
            ) {
                setTables((previous) =>
                    previous.filter((table) => String(table.id) !== String(tableId)),
                );
                return;
            }

            reloadTables();
        };

        const handleReservationUpdated = (payload) => {
            if (!payload || typeof payload !== 'object') return;

            const tableId = payload.table_id;
            const tableStatus = payload.table_status;
            const summary = payload.reservation;

            if (tableId == null) {
                reloadTables();

                return;
            }

            const isActive = String(summary?.status ?? '').toLowerCase() === 'activa';

            setTables((previous) =>
                previous.map((table) => {
                    if (String(table.id) !== String(tableId)) return table;

                    const next = {
                        ...table,
                        status: tableStatus ?? table.status,
                    };

                    if (isActive) {
                        const currentReservation = table.reservation;
                        const upcomingReservation = table.next_reservation;
                        const isCurrent =
                            currentReservation &&
                            String(currentReservation.id) === String(summary?.id);

                        if (isCurrent) {
                            next.reservation = { ...currentReservation, ...summary };
                        } else if (
                            String(next.status).toLowerCase() === 'reservada' &&
                            currentReservation
                        ) {
                            next.next_reservation = {
                                ...(upcomingReservation ?? {}),
                                ...summary,
                            };
                        } else if (String(next.status).toLowerCase() === 'reservada') {
                            next.reservation = {
                                ...(currentReservation ?? {}),
                                ...summary,
                            };
                            next.next_reservation = null;
                        } else {
                            next.reservation = null;
                            next.next_reservation = {
                                ...(upcomingReservation ?? {}),
                                ...summary,
                            };
                        }

                        return next;
                    }

                    if (
                        table.reservation &&
                        String(table.reservation.id) === String(summary?.id)
                    ) {
                        next.reservation = null;
                    }

                    if (
                        table.next_reservation &&
                        String(table.next_reservation.id) === String(summary?.id)
                    ) {
                        next.next_reservation = null;
                    }

                    return next;
                }),
            );

            reloadTables();
        };

        const channel = echo.private(CHANNEL_NAME);

        channel.listen('OrderCreated', handleOrderCreated);
        channel.listen('OrderStatusUpdated', handleStatusUpdated);
        channel.listen('TablesUpdated', handleTablesUpdated);
        channel.listen('ReservationUpdated', handleReservationUpdated);

        return () => {
            channel.stopListening('OrderCreated', handleOrderCreated);
            channel.stopListening('OrderStatusUpdated', handleStatusUpdated);
            channel.stopListening('TablesUpdated', handleTablesUpdated);
            channel.stopListening('ReservationUpdated', handleReservationUpdated);
        };
    }, [echo, reloadOrders, reloadTables]);

    const createOrder = useCallback(
        async (payload) => {
            try {
                const response = await request('/api/orders', { method: 'POST', body: payload });
                const created = extractOrder(response);

                if (created) {
                    setOrders((previous) => upsertOrder(previous, created));
                }

                return created;
            } catch (error) {
                if (await handleUnauthorized(error)) return null;

                throw error;
            }
        },
        [handleUnauthorized],
    );

    const updateStatus = useCallback(
        async (orderId, status) => {
            try {
                const response = await request(`/api/orders/${orderId}/status`, {
                    method: 'PATCH',
                    body: { status },
                });

                const updated = extractOrder(response) ?? { id: orderId, status };

                setOrders((previous) => upsertOrder(previous, updated));

                return updated;
            } catch (error) {
                if (await handleUnauthorized(error)) return null;

                throw error;
            }
        },
        [handleUnauthorized],
    );

    const seatReservation = useCallback(
        async (reservationId) => {
            try {
                const response = await request(`/api/reservations/${reservationId}/seat`, {
                    method: 'PATCH',
                });
                const reservation = response?.data ?? response;
                const tableId = reservation?.table_id;

                if (tableId != null) {
                    setTables((previous) =>
                        previous.map((table) => {
                            if (String(table.id) !== String(tableId)) return table;

                            return {
                                ...table,
                                status: 'libre',
                                reservation: null,
                                next_reservation:
                                    table.next_reservation &&
                                    String(table.next_reservation.id) === String(reservationId)
                                        ? null
                                        : table.next_reservation,
                            };
                        }),
                    );
                }

                reloadTables();

                return reservation;
            } catch (error) {
                if (await handleUnauthorized(error)) return null;

                throw error;
            }
        },
        [handleUnauthorized, reloadTables],
    );

    return {
        tables,
        orders,
        ordersLoaded,
        loading,
        error: loadError,
        retry,
        connectionStatus,
        createOrder,
        updateStatus,
        seatReservation,
        refreshTables: reloadTables,
        consumeReady,
        consumeDone,
    };
}
