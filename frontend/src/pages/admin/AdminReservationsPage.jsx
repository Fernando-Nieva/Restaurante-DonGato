import { useEffect, useMemo, useState } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import ReservationForm from '../../components/ReservationForm';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminModal from '../../components/admin/AdminModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import ReservationTimeline from '../../components/admin/ReservationTimeline';
import adminStyles from '../../components/admin/admin.module.css';
import {
    RESERVATION_STATUS,
    RESERVATION_STATUS_COLORS,
    RESERVATION_STATUS_LABELS,
} from '../../constants/reservationStatus';
import { useToast } from '../../context/ToastContext';
import useAdminReservations from '../../hooks/useAdminReservations';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage, getFieldError } from '../../services/api';
import { toDateInputValue } from '../../utils/date';
import styles from './AdminReservationsPage.module.css';

const FORM_ID = 'admin-reservation-form';
const STATUS_OPTIONS = Object.values(RESERVATION_STATUS);

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const statusColor = (status) =>
    RESERVATION_STATUS_COLORS[normalizeStatus(status)] ?? 'var(--color-muted)';

const statusLabel = (status) =>
    RESERVATION_STATUS_LABELS[normalizeStatus(status)] ?? String(status ?? '');

const tableNumber = (reservation) =>
    reservation.table?.number ?? reservation.table_id;

const tableLabel = (reservation) => `Mesa ${tableNumber(reservation)}`;

const formatTime = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const shiftDate = (value, days) => {
    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    date.setDate(date.getDate() + days);

    return toDateInputValue(date);
};

const dayLabel = (value) => {
    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) return 'Reservas del día';

    const label = date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return label.charAt(0).toUpperCase() + label.slice(1);
};

