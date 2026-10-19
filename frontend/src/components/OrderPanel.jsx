import { useEffect, useMemo, useRef, useState } from 'react';
import { KITCHEN_STATUS_TITLES, ORDER_STATUS } from '../constants/orderStatus';
import styles from './OrderPanel.module.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const CATEGORY_TITLES = {
    pizza: 'Pizzas',
    hamburguesa: 'Hamburguesas',
    bebida: 'Bebidas',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_TITLES);

const formatPrice = (value) => Number(value ?? 0).toFixed(2);

const formatTime = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const productPrice = (product) => Number(product.price ?? 0);

const productName = (product) => product.name ?? 'Producto';

const categoryKey = (product) => {
    const category = product.category;

    if (category && typeof category === 'object') return String(category.name ?? '').toLowerCase();

    return String(category ?? product.category_name ?? '').toLowerCase();
};

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

const orderTableLabel = (order) => {
    const table = order.table;

    if (table && typeof table === 'object') {
        return table.number ?? table.name ?? table.id ?? '—';
    }

    return order.table_id ?? '—';
};

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

const authHeaders = () => {
    const token = localStorage.getItem('token');

    return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchProducts = async (signal) => {
    const response = await fetch(`${API_URL}/api/products`, {
        signal,
        headers: { Accept: 'application/json', ...authHeaders() },
    });

    if (!response.ok) throw new Error(`GET /api/products respondió ${response.status}`);

    const payload = await response.json();

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
};

export default function OrderPanel({ table, orders = [], createOrder, updateStatus, onClose }) {
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0]);
    const [cart, setCart] = useState({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [busyOrderIds, setBusyOrderIds] = useState(() => new Set());
    const [orderActionError, setOrderActionError] = useState(null);
    const [notices, setNotices] = useState([]);
    const statusesRef = useRef(new Map());

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const load = async () => {
            setLoadingProducts(true);
            setProductsError(false);

            try {
                const list = await fetchProducts(controller.signal);

                if (!active) return;

                setProducts(list);
            } catch (error) {
                if (active && error.name !== 'AbortError') {
                    console.error('No se pudieron cargar los productos:', error);
                    setProductsError(true);
                }
            } finally {
                if (active) setLoadingProducts(false);
            }
        };

        load();

        return () => {
            active = false;
            controller.abort();
        };
    }, [reloadKey]);

    useEffect(() => {
        setCart({});
        setGeneralNotes('');
        setFeedback(null);
        setOrderActionError(null);
    }, [table.id]);

    useEffect(() => {
        const previousStatuses = statusesRef.current;
        const nextStatuses = new Map();
        const readyOrders = [];

        orders.forEach((order) => {
            const key = String(order.id);
            const current = normalizeStatus(order.status);
            const previous = previousStatuses.get(key);

            if (previous !== undefined && previous !== current && current === ORDER_STATUS.Listo) {
                readyOrders.push(order);
            }

            nextStatuses.set(key, current);
        });

        statusesRef.current = nextStatuses;

        if (readyOrders.length === 0) return;

        setNotices((existing) => {
            const additions = readyOrders.map((order, index) => ({
                id: `${order.id}-${Date.now()}-${index}`,
                message: `Mesa ${orderTableLabel(order)}: pedido listo para entregar`,
            }));

            return [...existing, ...additions].slice(-3);
        });
    }, [orders]);

    const visibleProducts = useMemo(
        () => products.filter((product) => categoryKey(product) === activeCategory),
        [products, activeCategory],
    );

    const cartLines = useMemo(
        () =>
            products
                .filter((product) => cart[String(product.id)])
                .map((product) => {
                    const item = cart[String(product.id)];

                    return { product, quantity: item.quantity, notes: item.notes };
                }),
        [products, cart],
    );

    const tableOrders = orders.filter((order) => {
        const id = orderTableId(order);

        return (
            id != null &&
            String(id) === String(table.id) &&
            KITCHEN_STATUS_TITLES[normalizeStatus(order.status)]
        );
    });

    const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

    const total = cartLines.reduce(
        (sum, line) => sum + line.quantity * productPrice(line.product),
        0,
    );

    const changeQuantity = (productId, delta) => {
        setCart((previous) => {
            const current = previous[productId] ?? { quantity: 0, notes: '' };
            const quantity = Math.min(Math.max(current.quantity + delta, 0), 99);

            if (quantity === 0) {
                const next = { ...previous };
                delete next[productId];

                return next;
            }

            return { ...previous, [productId]: { ...current, quantity } };
        });
    };

    const changeItemNotes = (productId, notes) => {
        setCart((previous) =>
            previous[productId]
                ? { ...previous, [productId]: { ...previous[productId], notes } }
                : previous,
        );
    };

    const dismissNotice = (noticeId) => {
        setNotices((previous) => previous.filter((notice) => notice.id !== noticeId));
    };

    const changeOrderStatus = async (order, status) => {
        const key = String(order.id);

        if (busyOrderIds.has(key)) return;

        setBusyOrderIds((previous) => new Set(previous).add(key));
        setOrderActionError(null);

        try {
            await updateStatus(order.id, status);
        } catch (error) {
            console.error(`No se pudo actualizar el pedido #${order.id}:`, error);
            setOrderActionError(`No se pudo actualizar el pedido #${order.id}.`);
        } finally {
            setBusyOrderIds((previous) => {
                const next = new Set(previous);
                next.delete(key);

                return next;
            });
        }
    };

    const handleCancel = (order) => {
        if (!window.confirm(`¿Cancelar el pedido #${order.id}?`)) return;

        changeOrderStatus(order, ORDER_STATUS.Cancelado);
    };

    const handleSubmit = async () => {
        if (sending || totalQuantity === 0) return;

        setSending(true);
        setFeedback(null);

        try {
            await createOrder({
                table_id: table.id,
                notes: generalNotes.trim() || null,
                items: cartLines.map(({ product, quantity, notes }) => ({
                    product_id: product.id,
                    quantity,
                    notes: notes.trim() || null,
                })),
            });

            setCart({});
            setGeneralNotes('');
            setFeedback({ type: 'success', message: 'Pedido enviado a cocina.' });
        } catch (error) {
            console.error('No se pudo enviar el pedido:', error);
            setFeedback({ type: 'error', message: 'No se pudo enviar el pedido.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <aside className={styles.panel}>
            {notices.length > 0 && (
                <div className={styles.notices}>
                    {notices.map((notice) => (
                        <div key={notice.id} className={styles.notice}>
                            <span>{notice.message}</span>
                            <button
                                type="button"
                                className={styles.noticeClose}
                                onClick={() => dismissNotice(notice.id)}
                                aria-label="Cerrar aviso"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <header className={styles.header}>
                <h2 className={styles.title}>Mesa {table.number ?? table.name ?? table.id}</h2>
                <button
                    type="button"
                    className={styles.close}
                    onClick={onClose}
                    aria-label="Cerrar panel"
                >
                    ×
                </button>
            </header>

            <div className={styles.content}>
                {tableOrders.length > 0 && (
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Pedidos activos</h3>

                        {orderActionError && <p className={styles.error}>{orderActionError}</p>}

                        <ul className={styles.orderList}>
                            {tableOrders.map((order) => {
                                const status = normalizeStatus(order.status);
                                const busy = busyOrderIds.has(String(order.id));

                                return (
                                    <li key={order.id} className={styles.orderRow}>
                                        <div className={styles.orderInfo}>
                                            <span>
                                                #{order.id}
                                                {order.created_at && (
                                                    <span className={styles.orderTime}>
                                                        {formatTime(order.created_at)}
                                                    </span>
                                                )}
                                            </span>
                                            <span
                                                className={`${styles.statusBadge} ${styles[status]}`}
                                            >
                                                {KITCHEN_STATUS_TITLES[status]}
                                            </span>
                                        </div>

                                        {status === ORDER_STATUS.Listo && (
                                            <button
                                                type="button"
                                                className={styles.deliver}
                                                disabled={busy}
                                                onClick={() =>
                                                    changeOrderStatus(order, ORDER_STATUS.Entregado)
                                                }
                                            >
                                                {busy ? 'Entregando…' : 'Marcar como entregado'}
                                            </button>
                                        )}

                                        {status === ORDER_STATUS.Pendiente && (
                                            <button
                                                type="button"
                                                className={styles.cancel}
                                                disabled={busy}
                                                onClick={() => handleCancel(order)}
                                            >
                                                {busy ? 'Cancelando…' : 'Cancelar'}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Carta</h3>

                    {loadingProducts && <p className={styles.muted}>Cargando productos…</p>}

                    {productsError && (
                        <p className={styles.error}>
                            No se pudieron cargar los productos.{' '}
                            <button
                                type="button"
                                className={styles.linkButton}
                                onClick={() => setReloadKey((key) => key + 1)}
                            >
                                Reintentar
                            </button>
                        </p>
                    )}

                    {!loadingProducts && !productsError && (
                        <>
                            <div className={styles.tabs} role="tablist" aria-label="Categorías">
                                {CATEGORY_KEYS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeCategory === key}
                                        className={`${styles.tab} ${
                                            activeCategory === key ? styles.tabActive : ''
                                        }`}
                                        onClick={() => setActiveCategory(key)}
                                    >
                                        {CATEGORY_TITLES[key]}
                                    </button>
                                ))}
                            </div>

                            {products.length === 0 && (
                                <p className={styles.muted}>Sin productos disponibles.</p>
                            )}

                            {products.length > 0 && visibleProducts.length === 0 && (
                                <p className={styles.muted}>
                                    No hay productos en esta categoría.
                                </p>
                            )}

                            {visibleProducts.map((product) => {
                                const key = String(product.id);
                                const item = cart[key];
                                const quantity = item?.quantity ?? 0;

                                return (
                                    <div key={key} className={styles.product}>
                                        <div className={styles.productMain}>
                                            <div>
                                                <p className={styles.productName}>
                                                    {productName(product)}
                                                </p>
                                                {product.description && (
                                                    <p className={styles.productDescription}>
                                                        {product.description}
                                                    </p>
                                                )}
                                                <p className={styles.productPrice}>
                                                    ${formatPrice(productPrice(product))}
                                                </p>
                                            </div>

                                            <div className={styles.stepper}>
                                                <button
                                                    type="button"
                                                    onClick={() => changeQuantity(key, -1)}
                                                    disabled={quantity === 0}
                                                    aria-label={`Quitar ${productName(product)}`}
                                                >
                                                    −
                                                </button>
                                                <span className={styles.quantity}>{quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => changeQuantity(key, 1)}
                                                    aria-label={`Agregar ${productName(product)}`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Carrito</h3>

                    {cartLines.length === 0 && <p className={styles.muted}>El carrito está vacío.</p>}

                    {cartLines.map(({ product, quantity, notes }) => (
                        <div key={String(product.id)} className={styles.cartItem}>
                            <div className={styles.cartRow}>
                                <span className={styles.cartName}>{productName(product)}</span>
                                <span className={styles.cartQuantity}>× {quantity}</span>
                                <span className={styles.cartSubtotal}>
                                    ${formatPrice(quantity * productPrice(product))}
                                </span>
                            </div>

                            <input
                                type="text"
                                className={styles.itemNotes}
                                placeholder="Observaciones (ej. sin cebolla)"
                                value={notes}
                                onChange={(event) =>
                                    changeItemNotes(String(product.id), event.target.value)
                                }
                            />
                        </div>
                    ))}
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Notas generales</h3>
                    <textarea
                        className={styles.notes}
                        rows={2}
                        placeholder="Ej. servir los platos juntos"
                        value={generalNotes}
                        onChange={(event) => setGeneralNotes(event.target.value)}
                    />
                </section>
            </div>

            <footer className={styles.footer}>
                <div className={styles.summary}>
                    <span>
                        {totalQuantity} ítem{totalQuantity === 1 ? '' : 's'}
                    </span>
                    <strong className={styles.total}>Total ${formatPrice(total)}</strong>
                </div>

                <button
                    type="button"
                    className={styles.submit}
                    onClick={handleSubmit}
                    disabled={sending || totalQuantity === 0}
                >
                    {sending ? 'Enviando…' : 'Enviar a cocina'}
                </button>

                {feedback && (
                    <p className={feedback.type === 'success' ? styles.success : styles.error}>
                        {feedback.message}
                    </p>
                )}
            </footer>
        </aside>
    );
}
