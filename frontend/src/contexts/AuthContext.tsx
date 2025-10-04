import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { apiClient, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    username: string;
    phone: string;
  }) => Promise<void>;
  verifyOtp: (otpCode: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  // OTP Modal state
  showOtpModal: boolean;
  pendingSignup: any;
  setShowOtpModal: (show: boolean) => void;
  setPendingSignup: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<any>(null);

  const isAuthenticated = !!user;


  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is already logged in (token exists in localStorage)
        const token = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');
        
        console.log('Auth initialization:', {
          hasToken: !!token,
          hasStoredUser: !!storedUser,
          tokenLength: token?.length || 0
        });
        
        // If we have both token and user data, validate first before restoring
        if (token && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('Found stored user data:', userData);
            
            // Validate token format first
            if (token.length < 10) {
              console.error('Invalid token format, clearing session');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              setUser(null);
              setIsLoading(false);
              return;
            }
            
            // Validate with backend before restoring user data
            console.log('Validating token with backend before restoring user...');
            const validationPromise = apiClient.getProfile();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Validation timeout - server may be slow or token expired')), 8000);
            });
            
            try {
              const userProfile = await Promise.race([validationPromise, timeoutPromise]);
              console.log('Backend validation successful, user profile:', userProfile);
              
              // Only restore if backend confirms this is the correct user
              if (userProfile && typeof userProfile === 'object' && userProfile.id) {
                // Verify the user ID matches what we have stored
                if (userProfile.id === userData.id) {
                  setUser(userProfile as any);
                  console.log('User session validated and restored from localStorage');
                } else {
                  console.error('User ID mismatch! Clearing session. Stored:', userData.id, 'Backend:', userProfile.id);
                  clearAuthData();
                  setUser(null);
                }
              } else {
                console.warn('Backend validation returned invalid user; clearing session');
                clearAuthData();
                setUser(null);
              }
            } catch (validationError) {
              console.error('Backend validation failed, clearing session:', validationError.message);
              clearAuthData();
              setUser(null);
              
              // Show user-friendly message for common issues
              if (validationError.message.includes('timeout')) {
                console.warn('💡 Tip: Server may be slow. Try refreshing the page or check your connection.');
              } else if (validationError.message.includes('401') || validationError.message.includes('Unauthorized')) {
                console.warn('💡 Tip: Your session has expired. Please log in again.');
              }
            }
            
            setIsLoading(false);

              // Warm critical caches to improve perceived load on dashboard/wallet
              try {
                apiClient.prefetchDashboardData?.();
              } catch {}
            
            // Force a re-render to ensure state is updated
            setTimeout(() => {
              console.log('Force re-render check - user state:', userData);
            }, 100);
            
            // Validate token format (basic check)
            if (token.length < 10) {
              console.error('Invalid token format, clearing session');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              setUser(null);
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            setUser(null);
            setIsLoading(false);
          }
        } else {
          // No auth data, set loading to false
          setIsLoading(false);
          console.log('No auth data found, isLoading set to false');
        }
      } catch (error) {
        console.error('Failed to restore user session:', error);
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
        setIsLoading(false);
        console.log('Error in auth initialization, isLoading set to false');
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token_expiry');
    
    // Clear any other potential auth-related items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Authentication data cleared');
  };

  const login = async (identifier: string, password: string) => {
    // Prevent multiple simultaneous login attempts
    if (isLoggingIn) {
      throw new Error('Login already in progress. Please wait.');
    }

    try {
      setError(null);
      setIsLoggingIn(true);
      setIsLoading(true);
      const { user: loggedInUser, token } = await apiClient.login(identifier, password);
      
      // Clear any previous user's cache before storing new user data
      apiClient.clearUserCache();
      
      // Store token in localStorage for persistence
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      
      setUser(loggedInUser);
      console.log('User logged in successfully, token stored');
    } catch (error: any) {
      // Check if this is an unverified user error
      if (error.message && error.message.includes('Phone number not verified')) {
        // Handle unverified user - trigger OTP verification
        console.log('Unverified user attempting login, triggering OTP verification');
        
        // Extract user data from the error response
        const errorData = error.response?.data || {};
        const userId = errorData.userId;
        const userData = errorData.userData || {};
        
        console.log('Error response data:', errorData);
        console.log('Extracted userId:', userId);
        console.log('Extracted userData:', userData);
        
        // Create pending signup data for OTP verification
        const signupData = {
          email: userData.email || (identifier.includes('@') ? identifier : ''),
          username: userData.username || (!identifier.includes('@') ? identifier : ''),
          phone: userData.phone || '',
          password: password,
          userId: userId // Store userId for verification
        };
        
        setPendingSignup(signupData);
        setShowOtpModal(true);
        
        // Automatically send a new OTP to the user's phone
        if (userId) {
          try {
            await apiClient.resendOtp(userId);
            console.log('New OTP sent to unverified user for login verification');
            // Show success toast to inform user
            const { toast } = await import('sonner');
            toast.success('📱 New verification code sent to your phone!');
          } catch (otpError: any) {
            console.error('Failed to send OTP for login verification:', otpError);
            // Don't throw error here, just log it - user can still use resend button
          }
        } else {
          console.error('No userId found in error response, cannot send OTP automatically');
        }
        
        // Don't throw error, just return to show OTP modal
        return;
      }
      
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoggingIn(false);
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    phone: string;
    consentGiven: boolean;
  }) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiClient.register(userData);
      // Registration successful, user needs to verify OTP
      console.log('Registration successful:', response);
      
      // Set up OTP modal state
      const signupData = {
        email: userData.email,
        username: userData.username,
        phone: userData.phone,
        password: userData.password
      };
      
      setPendingSignup(signupData);
      setShowOtpModal(true);
      
      return response;
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otpCode: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Clear ALL old data before verification to prevent data mixing
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      apiClient.clearAllCache();
      
      // Get phone number from pendingSignup state
      const phone = pendingSignup?.phone;
      if (!phone) {
        throw new Error('Phone number not found. Please try again.');
      }
      
      // Convert phone number format: +233569874458 -> 569874458 (remove +233 prefix)
      const phoneForVerification = phone.startsWith('+233') ? phone.substring(4) : phone;
      
      const { user: verifiedUser } = await apiClient.verifyOtp(otpCode, phoneForVerification);
      setUser(verifiedUser);
      
      // Clear OTP modal state after successful verification
      setShowOtpModal(false);
      setPendingSignup(null);
      
      console.log('AuthContext: User verified successfully:', verifiedUser.email);
    } catch (error: any) {
      setError(error.message || 'OTP verification failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setError(null);
      
      // Get userId or phone from pendingSignup state
      const userId = pendingSignup?.userId;
      const phone = pendingSignup?.phone;
      
      if (!userId && !phone) {
        throw new Error('User information not found. Please try again.');
      }
      
      // Prefer userId if available (for login verification), otherwise use phone (for signup verification)
      await apiClient.resendOtp(userId || phone);
    } catch (error: any) {
      setError(error.message || 'Failed to resend OTP');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user-specific cache before clearing user data
      if (user?.id) {
        apiClient.clearUserCache(user.id);
      }
      
      // Always clear local state and token
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      console.log('User logged out, token and user data cleared');
      
      // Redirect to login page after logout
      window.location.hash = '#/login';
    }
  };

  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const freshUser = await apiClient.getProfile();
        setUser(freshUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    refreshUser,
    error,
    clearError,
    // OTP Modal state
    showOtpModal,
    pendingSignup,
    setShowOtpModal,
    setPendingSignup,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
