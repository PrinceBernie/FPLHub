import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Shield,
  Database,
  Server,
  Activity,
  Eye,
  Trash2,
  Calendar,
  Zap,
  Bug,
  Lock,
  Unlock,
  Mail,
  CreditCard,
  Trophy,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  category: 'AUTH' | 'USER' | 'LEAGUE' | 'PAYMENT' | 'SYSTEM' | 'SECURITY' | 'API' | 'DATABASE';
  message: string;
  details?: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
}

interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  recentErrors: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  topUsers: Array<{ userId: string; username: string; activityCount: number }>;
  systemHealth: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    databaseConnections: number;
  };
}

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [levelFilter, categoryFilter, dateFilter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs();
        loadStats();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const logsData = await apiClient.getSystemLogs({
        level: levelFilter,
        category: categoryFilter,
        dateRange: dateFilter
      });
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to load system logs:', error);
      toast.error('Failed to load system logs');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiClient.getLogStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load log stats:', error);
      setStats(null);
    }
  };

  const getMockLogs = (): LogEntry[] => [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      level: 'ERROR',
      category: 'AUTH',
      message: 'Failed login attempt for user admin@example.com',
      details: 'Invalid password provided',
      userId: 'user-123',
      username: 'admin@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requestId: 'req-456',
      statusCode: 401,
      endpoint: '/api/auth/login',
      method: 'POST'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      level: 'INFO',
      category: 'USER',
      message: 'User profile updated successfully',
      details: 'Profile information updated for user john_doe',
      userId: 'user-456',
      username: 'john_doe',
      ipAddress: '192.168.1.101',
      requestId: 'req-789',
      statusCode: 200,
      endpoint: '/api/user/profile',
      method: 'PUT',
      duration: 245
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      level: 'WARN',
      category: 'PAYMENT',
      message: 'Payment processing timeout',
      details: 'Payment gateway response timeout after 30 seconds',
      userId: 'user-789',
      username: 'jane_smith',
      ipAddress: '192.168.1.102',
      requestId: 'req-012',
      statusCode: 408,
      endpoint: '/api/payment/process',
      method: 'POST',
      duration: 30000
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      level: 'INFO',
      category: 'LEAGUE',
      message: 'New league created',
      details: 'League "Premier League Champions" created with 20 teams',
      userId: 'user-321',
      username: 'league_creator',
      ipAddress: '192.168.1.103',
      requestId: 'req-345',
      statusCode: 201,
      endpoint: '/api/leagues',
      method: 'POST',
      duration: 1200
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      level: 'ERROR',
      category: 'DATABASE',
      message: 'Database connection pool exhausted',
      details: 'Unable to acquire connection from pool',
      requestId: 'req-678',
      statusCode: 500,
      endpoint: '/api/leagues/active',
      method: 'GET',
      errorStack: 'Error: Connection pool exhausted\n    at Pool.acquire (/app/node_modules/pg/lib/pool.js:123:45)'
    }
  ];

  const getMockStats = (): LogStats => ({
    totalLogs: 15420,
    errorCount: 234,
    warningCount: 456,
    infoCount: 14200,
    debugCount: 530,
    recentErrors: 12,
    averageResponseTime: 245,
    topEndpoints: [
      { endpoint: '/api/auth/login', count: 1250, avgResponseTime: 180 },
      { endpoint: '/api/leagues', count: 890, avgResponseTime: 320 },
      { endpoint: '/api/user/profile', count: 650, avgResponseTime: 150 },
      { endpoint: '/api/payment/process', count: 420, avgResponseTime: 2800 }
    ],
    topUsers: [
      { userId: 'user-123', username: 'admin@example.com', activityCount: 125 },
      { userId: 'user-456', username: 'john_doe', activityCount: 89 },
      { userId: 'user-789', username: 'jane_smith', activityCount: 67 }
    ],
    systemHealth: {
      uptime: 99.8,
      memoryUsage: 68.5,
      cpuUsage: 45.2,
      diskUsage: 34.7,
      databaseConnections: 12
    }
  });

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.endpoint?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Category', 'Message', 'User', 'IP', 'Endpoint', 'Status'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        log.level,
        log.category,
        log.message.replace(/,/g, ';'),
        log.username || 'N/A',
        log.ipAddress || 'N/A',
        log.endpoint || 'N/A',
        log.statusCode || 'N/A'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearLogs = async () => {
    try {
      await apiClient.clearSystemLogs?.();
      toast.success('Logs cleared successfully');
      loadLogs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear logs');
    }
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      'DEBUG': 'bg-gray-100 text-gray-800',
      'INFO': 'bg-blue-100 text-blue-800',
      'WARN': 'bg-yellow-100 text-yellow-800',
      'ERROR': 'bg-red-100 text-red-800',
      'FATAL': 'bg-red-200 text-red-900'
    };
    return (
      <Badge className={colors[level as keyof typeof colors] || colors.INFO}>
        {level}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'AUTH': Shield,
      'USER': User,
      'LEAGUE': Trophy,
      'PAYMENT': CreditCard,
      'SYSTEM': Server,
      'SECURITY': Lock,
      'API': Activity,
      'DATABASE': Database
    };
    const Icon = icons[category as keyof typeof icons] || Info;
    return <Icon className="w-4 h-4" />;
  };

  const getLevelIcon = (level: string) => {
    const icons = {
      'DEBUG': Info,
      'INFO': Info,
      'WARN': AlertTriangle,
      'ERROR': XCircle,
      'FATAL': XCircle
    };
    const Icon = icons[level as keyof typeof icons] || Info;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading system logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            System Logs
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor system activity, errors, and audit trails
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-100 text-green-800' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={clearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-lg font-semibold">{(stats.totalLogs || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-lg font-semibold">{stats.errorCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-lg font-semibold">{stats.warningCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-lg font-semibold">{stats.averageResponseTime || 0}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center gap-4">
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-semibold">{stats.systemHealth?.uptime || 0}%</p>
              </div>
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Memory</p>
                <p className="text-lg font-semibold">{stats.systemHealth?.memoryUsage || 0}%</p>
              </div>
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                  <Server className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-sm text-muted-foreground">CPU</p>
                <p className="text-lg font-semibold">{stats.systemHealth?.cpuUsage || 0}%</p>
              </div>
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-muted-foreground">Disk</p>
                <p className="text-lg font-semibold">{stats.systemHealth?.diskUsage || 0}%</p>
              </div>
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">DB Connections</p>
                <p className="text-lg font-semibold">{stats.systemHealth?.databaseConnections || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="FATAL">Fatal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AUTH">Authentication</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="LEAGUE">League</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="DATABASE">Database</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getLevelIcon(log.level)}
                        {getLevelBadge(log.level)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(log.category)}
                        <span className="text-sm">{log.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate">{log.message}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{log.username || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {log.endpoint && (
                          <div className="flex items-center space-x-2">
                            <Activity className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm truncate">{log.method} {log.endpoint}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.statusCode && (
                        <Badge 
                          className={
                            log.statusCode >= 200 && log.statusCode < 300 
                              ? 'bg-green-100 text-green-800'
                              : log.statusCode >= 400 && log.statusCode < 500
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {log.statusCode}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.duration && (
                        <span className="text-sm text-muted-foreground">
                          {log.duration}ms
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogModal(true);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {showLogModal && selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => {
            setShowLogModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
};

// Log Detail Modal Component
const LogDetailModal: React.FC<{
  log: LogEntry;
  onClose: () => void;
}> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Log Entry Details</h2>
          <Button variant="outline" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Timestamp</Label>
              <p className="font-medium">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</p>
            </div>
            <div>
              <Label>Level</Label>
              <p className="font-medium">{log.level}</p>
            </div>
            <div>
              <Label>Category</Label>
              <p className="font-medium">{log.category}</p>
            </div>
            <div>
              <Label>Request ID</Label>
              <p className="font-medium">{log.requestId || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <Label>Message</Label>
            <p className="font-medium">{log.message}</p>
          </div>
          
          {log.details && (
            <div>
              <Label>Details</Label>
              <p className="font-medium">{log.details}</p>
            </div>
          )}
          
          {log.userId && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>User ID</Label>
                <p className="font-medium">{log.userId}</p>
              </div>
              <div>
                <Label>Username</Label>
                <p className="font-medium">{log.username}</p>
              </div>
            </div>
          )}
          
          {log.ipAddress && (
            <div>
              <Label>IP Address</Label>
              <p className="font-medium">{log.ipAddress}</p>
            </div>
          )}
          
          {log.endpoint && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Endpoint</Label>
                <p className="font-medium">{log.method} {log.endpoint}</p>
              </div>
              <div>
                <Label>Status Code</Label>
                <p className="font-medium">{log.statusCode}</p>
              </div>
            </div>
          )}
          
          {log.duration && (
            <div>
              <Label>Duration</Label>
              <p className="font-medium">{log.duration}ms</p>
            </div>
          )}
          
          {log.userAgent && (
            <div>
              <Label>User Agent</Label>
              <p className="font-medium text-sm break-all">{log.userAgent}</p>
            </div>
          )}
          
          {log.errorStack && (
            <div>
              <Label>Error Stack</Label>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {log.errorStack}
              </pre>
            </div>
          )}
          
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <Label>Metadata</Label>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
