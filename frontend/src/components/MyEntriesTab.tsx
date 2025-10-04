import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Eye, Trophy, Users, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';

interface LeagueEntry {
  id: string;
  leagueId: string;
  linkedTeamId: string;
  userId: string;
  entryTime: string;
  totalPoints: number;
  gameweekPoints: number;
  rank?: number;
  previousRank?: number;
  h2hWins: number;
  h2hLosses: number;
  h2hDraws: number;
  isActive: boolean;
  canLeave: boolean;
  league: {
    id: string;
    name: string;
    type: 'PAID' | 'FREE';
    entryFee: number;
    maxTeams: number;
    totalPrizePool: number;
    platformFee: number;
    platformFeeType: 'PERCENTAGE' | 'FIXED';
    platformFeeValue: number;
    status: string;
    startGameweek: number;
    endGameweek?: number;
  };
  linkedTeam: {
    id: string;
    teamName: string;
    fplTeamId: number;
  };
}

interface GroupedLeagueEntry {
  league: LeagueEntry['league'];
  entries: LeagueEntry[];
  bestEntry: LeagueEntry;
  totalTeams: number;
  userTeams: number;
  estimatedPayout: number;
}

interface MyEntriesTabProps {
  leagues: LeagueEntry[];
  loading: boolean;
  onRefresh: () => void;
}

const MyEntriesTab: React.FC<MyEntriesTabProps> = ({ leagues, loading, onRefresh }) => {
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());
  const [groupedLeagues, setGroupedLeagues] = useState<GroupedLeagueEntry[]>([]);

  // Group leagues by league ID and calculate statistics
  useEffect(() => {
    const grouped = new Map<string, GroupedLeagueEntry>();

    leagues.forEach(entry => {
      const leagueId = entry.leagueId;
      
      if (!grouped.has(leagueId)) {
        grouped.set(leagueId, {
          league: entry.league,
          entries: [],
          bestEntry: entry,
          totalTeams: 0,
          userTeams: 0,
          estimatedPayout: 0
        });
      }

      const group = grouped.get(leagueId)!;
      group.entries.push(entry);
      group.userTeams++;

      // Update best entry (highest gameweek points)
      if (entry.gameweekPoints > group.bestEntry.gameweekPoints) {
        group.bestEntry = entry;
      }
    });

    // Calculate estimated payouts and sort entries by points
    const groupedArray = Array.from(grouped.values()).map(group => {
      // Sort entries by actual rank (ascending) to show proper leaderboard order
      group.entries.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      
      // Calculate estimated payout for best entry
      if (group.league.type === 'PAID' && group.league.totalPrizePool > 0) {
        // Simple payout calculation - can be enhanced based on actual prize distribution
        const totalEntries = group.entries.length;
        if (totalEntries > 0) {
          // Assume top 3 get payouts: 50%, 30%, 20%
          const bestRank = group.bestEntry.rank || 1;
          if (bestRank === 1) {
            group.estimatedPayout = group.league.totalPrizePool * 0.5;
          } else if (bestRank === 2) {
            group.estimatedPayout = group.league.totalPrizePool * 0.3;
          } else if (bestRank === 3) {
            group.estimatedPayout = group.league.totalPrizePool * 0.2;
          }
        }
      }

      return group;
    });

    // Sort groups by best entry gameweek points (descending)
    groupedArray.sort((a, b) => b.bestEntry.gameweekPoints - a.bestEntry.gameweekPoints);

    setGroupedLeagues(groupedArray);
  }, [leagues]);

  const toggleExpanded = (leagueId: string) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueId)) {
      newExpanded.delete(leagueId);
    } else {
      newExpanded.add(leagueId);
    }
    setExpandedLeagues(newExpanded);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getPayoutColor = (payout: number) => {
    if (payout > 0) return 'text-green-500';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-sm text-muted-foreground">Loading entries...</span>
      </div>
    );
  }

  if (groupedLeagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-400 text-sm">No active entries yet</p>
        <p className="text-gray-500 text-xs mt-1">Join a league to see your entries here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedLeagues.map((group) => {
        const isExpanded = expandedLeagues.has(group.league.id);
        const bestRank = group.bestEntry.rank || 1;

        return (
          <div key={group.league.id} className="clean-card-sm">
            {/* League Header - Always Visible */}
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-800/30 rounded transition-colors"
              onClick={() => toggleExpanded(group.league.id)}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="p-1">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 whitespace-nowrap">
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <h3 className="font-medium text-sm truncate">{group.league.name.replace(/Gameweek \d+ /, '')}</h3>
                      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30 flex-shrink-0">GW{group.league.startGameweek}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                        group.league.type === 'PAID' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {group.league.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground flex-shrink-0">
                      <Users className="w-3 h-3" />
                      <span>{group.userTeams} team{group.userTeams !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs whitespace-nowrap">
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-xs font-medium truncate">{group.bestEntry.linkedTeam.teamName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        #{bestRank}
                      </span>
                      
                      <div className="w-px h-3 bg-muted-foreground/30"></div>
                      
                      <span className="font-medium text-primary">{group.bestEntry.gameweekPoints} pts</span>
                      
                      {group.estimatedPayout > 0 && (
                        <>
                          <div className="w-px h-3 bg-muted-foreground/30"></div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3 text-green-500" />
                            <span className={`font-medium ${getPayoutColor(group.estimatedPayout)}`}>
                              GHC {group.estimatedPayout.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Expanded Teams List */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div>
                  {group.entries.map((entry, index) => {
                    const rank = entry.rank || (index + 1); // Use actual rank from database, fallback to index
                    const payout = group.league.type === 'PAID' && group.league.totalPrizePool > 0
                      ? (rank === 1 ? group.league.totalPrizePool * 0.5 : 
                         rank === 2 ? group.league.totalPrizePool * 0.3 : 
                         rank === 3 ? group.league.totalPrizePool * 0.2 : 0)
                      : 0;
                    
                    const isBestTeam = entry.id === group.bestEntry.id;

                    return (
                      <div key={entry.id} className={`flex items-center justify-between py-1 px-3 ${isBestTeam ? 'bg-primary/10 border-l-2 border-l-primary' : 'bg-gray-800/50'}`}>
                        <a 
                          href={`https://fantasy.premierleague.com/entry/${entry.linkedTeam.fplTeamId}/event/${entry.league.startGameweek}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-white cursor-pointer"
                        >
                          {entry.linkedTeam.teamName}
                        </a>
                        
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="font-medium w-4 text-center">{rank}</span>
                          <span className="text-primary font-medium w-12 text-right">{entry.gameweekPoints} pts</span>
                          <span className={`font-medium w-16 text-right ${getPayoutColor(payout)}`}>
                            {payout > 0 ? `GHC ${payout.toFixed(2)}` : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MyEntriesTab;
