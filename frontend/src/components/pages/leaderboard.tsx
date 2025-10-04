import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useIsMobile } from "../ui/use-mobile";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient, League, LeaderboardEntry } from "../../services/api";
import { toast } from "sonner";

interface LeaderboardProps {}

// Extended League type for processed league data
interface ProcessedLeague extends League {
  entries: any[];
}

// Debounce hook for search input
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Auto-refresh countdown hook
const useAutoRefreshCountdown = (isActive: boolean, interval: number = 30000) => {
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      setCountdown(interval / 1000);
      
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return interval / 1000; // Reset to full interval
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCountdown(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, interval]);

  return countdown;
};

// Simple virtualization component for large datasets
interface SimpleVirtualizedListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
}

const SimpleVirtualizedList: React.FC<SimpleVirtualizedListProps> = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length
  );

  const visibleItems = items.slice(
    Math.max(0, visibleStart - overscan),
    visibleEnd
  );

  const offsetY = Math.max(0, visibleStart - overscan) * itemHeight;

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = Math.max(0, visibleStart - overscan) + index;
            return renderItem(item, actualIndex, {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: itemHeight
            });
          })}
        </div>
      </div>
    </div>
  );
};

// Extracted LeaderboardRow component for better performance
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isSelected: boolean;
  isUserTeam: boolean;
  selectedGameweek: string;
  onSelect: (rank: number | null) => void;
  viewMode: 'compact' | 'expanded' | 'desktop';
  style?: React.CSSProperties;
}

