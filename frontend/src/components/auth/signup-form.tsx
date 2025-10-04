import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface SignupFormProps {
  onSubmissionChange?: (isSubmitting: boolean) => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSubmissionChange }) => {
  const { register, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    consentGiven: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debug component lifecycle
  React.useEffect(() => {
    console.log('SignupForm mounted');
    return () => {
      console.log('SignupForm unmounted');
    };
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3 || formData.username.length > 30) {
      newErrors.username = 'Username must be 3-30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length !== 9) {
      newErrors.phone = 'Phone number must be exactly 9 digits';
    } else if (!/^[235679][0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must start with 2, 3, 5, 6, 7, or 9';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      // Check for password complexity requirements
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasDigit = /\d/.test(formData.password);
      const hasSpecialChar = /[@$!%*?&]/.test(formData.password);
      
      if (!hasUpperCase || !hasLowerCase || !hasDigit || !hasSpecialChar) {
        newErrors.password = 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.consentGiven) {
      newErrors.consentGiven = 'You must agree to the Terms and Conditions';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Form already submitting, ignoring duplicate submission');
      return;
    }
    
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    console.log('Starting form submission...');
    setIsLoading(true);
    console.log('SignupForm - Calling onSubmissionChange(true)');
    onSubmissionChange?.(true); // Notify parent that submission is starting
    clearError(); // Clear AuthContext error
    setErrors({}); // Clear local errors

    try {
      console.log('Starting registration with data:', {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        consentGiven: formData.consentGiven
      });

      // Call backend registration API
      await register({
        username: formData.username,
        email: formData.email,
        phone: formData.phone, // Send just the 9 digits, backend will add +233 prefix
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        consentGiven: formData.consentGiven
      } as any);

      console.log('Registration successful, OTP modal should appear...');
      
      // Show success message - OTP modal will be handled by AuthContext
      toast.success('Verification code sent to your phone!');
      
      // Don't reset the form after successful registration
      // The form should stay filled so user can see what they entered
      
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create account. Please try again.' });
      onSubmissionChange?.(false); // Reset submission state on error
    } finally {
      setIsLoading(false);
      // Don't reset submission state here - let the OTP modal handle it
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for phone input
    if (name === 'phone') {
      // Remove any non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 9 digits
      const limitedDigits = digitsOnly.slice(0, 9);
      
      // If user is entering the first digit, ensure it's valid
      if (limitedDigits.length === 1 && !/^[235679]$/.test(limitedDigits)) {
        return; // Don't update if first digit is invalid
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: limitedDigits,
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear specific field error when user starts typing
    setErrors(prev => {
      if (prev[name]) {
        return {
          ...prev,
          [name]: '',
        };
      }
      return prev;
    });
    
    // Clear AuthContext error when user starts typing
    if (error) {
      clearError();
    }
  }, [error, clearError]);


  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Username */}
      <div>
        <label className="text-sm font-medium mb-1 block capitalize">Username</label>
        <Input
          type="text"
          name="username"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleChange}
          className={`input-compact ${
            errors.username ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
          required
        />
        {errors.username && (
          <p className="text-sm text-destructive mt-1">{errors.username}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="text-sm font-medium mb-1 block capitalize">Email</label>
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          className={`input-compact ${
            errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
          required
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-medium mb-1 block">Phone</label>
        <div className="relative">
          <div className="flex">
            <div className="flex items-center px-3 h-8 border border-r-0 border-border rounded-l-md bg-input text-sm text-muted-foreground">
              +233
            </div>
            <Input
              type="tel"
              name="phone"
              placeholder="e.g. 234567890"
              value={formData.phone}
              onChange={handleChange}
              className={`input-compact rounded-l-none border-l-0 focus-visible:ring-offset-0 ${
                errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
              maxLength={9}
              pattern="[235679][0-9]*"
              inputMode="numeric"
              required
            />
          </div>
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="text-sm font-medium mb-1 block capitalize">Password</label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            className={`input-compact pr-8 ${
              errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive mt-1">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="text-sm font-medium mb-1 block capitalize">Confirm Password</label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`input-compact pr-8 ${
              errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          name="consentGiven"
          checked={formData.consentGiven}
          onChange={handleChange}
          className={`mt-1 h-4 w-4 rounded border border-border ${
            errors.consentGiven ? 'border-destructive' : ''
          }`}
          required
        />
        <label className="text-sm text-muted-foreground leading-relaxed">
          I agree to the{' '}
          <a href="#" className="text-primary hover:underline">
            Terms and Conditions
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </label>
      </div>
      {errors.consentGiven && (
        <p className="text-sm text-destructive mt-1">{errors.consentGiven}</p>
      )}

      {/* General Error */}
      {(errors.general || error) && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
          {errors.general || error}
        </div>
      )}

      {/* Submit */}
      <Button 
        type="submit" 
        disabled={isLoading}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-8"
      >
        {isLoading ? 'Sending verification code...' : 'Create account'}
      </Button>

      {/* OTP verification is now handled by a separate page */}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Debug: Using separate OTP verification page
        </div>
      )}
    </form>
  );
};

export default SignupForm;
