import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const TOAST_DURATION = 6000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());
    const nextIdRef = useRef(0);

    const dismiss = useCallback((id) => {
        const timer = timersRef.current.get(id);

        if (timer) clearTimeout(timer);

        timersRef.current.delete(id);
        setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(
        (toast) => {
            const id = nextIdRef.current + 1;

            nextIdRef.current = id;
            setToasts((previous) =>
                [
                    ...previous,
                    {
                        id,
                        type: toast.type ?? 'info',
                        title: toast.title ?? '',
                        message: toast.message ?? '',
                    },
                ].slice(-MAX_TOASTS),
            );

            const timer = setTimeout(() => dismiss(id), TOAST_DURATION);

            timersRef.current.set(id, timer);
        },
        [dismiss],
    );

    useEffect(() => {
        const timers = timersRef.current;

        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    const value = useMemo(() => ({ addToast }), [addToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Toast toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast debe usarse dentro de ToastProvider');
    }

    return context;
}
