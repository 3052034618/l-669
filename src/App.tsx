import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore.js';
import { Layout } from './components/Layout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import Projects from './pages/Projects.js';
import Works from './pages/Works.js';
import MixingTasks from './pages/MixingTasks.js';
import { Royalty } from './pages/Royalty.js';
import { Admin } from './pages/Admin.js';
import { Notifications } from './pages/Notifications.js';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/projects" element={
          <PrivateRoute>
            <Projects />
          </PrivateRoute>
        } />
        
        <Route path="/works" element={
          <PrivateRoute>
            <Works />
          </PrivateRoute>
        } />
        
        <Route path="/mixing" element={
          <PrivateRoute>
            <MixingTasks />
          </PrivateRoute>
        } />
        
        <Route path="/royalty" element={
          <PrivateRoute>
            <Royalty />
          </PrivateRoute>
        } />
        
        <Route path="/notifications" element={
          <PrivateRoute>
            <Notifications />
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        } />
        
        <Route path="*" element={
          <PrivateRoute>
            <div className="flex flex-col items-center justify-center py-20">
              <h1 className="text-6xl font-bold text-violet-400 mb-4">404</h1>
              <p className="text-slate-400 mb-8">页面未找到</p>
              <Navigate to="/dashboard" replace />
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
