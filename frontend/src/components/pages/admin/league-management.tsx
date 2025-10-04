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
  Trophy, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  DollarSign,
  Calendar,
  Settings,
  Play,
  Pause,
  Stop,
  Copy,
  Share,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface League {
  id: string;
  name: string;
  description?: string;
  leagueFormat: 'CLASSIC' | 'HEAD_TO_HEAD';
  entryType: 'FREE' | 'PAID';
  entryFee?: number;
  maxTeams: number;
  currentTeams: number;
  season: number;
  startGameweek: number;
  endGameweek?: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isPrivate: boolean;
  leagueCode?: string;
  prizeDistribution: {
    type: 'TOP_3' | 'TOP_5' | 'TOP_10' | 'PERCENTAGE' | 'FIXED_POSITIONS';
    distribution?: Record<string, number>;
  };
  platformFeeType: 'PERCENTAGE';
  platformFeeValue: number;
  createdAt: string;
  createdBy: string;
}

const LeagueManagement: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFeaturedLeagueModal, setShowFeaturedLeagueModal] = useState(false);
  const [selectedFeaturedLeague, setSelectedFeaturedLeague] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    filterLeagues();
  }, [leagues, searchQuery, statusFilter, typeFilter]);

  const loadLeagues = async () => {
    try {
      setIsLoading(true);
      const leaguesData = await apiClient.getCurrentLeagues?.() || { leagues: [] };
      setLeagues(leaguesData.leagues || []);
    } catch (error) {
      console.error('Failed to load leagues:', error);
      toast.error('Failed to load leagues');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeagues = () => {
    let filtered = leagues;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(league =>
        league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        league.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(league => league.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(league => league.entryType === typeFilter);
    }

    setFilteredLeagues(filtered);
  };

  const handleLeagueAction = async (leagueId: string, action: string, data?: any) => {
    try {
      setActionLoading(leagueId);
      
      switch (action) {
        case 'activate':
          await apiClient.activateLeague?.(leagueId);
          toast.success('League activated successfully');
          break;
        case 'pause':
          await apiClient.pauseLeague?.(leagueId);
          toast.success('League paused successfully');
          break;
        case 'cancel':
          await apiClient.cancelLeague?.(leagueId);
          toast.success('League cancelled successfully');
          break;
        case 'delete':
          await apiClient.deleteLeague?.(leagueId);
          toast.success('League deleted successfully');
          break;
        case 'duplicate':
          await apiClient.duplicateLeague?.(leagueId);
          toast.success('League duplicated successfully');
          break;
        case 'update':
          await apiClient.updateLeague?.(leagueId, data);
          toast.success('League updated successfully');
          break;
      }
      
      await loadLeagues();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.DRAFT}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (entryType: string) => {
    return (
      <Badge className={entryType === 'PAID' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
        {entryType}
      </Badge>
    );
  };

  // Helper functions for featured leagues data
  const getGameweekChampionsData = () => {
    const gameweekChampionsLeagues = leagues.filter(l => l.name.includes('Gameweek Champions'));
    const totalParticipants = gameweekChampionsLeagues.reduce((sum, l) => sum + l.currentTeams, 0);
    const totalRevenue = gameweekChampionsLeagues.reduce((sum, l) => sum + (l.entryFee || 0) * l.currentTeams, 0);
    const averageEntryFee = gameweekChampionsLeagues.length > 0 
      ? gameweekChampionsLeagues.reduce((sum, l) => sum + (l.entryFee || 0), 0) / gameweekChampionsLeagues.length 
      : 10;
    
    return {
      count: gameweekChampionsLeagues.length,
      participants: totalParticipants,
      revenue: totalRevenue,
      averageEntryFee: averageEntryFee,
      leagues: gameweekChampionsLeagues
    };
  };

  const getFree2PlayData = () => {
    const free2PlayLeagues = leagues.filter(l => l.name.includes('Free2Play'));
    const totalParticipants = free2PlayLeagues.reduce((sum, l) => sum + l.currentTeams, 0);
    
    return {
      count: free2PlayLeagues.length,
      participants: totalParticipants,
      leagues: free2PlayLeagues
    };
  };

  const handleFeaturedLeagueAction = (leagueType: string, action: string) => {
    setSelectedFeaturedLeague(leagueType);
    if (action === 'view') {
      // Show details modal with filtered leagues
      setShowFeaturedLeagueModal(true);
    } else if (action === 'manage') {
      // Filter the main table to show only this league type
      const filterValue = leagueType === 'Gameweek Champions' ? 'PAID' : 'FREE';
      setTypeFilter(filterValue);
      // Scroll to the leagues table
      setTimeout(() => {
        const tableElement = document.querySelector('[data-leagues-table]');
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leagues...</p>
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
            <Trophy className="w-6 h-6 text-yellow-500" />
            League Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Create, manage, and monitor fantasy football leagues
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
          <Plus className="w-4 h-4 mr-2" />
          Create League
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leagues</p>
                <p className="text-lg font-semibold">{leagues.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Play className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Leagues</p>
                <p className="text-lg font-semibold">{leagues.filter(l => l.status === 'ACTIVE').length}</p>
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
                <p className="text-sm text-muted-foreground">Paid Leagues</p>
                <p className="text-lg font-semibold">{leagues.filter(l => l.entryType === 'PAID').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-lg font-semibold">{leagues.reduce((sum, l) => sum + l.currentTeams, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Leagues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(() => {
          const gameweekData = getGameweekChampionsData();
          return (
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:border-yellow-800 dark:from-yellow-950 dark:to-orange-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Gameweek Champions</h3>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">Premium paid leagues</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    PAID
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">Leagues:</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">{gameweekData.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">Avg Entry Fee:</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">GHS {gameweekData.averageEntryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">Total Revenue:</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">GHS {gameweekData.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">Participants:</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">{gameweekData.participants} teams</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900"
                      onClick={() => handleFeaturedLeagueAction('Gameweek Champions', 'view')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                      onClick={() => handleFeaturedLeagueAction('Gameweek Champions', 'manage')}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {(() => {
          const free2PlayData = getFree2PlayData();
          return (
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200">Free2Play</h3>
                      <p className="text-sm text-green-600 dark:text-green-400">Free entry leagues</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    FREE
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Leagues:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">{free2PlayData.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Entry Fee:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Prize Pool:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">GHS 0.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Participants:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">{free2PlayData.participants} teams</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
                      onClick={() => handleFeaturedLeagueAction('Free2Play', 'view')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleFeaturedLeagueAction('Free2Play', 'manage')}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leagues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leagues Table */}
      <Card data-leagues-table>
        <CardHeader>
          <CardTitle>Leagues ({filteredLeagues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>League</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Entry Fee</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeagues.map((league) => (
                  <TableRow key={league.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{league.name}</p>
                        <p className="text-sm text-muted-foreground">{league.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {league.leagueFormat}
                          </Badge>
                          {league.isPrivate && (
                            <Badge variant="outline" className="text-xs">
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(league.entryType)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(league.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {league.currentTeams}/{league.maxTeams}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {league.entryType === 'PAID' ? (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">GHS {league.entryFee}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Free</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{league.season}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(league.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeague(league);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeague(league);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {league.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLeagueAction(league.id, 'activate')}
                            disabled={actionLoading === league.id}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        {league.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLeagueAction(league.id, 'pause')}
                            disabled={actionLoading === league.id}
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLeagueAction(league.id, 'duplicate')}
                          disabled={actionLoading === league.id}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLeagueAction(league.id, 'delete')}
                          disabled={actionLoading === league.id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create League Modal */}
      {showCreateModal && (
        <CreateLeagueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadLeagues();
          }}
        />
      )}

      {/* Edit League Modal */}
      {showEditModal && selectedLeague && (
        <EditLeagueModal
          league={selectedLeague}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLeague(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedLeague(null);
            loadLeagues();
          }}
        />
      )}

      {/* League Detail Modal */}
      {showDetailModal && selectedLeague && (
        <LeagueDetailModal
          league={selectedLeague}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLeague(null);
          }}
        />
      )}

      {/* Featured League Details Modal */}
      <FeaturedLeagueModal
        isOpen={showFeaturedLeagueModal}
        onClose={() => {
          setShowFeaturedLeagueModal(false);
          setSelectedFeaturedLeague(null);
        }}
        leagueType={selectedFeaturedLeague}
        leagues={leagues}
      />
    </div>
  );
};

// Create League Modal Component
const CreateLeagueModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leagueFormat: 'CLASSIC' as 'CLASSIC' | 'HEAD_TO_HEAD',
    entryType: 'FREE' as 'FREE' | 'PAID',
    entryFee: 0,
    maxTeams: 20,
    season: new Date().getFullYear(),
    startGameweek: 1,
    endGameweek: 38,
    isPrivate: false,
    prizeDistribution: {
      type: 'TOP_3' as 'TOP_3' | 'TOP_5' | 'TOP_10' | 'PERCENTAGE' | 'FIXED_POSITIONS',
      distribution: {}
    },
    platformFeeValue: 5
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.createLeague?.(formData);
      toast.success('League created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create league');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create New League</h2>
          <Button variant="outline" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="season">Season</Label>
              <Input
                id="season"
                type="number"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">League Format</Label>
              <Select value={formData.leagueFormat} onValueChange={(value: 'CLASSIC' | 'HEAD_TO_HEAD') => setFormData({ ...formData, leagueFormat: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASSIC">Classic</SelectItem>
                  <SelectItem value="HEAD_TO_HEAD">Head to Head</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entryType">Entry Type</Label>
              <Select value={formData.entryType} onValueChange={(value: 'FREE' | 'PAID') => setFormData({ ...formData, entryType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {formData.entryType === 'PAID' && (
            <div>
              <Label htmlFor="entryFee">Entry Fee (GHS)</Label>
              <Input
                id="entryFee"
                type="number"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxTeams">Max Teams</Label>
              <Input
                id="maxTeams"
                type="number"
                value={formData.maxTeams}
                onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                min="2"
                required
              />
            </div>
            <div>
              <Label htmlFor="startGameweek">Start Gameweek</Label>
              <Input
                id="startGameweek"
                type="number"
                value={formData.startGameweek}
                onChange={(e) => setFormData({ ...formData, startGameweek: parseInt(e.target.value) })}
                min="1"
                max="38"
                required
              />
            </div>
            <div>
              <Label htmlFor="endGameweek">End Gameweek</Label>
              <Input
                id="endGameweek"
                type="number"
                value={formData.endGameweek}
                onChange={(e) => setFormData({ ...formData, endGameweek: parseInt(e.target.value) })}
                min="1"
                max="38"
                required
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create League'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit League Modal Component
const EditLeagueModal: React.FC<{
  league: League;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ league, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: league.name,
    description: league.description || '',
    maxTeams: league.maxTeams,
    entryFee: league.entryFee || 0,
    status: league.status
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.updateLeague?.(league.id, formData);
      toast.success('League updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update league');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Edit League</h2>
          <Button variant="outline" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">League Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="maxTeams">Max Teams</Label>
            <Input
              id="maxTeams"
              type="number"
              value={formData.maxTeams}
              onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
              min="2"
              required
            />
          </div>
          {league.entryType === 'PAID' && (
            <div>
              <Label htmlFor="entryFee">Entry Fee (GHS)</Label>
              <Input
                id="entryFee"
                type="number"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
          )}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update League'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// League Detail Modal Component
const LeagueDetailModal: React.FC<{
  league: League;
  onClose: () => void;
}> = ({ league, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">League Details</h2>
          <Button variant="outline" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <p className="font-medium">{league.name}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="font-medium">{league.status}</p>
            </div>
            <div>
              <Label>Format</Label>
              <p className="font-medium">{league.leagueFormat}</p>
            </div>
            <div>
              <Label>Entry Type</Label>
              <p className="font-medium">{league.entryType}</p>
            </div>
            <div>
              <Label>Teams</Label>
              <p className="font-medium">{league.currentTeams}/{league.maxTeams}</p>
            </div>
            <div>
              <Label>Season</Label>
              <p className="font-medium">{league.season}</p>
            </div>
          </div>
          
          {league.description && (
            <div>
              <Label>Description</Label>
              <p className="font-medium">{league.description}</p>
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

// Featured League Details Modal
const FeaturedLeagueModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  leagueType: string | null;
  leagues: League[];
}> = ({ isOpen, onClose, leagueType, leagues }) => {
  if (!isOpen || !leagueType) return null;

  const filteredLeagues = leagues.filter(l => 
    leagueType === 'Gameweek Champions' 
      ? l.name.includes('Gameweek Champions')
      : l.name.includes('Free2Play')
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {leagueType === 'Gameweek Champions' ? (
              <>
                <Trophy className="w-5 h-5 text-yellow-600" />
                Gameweek Champions Leagues
              </>
            ) : (
              <>
                <Users className="w-5 h-5 text-green-600" />
                Free2Play Leagues
              </>
            )}
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {filteredLeagues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No {leagueType} leagues found.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredLeagues.map((league) => (
                <Card key={league.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{league.name}</h3>
                      <p className="text-sm text-muted-foreground">{league.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>Gameweek {league.startGameweek}</span>
                        <span>{league.currentTeams}/{league.maxTeams} teams</span>
                        {league.entryType === 'PAID' && (
                          <span>GHS {league.entryFee}</span>
                        )}
                        <Badge className={league.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {league.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeagueManagement;
