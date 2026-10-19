import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { token, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    if (token) {
        return <Navigate to="/restaurante" replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError(null);

        try {
            await login(email, password);
            navigate('/restaurante', { replace: true });
        } catch (loginError) {
            setError(loginError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main
            style={{
                fontFamily: 'system-ui, sans-serif',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    width: '20rem',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                }}
            >
                <h1 style={{ fontSize: '1.125rem', margin: 0 }}>Restaurante 3D — Ingreso</h1>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                        style={{ padding: '0.4rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Contraseña
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete="current-password"
                        style={{ padding: '0.4rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    />
                </label>

                {error && (
                    <p role="alert" style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem' }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        backgroundColor: submitting ? '#93c5fd' : '#2563eb',
                        color: '#ffffff',
                        fontWeight: 600,
                        cursor: submitting ? 'wait' : 'pointer',
                    }}
                >
                    {submitting ? 'Ingresando…' : 'Ingresar'}
                </button>
            </form>
        </main>
    );
}
