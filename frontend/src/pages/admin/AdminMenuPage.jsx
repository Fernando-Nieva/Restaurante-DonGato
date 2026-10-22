import { useMemo, useState } from 'react';
import { PageError, PageLoader } from '../../components/PageState';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminModal from '../../components/admin/AdminModal';
import styles from '../../components/admin/admin.module.css';
import {
    PRODUCT_CATEGORIES,
    PRODUCT_CATEGORY_LABELS,
} from '../../constants/admin';
import { useToast } from '../../context/ToastContext';
import useMenu from '../../hooks/useMenu';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage, getFieldError } from '../../services/api';
import { formatPrice } from '../../utils/formatPrice';

const EMPTY_FORM = {
    name: '',
    description: '',
    category: 'pizza',
    price: '',
    is_available: true,
};

const categoryLabel = (category) => {
    const key =
        category && typeof category === 'object'
            ? String(category.name ?? '').toLowerCase()
            : String(category ?? '').toLowerCase();

    return PRODUCT_CATEGORY_LABELS[key] ?? key ?? '—';
};

const formFromProduct = (product) => ({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category:
        product?.category && typeof product.category === 'object'
            ? String(product.category.name ?? '').toLowerCase()
            : String(product?.category ?? 'pizza').toLowerCase(),
    price: product?.price != null ? String(product.price) : '',
    is_available: product?.is_available ?? true,
});

