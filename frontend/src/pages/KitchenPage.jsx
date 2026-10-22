import KitchenBoard from '../components/KitchenBoard';
import { useAuth } from '../context/AuthContext';
import styles from './KitchenPage.module.css';

const ALLOWED_ROLES = ['cocina', 'admin'];

export default function KitchenPage() {
    const { user } = useAuth();
    const role = String(user?.role ?? '').toLowerCase();

    if (!ALLOWED_ROLES.includes(role)) {
        return (
            <main className={styles.page}>
                <section className={styles.denied}>
                    <h1 className={styles.deniedTitle}>Acceso restringido</h1>
                    <p className={styles.deniedText}>
                        Este panel solo está disponible para usuarios con rol cocina o admin.
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Cocina</h1>
                    <p className={styles.subtitle}>Pedidos en preparación</p>
                </div>
            </header>

            <KitchenBoard />
        </main>
    );
}
