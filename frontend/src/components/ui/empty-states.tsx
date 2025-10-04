import React from 'react';
import { Button } from './button';
import { 
  Trophy, 
  Users, 
  CreditCard, 
  History, 
  Target, 
  Zap,
  Gift,
  TrendingUp,
  UserPlus,
  Wallet,
  PlusCircle,
  Settings,
  Crown,
  Star,
  Calendar,
  Activity
} from 'lucide-react';

interface BaseEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

// Dashboard Empty States
export const NoLeaguesState: React.FC<BaseEmptyStateProps> = ({ onAction, actionLabel = "Create League", className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-primary/10 border-2 border-dashed border-primary/30">
        <Trophy className="w-12 h-12 text-primary" />
      </div>
      <div className="absolute -top-1 -right-1 p-1 rounded-full bg-warning animate-bounce">
        <Crown className="w-4 h-4 text-warning-foreground" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">Ready to Compete?</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Create your first league and invite friends to compete in fantasy football. Show them who's the real manager!
    </p>
    {onAction && (
      <Button onClick={onAction} className="min-w-[140px]">
        <PlusCircle className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

export const NoTeamLinkedState: React.FC<BaseEmptyStateProps> = ({ onAction, actionLabel = "Link FPL Team", className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-success/10 border-2 border-dashed border-success/30">
        <Target className="w-12 h-12 text-success" />
      </div>
      <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary animate-pulse">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">Connect Your Fantasy Team</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Link your FPL team to start tracking your performance and compete with friends in leagues.
    </p>
    {onAction && (
      <Button onClick={onAction} className="min-w-[140px]">
        <Target className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

// Leaderboard Empty States
export const NoLeaderboardState: React.FC<BaseEmptyStateProps> = ({ onAction, actionLabel = "Join League", className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-warning/10 border-2 border-dashed border-warning/30">
        <TrendingUp className="w-12 h-12 text-warning" />
      </div>
      <div className="absolute top-0 right-0 flex space-x-1">
        <Star className="w-3 h-3 text-warning animate-twinkle" />
        <Star className="w-2 h-2 text-warning animate-twinkle delay-100" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">No Competition Yet</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Join a league to see your ranking and compete against other fantasy football managers.
    </p>
    {onAction && (
      <Button onClick={onAction} variant="outline" className="min-w-[120px]">
        <UserPlus className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

// Wallet Empty States
export const NoTransactionsState: React.FC<BaseEmptyStateProps> = ({ onAction, actionLabel = "Make Deposit", className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-muted/20 border-2 border-dashed border-border">
        <History className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="absolute -top-2 -right-2 p-2 rounded-full bg-card border-2 border-border">
        <Activity className="w-4 h-4 text-primary animate-pulse" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Your transaction history will appear here once you make your first deposit or withdrawal.
    </p>
    {onAction && (
      <Button onClick={onAction} className="min-w-[120px]">
        <CreditCard className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

export const EmptyWalletState: React.FC<BaseEmptyStateProps> = ({ onAction, actionLabel = "Add Funds", className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-10 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-primary/10 border-2 border-dashed border-primary/30">
        <Wallet className="w-12 h-12 text-primary" />
      </div>
      <div className="absolute -bottom-1 -left-1 p-1 rounded-full bg-success animate-bounce">
        <Gift className="w-4 h-4 text-success-foreground" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">Time to Fuel Up!</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Add funds to your wallet to join paid leagues and compete for bigger prizes.
    </p>
    {onAction && (
      <Button onClick={onAction} className="min-w-[120px]">
        <PlusCircle className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

// Admin Panel Empty States
export const NoUsersState: React.FC<BaseEmptyStateProps> = ({ className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="mb-6 p-6 rounded-full bg-secondary/10 border-2 border-dashed border-secondary/30">
      <Users className="w-12 h-12 text-secondary" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Users will appear here once they start signing up for your fantasy football platform.
    </p>
  </div>
);

export const NoDataState: React.FC<BaseEmptyStateProps> = ({ className = "" }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="mb-6 p-6 rounded-full bg-muted/20 border-2 border-dashed border-border">
      <Settings className="w-12 h-12 text-muted-foreground animate-spin-slow" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      Data will appear here once the system starts collecting information.
    </p>
  </div>
);

// Generic Coming Soon State
export const ComingSoonState: React.FC<{ feature: string } & BaseEmptyStateProps> = ({ 
  feature, 
  className = "" 
}) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="relative mb-6">
      <div className="p-6 rounded-full bg-warning/10 border-2 border-dashed border-warning/30">
        <Calendar className="w-12 h-12 text-warning" />
      </div>
      <div className="absolute -top-1 -right-1 p-1 rounded-full bg-primary animate-ping">
        <Star className="w-3 h-3 text-primary-foreground" />
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-2">{feature} Coming Soon!</h3>
    <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
      We're working hard to bring you this feature. Stay tuned for updates!
    </p>
  </div>
);
