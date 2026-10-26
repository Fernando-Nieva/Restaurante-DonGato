import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import useBreakpoint from '../hooks/useBreakpoint';
import useConnectionStatus from '../hooks/useConnectionStatus';
import ConnectionBadge from './ConnectionBadge';
import styles from './AppHeader.module.css';

const KITCHEN_ROLES = ['cocina', 'admin'];

const ROLE_LABELS = {
    mozo: 'Mozo',
    cocina: 'Cocina',
    admin: 'Admin',
};

export default function AppHeader() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const connectionStatus = useConnectionStatus();
    const breakpoint = useBreakpoint();
    const [menuOpen, setMenuOpen] = useState(false);

    const role = String(user?.role ?? '').toLowerCase();
    const canSeeKitchen = KITCHEN_ROLES.includes(role);
    const canSeeAdmin = role === 'admin';
    const roleLabel = ROLE_LABELS[role] ?? (role || 'Usuario');
    const userName = user?.name ?? user?.email ?? 'Usuario';

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (breakpoint !== 'mobile') setMenuOpen(false);
    }, [breakpoint]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [menuOpen]);

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const navLinkClass = ({ isActive }) =>
        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className={styles.header}>
            <div className={styles.brand}>
                <img className={styles.logo} src={logoUrl} alt="Don Gato" width="72" height="72" />
            </div>

            <nav className={styles.nav} aria-label="Navegación principal">
                <NavLink to="/restaurante" className={navLinkClass}>
                    Restaurante
                </NavLink>
                {canSeeKitchen && (
                    <NavLink to="/cocina" className={navLinkClass}>
                        Cocina
                    </NavLink>
                )}
                {canSeeAdmin && (
                    <NavLink to="/admin" className={navLinkClass}>
                        Administración
                    </NavLink>
                )}
            </nav>

            <div className={styles.actions}>
                <ConnectionBadge status={connectionStatus} />

                <span className={styles.user}>
                    <span className={styles.userName}>{userName}</span>
                    <span className={styles.roleBadge}>{roleLabel}</span>
                </span>

                <button type="button" className={styles.logout} onClick={handleLogout}>
                    Salir
                </button>

                <button
                    type="button"
                    className={styles.menuButton}
                    aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={menuOpen}
                    aria-controls="main-navigation-mobile"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span className={styles.menuIcon} aria-hidden="true">
                        {menuOpen ? '✕' : '☰'}
                    </span>
                </button>
            </div>

            {menuOpen && (
                <nav
                    id="main-navigation-mobile"
                    className={styles.mobileNav}
                    aria-label="Navegación principal"
                >
                    <div className={styles.mobileUser}>
                        <strong>{userName}</strong>
                        <span>{roleLabel}</span>
                    </div>

                    <NavLink to="/restaurante" className={navLinkClass} onClick={closeMenu}>
                        Restaurante
                    </NavLink>
                    {canSeeKitchen && (
                        <NavLink to="/cocina" className={navLinkClass} onClick={closeMenu}>
                            Cocina
                        </NavLink>
                    )}
                    {canSeeAdmin && (
                        <NavLink to="/admin" className={navLinkClass} onClick={closeMenu}>
                            Administración
                        </NavLink>
                    )}

                    <button type="button" className={styles.mobileLogout} onClick={handleLogout}>
                        Salir
                    </button>
                </nav>
            )}
        </header>
    );
}
