import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getEcho, subscribeToEcho } from '../lib/echo';
import { adminApi } from '../services/adminApi';
import { toDateInputValue } from '../utils/date';

const byReservedFor = (a, b) =>
    new Date(a.reserved_for).getTime() - new Date(b.reserved_for).getTime();

const utcDatesForLocalDay = (date) => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    return [
        ...new Set([
            start.toISOString().slice(0, 10),
            end.toISOString().slice(0, 10),
        ]),
    ];
};

const mergeDayReservations = (date, responses) => {
    const byId = new Map();

    responses.forEach((reservations) => {
        reservations.forEach((reservation) => {
            byId.set(String(reservation.id), reservation);
        });
    });

    return [...byId.values()]
        .filter(
            (reservation) =>
                toDateInputValue(new Date(reservation.reserved_for)) === date,
        )
        .sort(byReservedFor);
};

export default function useAdminReservations(date) {
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const dateRef = useRef(date);
    const requestIdRef = useRef(0);
    const loadingRef = useRef(true);

    const updateLoading = useCallback((value) => {
        loadingRef.current = value;
        setLoading(value);
    }, []);

    useEffect(() => {
        dateRef.current = date;
    }, [date]);

    const fetchDay = useCallback(
        async (targetDate, { silent = false } = {}) => {
            const requestId = requestIdRef.current + 1;

            requestIdRef.current = requestId;

            if (!targetDate) {
                setReservations([]);
                updateLoading(false);
                setError(null);

                return;
            }

            if (!silent) {
                updateLoading(true);
                setError(null);
            }

            try {
                const utcDates = utcDatesForLocalDay(targetDate);
                const responses = await Promise.all(
                    utcDates.map((utcDate) =>
                        adminApi.listReservations({ date: utcDate }),
                    ),
                );

                if (requestIdRef.current !== requestId) return;

                setReservations(mergeDayReservations(targetDate, responses));
                setError(null);
            } catch (loadError) {
                if (requestIdRef.current !== requestId) return;

                console.error('No se pudieron cargar las reservas:', loadError);

                if (!silent || loadingRef.current) {
                    setError(loadError);
                }
            } finally {
                if (requestIdRef.current === requestId) {
                    updateLoading(false);
                }
            }
        },
        [updateLoading],
    );

    useEffect(() => {
        void fetchDay(date);
    }, [date, fetchDay]);

    useEffect(() => {
        if (!echo) return undefined;

        const handleReservationUpdated = (payload) => {
            const currentDate = dateRef.current;
            const summary = payload?.reservation;

            if (!summary?.id) {
                void fetchDay(currentDate, { silent: true });

                return;
            }

            const summaryDate = toDateInputValue(new Date(summary.reserved_for));

            if (summaryDate === currentDate) {
                setReservations((previous) => {
                    const known = previous.some(
                        (reservation) => String(reservation.id) === String(summary.id),
                    );

                    if (!known) return previous;

                    return previous
                        .map((reservation) =>
                            String(reservation.id) === String(summary.id)
                                ? { ...reservation, ...summary }
                                : reservation,
                        )
                        .sort(byReservedFor);
                });
            }

            void fetchDay(currentDate, { silent: true });
        };

        const channel = echo.private('restaurant');

        channel.listen('ReservationUpdated', handleReservationUpdated);

        return () => {
            channel.stopListening('ReservationUpdated', handleReservationUpdated);
        };
    }, [echo, fetchDay]);

    const refresh = useCallback(
        (options) => fetchDay(date, options),
        [date, fetchDay],
    );

    return { reservations, loading, error, refresh };
}
