import { useMemo, useState } from 'react';
import {
    ORDER_STATUS,
    ORDER_STATUS_COLORS,
    ORDER_STATUS_LABELS,
    TABLE_STATUS_COLORS,
    TABLE_STATUS_LABELS,
} from '../../constants/orderStatus';
import { useToast } from '../../context/ToastContext';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../services/api';
import { formatPrice } from '../../utils/formatPrice';
import { tableDisplayName } from '../../utils/table';
import AdminModal from './AdminModal';
import ConfirmDialog from './ConfirmDialog';
import ReservationForm from '../ReservationForm';
import TableStatusIcon from '../TableStatusIcon';
import styles from './AdminTablePanel.module.css';

const ACTIVE_ORDER_STATUSES = new Set([
    ORDER_STATUS.Pendiente,
    ORDER_STATUS.Preparando,
    ORDER_STATUS.Listo,
]);

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const formatTime = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

const itemName = (item) => item.product?.name ?? item.product_name ?? 'Producto';

const itemPrice = (item) =>
    Number(item.unit_price ?? item.price ?? item.product?.price ?? 0);

function SeatIcon() {
    return (
        <svg
            className={styles.seatIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" strokeLinecap="round" />
            <path d="M5 10h14l-1 6H6l-1-6Z" strokeLinejoin="round" />
            <path d="M7 16v4M17 16v4" strokeLinecap="round" />
        </svg>
    );
}

export default function AdminTablePanel({ table, orders = [], onClose, onRefresh }) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState(null);
    const [formBusy, setFormBusy] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const { addToast } = useToast();

    const tableStatus = normalizeStatus(table.status) || 'libre';
    const statusColor = TABLE_STATUS_COLORS[tableStatus] ?? 'var(--color-muted)';
    const statusLabel = TABLE_STATUS_LABELS[tableStatus] ?? tableStatus;
    const reservation = table.reservation ?? null;
    const nextReservation = table.next_reservation ?? null;
    const displayName = tableDisplayName(table);
    const formId = `reservation-form-${table.id}`;

    const activeOrders = useMemo(
        () =>
            orders.filter((order) => {
                const id = orderTableId(order);

                return (
                    id != null &&
                    String(id) === String(table.id) &&
                    ACTIVE_ORDER_STATUSES.has(normalizeStatus(order.status))
                );
            }),
        [orders, table.id],
    );

    const openCreate = () => {
        setEditingReservation(null);
        setFormOpen(true);
    };

    const openEdit = (target) => {
        setEditingReservation(target);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (formBusy) return;

        setFormOpen(false);
        setEditingReservation(null);
    };

    const handleSaved = () => {
        setFormOpen(false);
        setEditingReservation(null);
        onRefresh?.();
    };

    const openCancel = (target) => {
        setCancelTarget(target);
        setCancelError('');
        setCancelOpen(true);
    };

    const closeCancel = () => {
        if (cancelBusy) return;

        setCancelOpen(false);
        setCancelTarget(null);
        setCancelError('');
    };

    const handleCancelReservation = async () => {
        if (!cancelTarget || cancelBusy) return;

        setCancelBusy(true);
        setCancelError('');

        try {
            await adminApi.cancelReservation(cancelTarget.id);
            addToast({
                type: 'success',
                title: 'Reserva cancelada',
                message: `${displayName} · ${cancelTarget.customer_name}`,
            });
            setCancelOpen(false);
            setCancelTarget(null);
            onRefresh?.();
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                'No se pudo cancelar la reserva.',
            );

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

    const renderReservationCard = (target, title) => (
        <div className={styles.reservationCard}>
            <div className={styles.reservationTop}>
                <span className={styles.reservationBadge}>{title}</span>
                <span className={styles.reservationTime}>
                    {formatTime(target.reserved_for)}
                </span>
            </div>

            <p className={styles.reservationName}>{target.customer_name}</p>

            <p className={styles.reservationMeta}>
                {target.party_size} persona{Number(target.party_size) === 1 ? '' : 's'}
            </p>

            {target.phone && (
                <p className={styles.reservationMeta}>Tel. {target.phone}</p>
            )}

            {target.notes && <p className={styles.reservationNotes}>{target.notes}</p>}

            <div className={styles.reservationActions}>
                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openEdit(target)}
                >
                    Editar
                </button>
                <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => openCancel(target)}
                >
                    Cancelar reserva
                </button>
            </div>
        </div>
    );

    return (
        <aside
            className={styles.panel}
            aria-label={`Administración de ${displayName}`}
            data-table-panel
        >
            <div className={styles.grabber} aria-hidden="true" />

            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.title}>{displayName}</h2>
                    <p className={styles.subtitle}>
                        {table.seats != null && (
                            <span className={styles.seats}>
                                <SeatIcon />
                                {table.seats} asiento{table.seats === 1 ? '' : 's'}
                            </span>
                        )}
                        <span
                            className={styles.statusBadge}
                            style={{ '--status-color': statusColor }}
                        >
                            <TableStatusIcon
                                status={tableStatus}
                                className={styles.statusIcon}
                            />
                            {statusLabel}
                        </span>
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.close}
                    onClick={onClose}
                    aria-label="Cerrar panel"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                </button>
            </header>

            <div className={styles.content}>
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Reservas</h3>

                    {reservation ? (
                        renderReservationCard(reservation, 'Reserva actual')
                    ) : (
                        <p className={styles.empty}>La mesa no tiene una reserva activa.</p>
                    )}

                    {nextReservation &&
                        renderReservationCard(nextReservation, 'Próxima reserva')}
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Pedidos activos</h3>

                    {activeOrders.length === 0 ? (
                        <p className={styles.empty}>Sin pedidos activos.</p>
                    ) : (
                        <ul className={styles.orderList}>
                            {activeOrders.map((order) => {
                                const status = normalizeStatus(order.status);
                                const color =
                                    ORDER_STATUS_COLORS[status] ?? 'var(--color-muted)';
                                const items = Array.isArray(order.items) ? order.items : [];

                                return (
                                    <li key={order.id} className={styles.orderRow}>
                                        <div className={styles.orderTop}>
                                            <span className={styles.orderId}>#{order.id}</span>
                                            {order.created_at && (
                                                <span className={styles.orderTime}>
                                                    {formatTime(order.created_at)}
                                                </span>
                                            )}
                                            <span
                                                className={styles.orderStatus}
                                                style={{ '--status-color': color }}
                                            >
                                                {ORDER_STATUS_LABELS[status] ?? status}
                                            </span>
                                        </div>

                                        {items.length > 0 && (
                                            <ul className={styles.orderItems}>
                                                {items.map((item, index) => (
                                                    <li
                                                        key={item.id ?? `${order.id}-${index}`}
                                                        className={styles.orderItem}
                                                    >
                                                        <span className={styles.orderItemQty}>
                                                            {item.quantity}×
                                                        </span>
                                                        <span className={styles.orderItemName}>
                                                            {itemName(item)}
                                                        </span>
                                                        <span className={styles.orderItemPrice}>
                                                            {formatPrice(
                                                                itemPrice(item) *
                                                                    Number(item.quantity ?? 0),
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {order.total != null && (
                                            <p className={styles.orderTotal}>
                                                Total {formatPrice(order.total)}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>

            <footer className={styles.footer}>
                {reservation ? (
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => openEdit(reservation)}
                    >
                        Editar reserva
                    </button>
                ) : (
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={openCreate}
                    >
                        Reservar esta mesa
                    </button>
                )}
            </footer>

            <AdminModal
                open={formOpen}
                title={
                    editingReservation
                        ? `Editar reserva · ${displayName}`
                        : `Reservar ${displayName.toLowerCase()}`
                }
                onClose={closeForm}
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={closeForm}
                            disabled={formBusy}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form={formId}
                            className={styles.primaryButton}
                            disabled={formBusy}
                            aria-busy={formBusy}
                        >
                            {formBusy && (
                                <span className={styles.spinner} aria-hidden="true" />
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
                    table={table}
                    reservation={editingReservation}
                    formId={formId}
                    onSaved={handleSaved}
                    onBusyChange={setFormBusy}
                />
            </AdminModal>

            <ConfirmDialog
                open={cancelOpen}
                title="Cancelar reserva"
                message={
                    cancelTarget
                        ? `¿Cancelar la reserva de ${cancelTarget.customer_name} para ${displayName.toLowerCase()}?`
                        : ''
                }
                error={cancelError}
                confirmLabel="Cancelar reserva"
                cancelLabel="Volver"
                busy={cancelBusy}
                danger
                onConfirm={handleCancelReservation}
                onCancel={closeCancel}
            />
        </aside>
    );
}