function ReservationCard({ reservation, onEdit, onCancel }) {
    const status = normalizeStatus(reservation.status);
    const color = statusColor(status);
    const canManage = status === RESERVATION_STATUS.Activa;

    return (
        <li className={styles.card} style={{ '--card-color': color }}>
            <div className={styles.cardTop}>
                <time className={styles.cardTime} dateTime={reservation.reserved_for}>
                    {formatTime(reservation.reserved_for)}
                </time>

                <span
                    className={adminStyles.badge}
                    style={{ '--badge-color': color }}
                >
                    <span className={adminStyles.badgeDot} aria-hidden="true" />
                    {statusLabel(status)}
                </span>
            </div>

            <h3 className={styles.cardName}>{reservation.customer_name}</h3>

            <dl className={styles.meta}>
                <div className={styles.metaItem}>
                    <dt>Personas</dt>
                    <dd>{reservation.party_size}</dd>
                </div>
                <div className={styles.metaItem}>
                    <dt>Mesa</dt>
                    <dd>{tableNumber(reservation)}</dd>
                </div>
                {reservation.phone && (
                    <div className={styles.metaItem}>
                        <dt>Teléfono</dt>
                        <dd>
                            <a href={`tel:${reservation.phone}`}>{reservation.phone}</a>
                        </dd>
                    </div>
                )}
            </dl>

            {reservation.notes && (
                <p className={styles.notes}>{reservation.notes}</p>
            )}

            {canManage && (
                <div className={styles.cardActions}>
                    <button
                        type="button"
                        className={`${adminStyles.buttonSecondary} ${adminStyles.buttonSmall}`}
                        onClick={() => onEdit(reservation)}
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        className={`${adminStyles.buttonGhost} ${adminStyles.buttonSmall} ${styles.cancelButton}`}
                        onClick={() => onCancel(reservation)}
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </li>
    );
}

export default function AdminReservationsPage() {
    const { addToast } = useToast();
    const today = toDateInputValue();
    const [date, setDate] = useState(today);
    const [statusFilter, setStatusFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [tables, setTables] = useState([]);
    const [tablesLoading, setTablesLoading] = useState(true);
    const [tablesError, setTablesError] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const [formOpen, setFormOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState(null);
    const [formBusy, setFormBusy] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const { reservations, loading, error, refresh } = useAdminReservations(date);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 60000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        let active = true;

        setTablesLoading(true);

        adminApi
            .listTables()
            .then((data) => {
                if (!active) return;

                setTables(data);
                setTablesError(null);
            })
            .catch((loadError) => {
                if (!active) return;

                console.error('No se pudieron cargar las mesas para reservas:', loadError);
                setTablesError(loadError);
                addToast({
                    type: 'error',
                    title: 'No se pudieron cargar las mesas',
                    message: getApiErrorMessage(loadError),
                });
            })
            .finally(() => {
                if (active) setTablesLoading(false);
            });

        return () => {
            active = false;
        };
    }, [addToast]);

    const sortedTables = useMemo(
        () =>
            [...tables].sort(
                (a, b) => Number(a.number ?? a.id) - Number(b.number ?? b.id),
            ),
        [tables],
    );

    const filterTables = useMemo(() => {
        const byId = new Map(
            sortedTables.map((table) => [String(table.id), table]),
        );

        reservations.forEach((reservation) => {
            if (
                reservation.table &&
                !byId.has(String(reservation.table.id))
            ) {
                byId.set(String(reservation.table.id), reservation.table);
            }
        });

        return [...byId.values()].sort(
            (a, b) => Number(a.number ?? a.id) - Number(b.number ?? b.id),
        );
    }, [reservations, sortedTables]);

    const filtered = useMemo(
        () =>
            reservations.filter(
                (reservation) =>
                    (!statusFilter ||
                        normalizeStatus(reservation.status) === statusFilter) &&
                    (!tableFilter ||
                        String(reservation.table_id) === String(tableFilter)),
            ),
        [reservations, statusFilter, tableFilter],
    );

    const pendingToday = useMemo(() => {
        if (date !== today) return [];

        return reservations.filter(
            (reservation) =>
                normalizeStatus(reservation.status) === RESERVATION_STATUS.Activa &&
                new Date(reservation.reserved_for).getTime() >= now,
        );
    }, [date, now, reservations, today]);

    const nextToday = pendingToday[0] ?? null;
    const hasFilters = Boolean(statusFilter || tableFilter);
    const canCreate = !tablesLoading && sortedTables.length > 0;

    const changeDate = (nextDate) => {
        if (!nextDate) return;

        setDate(nextDate);
        setStatusFilter('');
        setTableFilter('');
    };

    const clearFilters = () => {
        setStatusFilter('');
        setTableFilter('');
    };

    const openCreate = () => {
        setEditingReservation(null);
        setFormOpen(true);
    };

    const openEdit = (reservation) => {
        setEditingReservation(reservation);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (formBusy) return;

        setFormOpen(false);
        setEditingReservation(null);
    };

    const handleSaved = (result) => {
        const saved = result?.data ?? result;

        setFormOpen(false);
        setEditingReservation(null);

        const savedDate = saved?.reserved_for
            ? toDateInputValue(new Date(saved.reserved_for))
            : '';

        if (savedDate && savedDate !== date) {
            setDate(savedDate);
            setStatusFilter('');
            setTableFilter('');

            return;
        }

        void refresh({ silent: true });
    };

    const openCancel = (reservation) => {
        setCancelTarget(reservation);
        setCancelError('');
    };

    const closeCancel = () => {
        if (cancelBusy) return;

        setCancelTarget(null);
        setCancelError('');
    };

    const handleCancel = async () => {
        if (!cancelTarget || cancelBusy) return;

        setCancelBusy(true);
        setCancelError('');

        try {
            await adminApi.cancelReservation(cancelTarget.id);
            addToast({
                type: 'success',
                title: 'Reserva cancelada',
                message: `${tableLabel(cancelTarget)} · ${cancelTarget.customer_name}`,
            });
            setCancelTarget(null);
            void refresh({ silent: true });
        } catch (cancelLoadError) {
            const message =
                getFieldError(cancelLoadError, 'reservation') ??
                getApiErrorMessage(cancelLoadError, 'No se pudo cancelar la reserva.');

            setCancelError(message);
            addToast({
                type: 'error',
                title: 'No se pudo cancelar la reserva',
                message,
            });
        } finally {
            setCancelBusy(false);
        }
    };

    return (
        <div className={adminStyles.page}>
            <header className={adminStyles.header}>
                <div className={adminStyles.headerText}>
                    <h1 className={adminStyles.title}>Reservas</h1>
                    <p className={adminStyles.subtitle}>
                        Gestioná las reservas del día, evitá superposiciones y seguí el
                        estado en vivo.
                    </p>
                </div>

                <div className={adminStyles.headerActions}>
                    <button
                        type="button"
                        className={adminStyles.buttonSecondary}
                        onClick={() => refresh({ silent: true })}
                        disabled={loading}
                    >
                        Actualizar
                    </button>
                    <button
                        type="button"
                        className={adminStyles.buttonPrimary}
                        onClick={openCreate}
                        disabled={!canCreate}
                        title={
                            canCreate
                                ? undefined
                                : 'Necesitás al menos una mesa activa para reservar'
                        }
                    >
                        Nueva reserva
                    </button>
                </div>
            </header>

            <section className={adminStyles.toolbar}>
                <div className={styles.dateControls}>
                    <button
                        type="button"
                        className={styles.dateButton}
                        onClick={() => changeDate(shiftDate(date, -1))}
                        aria-label="Día anterior"
                    >
                        ‹
                    </button>

                    <div className={styles.dateField}>
                        <label htmlFor="reservations-date">Fecha</label>
                        <input
                            id="reservations-date"
                            type="date"
                            className={adminStyles.input}
                            value={date}
                            onChange={(event) => changeDate(event.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        className={styles.dateButton}
                        onClick={() => changeDate(shiftDate(date, 1))}
                        aria-label="Día siguiente"
                    >
                        ›
                    </button>

                    <button
                        type="button"
                        className={`${adminStyles.buttonSecondary} ${adminStyles.buttonSmall}`}
                        onClick={() => changeDate(today)}
                        disabled={date === today}
                    >
                        Hoy
                    </button>
                </div>

                <div className={styles.filters}>
                    <div className={adminStyles.field}>
                        <label htmlFor="reservations-status">Estado</label>
                        <select
                            id="reservations-status"
                            className={adminStyles.select}
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                        >
                            <option value="">Todos</option>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {RESERVATION_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={adminStyles.field}>
                        <label htmlFor="reservations-table">Mesa</label>
                        <select
                            id="reservations-table"
                            className={adminStyles.select}
                            value={tableFilter}
                            disabled={tablesLoading || filterTables.length === 0}
                            onChange={(event) => setTableFilter(event.target.value)}
                        >
                            <option value="">Todas</option>
                            {filterTables.map((table) => (
                                <option key={table.id} value={table.id}>
                                    Mesa {table.number}
                                </option>
                            ))}
                        </select>
                    </div>

                    {hasFilters && (
                        <button
                            type="button"
                            className={`${adminStyles.buttonGhost} ${adminStyles.buttonSmall} ${styles.clearFilters}`}
                            onClick={clearFilters}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {tablesError && (
                    <p
                        className={`${adminStyles.fieldError} ${styles.tablesError}`}
                        role="alert"
                    >
                        {getApiErrorMessage(tablesError)}
                    </p>
                )}
            </section>

            <div className={styles.dateHeading}>
                <h2 className={styles.dateTitle}>{dayLabel(date)}</h2>
                <span className={styles.dateCount}>
                    {filtered.length} reserva{filtered.length === 1 ? '' : 's'}
                    {hasFilters ? ' con filtros' : ''}
                </span>
            </div>

            {date === today && !loading && !error && (
                <section className={styles.todayCard} aria-label="Reservas pendientes de hoy">
                    <div className={styles.todayCount}>
                        <span className={styles.todayNumber}>{pendingToday.length}</span>
                        <span className={styles.todayLabel}>
                            reserva{pendingToday.length === 1 ? '' : 's'} pendiente
                            {pendingToday.length === 1 ? '' : 's'} hoy
                        </span>
                    </div>

                    <p className={styles.nextInfo}>
                        {nextToday ? (
                            <>
                                Próxima:{' '}
                                <strong>
                                    {formatTime(nextToday.reserved_for)}{' '}
                                    {nextToday.customer_name}
                                </strong>
                                , mesa {tableNumber(nextToday)}
                            </>
                        ) : (
                            'No quedan reservas pendientes para hoy.'
                        )}
                    </p>
                </section>
            )}

            {loading && <PageLoader label="Cargando reservas…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar las reservas"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refresh()}
                />
            )}

            {!loading && !error && (
                <>
                    <section className={styles.listSection}>
                        <div className={adminStyles.sectionHeader}>
                            <div>
                                <h2 className={adminStyles.sectionTitle}>
                                    Reservas del día
                                </h2>
                                <p className={adminStyles.sectionHint}>
                                    Ordenadas por hora.
                                </p>
                            </div>
                            <span className={styles.sectionCount}>
                                {filtered.length} en pantalla
                            </span>
                        </div>

                        {filtered.length === 0 ? (
                            <AdminEmptyState
                                title={
                                    hasFilters
                                        ? 'Sin resultados para estos filtros'
                                        : 'Sin reservas para este día'
                                }
                                message={
                                    hasFilters
                                        ? 'Probá con otro estado, otra mesa o limpiá los filtros.'
                                        : sortedTables.length === 0
                                          ? 'Primero creá o activá una mesa para poder registrar reservas.'
                                          : 'Creá la primera reserva para este día y quedará visible en la línea de tiempo.'
                                }
                                action={
                                    hasFilters ? (
                                        <button
                                            type="button"
                                            className={adminStyles.buttonSecondary}
                                            onClick={clearFilters}
                                        >
                                            Limpiar filtros
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={adminStyles.buttonPrimary}
                                            onClick={openCreate}
                                            disabled={!canCreate}
                                        >
                                            Nueva reserva
                                        </button>
                                    )
                                }
                            />
                        ) : (
                            <ul className={styles.cardGrid}>
                                {filtered.map((reservation) => (
                                    <ReservationCard
                                        key={reservation.id}
                                        reservation={reservation}
                                        onEdit={openEdit}
                                        onCancel={openCancel}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {tablesLoading ? (
                        <p className={styles.timelineLoading}>Cargando mesas…</p>
                    ) : (
                        <ReservationTimeline
                            tables={sortedTables}
                            reservations={reservations}
                        />
                    )}
                </>
            )}

            <AdminModal
                open={formOpen}
                title={editingReservation ? 'Editar reserva' : 'Nueva reserva'}
                onClose={closeForm}
                size="wide"
                footer={
                    <>
                        <button
                            type="button"
                            className={adminStyles.buttonSecondary}
                            onClick={closeForm}
                            disabled={formBusy}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            className={adminStyles.buttonPrimary}
                            disabled={formBusy}
                            aria-busy={formBusy}
                        >
                            {formBusy && (
                                <span className={adminStyles.spinner} aria-hidden="true" />
                            )}
                            {formBusy
                                ? 'Guardando…'
                                : editingReservation
                                  ? 'Guardar cambios'
                                  : 'Crear reserva'}
                        </button>
                    </>
                }
            >
                <ReservationForm
                    tables={sortedTables}
                    reservation={editingReservation}
                    formId={FORM_ID}
                    defaultDate={date}
                    onSaved={handleSaved}
                    onBusyChange={setFormBusy}
                />
            </AdminModal>

            <ConfirmDialog
                open={Boolean(cancelTarget)}
                title="Cancelar reserva"
                message={
                    cancelTarget
                        ? `¿Cancelar la reserva de ${cancelTarget.customer_name} (${formatTime(cancelTarget.reserved_for)}), ${tableLabel(cancelTarget)}?`
                        : ''
                }
                error={cancelError}
                confirmLabel="Cancelar reserva"
                cancelLabel="Volver"
                busy={cancelBusy}
                danger
                onConfirm={handleCancel}
                onCancel={closeCancel}
            />
        </div>
    );
}
