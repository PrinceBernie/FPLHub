import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/landing-page';
import AuthPage from './components/auth/auth-page';
import { useIsMobile } from './components/ui/use-mobile';
import MobileNavigation from './components/navigation/mobile-navigation';
import { apiClient } from './services/api';
import { toast } from 'sonner';

// Dashboard component with real API calls
const SafeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = React.useState({ balance: 0, currency: 'GHS' });
  const [leagues, setLeagues] = React.useState<any[]>([]);
  const [linkedTeams, setLinkedTeams] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreatingLeague, setIsCreatingLeague] = React.useState(false);
  const [isLinkingTeam, setIsLinkingTeam] = React.useState(false);

  // Load dashboard data with error boundaries
  React.useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Load wallet with timeout
        try {
          const walletPromise = apiClient.getWallet();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Wallet API timeout')), 5000)
          );
          const walletData = await Promise.race([walletPromise, timeoutPromise]);
          setWallet(walletData as any);
        } catch (err) {
          console.error('Failed to load wallet:', err);
          setWallet({ balance: 0, currency: 'GHS' }); // Default fallback
        }

        // Load leagues with timeout
        try {
          const leaguesPromise = apiClient.getUserLeagues();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Leagues API timeout')), 5000)
          );
          const userLeagues = await Promise.race([leaguesPromise, timeoutPromise]);
          setLeagues(userLeagues as any);
        } catch (err) {
          console.error('Failed to load leagues:', err);
          setLeagues([]); // Default fallback
        }

        // Load linked teams with timeout
        try {
          const teamsPromise = apiClient.getLinkedTeams();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Teams API timeout')), 5000)
          );
          const teams = await Promise.race([teamsPromise, timeoutPromise]);
          setLinkedTeams(teams as any);
        } catch (err) {
          console.error('Failed to load teams:', err);
          setLinkedTeams([]); // Default fallback
        }

      } catch (err) {
        console.error('Dashboard data loading error:', err);
        // Set all defaults on any error
        setWallet({ balance: 0, currency: 'GHS' });
        setLeagues([]);
        setLinkedTeams([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Handle create league
  const handleCreateLeague = async () => {
    setIsCreatingLeague(true);
    try {
      // For now, just show a toast - we'll implement the modal later
      toast.success('Create League feature coming soon!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create league');
    } finally {
      setIsCreatingLeague(false);
    }
  };

  // Handle link FPL team
  const handleLinkTeam = async () => {
    setIsLinkingTeam(true);
    try {
      // For now, just show a toast - we'll implement the modal later
      toast.success('Link FPL Team feature coming soon!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to link team');
    } finally {
      setIsLinkingTeam(false);
    }
  };

  // Error boundary for the entire component
  try {
    if (isLoading) {
      return (
        <div className="container-clean py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username || 'User'}!</h1>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }
    
    return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username || 'User'}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your fantasy football journey.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Your Leagues</h3>
          <p className="text-3xl font-bold text-primary mb-2">{leagues.length}</p>
          <p className="text-sm text-muted-foreground">Active leagues</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Linked Teams</h3>
          <p className="text-3xl font-bold text-primary mb-2">{linkedTeams.length}</p>
          <p className="text-sm text-muted-foreground">FPL teams connected</p>
        </div>
        
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
          <p className="text-3xl font-bold text-primary mb-2">GHS {wallet.balance.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Available balance</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleCreateLeague}
            disabled={isCreatingLeague}
            className="clean-card p-6 text-left hover:bg-accent transition-colors disabled:opacity-50"
          >
            <h3 className="font-semibold mb-2">Create League</h3>
            <p className="text-sm text-muted-foreground">Start your own fantasy league</p>
            {isCreatingLeague && <p className="text-xs text-muted-foreground mt-2">Loading...</p>}
          </button>
          
          <button 
            onClick={handleLinkTeam}
            disabled={isLinkingTeam}
            className="clean-card p-6 text-left hover:bg-accent transition-colors disabled:opacity-50"
          >
            <h3 className="font-semibold mb-2">Link FPL Team</h3>
            <p className="text-sm text-muted-foreground">Connect your Fantasy Premier League team</p>
            {isLinkingTeam && <p className="text-xs text-muted-foreground mt-2">Loading...</p>}
          </button>
        </div>
      </div>

      {/* Show actual data if available */}
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

      {linkedTeams.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your FPL Teams</h2>
          <div className="space-y-3">
            {linkedTeams.map((team: any) => (
              <div key={team.id} className="clean-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{team.teamName}</h3>
                    <p className="text-sm text-muted-foreground">FPL Team ID: {team.fplTeamId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{team.totalPoints || 0} pts</p>
                    <p className="text-xs text-muted-foreground">GW {team.currentGameweek || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    );
  } catch (err) {
    console.error('Dashboard component error:', err);
    return (
      <div className="container-clean py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username || 'User'}!</h1>
          <p className="text-destructive">Error loading dashboard. Please try refreshing the page.</p>
        </div>
        <div className="clean-card p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Dashboard temporarily unavailable</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

// Leaderboard component
const SafeLeaderboard: React.FC = () => {
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
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Join a League
          </button>
        </div>
      </div>
    </div>
  );
};

// Wallet component with real functionality
const SafeWallet: React.FC = () => {
  const [wallet, setWallet] = React.useState({ balance: 0, currency: 'GHS' });
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDepositing, setIsDepositing] = React.useState(false);
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);
  const [depositAmount, setDepositAmount] = React.useState('');
  const [withdrawAmount, setWithdrawAmount] = React.useState('');

  // Load wallet data with error boundaries
  React.useEffect(() => {
    const loadWalletData = async () => {
      try {
        setIsLoading(true);
        
        // Load wallet with timeout
        try {
          const walletPromise = apiClient.getWallet();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Wallet API timeout')), 5000)
          );
          const walletData = await Promise.race([walletPromise, timeoutPromise]);
          setWallet(walletData as any);
        } catch (err) {
          console.error('Failed to load wallet:', err);
          setWallet({ balance: 0, currency: 'GHS' }); // Default fallback
        }
        
        // Load transactions with timeout
        try {
          const transactionsPromise = apiClient.getTransactions();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transactions API timeout')), 5000)
          );
          const transactionData = await Promise.race([transactionsPromise, timeoutPromise]);
          setTransactions(transactionData as any);
        } catch (err) {
          console.error('Failed to load transactions:', err);
          setTransactions([]); // Default fallback
        }
        
      } catch (err) {
        console.error('Failed to load wallet data:', err);
        // Set defaults on any error
        setWallet({ balance: 0, currency: 'GHS' });
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, []);

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    try {
      await apiClient.deposit({
        amount: parseFloat(depositAmount),
        method: 'momo',
        phoneNumber: '+233234567890' // This should come from user settings
      });
      
      toast.success('Deposit request submitted successfully!');
      setDepositAmount('');
      
      // Reload wallet data
      const walletData = await apiClient.getWallet();
      setWallet(walletData);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to process deposit');
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      await apiClient.withdraw({
        amount: parseFloat(withdrawAmount),
        method: 'momo',
        phoneNumber: '+233234567890' // This should come from user settings
      });
      
      toast.success('Withdrawal request submitted successfully!');
      setWithdrawAmount('');
      
      // Reload wallet data
      const walletData = await apiClient.getWallet();
      setWallet(walletData);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to process withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-clean py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Wallet</h1>
          <p className="text-muted-foreground">Loading wallet data...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-clean py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your account balance and transactions.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clean-card p-6">
          <h3 className="text-lg font-semibold mb-4">Current Balance</h3>
          <p className="text-3xl font-bold text-primary mb-2">GHS {wallet.balance.toFixed(2)}</p>
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
                disabled={isDepositing}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isDepositing ? 'Processing...' : 'Deposit Funds'}
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
                disabled={isWithdrawing}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
              >
                {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="clean-card p-6">
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction: any) => (
                <div key={transaction.id} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium">{transaction.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                      {transaction.type === 'deposit' ? '+' : '-'}GHS {transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Settings component
const SafeSettings: React.FC = () => {
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
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Change Password
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
              Update Phone Number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin component
const SafeAdmin: React.FC = () => {
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
          <button className="clean-card p-6 text-left hover:bg-accent transition-colors">
            <h3 className="font-semibold mb-2">User Management</h3>
            <p className="text-sm text-muted-foreground">View and manage user accounts</p>
          </button>
          
          <button className="clean-card p-6 text-left hover:bg-accent transition-colors">
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
              <Route path="/dashboard" element={<SafeDashboard />} />
              <Route path="/leaderboard" element={<SafeLeaderboard />} />
              <Route path="/wallet" element={<SafeWallet />} />
              <Route path="/settings" element={<SafeSettings />} />
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Route path="/admin" element={<SafeAdmin />} />
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
