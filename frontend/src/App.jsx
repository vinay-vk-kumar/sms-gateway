/**
 * Routing:
 *   /              → Landing page (public, 3D)
 *   /login         → Login / Register
 *   /forgot-password → OTP reset flow
 *   /dashboard     → Dashboard (protected)
 *   /devices       → Devices  (protected)
 *   /logs          → SMS Logs (protected)
 *   /api-keys      → API Keys (protected)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import NetworkStatus from './components/NetworkStatus';
import ErrorBoundary from './components/ErrorBoundary';

import Landing from './pages/Landing';
import Docs from './pages/Docs';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Logs from './pages/Logs';
import ApiKeys from './pages/ApiKeys';
import NotFound from './pages/NotFound';

function AppLayout({ children }) {
  return (
    <div className="md:flex" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f1f1f',
                color: '#ededed',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                padding: '10px 14px',
                maxWidth: '380px',
              },
              success: {
                iconTheme: { primary: '#4ade80', secondary: '#1f1f1f' },
                style: { borderLeft: '3px solid #22c55e' },
              },
              error: {
                iconTheme: { primary: '#f87171', secondary: '#1f1f1f' },
                style: { borderLeft: '3px solid #ef4444' },
                duration: 6000,
              },
              loading: {
                iconTheme: { primary: '#818cf8', secondary: '#1f1f1f' },
                style: { borderLeft: '3px solid #6366f1' },
              },
            }}
          />

          <NetworkStatus />

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected — all under /dashboard prefix */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/devices" element={<ProtectedRoute><AppLayout><Devices /></AppLayout></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><AppLayout><Logs /></AppLayout></ProtectedRoute>} />
            <Route path="/api-keys" element={<ProtectedRoute><AppLayout><ApiKeys /></AppLayout></ProtectedRoute>} />

            {/* 404 */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
