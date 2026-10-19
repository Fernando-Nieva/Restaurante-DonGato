import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const KITCHEN_ROLES = ['cocina', 'admin'];

const linkStyle = ({ isActive }) => ({
    color: '#1d4ed8',
    textDecoration: isActive ? 'underline' : 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
});

export default function TopBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const role = String(user?.role ?? '').toLowerCase();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <header
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <strong style={{ fontSize: '0.95rem' }}>Restaurante 3D</strong>

            <nav style={{ display: 'flex', gap: '0.75rem' }}>
                <NavLink to="/restaurante" style={linkStyle}>
                    Salón
                </NavLink>
                {KITCHEN_ROLES.includes(role) && (
                    <NavLink to="/cocina" style={linkStyle}>
                        Cocina
                    </NavLink>
                )}
            </nav>

            <span style={{ marginLeft: 'auto', color: '#374151', fontSize: '0.875rem' }}>
                {user?.name ?? user?.email ?? 'Usuario'} · {user?.role ?? ''}
            </span>

            <button
                type="button"
                onClick={handleLogout}
                style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    color: '#111827',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                }}
            >
                Salir
            </button>
        </header>
    );
}
