import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ExternalLink, Trophy, Eye, Play, Unlink2, ChevronDown, ChevronUp, Wallet as WalletIcon, Target, Link, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { NoLeaguesState, NoTeamLinkedState, ComingSoonState } from '../ui/empty-states';
import CreatePrivateLeagueModal from '../modals/create-private-league-modal';
import JoinLeagueModal from '../modals/join-league-modal';
import LinkFplTeamModal from '../modals/link-fpl-team-modal';
import JoinTeamToLeagueModal from '../modals/join-team-to-league-modal';
import ConfirmUnlinkModal from '../modals/confirm-unlink-modal';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient, Wallet, LeagueEntry, LinkedTeam } from '../../services/api';
import { toast } from 'sonner';
import MyEntriesTab from '../MyEntriesTab';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showJoinLeague, setShowJoinLeague] = useState(false);
  const [showLinkTeam, setShowLinkTeam] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [selectedTeamForJoin, setSelectedTeamForJoin] = useState<LinkedTeam | null>(null);
  const [teamToUnlink, setTeamToUnlink] = useState<LinkedTeam | null>(null);
  const [activeTab, setActiveTab] = useState('entries');
  const [expandedSummaries, setExpandedSummaries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Games state
  const [currentGameweek, setCurrentGameweek] = useState(6);

  // Real data from API
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [leagueEntries, setLeagueEntries] = useState<LeagueEntry[]>([]);
  const [linkedTeams, setLinkedTeams] = useState<LinkedTeam[]>([]);

  // Unified function to fetch dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
        // Clear cache for fresh data
        apiClient.clearUserCache();
      } else {
        setIsLoading(true);
      }
      
      const [walletData, entriesData, teamsData] = await Promise.all([
        apiClient.getWallet(),
        apiClient.getUserLeagues(),
        apiClient.getLinkedTeams()
      ]);

      setWallet(walletData);
      setLeagueEntries(entriesData);
      setLinkedTeams(teamsData);
      
      if (isRefresh) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch dashboard data on mount
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Auto-refresh live data every 2 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Only auto-refresh if not manually refreshing
      if (!isRefreshing) {
        fetchDashboardData(true);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [user, isRefreshing]);

  // Filter data based on gameweek lifecycle states
  const activeEntries = leagueEntries.filter(entry => {
    // Include leagues with proper lifecycle states
    if (entry.league.leagueState === 'OPEN_FOR_ENTRY' || 
        entry.league.leagueState === 'IN_PROGRESS' || 
        entry.league.leagueState === 'WAITING_FOR_UPDATES') {
      return true;
    }
    
    // Fallback: include leagues that don't have leagueState set yet (legacy data)
    // or have status 'OPEN' or 'IN_PROGRESS'
    if (!entry.league.leagueState || 
        entry.league.status === 'OPEN' || 
        entry.league.status === 'IN_PROGRESS') {
      return true;
    }
    
    return false;
  });
  
  // Debug logging for league states
  console.log('Dashboard Debug - All league entries:', leagueEntries.map(entry => ({
    leagueId: entry.leagueId,
    leagueName: entry.league.name,
    gameweek: entry.league.startGameweek,
    leagueState: entry.league.leagueState,
    status: entry.league.status
  })));
  console.log('Dashboard Debug - Active entries:', activeEntries.map(entry => ({
    leagueId: entry.leagueId,
    leagueName: entry.league.name,
    gameweek: entry.league.startGameweek,
    leagueState: entry.league.leagueState
  })));
  const completedEntries = leagueEntries.filter(entry => 
    entry.league.leagueState === 'FINALIZED' || 
    entry.league.status === 'COMPLETED' // Fallback for old data
  );
  
  // Calculate stats
  const walletBalance = wallet?.balance || 0;
  // Count unique leagues, not individual entries
  const uniqueActiveLeagues = new Set(activeEntries.map(entry => entry.leagueId));
  const activeLeaguesCount = uniqueActiveLeagues.size;
  const linkedTeamsCount = linkedTeams.length;

  const formatCurrency = (amount: number) => `GH₵${(amount / 100).toFixed(2)}`;

  const toggleSummary = (id: string) => {
    setExpandedSummaries(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handlePlayTeam = (team: LinkedTeam) => {
    setSelectedTeamForJoin(team);
    setShowJoinTeamModal(true);
  };

  const handleUnlinkTeam = async (team: LinkedTeam) => {
    try {
      await apiClient.unlinkFplTeam(team.id);
      setLinkedTeams(prev => prev.filter(t => t.id !== team.id));
      toast.success('Team unlinked successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink team');
    }
  };

  const handleViewTeam = (fplTeamId: number) => {
    // Redirect to official FPL page
    window.open(`https://fantasy.premierleague.com/entry/${fplTeamId}/history`, '_blank');
  };

  const handlePlayGame = (gameType: 'champions' | 'free2play') => {
    navigate(`/games/${gameType}`, { 
      state: { 
        gameType, 
        currentGameweek 
      } 
    });
  };




  return (
    <div className="container-clean py-3 px-3 max-w-7xl">
      {/* Header with Welcome */}
      <div className="mb-3">
        <h1 className="text-lg sm:text-2xl font-bold mb-1 font-serif whitespace-nowrap">
          Welcome back, <span className="text-blue-500"> {user.username}</span> 😎
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your fantasy football leagues and track performance.</p>
      </div>

      {/* Quick Actions and Refresh Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-row space-x-1 sm:space-x-2">
          <Button 
            onClick={() => setShowCreateLeague(true)}
            className="h-8 px-2 sm:px-3 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Plus className="w-3 h-3 sm:mr-1" />
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create Private League</span>
          </Button>
          <Button 
            onClick={() => setShowJoinLeague(true)}
            className="h-8 px-2 sm:px-3 text-sm border border-border bg-transparent hover:bg-accent hover:text-accent-foreground"
            size="sm"
          >
            <Users className="w-3 h-3 sm:mr-1" />
            <span className="sm:hidden">Join</span>
            <span className="hidden sm:inline">Join League</span>
          </Button>
          <Button 
            onClick={() => setShowLinkTeam(true)}
            className="h-8 px-2 sm:px-3 text-sm bg-success text-success-foreground hover:bg-success/90"
            size="sm"
          >
            <Link className="w-3 h-3 sm:mr-1" />
            <span className="sm:hidden">Link</span>
            <span className="hidden sm:inline">Link FPL Team</span>
          </Button>
        </div>
        
        {/* Refresh Button - Extreme Right */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="h-8 px-2 sm:px-3 flex items-center gap-1 sm:gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="clean-card-sm">
          <div className="flex flex-col items-center text-center space-y-1">
            <WalletIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Wallet</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(walletBalance)}</span>
          </div>
        </div>
        
        <div className="clean-card-sm">
          <div className="flex flex-col items-center text-center space-y-1">
            <Target className="w-4 h-4 text-success" />
            <span className="text-xs font-medium">Active</span>
            <span className="text-sm font-bold text-success">{activeLeaguesCount}</span>
          </div>
        </div>
        
        <div className="clean-card-sm">
          <div className="flex flex-col items-center text-center space-y-1">
            <Link className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium">Teams</span>
            <span className="text-sm font-bold text-warning">{linkedTeamsCount}</span>
          </div>
        </div>
      </div>

      {/* Toggle Bar */}
      <div className="bg-card border border-border rounded-full p-0.5 mb-3">
        <div className="flex bg-accent/50 rounded-full">
          {[
            { key: 'entries', label: 'My Entries' },
            { key: 'games', label: 'Games' },
            { key: 'finished', label: 'Ended' },
            { key: 'teams', label: 'My Teams' }
          ].map((tab, index, array) => (
            <React.Fragment key={tab.key}>
              <button
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 px-2 rounded-full text-sm font-medium text-center transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                }`}
              >
                {tab.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* My Entries */}
        {activeTab === 'entries' && (
          <>
            {isRefreshing && (
              <div className="clean-card-sm text-center py-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing live data...
                </div>
              </div>
            )}
            <MyEntriesTab 
              leagues={activeEntries} 
              loading={isLoading} 
              onRefresh={() => fetchDashboardData(true)}
            />
          </>
        )}

        {/* Games */}
        {activeTab === 'games' && (
          <>
            {isLoading ? (
              <div className="clean-card text-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading games...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Gameweek Champions */}
                <div className="clean-card-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">Gameweek Champions</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">PAID</Badge>
                        <span className="text-sm font-bold text-primary">GHC 10.00</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handlePlayGame('champions')}
                      size="sm"
                      className="h-8 px-3 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Play (GHC)
                    </Button>
                  </div>
                </div>

                {/* Free2Play */}
                <div className="clean-card-sm">
                  <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-sm">Free2Play</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">FREE</Badge>
                          <span className="text-sm font-bold text-success">FREE</span>
                        </div>
                    </div>
                    <Button 
                      onClick={() => handlePlayGame('free2play')}
                      size="sm"
                      className="h-8 px-3 text-sm bg-success text-success-foreground hover:bg-success/90"
                    >
                      Play (GHC)
                  </Button>
                </div>
              </div>
              </div>
            )}
          </>
        )}

        {/* Finished Games - Ended Leagues */}
        {activeTab === 'finished' && (
          <MyEntriesTab 
            leagues={completedEntries} 
            loading={isLoading} 
            onRefresh={() => fetchDashboardData(true)}
          />
        )}

        {/* My FPL Teams */}
        {activeTab === 'teams' && (
          <>
            {isLoading ? (
              <div className="clean-card text-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading teams...</p>
              </div>
            ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {linkedTeams.map((team) => (
                <div key={team.id} className="clean-card-sm">
                  <div className="space-y-3">
                    {/* Team Info */}
                    <div>
                          <h4 className="font-medium text-sm mb-1">{team.teamName}</h4>
                          <p className="text-xs text-muted-foreground">FPL ID: #{team.fplTeamId}</p>
                          <p className="text-xs text-muted-foreground">Total Points: {team.totalPoints}</p>
                    </div>
                    
                    {/* Action Buttons - Mobile Stack */}
                    <div className="flex flex-row space-x-2">
                      <Button 
                        size="sm" 
                        className="flex-1 h-6 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => handleViewTeam(team.fplTeamId)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-6 text-xs bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => handlePlayTeam(team)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Play
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 h-6 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              setTeamToUnlink(team);
                              setShowUnlinkModal(true);
                            }}
                      >
                        <Unlink2 className="w-3 h-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                {linkedTeams.length === 0 && (
              <NoTeamLinkedState 
                onAction={() => setShowLinkTeam(true)}
                actionLabel="Link Your First Team"
                className="py-6"
              />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreatePrivateLeagueModal 
        open={showCreateLeague}
        onOpenChange={setShowCreateLeague}
      />
      <JoinLeagueModal 
        open={showJoinLeague}
        onOpenChange={setShowJoinLeague}
      />
      <LinkFplTeamModal 
        open={showLinkTeam}
        onOpenChange={setShowLinkTeam}
        currentLinkedTeamsCount={linkedTeams.length}
        onTeamLinked={() => fetchDashboardData(true)}
      />
      <JoinTeamToLeagueModal
        open={showJoinTeamModal}
        onOpenChange={setShowJoinTeamModal}
        selectedTeam={selectedTeamForJoin}
      />
      <ConfirmUnlinkModal
        open={showUnlinkModal}
        onOpenChange={setShowUnlinkModal}
        teamName={teamToUnlink?.teamName}
        onConfirm={async () => {
          if (teamToUnlink) {
            await handleUnlinkTeam(teamToUnlink);
          setTeamToUnlink(null);
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
