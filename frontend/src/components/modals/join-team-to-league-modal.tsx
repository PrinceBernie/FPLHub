import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
  Loader2, 
  Trophy, 
  CheckCircle,
  Crown,
  Play,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import ReviewPaymentModal from './review-payment-modal';

interface JoinTeamToLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTeam: {
    id: string;
    teamName: string;
    fplTeamId: number;
  } | null;
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

const JoinTeamToLeagueModal: React.FC<JoinTeamToLeagueModalProps> = ({
  open,
  onOpenChange,
  selectedTeam
}) => {
  const [activeTab, setActiveTab] = useState<'featured' | 'private'>('featured');
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);
  const [leagueCode, setLeagueCode] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Step modals
  const [showReviewPayment, setShowReviewPayment] = useState(false);
  const [currentGameweek, setCurrentGameweek] = useState(6);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab('featured');
      setSelectedCompetitions([]);
      setLeagueCode('');
      setSelectedLeague(null);
      setShowPreview(false);
      setShowReviewPayment(false);
      loadCurrentGameweek();
    }
  }, [open]);

  const loadCurrentGameweek = async () => {
    try {
      // TODO: Get current gameweek from API
      // For now, using mock data
      setCurrentGameweek(6);
    } catch (error) {
      console.error('Failed to load current gameweek:', error);
    }
  };

  const handleCompetitionSelection = (competition: string, checked: boolean) => {
    if (checked) {
      setSelectedCompetitions(prev => [...prev, competition]);
    } else {
      setSelectedCompetitions(prev => prev.filter(c => c !== competition));
    }
  };

  const validateLeagueCode = async () => {
    if (!leagueCode.trim()) {
      toast.error('Please enter a league code');
      return;
    }

    try {
      setIsValidatingCode(true);
      // TODO: Implement API call to validate league code
      // const response = await apiClient.validateLeagueCode(leagueCode);
      
      // Mock validation for now
      const mockLeague: League = {
        id: 'private-1',
        name: 'Private Champions League',
        type: 'PAID',
        entryFee: 25,
        gameweek: 6,
        status: 'OPEN',
        maxTeams: 50,
        currentTeams: 23,
        description: 'Exclusive private league for champions'
      };
      
      setSelectedLeague(mockLeague);
      setShowPreview(true);
      toast.success('League code validated successfully');
    } catch (error) {
      console.error('Failed to validate league code:', error);
      toast.error('Invalid league code or league not found');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleNext = () => {
    if (activeTab === 'featured') {
      if (selectedCompetitions.length === 0) {
        toast.error('Please select at least one competition');
        return;
      }
    } else {
      if (!selectedLeague) {
        toast.error('Please validate a league code first');
        return;
      }
    }
    
    setShowReviewPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowReviewPayment(false);
    resetForm();
    onOpenChange(false);
  };


  const resetForm = () => {
    setActiveTab('featured');
    setSelectedCompetitions([]);
    setLeagueCode('');
    setSelectedLeague(null);
    setShowPreview(false);
    setShowReviewPayment(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (!selectedTeam) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Join League with {selectedTeam.teamName}
          </DialogTitle>
        </DialogHeader>

            {/* Selected Team Info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{selectedTeam.teamName}</h3>
              <p className="text-sm text-muted-foreground">FPL ID: {selectedTeam.fplTeamId}</p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('featured')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'featured'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" />
              Featured Competitions
                      </div>
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'private'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Key className="w-4 h-4" />
              Private/Invitational
            </div>
          </button>
        </div>

        {/* Featured Competitions Tab */}
        {activeTab === 'featured' && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Featured Competitions - Gameweek {currentGameweek}</h3>
            <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id="champions"
                    checked={selectedCompetitions.includes('champions')}
                    onCheckedChange={(checked) => handleCompetitionSelection('champions', checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-primary" />
                      <Label htmlFor="champions" className="font-semibold cursor-pointer">
                        Gameweek {currentGameweek} Champions
                      </Label>
                      <Badge variant="secondary">PAID</Badge>
                    </div>
                    <div className="text-lg font-bold text-primary">GHC 10.00</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id="free2play"
                    checked={selectedCompetitions.includes('free2play')}
                    onCheckedChange={(checked) => handleCompetitionSelection('free2play', checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Play className="w-4 h-4 text-success" />
                      <Label htmlFor="free2play" className="font-semibold cursor-pointer">
                        Gameweek {currentGameweek} Free2Play
                      </Label>
                      <Badge variant="outline">FREE</Badge>
                    </div>
                    <div className="text-lg font-bold text-success">FREE</div>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Private/Invitational Tab */}
        {activeTab === 'private' && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Join Private League</h3>
            <div className="flex gap-2">
                <Input
                  placeholder="Enter league code (e.g., ABC123)"
                  value={leagueCode}
                  onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button 
                  onClick={validateLeagueCode}
                  disabled={isValidatingCode || !leagueCode.trim()}
                  variant="outline"
                >
                  {isValidatingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </Button>
            </div>

            {/* League Preview */}
            {showPreview && selectedLeague && (
              <div className="border rounded-lg p-3 bg-muted/50 mt-3">
                <h4 className="font-semibold mb-2">{selectedLeague.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant={selectedLeague.type === 'PAID' ? 'default' : 'outline'} className="ml-2">
                      {selectedLeague.type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entry Fee:</span>
                    <span className="ml-2 font-medium">
                      {selectedLeague.entryFee > 0 ? `GHC ${selectedLeague.entryFee}` : 'FREE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gameweek:</span>
                    <span className="ml-2 font-medium">{selectedLeague.gameweek}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teams:</span>
                    <span className="ml-2 font-medium">
                      {selectedLeague.currentTeams}/{selectedLeague.maxTeams}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
            onClick={handleNext}
            disabled={(activeTab === 'featured' && selectedCompetitions.length === 0) || (activeTab === 'private' && !showPreview)}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Review & Pay
              </Button>
            </div>
      </DialogContent>
      
      {/* Step Modals */}
      <ReviewPaymentModal
        open={showReviewPayment}
        onOpenChange={setShowReviewPayment}
        onSuccess={handlePaymentSuccess}
        selectedTeams={selectedTeam ? [selectedTeam.id] : []}
        selectedCompetitions={selectedCompetitions}
        gameweek={currentGameweek}
        leagueType={activeTab}
        privateLeague={selectedLeague ? {
          name: selectedLeague.name,
          entryFee: selectedLeague.entryFee,
          description: selectedLeague.description
        } : null}
      />
    </Dialog>
  );
};

export default JoinTeamToLeagueModal;