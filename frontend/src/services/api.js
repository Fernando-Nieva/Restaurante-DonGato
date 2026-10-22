const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'token';

export class ApiError extends Error {
    constructor(message, { status = 0, errors = {}, payload = null } = {}) {
        super(message);

        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.payload = payload;
    }
}

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const getFieldError = (error, field) => {
    const value = error?.errors?.[field];

    if (Array.isArray(value)) return value[0] ?? null;
    if (typeof value === 'string') return value;

    return null;
};

export const getApiErrorMessage = (error, fallback = 'No pudimos completar la operación.') => {
    if (error?.message) return error.message;

    return fallback;
};

const parsePayload = async (response) => {
    const text = await response.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const notifyUnauthorized = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
    }
};

export async function apiRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}${path}`, {
        method,
        signal,
        headers: {
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await parsePayload(response);

    if (!response.ok) {
        if (response.status === 401) notifyUnauthorized();

        const message =
            (typeof payload === 'object' && payload?.message) ||
            (response.status === 401
                ? 'Tu sesión expiró. Volvé a iniciar sesión.'
                : response.status === 403
                  ? 'No tenés permisos para realizar esta acción.'
                  : `La solicitud respondió ${response.status}.`);

        throw new ApiError(message, {
            status: response.status,
            errors:
                typeof payload === 'object' && payload?.errors && typeof payload.errors === 'object'
                    ? payload.errors
                    : {},
            payload,
        });
    }

    if (response.status === 204) return null;

    return payload;
}

export const api = {
    get: (path, options) => apiRequest(path, options),
    post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
    put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
};
