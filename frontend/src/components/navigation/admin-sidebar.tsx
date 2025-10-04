import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  LogOut,
  Crown,
  UserCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';

interface AdminSidebarProps {
  user: any;
  onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const adminNavItems = [
    {
      path: '/admin-dashboard',
      label: 'Admin Dashboard',
      icon: LayoutDashboard,
      description: 'System overview and metrics'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
      {/* Top Section */}
      <div className="p-6">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Phantacci</div>
              <div className="text-xs text-muted-foreground">ADMIN HUB</div>
            </div>
          </div>
        </div>

        {/* Admin Badge */}
        <div className="mb-6">
          <Badge className="bg-red-100 text-red-800 w-full justify-center">
            <Shield className="w-3 h-3 mr-2" />
            {user?.adminLevel === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs ${
                    active ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-6 border-t border-border">
        {/* User Profile */}
        <div className="mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{user?.username}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-800">System Healthy</span>
          </div>
          <div className="text-xs text-green-600 mt-1">All services operational</div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={onLogout}
          variant="outline"
          size="sm"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
