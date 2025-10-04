import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Copy, Shuffle, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface LeagueCodeGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCreate: (leagueCode: string) => void;
  isCreating?: boolean;
}

const LeagueCodeGenerationModal: React.FC<LeagueCodeGenerationModalProps> = ({ 
  open, 
  onOpenChange, 
  onConfirmCreate,
  isCreating = false
}) => {
  const [leagueCode, setLeagueCode] = useState(() => generateLeagueCode());

  // Generate random league code
  function generateLeagueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const regenerateCode = () => {
    setLeagueCode(generateLeagueCode());
    toast.success('New league code generated!');
  };

  const copyLeagueCode = async () => {
    try {
      await navigator.clipboard.writeText(leagueCode);
      toast.success('League code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy league code');
    }
  };

  const handleConfirm = () => {
    onConfirmCreate(leagueCode);
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="clean-card max-w-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-lg text-center">Generate League Code</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Your unique league code will be used for inviting players
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="clean-card-sm bg-primary/5 border-primary/20">
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">League Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                    {leagueCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyLeagueCode}
                    className="h-8 w-8 p-0"
                    disabled={isCreating}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateCode}
                className="text-xs"
                disabled={isCreating}
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Generate New Code
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>This code will be used to invite friends to your league.</p>
            <p>You can share it after your league is created.</p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1 text-xs"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isCreating}
              className="flex-1 text-xs"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="h-3 w-3 mr-1" />
                  Create League
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeagueCodeGenerationModal;
