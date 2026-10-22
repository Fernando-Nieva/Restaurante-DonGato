import { useEffect, useState, useSyncExternalStore } from 'react';
import { getEcho, subscribeToEcho } from '../lib/echo';

const toConnectionStatus = (state) => {
    if (state === 'connected') return 'connected';
    if (state === 'connecting' || state === 'initialized') return 'connecting';

    return 'disconnected';
};

export default function useConnectionStatus() {
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    useEffect(() => {
        if (!echo) {
            setConnectionStatus('connecting');

            return undefined;
        }

        const connection = echo.connector?.pusher?.connection;

        if (!connection) return undefined;

        setConnectionStatus(toConnectionStatus(connection.state));

        const handleStateChange = ({ current }) => setConnectionStatus(toConnectionStatus(current));

        connection.bind('state_change', handleStateChange);

        return () => connection.unbind('state_change', handleStateChange);
    }, [echo]);

    return connectionStatus;
}
