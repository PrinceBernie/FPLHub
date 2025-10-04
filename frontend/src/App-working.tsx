import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import MobileNavigation from './components/navigation/mobile-navigation';
import DesktopSidebar from './components/navigation/desktop-sidebar';
import { useIsMobile } from './components/ui/use-mobile';

// Simple Dashboard component
const SimpleDashboard: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your fantasy football journey.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Your Leagues</h3>
          <p className="text-3xl font-bold text-primary mb-2">0</p>
          <p className="text-sm text-muted-foreground">Active leagues</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Linked Teams</h3>
          <p className="text-3xl font-bold text-primary mb-2">0</p>
          <p className="text-sm text-muted-foreground">FPL teams connected</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
          <p className="text-3xl font-bold text-primary mb-2">GHS 0.00</p>
          <p className="text-sm text-muted-foreground">Available balance</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="clean-card p-6 text-left hover:bg-accent transition-colors">
            <h3 className="font-semibold mb-2">Create League</h3>
            <p className="text-sm text-muted-foreground">Start your own fantasy league</p>
          </button>
          
          <button className="clean-card p-6 text-left hover:bg-accent transition-colors">
            <h3 className="font-semibold mb-2">Link FPL Team</h3>
            <p className="text-sm text-muted-foreground">Connect your Fantasy Premier League team</p>
          </button>
        </div>
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
          <Toaster />
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <DesktopSidebar user={user} onLogout={logout} />
        )}

        {/* Main Content */}
        <div className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
          <main className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<SimpleDashboard />} />
              <Route path="/leaderboard" element={<SimpleDashboard />} />
              <Route path="/wallet" element={<SimpleDashboard />} />
              <Route path="/settings" element={<SimpleDashboard />} />
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Route path="/admin" element={<SimpleDashboard />} />
              )}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <MobileNavigation user={user} onLogout={logout} />
          )}
        </div>
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
