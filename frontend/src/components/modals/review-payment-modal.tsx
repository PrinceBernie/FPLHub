import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  X, 
  Loader2, 
  Users, 
  Trophy, 
  AlertTriangle,
  CheckCircle,
  Crown,
  Play,
  CreditCard,
  Wallet,
  Shield,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface ReviewPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedTeams: string[];
  selectedCompetitions: string[];
  gameweek: number;
  leagueType: 'featured' | 'private';
  privateLeague?: {
    name: string;
    entryFee: number;
    description?: string;
  } | null;
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

const ReviewPaymentModal: React.FC<ReviewPaymentModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  selectedTeams,
  selectedCompetitions,
  gameweek,
  leagueType,
  privateLeague
}) => {
  const [linkedTeams, setLinkedTeams] = useState<LinkedTeam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load team details for display
  React.useEffect(() => {
    if (open && selectedTeams.length > 0) {
      loadTeamDetails();
    }
  }, [open, selectedTeams]);

  const loadTeamDetails = async () => {
    try {
      const response = await apiClient.getLinkedTeams();
      if (response.success && response.data) {
        setLinkedTeams(response.data.filter((team: LinkedTeam) => 
          selectedTeams.includes(team.id)
        ));
      }
    } catch (error) {
      console.error('Failed to load team details:', error);
    }
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

  const calculateTotalCost = () => {
    if (leagueType === 'private' && privateLeague) {
      return privateLeague.entryFee * selectedTeams.length;
    }
    
    // Featured competitions
    const championsFee = selectedCompetitions.includes('champions') ? 10 : 0;
    const free2PlayFee = selectedCompetitions.includes('free2play') ? 0 : 0;
    return (championsFee + free2PlayFee) * selectedTeams.length;
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      if (leagueType === 'featured') {
        // Join featured competitions
        // TODO: Implement API call to join featured leagues
        await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
        toast.success(`Successfully joined Gameweek ${gameweek} competitions with ${selectedTeams.length} team(s)`);
      } else {
        // Join private league
        // TODO: Implement API call to join private league
        await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
        toast.success(`Successfully joined ${privateLeague?.name} with ${selectedTeams.length} team(s)`);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const totalCost = calculateTotalCost();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Review & Payment
          </DialogTitle>
        </DialogHeader>

        {/* League Type Header */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            {leagueType === 'featured' ? (
              <>
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Featured Competitions</h3>
              </>
            ) : (
              <>
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Private League</h3>
              </>
            )}
          </div>
          {leagueType === 'private' && privateLeague && (
            <h4 className="font-medium mt-1">{privateLeague.name}</h4>
          )}
        </div>

        {/* Competitions/League Details */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {leagueType === 'featured' ? 'Selected Competitions' : 'League Details'}
          </h3>
          
          {leagueType === 'featured' ? (
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
          ) : (
            privateLeague && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">{privateLeague.name}</h4>
                  <Badge variant={privateLeague.entryFee > 0 ? 'default' : 'outline'}>
                    {privateLeague.entryFee > 0 ? 'PAID' : 'FREE'}
                  </Badge>
                </div>
                <div className="text-lg font-bold text-primary">
                  {privateLeague.entryFee > 0 ? `GHC ${privateLeague.entryFee}.00` : 'FREE'}
                </div>
              </div>
            )
          )}
        </div>

        {/* Selected Teams */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Selected Teams ({selectedTeams.length})</h3>
          <div className="space-y-1">
            {linkedTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{team.teamName}</h4>
                  <p className="text-sm text-muted-foreground">FPL ID: {team.fplTeamId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Cost Breakdown</h3>
          
          {leagueType === 'featured' ? (
            <div className="space-y-2">
              {selectedCompetitions.includes('champions') && (
                <div className="flex justify-between text-sm">
                  <span>Gameweek Champions × {selectedTeams.length} teams</span>
                  <span>GHC {(10 * selectedTeams.length).toFixed(2)}</span>
                </div>
              )}
              {selectedCompetitions.includes('free2play') && (
                <div className="flex justify-between text-sm">
                  <span>Free2Play × {selectedTeams.length} teams</span>
                  <span>FREE</span>
                </div>
              )}
            </div>
          ) : (
            privateLeague && (
              <div className="flex justify-between text-sm">
                <span>{privateLeague.name} × {selectedTeams.length} teams</span>
                <span>
                  {privateLeague.entryFee > 0 ? 
                    `GHC ${(privateLeague.entryFee * selectedTeams.length).toFixed(2)}` : 
                    'FREE'
                  }
                </span>
              </div>
            )
          )}
          
          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span className="text-primary">
              {totalCost > 0 ? `GHC ${totalCost.toFixed(2)}` : 'FREE'}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        {totalCost > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <h4 className="font-medium">Wallet Balance</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                {totalCost > 0 ? 'Pay & Join' : 'Join Free'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewPaymentModal;
