import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

const FRIENDLY_ERROR = 'No pudimos iniciar sesión. Revisá tu email y contraseña e intentá de nuevo.';

export default function LoginPage() {
    const { token, user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    if (token) {
        return (
            <Navigate
                to={String(user?.role ?? '').toLowerCase() === 'admin' ? '/admin' : '/restaurante'}
                replace
            />
        );
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError(null);

        try {
            const loggedUser = await login(email, password);
            const target =
                String(loggedUser?.role ?? '').toLowerCase() === 'admin'
                    ? '/admin'
                    : '/restaurante';

            navigate(target, { replace: true });
        } catch (loginError) {
            console.error('No se pudo iniciar sesión:', loginError);
            setError(FRIENDLY_ERROR);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.card} aria-labelledby="login-title">
                <div className={styles.brand}>
                    <img className={styles.logo} src={logoUrl} alt="" width="180" height="180" />
                    <h1 id="login-title" className={styles.srOnly}>
                        Don Gato
                    </h1>
                    <p className={styles.subtitle}>Sistema de pedidos</p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            autoComplete="email"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? 'login-error' : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            autoComplete="current-password"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? 'login-error' : undefined}
                        />
                    </div>

                    {error && (
                        <p id="login-error" className={styles.error} role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className={styles.submit}
                        disabled={submitting}
                        aria-busy={submitting}
                    >
                        {submitting && <span className={styles.spinner} aria-hidden="true" />}
                        {submitting ? 'Ingresando…' : 'Ingresar'}
                    </button>
                </form>
            </section>
        </main>
    );
}
