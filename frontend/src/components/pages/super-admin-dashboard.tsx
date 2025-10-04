import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  Trophy, 
  DollarSign, 
  Activity, 
  Shield, 
  Settings,
  BarChart3,
  AlertTriangle,
  UserCheck,
  UserX,
  Crown,
  Database,
  TrendingUp,
  Clock,
  Globe,
  UserPlus,
  Plus,
  CreditCard,
  Bell,
  Lock,
  Mail,
  Calendar,
  Target,
  Star,
  FileText,
  Zap,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';
import UserManagement from './admin/user-management';
import LeagueManagement from './admin/league-management';
import Financial from './admin/financial';
import Analytics from './admin/analytics';
import SystemSettings from './admin/system-settings';
import SystemLogs from './admin/system-logs';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalLeagues: number;
  activeLeagues: number;
  totalRevenue: number;
  platformFees: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'league_created' | 'payment_received' | 'system_alert';
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high';
}

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalLeagues: 0,
    activeLeagues: 0,
    totalRevenue: 0,
    platformFees: 0,
    systemHealth: 'healthy'
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from localStorage, fallback to 'users'
    const savedTab = localStorage.getItem('adminDashboardActiveTab');
    const validTabs = ['users', 'leagues', 'financial', 'analytics', 'settings', 'logs'];
    return validTabs.includes(savedTab || '') ? savedTab : 'users';
  });

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminDashboardActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setIsLoading(true);
      
      // Load system statistics
      const [usersData, leaguesData, revenueData] = await Promise.allSettled([
        apiClient.getSystemUsers?.() || Promise.resolve({ users: [] }),
        apiClient.getCurrentLeagues?.() || Promise.resolve({ leagues: [] }),
        apiClient.getSystemRevenue?.() || Promise.resolve({ revenue: 0, fees: 0 })
      ]);

      // Process users data
      if (usersData.status === 'fulfilled') {
        const users = usersData.value.users || [];
        setSystemStats(prev => ({
          ...prev,
          totalUsers: users.length,
          activeUsers: users.filter((u: any) => u.isActive).length
        }));
      }

      // Process leagues data
      if (leaguesData.status === 'fulfilled') {
        const leagues = leaguesData.value.leagues || [];
        setSystemStats(prev => ({
          ...prev,
          totalLeagues: leagues.length,
          activeLeagues: leagues.filter((l: any) => l.status === 'ACTIVE').length
        }));
      }

      // Process revenue data
      if (revenueData.status === 'fulfilled') {
        setSystemStats(prev => ({
          ...prev,
          totalRevenue: revenueData.value.revenue || 0,
          platformFees: revenueData.value.fees || 0
        }));
      }

      // Mock recent activity for now
      setRecentActivity([
        {
          id: '1',
          type: 'user_registration',
          description: 'New user registered: john_doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          severity: 'low'
        },
        {
          id: '2',
          type: 'league_created',
          description: 'New league created: Gameweek 15 Champions',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          severity: 'medium'
        },
        {
          id: '3',
          type: 'payment_received',
          description: 'Payment received: GHS 50.00',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          severity: 'low'
        }
      ]);

    } catch (error) {
      console.error('Failed to load system data:', error);
      toast.error('Failed to load system data');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <UserCheck className="w-4 h-4" />;
      case 'league_created': return <Trophy className="w-4 h-4" />;
      case 'payment_received': return <DollarSign className="w-4 h-4" />;
      case 'system_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading system data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Super Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-100 text-red-800">
            <Shield className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
          <Button onClick={loadSystemData} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getSystemHealthColor(systemStats.systemHealth)}`}></div>
              <span className="font-medium text-sm">System Status</span>
            </div>
            <Badge className={getSystemHealthColor(systemStats.systemHealth)}>
              {systemStats.systemHealth.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="mb-2">
          <div 
            className="flex rounded-lg"
            style={{ 
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid #4b5563',
              padding: '1px',
              gap: '4px'
            }}
          >
            {[
              { label: 'User Management', value: 'users' },
              { label: 'League Management', value: 'leagues' },
              { label: 'Financial', value: 'financial' },
              { label: 'Analytics', value: 'analytics' },
              { label: 'System Settings', value: 'settings' },
              { label: 'System Logs', value: 'logs' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 flex-1"
                style={{
                  backgroundColor: activeTab === tab.value ? '#2563eb' : 'transparent',
                  color: activeTab === tab.value ? '#ffffff' : '#9ca3af',
                  boxShadow: activeTab === tab.value ? '0 2px 4px -1px rgba(0, 0, 0, 0.1)' : 'none',
                  margin: '0 2px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.value) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.value) {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>


        <TabsContent value="users" className="space-y-3">
          <UserManagement />
        </TabsContent>

        <TabsContent value="leagues" className="space-y-3">
          <LeagueManagement />
        </TabsContent>

        <TabsContent value="financial" className="space-y-3">
          <Financial />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          <Analytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-3">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="logs" className="space-y-3">
          <SystemLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
