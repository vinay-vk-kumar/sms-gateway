import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ProtectedRoute({ children }) {
  const { isAuth, user, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-white/10 border-t-white/80 rounded-full" />
      </div>
    );
  }

  if (!isAuth) return <Navigate to="/login" replace />;
  if (user && !user.isVerified) return <Navigate to="/verify-email" replace />;
  return children;
}
