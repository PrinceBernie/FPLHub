import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { Alert, AlertDescription } from '../ui/alert';
import { Clock, Shield, RotateCcw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawalOtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  phoneNumber: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const WithdrawalOtpModal: React.FC<WithdrawalOtpModalProps> = ({
  open,
  onOpenChange,
  amount,
  phoneNumber,
  onConfirm,
  onCancel
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setOtp('');
      setError('');
      setTimeLeft(300);
      setCanResend(false);
      return;
    }

    // Send OTP when modal opens
    toast.success('📱 Withdrawal confirmation code sent to your phone');

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length >= 10) {
      return phone.slice(0, 3) + '****' + phone.slice(-3);
    }
    return phone;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate OTP verification
    setTimeout(() => {
      if (otp === '123456' || otp === '000000') {
        // Success - proceed with withdrawal
        onConfirm();
        toast.success('✅ Withdrawal confirmed successfully!');
        onOpenChange(false);
      } else {
        setError('Invalid verification code. Please try again.');
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setCanResend(false);
    setTimeLeft(300);
    setError('');
    setOtp('');
    toast.success('📱 New confirmation code sent!');
  };

  const handleClose = () => {
    if (!isLoading) {
      onCancel?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-warning" />
            <span>Confirm Withdrawal</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Withdrawal Details */}
          <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-md">
            <div>
              <p className="text-sm font-medium">Withdrawal Amount</p>
              <p className="text-xs text-muted-foreground">To {maskPhoneNumber(phoneNumber)}</p>
            </div>
            <p className="text-lg font-bold text-warning">GH₵{amount}</p>
          </div>

          {/* Security Notice */}
          <div className="flex items-start p-3 bg-muted/10 border border-border rounded-md">
            <Smartphone className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Security Verification</p>
              <p className="text-xs text-muted-foreground">
                We've sent a 6-digit confirmation code to your registered phone number to verify this withdrawal.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                className="gap-2"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index} 
                      index={index} 
                      className="w-12 h-12 text-center text-lg font-bold border-border rounded-md transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit confirmation code
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center space-x-2 py-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {timeLeft > 0 ? (
                <>Code expires in <span className="text-foreground font-medium">{formatTime(timeLeft)}</span></>
              ) : (
                <span className="text-warning">Code expired</span>
              )}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Confirm Button */}
            <Button
              onClick={handleVerify}
              className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                `Confirm Withdrawal of GH₵${amount}`
              )}
            </Button>

            {/* Resend Code */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Didn't receive the code?
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={!canResend}
                className="text-primary hover:text-primary"
              >
                <RotateCcw className={`w-4 h-4 mr-1 ${!canResend ? 'opacity-50' : ''}`} />
                {canResend ? 'Resend' : `${formatTime(timeLeft)}`}
              </Button>
            </div>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel Withdrawal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalOtpModal;
