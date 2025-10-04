import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  phone: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  isVerified: boolean;
  fplTeamId?: number;
  createdAt: string;
}

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      // Mock login for now
      console.log('Login attempt:', email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError('Backend not connected - this is a demo');
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    phone: string;
  }) => {
    try {
      setError(null);
      setIsLoading(true);
      // Mock registration for now
      console.log('Registration attempt:', userData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError('Backend not connected - this is a demo');
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otpCode: string) => {
    try {
      setError(null);
      setIsLoading(true);
      // Mock OTP verification for now
      console.log('OTP verification attempt:', otpCode);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError('Backend not connected - this is a demo');
    } catch (error: any) {
      setError(error.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setError(null);
      setIsLoading(true);
      // Mock resend OTP for now
      console.log('Resend OTP attempt');
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError('Backend not connected - this is a demo');
    } catch (error: any) {
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    // Mock refresh for now
    console.log('Refresh user attempt');
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
