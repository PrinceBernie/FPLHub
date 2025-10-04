import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
  X, 
  Loader2, 
  Users, 
  Trophy, 
  AlertTriangle,
  CheckCircle,
  Crown,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface TeamSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNext: (selectedTeams: string[], selectedCompetitions: string[]) => void;
  selectedCompetitions: string[];
  gameweek: number;
}

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

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  open,
  onOpenChange,
  onNext,
  selectedCompetitions,
  gameweek
}) => {
  const [linkedTeams, setLinkedTeams] = useState<LinkedTeam[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load linked teams when modal opens
  useEffect(() => {
    if (open) {
      loadLinkedTeams();
    }
  }, [open]);

  const loadLinkedTeams = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getLinkedTeams();
      if (response.success && response.data) {
        setLinkedTeams(response.data);
      }
    } catch (error) {
      console.error('Failed to load linked teams:', error);
      toast.error('Failed to load linked teams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams(prev => [...prev, teamId]);
    } else {
      setSelectedTeams(prev => prev.filter(id => id !== teamId));
    }
  };

  const handleNext = () => {
    if (selectedTeams.length === 0) {
      toast.error('Please select at least one team');
      return;
    }
    onNext(selectedTeams, selectedCompetitions);
  };

  const handleClose = () => {
    setSelectedTeams([]);
    onOpenChange(false);
  };

  const getCompetitionInfo = (competition: string) => {
    switch (competition) {
      case 'champions':
        return {
          name: 'Gameweek Champions',
          icon: <Trophy className="w-4 h-4 text-primary" />,
          badge: <Badge variant="secondary">PAID</Badge>,
          fee: 10,
          description: 'Compete for the weekly championship title'
        };
      case 'free2play':
        return {
          name: 'Free2Play',
          icon: <Play className="w-4 h-4 text-success" />,
          badge: <Badge variant="outline">FREE</Badge>,
          fee: 0,
          description: 'Practice and compete without entry fees'
        };
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Select Teams for Gameweek {gameweek}
          </DialogTitle>
        </DialogHeader>

        {/* Selected Competitions Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Selected Competitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedCompetitions.map((competition) => {
              const info = getCompetitionInfo(competition);
              if (!info) return null;
              
              return (
                <div key={competition} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {info.icon}
                    <h4 className="font-semibold">{info.name}</h4>
                    {info.badge}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {info.fee > 0 ? `GHC ${info.fee}.00` : 'FREE'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Select Teams</h3>
            <span className="text-sm text-muted-foreground">
              {selectedTeams.length} team(s) selected
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading teams...</span>
            </div>
          ) : linkedTeams.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No linked teams found. Please link an FPL team first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {linkedTeams.map((team) => (
                <div key={team.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={team.id}
                    checked={selectedTeams.includes(team.id)}
                    onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={team.id} className="font-medium cursor-pointer">
                      {team.teamName}
                    </Label>
                    <p className="text-sm text-muted-foreground">FPL ID: {team.fplTeamId}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost Preview */}
        {selectedTeams.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Estimated Cost:</span>
              <span className="text-primary">
                {selectedCompetitions.includes('champions') ? 
                  `GHC ${(10 * selectedTeams.length).toFixed(2)}` : 
                  'FREE'
                }
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleNext}
            disabled={selectedTeams.length === 0}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Review & Pay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamSelectionModal;
