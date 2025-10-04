import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface LoginFormProps {
  onSubmissionChange?: (isSubmitting: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmissionChange }) => {
  const { login, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      await login(formData.identifier, formData.password);
      toast.success('Login successful!');
    } catch (err: any) {
      // Show a more user-friendly error message
      const errorMessage = err.message || 'Login failed';
      if (errorMessage.includes('Invalid email/username or password') || errorMessage.includes('Invalid email or password')) {
        toast.error('Invalid email/username or password. Please check your credentials and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Don't clear error on every keystroke - only clear when form is submitted
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Email or Username */}
      <div>
        <label className="text-sm font-medium mb-1 block">Email or Username</label>
        <Input
          type="text"
          name="identifier"
          placeholder="Enter your email or username"
          value={formData.identifier}
          onChange={handleChange}
          className="input-login"
          required
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-sm font-medium mb-1 block">Password</label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            className="input-login pr-8"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me */}
      <div className="flex items-center">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={setRememberMe}
        />
        <label htmlFor="rememberMe" className="text-sm font-medium ml-2 cursor-pointer">
          Remember me
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Login Failed</span>
          </div>
          <p className="mt-1 text-destructive/80">
            {(error.includes('Invalid email/username or password') || error.includes('Invalid email or password'))
              ? 'Please check your email/username and password, then try again.' 
              : error}
          </p>
          {(error.includes('Invalid email/username or password') || error.includes('Invalid email or password')) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Don't have an account? <a href="#/signup" className="text-primary hover:underline">Sign up here</a>
            </p>
          )}
        </div>
      )}

      {/* Forgot Password */}
      <div className="text-right">
        <a href="#" className="text-sm text-primary hover:underline">
          Forgot password?
        </a>
      </div>

      {/* Submit */}
      <Button 
        type="submit" 
        disabled={isLoading || !formData.identifier || !formData.password}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-24 sm:h-8"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};

export default LoginForm;
