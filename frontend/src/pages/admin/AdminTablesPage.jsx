import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminModal from '../../components/admin/AdminModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import TableFloorPlan, {
    findTableCollisions,
} from '../../components/admin/TableFloorPlan';
import styles from '../../components/admin/admin.module.css';
import { TABLE_STATUS_COLORS, TABLE_STATUS_LABELS } from '../../constants/orderStatus';
import { useToast } from '../../context/ToastContext';
import { getEcho, subscribeToEcho } from '../../lib/echo';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage, getFieldError } from '../../services/api';

const EMPTY_FORM = {
    number: '',
    seats: '4',
    pos_x: '0',
    pos_z: '0',
};

const statusTone = (status) =>
    TABLE_STATUS_COLORS[String(status ?? '').toLowerCase()] ?? 'var(--color-muted)';

const statusLabel = (status) =>
    TABLE_STATUS_LABELS[String(status ?? '').toLowerCase()] ??
    String(status ?? 'Sin estado');

const formFromTable = (table) => ({
    number: table?.number != null ? String(table.number) : '',
    seats: table?.seats != null ? String(table.seats) : '4',
    pos_x: table?.pos_x != null ? String(Number(table.pos_x)) : '0',
    pos_z: table?.pos_z != null ? String(Number(table.pos_z)) : '0',
});

const sortTables = (tables) =>
    [...tables].sort((a, b) => Number(a.number ?? 0) - Number(b.number ?? 0));

const upsertTable = (tables, incoming) => {
    const index = tables.findIndex((table) => String(table.id) === String(incoming.id));

    if (index === -1) return [...tables, incoming];

    return tables.map((table, position) =>
        position === index ? { ...table, ...incoming } : table,
    );
};

