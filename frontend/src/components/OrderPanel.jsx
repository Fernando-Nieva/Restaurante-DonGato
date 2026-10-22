import { useEffect, useMemo, useState } from 'react';
import {
    KITCHEN_STATUS_TITLES,
    ORDER_STATUS,
    ORDER_STATUS_COLORS,
    ORDER_STATUS_LABELS,
} from '../constants/orderStatus';
import { useToast } from '../context/ToastContext';
import useMenu from '../hooks/useMenu';
import { formatPrice } from '../utils/formatPrice';
import StatusIcon from './StatusIcon';
import styles from './OrderPanel.module.css';

const CATEGORY_TITLES = {
    pizza: 'Pizzas',
    hamburguesa: 'Hamburguesas',
    bebida: 'Bebidas',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_TITLES);

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

const normalizeStatus = (status) => String(status ?? '').toLowerCase();

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

export default function OrderPanel({ table, orders = [], createOrder, updateStatus, onClose }) {
    const { products, loading: loadingProducts, error: productsError, reload } = useMenu();
    const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0]);
    const [cart, setCart] = useState({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [busyOrderIds, setBusyOrderIds] = useState(() => new Set());
    const [cancelOrderId, setCancelOrderId] = useState(null);
    const { addToast } = useToast();

    useEffect(() => {
        setCart({});
        setGeneralNotes('');
        setCancelOrderId(null);
    }, [table.id]);

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

    const tableNumber = table.number ?? table.name ?? table.id;
    const seats = Number(table.seats);
    const hasSeats = Number.isFinite(seats) && seats > 0;

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

    const changeOrderStatus = async (order, status) => {
        const key = String(order.id);

        if (busyOrderIds.has(key)) return;

        setBusyOrderIds((previous) => new Set(previous).add(key));

        try {
            await updateStatus(order.id, status);
        } catch (error) {
            console.error(`No se pudo actualizar el pedido #${order.id}:`, error);
            addToast({
                type: 'error',
                title: 'No se pudo actualizar el pedido',
                message: `Pedido #${order.id}. Intentá de nuevo.`,
            });
        } finally {
            setBusyOrderIds((previous) => {
                const next = new Set(previous);
                next.delete(key);

                return next;
            });
        }
    };

    const handleSubmit = async () => {
        if (sending || totalQuantity === 0) return;

        const submittedQuantity = totalQuantity;

        setSending(true);

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
            addToast({
                type: 'success',
                title: 'Pedido enviado',
                message: `Mesa ${tableNumber} · ${submittedQuantity} ítem${
                    submittedQuantity === 1 ? '' : 's'
                }`,
            });
        } catch (error) {
            console.error('No se pudo enviar el pedido:', error);
            addToast({
                type: 'error',
                title: 'No se pudo enviar el pedido',
                message: 'Revisá la conexión e intentá de nuevo.',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <aside
            className={styles.panel}
            aria-label={`Pedido de mesa ${tableNumber}`}
            data-order-panel
        >
            <div className={styles.grabber} aria-hidden="true" />

            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.title}>Mesa {tableNumber}</h2>
                    {hasSeats && (
                        <p className={styles.seats}>
                            <SeatIcon />
                            {seats} asiento{seats === 1 ? '' : 's'}
                        </p>
                    )}
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
                {tableOrders.length > 0 && (
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Pedidos activos</h3>

                        <ul className={styles.orderList}>
                            {tableOrders.map((order) => {
                                const status = normalizeStatus(order.status);
                                const busy = busyOrderIds.has(String(order.id));
                                const confirming = cancelOrderId === order.id;

                                return (
                                    <li key={order.id} className={styles.orderRow}>
                                        <div className={styles.orderTop}>
                                            <div className={styles.orderInfo}>
                                                <span className={styles.orderId}>#{order.id}</span>
                                                {order.created_at && (
                                                    <span className={styles.orderTime}>
                                                        {formatTime(order.created_at)}
                                                    </span>
                                                )}
                                                <span
                                                    className={styles.statusBadge}
                                                    style={{
                                                        '--status-color':
                                                            ORDER_STATUS_COLORS[status] ??
                                                            'var(--color-muted)',
                                                    }}
                                                >
                                                    <StatusIcon
                                                        status={status}
                                                        className={styles.statusIcon}
                                                    />
                                                    {ORDER_STATUS_LABELS[status] ?? status}
                                                </span>
                                            </div>

                                            {status === ORDER_STATUS.Listo && (
                                                <button
                                                    type="button"
                                                    className={styles.deliver}
                                                    disabled={busy}
                                                    onClick={() =>
                                                        changeOrderStatus(
                                                            order,
                                                            ORDER_STATUS.Entregado,
                                                        )
                                                    }
                                                >
                                                    {busy
                                                        ? 'Entregando…'
                                                        : 'Marcar como entregado'}
                                                </button>
                                            )}

                                            {status === ORDER_STATUS.Pendiente && !confirming && (
                                                <button
                                                    type="button"
                                                    className={styles.cancel}
                                                    disabled={busy}
                                                    onClick={() => setCancelOrderId(order.id)}
                                                >
                                                    {busy ? 'Cancelando…' : 'Cancelar'}
                                                </button>
                                            )}
                                        </div>

                                        {confirming && (
                                            <div
                                                className={styles.cancelConfirm}
                                                role="group"
                                                aria-label={`Confirmar cancelación del pedido ${order.id}`}
                                            >
                                                <span className={styles.cancelConfirmText}>
                                                    ¿Cancelar el pedido?
                                                </span>
                                                <div className={styles.cancelConfirmActions}>
                                                    <button
                                                        type="button"
                                                        className={styles.cancelConfirmYes}
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setCancelOrderId(null);
                                                            changeOrderStatus(
                                                                order,
                                                                ORDER_STATUS.Cancelado,
                                                            );
                                                        }}
                                                    >
                                                        {busy ? 'Cancelando…' : 'Sí, cancelar'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.cancelConfirmNo}
                                                        disabled={busy}
                                                        onClick={() => setCancelOrderId(null)}
                                                    >
                                                        Volver
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Carta</h3>

                    {loadingProducts && (
                        <p className={styles.loadingText} role="status">
                            <span className={styles.spinner} aria-hidden="true" />
                            Cargando productos…
                        </p>
                    )}

                    {productsError && (
                        <p className={styles.error}>
                            No se pudieron cargar los productos.{' '}
                            <button
                                type="button"
                                className={styles.linkButton}
                                onClick={reload}
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
                                                    {formatPrice(productPrice(product))}
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
                                    {formatPrice(quantity * productPrice(product))}
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
                    <strong className={styles.total}>Total {formatPrice(total)}</strong>
                </div>

                <button
                    type="button"
                    className={styles.submit}
                    onClick={handleSubmit}
                    disabled={sending || totalQuantity === 0}
                    aria-busy={sending}
                >
                    {sending && <span className={styles.spinner} aria-hidden="true" />}
                    {sending ? 'Enviando…' : 'Enviar a cocina'}
                </button>
            </footer>
        </aside>
    );
}
