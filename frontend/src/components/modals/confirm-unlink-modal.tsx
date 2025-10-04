import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConfirmUnlinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string | null;
  onConfirm: () => void;
}

const ConfirmUnlinkModal: React.FC<ConfirmUnlinkModalProps> = ({
  open,
  onOpenChange,
  teamName,
  onConfirm
}) => {
  const handleUnlink = () => {
    onConfirm();
    toast.success(`${teamName} has been unlinked successfully`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="clean-card max-w-sm">
        <DialogHeader className="pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Confirm Unlink</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Unlink FPL Team</p>
              <p className="text-xs text-muted-foreground mt-1">
                This action will remove "{teamName}" from your linked teams. You can re-link it later if needed.
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={() => onOpenChange(false)}
              className="flex-1 border border-border bg-transparent hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUnlink}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmUnlinkModal;