export default function AdminTablesPage() {
    const { addToast } = useToast();
    const echo = useSyncExternalStore(subscribeToEcho, getEcho);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [tableToDelete, setTableToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const draftPosition = useMemo(() => {
        const x = Number(form.pos_x);
        const z = Number(form.pos_z);

        if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

        return { x, z };
    }, [form.pos_x, form.pos_z]);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError(null);

        adminApi
            .listTables()
            .then((list) => {
                if (active) setTables(sortTables(list));
            })
            .catch((loadError) => {
                if (active) {
                    console.error('No se pudieron cargar las mesas:', loadError);
                    setError(loadError);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [reloadKey]);

    useEffect(() => {
        if (!echo) return undefined;

        let active = true;
        const channel = echo.private('restaurant');

        const refreshTables = async () => {
            try {
                const list = await adminApi.listTables();

                if (active) {
                    setTables(sortTables(list));
                    setError(null);
                }
            } catch (refreshError) {
                console.error('No se pudieron actualizar las mesas en tiempo real:', refreshError);
            }
        };

        const handleTablesUpdated = (payload) => {
            const tableId = payload?.table_id;
            const action = String(payload?.action ?? '').toLowerCase();

            if (
                tableId != null &&
                (action === 'deleted' || action === 'deactivated' || payload?.is_active === false)
            ) {
                setTables((current) =>
                    current.filter((table) => String(table.id) !== String(tableId)),
                );
                return;
            }

            void refreshTables();
        };

        channel.listen('TablesUpdated', handleTablesUpdated);

        return () => {
            active = false;
            channel.stopListening('TablesUpdated', handleTablesUpdated);
        };
    }, [echo]);

    const openCreateModal = () => {
        setEditingTable(null);
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (table) => {
        setEditingTable(table);
        setForm(formFromTable(table));
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingTable(null);
        setFieldErrors({});
        setFormError('');
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handlePlanPositionChange = ({ x, z }) => {
        setForm((current) => ({
            ...current,
            pos_x: x.toFixed(2),
            pos_z: z.toFixed(2),
        }));
        setFieldErrors((current) => ({
            ...current,
            pos_x: undefined,
            pos_z: undefined,
        }));
        setFormError('');
    };

    const validateForm = () => {
        const errors = {};
        const number = Number(form.number);
        const seats = Number(form.seats);
        const posX = Number(form.pos_x);
        const posZ = Number(form.pos_z);

        if (form.number === '' || !Number.isInteger(number) || number < 1) {
            errors.number = 'Ingresá un número de mesa mayor a cero.';
        }

        if (!Number.isInteger(seats) || seats < 1 || seats > 12) {
            errors.seats = 'La cantidad de asientos debe estar entre 1 y 12.';
        }

        if (!Number.isFinite(posX) || posX < -8 || posX > 8) {
            errors.pos_x = 'La posición X debe estar entre -8 y 8.';
        }

        if (!Number.isFinite(posZ) || posZ < -6 || posZ > 6) {
            errors.pos_z = 'La posición Z debe estar entre -6 y 6.';
        }

        if (!errors.pos_x && !errors.pos_z) {
            const collisions = findTableCollisions(
                { x: posX, z: posZ },
                tables,
                editingTable?.id ?? null,
            );

            if (collisions.length > 0) {
                errors.pos_x = `Queda a menos de 3 m de ${collisions
                    .map((collision) => `Mesa ${collision.table.number}`)
                    .join(', ')}.`;
            }
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError('');

        if (!validateForm()) return;

        const payload = {
            number: Number(form.number),
            seats: Number(form.seats),
            pos_x: Number(form.pos_x),
            pos_z: Number(form.pos_z),
        };

        setSaving(true);

        try {
            if (editingTable) {
                const updated = await adminApi.updateTable(editingTable.id, payload);

                setTables((current) => sortTables(upsertTable(current, updated)));

                addToast({
                    type: 'success',
                    title: 'Mesa actualizada',
                    message: `La mesa ${payload.number} se guardó correctamente.`,
                });
            } else {
                const created = await adminApi.createTable(payload);

                setTables((current) =>
                    sortTables(
                        upsertTable(current, { ...created, status: created.status ?? 'libre' }),
                    ),
                );

                addToast({
                    type: 'success',
                    title: 'Mesa creada',
                    message: `La mesa ${payload.number} ya está disponible en el salón.`,
                });
            }

            setModalOpen(false);
            setEditingTable(null);
        } catch (submitError) {
            console.error('No se pudo guardar la mesa:', submitError);

            const positionError = getFieldError(submitError, 'position');

            setFieldErrors({
                number: getFieldError(submitError, 'number') ?? undefined,
                seats: getFieldError(submitError, 'seats') ?? undefined,
                pos_x: getFieldError(submitError, 'pos_x') ?? undefined,
                pos_z: getFieldError(submitError, 'pos_z') ?? undefined,
            });
            setFormError(
                positionError ??
                    getFieldError(submitError, 'table') ??
                    getApiErrorMessage(submitError, 'No se pudo guardar la mesa.'),
            );
        } finally {
            setSaving(false);
        }
    };

    const openDeleteDialog = (table) => {
        setDeleteError('');
        setTableToDelete(table);
    };

    const confirmDelete = async () => {
        if (!tableToDelete) return;

        setDeleting(true);
        setDeleteError('');

        try {
            const result = await adminApi.deleteTable(tableToDelete.id);

            setTables((current) =>
                current.filter((table) => String(table.id) !== String(tableToDelete.id)),
            );

            addToast({
                type: 'success',
                title: result ? 'Mesa desactivada' : 'Mesa eliminada',
                message: result
                    ? `La mesa ${tableToDelete.number} conserva su historial y quedó fuera del salón.`
                    : `La mesa ${tableToDelete.number} se eliminó del salón.`,
            });
            setTableToDelete(null);
        } catch (deleteFailure) {
            console.error('No se pudo quitar la mesa:', deleteFailure);

            const message =
                getFieldError(deleteFailure, 'table') ??
                getApiErrorMessage(deleteFailure, 'No se pudo quitar la mesa.');

            setDeleteError(message);
            addToast({
                type: 'error',
                title: 'No se pudo quitar la mesa',
                message,
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Mesas</h1>
                    <p className={styles.subtitle}>
                        Configurá la capacidad y ubicación de las mesas activas.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setReloadKey((key) => key + 1)}
                        disabled={loading}
                    >
                        Actualizar
                    </button>
                    <button
                        type="button"
                        className={styles.buttonPrimary}
                        onClick={openCreateModal}
                    >
                        Nueva mesa
                    </button>
                </div>
            </header>

            {loading && <PageLoader label="Cargando las mesas…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar las mesas"
                    message={getApiErrorMessage(error)}
                    onRetry={() => setReloadKey((key) => key + 1)}
                />
            )}

            {!loading && !error && tables.length === 0 && (
                <AdminEmptyState
                    title="No hay mesas activas"
                    message="Creá la primera mesa para que aparezca en el salón."
                    action={
                        <button
                            type="button"
                            className={styles.buttonPrimary}
                            onClick={openCreateModal}
                        >
                            Nueva mesa
                        </button>
                    }
                />
            )}

            {!loading && !error && tables.length > 0 && (
                <div className={styles.tablesLayout}>
                    <div className={styles.tablesList}>
                        <div className={styles.tableWrap}>
                            <table className={`${styles.table} ${styles.tableTables}`}>
                                <thead>
                                    <tr>
                                        <th scope="col">Mesa</th>
                                        <th scope="col">Asientos</th>
                                        <th scope="col">Posición</th>
                                        <th scope="col">Estado</th>
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.map((table) => (
                                        <tr key={table.id}>
                                            <td>
                                                <span className={styles.cellStrong}>
                                                    Mesa {table.number}
                                                </span>
                                            </td>
                                            <td>{table.seats}</td>
                                            <td>
                                                <span className={styles.cellMuted}>
                                                    X {Number(table.pos_x).toFixed(2)} · Z{' '}
                                                    {Number(table.pos_z).toFixed(2)}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={styles.badge}
                                                    style={{
                                                        '--badge-color': statusTone(table.status),
                                                    }}
                                                >
                                                    <span
                                                        className={styles.badgeDot}
                                                        aria-hidden="true"
                                                    />
                                                    {statusLabel(table.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                        onClick={() => openEditModal(table)}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.buttonDanger} ${styles.buttonSmall}`}
                                                        onClick={() => openDeleteDialog(table)}
                                                    >
                                                        Quitar mesa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className={styles.mobileList}>
                            {tables.map((table) => (
                                <li key={table.id} className={styles.itemCard}>
                                    <div className={styles.itemCardHeader}>
                                        <h2 className={styles.itemCardTitle}>
                                            Mesa {table.number}
                                        </h2>
                                        <span
                                            className={styles.badge}
                                            style={{ '--badge-color': statusTone(table.status) }}
                                        >
                                            <span
                                                className={styles.badgeDot}
                                                aria-hidden="true"
                                            />
                                            {statusLabel(table.status)}
                                        </span>
                                    </div>

                                    <p className={styles.itemCardText}>
                                        {table.seats} asientos · X{' '}
                                        {Number(table.pos_x).toFixed(2)} · Z{' '}
                                        {Number(table.pos_z).toFixed(2)}
                                    </p>

                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                            onClick={() => openEditModal(table)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.buttonDanger} ${styles.buttonSmall}`}
                                            onClick={() => openDeleteDialog(table)}
                                        >
                                            Quitar mesa
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <aside className={styles.planPanel}>
                        <div className={styles.planPanelHeader}>
                            <h2 className={styles.planPanelTitle}>Plano del salón</h2>
                            <p className={styles.planPanelHint}>
                                Hacé clic en una mesa para editarla. Cada cuadro representa 1
                                metro y el círculo punteado marca los 3 metros mínimos.
                            </p>
                        </div>
                        <TableFloorPlan tables={tables} onTableSelect={openEditModal} />
                    </aside>
                </div>
            )}

            <AdminModal
                open={modalOpen}
                title={editingTable ? `Editar mesa ${editingTable.number}` : 'Nueva mesa'}
                onClose={closeModal}
                size="wide"
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="table-form"
                            className={styles.buttonPrimary}
                            disabled={saving}
                            aria-busy={saving}
                        >
                            {saving && <span className={styles.spinner} aria-hidden="true" />}
                            {saving ? 'Guardando…' : 'Guardar mesa'}
                        </button>
                    </>
                }
            >
                <form id="table-form" className={styles.form} onSubmit={handleSubmit} noValidate>
                    {formError && (
                        <p className={styles.formError} role="alert">
                            {formError}
                        </p>
                    )}

                    <div className={styles.tableEditorGrid}>
                        <div className={styles.tableEditorFields}>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label htmlFor="table-number">Número de mesa</label>
                                    <input
                                        id="table-number"
                                        type="number"
                                        className={styles.input}
                                        value={form.number}
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        aria-invalid={Boolean(fieldErrors.number)}
                                        onChange={(event) =>
                                            updateForm('number', event.target.value)
                                        }
                                        placeholder="1"
                                    />
                                    {fieldErrors.number && (
                                        <p className={styles.fieldError}>
                                            {fieldErrors.number}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.field}>
                                    <label htmlFor="table-seats">Asientos</label>
                                    <input
                                        id="table-seats"
                                        type="number"
                                        className={styles.input}
                                        value={form.seats}
                                        min="1"
                                        max="12"
                                        step="1"
                                        inputMode="numeric"
                                        aria-invalid={Boolean(fieldErrors.seats)}
                                        onChange={(event) =>
                                            updateForm('seats', event.target.value)
                                        }
                                    />
                                    {fieldErrors.seats ? (
                                        <p className={styles.fieldError}>{fieldErrors.seats}</p>
                                    ) : (
                                        <p className={styles.help}>Entre 1 y 12 asientos.</p>
                                    )}
                                </div>

                                <div className={styles.field}>
                                    <label htmlFor="table-pos-x">Posición X</label>
                                    <input
                                        id="table-pos-x"
                                        type="number"
                                        className={styles.input}
                                        value={form.pos_x}
                                        min="-8"
                                        max="8"
                                        step="0.01"
                                        inputMode="decimal"
                                        aria-invalid={Boolean(fieldErrors.pos_x)}
                                        onChange={(event) =>
                                            updateForm('pos_x', event.target.value)
                                        }
                                    />
                                    {fieldErrors.pos_x ? (
                                        <p className={styles.fieldError}>
                                            {fieldErrors.pos_x}
                                        </p>
                                    ) : (
                                        <p className={styles.help}>Entre -8 y 8 metros.</p>
                                    )}
                                </div>

                                <div className={styles.field}>
                                    <label htmlFor="table-pos-z">Posición Z</label>
                                    <input
                                        id="table-pos-z"
                                        type="number"
                                        className={styles.input}
                                        value={form.pos_z}
                                        min="-6"
                                        max="6"
                                        step="0.01"
                                        inputMode="decimal"
                                        aria-invalid={Boolean(fieldErrors.pos_z)}
                                        onChange={(event) =>
                                            updateForm('pos_z', event.target.value)
                                        }
                                    />
                                    {fieldErrors.pos_z ? (
                                        <p className={styles.fieldError}>
                                            {fieldErrors.pos_z}
                                        </p>
                                    ) : (
                                        <p className={styles.help}>Entre -6 y 6 metros.</p>
                                    )}
                                </div>
                            </div>

                            <p className={styles.help}>
                                La mesa debe quedar al menos a 3 metros de otra mesa activa.
                                También podés hacer clic sobre el plano para ubicarla.
                            </p>
                        </div>

                        <div className={styles.tableEditorPlan}>
                            <div className={styles.planPanel}>
                                <div className={styles.planPanelHeader}>
                                    <h3 className={styles.planPanelTitle}>Ubicación</h3>
                                    <p className={styles.planPanelHint}>
                                        Hacé clic en el plano para mover la mesa en edición.
                                    </p>
                                </div>
                                <TableFloorPlan
                                    tables={tables}
                                    selectedTableId={editingTable?.id ?? null}
                                    draftPosition={draftPosition}
                                    draftLabel={form.number || 'Nueva'}
                                    onPositionChange={handlePlanPositionChange}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </AdminModal>

            <ConfirmDialog
                open={Boolean(tableToDelete)}
                title="Quitar mesa"
                message={
                    tableToDelete
                        ? `¿Querés quitar la mesa ${tableToDelete.number}? Si tiene historial de pedidos se desactivará en lugar de borrarse.`
                        : ''
                }
                error={deleteError}
                confirmLabel="Quitar mesa"
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!deleting) {
                        setTableToDelete(null);
                        setDeleteError('');
                    }
                }}
                busy={deleting}
                danger
            />
        </div>
    );
}
