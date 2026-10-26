import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/admin/AdminLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import RestaurantPage from './pages/RestaurantPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMenuPage from './pages/admin/AdminMenuPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminReservationsPage from './pages/admin/AdminReservationsPage';
import AdminTablesPage from './pages/admin/AdminTablesPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const KITCHEN_ROLES = ['cocina', 'admin'];

function ProtectedLayout() {
    const { token } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <AppLayout />;
}

function KitchenRoute() {
    const { user } = useAuth();

    const role = String(user?.role ?? '').toLowerCase();

    if (!KITCHEN_ROLES.includes(role)) {
        return <Navigate to="/restaurante" replace />;
    }

    return <KitchenPage />;
}

function AdminRoute() {
    const { user } = useAuth();

    if (String(user?.role ?? '').toLowerCase() !== 'admin') {
        return <Navigate to="/restaurante" replace />;
    }

    return <Outlet />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/restaurante" replace />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedLayout />}>
                        <Route path="/restaurante" element={<RestaurantPage />} />
                        <Route path="/cocina" element={<KitchenRoute />} />

                        <Route path="/admin" element={<AdminRoute />}>
                            <Route element={<AdminLayout />}>
                                <Route index element={<AdminDashboardPage />} />
                                <Route path="carta" element={<AdminMenuPage />} />
                                <Route path="mesas" element={<AdminTablesPage />} />
                                <Route
                                    path="reservas"
                                    element={<AdminReservationsPage />}
                                />
                                <Route path="usuarios" element={<AdminUsersPage />} />
                                <Route path="pedidos" element={<AdminOrdersPage />} />
                                <Route
                                    path="*"
                                    element={<Navigate to="/admin" replace />}
                                />
                            </Route>
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/restaurante" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
