import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from './login-form';
import SignupForm from './signup-form';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug when isSubmitting changes
  React.useEffect(() => {
    console.log('AuthPage - isSubmitting state changed:', isSubmitting);
  }, [isSubmitting]);

  // Debug component lifecycle
  React.useEffect(() => {
    console.log('AuthPage mounted');
    return () => {
      console.log('AuthPage unmounted');
    };
  }, []);

  // Set initial state based on current route
  useEffect(() => {
    console.log('AuthPage useEffect triggered:', { isSubmitting, pathname: location.pathname, hash: location.hash });
    
    // Don't change state if we're in the middle of a submission
    if (isSubmitting) {
      console.log('AuthPage - Skipping route change during submission');
      return;
    }
    
    const isSignupRoute = location.pathname === '/signup' || location.hash === '#/signup';
    setIsLogin(!isSignupRoute);
    console.log('AuthPage - Route changed:', { pathname: location.pathname, hash: location.hash, isSignupRoute, isLogin: !isSignupRoute });
  }, [location, isSubmitting]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        {/* Welcome Message - Detached */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isLogin 
              ? 'Sign in to your account to continue' 
              : 'Join thousands of fantasy football managers'
            }
          </p>
        </div>

        {/* Slim Pill-like Toggle - Detached */}
        <div className="flex justify-center mb-8">
          <div className="bg-accent/30 rounded-full p-1 flex">
            <button
              onClick={() => setIsLogin(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isLogin
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !isLogin
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Auth Card - Form Only */}
        <div className="clean-card">
          {/* Form */}
          {console.log('AuthPage render - isLogin:', isLogin, 'pathname:', location.pathname, 'hash:', location.hash, 'isSubmitting:', isSubmitting)}
          {isLogin ? (
            <LoginForm onSubmissionChange={(isSubmitting) => {
              console.log('LoginForm onSubmissionChange called:', isSubmitting);
              setIsSubmitting(isSubmitting);
            }} />
          ) : (
            <SignupForm onSubmissionChange={(isSubmitting) => {
              console.log('SignupForm onSubmissionChange called:', isSubmitting);
              console.log('AuthPage - About to set isSubmitting to:', isSubmitting);
              setIsSubmitting(isSubmitting);
            }} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
