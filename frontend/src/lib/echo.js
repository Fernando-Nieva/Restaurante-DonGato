import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

window.Pusher = Pusher;

let echo = null;
const listeners = new Set();

const emit = () => {
    listeners.forEach((listener) => listener());
};

export const getEcho = () => echo;

export const subscribeToEcho = (listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

const createEcho = (token) =>
    new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        channelAuthorization: {
            customHandler: ({ socketId, channelName }, callback) => {
                fetch(`${API_URL}/broadcasting/auth`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
                })
                    .then(async (response) => {
                        if (!response.ok) {
                            throw new Error(`Broadcast auth respondió ${response.status}`);
                        }

                        callback(null, await response.json());
                    })
                    .catch((error) => callback(error, null));
            },
        },
    });

export const connectEcho = (token) => {
    if (echo) {
        disconnectEcho();
    }

    echo = createEcho(token);
    emit();

    return echo;
};

export const disconnectEcho = () => {
    if (!echo) return;

    echo.disconnect();
    echo = null;
    emit();
};
