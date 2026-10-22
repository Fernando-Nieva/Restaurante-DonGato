import { useEffect, useMemo, useState } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminModal from '../../components/admin/AdminModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import PasswordInput from '../../components/admin/PasswordInput';
import styles from '../../components/admin/admin.module.css';
import { USER_ROLE_LABELS, USER_ROLES } from '../../constants/admin';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage, getFieldError } from '../../services/api';

const ROLE_COLORS = {
    mozo: 'var(--color-success)',
    cocina: 'var(--color-orange)',
    admin: 'var(--color-brown)',
};

const EMPTY_FORM = {
    name: '',
    email: '',
    role: 'mozo',
    password: '',
};

const sortUsers = (users) =>
    [...users].sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
            sensitivity: 'base',
        }),
    );

export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [passwordUser, setPasswordUser] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ password: '', repeat: '' });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordError, setPasswordError] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError(null);

        adminApi
            .listUsers()
            .then((list) => {
                if (active) setUsers(sortUsers(list));
            })
            .catch((loadError) => {
                if (active) {
                    console.error('No se pudieron cargar los usuarios:', loadError);
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

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        return users.filter((user) => {
            if (roleFilter !== 'all' && user.role !== roleFilter) return false;

            if (!term) return true;

            return (
                String(user.name ?? '').toLowerCase().includes(term) ||
                String(user.email ?? '').toLowerCase().includes(term)
            );
        });
    }, [users, search, roleFilter]);

    const activeAdminCount = useMemo(
        () =>
            users.filter((user) => user.role === 'admin' && Boolean(user.is_active)).length,
        [users],
    );

    const isCurrentUser = (user) =>
        currentUser?.id != null && String(user.id) === String(currentUser.id);

    const editingSelf = Boolean(editingUser && isCurrentUser(editingUser));

    const deactivationBlockReason = (user) => {
        if (isCurrentUser(user)) return 'No podés desactivar tu propia cuenta.';

        if (user.role === 'admin' && Boolean(user.is_active) && activeAdminCount <= 1) {
            return 'Debe quedar al menos un administrador activo.';
        }

        return '';
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setForm({
            name: user.name ?? '',
            email: user.email ?? '',
            role: user.role ?? 'mozo',
            password: '',
        });
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingUser(null);
        setFieldErrors({});
        setFormError('');
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validateForm = () => {
        const errors = {};
        const name = form.name.trim();
        const email = form.email.trim();

        if (!name) errors.name = 'Ingresá el nombre del usuario.';
        else if (name.length > 255) errors.name = 'El nombre no puede superar 255 caracteres.';

        if (!email) {
            errors.email = 'Ingresá el correo electrónico.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Ingresá un correo electrónico válido.';
        } else if (email.length > 255) {
            errors.email = 'El correo no puede superar 255 caracteres.';
        }

        if (!USER_ROLES.some((role) => role.value === form.role)) {
            errors.role = 'Seleccioná un rol válido.';
        } else if (editingSelf && form.role !== 'admin') {
            errors.role = 'No podés quitarte el rol de administrador.';
        }

        if ((!editingUser || form.password.length > 0) && form.password.length < 8) {
            errors.password = 'La contraseña debe tener al menos 8 caracteres.';
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError('');

        if (!validateForm()) return;

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
        };

        setSaving(true);

        try {
            if (editingUser) {
                const updated = await adminApi.updateUser(editingUser.id, payload);

                setUsers((current) =>
                    sortUsers(
                        current.map((user) =>
                            user.id === editingUser.id ? { ...user, ...updated } : user,
                        ),
                    ),
                );

                if (form.password) {
                    await adminApi.updateUserPassword(editingUser.id, form.password);
                }

                addToast({
                    type: 'success',
                    title: 'Usuario actualizado',
                    message: form.password
                        ? `${payload.name} se guardó y su contraseña se actualizó.`
                        : `${payload.name} se guardó correctamente.`,
                });
            } else {
                const created = await adminApi.createUser({
                    ...payload,
                    password: form.password,
                });

                setUsers((current) => sortUsers([...current, created]));

                addToast({
                    type: 'success',
                    title: 'Usuario creado',
                    message: `${payload.name} ya puede iniciar sesión.`,
                });
            }

            setModalOpen(false);
            setEditingUser(null);
        } catch (submitError) {
            console.error('No se pudo guardar el usuario:', submitError);

            const message = getApiErrorMessage(
                submitError,
                'No se pudo guardar el usuario.',
            );

            setFieldErrors({
                name: getFieldError(submitError, 'name') ?? undefined,
                email: getFieldError(submitError, 'email') ?? undefined,
                role: getFieldError(submitError, 'role') ?? undefined,
                password: getFieldError(submitError, 'password') ?? undefined,
            });
            setFormError(message);
            addToast({
                type: 'error',
                title: 'No se pudo guardar el usuario',
                message,
            });
        } finally {
            setSaving(false);
        }
    };

    const openPasswordModal = (user) => {
        setPasswordUser(user);
        setPasswordForm({ password: '', repeat: '' });
        setPasswordErrors({});
        setPasswordError('');
    };

    const closePasswordModal = () => {
        if (savingPassword) return;

        setPasswordUser(null);
        setPasswordErrors({});
        setPasswordError('');
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setPasswordError('');

        const errors = {};

        if (passwordForm.password.length < 8) {
            errors.password = 'La contraseña debe tener al menos 8 caracteres.';
        }

        if (passwordForm.password !== passwordForm.repeat) {
            errors.repeat = 'Las contraseñas no coinciden.';
        }

        setPasswordErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setSavingPassword(true);

        try {
            await adminApi.updateUserPassword(passwordUser.id, passwordForm.password);

            addToast({
                type: 'success',
                title: 'Contraseña actualizada',
                message: `Se cambió la contraseña de ${passwordUser.name}.`,
            });
            setPasswordUser(null);
        } catch (submitError) {
            console.error('No se pudo cambiar la contraseña:', submitError);

            const message = getApiErrorMessage(
                submitError,
                'No se pudo cambiar la contraseña.',
            );

            setPasswordErrors({
                password: getFieldError(submitError, 'password') ?? undefined,
            });
            setPasswordError(message);
            addToast({
                type: 'error',
                title: 'No se pudo cambiar la contraseña',
                message,
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const changeActive = async (user, isActive) => {
        setTogglingId(user.id);

        try {
            const updated = await adminApi.updateUserActive(user.id, isActive);

            setUsers((current) =>
                current.map((item) =>
                    item.id === user.id ? { ...item, ...updated } : item,
                ),
            );

            addToast({
                type: 'success',
                title: isActive ? 'Usuario activado' : 'Usuario desactivado',
                message: isActive
                    ? `${user.name} puede volver a iniciar sesión.`
                    : `${user.name} ya no puede iniciar sesión.`,
            });
        } catch (toggleError) {
            console.error('No se pudo cambiar el estado del usuario:', toggleError);
            addToast({
                type: 'error',
                title: 'No se pudo actualizar el usuario',
                message:
                    getFieldError(toggleError, 'is_active') ??
                    getApiErrorMessage(toggleError),
            });
        } finally {
            setTogglingId(null);
        }
    };

    const requestActivate = (user) => {
        void changeActive(user, true);
    };

    const requestDeactivate = (user) => {
        const reason = deactivationBlockReason(user);

        if (reason) {
            addToast({
                type: 'error',
                title: 'Acción no permitida',
                message: reason,
            });
            return;
        }

        setUserToDeactivate(user);
    };

    const confirmDeactivate = async () => {
        if (!userToDeactivate) return;

        await changeActive(userToDeactivate, false);
        setUserToDeactivate(null);
    };

    const clearFilters = () => {
        setSearch('');
        setRoleFilter('all');
    };

    const hasFilters = search.trim() !== '' || roleFilter !== 'all';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Usuarios</h1>
                    <p className={styles.subtitle}>
                        Gestioná cuentas, roles, accesos y contraseñas.
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
                        Nuevo usuario
                    </button>
                </div>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <div className={styles.field}>
                        <label htmlFor="users-search">Buscar</label>
                        <input
                            id="users-search"
                            type="search"
                            className={styles.input}
                            placeholder="Nombre o correo"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="users-role">Rol</label>
                        <select
                            id="users-role"
                            className={styles.select}
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value)}
                        >
                            <option value="all">Todos</option>
                            {USER_ROLES.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {hasFilters && (
                    <div className={styles.filterActions}>
                        <button
                            type="button"
                            className={styles.buttonGhost}
                            onClick={clearFilters}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {loading && <PageLoader label="Cargando usuarios…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar los usuarios"
                    message={getApiErrorMessage(error)}
                    onRetry={() => setReloadKey((key) => key + 1)}
                />
            )}

            {!loading && !error && filteredUsers.length === 0 && (
                <AdminEmptyState
                    title={users.length === 0 ? 'No hay usuarios' : 'Sin resultados'}
                    message={
                        users.length === 0
                            ? 'Creá la primera cuenta para dar acceso al sistema.'
                            : 'Probá con otro rol o término de búsqueda.'
                    }
                    action={
                        users.length === 0 ? (
                            <button
                                type="button"
                                className={styles.buttonPrimary}
                                onClick={openCreateModal}
                            >
                                Nuevo usuario
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={clearFilters}
                            >
                                Limpiar filtros
                            </button>
                        )
                    }
                />
            )}

            {!loading && !error && filteredUsers.length > 0 && (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Usuario</th>
                                    <th scope="col">Rol</th>
                                    <th scope="col">Estado</th>
                                    <th scope="col">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const blockReason = deactivationBlockReason(user);
                                    const busy = togglingId === user.id;

                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div className={styles.cellStack}>
                                                    <div className={styles.nameRow}>
                                                        <span className={styles.cellStrong}>
                                                            {user.name}
                                                        </span>
                                                        {isCurrentUser(user) && (
                                                            <span className={styles.selfBadge}>
                                                                Vos
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={styles.cellMuted}>
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={styles.badge}
                                                    style={{
                                                        '--badge-color': ROLE_COLORS[user.role],
                                                    }}
                                                >
                                                    {USER_ROLE_LABELS[user.role] ?? user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={styles.badge}
                                                    style={{
                                                        '--badge-color': user.is_active
                                                            ? 'var(--color-success)'
                                                            : 'var(--color-muted)',
                                                    }}
                                                >
                                                    <span
                                                        className={styles.badgeDot}
                                                        aria-hidden="true"
                                                    />
                                                    {busy
                                                        ? 'Guardando…'
                                                        : user.is_active
                                                          ? 'Activo'
                                                          : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                        onClick={() => openEditModal(user)}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                        onClick={() => openPasswordModal(user)}
                                                    >
                                                        Cambiar contraseña
                                                    </button>
                                                    {user.is_active ? (
                                                        <button
                                                            type="button"
                                                            className={`${styles.buttonDanger} ${styles.buttonSmall}`}
                                                            onClick={() => requestDeactivate(user)}
                                                            disabled={busy || Boolean(blockReason)}
                                                            title={blockReason || undefined}
                                                        >
                                                            {busy ? 'Guardando…' : 'Desactivar'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                            onClick={() => requestActivate(user)}
                                                            disabled={busy}
                                                        >
                                                            {busy ? 'Guardando…' : 'Activar'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <ul className={styles.mobileList}>
                        {filteredUsers.map((user) => {
                            const blockReason = deactivationBlockReason(user);
                            const busy = togglingId === user.id;

                            return (
                                <li key={user.id} className={styles.itemCard}>
                                    <div className={styles.itemCardHeader}>
                                        <div>
                                            <div className={styles.nameRow}>
                                                <h2 className={styles.itemCardTitle}>
                                                    {user.name}
                                                </h2>
                                                {isCurrentUser(user) && (
                                                    <span className={styles.selfBadge}>Vos</span>
                                                )}
                                            </div>
                                            <p className={styles.itemCardText}>{user.email}</p>
                                        </div>
                                        <span
                                            className={styles.badge}
                                            style={{ '--badge-color': ROLE_COLORS[user.role] }}
                                        >
                                            {USER_ROLE_LABELS[user.role] ?? user.role}
                                        </span>
                                    </div>

                                    <div className={styles.itemCardFooter}>
                                        <span
                                            className={styles.badge}
                                            style={{
                                                '--badge-color': user.is_active
                                                    ? 'var(--color-success)'
                                                    : 'var(--color-muted)',
                                            }}
                                        >
                                            <span
                                                className={styles.badgeDot}
                                                aria-hidden="true"
                                            />
                                            {busy
                                                ? 'Guardando…'
                                                : user.is_active
                                                  ? 'Activo'
                                                  : 'Inactivo'}
                                        </span>
                                    </div>

                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                            onClick={() => openEditModal(user)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                            onClick={() => openPasswordModal(user)}
                                        >
                                            Cambiar contraseña
                                        </button>
                                        {user.is_active ? (
                                            <button
                                                type="button"
                                                className={`${styles.buttonDanger} ${styles.buttonSmall}`}
                                                onClick={() => requestDeactivate(user)}
                                                disabled={busy || Boolean(blockReason)}
                                                title={blockReason || undefined}
                                            >
                                                {busy ? 'Guardando…' : 'Desactivar'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                onClick={() => requestActivate(user)}
                                                disabled={busy}
                                            >
                                                {busy ? 'Guardando…' : 'Activar'}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            <AdminModal
                open={modalOpen}
                title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                onClose={closeModal}
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
                            form="user-form"
                            className={styles.buttonPrimary}
                            disabled={saving}
                            aria-busy={saving}
                        >
                            {saving && <span className={styles.spinner} aria-hidden="true" />}
                            {saving ? 'Guardando…' : 'Guardar usuario'}
                        </button>
                    </>
                }
            >
                <form id="user-form" className={styles.form} onSubmit={handleSubmit} noValidate>
                    {formError && (
                        <p className={styles.formError} role="alert">
                            {formError}
                        </p>
                    )}

                    <div className={styles.formGrid}>
                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="user-name">Nombre</label>
                            <input
                                id="user-name"
                                type="text"
                                className={styles.input}
                                value={form.name}
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors.name)}
                                onChange={(event) => updateForm('name', event.target.value)}
                                placeholder="Nombre completo"
                            />
                            {fieldErrors.name && (
                                <p className={styles.fieldError}>{fieldErrors.name}</p>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="user-email">Correo electrónico</label>
                            <input
                                id="user-email"
                                type="email"
                                className={styles.input}
                                value={form.email}
                                maxLength={255}
                                autoComplete="email"
                                aria-invalid={Boolean(fieldErrors.email)}
                                onChange={(event) => updateForm('email', event.target.value)}
                                placeholder="usuario@restaurante.com"
                            />
                            {fieldErrors.email && (
                                <p className={styles.fieldError}>{fieldErrors.email}</p>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="user-role">Rol</label>
                            <select
                                id="user-role"
                                className={styles.select}
                                value={form.role}
                                aria-invalid={Boolean(fieldErrors.role)}
                                onChange={(event) => updateForm('role', event.target.value)}
                                disabled={editingSelf}
                            >
                                {USER_ROLES.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.role ? (
                                <p className={styles.fieldError}>{fieldErrors.role}</p>
                            ) : (
                                editingSelf && (
                                    <p className={styles.help}>
                                        No podés quitarte el rol de administrador.
                                    </p>
                                )
                            )}
                        </div>

                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="user-password">
                                {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
                            </label>
                            <PasswordInput
                                id="user-password"
                                value={form.password}
                                autoComplete="new-password"
                                invalid={Boolean(fieldErrors.password)}
                                onChange={(event) =>
                                    updateForm('password', event.target.value)
                                }
                                placeholder="Mínimo 8 caracteres"
                            />
                            {fieldErrors.password ? (
                                <p className={styles.fieldError}>{fieldErrors.password}</p>
                            ) : (
                                <p className={styles.help}>
                                    {editingUser
                                        ? 'Dejala vacía para conservar la contraseña actual.'
                                        : 'El usuario podrá iniciar sesión con esta contraseña.'}
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            </AdminModal>

            <AdminModal
                open={Boolean(passwordUser)}
                title="Cambiar contraseña"
                onClose={closePasswordModal}
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={closePasswordModal}
                            disabled={savingPassword}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="password-form"
                            className={styles.buttonPrimary}
                            disabled={savingPassword}
                            aria-busy={savingPassword}
                        >
                            {savingPassword && (
                                <span className={styles.spinner} aria-hidden="true" />
                            )}
                            {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
                        </button>
                    </>
                }
            >
                <form
                    id="password-form"
                    className={styles.form}
                    onSubmit={handlePasswordSubmit}
                    noValidate
                >
                    <p className={styles.help}>
                        Nueva contraseña para {passwordUser?.name}. Se cerrarán todas sus
                        sesiones activas.
                    </p>

                    {passwordError && (
                        <p className={styles.formError} role="alert">
                            {passwordError}
                        </p>
                    )}

                    <div className={styles.formGrid}>
                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="password-new">Nueva contraseña</label>
                            <PasswordInput
                                id="password-new"
                                value={passwordForm.password}
                                autoComplete="new-password"
                                invalid={Boolean(passwordErrors.password)}
                                onChange={(event) =>
                                    setPasswordForm((current) => ({
                                        ...current,
                                        password: event.target.value,
                                    }))
                                }
                                placeholder="Mínimo 8 caracteres"
                            />
                            {passwordErrors.password && (
                                <p className={styles.fieldError}>
                                    {passwordErrors.password}
                                </p>
                            )}
                        </div>

                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="password-repeat">Repetir contraseña</label>
                            <PasswordInput
                                id="password-repeat"
                                value={passwordForm.repeat}
                                autoComplete="new-password"
                                invalid={Boolean(passwordErrors.repeat)}
                                onChange={(event) =>
                                    setPasswordForm((current) => ({
                                        ...current,
                                        repeat: event.target.value,
                                    }))
                                }
                                placeholder="Repetí la contraseña"
                            />
                            {passwordErrors.repeat && (
                                <p className={styles.fieldError}>{passwordErrors.repeat}</p>
                            )}
                        </div>
                    </div>
                </form>
            </AdminModal>

            <ConfirmDialog
                open={Boolean(userToDeactivate)}
                title="Desactivar usuario"
                message={
                    userToDeactivate
                        ? `¿Querés desactivar a ${userToDeactivate.name}? No podrá iniciar sesión hasta que lo actives nuevamente.`
                        : ''
                }
                confirmLabel="Desactivar"
                onConfirm={confirmDeactivate}
                onCancel={() => {
                    if (!togglingId) setUserToDeactivate(null);
                }}
                busy={Boolean(togglingId)}
                danger
            />
        </div>
    );
}
