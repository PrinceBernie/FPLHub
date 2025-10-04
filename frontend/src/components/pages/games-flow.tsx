import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Trophy, 
  Play,
  Calendar,
  Users,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface LinkedTeam {
  id: string;
  teamName: string;
  fplTeamId: number;
  fplUrl: string;
  totalPoints: number;
  overallRank: number;
  gameweekPoints: number;
  teamValue: number;
  bank: number;
  transfers: number;
  gameweek: number;
  createdAt: string;
}

type Step = 'gameweek' | 'teams' | 'review';

const GamesFlow: React.FC = () => {
  const navigate = useNavigate();
  const { gameType } = useParams<{ gameType: 'champions' | 'free2play' }>();
  const location = useLocation();
  
  // Get currentGameweek from location state or default to 6
  const currentGameweek = location.state?.currentGameweek || 6;
  
  // Validate gameType
  if (!gameType || !['champions', 'free2play'].includes(gameType)) {
    navigate('/dashboard');
    return null;
  }
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>('gameweek');
  const [selectedGameweek, setSelectedGameweek] = useState<number>(currentGameweek + 1);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // Data state
  const [linkedTeams, setLinkedTeams] = useState<LinkedTeam[]>([]);
  const [availableTeams, setAvailableTeams] = useState<LinkedTeam[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [availableGameweeks, setAvailableGameweeks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update available teams when gameweek or linked teams change (but not when selected teams change)
  useEffect(() => {
    if (linkedTeams.length > 0) {
      updateAvailableTeams();
    }
  }, [selectedGameweek, linkedTeams]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [teams, wallet] = await Promise.all([
        apiClient.getLinkedTeams(),
        apiClient.getWallet()
      ]);
      
      setLinkedTeams(teams);
      setWalletBalance(wallet.balance);
      
      // Load available gameweeks
      await loadAvailableGameweeks();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableGameweeks = async () => {
    try {
      const futureGameweeks = Array.from(
        { length: 38 - currentGameweek }, 
        (_, i) => currentGameweek + 1 + i
      );
      
      const availableGw: number[] = [];
      
      // Check each future gameweek for available leagues
      for (const gameweek of futureGameweeks) {
        try {
          const leagues = await apiClient.getGameweekLeagues(gameweek);
          const leagueType = gameType === 'champions' ? 'PAID' : 'FREE';
          const league = leagues.find(l => l.type === leagueType);
          
          // Only include gameweeks that have leagues with OPEN_FOR_ENTRY status
          if (league && league.leagueState === 'OPEN_FOR_ENTRY') {
            availableGw.push(gameweek);
          }
        } catch (error) {
          console.warn(`Failed to check gameweek ${gameweek}:`, error);
          // Continue checking other gameweeks
        }
      }
      
      setAvailableGameweeks(availableGw);
      
      // Auto-select the first available gameweek if current selection is not available
      if (availableGw.length > 0 && !availableGw.includes(selectedGameweek)) {
        setSelectedGameweek(availableGw[0]);
      }
    } catch (error) {
      console.error('Error loading available gameweeks:', error);
      // Fallback to showing all future gameweeks if there's an error
      const fallbackGameweeks = Array.from(
        { length: 38 - currentGameweek }, 
        (_, i) => currentGameweek + 1 + i
      );
      setAvailableGameweeks(fallbackGameweeks);
    }
  };

  const updateAvailableTeams = async () => {
    try {
      // Get teams that are already in the selected league
      const leagueId = await getLeagueIdForGameweek(selectedGameweek, gameType);
      const userLeagueEntries = await apiClient.getUserLeagues();
      
      const teamsInLeague = userLeagueEntries
        .filter(entry => entry.league?.id === leagueId)
        .map(entry => entry.linkedTeamId);
      
      // Filter out teams that are already in the league (but keep selected teams visible)
      const available = linkedTeams.filter(team => 
        !teamsInLeague.includes(team.id)
      );
      
      console.log('updateAvailableTeams:', {
        selectedGameweek,
        gameType,
        leagueId,
        teamsInLeague,
        allLinkedTeams: linkedTeams.map(t => ({ id: t.id, name: t.teamName })),
        availableTeams: available.map(t => ({ id: t.id, name: t.teamName })),
        selectedTeams
      });
      
      setAvailableTeams(available);
    } catch (error) {
      console.error('Error updating available teams:', error);
      setAvailableTeams([]);
    }
  };

  const getLeagueIdForGameweek = async (gameweek: number, type: 'champions' | 'free2play'): Promise<string | null> => {
    try {
      const leagues = await apiClient.getGameweekLeagues(gameweek);
      const leagueType = type === 'champions' ? 'PAID' : 'FREE';
      const league = leagues.find(l => l.type === leagueType);
      return league?.id || null;
    } catch (error) {
      console.error('Error fetching league for gameweek:', error);
      return null;
    }
  };

  const getGameInfo = () => {
    if (gameType === 'champions') {
      return {
        title: 'Gameweek Champions',
        icon: <Trophy className="w-6 h-6 text-primary" />,
        price: 10,
        color: 'primary',
        description: 'Compete for the top spot in paid leagues'
      };
    } else {
      return {
        title: 'Free2Play',
        icon: <Play className="w-6 h-6 text-success" />,
        price: 0,
        color: 'success',
        description: 'Join free leagues and compete for fun'
      };
    }
  };

  const gameInfo = getGameInfo();
  const totalCost = gameInfo.price * selectedTeams.length;

  // Step navigation
  const canProceedToTeams = availableGameweeks.includes(selectedGameweek);
  const canProceedToReview = selectedTeams.length > 0;
  const canComplete = gameType === 'free2play' || walletBalance >= totalCost;

  const handleNext = () => {
    if (currentStep === 'gameweek' && canProceedToTeams) {
      setCurrentStep('teams');
    } else if (currentStep === 'teams' && canProceedToReview) {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'teams') {
      setCurrentStep('gameweek');
    } else if (currentStep === 'review') {
      setCurrentStep('teams');
    }
  };

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    console.log('Team selection changed:', { teamId, checked, currentSelected: selectedTeams });
    if (checked) {
      setSelectedTeams(prev => {
        const newSelection = [...prev, teamId];
        console.log('New selection:', newSelection);
        return newSelection;
      });
    } else {
      setSelectedTeams(prev => {
        const newSelection = prev.filter(id => id !== teamId);
        console.log('New selection after removal:', newSelection);
        return newSelection;
      });
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === availableTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(availableTeams.map(team => team.id));
    }
  };

  const handleComplete = async () => {
    try {
      setIsProcessing(true);
      
      // Get league ID
      const leagueId = await getLeagueIdForGameweek(selectedGameweek, gameType);
      if (!leagueId) {
        throw new Error(`No league found for Gameweek ${selectedGameweek} ${gameType}`);
      }
      
      // Use bulk join API
      const result = await apiClient.bulkJoinLeague(leagueId, selectedTeams);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to join teams to league');
      }
      
      const { summary } = result.data;
      
      if (summary.failed > 0) {
        throw new Error(`Failed to join ${summary.failed} team(s). Please try again.`);
      }
      
      // Success message
      let successMessage = `Successfully processed ${summary.total} team(s):`;
      if (summary.joined > 0) {
        successMessage += ` ${summary.joined} joined`;
      }
      if (summary.alreadyInLeague > 0) {
        successMessage += `, ${summary.alreadyInLeague} already in league`;
      }
      
      toast.success(successMessage);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Join failed:', error);
      toast.error(error.message || 'Failed to join league. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Use available gameweeks (filtered by league status)
  // fallbackGameweeks is used as a fallback if availableGameweeks is empty
  const fallbackGameweeks = Array.from(
    { length: 38 - currentGameweek }, 
    (_, i) => currentGameweek + 1 + i
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'gameweek': return 'Select Gameweek';
      case 'teams': return 'Choose Teams';
      case 'review': return 'Review & Confirm';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'gameweek': return 'Choose which gameweek you want to join';
      case 'teams': return 'Select the teams you want to enter';
      case 'review': return 'Review your selection and complete the process';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-Optimized Header */}
      <div className="border-b bg-card">
        <div className="container-clean px-3 py-3 sm:px-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 px-2 sm:px-3">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Join {gameInfo.title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{gameInfo.description}</p>
            </div>
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg bg-${gameInfo.color}/10 flex-shrink-0`}>
              <div className="w-4 h-4 sm:w-6 sm:h-6">{gameInfo.icon}</div>
              <span className="font-semibold text-sm sm:text-base">{gameInfo.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Progress Steps */}
      <div className="border-b bg-card">
        <div className="container-clean px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8">
            {(['gameweek', 'teams', 'review'] as Step[]).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 ${
                  currentStep === step 
                    ? `border-${gameInfo.color} bg-${gameInfo.color} text-white` 
                    : currentStep === 'teams' && step === 'gameweek' || currentStep === 'review' && ['gameweek', 'teams'].includes(step)
                    ? `border-${gameInfo.color} bg-${gameInfo.color} text-white`
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep === 'review' && ['gameweek', 'teams'].includes(step) || currentStep === 'teams' && step === 'gameweek' ? (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline ${
                  currentStep === step ? `text-${gameInfo.color}` : 'text-muted-foreground'
                }`}>
                  {step === 'gameweek' ? 'Gameweek' : step === 'teams' ? 'Teams' : 'Review'}
                </span>
                {index < 2 && (
                  <div className={`w-4 sm:w-8 h-0.5 ml-2 sm:ml-4 ${
                    currentStep === 'teams' && step === 'gameweek' || currentStep === 'review' && ['gameweek', 'teams'].includes(step)
                      ? `bg-${gameInfo.color}`
                      : 'bg-muted-foreground/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Main Content */}
      <div className="container-clean py-3 px-3">
        <div className="max-w-2xl mx-auto">
          {/* Mobile-Optimized Step Header */}
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-xl font-semibold mb-1">{getStepTitle()}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{getStepDescription()}</p>
          </div>

          {/* Mobile-Optimized Step Content */}
          <div className="bg-card rounded-lg border p-3 sm:p-6">
            {currentStep === 'gameweek' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="gameweek" className="text-sm sm:text-base font-medium">
                    Select Gameweek
                  </Label>
                  {availableGameweeks.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No gameweeks are currently available for joining. All upcoming gameweeks have already started or are full.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedGameweek.toString()} onValueChange={(value) => setSelectedGameweek(parseInt(value))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a gameweek" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGameweeks.map((gw) => (
                          <SelectItem key={gw} value={gw.toString()}>
                            Gameweek {gw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className={`p-4 rounded-lg bg-${gameInfo.color}/5 border border-${gameInfo.color}/20`}>
                  <div className="flex items-center gap-3">
                    {gameInfo.icon}
                    <div>
                      <h3 className="font-semibold">{gameInfo.title} - Gameweek {selectedGameweek}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={gameType === 'champions' ? 'secondary' : 'outline'}>
                          {gameType === 'champions' ? 'PAID' : 'FREE'}
                        </Badge>
                        <span className={`font-bold text-${gameInfo.color}`}>
                          {gameType === 'champions' ? `GHC ${gameInfo.price}.00 per team` : 'FREE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'teams' && (
              <div className="space-y-6">
                {linkedTeams.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No linked teams found. Please link an FPL team first.
                    </AlertDescription>
                  </Alert>
                ) : availableTeams.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No teams available for Gameweek {selectedGameweek}. All your teams may already be in this league.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <h3 className="text-base sm:text-lg font-semibold">Available Teams</h3>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {selectedTeams.length} of {availableTeams.length} selected
                        </span>
                        {availableTeams.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllTeams}
                            className="h-7 px-2 sm:px-3 text-xs sm:text-sm"
                          >
                            {selectedTeams.length === availableTeams.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableTeams.map((team) => (
                        <div key={team.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg">
                          <Checkbox
                            id={team.id}
                            checked={selectedTeams.includes(team.id)}
                            onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={team.id} className="font-medium cursor-pointer text-sm sm:text-base truncate block">
                              {team.teamName}
                            </Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">FPL ID: {team.fplTeamId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                {/* Game Summary */}
                <div className={`p-4 rounded-lg bg-${gameInfo.color}/5 border border-${gameInfo.color}/20`}>
                  <div className="flex items-center gap-3">
                    {gameInfo.icon}
                    <div>
                      <h3 className="font-semibold">{gameInfo.title} - Gameweek {selectedGameweek}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={gameType === 'champions' ? 'secondary' : 'outline'}>
                          {gameType === 'champions' ? 'PAID' : 'FREE'}
                        </Badge>
                        <span className={`font-bold text-${gameInfo.color}`}>
                          {gameType === 'champions' ? `GHC ${gameInfo.price}.00 per team` : 'FREE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-Optimized Selected Teams */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Selected Teams ({selectedTeams.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTeams.map((teamId) => {
                      const team = linkedTeams.find(t => t.id === teamId);
                      return team ? (
                        <div key={teamId} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-${gameInfo.color}/10 rounded-full flex items-center justify-center flex-shrink-0`}>
                            <Trophy className={`w-3 h-3 sm:w-4 sm:h-4 text-${gameInfo.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base truncate">{team.teamName}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">FPL ID: {team.fplTeamId}</p>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Mobile-Optimized Cost Breakdown */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground truncate">Gameweek {selectedGameweek} {gameInfo.title} ({selectedTeams.length} teams):</span>
                      <span className="font-medium flex-shrink-0 ml-2">
                        {gameType === 'champions' ? `GHC ${totalCost}.00` : 'FREE'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base sm:text-lg font-bold">
                      <span>Total Amount Due:</span>
                      <span className={`text-${gameInfo.color} flex-shrink-0 ml-2`}>
                        {totalCost > 0 ? `GHC ${totalCost}.00` : 'FREE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wallet Balance (for paid games) */}
                {gameType === 'champions' && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Wallet Balance:</span>
                      <span className="font-medium">GHC {(walletBalance / 100).toFixed(2)}</span>
                    </div>
                    {walletBalance < totalCost && (
                      <p className="text-xs text-destructive mt-1">
                        Insufficient balance. Please top up your wallet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile-Optimized Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 sm:mt-8">
            <Button 
              variant="outline" 
              onClick={currentStep === 'gameweek' ? handleCancel : handleBack}
              className="h-10 sm:h-auto order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 'gameweek' ? 'Cancel' : 'Back'}
            </Button>
            
            {currentStep === 'review' ? (
              <Button
                onClick={handleComplete}
                disabled={isProcessing || !canComplete}
                className={`bg-${gameInfo.color} hover:bg-${gameInfo.color}/90 h-10 sm:h-auto order-1 sm:order-2`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {gameType === 'champions' ? 'Pay & Join' : 'Join Free'}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceedToTeams && currentStep === 'gameweek' || !canProceedToReview && currentStep === 'teams'}
                className={`bg-${gameInfo.color} hover:bg-${gameInfo.color}/90 h-10 sm:h-auto order-1 sm:order-2`}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesFlow;