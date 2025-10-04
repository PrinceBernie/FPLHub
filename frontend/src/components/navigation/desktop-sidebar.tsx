import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Trophy, 
  Wallet, 
  Settings, 
  Shield,
  LogOut,
  User
} from 'lucide-react';
import PhantacciLogo from '../ui/phantacci-logo';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  isVerified: boolean;
}

interface DesktopSidebarProps {
  user: User;
  onLogout: () => void;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      path: '/leaderboard', 
      label: 'Leaderboard', 
      icon: Trophy 
    },
    { 
      path: '/wallet', 
      label: 'Wallet', 
      icon: Wallet 
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: Settings 
    },
  ];

  if (user.adminLevel === 'ADMIN' || user.adminLevel === 'SUPER_ADMIN') {
    navItems.push({
      path: '/admin',
      label: 'Admin Panel',
      icon: Shield
    });
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
      {/* Top Section */}
      <div className="p-6">
        {/* Logo */}
        <div className="mb-8">
          <PhantacciLogo size="lg" />
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - Profile & Logout */}
      <div className="mt-auto p-6 border-t border-border">
        {/* User Profile */}
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {user.adminLevel && user.adminLevel !== 'USER' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 mt-1">
                {user.adminLevel.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default DesktopSidebar;
