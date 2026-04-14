import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import UserDetail from './pages/admin/UserDetail';
import Staff from './pages/admin/Staff';
import AdminIncidents from './pages/admin/Incidents';
import Reports from './pages/admin/Reports';
import Audit from './pages/admin/Audit';
import Settings from './pages/admin/Settings';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffMyIncidents from './pages/staff/MyIncidents';
import StaffPerformance from './pages/staff/Performance';

// User pages
import UserDashboard from './pages/user/Dashboard';
import UserMyIncidents from './pages/user/MyIncidents';
import CreateIncident from './pages/user/CreateIncident';

// Shared
import IncidentDetail from './pages/IncidentDetail';
import Profile from './pages/Profile';

function RequireAuth({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  return <Layout />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role.toLowerCase()}`} replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : '/login'} replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAuth roles={['ADMIN']} />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="staff" element={<Staff />} />
        <Route path="incidents" element={<AdminIncidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Staff routes */}
      <Route path="/staff" element={<RequireAuth roles={['STAFF']} />}>
        <Route index element={<StaffDashboard />} />
        <Route path="incidents" element={<StaffMyIncidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="performance" element={<StaffPerformance />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* User routes */}
      <Route path="/user" element={<RequireAuth roles={['USER']} />}>
        <Route index element={<UserDashboard />} />
        <Route path="incidents" element={<UserMyIncidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="create" element={<CreateIncident />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={
        <div className="flex items-center justify-center h-screen flex-col gap-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-8xl font-bold text-gray-200 dark:text-gray-700">404</div>
          <p className="text-gray-500">Page not found</p>
          <button onClick={() => window.history.back()} className="btn-primary">Go Back</button>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AppRoutes />
    </AuthProvider>
  );
}
