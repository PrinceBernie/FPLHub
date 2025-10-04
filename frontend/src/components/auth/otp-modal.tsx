import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { Alert, AlertDescription } from '../ui/alert';
import { Clock, Smartphone, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface PendingSignup {
  email: string;
  username: string;
  phone: string;
  password: string;
}

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingSignup: PendingSignup;
}

const OtpModal: React.FC<OtpModalProps> = ({ 
  isOpen, 
  onClose, 
  pendingSignup 
}) => {
  const { verifyOtp, resendOtp, error, clearError } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  console.log('OtpModal render:', { isOpen, pendingSignup: pendingSignup ? 'exists' : 'null' });

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setOtp('');
      setLocalError('');
      clearError();
      setTimeLeft(300);
      setCanResend(false);
      return;
    }

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
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setLocalError('Please enter a complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setLocalError('');
    clearError();

    try {
      await verifyOtp(otp);
      toast.success('🎉 Account verified successfully!');
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      await resendOtp();
      setCanResend(false);
      setTimeLeft(300);
      setLocalError('');
      clearError();
      setOtp('');
      toast.success('📱 New verification code sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  console.log('OtpModal returning Dialog with isOpen:', isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="clean-card max-w-md border-0 p-0 backdrop-blur-xl">
        <div className="p-8 text-center">
          <DialogHeader className="text-center space-y-6 mb-8">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            
            {/* Title & Description */}
            <div className="space-y-3 text-center">
              <DialogTitle className="text-foreground text-center">
                Verify Your Phone
              </DialogTitle>
              <div className="space-y-1 text-center">
                <p className="text-muted-foreground text-center">
                  We sent a verification code to
                </p>
                <p className="text-foreground font-medium text-center">
                  {pendingSignup.phone}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 text-center">
            {/* Error Alert */}
            {(error || localError) && (
              <Alert variant="destructive" className="clean-card border-destructive/30 bg-destructive/10 text-center">
                <AlertDescription className="text-destructive font-medium text-center">
                  {error || localError}
                </AlertDescription>
              </Alert>
            )}

            {/* OTP Input */}
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  className="gap-3"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot 
                        key={index} 
                        index={index} 
                        className="clean-card w-14 h-14 text-center font-semibold text-foreground border-border/30 rounded-lg transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-card/80"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <p className="text-center text-muted-foreground">
                Enter the 6-digit verification code
              </p>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 py-2 text-center">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium text-center">
                {timeLeft > 0 ? (
                  <>Code expires in <span className="text-foreground font-semibold">{formatTime(timeLeft)}</span></>
                ) : (
                  <span className="text-warning">Code expired</span>
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 text-center">
              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-semibold"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-3" />
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>

              {/* Resend Code */}
              <div className="text-center">
                <p className="text-muted-foreground mb-3 text-center">
                  Didn't receive the code?
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className="text-primary hover:text-primary/80 disabled:opacity-50 h-11"
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${!canResend ? 'opacity-50' : ''}`} />
                  <span className="font-medium">
                    {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
                  </span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpModal;
