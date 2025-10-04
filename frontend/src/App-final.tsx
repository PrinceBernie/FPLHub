import React, { useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import PhantacciLogo from './components/ui/phantacci-logo';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout Components
import MobileNavigation from './components/navigation/mobile-navigation';
import DesktopSidebar from './components/navigation/desktop-sidebar';

// Auth Components
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import OtpModal from './components/auth/otp-modal';

// Main App Components
import Dashboard from './components/pages/dashboard';
import Leaderboard from './components/pages/leaderboard';
import Wallet from './components/pages/wallet';
import Settings from './components/pages/settings';
import AdminPanel from './components/pages/admin-panel';
import GamesFlow from './components/pages/games-flow';

// Utils
import { useIsMobile } from './components/ui/use-mobile';

function AppContent() {
  const { user, isLoading, logout, showOtpModal, setShowOtpModal, pendingSignup } = useAuth();
  const isMobile = useIsMobile();

  // Memoize the onClose function to prevent re-renders
  const handleOtpModalClose = useCallback(() => {
    setShowOtpModal(false);
  }, [setShowOtpModal]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="clean-card p-8 text-center">
          <div className="flex justify-center mb-4">
            <PhantacciLogo size="lg" animate={true} />
          </div>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
        
        {/* OTP Modal for unverified users - Outside Router to prevent re-renders */}
        {showOtpModal && pendingSignup && (
          <OtpModal
            isOpen={showOtpModal}
            onClose={handleOtpModalClose}
            pendingSignup={pendingSignup}
          />
        )}
      </>
    );
  }

  return (
    <>
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/games/:gameType" element={<GamesFlow />} />
                {(user.adminLevel === 'ADMIN' || user.adminLevel === 'SUPER_ADMIN') && (
                  <Route path="/admin" element={<AdminPanel />} />
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
    </>
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
