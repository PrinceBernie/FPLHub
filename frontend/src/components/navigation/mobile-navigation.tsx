import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Trophy, 
  Wallet, 
  Settings,
  Shield
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  isVerified: boolean;
}

interface MobileNavigationProps {
  user: User;
  onLogout: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ user }) => {
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

  // For mobile, we'll show admin in settings if they're admin
  const displayItems = navItems.slice(0, 4);

  return (
    <div className="mobile-nav">
      {displayItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileNavigation;
