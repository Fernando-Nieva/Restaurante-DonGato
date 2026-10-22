import { NavLink, Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';

const SECTIONS = [
    { to: '/admin', label: 'Panel', end: true },
    { to: '/admin/carta', label: 'Carta' },
    { to: '/admin/mesas', label: 'Mesas' },
    { to: '/admin/usuarios', label: 'Usuarios' },
    { to: '/admin/pedidos', label: 'Pedidos' },
];

export default function AdminLayout() {
    const navLinkClass = ({ isActive }) =>
        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.sidebarEyebrow}>Don Gato</span>
                    <strong className={styles.sidebarTitle}>Administración</strong>
                </div>

                <nav className={styles.nav} aria-label="Secciones de administración">
                    {SECTIONS.map((section) => (
                        <NavLink
                            key={section.to}
                            to={section.to}
                            end={section.end}
                            className={navLinkClass}
                        >
                            {section.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className={styles.main}>
                <Outlet />
            </div>
        </div>
    );
}
