import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { 
  Shield, 
  Users, 
  Trophy, 
  AlertTriangle, 
  Activity, 
  Settings,
  Ban,
  UserCheck,
  Crown,
  Lock,
  Unlock
} from 'lucide-react';
import { useIsMobile } from '../ui/use-mobile';
import { toast } from 'sonner';
import { NoUsersState, NoDataState } from '../ui/empty-states';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  isVerified: boolean;
}

interface SystemUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  isVerified: boolean;
  createdAt: string;
  linkedTeams?: any[];
  leagueEntries?: any[];
}

interface League {
  id: string;
  name: string;
  gameweek: number;
  participants: number;
  status: 'open' | 'locked' | 'ended';
  prizePool: number;
  creator: string;
}

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalLeagues: 0,
    paidLeagues: 0,
    freeLeagues: 0,
    totalLeagueEntries: 0,
    totalLinkedTeams: 0,
    recentUsers: 0,
    recentLeagues: 0,
    totalRevenue: 0,
    platformFees: 0,
    lastUpdated: '',
    maintenanceMode: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    username: '',
    password: '',
    phone: '',
    role: 'admin'
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      
      // Load system statistics
      const stats = await apiClient.getAdminStats();
      setSystemStats(prev => ({
        ...prev,
        ...stats,
        maintenanceMode: false // This would come from a system settings API
      }));

      // Load all users
      const users = await apiClient.getAllUsers();
      setSystemUsers(users);

      // Load leagues (we'll use current gameweek leagues)
      try {
        const currentLeagues = await apiClient.getCurrentLeagues();
        setLeagues(currentLeagues.leagues || []);
      } catch (error) {
        console.error('Failed to load leagues:', error);
        setLeagues([]);
      }

      // Activity logs would need a separate API endpoint
      setActivityLogs([]);
      
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      toast.error(error.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.updateUserRole(userId, newRole);
      setSystemUsers(users => 
        users.map(u => 
          u.id === userId ? { ...u, role: newRole as 'user' | 'moderator' | 'admin' | 'super_admin' } : u
        )
      );
      toast.success(`User role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleUserStatusChange = (userId: string, newStatus: string) => {
    setSystemUsers(users => 
      users.map(u => 
        u.id === userId ? { ...u, status: newStatus as 'active' | 'banned' | 'suspended' } : u
      )
    );
    toast.success(`User status updated to ${newStatus}`);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingAdmin(true);
      const result = await apiClient.createAdminUser(newAdminData);
      toast.success('Admin user created successfully');
      setShowCreateAdminModal(false);
      setNewAdminData({
        email: '',
        username: '',
        password: '',
        phone: '',
        role: 'admin'
      });
      // Reload users to show the new admin
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create admin user');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handlePromoteUser = async (userId: string) => {
    try {
      await apiClient.promoteUser(userId);
      toast.success('User promoted successfully');
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to promote user');
    }
  };

  const handleDemoteUser = async (userId: string) => {
    try {
      await apiClient.demoteUser(userId);
      toast.success('User demoted successfully');
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to demote user');
    }
  };

  const handleLeagueStatusChange = (leagueId: string, newStatus: string) => {
    setLeagues(leagues => 
      leagues.map(l => 
        l.id === leagueId ? { ...l, status: newStatus as 'open' | 'locked' | 'ended' } : l
      )
    );
    toast.success(`League status updated to ${newStatus}`);
  };

  const handleMaintenanceMode = (enabled: boolean) => {
    setSystemStats(prev => ({ ...prev, maintenanceMode: enabled }));
    toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default' as const;
      case 'banned': return 'destructive' as const;
      case 'suspended': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const filteredUsers = (systemUsers || []).filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.adminLevel !== 'ADMIN' && user?.adminLevel !== 'SUPER_ADMIN') {
    return (
      <div className="p-4 md:p-6">
        <Card className="clean-card text-center p-12">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto clean-card rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to access the admin panel
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl flex items-center space-x-2">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <span>Admin Panel</span>
          </h1>
          <p className="text-sm text-muted-foreground">System management and controls</p>
        </div>
        
        {/* Maintenance Mode Toggle */}
        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="maintenance" className="text-xs font-medium">
                Maintenance Mode
              </Label>
              <Switch
                id="maintenance"
                checked={systemStats.maintenanceMode}
                onCheckedChange={handleMaintenanceMode}
                className="scale-75"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-xs font-semibold">{(systemStats.totalUsers || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-green-100 flex items-center justify-center">
                <Activity className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-xs font-semibold">{(systemStats.activeUsers || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-purple-100 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Leagues</p>
                <p className="text-xs font-semibold">{systemStats.totalLeagues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Settings className="w-3 h-3 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid Leagues</p>
                <p className="text-xs font-semibold">{systemStats.paidLeagues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Free Leagues</p>
                <p className="text-xs font-semibold">{systemStats.freeLeagues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-3 h-3 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Linked Teams</p>
                <p className="text-xs font-semibold">{systemStats.totalLinkedTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="clean-card">
          <CardContent className="p-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-semibold text-xs">₵</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xs font-semibold">GH₵{(systemStats.totalRevenue || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="users" className="text-xs">
            User Management
          </TabsTrigger>
          <TabsTrigger value="leagues" className="text-xs">
            League Control
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card className="clean-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <CardTitle>User Management</CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-clean w-full md:w-80"
                  />
                  {user?.role === 'super_admin' && (
                    <Button
                      onClick={() => setShowCreateAdminModal(true)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      Create Admin
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile ? (
                // Mobile Card View
                <div className="space-y-1 p-2">
                  {filteredUsers.map((systemUser) => (
                    <Card key={systemUser.id} className="clean-card-sm">
                      <CardContent className="p-2">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {systemUser.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{systemUser.username}</p>
                                <p className="text-xs text-muted-foreground">{systemUser.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <Badge variant={getRoleBadgeVariant(systemUser.role)} className="text-xs px-1 py-0">
                                {systemUser.role}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(systemUser.status)} className="text-xs px-1 py-0">
                                {systemUser.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1">
                            <Select
                              value={systemUser.role}
                              onValueChange={(value) => handleRoleChange(systemUser.id, value)}
                            >
                              <SelectTrigger className="w-16 input-clean h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                {user.adminLevel === 'SUPER_ADMIN' && (
                                  <SelectItem value="super_admin">Super Admin</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={systemUser.status}
                              onValueChange={(value) => handleUserStatusChange(systemUser.id, value)}
                            >
                              <SelectTrigger className="w-16 input-clean h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((systemUser) => (
                        <TableRow key={systemUser.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {systemUser.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{systemUser.username}</p>
                                <p className="text-xs text-muted-foreground">{systemUser.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(systemUser.role)} className="text-xs px-1 py-0">
                              {systemUser.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={systemUser.isVerified ? "default" : "secondary"} className="text-xs px-1 py-0">
                              {systemUser.isVerified ? "Verified" : "Unverified"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{new Date(systemUser.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">{systemUser.phone}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p>{systemUser.linkedTeams?.length || 0} teams</p>
                              <p>{systemUser.leagueEntries?.length || 0} entries</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Select
                                value={systemUser.role}
                                onValueChange={(value) => handleRoleChange(systemUser.id, value)}
                              >
                                <SelectTrigger className="w-16 glass-card border-border/20 rounded-lg h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {user?.role === 'super_admin' && (
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              
                              {user?.role === 'super_admin' && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={() => handlePromoteUser(systemUser.id)}
                                    disabled={systemUser.role === 'super_admin'}
                                  >
                                    Promote
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={() => handleDemoteUser(systemUser.id)}
                                    disabled={systemUser.role === 'user'}
                                  >
                                    Demote
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <NoUsersState />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* League Control */}
        <TabsContent value="leagues" className="space-y-6">
          <Card className="clean-card">
            <CardHeader>
              <CardTitle>League Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile ? (
                // Mobile Card View
                <div className="space-y-2 p-3">
                  {leagues.map((league) => (
                    <Card key={league.id} className="clean-card-sm">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-xs mb-1">{league.name}</h4>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>GW{league.gameweek} • {league.participants} participants</p>
                                <p>Prize Pool: GH₵{league.prizePool}</p>
                                <p>Creator: {league.creator}</p>
                              </div>
                            </div>
                            <Badge variant={league.status === 'open' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                              {league.status}
                            </Badge>
                          </div>
                          
                          <div className="pt-2 border-t border-border">
                            <Select
                              value={league.status}
                              onValueChange={(value) => handleLeagueStatusChange(league.id, value)}
                            >
                              <SelectTrigger className="w-full input-clean h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="locked">Locked</SelectItem>
                                <SelectItem value="ended">Ended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {leagues.length === 0 && (
                    <NoDataState />
                  )}
                </div>
              ) : (
                // Desktop Table View
                <div className="table-responsive">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>League Name</TableHead>
                        <TableHead>Gameweek</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Prize Pool</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leagues.length > 0 ? (
                        leagues.map((league) => (
                          <TableRow key={league.id}>
                            <TableCell className="font-medium text-xs">{league.name}</TableCell>
                            <TableCell className="text-xs">GW{league.gameweek}</TableCell>
                            <TableCell className="text-xs">{league.participants}</TableCell>
                            <TableCell className="text-xs">GH₵{league.prizePool}</TableCell>
                            <TableCell>
                              <Badge variant={league.status === 'open' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                                {league.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={league.status}
                                onValueChange={(value) => handleLeagueStatusChange(league.id, value)}
                              >
                                <SelectTrigger className="w-20 input-clean h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="locked">Locked</SelectItem>
                                  <SelectItem value="ended">Ended</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <NoDataState />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="clean-card">
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile ? (
                // Mobile Card View
                <div className="space-y-2 p-3">
                  {activityLogs.map((log) => (
                    <Card key={log.id} className="clean-card-sm">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-xs mb-1">{log.action}</h4>
                              <p className="text-xs text-muted-foreground">by {log.user}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground border-t border-border pt-2">
                            {log.details}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {activityLogs.length === 0 && (
                    <NoDataState />
                  )}
                </div>
              ) : (
                // Desktop Table View
                <div className="table-responsive">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.length > 0 ? (
                        activityLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium text-xs">{log.action}</TableCell>
                            <TableCell className="text-xs">{log.user}</TableCell>
                            <TableCell className="text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{log.details}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <NoDataState />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create Admin User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newAdminData.username}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newAdminData.phone}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newAdminData.role}
                    onValueChange={(value) => setNewAdminData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateAdminModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreatingAdmin}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    {isCreatingAdmin ? 'Creating...' : 'Create Admin'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
