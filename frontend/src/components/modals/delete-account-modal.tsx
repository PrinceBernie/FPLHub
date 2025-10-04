import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  open,
  onOpenChange,
  username,
  onConfirm
}) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const expectedConfirmText = `DELETE ${username}`;
  const isConfirmTextValid = confirmText === expectedConfirmText;
  const isPasswordValid = password.length >= 6; // Basic validation

  const handleConfirm = async () => {
    if (!isPasswordValid) {
      setError('Please enter your password');
      return;
    }

    if (!isConfirmTextValid) {
      setError(`Please type "${expectedConfirmText}" to confirm`);
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate password verification
    setTimeout(() => {
      // In a real app, you'd verify the password with your backend
      if (password === 'wrongpassword') {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - proceed with account deletion
      onConfirm();
      toast.error('Account deleted successfully');
      onOpenChange(false);
      setIsLoading(false);
    }, 1500);
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      setConfirmText('');
      setError('');
      setShowPassword(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Delete Account</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Message */}
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-2">This action cannot be undone!</p>
              <ul className="text-xs space-y-1">
                <li>• Your account and all data will be permanently deleted</li>
                <li>• All league participations will be removed</li>
                <li>• Your wallet balance will be forfeited</li>
                <li>• This action is irreversible</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter your password to confirm
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-clean pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmation Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-mono text-destructive bg-destructive/10 px-1 rounded">{expectedConfirmText}</span> to confirm
            </label>
            <Input
              placeholder={expectedConfirmText}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input-clean font-mono"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This confirms you understand the consequences of this action.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isPasswordValid || !isConfirmTextValid || isLoading}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </div>
              )}
            </Button>
          </div>

          {/* Final Warning */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Once you delete your account, there is no going back.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountModal;
