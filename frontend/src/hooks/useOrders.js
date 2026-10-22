import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
        throw new Error(`${method} ${path} respondió ${response.status}`);
    }

    if (response.status === 204) return null;

    return response.json();
};

export default function useOrders() {
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
    }, [reloadKey]);

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
            console.error('No se pudieron recargar los pedidos:', error);
        }
    }, []);

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

        const channel = echo.private(CHANNEL_NAME);

        channel.listen('OrderCreated', handleOrderCreated);
        channel.listen('OrderStatusUpdated', handleStatusUpdated);

        return () => {
            echo.leave(CHANNEL_NAME);
        };
    }, [echo, reloadOrders]);

    const createOrder = useCallback(async (payload) => {
        const response = await request('/api/orders', { method: 'POST', body: payload });
        const created = extractOrder(response);

        if (created) {
            setOrders((previous) => upsertOrder(previous, created));
        }

        return created;
    }, []);

    const updateStatus = useCallback(async (orderId, status) => {
        const response = await request(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            body: { status },
        });

        const updated = extractOrder(response) ?? { id: orderId, status };

        setOrders((previous) => upsertOrder(previous, updated));

        return updated;
    }, []);

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
        consumeReady,
        consumeDone,
    };
}
