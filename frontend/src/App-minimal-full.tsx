import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import MobileNavigation from './components/navigation/mobile-navigation';
import DesktopSidebar from './components/navigation/desktop-sidebar';
import { useIsMobile } from './components/ui/use-mobile';

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
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Welcome, {user.username}!</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  You are logged in successfully.
                </p>
                <div className="space-x-4">
                  <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md">
                    Dashboard
                  </button>
                  <button 
                    onClick={logout}
                    className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
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