export default function AdminMenuPage() {
    const { products, setProducts, loading, refreshing, error, reload } = useMenu({
        admin: true,
    });
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [availabilityFilter, setAvailabilityFilter] = useState('all');
    const [busyIds, setBusyIds] = useState(() => new Set());
    const [editingProduct, setEditingProduct] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        return products.filter((product) => {
            const productCategory =
                product.category && typeof product.category === 'object'
                    ? String(product.category.name ?? '').toLowerCase()
                    : String(product.category ?? '').toLowerCase();

            if (categoryFilter !== 'all' && productCategory !== categoryFilter) return false;

            if (availabilityFilter === 'available' && !product.is_available) return false;
            if (availabilityFilter === 'unavailable' && product.is_available) return false;

            if (!term) return true;

            return (
                String(product.name ?? '').toLowerCase().includes(term) ||
                String(product.description ?? '').toLowerCase().includes(term)
            );
        });
    }, [products, search, categoryFilter, availabilityFilter]);

    const openCreateModal = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setForm(formFromProduct(product));
        setFieldErrors({});
        setFormError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingProduct(null);
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
        const description = form.description.trim();
        const price = Number(form.price);

        if (!name) errors.name = 'Ingresá el nombre del producto.';
        else if (name.length > 120) errors.name = 'El nombre no puede superar 120 caracteres.';

        if (description.length > 255) {
            errors.description = 'La descripción no puede superar 255 caracteres.';
        }

        if (!PRODUCT_CATEGORIES.some((category) => category.value === form.category)) {
            errors.category = 'Seleccioná una categoría válida.';
        }

        if (form.price === '' || !Number.isFinite(price) || price <= 0) {
            errors.price = 'Ingresá un precio mayor a cero.';
        } else if (!/^\d+(\.\d{1,2})?$/.test(String(form.price))) {
            errors.price = 'El precio puede tener como máximo 2 decimales.';
        } else if (price > 1_000_000) {
            errors.price = 'El precio supera el máximo permitido.';
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
            description: form.description.trim() || null,
            category: form.category,
            price: Number(form.price),
            is_available: form.is_available,
        };

        setSaving(true);

        try {
            if (editingProduct) {
                const updated = await adminApi.updateProduct(editingProduct.id, payload);

                setProducts((current) =>
                    current.map((product) =>
                        product.id === editingProduct.id ? { ...product, ...updated } : product,
                    ),
                );

                addToast({
                    type: 'success',
                    title: 'Producto actualizado',
                    message: `${payload.name} se guardó correctamente.`,
                });
            } else {
                const created = await adminApi.createProduct(payload);

                setProducts((current) => [...current, created]);

                addToast({
                    type: 'success',
                    title: 'Producto creado',
                    message: `${payload.name} ya forma parte de la carta.`,
                });
            }

            setModalOpen(false);
            setEditingProduct(null);
        } catch (submitError) {
            console.error('No se pudo guardar el producto:', submitError);
            setFieldErrors({
                name: getFieldError(submitError, 'name') ?? undefined,
                description: getFieldError(submitError, 'description') ?? undefined,
                category: getFieldError(submitError, 'category') ?? undefined,
                price: getFieldError(submitError, 'price') ?? undefined,
            });
            setFormError(getApiErrorMessage(submitError, 'No se pudo guardar el producto.'));
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async (product) => {
        const nextValue = !product.is_available;

        setBusyIds((current) => new Set(current).add(product.id));
        setProducts((current) =>
            current.map((item) =>
                item.id === product.id ? { ...item, is_available: nextValue } : item,
            ),
        );

        try {
            const updated = await adminApi.updateProductAvailability(product.id, nextValue);

            setProducts((current) =>
                current.map((item) =>
                    item.id === product.id ? { ...item, ...updated } : item,
                ),
            );
        } catch (toggleError) {
            console.error('No se pudo cambiar la disponibilidad:', toggleError);
            setProducts((current) =>
                current.map((item) =>
                    item.id === product.id
                        ? { ...item, is_available: product.is_available }
                        : item,
                ),
            );

            addToast({
                type: 'error',
                title: 'No se pudo actualizar',
                message: getApiErrorMessage(toggleError),
            });
        } finally {
            setBusyIds((current) => {
                const next = new Set(current);
                next.delete(product.id);
                return next;
            });
        }
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('all');
        setAvailabilityFilter('all');
    };

    const hasFilters =
        search.trim() !== '' || categoryFilter !== 'all' || availabilityFilter !== 'all';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Carta</h1>
                    <p className={styles.subtitle}>
                        Administrá productos, precios y disponibilidad.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={reload}
                        disabled={refreshing}
                    >
                        {refreshing && <span className={styles.spinner} aria-hidden="true" />}
                        Actualizar
                    </button>
                    <button
                        type="button"
                        className={styles.buttonPrimary}
                        onClick={openCreateModal}
                    >
                        Nuevo producto
                    </button>
                </div>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <div className={styles.field}>
                        <label htmlFor="menu-search">Buscar</label>
                        <input
                            id="menu-search"
                            type="search"
                            className={styles.input}
                            placeholder="Nombre o descripción"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="menu-category">Categoría</label>
                        <select
                            id="menu-category"
                            className={styles.select}
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                        >
                            <option value="all">Todas</option>
                            {PRODUCT_CATEGORIES.map((category) => (
                                <option key={category.value} value={category.value}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="menu-availability">Disponibilidad</label>
                        <select
                            id="menu-availability"
                            className={styles.select}
                            value={availabilityFilter}
                            onChange={(event) => setAvailabilityFilter(event.target.value)}
                        >
                            <option value="all">Todos</option>
                            <option value="available">Disponibles</option>
                            <option value="unavailable">No disponibles</option>
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

            {loading && <PageLoader label="Cargando la carta…" />}

            {!loading && error && (
                <PageError
                    title="No pudimos cargar la carta"
                    message={getApiErrorMessage(error)}
                    onRetry={reload}
                />
            )}

            {!loading && !error && filteredProducts.length === 0 && (
                <AdminEmptyState
                    title={products.length === 0 ? 'La carta está vacía' : 'Sin resultados'}
                    message={
                        products.length === 0
                            ? 'Agregá el primer producto para empezar a tomar pedidos.'
                            : 'Probá con otros filtros o términos de búsqueda.'
                    }
                    action={
                        products.length === 0 ? (
                            <button
                                type="button"
                                className={styles.buttonPrimary}
                                onClick={openCreateModal}
                            >
                                Nuevo producto
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

            {!loading && !error && filteredProducts.length > 0 && (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Producto</th>
                                    <th scope="col">Categoría</th>
                                    <th scope="col">Precio</th>
                                    <th scope="col">Disponible</th>
                                    <th scope="col">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className={styles.cellStack}>
                                                <span className={styles.cellStrong}>
                                                    {product.name}
                                                </span>
                                                <span className={styles.cellMuted}>
                                                    {product.description || 'Sin descripción'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.badge}>
                                                {categoryLabel(product.category)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.price}>
                                                {formatPrice(product.price)}
                                            </span>
                                        </td>
                                        <td>
                                            <label className={styles.switch}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.switchInput}
                                                    checked={Boolean(product.is_available)}
                                                    disabled={busyIds.has(product.id)}
                                                    onChange={() => toggleAvailability(product)}
                                                    aria-label={`${
                                                        product.is_available
                                                            ? 'Ocultar'
                                                            : 'Mostrar'
                                                    } ${product.name}`}
                                                />
                                                <span className={styles.switchTrack} aria-hidden="true">
                                                    <span className={styles.switchThumb} />
                                                </span>
                                                <span className={styles.switchText}>
                                                    {busyIds.has(product.id)
                                                        ? 'Guardando…'
                                                        : product.is_available
                                                          ? 'Visible'
                                                          : 'Oculto'}
                                                </span>
                                            </label>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                                onClick={() => openEditModal(product)}
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <ul className={styles.mobileList}>
                        {filteredProducts.map((product) => (
                            <li key={product.id} className={styles.itemCard}>
                                <div className={styles.itemCardHeader}>
                                    <div>
                                        <h2 className={styles.itemCardTitle}>{product.name}</h2>
                                        <p className={styles.itemCardText}>
                                            {product.description || 'Sin descripción'}
                                        </p>
                                    </div>
                                    <span className={styles.badge}>
                                        {categoryLabel(product.category)}
                                    </span>
                                </div>

                                <div className={styles.itemCardFooter}>
                                    <span className={styles.price}>
                                        {formatPrice(product.price)}
                                    </span>

                                    <label className={styles.switch}>
                                        <input
                                            type="checkbox"
                                            className={styles.switchInput}
                                            checked={Boolean(product.is_available)}
                                            disabled={busyIds.has(product.id)}
                                            onChange={() => toggleAvailability(product)}
                                            aria-label={`${
                                                product.is_available ? 'Ocultar' : 'Mostrar'
                                            } ${product.name}`}
                                        />
                                        <span className={styles.switchTrack} aria-hidden="true">
                                            <span className={styles.switchThumb} />
                                        </span>
                                        <span className={styles.switchText}>
                                            {product.is_available ? 'Visible' : 'Oculto'}
                                        </span>
                                    </label>
                                </div>

                                <div className={styles.rowActions}>
                                    <button
                                        type="button"
                                        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                                        onClick={() => openEditModal(product)}
                                    >
                                        Editar producto
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <AdminModal
                open={modalOpen}
                title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
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
                            form="product-form"
                            className={styles.buttonPrimary}
                            disabled={saving}
                            aria-busy={saving}
                        >
                            {saving && <span className={styles.spinner} aria-hidden="true" />}
                            {saving ? 'Guardando…' : 'Guardar producto'}
                        </button>
                    </>
                }
            >
                <form id="product-form" className={styles.form} onSubmit={handleSubmit} noValidate>
                    {formError && (
                        <p className={styles.formError} role="alert">
                            {formError}
                        </p>
                    )}

                    <div className={styles.formGrid}>
                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="product-name">Nombre</label>
                            <input
                                id="product-name"
                                type="text"
                                className={styles.input}
                                value={form.name}
                                maxLength={120}
                                aria-invalid={Boolean(fieldErrors.name)}
                                aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
                                onChange={(event) => updateForm('name', event.target.value)}
                                placeholder="Ej. Pizza muzzarella"
                            />
                            {fieldErrors.name && (
                                <p id="product-name-error" className={styles.fieldError}>
                                    {fieldErrors.name}
                                </p>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="product-category">Categoría</label>
                            <select
                                id="product-category"
                                className={styles.select}
                                value={form.category}
                                aria-invalid={Boolean(fieldErrors.category)}
                                onChange={(event) => updateForm('category', event.target.value)}
                            >
                                {PRODUCT_CATEGORIES.map((category) => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.category && (
                                <p className={styles.fieldError}>{fieldErrors.category}</p>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="product-price">Precio</label>
                            <input
                                id="product-price"
                                type="number"
                                className={styles.input}
                                value={form.price}
                                min="0.01"
                                max="1000000"
                                step="0.01"
                                inputMode="decimal"
                                aria-invalid={Boolean(fieldErrors.price)}
                                aria-describedby={
                                    fieldErrors.price ? 'product-price-error' : 'product-price-help'
                                }
                                onChange={(event) => updateForm('price', event.target.value)}
                                placeholder="0.00"
                            />
                            {fieldErrors.price ? (
                                <p id="product-price-error" className={styles.fieldError}>
                                    {fieldErrors.price}
                                </p>
                            ) : (
                                <p id="product-price-help" className={styles.help}>
                                    {form.price !== '' && Number.isFinite(Number(form.price))
                                        ? formatPrice(Number(form.price))
                                        : 'Máximo 2 decimales.'}
                                </p>
                            )}
                        </div>

                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label htmlFor="product-description">Descripción</label>
                            <textarea
                                id="product-description"
                                className={styles.textarea}
                                value={form.description}
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors.description)}
                                onChange={(event) => updateForm('description', event.target.value)}
                                placeholder="Ingredientes o detalle breve del producto"
                            />
                            {fieldErrors.description ? (
                                <p className={styles.fieldError}>{fieldErrors.description}</p>
                            ) : (
                                <p className={styles.help}>
                                    {form.description.length}/255 caracteres. Opcional.
                                </p>
                            )}
                        </div>

                        <div className={`${styles.field} ${styles.formSpanAll}`}>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    className={styles.switchInput}
                                    checked={form.is_available}
                                    onChange={(event) =>
                                        updateForm('is_available', event.target.checked)
                                    }
                                />
                                <span className={styles.switchTrack} aria-hidden="true">
                                    <span className={styles.switchThumb} />
                                </span>
                                <span className={styles.switchText}>
                                    Disponible para pedidos
                                </span>
                            </label>
                        </div>
                    </div>

                    {editingProduct && (
                        <p className={styles.help}>
                            Cambiar el precio no modifica los pedidos que ya fueron creados.
                        </p>
                    )}
                </form>
            </AdminModal>
        </div>
    );
}
