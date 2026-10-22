import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { connectEcho, disconnectEcho } from '../lib/echo';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
        return null;
    }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(readStoredUser);

    useEffect(() => {
        if (token) {
            connectEcho(token);
        }

        return () => disconnectEcho();
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);

            throw new Error(payload?.message ?? `Login respondió ${response.status}`);
        }

        const payload = await response.json();

        localStorage.setItem(TOKEN_KEY, payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(payload.user));

        setToken(payload.token);
        setUser(payload.user);

        connectEcho(payload.token);

        return payload.user;
    }, []);

    const logout = useCallback(async () => {
        const currentToken = token;

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        disconnectEcho();
        setToken(null);
        setUser(null);

        if (currentToken) {
            await fetch(`${API_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${currentToken}`,
                },
            }).catch(() => null);
        }
    }, [token]);

    useEffect(() => {
        const handleUnauthorized = () => {
            void logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider.');
    }

    return context;
}
