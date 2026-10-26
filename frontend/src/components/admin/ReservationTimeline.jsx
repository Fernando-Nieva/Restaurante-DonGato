import { useMemo } from 'react';
import {
    RESERVATION_STATUS,
    RESERVATION_STATUS_COLORS,
    RESERVATION_STATUS_LABELS,
} from '../../constants/reservationStatus';
import styles from './ReservationTimeline.module.css';

const HOUR_WIDTH = 64;
const LABEL_WIDTH = 88;
const LANE_HEIGHT = 28;
const BLOCK_TOP = 5;

const readNumber = (value, fallback) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const START_HOUR = Math.min(
    Math.max(Math.trunc(readNumber(import.meta.env.VITE_RESERVATION_TIMELINE_START, 12)), 0),
    23,
);
const END_HOUR = Math.min(
    Math.max(
        Math.trunc(readNumber(import.meta.env.VITE_RESERVATION_TIMELINE_END, 24)),
        START_HOUR + 1,
    ),
    24,
);
const DURATION_MINUTES = Math.max(
    Math.trunc(readNumber(import.meta.env.VITE_RESERVATION_DURATION_MINUTES, 90)),
    15,
);

const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;
const INTERVALS = END_HOUR - START_HOUR;
const TIMELINE_STATUSES = new Set([
    RESERVATION_STATUS.Activa,
    RESERVATION_STATUS.Sentada,
]);

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const statusColor = (status) =>
    RESERVATION_STATUS_COLORS[normalizeStatus(status)] ?? 'var(--color-muted)';

const statusLabel = (status) =>
    RESERVATION_STATUS_LABELS[normalizeStatus(status)] ?? String(status ?? '');

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

const formatTime = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const tableNumber = (table) => table.number ?? table.name ?? table.id;

const minutesOfDay = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date.getHours() * 60 + date.getMinutes();
};

const layoutBlocks = (reservations) => {
    const blocks = reservations
        .map((reservation) => {
            const start = minutesOfDay(reservation.reserved_for);

            if (start == null) return null;

            const end = start + DURATION_MINUTES;
            const clippedStart = Math.max(start, START_MINUTES);
            const clippedEnd = Math.min(end, END_MINUTES);

            if (clippedEnd <= clippedStart) return null;

            return {
                id: reservation.id,
                customer_name: reservation.customer_name,
                reserved_for: reservation.reserved_for,
                status: normalizeStatus(reservation.status),
                start: clippedStart,
                end: clippedEnd,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);

    const laneEnds = [];

    blocks.forEach((block) => {
        let lane = laneEnds.findIndex((end) => block.start >= end);

        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(block.end);
        } else {
            laneEnds[lane] = block.end;
        }

        block.lane = lane;
    });

    return { blocks, laneCount: Math.max(laneEnds.length, 1) };
};

export default function ReservationTimeline({ tables = [], reservations = [] }) {
    const rows = useMemo(() => {
        const sortedTables = [...tables].sort(
            (a, b) => Number(a.number ?? a.id) - Number(b.number ?? b.id),
        );

        return sortedTables.map((table) => {
            const tableReservations = reservations.filter(
                (reservation) =>
                    String(reservation.table_id) === String(table.id) &&
                    TIMELINE_STATUSES.has(normalizeStatus(reservation.status)),
            );

            return {
                table,
                ...layoutBlocks(tableReservations),
            };
        });
    }, [reservations, tables]);

    const hasBlocks = rows.some((row) => row.blocks.length > 0);
    const hours = Array.from({ length: INTERVALS + 1 }, (_, index) => START_HOUR + index);

    return (
        <section className={styles.panel} aria-labelledby="reservation-timeline-title">
            <div className={styles.header}>
                <div>
                    <h2 id="reservation-timeline-title" className={styles.title}>
                        Línea de tiempo
                    </h2>
                    <p className={styles.subtitle}>
                        Reservas activas y sentadas por mesa · {hourLabel(START_HOUR)} a{' '}
                        {hourLabel(END_HOUR)}
                    </p>
                </div>

                <div className={styles.legend} aria-label="Referencias de la línea de tiempo">
                    {[RESERVATION_STATUS.Activa, RESERVATION_STATUS.Sentada].map((status) => (
                        <span key={status} className={styles.legendItem}>
                            <span
                                className={styles.legendDot}
                                style={{ '--legend-color': statusColor(status) }}
                                aria-hidden="true"
                            />
                            {statusLabel(status)}
                        </span>
                    ))}
                    <span className={styles.legendHint}>
                        Bloques de {DURATION_MINUTES} min
                    </span>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className={styles.empty}>No hay mesas activas para mostrar.</p>
            ) : (
                <>
                    <div className={styles.scroll}>
                        <div
                            className={styles.grid}
                            style={{
                                minWidth: `${LABEL_WIDTH + INTERVALS * HOUR_WIDTH}px`,
                                '--intervals': INTERVALS,
                            }}
                        >
                            <div className={styles.headerRow}>
                                <span className={styles.corner}>Mesa</span>
                                <div className={styles.scale}>
                                    {hours.map((hour, index) => (
                                        <span
                                            key={hour}
                                            className={`${styles.hourLabel} ${
                                                index === 0 ? styles.hourLabelFirst : ''
                                            } ${
                                                index === hours.length - 1
                                                    ? styles.hourLabelLast
                                                    : ''
                                            }`}
                                            style={{ left: `${(index / INTERVALS) * 100}%` }}
                                        >
                                            {hourLabel(hour)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {rows.map(({ table, blocks, laneCount }) => {
                                const height = Math.max(
                                    laneCount * LANE_HEIGHT + BLOCK_TOP * 2,
                                    40,
                                );

                                return (
                                    <div key={table.id} className={styles.row}>
                                        <span className={styles.tableLabel}>
                                            Mesa {tableNumber(table)}
                                        </span>
                                        <div
                                            className={styles.track}
                                            style={{ height: `${height}px` }}
                                            role="group"
                                            aria-label={`Reservas de mesa ${tableNumber(table)}`}
                                        >
                                            {blocks.map((block) => {
                                                const left =
                                                    ((block.start - START_MINUTES) /
                                                        TOTAL_MINUTES) *
                                                    100;
                                                const width =
                                                    ((block.end - block.start) /
                                                        TOTAL_MINUTES) *
                                                    100;

                                                return (
                                                    <span
                                                        key={block.id}
                                                        className={styles.block}
                                                        style={{
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                            top: `${
                                                                BLOCK_TOP +
                                                                block.lane * LANE_HEIGHT
                                                            }px`,
                                                            '--block-color': statusColor(
                                                                block.status,
                                                            ),
                                                        }}
                                                        title={`${formatTime(
                                                            block.reserved_for,
                                                        )} · ${block.customer_name} · ${statusLabel(
                                                            block.status,
                                                        )}`}
                                                    >
                                                        <span className={styles.blockName}>
                                                            {block.customer_name}
                                                        </span>
                                                        {width >= 8 && (
                                                            <span className={styles.blockTime}>
                                                                {formatTime(
                                                                    block.reserved_for,
                                                                )}
                                                            </span>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!hasBlocks && (
                        <p className={styles.hint}>
                            No hay reservas activas o sentadas dentro del horario mostrado.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
