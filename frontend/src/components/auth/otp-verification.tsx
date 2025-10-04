import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PhantacciLogo from '../ui/phantacci-logo';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  isVerified: boolean;
}

interface OtpVerificationProps {
  onVerify: (user: User) => void;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({ onVerify }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  const pendingSignup = JSON.parse(sessionStorage.getItem('pending_signup') || '{}');

  useEffect(() => {
    if (!pendingSignup.email) {
      navigate('/auth');
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
  }, [navigate, pendingSignup.email]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        // Success - create user account
        const newUser: User = {
          id: Date.now().toString(),
          username: pendingSignup.username,
          email: pendingSignup.email,
          phone: pendingSignup.phone,
          role: 'user',
          isVerified: true
        };
        
        sessionStorage.removeItem('pending_signup');
        onVerify(newUser);
        toast.success('Account verified successfully!');
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
    toast.success('New verification code sent!');
  };

  if (!pendingSignup.email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 mint-gradient opacity-5" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/auth')}
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign Up
        </button>

        <Card className="glass-card border-0 rounded-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <PhantacciLogo size="lg" />
            </div>
            <CardTitle className="text-2xl mint-gradient bg-clip-text text-transparent">
              Verify Your Phone
            </CardTitle>
            <p className="text-muted-foreground">
              We sent a verification code to{' '}
              <span className="font-medium">{pendingSignup.phone}</span>
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="glass-card border-destructive/20">
                <AlertDescription>{error}</AlertDescription>
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
                        className="glass-card border-border/20 rounded-xl w-12 h-12 text-center text-lg font-semibold"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
              </span>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              className="w-full pill-button hover-zoom mint-gradient"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                onClick={handleResendOtp}
                disabled={!canResend}
                className="text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
              </Button>
            </div>

            {/* Demo Code Info */}
            <div className="p-4 glass-card rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Demo Verification Codes:</p>
              <p className="text-xs">123456 or 000000</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtpVerification;
