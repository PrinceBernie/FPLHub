import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Trophy, TrendingUp, X, Zap } from 'lucide-react';

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

interface LinkTeamConfirmationModalProps {
  team: FplTeam;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LinkTeamConfirmationModal: React.FC<LinkTeamConfirmationModalProps> = ({
  team,
  open,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sport-card-blue-black max-w-md border-0 p-0">
        {/* Header */}
        <div className="p-4 border-b border-electric/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-full backdrop-blur-sm border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Confirm Team Link</DialogTitle>
                <p className="text-xs text-white/70">Review team details before linking</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Team Details */}
        <div className="p-4 space-y-4">
          {/* Team Info */}
          <div className="text-center space-y-2">
            <h3 className="font-bold text-white text-lg">{team.name}</h3>
            <p className="text-white/70">{team.manager}</p>
            <Badge className="bg-electric/20 text-electric border-electric/30">
              Team ID: {team.id}
            </Badge>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-electric/10 backdrop-blur-sm rounded-lg border border-electric/20 text-center">
              <Trophy className="w-5 h-5 text-electric mx-auto mb-1" />
              <p className="text-xs text-white/70 mb-1">Total Points</p>
              <p className="font-bold text-electric">{team.totalPoints.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-secondary/10 backdrop-blur-sm rounded-lg border border-secondary/20 text-center">
              <TrendingUp className="w-5 h-5 text-secondary mx-auto mb-1" />
              <p className="text-xs text-white/70 mb-1">Overall Rank</p>
              <p className="font-bold text-secondary">#{team.overallRank.toLocaleString()}</p>
            </div>
          </div>

          {/* Current Gameweek */}
          <div className="p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-white/70">Gameweek {team.currentGameweek}</p>
                <p className="font-semibold text-white">{team.gameweekPoints} points</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70">In the Bank</p>
                <p className="font-semibold text-white">£{team.bank}m</p>
              </div>
            </div>
          </div>

          {/* Transfer Info */}
          <div className="flex justify-between text-sm text-white/70">
            <span>Total Transfers: {team.transfers}</span>
            <span>Remaining: {team.transfersLeft}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1 border-white/30 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log('Confirm Link button clicked!');
                onConfirm();
              }} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <Zap className="w-4 h-4 mr-2" />
              Confirm Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkTeamConfirmationModal;
