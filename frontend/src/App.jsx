import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import RestaurantPage from './pages/RestaurantPage';

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
                    </Route>
                    <Route path="*" element={<Navigate to="/restaurante" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
