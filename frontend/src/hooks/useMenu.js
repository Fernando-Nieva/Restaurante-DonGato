import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getEcho, subscribeToEcho } from '../lib/echo';
import { api } from '../services/api';

const CHANNEL_NAME = 'restaurant';

const extractList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
};

export default function useMenu({ admin = false } = {}) {
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const load = useCallback(
        async ({ signal, background = false } = {}) => {
            if (background) {
                setRefreshing(true);
            } else {
                setLoading(true);
                setError(null);
            }

            try {
                const payload = await api.get(admin ? '/api/admin/products' : '/api/products', {
                    signal,
                });

                if (mountedRef.current) {
                    setProducts(extractList(payload));
                    setError(null);
                }
            } catch (loadError) {
                if (loadError?.name === 'AbortError') return;

                console.error('No se pudo cargar la carta:', loadError);

                if (mountedRef.current) {
                    setError(loadError);
                }
            } finally {
                if (mountedRef.current) {
                    if (background) {
                        setRefreshing(false);
                    } else {
                        setLoading(false);
                    }
                }
            }
        },
        [admin],
    );

    useEffect(() => {
        const controller = new AbortController();

        load({ signal: controller.signal });

        return () => controller.abort();
    }, [load, reloadKey]);

    useEffect(() => {
        if (!echo) return undefined;

        const channel = echo.private(CHANNEL_NAME);
        const handleMenuUpdated = () => load({ background: true });

        channel.listen('MenuUpdated', handleMenuUpdated);

        return () => channel.stopListening('MenuUpdated', handleMenuUpdated);
    }, [echo, load]);

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    return {
        products,
        setProducts,
        loading,
        refreshing,
        error,
        reload,
    };
}