const LeaderboardRow = React.memo<LeaderboardRowProps>(({
  entry,
  isSelected,
  isUserTeam,
  selectedGameweek,
  onSelect,
  viewMode,
  style
}) => {
  const handleClick = useCallback(() => {
    onSelect(isSelected ? null : entry.rank);
  }, [isSelected, entry.rank, onSelect]);

  // Helper function to extract last name from full name
  const getLastName = useCallback((fullName: string | null | undefined): string => {
    if (!fullName) return '-';
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1] || fullName;
  }, []);

  const rowClasses = useMemo(() => {
    const baseClasses = "leaderboard-row transition-all cursor-pointer";
    const selectedClasses = isSelected ? "bg-blue-500/10" : "";
    const userTeamClasses = isUserTeam ? "bg-blue-500/10 border-l-2 border-l-blue-500" : "hover:bg-gray-800/30";
    
    if (viewMode === 'compact') {
      return `${baseClasses} flex items-center px-1 sm:px-2 py-1.5 sm:py-2 border-b border-gray-700/50 ${selectedClasses} ${userTeamClasses}`;
    } else {
      return `${baseClasses} grid grid-cols-6 gap-2 px-3 py-2 border-b border-gray-700/50 ${selectedClasses} ${userTeamClasses}`;
    }
  }, [isSelected, isUserTeam, viewMode]);

  const rowContent = useMemo(() => {
    if (viewMode === 'compact') {
      return (
        <>
          {/* Rank - Responsive width */}
          <div className="flex-shrink-0 w-5 sm:w-6 text-left">
            <span className="text-xs sm:text-sm font-medium text-gray-300">{entry.rank}</span>
          </div>
          
          {/* Team - Flexible width with responsive text */}
          <div className="flex-1 min-w-0 px-1 sm:px-2">
            <div className="min-w-0">
              <a 
                href={`https://fantasy.premierleague.com/entry/${entry.fplTeamId}/event/${selectedGameweek || 6}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-medium text-xs sm:text-sm cursor-pointer hover:text-blue-400 transition-colors block truncate"
              >
                {entry.teamName}
              </a>
              <div className="text-xs text-muted-foreground truncate">
                {entry.username}
              </div>
            </div>
          </div>
          
          {/* Points - Responsive width and font */}
          <div className="flex-shrink-0 w-8 sm:w-10 text-right">
            <span className="text-xs sm:text-sm font-bold text-white">
              {entry.totalPoints.toLocaleString()}
            </span>
          </div>
          
          {/* Payout - Responsive width and font */}
          <div className="flex-shrink-0 w-12 sm:w-14 text-right">
            {entry.estimatedPayout > 0 ? (
              <span className="text-xs sm:text-sm font-medium text-green-400">
                <span className="hidden xs:inline">GHS </span>{entry.estimatedPayout}
              </span>
            ) : (
              <span className="text-xs text-gray-500">-</span>
            )}
          </div>
        </>
      );
    }

    // Expanded/Table view
    return (
      <>
        {/* Rank */}
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-gray-300">{entry.rank}</span>
        </div>
        
        {/* Team */}
        <div className="min-w-0">
          <div className="min-w-0 flex-1">
            <a 
              href={`https://fantasy.premierleague.com/entry/${entry.fplTeamId}/event/${selectedGameweek || 6}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium text-sm cursor-pointer hover:text-blue-400 transition-colors block truncate"
            >
              {entry.teamName}
            </a>
            <div className="text-xs text-muted-foreground truncate">
              {entry.username}
            </div>
          </div>
        </div>
        
        {/* RP */}
        <div className="text-sm text-center text-gray-300">
          {entry.remainingPlayers || 0}
        </div>
        
        {/* Captain */}
        <div className="text-sm text-gray-300 truncate">
          {getLastName(entry.captainName)}
        </div>
        
        {/* Points */}
        <div className="text-sm font-bold text-white text-center">
          {entry.totalPoints.toLocaleString()}
        </div>
        
        {/* Payout */}
        <div className="text-sm text-center">
          {entry.estimatedPayout > 0 ? (
            <span className="text-green-400 font-medium">
              GHS {entry.estimatedPayout}
            </span>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      </>
    );
  }, [entry, isUserTeam, selectedGameweek, viewMode]);

  // Both compact and expanded views now use the same grid layout
  return (
    <div className={rowClasses} onClick={handleClick} style={style}>
      {rowContent}
    </div>
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

// Helper functions for league/gameweek filtering
const getAvailableGameweeks = (leagues: ProcessedLeague[], selectedLeague: string, gameweeks: any[]) => {
  const selectedLeagueType = leagues.find(league => league.id === selectedLeague);
  if (!selectedLeagueType) {
    return gameweeks;
  }
  
  return gameweeks.filter(gameweek => 
    selectedLeagueType.entries.some((entry: any) => 
      entry.league.startGameweek === gameweek.id
    )
  );
};

// Helper function to determine which gameweek should be auto-selected
const getAutoSelectedGameweek = (userLeagueEntries: any[], currentGameweek: number) => {
  // Find all gameweeks where user has joined leagues
  const userGameweeks = new Set();
  userLeagueEntries.forEach(entry => {
    if (entry.league?.startGameweek) {
      userGameweeks.add(entry.league.startGameweek);
    }
  });
  
  const userGameweekArray = Array.from(userGameweeks).map(Number).sort((a, b) => b - a); // Sort descending
  
  // Check if user has joined the current gameweek
  const hasJoinedCurrentGameweek = userGameweekArray.includes(currentGameweek);
  
  console.log('🎯 Auto-selection logic:', {
    currentGameweek,
    userJoinedGameweeks: userGameweekArray,
    hasJoinedCurrentGameweek,
    selectedGameweek: hasJoinedCurrentGameweek ? currentGameweek : (userGameweekArray[0] || currentGameweek)
  });
  
  if (hasJoinedCurrentGameweek) {
    // User has joined current gameweek - show current gameweek standings
    return currentGameweek;
  } else {
    // User hasn't joined current gameweek - show the most recent gameweek they joined
    return userGameweekArray[0] || currentGameweek;
  }
};

const processLeagueEntries = (userLeagueEntries: any[]) => {
  const leagueTypeMap = new Map();
  
  userLeagueEntries.forEach((entry: any) => {
    if (entry.league) {
      const baseName = entry.league.name.replace(/Gameweek \d+ /, '');
      const leagueType = baseName;
      
      if (!leagueTypeMap.has(leagueType)) {
        leagueTypeMap.set(leagueType, {
          id: leagueType.toLowerCase().replace(/\s+/g, '-'),
          name: baseName,
          type: entry.league.type,
          entries: []
        });
      }
      leagueTypeMap.get(leagueType).entries.push(entry);
    }
  });
  
  return Array.from(leagueTypeMap.values());
};

const Leaderboard: React.FC<LeaderboardProps> = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // State management
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'compact' | 'expanded'>('compact');
  const [enableVirtualization, setEnableVirtualization] = useState(false);

  // API data states
  const [leagues, setLeagues] = useState<ProcessedLeague[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<any>(null);
  const [gameweeks, setGameweeks] = useState<any[]>([]);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);

  // Refs for abortable requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Auto-refresh countdown
  const countdown = useAutoRefreshCountdown(isAutoRefreshing, 30000);

  // Auto-enable virtualization for large datasets
  useEffect(() => {
    const shouldVirtualize = leaderboardData.length > 500;
    if (shouldVirtualize !== enableVirtualization) {
      setEnableVirtualization(shouldVirtualize);
    }
  }, [leaderboardData.length, enableVirtualization]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery) return leaderboardData;
    
    return leaderboardData.filter((entry: LeaderboardEntry) =>
      entry.username.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      entry.teamName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [leaderboardData, debouncedSearchQuery]);

  // Memoized available gameweeks
  const availableGameweeks = useMemo(() => {
    return getAvailableGameweeks(leagues, selectedLeague, gameweeks);
  }, [leagues, selectedLeague, gameweeks]);

  // Memoized current league
  const currentLeague = useMemo(() => {
    return leagues.find((l: ProcessedLeague) => l.id.toString() === selectedLeague);
  }, [leagues, selectedLeague]);

  // Helper function to check if an entry belongs to the current user
  const isUserTeam = useCallback((entry: LeaderboardEntry) => {
    return user && entry.userId === user.id;
  }, [user]);


  // Abortable API request function
  const makeAbortableRequest = useCallback(async <T,>(
    requestFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      return await requestFn(abortController.signal);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        throw error;
      }
      throw error;
    }
  }, []);

  // Load leaderboard data with abortable requests
  const loadLeaderboardData = useCallback(async (
    leagueType: string, 
    gameweek?: string, 
    forceRefresh: boolean = false
  ) => {
    try {
      console.log('🔄 Loading leaderboard data:', { leagueType, gameweek, forceRefresh });
      
      if (forceRefresh || leaderboardData.length === 0) {
        setIsLoadingLeaderboard(true);
      }

      const selectedLeagueType = leagues.find(league => league.id === leagueType);
      if (!selectedLeagueType) {
        console.log('❌ No league type found for:', leagueType);
        setLeaderboardData([]);
        setLeagueInfo(null);
        return;
      }

      console.log('📊 Available entries for league:', selectedLeagueType.entries.map((e: any) => ({
        leagueId: e.league.id,
        startGameweek: e.league.startGameweek,
        leagueName: e.league.name
      })));

      const specificLeagueEntry = selectedLeagueType.entries.find((entry: any) => 
        entry.league.startGameweek.toString() === gameweek
      );

      if (!specificLeagueEntry) {
        console.log('❌ No entry found for gameweek:', gameweek);
        setLeaderboardData([]);
        setLeagueInfo({
          leagueId: '',
          leagueName: `${selectedLeagueType.name} (Gameweek ${gameweek})`,
          totalEntries: 0,
          status: 'NO_ENTRY_FOR_GAMEWEEK'
        });
        return;
      }

      console.log('✅ Found league entry:', {
        leagueId: specificLeagueEntry.league.id,
        leagueName: specificLeagueEntry.league.name,
        startGameweek: specificLeagueEntry.league.startGameweek
      });

      const response = await makeAbortableRequest(async () => {
        return await apiClient.getLeagueLeaderboard(
          specificLeagueEntry.league.id, 
          forceRefresh, 
          true
        );
      });

      console.log('📈 Leaderboard response:', response);
      setLeaderboardData(response.leaderboard);
      setLeagueInfo(response.leagueInfo);

      // Start auto-refresh for live leagues
      if (response.leagueInfo?.status === 'LIVE') {
        apiClient.startLeaderboardAutoRefresh(specificLeagueEntry.league.id, 30000);
        setIsAutoRefreshing(true);
      } else {
        apiClient.stopLeaderboardAutoRefresh();
        setIsAutoRefreshing(false);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load leaderboard:', error);
        setLeaderboardData([]);
        setLeagueInfo(null);
      }
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [leagues, leaderboardData.length, makeAbortableRequest]);

  // Debounced refresh function
  const refreshLeaderboard = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (selectedLeague && selectedGameweek) {
        loadLeaderboardData(selectedLeague, selectedGameweek, true);
      }
    }, 500);
  }, [selectedLeague, selectedGameweek, loadLeaderboardData]);

  // Handle entry selection
  const handleEntrySelect = useCallback((rank: number | null) => {
    setSelectedEntry(rank);
  }, []);

  // Get league and gameweek from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const leagueFromUrl = urlParams.get('league');
    const gameweekFromUrl = urlParams.get('gameweek');
    
    if (leagueFromUrl) {
      setSelectedLeague(leagueFromUrl);
    }
    if (gameweekFromUrl) {
      setSelectedGameweek(gameweekFromUrl);
    }
  }, []);

  // Load user leagues and gameweeks on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [userLeagueEntries, upcomingData] = await Promise.all([
          apiClient.getUserLeagues(),
          apiClient.getUpcomingLeagues()
        ]);
        
        const uniqueLeagues = processLeagueEntries(userLeagueEntries);
        setLeagues(uniqueLeagues);
        
        // Generate gameweeks including historical ones where user has entries
        const currentGW = upcomingData.currentGameweek?.id || 1;
        setCurrentGameweek(currentGW);
        const gameweekList = [];
        
        // Find the earliest gameweek where user has entries
        const userGameweeks = new Set();
        userLeagueEntries.forEach(entry => {
          if (entry.league?.startGameweek) {
            userGameweeks.add(entry.league.startGameweek);
          }
        });
        
        const minGameweek = userGameweeks.size > 0 ? Math.min(...Array.from(userGameweeks).map(Number)) : currentGW;
        
        // Generate gameweeks from earliest user gameweek to 38
        for (let i = minGameweek; i <= 38; i++) {
          gameweekList.push({
            id: i,
            name: `Gameweek ${i}`
          });
        }
        setGameweeks(gameweekList);
        
        // Auto-select gameweek based on user's joined leagues
        if (gameweekList.length > 0 && !selectedGameweek) {
          const autoSelectedGameweek = getAutoSelectedGameweek(userLeagueEntries, currentGW);
          setSelectedGameweek(autoSelectedGameweek.toString());
        }
        
        // Set first league as selected if no league from URL and leagues available
        if (uniqueLeagues.length > 0 && !selectedLeague) {
          setSelectedLeague(uniqueLeagues[0].id);
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load leagues and gameweeks');
        setLeagues([]);
        setGameweeks([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, selectedLeague, selectedGameweek]);

  // Load leaderboard data when league or gameweek changes
  useEffect(() => {
    if (selectedLeague && selectedGameweek && leagues.length > 0) {
      loadLeaderboardData(selectedLeague, selectedGameweek);
    }
  }, [selectedLeague, selectedGameweek, leagues, loadLeaderboardData]);

  // Auto-select first available gameweek when league type is selected (only if no gameweek is selected)
  useEffect(() => {
    if (selectedLeague && leagues.length > 0 && !selectedGameweek) {
      const selectedLeagueType = leagues.find(league => league.id === selectedLeague);
      if (selectedLeagueType && selectedLeagueType.entries.length > 0) {
        const firstGameweek = selectedLeagueType.entries
          .map((entry: any) => entry.league.startGameweek)
          .sort((a: number, b: number) => a - b)[0];
        
        if (firstGameweek) {
          console.log('🎯 Auto-selecting first gameweek:', firstGameweek);
          setSelectedGameweek(firstGameweek.toString());
        }
      }
    }
  }, [selectedLeague, leagues, selectedGameweek]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      apiClient.stopLeaderboardAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Render function for virtualized items - MUST be before early returns
  const renderVirtualizedItem = useCallback((item: LeaderboardEntry, _index: number, style: React.CSSProperties) => (
    <LeaderboardRow
      key={item.linkedTeamId || item.id}
      entry={item}
      isSelected={selectedEntry === item.rank}
      isUserTeam={!!isUserTeam(item)}
      selectedGameweek={selectedGameweek}
      onSelect={handleEntrySelect}
      viewMode={isMobile ? mobileViewMode : 'desktop'}
      style={style}
    />
  ), [selectedEntry, isUserTeam, selectedGameweek, handleEntrySelect, isMobile, mobileViewMode]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="container-clean py-3 px-1 max-w-full">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Track standings across your leagues.</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading leagues...</span>
        </div>
      </div>
    );
  }

  // Show empty state if no leagues joined at all
  if (leagues.length === 0) {
    return (
      <div className="container-clean py-3 px-1 max-w-full">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Track standings across your leagues.</p>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No leagues entered yet</p>
          <p className="text-sm text-muted-foreground">Join a league to see your standings here</p>
        </div>
      </div>
    );
  }

  const viewMode = isMobile ? mobileViewMode : 'desktop';
  const itemHeight = viewMode === 'compact' ? 50 : 50; // Compact view now uses flex layout
  const containerHeight = isMobile ? window.innerHeight * 0.6 : window.innerHeight * 0.7; // Responsive height

  return (
    <div className="container-clean py-3 px-0.5 sm:px-1 max-w-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Track standings across your leagues.</p>
          </div>
          <div className="flex items-center gap-2">
            {enableVirtualization && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Settings className="w-3 h-3" />
                <span>Virtualized ({filteredData.length} entries)</span>
              </div>
            )}
          </div>
        </div>
        {leagueInfo && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              leagueInfo.status === 'LIVE' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : leagueInfo.status === 'NOT_STARTED'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : leagueInfo.status === 'NO_ENTRY_FOR_GAMEWEEK'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {leagueInfo.status === 'LIVE' ? 'Live' : 
               leagueInfo.status === 'NOT_STARTED' ? 'Not Started' : 
               leagueInfo.status === 'NO_ENTRY_FOR_GAMEWEEK' ? 'No Entry' : 'Unknown'}
            </span>
            {leagueInfo.status === 'NOT_STARTED' && (
              <span className="text-xs text-muted-foreground">
                All teams show rank 1, points 0 until gameweek {leagueInfo.leagueStartGameweek} starts
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              League for Gameweek {leagueInfo.leagueStartGameweek}
            </span>
            <span className="text-xs text-muted-foreground">
              ({filteredData.length} entries)
            </span>
          </div>
        )}
      </div>

      {/* League and Gameweek Dropdowns */}
      <div className="flex flex-row gap-3 mb-4">
        <div className="flex-1">
          <Select
            value={selectedLeague}
            onValueChange={setSelectedLeague}
          >
            <SelectTrigger className="h-8 border-0 border-b-2 border-muted rounded-none bg-transparent px-0 focus:border-primary">
              <SelectValue placeholder="Select League" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select
            value={selectedGameweek}
            onValueChange={setSelectedGameweek}
          >
            <SelectTrigger className="h-8 border-0 border-b-2 border-muted rounded-none bg-transparent px-0 focus:border-primary">
              <SelectValue placeholder="Select Gameweek" />
            </SelectTrigger>
            <SelectContent>
              {availableGameweeks.map((gameweek) => (
                <SelectItem key={gameweek.id} value={gameweek.id.toString()}>
                  {gameweek.name} {gameweek.id === currentGameweek ? '(Current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Bar and Refresh Button */}
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search managers or teams..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="h-8 input-clean flex-1"
        />
        <Button
          onClick={refreshLeaderboard}
          disabled={isLoadingLeaderboard || !selectedLeague || !selectedGameweek}
          variant="outline"
          size="sm"
          className="h-8 px-3"
        >
          {isLoadingLeaderboard ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Refreshing...
            </>
          ) : isAutoRefreshing ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Auto-Refresh ON ({countdown}s)
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* User Team Quick Nav */}
      {currentLeague && currentLeague.userTeams && currentLeague.userTeams.length > 0 && (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">
            Your teams in this league:
          </p>
          <div className="flex flex-wrap gap-2">
            {currentLeague.userTeams.map((userTeam: any, index: number) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleEntrySelect(userTeam.currentRank)}
                className="text-xs border-primary/30 text-primary hover:bg-primary/10 rounded-full h-6 px-3"
              >
                {userTeam.teamName} #{userTeam.currentRank}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile View Toggle */}
      {isMobile && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">View mode:</p>
          <div className="flex bg-accent/50 rounded-lg p-1">
            <button
              onClick={() => setMobileViewMode('compact')}
              className={`flex items-center space-x-1 py-1 px-3 rounded-md text-sm font-medium transition-colors ${
                mobileViewMode === 'compact'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Compact</span>
            </button>
            <button
              onClick={() => setMobileViewMode('expanded')}
              className={`flex items-center space-x-1 py-1 px-3 rounded-md text-sm font-medium transition-colors ${
                mobileViewMode === 'expanded'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3 h-3" />
              <span>Table</span>
            </button>
          </div>
        </div>
      )}

      {/* Standings Table */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg h-full flex flex-col overflow-hidden">
        {isLoadingLeaderboard ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading leaderboard...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery 
                ? "No entries found matching your search." 
                : leagueInfo?.status === 'NO_ENTRY_FOR_GAMEWEEK'
                ? "No entry for this gameweek. Select the correct gameweek for this league."
                : leaderboardData.length === 0
                ? "No leaderboard data available for this league."
                : "No leaderboard data available."
              }
            </p>
          </div>
        ) : (
          <div>
            {/* Table Headers */}
            {viewMode === 'compact' ? (
              <div className="flex items-center px-1 sm:px-2 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700/50 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-20">
                <div className="flex-shrink-0 w-5 sm:w-6 text-left">#</div>
                <div className="flex-1 min-w-0 px-1 sm:px-2">Team</div>
                <div className="flex-shrink-0 w-8 sm:w-10 text-right">Pts</div>
                <div className="flex-shrink-0 w-12 sm:w-14 text-right">
                  <span className="hidden xs:inline">Payout</span>
                  <span className="xs:hidden">Pay</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700/50 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-20 min-w-[600px]">
                  <div className="text-center">#</div>
                  <div className="text-left">Team</div>
                  <div className="text-center">RP</div>
                  <div className="text-left">Captain</div>
                  <div className="text-center">Pts</div>
                  <div className="text-center">Payout</div>
                </div>
              </div>
            )}

            {/* Table Body - Virtualized or Standard with Infinite Scroll */}
            {enableVirtualization ? (
              <SimpleVirtualizedList
                items={filteredData}
                itemHeight={itemHeight}
                containerHeight={containerHeight}
                renderItem={renderVirtualizedItem}
                overscan={10}
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                {viewMode === 'expanded' ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {filteredData.map((entry) => (
                        <LeaderboardRow
                          key={entry.linkedTeamId || entry.id}
                          entry={entry}
                          isSelected={selectedEntry === entry.rank}
                          isUserTeam={!!isUserTeam(entry)}
                          selectedGameweek={selectedGameweek}
                          onSelect={handleEntrySelect}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {filteredData.map((entry) => (
                      <LeaderboardRow
                        key={entry.linkedTeamId || entry.id}
                        entry={entry}
                        isSelected={selectedEntry === entry.rank}
                        isUserTeam={!!isUserTeam(entry)}
                        selectedGameweek={selectedGameweek}
                        onSelect={handleEntrySelect}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Load More Button */}
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Next 100
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;