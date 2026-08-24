import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getRoleHome, useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminAgentsPage from './pages/AdminAgentsPage';
import AdminRateCardsPage from './pages/AdminRateCardsPage';
import AdminZonesPage from './pages/AdminZonesPage';
import AgentDashboard from './pages/AgentDashboard';
import CreateOrderPage from './pages/CreateOrderPage';
import CustomerDashboard from './pages/CustomerDashboard';
import LoginPage from './pages/LoginPage';
import OrderDetailPage from './pages/OrderDetailPage';
import RegisterPage from './pages/RegisterPage';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? getRoleHome(user.role) : '/login'} replace />;
}

function AppLayout() {
  return <><Navbar /><main><Outlet /></main></>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/customer/orders" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/orders/new" element={<ProtectedRoute allowedRoles={['customer']}><CreateOrderPage /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={['customer', 'agent', 'admin']}><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/agents" element={<ProtectedRoute allowedRoles={['admin']}><AdminAgentsPage /></ProtectedRoute>} />
        <Route path="/admin/zones" element={<ProtectedRoute allowedRoles={['admin']}><AdminZonesPage /></ProtectedRoute>} />
        <Route path="/admin/rate-cards" element={<ProtectedRoute allowedRoles={['admin']}><AdminRateCardsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
