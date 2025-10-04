import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import { useIsMobile } from './components/ui/use-mobile';
import MobileNavigation from './components/navigation/mobile-navigation';

// Ultra-simple Dashboard component - no complex imports
const SimpleDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome back, {user?.username}!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You are logged in successfully. This is your minimal dashboard.
        </p>
        <button 
          onClick={logout} 
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    );
  }

  // Logged in state - SimpleDashboard with MobileNavigation
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <main className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
          <Routes>
            <Route path="/" element={<SimpleDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileNavigation user={user} onLogout={logout} />
        )}
      </div>
      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
