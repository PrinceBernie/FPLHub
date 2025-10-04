import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import { useIsMobile } from './components/ui/use-mobile';
import MobileNavigation from './components/navigation/mobile-navigation';
import { apiClient } from './services/api';

// STEP 2: Add wallet + leagues API calls to dashboard
const Step2Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = React.useState({ balance: 0, currency: 'GHS' });
  const [leagues, setLeagues] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load dashboard data on mount
  React.useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading dashboard data...');
        
        // Load wallet
        try {
          const walletData = await apiClient.getWallet();
          console.log('Wallet loaded:', walletData);
          setWallet(walletData);
        } catch (err: any) {
          console.error('Wallet loading error:', err);
          setWallet({ balance: 0, currency: 'GHS' }); // Default fallback
        }
        
        // Load leagues
        try {
          const userLeagues = await apiClient.getUserLeagues();
          console.log('User leagues loaded:', userLeagues);
          
          // Ensure we have an array
          if (Array.isArray(userLeagues)) {
            setLeagues(userLeagues);
          } else {
            console.warn('getUserLeagues returned non-array:', userLeagues);
            setLeagues([]);
          }
        } catch (err: any) {
          console.error('Leagues loading error:', err);
          setLeagues([]); // Default fallback
        }
        
      } catch (err: any) {
        console.error('Dashboard loading error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username || 'User'}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your fantasy football journey.</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Your Leagues</h3>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-primary mb-2">{leagues.length}</p>
              <p className="text-sm text-muted-foreground">Active leagues</p>
            </div>
          )}
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Linked Teams</h3>
          <p className="text-3xl font-bold text-primary mb-2">0</p>
          <p className="text-sm text-muted-foreground">FPL teams connected</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-primary mb-2">GHS {wallet.balance.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Available balance</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => alert('Create League clicked!')}
            className="clean-card p-6 text-left hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2">Create League</h3>
            <p className="text-sm text-muted-foreground">Start your own fantasy league</p>
          </button>
          
          <button 
            onClick={() => alert('Link FPL Team clicked!')}
            className="clean-card p-6 text-left hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2">Link FPL Team</h3>
            <p className="text-sm text-muted-foreground">Connect your Fantasy Premier League team</p>
          </button>
        </div>
      </div>

      {/* Show actual leagues if available */}
      {leagues.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Leagues</h2>
          <div className="space-y-3">
            {leagues.slice(0, 3).map((league: any) => (
              <div key={league.id} className="clean-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{league.league?.name || 'Unknown League'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {league.league?.format || 'Classic'} • {league.league?.season || '2025'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{league.totalPoints || 0} pts</p>
                    <p className="text-xs text-muted-foreground">Rank #{league.rank || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Keep other components static for now
const BulletproofWallet: React.FC = () => {
  const [depositAmount, setDepositAmount] = React.useState('');
  const [withdrawAmount, setWithdrawAmount] = React.useState('');

  const handleDeposit = () => {
    if (!depositAmount) {
      alert('Please enter an amount');
      return;
    }
    alert(`Deposit ${depositAmount} GHS - Feature coming soon!`);
    setDepositAmount('');
  };

  const handleWithdraw = () => {
    if (!withdrawAmount) {
      alert('Please enter an amount');
      return;
    }
    alert(`Withdraw ${withdrawAmount} GHS - Feature coming soon!`);
    setWithdrawAmount('');
  };

  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your account balance and transactions.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-4">Current Balance</h3>
          <p className="text-3xl font-bold text-primary mb-2">GHS 0.00</p>
          <p className="text-sm text-muted-foreground">Available balance</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Deposit Amount (GHS)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-border rounded-md bg-background mb-2"
              />
              <button 
                onClick={handleDeposit}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Deposit Funds
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Withdraw Amount (GHS)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-border rounded-md bg-background mb-2"
              />
              <button 
                onClick={handleWithdraw}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Withdraw Funds
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="clean-card p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const BulletproofLeaderboard: React.FC = () => {
  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">Track standings across your leagues.</p>
      </div>
      
      <div className="clean-card p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No Leagues Joined</h3>
          <p className="text-muted-foreground mb-4">You haven't joined any leagues yet.</p>
          <button 
            onClick={() => alert('Join League clicked!')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Join a League
          </button>
        </div>
      </div>
    </div>
  );
};

const BulletproofSettings: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and security.</p>
      </div>
      
      <div className="space-y-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input 
                type="text" 
                value={user?.username || ''} 
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input 
                type="tel" 
                value={user?.phone || ''} 
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                readOnly
              />
            </div>
          </div>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-4">Security</h3>
          <div className="space-y-3">
            <button 
              onClick={() => alert('Change Password clicked!')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Change Password
            </button>
            <button 
              onClick={() => alert('Update Phone clicked!')}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Update Phone Number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BulletproofAdmin: React.FC = () => {
  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, leagues, and system settings.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-primary mb-2">1</p>
          <p className="text-sm text-muted-foreground">Registered users</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Active Leagues</h3>
          <p className="text-3xl font-bold text-primary mb-2">0</p>
          <p className="text-sm text-muted-foreground">Running leagues</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-primary mb-2">GHS 0.00</p>
          <p className="text-sm text-muted-foreground">Platform earnings</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">System Status</h3>
          <p className="text-3xl font-bold text-green-500 mb-2">Online</p>
          <p className="text-sm text-muted-foreground">All systems operational</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => alert('User Management clicked!')}
            className="clean-card p-6 text-left hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2">User Management</h3>
            <p className="text-sm text-muted-foreground">View and manage user accounts</p>
          </button>
          
          <button 
            onClick={() => alert('System Settings clicked!')}
            className="clean-card p-6 text-left hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-2">System Settings</h3>
            <p className="text-sm text-muted-foreground">Configure platform settings</p>
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Desktop Sidebar
const SimpleDesktopSidebar: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-bold">FPL Hub</h2>
        </div>
        <nav className="space-y-2">
          <a href="#/dashboard" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
            Dashboard
          </a>
          <a href="#/leaderboard" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
            Leaderboard
          </a>
          <a href="#/wallet" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
            Wallet
          </a>
          <a href="#/settings" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
            Settings
          </a>
          {user.role === 'admin' || user.role === 'super_admin' ? (
            <a href="#/admin" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              Admin Panel
            </a>
          ) : null}
        </nav>
      </div>
      <div className="mt-auto p-6 border-t border-border">
        <div className="mb-4">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full px-3 py-2 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10"
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
          <SimpleDesktopSidebar user={user} onLogout={logout} />
        )}

        {/* Main Content */}
        <div className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
          <main className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Step2Dashboard />} />
              <Route path="/leaderboard" element={<BulletproofLeaderboard />} />
              <Route path="/wallet" element={<BulletproofWallet />} />
              <Route path="/settings" element={<BulletproofSettings />} />
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Route path="/admin" element={<BulletproofAdmin />} />
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
