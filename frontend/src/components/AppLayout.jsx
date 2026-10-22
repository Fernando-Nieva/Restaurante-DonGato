import { Outlet } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import AppHeader from './AppHeader';
import styles from './AppLayout.module.css';

export default function AppLayout() {
    return (
        <ToastProvider>
            <div className={styles.shell}>
                <a className={styles.skipLink} href="#contenido">
                    Saltar al contenido
                </a>
                <AppHeader />
                <main id="contenido" className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </ToastProvider>
    );
}
