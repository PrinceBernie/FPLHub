import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { 
  Loader2, 
  Users, 
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import TeamSelectionModal from './team-selection-modal';
import ReviewPaymentModal from './review-payment-modal';

interface JoinLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface League {
  id: string;
  name: string;
  type: 'FREE' | 'PAID';
  entryFee: number;
  gameweek: number;
  status: 'OPEN' | 'LOCKED' | 'FULL';
  maxTeams: number;
  currentTeams: number;
  description?: string;
}

const JoinLeagueModal: React.FC<JoinLeagueModalProps> = ({ open, onOpenChange }) => {
  const [leagueCode, setLeagueCode] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Step modals
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showReviewPayment, setShowReviewPayment] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setLeagueCode('');
      setSelectedLeague(null);
      setShowPreview(false);
      setShowTeamSelection(false);
      setShowReviewPayment(false);
      setSelectedTeams([]);
    }
  }, [open]);

  const validateLeagueCode = async () => {
    if (!leagueCode.trim()) {
      toast.error('Please enter a league code');
      return;
    }

    try {
      setIsValidatingCode(true);
      
      // TODO: Implement actual league code validation API call
      // For now, simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock league data
      const mockLeague: League = {
        id: 'mock-league-id',
        name: `Private League ${leagueCode.toUpperCase()}`,
        type: 'PAID',
        entryFee: 15.00,
        gameweek: 6,
        status: 'OPEN',
        maxTeams: 20,
        currentTeams: 8,
        description: 'Private invitational league'
      };
      
      setSelectedLeague(mockLeague);
      setShowPreview(true);
      toast.success('League code validated successfully');
    } catch (error: any) {
      console.error('League validation error:', error);
      toast.error(error.message || 'Invalid league code. Please try again.');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleNext = () => {
    if (!showPreview || !selectedLeague) {
      toast.error('Please validate a league code first');
      return;
    }
    setShowTeamSelection(true);
  };

  const handleTeamSelectionNext = (teams: string[]) => {
    setSelectedTeams(teams);
    setShowTeamSelection(false);
    setShowReviewPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowReviewPayment(false);
    resetForm();
    onOpenChange(false);
    toast.success('Successfully joined the league!');
  };

  const resetForm = () => {
    setLeagueCode('');
    setSelectedLeague(null);
    setShowPreview(false);
    setShowTeamSelection(false);
    setShowReviewPayment(false);
    setSelectedTeams([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Join Invitational League
            </DialogTitle>
        </DialogHeader>

          {/* League Code Input */}
          <div>
            <Label htmlFor="leagueCode" className="text-sm font-medium">
              League Code
            </Label>
            <div className="flex gap-2 mt-2">
          <Input
                id="leagueCode"
                type="text"
                placeholder="Enter league code (e.g., ABC123)"
                value={leagueCode}
                onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                className="flex-1"
                disabled={isValidatingCode}
              />
              <Button
                onClick={validateLeagueCode}
                disabled={isValidatingCode || !leagueCode.trim()}
                size="sm"
              >
                {isValidatingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
            </div>

          {/* League Preview */}
          {showPreview && selectedLeague && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
            </div>
                <div>
                  <h3 className="font-semibold text-sm">{selectedLeague.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedLeague.description}</p>
            </div>
          </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee:</span>
                  <span className="font-medium">
                    {selectedLeague.entryFee > 0 ? `GHC ${selectedLeague.entryFee.toFixed(2)}` : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gameweek:</span>
                  <span className="font-medium">{selectedLeague.gameweek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{selectedLeague.currentTeams}/{selectedLeague.maxTeams}</span>
              </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={selectedLeague.status === 'OPEN' ? 'default' : 'secondary'} className="text-xs">
                    {selectedLeague.status}
                            </Badge>
                          </div>
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
              disabled={!showPreview}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Select Teams
                      </Button>
        </div>
      </DialogContent>
    </Dialog>

      {/* Step Modals */}
      <TeamSelectionModal
        open={showTeamSelection}
        onOpenChange={setShowTeamSelection}
        onNext={handleTeamSelectionNext}
        selectedCompetitions={['private']}
        gameweek={selectedLeague?.gameweek || 6}
      />

      <ReviewPaymentModal
        open={showReviewPayment}
        onOpenChange={setShowReviewPayment}
        onSuccess={handlePaymentSuccess}
        selectedTeams={selectedTeams}
        selectedCompetitions={['private']}
        gameweek={selectedLeague?.gameweek || 6}
        leagueType="private"
        privateLeague={selectedLeague ? {
          name: selectedLeague.name,
          entryFee: selectedLeague.entryFee,
          description: selectedLeague.description
        } : null}
      />
    </>
  );
};

export default JoinLeagueModal;
