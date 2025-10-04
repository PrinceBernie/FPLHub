import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ExternalLink, Search, Loader2, CheckCircle, Trophy, Target, Zap, X, Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface LinkFplTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamLinked?: () => void;
  currentLinkedTeamsCount?: number;
}

interface FplTeam {
  id: string;
  name: string;
  manager: string;
  totalPoints: number;
  gameweekPoints: number;
  overallRank: number;
  gameweekRank: number;
  transfers: number;
  transfersLeft: number;
  bank: number;
  currentGameweek: number;
}

interface TeamInfoModalProps {
  team: FplTeam;
  onClose: () => void;
  onLink: () => void;
}

const TeamInfoModal: React.FC<TeamInfoModalProps> = ({ team, onClose, onLink }) => {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="clean-card-sm max-w-sm border-primary/20">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">{team.name}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">{team.manager}</DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="clean-card-sm bg-primary/5 border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Total Points</p>
              <p className="font-bold text-primary">{team.totalPoints.toLocaleString()}</p>
            </div>
            <div className="clean-card-sm bg-muted/10">
              <p className="text-xs text-muted-foreground mb-1">Overall Rank</p>
              <p className="font-bold">#{team.overallRank.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>GW{team.currentGameweek}: {team.gameweekPoints}pts</span>
            <span>£{team.bank}m ITB</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              size="sm"
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                console.log('TeamInfoModal Link Team button clicked!');
                onLink();
              }} 
              size="sm"
              className="flex-1 bg-success hover:bg-success/90"
            >
              <Zap className="w-3 h-3 mr-1" />
              Link Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LinkFplTeamModal: React.FC<LinkFplTeamModalProps> = ({ open, onOpenChange, onTeamLinked, currentLinkedTeamsCount = 0 }) => {
  const [teamId, setTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundTeam, setFoundTeam] = useState<FplTeam | null>(null);
  const [error, setError] = useState('');
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'id' | 'url'>('id');


  const extractTeamIdFromUrl = (url: string): string => {
    // Extract team ID from FPL URL
    const match = url.match(/\/entry\/(\d+)/);
    return match ? match[1] : '';
  };

  const searchTeam = async () => {
    let fplUrl = teamId;
    
    if (searchMethod === 'id') {
      // Convert team ID to full URL
      fplUrl = `https://fantasy.premierleague.com/entry/${teamId}/`;
    } else if (!teamId.includes('fantasy.premierleague.com')) {
      setError('Invalid FPL URL. Please check the URL format.');
      return;
    }

    if (!fplUrl) {
      setError(searchMethod === 'id' ? 'Please enter a team ID' : 'Please enter a valid FPL URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setFoundTeam(null);

    try {
      // Use backend API to fetch team data from public endpoint
      const response = await apiClient.getFplTeam(parseInt(extractTeamIdFromUrl(fplUrl)));
      
      const team: FplTeam = {
        id: response.data.id.toString(),
        name: response.data.name,
        manager: `${response.data.playerFirstName} ${response.data.playerLastName}`,
        totalPoints: response.data.totalPoints || 0,
        gameweekPoints: response.data.teamValue || 0,
        overallRank: response.data.overallRank || 0,
        gameweekRank: 0, // Not available in current API
        transfers: response.data.transfers || 0,
        transfersLeft: 1, // Not available in current API
        bank: response.data.bank || 0,
        currentGameweek: response.data.gameweek || 1
      };
      
      setFoundTeam(team);
      setShowTeamInfo(true);
    } catch (err: any) {
      setError(err.message || 'Team not found. Please check the team ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const linkTeam = async () => {
    console.log('linkTeam function called!');
    if (!foundTeam) {
      console.log('No found team, returning');
      return;
    }

    // Client-side validation: Check if user has reached the maximum limit
    if (currentLinkedTeamsCount >= 10) {
      toast.error('You have reached the maximum limit of 10 linked teams. Please unlink a team first to add a new one.', { id: 'linking-team' });
      return;
    }

    try {
      console.log('Linking team:', foundTeam);
      const fplUrl = `https://fantasy.premierleague.com/entry/${foundTeam.id}/`;
      console.log('FPL URL:', fplUrl);
      
      // Show immediate feedback
      toast.loading(`Linking ${foundTeam.name}...`, { id: 'linking-team' });
      
      const result = await apiClient.linkFplTeam(fplUrl, foundTeam.name);
      console.log('Link result:', result);
      
      // Update toast to success
      toast.success(`Successfully linked ${foundTeam.name}!`, { id: 'linking-team' });
      onOpenChange(false);
      resetForm();
      
      // Call the callback to refresh linked teams with a small delay
      if (onTeamLinked) {
        console.log('🔄 Calling onTeamLinked callback to refresh teams...');
        // Add a small delay to ensure backend has processed the link
        setTimeout(() => {
          onTeamLinked();
        }, 500);
      } else {
        console.warn('⚠️ onTeamLinked callback not provided');
      }
    } catch (error: any) {
      console.error('Link team error:', error);
      
      // Handle specific error cases with user-friendly messages
      if (error.message && error.message.includes('Maximum of 10 linked teams')) {
        toast.error('You have reached the maximum limit of 10 linked teams. Please unlink a team first to add a new one.', { id: 'linking-team' });
      } else if (error.message && error.message.includes('already linked to another account')) {
        toast.error('This FPL team is already linked to another account. Please choose a different team.', { id: 'linking-team' });
      } else {
        toast.error(error.message || 'Failed to link team. Please try again.', { id: 'linking-team' });
      }
    }
  };

  const resetForm = () => {
    setTeamId('');
    setFoundTeam(null);
    setError('');
    setShowTeamInfo(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (showTeamInfo && foundTeam) {
    console.log('Showing TeamInfoModal - showTeamInfo:', showTeamInfo);
    return (
      <TeamInfoModal
        team={foundTeam}
        onClose={() => setShowTeamInfo(false)}
        onLink={() => {
          console.log('TeamInfoModal onLink called, directly linking team');
          setShowTeamInfo(false); // Close the TeamInfoModal first
          linkTeam(); // Directly link the team
        }}
      />
    );
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="clean-card max-w-md border-primary/20">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-lg">Link FPL Team</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Connect your Fantasy Premier League team to track performance
          </DialogDescription>
        </DialogHeader>

        {/* Warning message if at limit */}
        {currentLinkedTeamsCount >= 10 && (
          <Alert className="border-red-500/30 bg-red-500/10">
            <AlertDescription>
              <div className="flex items-center gap-2 text-white">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-bold">Maximum teams reached</span>
              </div>
              <p className="text-sm mt-1 text-red-600 dark:text-red-400">
                You have reached the limit of 10 linked teams. Please unlink a team first to add a new one.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {/* Method Selection */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">How would you like to link your team?</h4>
            <div className="flex gap-2">
              <Button
                variant={searchMethod === 'id' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSearchMethod('id');
                  setTeamId('');
                  setError('');
                }}
                className="flex-1 rounded-md px-3 py-1 h-7 text-xs"
              >
                Team ID
              </Button>
              <Button
                variant={searchMethod === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSearchMethod('url');
                  setTeamId('');
                  setError('');
                }}
                className="flex-1 rounded-md px-3 py-1 h-7 text-xs"
              >
                Full URL
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="clean-card-sm bg-muted/5 border-muted/20 p-3">
            <div className="flex items-start gap-2">
              <div className="p-1 bg-primary/10 rounded-lg mt-0.5">
                <Target className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h5 className="text-xs font-medium">
                  {searchMethod === 'id' ? 'Find your Team ID' : 'Copy your team URL'}
                </h5>
                <ol className="text-xs text-muted-foreground space-y-0.5">
                  <li>1. Go to fantasy.premierleague.com</li>
                  <li>2. Navigate to your "Points" page</li>
                  <li>
                    3. {searchMethod === 'id' 
                      ? 'Copy the numbers after "entry/" in the URL' 
                      : 'Copy the complete URL from your browser'}
                  </li>
                </ol>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                  onClick={() => window.open('https://fantasy.premierleague.com', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open FPL
                </Button>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {searchMethod === 'id' ? 'Team ID' : 'Team URL'}
              </label>
              <Input
                placeholder={
                  searchMethod === 'id' 
                    ? "e.g., 1234567" 
                    : "https://fantasy.premierleague.com/entry/1234567/..."
                }
                value={teamId}
                onChange={(e) => {
                  if (searchMethod === 'id') {
                    setTeamId(e.target.value.replace(/\D/g, ''));
                  } else {
                    setTeamId(e.target.value);
                  }
                  setError('');
                }}
                className="input-clean text-center h-8"
                disabled={isLoading || currentLinkedTeamsCount >= 10}
              />
            </div>

            <Button 
              onClick={searchTeam}
              disabled={isLoading || !teamId || currentLinkedTeamsCount >= 10}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 mr-2" />
                  Find Team
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkFplTeamModal;
