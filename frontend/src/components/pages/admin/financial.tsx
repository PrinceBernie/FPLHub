import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet, 
  PieChart,
  BarChart3,
  Download,
  Filter,
  Search,
  Calendar,
  User,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'LEAGUE_ENTRY' | 'LEAGUE_WINNING' | 'REFUND' | 'PLATFORM_FEE';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  reference?: string;
  leagueId?: string;
  leagueName?: string;
  createdAt: string;
  completedAt?: string;
  paymentMethod?: string;
  fees?: number;
}

interface FinancialStats {
  totalRevenue: number;
  totalTransactions: number;
  pendingTransactions: number;
  platformFees: number;
  leagueEntries: number;
  withdrawals: number;
  deposits: number;
  refunds: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  averageTransactionValue: number;
  topEarningLeagues: Array<{
    leagueId: string;
    leagueName: string;
    revenue: number;
    entries: number;
  }>;
  topSpendingUsers: Array<{
    userId: string;
    username: string;
    totalSpent: number;
    transactions: number;
  }>;
}

const Financial: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    platformFees: 0,
    leagueEntries: 0,
    withdrawals: 0,
    deposits: 0,
    refunds: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    averageTransactionValue: 0,
    topEarningLeagues: [],
    topSpendingUsers: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, typeFilter, statusFilter, dateFilter]);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      const [transactionsData, statsData] = await Promise.all([
        apiClient.getAllTransactions?.() || [],
        apiClient.getFinancialStats?.() || {}
      ]);
      setTransactions(transactionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(transaction =>
        transaction.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(transaction => 
        new Date(transaction.createdAt) >= filterDate
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleTransactionAction = async (transactionId: string, action: string) => {
    try {
      setActionLoading(transactionId);
      
      switch (action) {
        case 'approve':
          await apiClient.approveTransaction?.(transactionId);
          toast.success('Transaction approved successfully');
          break;
        case 'reject':
          await apiClient.rejectTransaction?.(transactionId);
          toast.success('Transaction rejected successfully');
          break;
        case 'refund':
          await apiClient.refundTransaction?.(transactionId);
          toast.success('Transaction refunded successfully');
          break;
      }
      
      await loadFinancialData();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'User', 'Type', 'Amount', 'Status', 'Description', 'Reference'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        t.username,
        t.type,
        t.amount,
        t.status,
        t.description,
        t.reference || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.PENDING}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'DEPOSIT': 'bg-green-100 text-green-800',
      'WITHDRAWAL': 'bg-red-100 text-red-800',
      'LEAGUE_ENTRY': 'bg-blue-100 text-blue-800',
      'LEAGUE_WINNING': 'bg-yellow-100 text-yellow-800',
      'REFUND': 'bg-purple-100 text-purple-800',
      'PLATFORM_FEE': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.DEPOSIT}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading financial data...</p>
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
            <DollarSign className="w-6 h-6 text-green-500" />
            Financial Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor revenue, transactions, and financial performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadFinancialData}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-semibold">GHS {(stats.totalRevenue || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-lg font-semibold">{(stats.totalTransactions || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold">{stats.pendingTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-lg font-semibold">GHS {(stats.platformFees || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">GHS {(stats.dailyRevenue || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">GHS {(stats.weeklyRevenue || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold">GHS {(stats.monthlyRevenue || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Earning Leagues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.topEarningLeagues || []).slice(0, 5).map((league, index) => (
                <div key={league.leagueId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Trophy className="w-3 h-3 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{league.leagueName}</p>
                      <p className="text-xs text-muted-foreground">{league.entries} entries</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">GHS {(league.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Spending Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.topSpendingUsers || []).slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.transactions} transactions</p>
                    </div>
                  </div>
                  <span className="font-semibold text-red-600">GHS {(user.totalSpent || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="LEAGUE_ENTRY">League Entry</SelectItem>
                <SelectItem value="LEAGUE_WINNING">League Winning</SelectItem>
                <SelectItem value="REFUND">Refund</SelectItem>
                <SelectItem value="PLATFORM_FEE">Platform Fee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{transaction.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(transaction.type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-sm font-medium ${
                          transaction.type === 'DEPOSIT' || transaction.type === 'LEAGUE_WINNING' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'DEPOSIT' || transaction.type === 'LEAGUE_WINNING' ? '+' : '-'}
                          GHS {Math.abs(transaction.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{transaction.description}</span>
                      {transaction.leagueName && (
                        <p className="text-xs text-muted-foreground">League: {transaction.leagueName}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {transaction.reference || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionModal(true);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {transaction.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransactionAction(transaction.id, 'approve')}
                              disabled={actionLoading === transaction.id}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransactionAction(transaction.id, 'reject')}
                              disabled={actionLoading === transaction.id}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {transaction.status === 'COMPLETED' && transaction.type !== 'WITHDRAWAL' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTransactionAction(transaction.id, 'refund')}
                            disabled={actionLoading === transaction.id}
                          >
                            <TrendingDown className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
          onAction={handleTransactionAction}
        />
      )}
    </div>
  );
};

// Transaction Detail Modal Component
const TransactionDetailModal: React.FC<{
  transaction: Transaction;
  onClose: () => void;
  onAction: (transactionId: string, action: string) => void;
}> = ({ transaction, onClose, onAction }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transaction Details</h2>
          <Button variant="outline" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Transaction ID</Label>
              <p className="font-medium">{transaction.id}</p>
            </div>
            <div>
              <Label>User</Label>
              <p className="font-medium">{transaction.username}</p>
            </div>
            <div>
              <Label>Type</Label>
              <p className="font-medium">{transaction.type.replace('_', ' ')}</p>
            </div>
            <div>
              <Label>Amount</Label>
              <p className="font-medium">GHS {(transaction.amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="font-medium">{transaction.status}</p>
            </div>
            <div>
              <Label>Created</Label>
              <p className="font-medium">{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <Label>Description</Label>
            <p className="font-medium">{transaction.description}</p>
          </div>
          
          {transaction.reference && (
            <div>
              <Label>Reference</Label>
              <p className="font-medium">{transaction.reference}</p>
            </div>
          )}
          
          {transaction.leagueName && (
            <div>
              <Label>League</Label>
              <p className="font-medium">{transaction.leagueName}</p>
            </div>
          )}
          
          {transaction.paymentMethod && (
            <div>
              <Label>Payment Method</Label>
              <p className="font-medium">{transaction.paymentMethod}</p>
            </div>
          )}
          
          {transaction.fees && (
            <div>
              <Label>Fees</Label>
              <p className="font-medium">GHS {(transaction.fees || 0).toLocaleString()}</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            {transaction.status === 'PENDING' && (
              <>
                <Button
                  onClick={() => onAction(transaction.id, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onAction(transaction.id, 'reject')}
                >
                  Reject
                </Button>
              </>
            )}
            {transaction.status === 'COMPLETED' && transaction.type !== 'WITHDRAWAL' && (
              <Button
                variant="outline"
                onClick={() => onAction(transaction.id, 'refund')}
              >
                Refund
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financial;
