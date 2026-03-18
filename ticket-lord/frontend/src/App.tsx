import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import Home from './screens/Home';
import EventDetail from './screens/EventDetail';
import Checkout from './screens/Checkout';
import MyTickets from './screens/MyTickets';
import Profile from './screens/Profile';
import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import ForgotPassword from './screens/auth/ForgotPassword';
import ResetPassword from './screens/auth/ResetPassword';
import VerifyEmail from './screens/auth/VerifyEmail';

// Host screens
import HostDashboard from './screens/host/HostDashboard';
import CreateEvent from './screens/host/CreateEvent';
import EditEvent from './screens/host/EditEvent';
import EventAttendees from './screens/host/EventAttendees';
import CheckInScanner from './screens/host/CheckInScanner';
import StripeConnect from './screens/host/StripeConnect';

import Layout from './components/Layout';
import Spinner from './components/Spinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Attendee protected */}
      <Route element={<Layout />}>
        <Route path="/checkout/:eventId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>

      {/* Host protected */}
      <Route element={<Layout />}>
        <Route path="/host" element={<ProtectedRoute role="host"><HostDashboard /></ProtectedRoute>} />
        <Route path="/host/events/new" element={<ProtectedRoute role="host"><CreateEvent /></ProtectedRoute>} />
        <Route path="/host/events/:id/edit" element={<ProtectedRoute role="host"><EditEvent /></ProtectedRoute>} />
        <Route path="/host/events/:id/attendees" element={<ProtectedRoute role="host"><EventAttendees /></ProtectedRoute>} />
        <Route path="/host/events/:id/check-in" element={<ProtectedRoute role="host"><CheckInScanner /></ProtectedRoute>} />
        <Route path="/host/stripe-return" element={<ProtectedRoute role="host"><StripeConnect /></ProtectedRoute>} />
        <Route path="/host/stripe-refresh" element={<ProtectedRoute role="host"><StripeConnect /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
