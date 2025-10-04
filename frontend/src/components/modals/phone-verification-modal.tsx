import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Smartphone, Clock, RotateCcw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PhoneVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPhoneNumber: string;
  onVerify: (phoneNumber: string) => void;
}

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  open,
  onOpenChange,
  newPhoneNumber,
  onVerify
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open, timeLeft]);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setOtpCode('');
      setTimeLeft(300);
      setIsResending(false);
      setIsVerifying(false);
      setError('');
    }
  }, [open]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string): string => {
    if (phone.length >= 10) {
      return phone.slice(0, 3) + '****' + phone.slice(-3);
    }
    return phone;
  };

  const handleOtpChange = (value: string) => {
    // Only allow numeric input and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(numericValue);
    setError('');
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');

    // Simulate API call to resend OTP
    setTimeout(() => {
      setTimeLeft(300);
      setIsResending(false);
      toast.success(`OTP resent to ${maskPhoneNumber(newPhoneNumber)}`);
    }, 2000);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setError('');

    // Simulate OTP verification
    setTimeout(() => {
      // In a real app, you'd verify the OTP with your backend
      if (otpCode === '123456') {
        // Demo OTP for testing
        onVerify(newPhoneNumber);
        toast.success('Phone number updated successfully');
        onOpenChange(false);
      } else {
        setError('Invalid verification code. Please try again.');
      }
      setIsVerifying(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!isVerifying) {
      setOtpCode('');
      setError('');
      onOpenChange(false);
    }
  };

  const isOtpComplete = otpCode.length === 6;
  const canResend = timeLeft === 0 && !isResending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <span>Verify Phone Number</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number Display */}
          <div className="flex items-center justify-center p-3 bg-muted/10 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Verification code sent to:
              </p>
              <p className="font-medium text-primary">
                {maskPhoneNumber(newPhoneNumber)}
              </p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter 6-digit verification code
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="input-clean text-center text-lg font-mono tracking-widest"
              maxLength={6}
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground text-center">
              Code expires in {formatTime(timeLeft)}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Timer and Resend */}
          <div className="flex items-center justify-center">
            {timeLeft > 0 ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Code expires in {formatTime(timeLeft)}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleResendOtp}
                disabled={isResending}
                className="text-sm"
              >
                {isResending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOtp}
              disabled={!isOtpComplete || isVerifying}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isVerifying ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Update
                </div>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Didn't receive the code? Check your SMS or try resending after the timer expires.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;
