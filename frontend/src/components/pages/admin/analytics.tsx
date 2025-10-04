import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Trophy, 
  DollarSign, 
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  Target,
  Zap,
  Clock,
  Star,
  Award,
  PieChart,
  LineChart
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
    retentionRate: number;
    averageSessionDuration: number;
    topCountries: Array<{ country: string; users: number; percentage: number }>;
    userEngagement: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  leagueMetrics: {
    totalLeagues: number;
    activeLeagues: number;
    completedLeagues: number;
    averageLeagueSize: number;
    leagueParticipation: number;
    popularFormats: Array<{ format: string; count: number; percentage: number }>;
    leaguePerformance: {
      totalEntries: number;
      totalRevenue: number;
      averageEntryFee: number;
    };
  };
  financialMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    averageTransactionValue: number;
    transactionVolume: number;
    platformFees: number;
    revenueBySource: Array<{ source: string; amount: number; percentage: number }>;
    paymentMethodDistribution: Array<{ method: string; count: number; percentage: number }>;
  };
  performanceMetrics: {
    systemUptime: number;
    averageResponseTime: number;
    errorRate: number;
    apiCallsPerMinute: number;
    databasePerformance: number;
    serverLoad: number;
    cacheHitRate: number;
  };
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageTimeOnSite: number;
    pageViews: number;
    bounceRate: number;
    featureUsage: Array<{ feature: string; usage: number; percentage: number }>;
  };
  timeRange: string;
  lastUpdated: string;
}

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  };


  const exportAnalytics = () => {
    if (!analyticsData) return;
    
    const csvContent = [
      ['Metric', 'Value', 'Time Range', 'Last Updated'].join(','),
      ['Total Users', analyticsData.userMetrics?.totalUsers || 0, timeRange, analyticsData.lastUpdated || 'N/A'].join(','),
      ['Active Users', analyticsData.userMetrics?.activeUsers || 0, timeRange, analyticsData.lastUpdated || 'N/A'].join(','),
      ['Total Revenue', analyticsData.financialMetrics?.totalRevenue || 0, timeRange, analyticsData.lastUpdated || 'N/A'].join(','),
      ['System Uptime', analyticsData.performanceMetrics?.systemUptime || 0, timeRange, analyticsData.lastUpdated || 'N/A'].join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
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
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Platform insights, performance metrics, and user analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadAnalyticsData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-lg font-semibold">{(analyticsData.userMetrics?.totalUsers || 0).toLocaleString()}</p>
                <p className="text-xs text-green-600">+{analyticsData.userMetrics?.userGrowth || 0}% growth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Leagues</p>
                <p className="text-lg font-semibold">{analyticsData.leagueMetrics?.activeLeagues || 0}</p>
                <p className="text-xs text-muted-foreground">{analyticsData.leagueMetrics?.leagueParticipation || 0}% participation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-lg font-semibold">GHS {(analyticsData.financialMetrics?.monthlyRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-green-600">+{analyticsData.financialMetrics?.revenueGrowth || 0}% growth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Uptime</p>
                <p className="text-lg font-semibold">{analyticsData.performanceMetrics?.systemUptime || 0}%</p>
                <p className="text-xs text-muted-foreground">{analyticsData.performanceMetrics?.averageResponseTime || 0}ms avg response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full justify-between">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          <TabsTrigger value="leagues" className="flex-1">Leagues</TabsTrigger>
          <TabsTrigger value="financial" className="flex-1">Financial</TabsTrigger>
          <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Active Users</span>
                    <span className="font-semibold">{analyticsData.userMetrics?.userEngagement?.daily || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Weekly Active Users</span>
                    <span className="font-semibold">{analyticsData.userMetrics?.userEngagement?.weekly || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monthly Active Users</span>
                    <span className="font-semibold">{analyticsData.userMetrics?.userEngagement?.monthly || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Retention Rate</span>
                    <span className="font-semibold text-green-600">{analyticsData.userMetrics?.retentionRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">League Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Leagues</span>
                    <span className="font-semibold">{analyticsData.leagueMetrics?.totalLeagues || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Leagues</span>
                    <span className="font-semibold">{analyticsData.leagueMetrics?.activeLeagues || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average League Size</span>
                    <span className="font-semibold">{analyticsData.leagueMetrics?.averageLeagueSize || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Entries</span>
                    <span className="font-semibold">{analyticsData.leagueMetrics?.leaguePerformance?.totalEntries || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.userMetrics?.topCountries || []).map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{country.users}</span>
                        <p className="text-xs text-muted-foreground">{country.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feature Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.engagementMetrics?.featureUsage || []).map((feature, index) => (
                    <div key={feature.feature} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.feature}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{feature.usage}</span>
                        <p className="text-xs text-muted-foreground">{feature.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New Users</p>
                    <p className="text-lg font-semibold">{analyticsData.userMetrics?.newUsers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Session</p>
                    <p className="text-lg font-semibold">{analyticsData.userMetrics?.averageSessionDuration || 0}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Star className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Retention</p>
                    <p className="text-lg font-semibold">{analyticsData.userMetrics?.retentionRate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leagues" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">League Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.leagueMetrics?.popularFormats || []).map((format, index) => (
                    <div key={format.format} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{format.format}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{format.count}</span>
                        <p className="text-xs text-muted-foreground">{format.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">League Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Entries</span>
                    <span className="font-semibold">{analyticsData.leagueMetrics?.leaguePerformance?.totalEntries || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-semibold">GHS {(analyticsData.leagueMetrics?.leaguePerformance?.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Entry Fee</span>
                    <span className="font-semibold">GHS {analyticsData.leagueMetrics?.leaguePerformance?.averageEntryFee || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.financialMetrics?.revenueBySource || []).map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{source.source}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">GHS {(source.amount || 0).toLocaleString()}</span>
                        <p className="text-xs text-muted-foreground">{source.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.financialMetrics?.paymentMethodDistribution || []).map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{method.method}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{method.count}</span>
                        <p className="text-xs text-muted-foreground">{method.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">System Uptime</p>
                    <p className="text-lg font-semibold">{analyticsData.performanceMetrics?.systemUptime || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    <p className="text-lg font-semibold">{analyticsData.performanceMetrics?.averageResponseTime || 0}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                    <p className="text-lg font-semibold">{analyticsData.performanceMetrics?.errorRate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">API Calls/min</p>
                    <p className="text-lg font-semibold">{analyticsData.performanceMetrics?.apiCallsPerMinute || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {analyticsData.lastUpdated ? new Date(analyticsData.lastUpdated).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
};

export default Analytics;
